
import React, { useState, useEffect, useMemo } from 'react';
import { User, Package, BillingRecord } from '../types';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  onUpdateUser: (u: User) => void;
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onAddBill: (b: BillingRecord) => void;
  onDeleteBill: (id: string) => void;
  onDeleteBillsByMonth: (month: string) => void;
  // Fix: changed from number to Promise<number> to match the async handleGenerateBills in App.tsx
  onGenerateMonthlyBills: (month: string, targetUserIds?: string[]) => Promise<number>;
  currentUser?: User;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], packages = [], bills = [], onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onDeleteBillsByMonth, onGenerateMonthlyBills, currentUser, onExportData, onImportData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'settings'>('users');
  const [billingSubTab, setBillingSubTab] = useState<'pending' | 'history'>('pending');
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingBill, setDeletingBill] = useState<BillingRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [individualBillTarget, setIndividualBillTarget] = useState<User | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [extraChargeUser, setExtraChargeUser] = useState<User | null>(null);
  const [extraChargeAmount, setExtraChargeAmount] = useState('');
  const [extraChargeDesc, setExtraChargeDesc] = useState('');

  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [adminProfile, setAdminProfile] = useState({
    username: currentUser?.username || '',
    password: currentUser?.password || '',
    fullName: currentUser?.fullName || ''
  });

  const now = new Date();
  const currentMonthNameBn = MONTHS_BN[now.getMonth()];
  const currentYear = now.getFullYear().toString();
  const currentBillingMonthStr = `${currentMonthNameBn} ${currentYear}`;

  const [billingMonth, setBillingMonth] = useState(currentMonthNameBn);
  const [billingYear, setBillingYear] = useState(currentYear);
  
  const [payingUser, setPayingUser] = useState<{user: User, bill: BillingRecord} | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: '', role: 'customer', packageId: packages[0]?.id || '', 
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [paymentDetails, setPaymentDetails] = useState({ 
    amount: 0, 
    method: 'Cash' as BillingRecord['method']
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const stats = useMemo(() => ({
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid' && b.billingMonth === currentBillingMonthStr).reduce((acc, b) => acc + b.amount, 0),
    monthlyDues: bills.filter(b => b.status === 'pending').length
  }), [users, bills, currentBillingMonthStr]);

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const allPendingBills = bills.filter(b => b.status === 'pending')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(i => i.user && (i.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())));

  const paidHistory = bills.filter(b => b.status === 'paid')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(i => i.user && (i.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())));

  const collectionsByMonth = useMemo(() => {
    const paidBills = bills.filter(b => b.status === 'paid');
    const history: Record<string, number> = {};
    paidBills.forEach(bill => {
      const month = bill.billingMonth;
      if (month) history[month] = (history[month] || 0) + bill.amount;
    });
    return Object.entries(history).sort((a, b) => {
        const partsA = a[0].split(' ');
        const partsB = b[0].split(' ');
        const yearA = partsA[1] ? parseInt(partsA[1]) : 0;
        const yearB = partsB[1] ? parseInt(partsB[1]) : 0;
        if (yearA !== yearB) return yearB - yearA;
        const mIdxA = MONTHS_BN.indexOf(partsA[0]);
        const mIdxB = MONTHS_BN.indexOf(partsB[0]);
        return mIdxB - mIdxA;
    });
  }, [bills]);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim());
        if (rows.length < 2) throw new Error("ফাইলটি ফাঁকা");
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
        let importCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim().replace(/['"]+/g, ''));
          const data: any = {};
          headers.forEach((header, index) => { data[header] = values[index]; });
          const fullName = data.name || data.fullname || data['full name'];
          const username = data.username || data['user id'];
          if (!fullName || !username || users.some(u => u.username === username)) continue;
          onAddUser({
            id: 'u' + Date.now() + i, fullName, username, password: data.password || '123456',
            email: '', phone: '', address: '', role: 'customer', packageId: packages[0].id,
            status: 'active', expiryDate: data.expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            balance: 0, dataUsedGb: 0, dataLimitGb: 0
          });
          importCount++;
        }
        setNotification({ message: `${importCount} জন গ্রাহক যুক্ত হয়েছে`, type: 'success' });
        setShowImportModal(false);
      } catch (err) { setNotification({ message: "ভুল CSV ফাইল!", type: 'error' }); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkQuickExtend = () => {
    selectedUserIds.forEach(id => {
      const user = users.find(u => u.id === id);
      if (user) {
        const cur = new Date(user.expiryDate);
        const next = new Date(cur.getTime() + 30 * 24 * 60 * 60 * 1000);
        onUpdateUser({ ...user, status: 'active', expiryDate: next.toISOString().split('T')[0] });
      }
    });
    setNotification({ message: `${selectedUserIds.length} জনের মেয়াদ বাড়ানো হয়েছে`, type: 'success' });
    setSelectedUserIds([]);
  };

  const handleBulkDeleteUsers = () => {
    if (window.confirm(`${selectedUserIds.length} জন কাস্টমার ডিলিট করবেন?`)) {
      selectedUserIds.forEach(id => onDeleteUser(id));
      setSelectedUserIds([]);
    }
  };

  // Fix: changed handleConfirmGenerateBills to async to await onGenerateMonthlyBills
  const handleConfirmGenerateBills = async () => {
    const targetMonthStr = `${billingMonth} ${billingYear}`;
    let targetIds: string[] | undefined = undefined;

    if (individualBillTarget) {
      targetIds = [individualBillTarget.id];
    } else if (selectedUserIds.length > 0) {
      targetIds = selectedUserIds;
    }

    const count = await onGenerateMonthlyBills(targetMonthStr, targetIds);
    setShowGenerateModal(false);
    setIndividualBillTarget(null);
    setSelectedUserIds([]);
    if (count > 0) setNotification({ message: `${count}টি বিল তৈরি হয়েছে`, type: 'success' });
    else setNotification({ message: "কোনো নতুন বিল তৈরি হয়নি", type: 'error' });
  };

  const handleCollectPayment = () => {
    if (!payingUser) return;
    onAddBill({ ...payingUser.bill, amount: paymentDetails.amount, method: paymentDetails.method, date: new Date().toISOString().split('T')[0], status: 'paid' });
    setPayingUser(null);
    setNotification({ message: "পেমেন্ট সফল!", type: 'success' });
  };

  return (
    <div className="space-y-6 relative pb-20">
      {notification && (
        <div className={`fixed top-20 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${notification.type === 'success' ? 'bg-white border-green-100 text-green-700' : 'bg-white border-red-100 text-red-700'}`}>
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">মোট কাস্টমার</p>
          <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
        </div>
        <button onClick={() => setShowHistoryModal(true)} className="bg-white p-5 rounded-3xl border border-indigo-100 text-left hover:bg-indigo-50/30 transition-all shadow-sm">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{currentMonthNameBn}-এর কালেকশন</p>
          <h3 className="text-2xl font-bold text-indigo-600">৳{stats.totalRevenue}</h3>
        </button>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">বাকি বিল</p>
          <h3 className="text-2xl font-bold text-red-600">{stats.monthlyDues}টি</h3>
        </div>
        <button onClick={() => { setIndividualBillTarget(null); setShowGenerateModal(true); }} className="bg-indigo-600 p-5 rounded-3xl text-white font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">
          ➕ বিল জেনারেট
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>কাস্টমার</button>
        <button onClick={() => setActiveTab('billing')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>বিলিং</button>
        <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>সেটিংস</button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300" 
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length} 
                onChange={() => setSelectedUserIds(selectedUserIds.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id))} 
              />
              <input type="text" placeholder="কাস্টমার খুঁজুন..." className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs w-full md:w-64 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowImportModal(true)} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200">📊 শীট ইমপোর্ট</button>
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-indigo-700">নতুন কাস্টমার +</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">নাম ও আইডি</th>
                  <th className="px-6 py-4">প্যাকেজ</th>
                  <th className="px-6 py-4">মেয়াদ</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${selectedUserIds.includes(user.id) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600" checked={selectedUserIds.includes(user.id)} onChange={() => setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-slate-800">{user.fullName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">UID: {user.username}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{packages.find(p => p.id === user.packageId)?.name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{user.expiryDate}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => { setIndividualBillTarget(user); setShowGenerateModal(true); }} className="text-indigo-600 text-[10px] font-black border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-50">বিল তৈরি</button>
                      <button onClick={() => setEditingUser(user)} className="text-slate-600 text-[10px] font-bold hover:text-indigo-600 px-2">এডিট</button>
                      <button onClick={() => setDeletingUser(user)} className="text-red-400 text-[10px] font-bold hover:bg-red-50 rounded-lg px-2">ডিলিট</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex gap-2">
                <button onClick={() => setBillingSubTab('pending')} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all ${billingSubTab === 'pending' ? 'bg-red-500 text-white' : 'bg-white border text-slate-400'}`}>বাকি বিল ({allPendingBills.length})</button>
                <button onClick={() => setBillingSubTab('history')} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all ${billingSubTab === 'history' ? 'bg-green-500 text-white' : 'bg-white border text-slate-400'}`}>পেমেন্ট হিস্ট্রি</button>
              </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">গ্রাহকের নাম ও মাস</th>
                    <th className="px-6 py-4">টাকা</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(billingSubTab === 'pending' ? allPendingBills : paidHistory).map(({bill, user}) => (
                    <tr key={bill!.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-slate-800">{user?.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{bill!.billingMonth}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-700">৳{bill!.amount}</td>
                      <td className="px-6 py-4 text-right">
                         {bill!.status === 'pending' ? (
                           <button onClick={() => { setPayingUser({user: user!, bill: bill!}); setPaymentDetails({amount: bill!.amount, method: 'Cash'}); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-green-700">বিল গ্রহণ</button>
                         ) : (
                           <span className="text-green-500 text-[9px] font-black bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase">পরিশোধিত</span>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedUserIds.length > 0 && activeTab === 'users' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-white/10">
          <span className="text-xs font-bold border-r border-white/20 pr-6">{selectedUserIds.length} জন সিলেক্টেড</span>
          <div className="flex gap-3">
            <button onClick={handleBulkQuickExtend} className="bg-indigo-500 px-5 py-2 rounded-full text-[10px] font-black">+৩০ দিন</button>
            <button onClick={() => { setIndividualBillTarget(null); setShowGenerateModal(true); }} className="bg-white text-slate-900 px-5 py-2 rounded-full text-[10px] font-black">বিল জেনারেট</button>
            <button onClick={handleBulkDeleteUsers} className="bg-red-500 px-5 py-2 rounded-full text-[10px] font-black">ডিলিট</button>
          </div>
          <button onClick={() => setSelectedUserIds([])} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
      )}

      {/* Billing Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 animate-in slide-in-from-top-10 duration-500">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">বিল জেনারেট করুন</h3>
            <p className="text-sm text-slate-500 mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <span className="font-bold text-indigo-700">টার্গেট:</span> {
                individualBillTarget ? 
                `১ জন (গ্রাহক: ${individualBillTarget.fullName})` : 
                (selectedUserIds.length > 0 ? `নির্বাচিত ${selectedUserIds.length} জন কাস্টমার` : 'সকল সচল কাস্টমার')
              }
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">বিলিং মাস</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={billingMonth} onChange={e => setBillingMonth(e.target.value)}>
                  {MONTHS_BN.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">বছর</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={billingYear} onChange={e => setBillingYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowGenerateModal(false); setIndividualBillTarget(null); }} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={handleConfirmGenerateBills} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100">জেনারেট করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Rest of modals */}
      {payingUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-bold mb-6 text-center">পেমেন্ট গ্রহণ</h3>
            <div className="space-y-4">
               <input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xl text-indigo-600" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: Number(e.target.value)})} />
               <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={paymentDetails.method} onChange={e => setPaymentDetails({...paymentDetails, method: e.target.value as any})}>
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
               </select>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setPayingUser(null)} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={handleCollectPayment} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg">পরিশোধ</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">কাস্টমার এডিট</h3>
            <div className="space-y-4">
              <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} />
              <div className="relative">
                <input type={showEditPassword ? "text" : "password"} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showEditPassword ? '🙈' : '👁️'}</button>
              </div>
              <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium" value={editingUser.expiryDate} onChange={e => setEditingUser({...editingUser, expiryDate: e.target.value})} />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setEditingUser(null)} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={() => { onUpdateUser(editingUser); setEditingUser(null); }} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold">আপডেট</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
