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

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.username) {
      setNotification({ message: 'নাম ও ইউজারনেম দিন', type: 'error' });
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
    setNotification({ message: 'নতুন কাস্টমার যোগ হয়েছে!', type: 'success' });
  };

  const handleDeleteUser = () => {
    if (deletingUser) {
      onDeleteUser(deletingUser.id);
      setDeletingUser(null);
      setNotification({ message: 'কাস্টমার ডিলিট হয়েছে', type: 'success' });
    }
  };

  const handleExtraCharge = () => {
    if (!extraChargeUser || !extraChargeAmount) {
      setNotification({ message: 'পরিমাণ দিন', type: 'error' });
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
    setNotification({ message: 'এক্সট্রা চার্জ যোগ হয়েছে', type: 'success' });
  };

  const handleGenerateBills = () => {
    const count = onGenerateMonthlyBills(currentMonth);
    setShowGenerateModal(false);
    setNotification({ message: `${count}টি বিল জেনারেট হয়েছে`, type: 'success' });
  };

  const handleCsvImport = () => {
    setNotification({ message: 'CSV থেকে ইমপোর্ট সফল (ডেমো)', type: 'success' });
    setShowImportModal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-bold">{notification.message}</p>
        </div>
      )}

      <h1 className="text-4xl font-bold text-indigo-600">এডমিন ড্যাশবোর্ড</h1>
      <p className="text-xl text-slate-600">স্বাগতম, {currentUser?.fullName || 'Admin'}!</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-sm text-slate-500">মোট কাস্টমার</p>
          <p className="text-4xl font-bold text-slate-800">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-sm text-indigo-600">এ মাসের কালেকশন</p>
          <p className="text-4xl font-bold text-indigo-700">৳{stats.totalRevenue}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-sm text-red-600">বাকি বিল</p>
          <p className="text-4xl font-bold text-red-700">{stats.pendingBills}টি</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row justify-between gap-4">
          <input 
            type="text" 
            placeholder="খুঁজুন..." 
            className="px-4 py-3 bg-slate-50 rounded-xl w-full md:w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(true)} className="bg-slate-100 px-6 py-3 rounded-xl font-bold hover:bg-slate-200">
              ইমপোর্ট
            </button>
            <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700">
              নতুন +
            </button>
            <button onClick={() => setShowGenerateModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700">
              বিল জেনারেট
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">নাম ও আইডি</th>
                <th className="px-6 py-4 text-left">প্যাকেজ</th>
                <th className="px-6 py-4 text-left">মেয়াদ</th>
                <th className="px-6 py-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.username}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {packages.find(p => p.id === user.packageId)?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{user.expiryDate}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setExtraChargeUser(user)} className="text-amber-600 font-bold mr-4 hover:underline">
                      + চার্জ
                    </button>
                    <button onClick={() => setDeletingUser(user)} className="text-red-600 font-bold hover:underline">
                      ডিলিট
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <p className="text-center py-10 text-slate-500">কোনো কাস্টমার পাওয়া যায়নি</p>
          )}
        </div>
      </div>

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-6">নতুন কাস্টমার যোগ করুন</h3>
            <input 
              type="text" 
              placeholder="পূর্ণ নাম" 
              className="w-full px-4 py-3 border rounded-xl mb-4"
              value={newUser.fullName}
              onChange={e => setNewUser({...newUser, fullName: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="ইউজারনেম" 
              className="w-full px-4 py-3 border rounded-xl mb-4"
              value={newUser.username}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
            />
            <select 
              className="w-full px-4 py-3 border rounded-xl mb-6"
              value={newUser.packageId}
              onChange={e => setNewUser({...newUser, packageId: e.target.value})}
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>
              ))}
            </select>
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-600 font-bold">
                বাতিল
              </button>
              <button onClick={handleAddUser} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
            <p className="text-xl font-bold mb-4">{deletingUser.fullName} কে ডিলিট করবেন?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 text-slate-600 font-bold">
                বাতিল
              </button>
              <button onClick={handleDeleteUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">
                ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Charge Modal */}
      {extraChargeUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">অতিরিক্ত চার্জ — {extraChargeUser.fullName}</h3>
            <input 
              type="number" 
              placeholder="পরিমাণ (টাকা)" 
              className="w-full px-4 py-3 border rounded-xl mb-4"
              value={extraChargeAmount}
              onChange={e => setExtraChargeAmount(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="বিবরণ (ঐচ্ছিক)" 
              className="w-full px-4 py-3 border rounded-xl mb-6"
              value={extraChargeDesc}
              onChange={e => setExtraChargeDesc(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setExtraChargeUser(null)} className="flex-1 py-3 text-slate-600 font-bold">
                বাতিল
              </button>
              <button onClick={handleExtraCharge} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold">
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">মাসিক বিল জেনারেট</h3>
            <p className="mb-6 text-slate-600">সকল কাস্টমারের জন্য {currentMonth}-এর বিল তৈরি হবে</p>
            <div className="flex gap-4">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-3 text-slate-600 font-bold">
                বাতিল
              </button>
              <button onClick={handleGenerateBills} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">
                জেনারেট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">CSV থেকে ইমপোর্ট</h3>
            <p className="text-sm text-slate-500 mb-6">ফাইলে Name এবং Username কলাম থাকতে হবে</p>
            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center">
              <p className="text-4xl mb-4">📄</p>
              <p className="font-bold text-slate-600">ফাইল আপলোড করুন (.csv)</p>
              <p className="text-xs text-slate-400 mt-2">এখনও ডেমো মোড — পরে আসল ইমপোর্ট যোগ করব</p>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-3 text-slate-600 font-bold">
                বাতিল
              </button>
              <button onClick={handleCsvImport} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">
                ইমপোর্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
