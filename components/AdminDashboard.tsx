
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
  onGenerateMonthlyBills: (month: string, targetUserIds?: string[]) => number;
  currentUser?: User;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const UPSTREAM_PROVIDERS = [
  'Amber IT', 'Link3', 'Carnival', 'Circle Network', 'Dot Internet', 'Maya Cyber World', 'Cyclone', 'অন্যান্য'
];

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, packages, bills, onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onDeleteBillsByMonth, onGenerateMonthlyBills, currentUser, onExportData, onImportData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'settings'>('users');
  const [billingSubTab, setBillingSubTab] = useState<'pending' | 'history'>('pending');
  
  // Selection States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  // Modals States
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
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataLimitGb: 0, upstreamProvider: UPSTREAM_PROVIDERS[0]
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

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid' && b.billingMonth === currentBillingMonthStr).reduce((acc, b) => acc + b.amount, 0),
    monthlyDues: bills.filter(b => b.status === 'pending').length
  };

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
      history[month] = (history[month] || 0) + bill.amount;
    });
    return Object.entries(history).sort((a, b) => {
        const [monthA, yearA] = a[0].split(' ');
        const [monthB, yearB] = b[0].split(' ');
        if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
        return MONTHS_BN.indexOf(monthB) - MONTHS_BN.indexOf(monthA);
    });
  }, [bills]);

  // CSV Import Logic
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
        let skipCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim().replace(/['"]+/g, ''));
          const data: any = {};
          headers.forEach((header, index) => { data[header] = values[index]; });

          const fullName = data.name || data.fullname || data['full name'];
          const username = data.username || data['user id'] || data.userid;
          
          if (!fullName || !username) { skipCount++; continue; }
          if (users.some(u => u.username === username)) { skipCount++; continue; }

          const userToAdd: User = {
            id: 'u' + Date.now() + i + Math.floor(Math.random() * 1000),
            fullName: fullName,
            username: username,
            password: data.password || '123456',
            email: data.email || '', phone: data.phone || '', address: data.address || '',
            role: 'customer',
            packageId: packages.find(p => p.id === data.packageid || p.name.toLowerCase().includes((data.package || '').toLowerCase()))?.id || packages[0].id,
            status: 'active',
            expiryDate: data.expiry || data.expirydate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            balance: 0, dataUsedGb: 0, dataLimitGb: 0, upstreamProvider: data.provider || UPSTREAM_PROVIDERS[0]
          };
          onAddUser(userToAdd);
          importCount++;
        }
        setNotification({ message: `${importCount} জন গ্রাহক যুক্ত হয়েছে। ${skipCount > 0 ? skipCount + ' জন গ্রাহক ডুপ্লিকেট বা ভুল তথ্যের জন্য বাদ পড়েছে' : ''}`, type: 'success' });
        setShowImportModal(false);
      } catch (err) {
        setNotification({ message: "ফাইল রিড করতে সমস্যা হয়েছে। সঠিক CSV ফাইল আপলোড করুন।", type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Actions
  const handleBulkQuickExtend = () => {
    selectedUserIds.forEach(id => {
      const user = users.find(u => u.id === id);
      if (user) {
        const cur = new Date(user.expiryDate);
        const next = new Date(cur.getTime() + 30 * 24 * 60 * 60 * 1000);
        onUpdateUser({ ...user, status: 'active', expiryDate: next.toISOString().split('T')[0] });
      }
    });
    setNotification({ message: `${selectedUserIds.length} জন কাস্টমারের মেয়াদ বাড়ানো হয়েছে`, type: 'success' });
    setSelectedUserIds([]);
  };

  const handleBulkDeleteUsers = () => {
    if (window.confirm(`${selectedUserIds.length} জন কাস্টমার ডিলিট করতে চান?`)) {
      selectedUserIds.forEach(id => onDeleteUser(id));
      setSelectedUserIds([]);
      setNotification({ message: "নির্বাচিত গ্রাহকদের ডিলিট করা হয়েছে", type: 'success' });
    }
  };

  const handleBulkDeleteBills = () => {
    if (window.confirm(`${selectedBillIds.length}টি বিল ডিলিট করতে চান?`)) {
      selectedBillIds.forEach(id => onDeleteBill(id));
      setSelectedBillIds([]);
      setNotification({ message: "নির্বাচিত বিলগুলো ডিলিট করা হয়েছে", type: 'success' });
    }
  };

  const handleConfirmGenerateBills = () => {
    const targetMonthStr = `${billingMonth} ${billingYear}`;
    const targetIds = individualBillTarget ? [individualBillTarget.id] : (selectedUserIds.length > 0 ? selectedUserIds : undefined);
    
    const count = onGenerateMonthlyBills(targetMonthStr, targetIds);
    
    setShowGenerateModal(false);
    setIndividualBillTarget(null);
    setSelectedUserIds([]);
    
    if (count > 0) {
      setNotification({ message: `${targetMonthStr}-এর বিল জেনারেট করা হয়েছে`, type: 'success' });
    } else {
      setNotification({ message: "জেনারেট করার মতো কোনো নতুন বিল নেই অথবা এই মাসের বিল আগে তৈরি হয়েছে", type: 'error' });
    }
  };

  const handleAddExtraCharge = () => {
    if (!extraChargeUser || !extraChargeAmount || !extraChargeDesc) {
      setNotification({ message: "টাকার পরিমাণ ও বিবরণ দিন", type: 'error' });
      return;
    }
    onAddBill({
      id: 'b' + Date.now(), userId: extraChargeUser.id, amount: Number(extraChargeAmount),
      date: '', billingMonth: currentBillingMonthStr, status: 'pending', method: 'None', type: 'miscellaneous', description: extraChargeDesc
    });
    setExtraChargeUser(null); setExtraChargeAmount(''); setExtraChargeDesc('');
    setNotification({ message: "এক্সট্রা চার্জ যোগ করা হয়েছে", type: 'success' });
  };

  const handleCollectPayment = () => {
    if (!payingUser) return;
    onAddBill({ ...payingUser.bill, amount: paymentDetails.amount, method: paymentDetails.method, date: new Date().toISOString().split('T')[0], status: 'paid' });
    setPayingUser(null);
    setNotification({ message: "পেমেন্ট গ্রহণ করা হয়েছে!", type: 'success' });
  };

  const handleUpdateAdminProfile = () => {
    if (currentUser) {
      onUpdateUser({ ...currentUser, fullName: adminProfile.fullName, username: adminProfile.username, password: adminProfile.password });
      setNotification({ message: "প্রোফাইল আপডেট হয়েছে", type: 'success' });
    }
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
        <button onClick={() => { setIndividualBillTarget(null); setShowGenerateModal(true); }} className="bg-indigo-600 p-5 rounded-3xl text-white font-bold text-sm shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
          ➕ বিল জেনারেট
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>কাস্টমার</button>
        <button onClick={() => setActiveTab('billing')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>বিলিং</button>
        <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>সেটিংস</button>
      </div>

      {/* Content Area */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300" 
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length} 
                onChange={() => setSelectedUserIds(selectedUserIds.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id))} 
              />
              <input type="text" placeholder="কাস্টমার খুঁজুন..." className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs w-full md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowImportModal(true)} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2">📊 শীট থেকে ইমপোর্ট</button>
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">নতুন কাস্টমার +</button>
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
                      <p className="text-[9px] text-slate-400 font-bold tracking-tight">UID: {user.username}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{packages.find(p => p.id === user.packageId)?.name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{user.expiryDate}</td>
                    <td className="px-6 py-4 text-right flex flex-wrap justify-end gap-2">
                      <button onClick={() => { setIndividualBillTarget(user); setShowGenerateModal(true); }} className="text-indigo-600 text-[10px] font-extrabold border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-50">বিল তৈরি</button>
                      <button onClick={() => setExtraChargeUser(user)} className="text-amber-600 text-[10px] font-extrabold border border-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-50">+ চার্জ</button>
                      <button onClick={() => { setEditingUser(user); setShowEditPassword(false); }} className="text-slate-600 text-[10px] font-bold px-2 hover:text-indigo-600">এডিট</button>
                      <button onClick={() => setDeletingUser(user)} className="text-red-500 text-[10px] font-bold px-2 hover:bg-red-50 rounded-lg">ডিলিট</button>
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
              <div className="flex gap-2 items-center">
                <input type="checkbox" className="w-5 h-5 mr-2 rounded border-slate-300 text-indigo-600" 
                  checked={(billingSubTab === 'pending' ? allPendingBills : paidHistory).length > 0 && selectedBillIds.length === (billingSubTab === 'pending' ? allPendingBills : paidHistory).length} 
                  onChange={() => {
                    const list = billingSubTab === 'pending' ? allPendingBills : paidHistory;
                    setSelectedBillIds(selectedBillIds.length === list.length ? [] : list.map(item => item.bill!.id));
                  }} 
                />
                <button onClick={() => {setBillingSubTab('pending'); setSelectedBillIds([]);}} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all ${billingSubTab === 'pending' ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>বাকি বিল ({allPendingBills.length})</button>
                <button onClick={() => {setBillingSubTab('history'); setSelectedBillIds([]);}} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all ${billingSubTab === 'history' ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>পেমেন্ট হিস্ট্রি</button>
              </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4">গ্রাহকের নাম ও মাস</th>
                    <th className="px-6 py-4">টাকা</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(billingSubTab === 'pending' ? allPendingBills : paidHistory).map(({bill, user}) => (
                    <tr key={bill!.id} className={`hover:bg-slate-50 transition-colors ${selectedBillIds.includes(bill!.id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-6 py-4 w-10">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600" checked={selectedBillIds.includes(bill!.id)} onChange={() => setSelectedBillIds(prev => prev.includes(bill!.id) ? prev.filter(id => id !== bill!.id) : [...prev, bill!.id])} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-slate-800">{user?.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{bill!.billingMonth}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-700">৳{bill!.amount}</td>
                      <td className="px-6 py-4 text-right">
                         {bill!.status === 'pending' ? (
                           <div className="flex justify-end gap-3">
                             <button onClick={() => setDeletingBill(bill!)} className="text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                             <button onClick={() => { setPayingUser({user: user!, bill: bill!}); setPaymentDetails({amount: bill!.amount, method: 'Cash'}); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-green-700 active:scale-95 transition-all">বিল গ্রহণ</button>
                           </div>
                         ) : (
                           <div className="flex flex-col items-end">
                             <span className="text-green-500 text-[9px] font-black bg-green-50 px-3 py-1 rounded-full uppercase border border-green-100">পরিশোধিত</span>
                             <span className="text-[8px] text-slate-300 mt-1">{bill!.method} • {bill!.date}</span>
                           </div>
                         )}
                      </td>
                    </tr>
                  ))}
                  {(billingSubTab === 'pending' ? allPendingBills : paidHistory).length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">কোনো তথ্য পাওয়া যায়নি</td></tr>
                  )}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">👤 প্রোফাইল সেটিংস</h3>
            <div className="space-y-4">
              <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="নাম" value={adminProfile.fullName} onChange={e => setAdminProfile({...adminProfile, fullName: e.target.value})} />
              <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="ইউজার আইডি" value={adminProfile.username} onChange={e => setAdminProfile({...adminProfile, username: e.target.value})} />
              <div className="relative">
                <input type={showAdminPassword ? "text" : "password"} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="পাসওয়ার্ড" value={adminProfile.password} onChange={e => setAdminProfile({...adminProfile, password: e.target.value})} />
                <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showAdminPassword ? '🙈' : '👁️'}</button>
              </div>
              <button onClick={handleUpdateAdminProfile} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all">আপডেট প্রোফাইল</button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">💾 ডেটা ব্যাকআপ</h3>
              <div className="space-y-4">
                <button onClick={onExportData} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all">📥 ডেটা এক্সপোর্ট</button>
                <label className="w-full bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-bold text-center cursor-pointer hover:bg-indigo-100 block">
                  📤 ডেটা ইমপোর্ট
                  <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onImportData(e.target.files[0])} />
                </label>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-6">নোট: ব্যাকআপ ফাইলটি সাবধানে রাখুন। ডাটা লস হলে এটি দিয়ে রিস্টোর করা যাবে।</p>
          </div>
        </div>
      )}

      {/* Floating Bulk Bars */}
      {selectedUserIds.length > 0 && activeTab === 'users' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 border border-white/10">
          <span className="text-xs font-bold border-r border-white/20 pr-6">{selectedUserIds.length} জন সিলেক্টেড</span>
          <div className="flex gap-3">
            <button onClick={handleBulkQuickExtend} className="bg-indigo-500 text-white px-5 py-2 rounded-full text-[10px] font-black hover:bg-indigo-600 transition-all">+৩০ দিন</button>
            <button onClick={() => { setIndividualBillTarget(null); setShowGenerateModal(true); }} className="bg-white text-slate-900 px-5 py-2 rounded-full text-[10px] font-black hover:bg-slate-100 transition-all">বিল জেনারেট</button>
            <button onClick={handleBulkDeleteUsers} className="bg-red-500 text-white px-5 py-2 rounded-full text-[10px] font-black hover:bg-red-600 transition-all">ডিলিট</button>
          </div>
          <button onClick={() => setSelectedUserIds([])} className="text-slate-400 hover:text-white transition-colors ml-2">✕</button>
        </div>
      )}

      {selectedBillIds.length > 0 && activeTab === 'billing' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 border border-white/10">
          <span className="text-xs font-bold border-r border-white/20 pr-6">{selectedBillIds.length}টি বিল সিলেক্টেড</span>
          <button onClick={handleBulkDeleteBills} className="bg-red-500 text-white px-5 py-2 rounded-full text-[10px] font-black hover:bg-red-600 transition-all">ডিলিট করুন</button>
          <button onClick={() => setSelectedBillIds([])} className="text-slate-400 hover:text-white transition-colors ml-2">✕</button>
        </div>
      )}

      {/* Modals */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 animate-in zoom-in duration-300 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-slate-800">গুগল শীট থেকে ইমপোর্ট</h3>
            <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
              <p className="font-bold mb-2 uppercase tracking-widest">CSV ফরম্যাট গাইড:</p>
              <p>শীটে অবশ্যই <span className="font-bold">Name</span> এবং <span className="font-bold">Username</span> কলাম থাকতে হবে। গুগল শীট থেকে <span className="font-bold">File > Download > CSV</span> হিসেবে সেভ করে আপলোড করুন।</p>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ফাইল আপলোড করুন (.csv)</p>
              <input type="file" className="hidden" accept=".csv" onChange={handleCsvImport} />
            </label>
            <button onClick={() => setShowImportModal(false)} className="w-full mt-8 py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">বন্ধ করুন</button>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 animate-in slide-in-from-top-10 duration-500">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">বিল জেনারেট করুন</h3>
            <p className="text-sm text-slate-400 mb-8 font-bold">
              {individualBillTarget ? 
                `টার্গেট: ${individualBillTarget.fullName}` : 
                (selectedUserIds.length > 0 ? `টার্গেট: নির্বাচিত ${selectedUserIds.length} জন কাস্টমার` : 'টার্গেট: সকল কাস্টমার')
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
              <button onClick={handleConfirmGenerateBills} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100">তৈরি করুন</button>
            </div>
          </div>
        </div>
      )}

      {extraChargeUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in">
            <h3 className="text-xl font-bold mb-2">অতিরিক্ত চার্জ</h3>
            <p className="text-xs text-slate-400 mb-6">{extraChargeUser.fullName}</p>
            <div className="space-y-4">
               <input type="number" placeholder="টাকার পরিমাণ" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={extraChargeAmount} onChange={e => setExtraChargeAmount(e.target.value)} />
               <input type="text" placeholder="চার্জের বিবরণ (যেমন: রাউটার কেনা)" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={extraChargeDesc} onChange={e => setExtraChargeDesc(e.target.value)} />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setExtraChargeUser(null)} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={handleAddExtraCharge} className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-bold">সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {payingUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-bold mb-2 text-center">পেমেন্ট গ্রহণ</h3>
            <p className="text-sm text-slate-500 text-center mb-6">{payingUser.user.fullName}</p>
            <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">টাকার পরিমাণ</label>
                 <input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xl text-indigo-600" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: Number(e.target.value)})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">পেমেন্ট মেথড</label>
                 <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={paymentDetails.method} onChange={e => setPaymentDetails({...paymentDetails, method: e.target.value as any})}>
                      <option value="Cash">Cash (নগদ)</option>
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ অ্যাপ)</option>
                      <option value="Rocket">Rocket (রকেট)</option>
                 </select>
               </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setPayingUser(null)} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={handleCollectPayment} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-100">পরিশোধ করুন</button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black tracking-tight uppercase">কালেকশন হিস্ট্রি</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
              {collectionsByMonth.map(([month, amount]) => (
                <div key={month} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-sm font-black text-slate-800">{month}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">মোট কালেকশন</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-indigo-600">৳{amount}</p>
                    <button onClick={() => { if(window.confirm(`${month}-এর তথ্য মুছবেন?`)) onDeleteBillsByMonth(month); }} className="text-[9px] text-red-400 hover:underline">তথ্য মুছুন</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">নতুন কাস্টমার যোগ করুন</h3>
            <div className="space-y-4">
              <input type="text" placeholder="কাস্টমারের পূর্ণ নাম" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
              <input type="text" placeholder="ইউজার আইডি (Username)" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <div className="relative">
                <input type={showAddPassword ? "text" : "password"} placeholder="পাসওয়ার্ড" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                <button onClick={() => setShowAddPassword(!showAddPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showAddPassword ? '🙈' : '👁️'}</button>
              </div>
              <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newUser.packageId} onChange={e => setNewUser({...newUser, packageId: e.target.value})}>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
              </select>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">মেয়াদের শেষ তারিখ</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={newUser.expiryDate} onChange={e => setNewUser({...newUser, expiryDate: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowAddModal(false)} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={() => {
                if(!newUser.fullName || !newUser.username) { setNotification({message: "সব তথ্য পূরণ করুন", type: 'error'}); return; }
                onAddUser({
                  id: 'u' + Date.now(), fullName: newUser.fullName!, username: newUser.username!, password: newUser.password || '123456',
                  email: '', phone: '', address: '', role: 'customer', packageId: newUser.packageId || packages[0].id,
                  status: 'active', expiryDate: newUser.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  balance: 0, dataUsedGb: 0, dataLimitGb: 0
                });
                setShowAddModal(false);
                setNewUser({fullName: '', username: '', password: '', packageId: packages[0].id});
                setNotification({message: "কাস্টমার যোগ হয়েছে!", type: 'success'});
              }} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100">সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">তথ্য এডিট করুন</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">পূর্ণ নাম</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">ইউজার আইডি (Username)</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">পাসওয়ার্ড</label>
                <div className="relative">
                  <input type={showEditPassword ? "text" : "password"} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showEditPassword ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">প্যাকেজ</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={editingUser.packageId} onChange={e => setEditingUser({...editingUser, packageId: e.target.value})}>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">মেয়াদের শেষ তারিখ</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl" value={editingUser.expiryDate} onChange={e => setEditingUser({...editingUser, expiryDate: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setEditingUser(null)} className="flex-1 font-bold text-slate-400">বাতিল</button>
              <button onClick={() => { onUpdateUser(editingUser); setEditingUser(null); setNotification({message: "তথ্য আপডেট হয়েছে!", type: 'success'}); }} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100">আপডেট</button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🗑️</div>
            <h3 className="text-xl font-bold mb-3">মুছে ফেলবেন?</h3>
            <p className="text-sm text-slate-500 mb-8">{deletingUser.fullName}-কে ডিলিট করতে চান?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onDeleteUser(deletingUser.id); setDeletingUser(null); setNotification({message: "গ্রাহক মুছে ফেলা হয়েছে", type: 'success'}); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">ডিলিট করুন</button>
              <button onClick={() => setDeletingUser(null)} className="w-full py-3 text-slate-400 font-bold">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {deletingBill && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🗑️</div>
            <h3 className="text-xl font-bold mb-3">বিলটি মুছবেন?</h3>
            <p className="text-sm text-slate-500 mb-8">এই বিলটি মুছে ফেললে পুনরায় জেনারেট করতে হবে।</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onDeleteBill(deletingBill.id); setDeletingBill(null); setNotification({message: "বিল মুছে ফেলা হয়েছে", type: 'success'}); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">ডিলিট করুন</button>
              <button onClick={() => setDeletingBill(null)} className="w-full py-3 text-slate-400 font-bold">বাতিল</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
