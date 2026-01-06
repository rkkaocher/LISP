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
  onUpdateBill: (b: BillingRecord) => void; // Added for marking paid
  onDeleteBill: (id: string) => void;
  onUpdatePackage: (p: Package) => void; // Added for package management
  onAddPackage: (p: Package) => void;    // Added for package management
  onDeleteBillsByMonth: (month: string) => void;
  onGenerateMonthlyBills: (month: string, targetUserIds?: string[]) => number;
  currentUser?: User;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], 
  packages = [], 
  bills = [], 
  onAddUser = () => {}, 
  onDeleteUser = () => {}, 
  onAddBill = () => {}, 
  onUpdateBill = () => {},
  onAddPackage = () => {},
  onGenerateMonthlyBills = () => 0, 
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'bills' | 'packages'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // New states for Package Management
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: '', price: '', speed: '' });

  const now = new Date();
  const currentMonth = MONTHS_BN[now.getMonth()] + ' ' + now.getFullYear();

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- LOGIC: Mark Bill as Paid ---
  const handleMarkAsPaid = (bill: BillingRecord) => {
    const updatedBill: BillingRecord = { 
      ...bill, 
      status: 'paid', 
      method: 'Bkash', // Defaulting to Bkash for ease
      date: new Date().toISOString().split('T')[0] 
    };
    onUpdateBill(updatedBill);
    showNotification(`${bill.billingMonth} মাসের বিল পরিশোধিত হিসেবে মার্ক করা হয়েছে`, 'success');
  };

  // --- LOGIC: Package Management ---
  const handleAddPackage = () => {
    if (!newPkg.name || !newPkg.price) return;
    const pkg: Package = {
      id: 'pkg' + Date.now(),
      name: newPkg.name,
      price: Number(newPkg.price),
      speed: newPkg.speed || '10Mbps',
      features: ['Unlimited Data']
    };
    onAddPackage(pkg);
    setShowPackageModal(false);
    setNewPkg({ name: '', price: '', speed: '' });
    showNotification('নতুন প্যাকেজ তৈরি হয়েছে', 'success');
  };

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && 
    (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {notification && (
        <div className={`fixed top-10 right-4 z-50 px-6 py-3 rounded-xl shadow-lg border transition-all animate-bounce ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-semibold">{notification.message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">অ্যাডমিন প্যানেল</h2>
          <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border">
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}>ইউজার</button>
            <button onClick={() => setActiveTab('bills')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'bills' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}>বিলিং</button>
            <button onClick={() => setActiveTab('packages')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'packages' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}>প্যাকেজ</button>
          </div>
        </div>

        {/* --- TAB 1: USERS --- */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between mb-6">
              <input type="text" placeholder="ইউজার খুঁজুন..." className="px-4 py-2 rounded-xl border w-72" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg">ইমপোর্ট</button>
                <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">+ নতুন কাস্টমার</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-4">নাম</th>
                    <th className="p-4">ইউজারনেম</th>
                    <th className="p-4">প্যাকেজ</th>
                    <th className="p-4">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="p-4 font-medium">{user.fullName}</td>
                      <td className="p-4 text-slate-500">{user.username}</td>
                      <td className="p-4">{packages.find(p => p.id === user.packageId)?.name || 'N/A'}</td>
                      <td className="p-4">
                        <button onClick={() => setDeletingUser(user)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded">ডিলিট</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: BILLING (With Paid Mark) --- */}
        {activeTab === 'bills' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
             <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-4">ইউজার</th>
                    <th className="p-4">মাস</th>
                    <th className="p-4">টাকা</th>
                    <th className="p-4">স্ট্যাটাস</th>
                    <th className="p-4">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bills.map(bill => {
                    const user = users.find(u => u.id === bill.userId);
                    return (
                      <tr key={bill.id} className={bill.status === 'pending' ? 'bg-orange-50/30' : ''}>
                        <td className="p-4 font-medium">{user?.fullName || 'Unknown'}</td>
                        <td className="p-4">{bill.billingMonth}</td>
                        <td className="p-4 font-bold">৳{bill.amount}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${bill.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {bill.status === 'paid' ? 'পরিশোধিত' : 'বাকি'}
                          </span>
                        </td>
                        <td className="p-4">
                          {bill.status === 'pending' && (
                            <button onClick={() => handleMarkAsPaid(bill)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm shadow-sm hover:bg-emerald-700">
                              পেইড মার্ক করুন
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
        )}

        {/* --- TAB 3: PACKAGE MANAGEMENT --- */}
        {activeTab === 'packages' && (
          <div>
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowPackageModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">+ নতুন প্যাকেজ</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white p-6 rounded-2xl border-2 border-indigo-50 shadow-sm hover:border-indigo-300 transition-all">
                  <h3 className="text-xl font-bold text-slate-800">{pkg.name}</h3>
                  <p className="text-3xl font-black text-indigo-600 my-2">৳{pkg.price}</p>
                  <p className="text-slate-500 mb-4">গতি: {pkg.speed}</p>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button className="flex-1 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold">এডিট</button>
                    <button className="flex-1 py-2 text-red-600 bg-red-50 rounded-lg text-sm font-bold">ডিলিট</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: Add Package --- */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-6">নতুন ইন্টারনেট প্যাকেজ</h3>
            <div className="space-y-4">
              <input className="w-full p-3 border rounded-xl" placeholder="প্যাকেজ নাম (e.g. Starter)" value={newPkg.name} onChange={e => setNewPkg({...newPkg, name: e.target.value})} />
              <input className="w-full p-3 border rounded-xl" placeholder="মূল্য (টাকা)" type="number" value={newPkg.price} onChange={e => setNewPkg({...newPkg, price: e.target.value})} />
              <input className="w-full p-3 border rounded-xl" placeholder="গতি (e.g. 10Mbps)" value={newPkg.speed} onChange={e => setNewPkg({...newPkg, speed: e.target.value})} />
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowPackageModal(false)} className="flex-1 py-3 text-slate-600">বাতিল</button>
              <button onClick={handleAddPackage} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">তৈরি করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Re-using your Delete and Add User modals here (Keep as is from previous code) */}
    </div>
  );
};

export default AdminDashboard;
