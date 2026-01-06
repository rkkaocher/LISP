import React, { useState } from 'react';
import { User, Package, BillingRecord } from '../types';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  onUpdateUser: (u: User) => void;
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onAddBill: (b: BillingRecord) => void;
  onUpdateBill: (b: BillingRecord) => void;
  onDeleteBill: (id: string) => void;
  onUpdatePackage: (p: Package) => void;
  onAddPackage: (p: Package) => void;
  onDeletePackage: (id: string) => void;
  onGenerateMonthlyBills: (month: string) => number;
}

const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], packages = [], bills = [], 
  onAddUser, onDeleteUser, onAddBill, onUpdateBill,
  onAddPackage, onUpdatePackage, onDeletePackage,
  onGenerateMonthlyBills 
}) => {
  // --- STATES ---
  const [activeTab, setActiveTab] = useState<'users' | 'bills' | 'packages'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [extraChargeUser, setExtraChargeUser] = useState<User | null>(null);
  const [extraChargeAmount, setExtraChargeAmount] = useState('');
  const [extraChargeDesc, setExtraChargeDesc] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // New User State
  const [newUser, setNewUser] = useState({ fullName: '', username: '', password: 'password123', packageId: packages[0]?.id || '' });

  const now = new Date();
  const currentMonth = MONTHS_BN[now.getMonth()] + ' ' + now.getFullYear();

  // --- NOTIFICATION ---
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- STATS ---
  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    revenue: bills.filter(b => b.status === 'paid' && b.billingMonth === currentMonth).reduce((acc, b) => acc + b.amount, 0),
    pending: bills.filter(b => b.status === 'pending').length
  };

  // --- LOGIC: CSV IMPORT ---
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let added = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: any = {};
          headers.forEach((h, idx) => row[h] = values[idx]?.trim());
          if (row.name && row.username) {
            onAddUser({
              id: 'u' + Date.now() + i,
              fullName: row.name,
              username: row.username,
              password: row.password || 'password123',
              role: 'customer',
              packageId: packages[0]?.id || '',
              status: 'active',
              balance: 0,
              dataUsedGb: 0,
              dataLimitGb: 0,
              expiryDate: '',
              upstreamProvider: 'Amber IT'
            });
            added++;
          }
        }
        showNotification(`${added} জন কাস্টমার যোগ হয়েছে`, 'success');
        setShowImportModal(false);
      } catch (err) { showNotification('CSV ফাইলে সমস্যা', 'error'); }
    };
    reader.readAsText(file);
  };

  // --- LOGIC: EXTRA CHARGE ---
  const handleExtraCharge = () => {
    if (!extraChargeUser || !extraChargeAmount) return;
    onAddBill({
      id: 'b' + Date.now(),
      userId: extraChargeUser.id,
      amount: Number(extraChargeAmount),
      date: new Date().toISOString().split('T')[0],
      billingMonth: currentMonth,
      status: 'pending',
      method: 'None',
      type: 'miscellaneous',
      description: extraChargeDesc || 'অতিরিক্ত চার্জ'
    });
    setExtraChargeUser(null); setExtraChargeAmount(''); setExtraChargeDesc('');
    showNotification('এক্সট্রা চার্জ যোগ হয়েছে', 'success');
  };

  // --- LOGIC: EXPORT JSON ---
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ users, packages, bills }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri; link.download = `isp_backup_${Date.now()}.json`;
    link.click();
    showNotification('ডাটা ব্যাকআপ সফল', 'success');
  };

  const filteredUsers = users.filter(u => u.role === 'customer' && (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="min-h-screen bg-slate-50 pb-20 p-4 md:p-8">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border-l-4 bg-white animate-in slide-in-from-right ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          <p className="font-black text-slate-800">{notification.message}</p>
        </div>
      )}

      {/* Action Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">ISP<span className="text-indigo-600">MANAGER</span></h1>
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={handleExportJSON} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">📥 JSON ব্যাকআপ</button>
          <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm">📄 CSV ইমপোর্ট</button>
          <button onClick={() => onGenerateMonthlyBills(currentMonth)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg">⚡ বিল জেনারেট</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">মোট ইউজার</p>
          <h2 className="text-4xl font-black text-slate-800">{stats.totalUsers}</h2>
        </div>
        <div className="bg-white p-6 rounded-[32px] border shadow-sm">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">মাসিক আয়</p>
          <h2 className="text-4xl font-black text-emerald-600">৳{stats.revenue}</h2>
        </div>
        <div className="bg-white p-6 rounded-[32px] border shadow-sm">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">বাকি বিল</p>
          <h2 className="text-4xl font-black text-rose-500">{stats.pending} <span className="text-sm">টি</span></h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border w-fit shadow-sm">
        {['users', 'bills', 'packages'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === t ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400'}`}>
            {t === 'users' ? 'Customers' : t === 'bills' ? 'Billing' : 'Packages'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'users' && (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row justify-between gap-4 border-b">
              <input type="text" placeholder="নাম বা আইডি দিয়ে সার্চ..." className="bg-slate-50 px-5 py-3 rounded-2xl border-none ring-1 ring-slate-200 outline-none w-full md:w-96 focus:ring-2 focus:ring-indigo-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black">+ নতুন কাস্টমার</button>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                <tr><th className="px-6 py-4 text-left">কাস্টমার</th><th className="px-6 py-4 text-left">প্যাকেজ</th><th className="px-6 py-4 text-left">ব্যালেন্স</th><th className="px-6 py-4 text-right">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-800">{u.fullName}</p>
                      <p className="text-xs font-bold text-slate-400">@{u.username}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">{packages.find(p => p.id === u.packageId)?.name || 'N/A'}</td>
                    <td className="px-6 py-4 font-mono font-black text-indigo-600">৳{u.balance}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => setExtraChargeUser(u)} className="text-emerald-600 font-black text-[10px] uppercase hover:underline">চার্জ যোগ</button>
                      <button onClick={() => onDeleteUser(u.id)} className="text-rose-500 font-black text-[10px] uppercase hover:underline">ডিলিট</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                <tr><th className="px-6 py-4 text-left">কাস্টমার</th><th className="px-6 py-4 text-left">মাস ও বিবরণ</th><th className="px-6 py-4 text-left">টাকা</th><th className="px-6 py-4 text-left">অবস্থা</th><th className="px-6 py-4 text-right">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bills.slice().reverse().map(b => (
                  <tr key={b.id}>
                    <td className="px-6 py-4 font-bold">{users.find(u => u.id === b.userId)?.fullName}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{b.billingMonth}</p>
                      <p className="text-[10px] text-slate-400 italic">{b.description}</p>
                    </td>
                    <td className="px-6 py-4 font-black">৳{b.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${b.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 animate-pulse'}`}>{b.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {b.status === 'pending' && <button onClick={() => onUpdateBill({...b, status: 'paid'})} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">পেইড মার্ক</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-indigo-600 p-8 rounded-[32px] text-white flex flex-col justify-center items-center text-center shadow-xl">
               <h3 className="text-xl font-black mb-2">নতুন প্যাকেজ</h3>
               <p className="text-indigo-100 text-xs mb-6">আপনার সার্ভিসের জন্য নতুন প্ল্যান যোগ করুন</p>
               <button onClick={() => setEditingPackage({id: 'pkg'+Date.now(), name: '', price: 0, speed: '', features: []})} className="w-full py-3 bg-white text-indigo-600 rounded-2xl font-black shadow-lg">তৈরি করুন</button>
            </div>
            {packages.map(p => (
              <div key={p.id} className="bg-white p-8 rounded-[32px] border shadow-sm group hover:border-indigo-400 transition-all">
                <h3 className="text-2xl font-black text-slate-800">{p.name}</h3>
                <p className="text-4xl font-black text-indigo-600 my-4">৳{p.price}</p>
                <div className="flex justify-between items-center mt-6">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{p.speed}</span>
                  <div className="space-x-2">
                    <button onClick={() => setEditingPackage(p)} className="text-indigo-600 font-bold text-xs">এডিট</button>
                    <button onClick={() => onDeletePackage(p.id)} className="text-rose-500 font-bold text-xs">ডিলিট</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ALL MODALS --- */}
      
      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-black mb-2">CSV ইমপোর্ট</h2>
            <p className="text-slate-500 text-sm mb-6">ফাইলে Name, Username কলাম থাকা বাধ্যতামূলক</p>
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" id="csvFile" />
            <label htmlFor="csvFile" className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-black cursor-pointer shadow-lg">ফাইল সিলেক্ট করুন</button>
            <button onClick={() => setShowImportModal(false)} className="mt-4 text-slate-400 font-bold">বাতিল</button>
          </div>
        </div>
      )}

      {/* Package Edit/Add Modal */}
      {editingPackage && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl">
            <h2 className="text-3xl font-black text-slate-800 mb-8">প্যাকেজ সেটিংস</h2>
            <div className="space-y-4">
              <input placeholder="প্যাকেজ নাম" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold ring-1 ring-slate-200" value={editingPackage.name} onChange={e => setEditingPackage({...editingPackage, name: e.target.value})} />
              <input type="number" placeholder="৳ দাম" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold ring-1 ring-slate-200" value={editingPackage.price} onChange={e => setEditingPackage({...editingPackage, price: Number(e.target.value)})} />
              <input placeholder="গতি (যেমন: 10Mbps)" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold ring-1 ring-slate-200" value={editingPackage.speed} onChange={e => setEditingPackage({...editingPackage, speed: e.target.value})} />
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => {
                if(packages.some(p => p.id === editingPackage.id)) onUpdatePackage(editingPackage);
                else onAddPackage(editingPackage);
                setEditingPackage(null);
                showNotification('সেভ হয়েছে', 'success');
              }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200">সেভ করুন</button>
              <button onClick={() => setEditingPackage(null)} className="flex-1 py-4 font-bold text-slate-400">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Charge Modal */}
      {extraChargeUser && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black mb-2">অতিরিক্ত চার্জ</h2>
            <p className="text-slate-500 mb-6 font-bold">কাস্টমার: {extraChargeUser.fullName}</p>
            <div className="space-y-4">
              <input type="number" placeholder="টাকার পরিমাণ (৳)" className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500" value={extraChargeAmount} onChange={e => setExtraChargeAmount(e.target.value)} />
              <input placeholder="বিবরণ (যেমন: রাউটার কেনা)" className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500" value={extraChargeDesc} onChange={e => setExtraChargeDesc(e.target.value)} />
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={handleExtraCharge} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black">চার্জ যোগ করুন</button>
              <button onClick={() => setExtraChargeUser(null)} className="flex-1 py-4 font-bold text-slate-400">বাতিল</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
