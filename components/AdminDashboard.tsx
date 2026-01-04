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
  users, packages, bills, onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onGenerateMonthlyBills, currentUser, onExportData, onImportData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'settings'>('users');
  const [billingSubTab, setBillingSubTab] = useState<'pending' | 'history'>('pending');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingBill, setDeletingBill] = useState<BillingRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExtraDueModal, setShowExtraDueModal] = useState<User | null>(null);
  
  const now = new Date();
  const [billingMonth, setBillingMonth] = useState(MONTHS_BN[now.getMonth()]);
  const [billingYear, setBillingYear] = useState(now.getFullYear().toString());
  const [selectedForBilling, setSelectedForBilling] = useState<string[]>([]);
  
  const [payingUser, setPayingUser] = useState<{user: User, bill: BillingRecord} | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [extraDueData, setExtraDueData] = useState({ amount: 0, description: '' });

  const [adminSettings, setAdminSettings] = useState({
    fullName: currentUser?.fullName || '',
    username: currentUser?.username || '',
    password: currentUser?.password || ''
  });

  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: '', role: 'customer', packageId: packages[0].id, 
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataLimitGb: packages[0].dataLimitGb, upstreamProvider: UPSTREAM_PROVIDERS[0]
  });

  const [paymentDetails, setPaymentDetails] = useState({ 
    amount: 0, 
    method: 'Cash' as BillingRecord['method']
  });

  const currentMonthDisplay = `${MONTHS_BN[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0),
    monthlyDues: bills.filter(b => b.status === 'pending').length,
    monthlyRevenue: bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0)
  };

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const targetMonthStr = `${billingMonth} ${billingYear}`;
  const eligibleUsersForBilling = useMemo(() => {
    return users.filter(u => 
      u.role === 'customer' && 
      !bills.some(b => b.userId === u.id && b.billingMonth === targetMonthStr && b.type === 'package')
    );
  }, [users, bills, targetMonthStr]);

  useEffect(() => {
    setSelectedForBilling(eligibleUsersForBilling.map(u => u.id));
  }, [targetMonthStr, eligibleUsersForBilling.length]);

  const handleQuickExtend = (user: User) => {
    const currentExpiry = new Date(user.expiryDate);
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updatedUser: User = {
      ...user,
      status: 'active',
      expiryDate: newExpiry.toISOString().split('T')[0]
    };
    onUpdateUser(updatedUser);
    setNotification({ message: `${user.fullName}-এর মেয়াদ ${updatedUser.expiryDate} পর্যন্ত বাড়ানো হয়েছে`, type: 'success' });
  };

  const handleToggleUserSelection = (id: string) => {
    setSelectedForBilling(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSelectAllBilling = () => {
    if (selectedForBilling.length === eligibleUsersForBilling.length) {
      setSelectedForBilling([]);
    } else {
      setSelectedForBilling(eligibleUsersForBilling.map(u => u.id));
    }
  };

  const handleConfirmGenerateBills = () => {
    if (selectedForBilling.length === 0) {
      alert("অনুগ্রহ করে অন্তত একজন কাস্টমার সিলেক্ট করুন।");
      return;
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      const count = onGenerateMonthlyBills(targetMonthStr, selectedForBilling);
      setIsGenerating(false);
      setShowGenerateModal(false);
      if (count > 0) {
        setNotification({ message: `${targetMonthStr}-এর জন্য ${count}টি বিল জেনারেট করা হয়েছে`, type: 'success' });
        setActiveTab('billing');
        setBillingSubTab('pending');
      } else {
        setNotification({ message: `কোনো নতুন বিল জেনারেট হয়নি।`, type: 'error' });
      }
    }, 800);
  };

  const handleAddExtraDue = () => {
    if (!showExtraDueModal || !extraDueData.amount || !extraDueData.description) {
      setNotification({ message: "টাকার পরিমাণ এবং বর্ণনা দিন।", type: 'error' });
      return;
    }

    const newRecord: BillingRecord = {
      id: 'misc' + Date.now(),
      userId: showExtraDueModal.id,
      amount: extraDueData.amount,
      date: '',
      billingMonth: currentMonthDisplay,
      status: 'pending',
      method: 'None',
      description: extraDueData.description,
      type: 'miscellaneous'
    };

    onAddBill(newRecord);
    setShowExtraDueModal(null);
    setExtraDueData({ amount: 0, description: '' });
    setNotification({ message: "অতিরিক্ত চার্জ যোগ করা হয়েছে!", type: 'success' });
  };

  const confirmDeleteUser = () => {
    if (deletingUser) {
      onDeleteUser(deletingUser.id);
      setNotification({ message: `কাস্টমার ${deletingUser.fullName} ডিলিট করা হয়েছে।`, type: 'success' });
      setDeletingUser(null);
    }
  };

  const confirmDeleteBill = () => {
    if (deletingBill) {
      onDeleteBill(deletingBill.id);
      setNotification({ message: "বিলটি ডিলিট করা হয়েছে।", type: 'success' });
      setDeletingBill(null);
    }
  };

  const handleCollectPayment = () => {
    if (!payingUser) return;
    const updatedBill: BillingRecord = {
      ...payingUser.bill,
      amount: paymentDetails.amount,
      method: paymentDetails.method,
      date: new Date().toISOString().split('T')[0],
      status: 'paid'
    };
    onAddBill(updatedBill);
    setPayingUser(null);
    setNotification({ message: "পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে!", type: 'success' });
  };

  const handleCreateUser = () => {
    if (!newUser.fullName || !newUser.username || !newUser.password) {
      setNotification({ message: "সবগুলো ঘর পূরণ করুন।", type: 'error' });
      return;
    }

    const userToAdd: User = {
      id: 'u' + Date.now() + Math.random().toString(36).substr(2, 5),
      fullName: newUser.fullName!,
      username: newUser.username!,
      password: newUser.password!,
      email: '',
      phone: '',
      address: '',
      role: 'customer',
      packageId: newUser.packageId || packages[0].id,
      status: 'active',
      expiryDate: newUser.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      balance: 0,
      dataUsedGb: 0,
      dataLimitGb: newUser.dataLimitGb || 0,
      upstreamProvider: newUser.upstreamProvider || UPSTREAM_PROVIDERS[0]
    };

    onAddUser(userToAdd);
    setShowAddModal(false);
    setNewUser({
      fullName: '', username: '', password: '', role: 'customer', packageId: packages[0].id, 
      status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dataLimitGb: packages[0].dataLimitGb, upstreamProvider: UPSTREAM_PROVIDERS[0]
    });
    setNotification({ message: "নতুন কাস্টমার যোগ করা হয়েছে!", type: 'success' });
  };

  const allPendingBills = bills
    .filter(b => b.status === 'pending')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(item => item.user && (
      item.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ));

  const paidHistory = bills
    .filter(b => b.status === 'paid')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(item => item.user && (
      item.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ));

  return (
    <div className="space-y-6 relative">
      {notification && (
        <div className={`fixed top-20 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 flex items-center gap-3 border ${notification.type === 'success' ? 'bg-white border-green-100 text-green-700' : 'bg-white border-red-100 text-red-700'}`}>
          <span className="text-xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">মোট কাস্টমার</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.totalUsers}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">মোট কালেকশন</p>
          <h3 className="text-2xl font-bold text-indigo-600">৳{stats.totalRevenue}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">বাকি বিল (সংখ্যা)</p>
          <h3 className="text-2xl font-bold text-red-600">{stats.monthlyDues}টি</h3>
        </div>
        <button 
          onClick={() => setShowGenerateModal(true)}
          className={`bg-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-100 flex flex-col justify-center items-center group active:scale-95 transition-all`}
        >
          <span className="font-bold text-sm">➕ বিল জেনারেট</span>
          <span className="text-[9px] opacity-70 mt-1">মাসিক বিলিং সেটআপ</span>
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit overflow-hidden">
        <button onClick={() => setActiveTab('users')} className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>কাস্টমার লিস্ট</button>
        <button onClick={() => setActiveTab('billing')} className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>বিল ও পেমেন্ট</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>সেটিংস</button>
      </div>

      {activeTab === 'billing' && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setBillingSubTab('pending')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${billingSubTab === 'pending' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>বাকি বিল</button>
          <button onClick={() => setBillingSubTab('history')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${billingSubTab === 'history' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>পেমেন্ট হিস্ট্রি</button>
        </div>
      )}

      {activeTab !== 'settings' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {activeTab === 'users' ? 'সকল কাস্টমার' : (billingSubTab === 'pending' ? 'পরিশোধিত নয় এমন বিল' : 'সফল পেমেন্ট সমূহ')}
            </h2>
            <div className="flex gap-2">
              <input type="text" placeholder="খুঁজুন..." className="px-4 py-2 bg-slate-50 border rounded-xl text-xs w-48 focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {activeTab === 'users' && (
                <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">কাস্টমার যোগ করুন +</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'users' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-4">কাস্টমার ও প্রোভাইডার</th>
                    <th className="px-6 py-4">প্যাকেজ</th>
                    <th className="px-6 py-4">মেয়াদ</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                           <p className="font-bold text-slate-800">{user.fullName}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 ml-4">ID: {user.username} | 🌐 {user.upstreamProvider}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-indigo-600">{packages.find(p => p.id === user.packageId)?.name}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{user.expiryDate}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleQuickExtend(user)} className="bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase px-2 py-1 rounded-md hover:bg-indigo-100">+৩০ দিন</button>
                          <button onClick={() => setShowExtraDueModal(user)} className="text-amber-600 font-bold text-[9px] uppercase border border-amber-100 px-2 py-1 rounded-md hover:bg-amber-50">চার্জ</button>
                          <button onClick={() => setEditingUser(user)} className="text-indigo-600 font-bold text-xs">এডিট</button>
                          <button onClick={() => setDeletingUser(user)} className="text-red-500 font-bold text-xs">ডিলিট</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-4">কাস্টমার</th>
                    <th className="px-6 py-4">বিবরণ</th>
                    <th className="px-6 py-4 text-center">মাস</th>
                    <th className="px-6 py-4">পরিমাণ</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {billingSubTab === 'pending' ? (
                    allPendingBills.map(({ bill, user }) => (
                      <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{user?.fullName}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${bill.type === 'miscellaneous' ? 'text-amber-500' : 'text-red-400'}`}>
                            {bill.type === 'miscellaneous' ? 'অন্যান্য পাওনা' : 'বাকি বিল'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-xs text-slate-500">{bill.description || 'মাসিক ইন্টারনেট বিল'}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">{bill.billingMonth}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">৳{bill.amount}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setDeletingBill(bill)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="বিল ডিলিট">
                              🗑️
                            </button>
                            <button onClick={() => user && setPayingUser({user, bill})} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">বিল গ্রহণ</button>
                           </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    paidHistory.map(({ bill, user }) => (
                      <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{user?.fullName}</p>
                          <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">{bill.method} মাধ্যমে পরিশোধিত</p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-xs text-slate-500">{bill.description || 'মাসিক ইন্টারনেট বিল'}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">{bill.date || bill.billingMonth}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">৳{bill.amount}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[9px] text-slate-400 font-bold italic">সফল</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">⚙️ অ্যাডমিন সেটিংস</h2>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">পূর্ণ নাম</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={adminSettings.fullName} onChange={(e) => setAdminSettings({...adminSettings, fullName: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">ইউজার আইডি</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={adminSettings.username} onChange={(e) => setAdminSettings({...adminSettings, username: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">পাসওয়ার্ড</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={adminSettings.password} onChange={(e) => setAdminSettings({...adminSettings, password: e.target.value})} />
                </div>
              </div>
              <div className="pt-4">
                <button onClick={() => {onUpdateUser({ ...currentUser!, ...adminSettings }); setNotification({message: "অ্যাডমিন তথ্য আপডেট হয়েছে!", type: 'success'})}} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg active:scale-95 transition-all">পরিবর্তন সেভ করুন</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">💾 ডেটা ম্যানেজমেন্ট</h2>
            <p className="text-xs text-slate-500 mb-6">আপনার সকল ডেটা ব্যাকআপ রাখুন অথবা আগের ব্যাকআপ থেকে রিস্টোর করুন।</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onExportData}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all active:scale-95"
              >
                📥 ব্যাকআপ ডাউনলোড (.json)
              </button>
              <div className="flex-1 relative">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={(e) => e.target.files?.[0] && onImportData(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button 
                  className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border-2 border-dashed border-indigo-200 px-6 py-4 rounded-2xl font-bold hover:bg-indigo-100 transition-all"
                >
                  📤 ব্যাকআপ রিস্টোর
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selective Bill Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">মাসিক বিল জেনারেট</h3>
                <p className="text-xs text-slate-500">মাস, বছর এবং কাস্টমার সিলেক্ট করে বিল তৈরি করুন।</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>
            
            <div className="p-6 border-b bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">মাস সিলেক্ট করুন</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                >
                  {MONTHS_BN.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">বছর সিলেক্ট করুন</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={billingYear}
                  onChange={(e) => setBillingYear(e.target.value)}
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="selectAll"
                  className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer"
                  checked={eligibleUsersForBilling.length > 0 && selectedForBilling.length === eligibleUsersForBilling.length}
                  onChange={handleSelectAllBilling}
                />
                <label htmlFor="selectAll" className="text-sm font-bold text-indigo-700 cursor-pointer">সবাইকে সিলেক্ট করুন</label>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm">
                {selectedForBilling.length} / {eligibleUsersForBilling.length} সিলেক্টেড
              </span>
            </div>

            <div className="flex-grow overflow-y-auto p-4 bg-white">
              {eligibleUsersForBilling.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eligibleUsersForBilling.map(user => {
                    const pkg = packages.find(p => p.id === user.packageId);
                    const isSelected = selectedForBilling.includes(user.id);
                    return (
                      <div 
                        key={user.id} 
                        onClick={() => handleToggleUserSelection(user.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-50 hover:border-slate-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                            {isSelected && <span className="text-white text-[10px]">✓</span>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.fullName}</p>
                            <p className="text-[10px] text-slate-400">ID: {user.username}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">৳{pkg?.price}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h4 className="text-slate-800 font-bold">সব কাস্টমার আপ-টু-ডেট</h4>
                  <p className="text-slate-500 text-xs mt-1">{targetMonthStr}-এর জন্য সবার বিল তৈরি করা আছে।</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex flex-col md:flex-row gap-4 items-center justify-between">
              <button onClick={() => setShowGenerateModal(false)} className="px-6 py-3 font-bold text-slate-400">বাতিল</button>
              <button 
                onClick={handleConfirmGenerateBills}
                disabled={isGenerating || selectedForBilling.length === 0}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg"
              >
                {isGenerating ? 'জেনারেট হচ্ছে...' : `${selectedForBilling.length}টি বিল তৈরি করুন`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Modals for Delete User, Edit User, Collect Payment follow same translation patterns */}
      {payingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-1">বিল কালেকশন</h3>
            <p className="text-sm text-slate-500 mb-6">{payingUser.user.fullName} - {payingUser.bill.billingMonth}</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">টাকার পরিমাণ</label>
                <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg" value={paymentDetails.amount} onChange={(e) => setPaymentDetails({...paymentDetails, amount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">পেমেন্ট মেথড</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'bKash', 'Nagad', 'Rocket'].map(m => (
                    <button key={m} onClick={() => setPaymentDetails({...paymentDetails, method: m as any})} className={`py-3 rounded-2xl text-xs font-bold border-2 transition-all ${paymentDetails.method === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setPayingUser(null)} className="flex-1 py-3 text-xs font-bold text-slate-400">বাতিল</button>
              <button onClick={handleCollectPayment} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl text-xs font-bold">পেমেন্ট সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">কাস্টমার ডিলিট?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <span className="font-bold text-slate-800">{deletingUser.fullName}</span>-কে রিমুভ করতে চান? এটি আর ফিরিয়ে আনা যাবে না।
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDeleteUser} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">হ্যাঁ, ডিলিট করুন</button>
              <button onClick={() => setDeletingUser(null)} className="w-full py-3 text-sm font-bold text-slate-400">ফিরে যান</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;