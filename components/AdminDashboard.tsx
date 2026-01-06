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
  onDeleteBill: (id: string) => void;
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
  onGenerateMonthlyBills = () => 0, 
  currentUser 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [extraChargeUser, setExtraChargeUser] = useState<User | null>(null);
  const [extraChargeAmount, setExtraChargeAmount] = useState('');
  const [extraChargeDesc, setExtraChargeDesc] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [newUser, setNewUser] = useState({
    fullName: '',
    username: '',
    password: 'password123',
    packageId: packages[0]?.id || ''
  });

  const now = new Date();
  const currentMonth = MONTHS_BN[now.getMonth()] + ' ' + now.getFullYear();

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && 
    (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid' && b.billingMonth === currentMonth).reduce((acc, b) => acc + b.amount, 0),
    pendingBills: bills.filter(b => b.status === 'pending').length
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.username) {
      showNotification('নাম ও ইউজারনেম দিন', 'error');
      return;
    }

    const userToAdd: User = {
      id: 'u' + Date.now(),
      fullName: newUser.fullName,
      username: newUser.username,
      password: newUser.password,
      role: 'customer',
      packageId: newUser.packageId,
      status: 'active',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      balance: 0,
      dataUsedGb: 0,
      dataLimitGb: 0,
      upstreamProvider: 'Amber IT'
    };

    onAddUser(userToAdd);
    setShowAddModal(false);
    setNewUser({ fullName: '', username: '', password: 'password123', packageId: packages[0]?.id || '' });
    showNotification('নতুন কাস্টমার যোগ হয়েছে!', 'success');
  };

  const handleDeleteUser = () => {
    if (deletingUser) {
      onDeleteUser(deletingUser.id);
      setDeletingUser(null);
      showNotification('কাস্টমার ডিলিট হয়েছে', 'success');
    }
  };

  const handleExtraCharge = () => {
    if (!extraChargeUser || !extraChargeAmount) {
      showNotification('পরিমাণ দিন', 'error');
      return;
    }

    const bill: BillingRecord = {
      id: 'b' + Date.now(),
      userId: extraChargeUser.id,
      amount: Number(extraChargeAmount),
      date: '',
      billingMonth: currentMonth,
      status: 'pending',
      method: 'None',
      type: 'miscellaneous',
      description: extraChargeDesc || 'অতিরিক্ত চার্জ'
    };

    onAddBill(bill);
    setExtraChargeUser(null);
    setExtraChargeAmount('');
    setExtraChargeDesc('');
    showNotification('এক্সট্রা চার্জ যোগ হয়েছে', 'success');
  };

  const handleGenerateBills = () => {
    const count = onGenerateMonthlyBills(currentMonth);
    setShowGenerateModal(false);
    showNotification(`${count}টি বিল জেনারেট হয়েছে`, 'success');
  };

  const handleCsvImport = () => {
    showNotification('CSV ইমপোর্ট সফল! (ডেমো মোড)', 'success');
    setShowImportModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-20">
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-8 py-5 rounded-3xl shadow-2xl border-2 transition-all animate-in slide-in-from-right duration-500 ${notification.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'}`}>
          <p className="font-bold text-lg">{notification.message}</p>
        </div>
      )}

      <div className="container mx-auto px-4 pt-10">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
          এডমিন ড্যাশবোর্ড
        </h1>
        <p className="text-2xl text-slate-700 mb-12">স্বাগতম, {currentUser?.fullName || 'System Administrator'}!</p>

        {/* Premium Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all duration-300">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-4">মোট কাস্টমার</p>
            <p className="text-6xl font-black">{stats.totalUsers}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all duration-300">
            <p className="text-green-100 text-sm font-bold uppercase tracking-widest mb-4">এ মাসের কালেকশন</p>
            <p className="text-6xl font-black">৳{stats.totalRevenue}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all duration-300">
            <p className="text-red-100 text-sm font-bold uppercase tracking-widest mb-4">বাকি বিল</p>
            <p className="text-6xl font-black">{stats.pendingBills}টি</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <input 
              type="text" 
              placeholder="কাস্টমার খুঁজুন..." 
              className="w-full md:w-96 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowImportModal(true)} className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                📊 ইমপোর্ট
              </button>
              <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                ➕ নতুন কাস্টমার
              </button>
              <button onClick={() => setShowGenerateModal(true)} className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                💰 বিল জেনারেট
              </button>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-8 py-6 text-left text-sm font-bold uppercase tracking-wider">নাম ও আইডি</th>
                  <th className="px-8 py-6 text-left text-sm font-bold uppercase tracking-wider">প্যাকেজ</th>
                  <th className="px-8 py-6 text-left text-sm font-bold uppercase tracking-wider">মেয়াদ</th>
                  <th className="px-8 py-6 text-right text-sm font-bold uppercase tracking-wider">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 text-lg">{user.fullName}</p>
                      <p className="text-sm text-slate-500">{user.username}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-5 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                        {packages.find(p => p.id === user.packageId)?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-slate-700 font-bold text-lg">{user.expiryDate}</td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => setExtraChargeUser(user)} className="text-amber-600 font-bold text-lg mr-6 hover:text-amber-700 transition-all">
                        + চার্জ
                      </button>
                      <button onClick={() => setDeletingUser(user)} className="text-red-600 font-bold text-lg hover:text-red-700 transition-all">
                        ডিলিট
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-24">
                <p className="text-slate-500 text-2xl font-bold">কোনো কাস্টমার পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        </div>

        {/* All Modals with premium style */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-10 w-full max-w-lg shadow-2xl">
              <h3 className="text-3xl font-black text-indigo-600 mb-8">নতুন কাস্টমার যোগ করুন</h3>
              <input type="text" placeholder="পূর্ণ নাম" className="w-full px-6 py-4 border border-slate-300 rounded-2xl mb-6 focus:ring-4 focus:ring-indigo-300 outline-none" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
              <input type="text" placeholder="ইউজারনেম" className="w-full px-6 py-4 border border-slate-300 rounded-2xl mb-6 focus:ring-4 focus:ring-indigo-300 outline-none" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <select className="w-full px-6 py-4 border border-slate-300 rounded-2xl mb-8 focus:ring-4 focus:ring-indigo-300 outline-none" value={newUser.packageId} onChange={e => setNewUser({...newUser, packageId: e.target.value})}>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
              </select>
              <div className="flex gap-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-600 font-bold text-lg">
                  বাতিল
                </button>
                <button onClick={handleAddUser} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl">
                  যোগ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {deletingUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-md w-full">
              <p className="text-2xl font-bold text-red-600 mb-6">{deletingUser.fullName} কে ডিলিট করবেন?</p>
              <div className="flex gap-6">
                <button onClick={() => setDeletingUser(null)} className="flex-1 py-4 text-slate-600 font-bold text-lg">
                  বাতিল
                </button>
                <button onClick={handleDeleteUser} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl">
                  ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {extraChargeUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-10 w-full max-w-lg shadow-2xl">
              <h3 className="text-3xl font-black text-amber-600 mb-6">অতিরিক্ত চার্জ — {extraChargeUser.fullName}</h3>
              <input type="number" placeholder="পরিমাণ (টাকা)" className="w-full px-6 py-4 border border-slate-300 rounded-2xl mb-6 focus:ring-4 focus:ring-amber-300 outline-none" value={extraChargeAmount} onChange={e => setExtraChargeAmount(e.target.value)} />
              <input type="text" placeholder="বিবরণ (ঐচ্ছিক)" className="w-full px-6 py-4 border border-slate-300 rounded-2xl mb-8 focus:ring-4 focus:ring-amber-300 outline-none" value={extraChargeDesc} onChange={e => setExtraChargeDesc(e.target.value)} />
              <div className="flex gap-6">
                <button onClick={() => setExtraChargeUser(null)} className="flex-1 py-4 text-slate-600 font-bold text-lg">
                  বাতিল
                </button>
                <button onClick={handleExtraCharge} className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl">
                  যোগ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl">
              <h3 className="text-3xl font-black text-green-600 mb-6">মাসিক বিল জেনারেট</h3>
              <p className="text-lg text-slate-600 mb-8">সকল কাস্টমারের জন্য {currentMonth}-এর বিল তৈরি হবে</p>
              <div className="flex gap-6">
                <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-4 text-slate-600 font-bold text-lg">
                  বাতিল
                </button>
                <button onClick={handleGenerateBills} className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl">
                  জেনারেট করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl">
              <h3 className="text-3xl font-black text-indigo-600 mb-6">CSV থেকে ইমপোর্ট</h3>
              <p className="text-slate-600 mb-8">ফাইলে Name এবং Username কলাম থাকতে হবে</p>
              <div className="border-4 border-dashed border-indigo-300 rounded-3xl p-16 text-center">
                <p className="text-6xl mb-6">📄</p>
                <p className="text-2xl font-bold text-indigo-600">ফাইল আপলোড করুন (.csv)</p>
                <p className="text-sm text-slate-500 mt-4">ডেমো মোড — পরে আসল ইমপোর্ট যোগ করব</p>
              </div>
              <div className="flex gap-6 mt-8">
                <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 text-slate-600 font-bold text-lg">
                  বাতিল
                </button>
                <button onClick={handleCsvImport} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl">
                  ইমপোর্ট করুন
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
