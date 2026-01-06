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
  onDeletePackage: (id: string) => void; // Added for cleanup
  onGenerateMonthlyBills: (month: string) => number;
  onExportData: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], 
  packages = [], 
  bills = [], 
  onUpdateUser,
  onAddUser, 
  onDeleteUser, 
  onUpdateBill,
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'bills' | 'packages'>('users');
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- LOGIC: Package Edit/Delete ---
  const handleSavePackage = (pkg: Package) => {
    onUpdatePackage(pkg);
    setEditingPackage(null);
    showNotification('প্যাকেজ আপডেট করা হয়েছে', 'success');
  };

  const handleDeletePackage = (id: string) => {
    if (window.confirm('আপনি কি এই প্যাকেজটি ডিলিট করতে চান?')) {
      onDeletePackage(id);
      showNotification('প্যাকেজ ডিলিট হয়েছে', 'success');
    }
  };

  // --- LOGIC: Data Export (JSON) ---
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ users, packages, bills }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `isp_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showNotification('ডাটা এক্সপোর্ট সফল হয়েছে', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 p-6">
      {notification && (
        <div className="fixed top-5 right-5 bg-white border-l-4 border-indigo-500 shadow-2xl p-4 z-50 rounded-r-lg animate-in slide-in-from-right">
          <p className="font-bold text-slate-800">{notification.message}</p>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">ISP Controller</h1>
        <button 
          onClick={handleExportJSON}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
        >
          <span>📥</span> এক্সপোর্ট ব্যাকআপ (JSON)
        </button>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar: Tab Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {['users', 'bills', 'packages'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-full text-left px-6 py-4 rounded-2xl font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-xl scale-105' : 'bg-white text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab === 'users' && '👥 কাস্টমার লিস্ট'}
              {tab === 'bills' && '💳 বিলিং হিস্টোরি'}
              {tab === 'packages' && '📦 প্যাকেজ সেটিংস'}
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          {/* PACKAGE MANAGEMENT VIEW */}
          {activeTab === 'packages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{pkg.name}</h3>
                      <p className="text-indigo-600 font-bold text-lg">৳{pkg.price}</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase">
                      {pkg.speed}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingPackage(pkg)}
                      className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200"
                    >
                      এডিট
                    </button>
                    <button 
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100"
                    >
                      ডিলিট
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CUSTOMER PORTAL / BILL HISTORY VIEW */}
          {activeTab === 'bills' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h2 className="font-black text-slate-800">পেমেন্ট স্ট্যাটাস ও ট্র্যাকিং</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-50">
                      <th className="px-6 py-4">কাস্টমার</th>
                      <th className="px-6 py-4">মাস</th>
                      <th className="px-6 py-4">পরিমাণ</th>
                      <th className="px-6 py-4">অবস্থা</th>
                      <th className="px-6 py-4">বকেয়া</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bills.slice().reverse().map(bill => {
                      const user = users.find(u => u.id === bill.userId);
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{user?.fullName}</p>
                            <p className="text-xs text-slate-400">ID: {user?.username}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">{bill.billingMonth}</td>
                          <td className="px-6 py-4 font-black text-slate-700">৳{bill.amount}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 animate-pulse'
                            }`}>
                              {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-slate-600">৳{user?.balance || 0}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Package Modal */}
      {editingPackage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl">
            <h2 className="text-3xl font-black text-slate-800 mb-6">প্যাকেজ এডিট</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-2">প্যাকেজ নাম</label>
                <input 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold"
                  value={editingPackage.name}
                  onChange={e => setEditingPackage({...editingPackage, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-2">মূল্য (৳)</label>
                <input 
                  type="number"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold text-indigo-600"
                  value={editingPackage.price}
                  onChange={e => setEditingPackage({...editingPackage, price: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setEditingPackage(null)}
                className="flex-1 py-4 font-bold text-slate-400"
              >
                বাতিল
              </button>
              <button 
                onClick={() => handleSavePackage(editingPackage)}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200"
              >
                আপডেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
