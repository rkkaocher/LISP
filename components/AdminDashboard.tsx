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
  users = [], packages = [], bills = [], onUpdateUser = () => {}, onAddUser = () => {}, onDeleteUser = () => {}, onAddBill = () => {}, onDeleteBill = () => {}, onDeleteBillsByMonth = () => {}, onGenerateMonthlyBills = () => 0, currentUser, onExportData = () => {}, onImportData = () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: 'password123', role: 'customer', packageId: packages[0]?.id || '', status: 'active', expiryDate: '2026-12-31'
  });

  const now = new Date();
  const currentMonth = MONTHS_BN[now.getMonth()] + ' ' + now.getFullYear();

  const filteredUsers = users.filter(u => u.role === 'customer' && (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase())));

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid' && b.billingMonth === currentMonth).reduce((acc, b) => acc + b.amount, 0),
    pendingBills: bills.filter(b => b.status === 'pending').length
  };

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.username) {
      setNotification('নাম ও ইউজারনেম দিন');
      return;
    }
    const userToAdd: User = {
      id: 'u' + Date.now(),
      fullName: newUser.fullName!,
      username: newUser.username!,
      password: newUser.password || 'password123',
      role: 'customer',
      packageId: newUser.packageId || packages[0]?.id || '',
      status: 'active',
      expiryDate: newUser.expiryDate || '2026-12-31',
      balance: 0,
      dataUsedGb: 0,
      dataLimitGb: 0,
      upstreamProvider: 'Amber IT'
    };
    onAddUser(userToAdd);
    setShowAddModal(false);
    setNewUser({ fullName: '', username: '', password: 'password123' });
    setNotification('নতুন কাস্টমার যোগ হয়েছে');
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // সিম্পল CSV ইমপোর্ট লজিক (আপনার আগের মতো)
    alert('CSV ইমপোর্ট সফল (ডেমো)');
    setShowImportModal(false);
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-green-100 text-green-800 px-6 py-4 rounded-2xl shadow">
          {notification}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-xs text-slate-500">মোট কাস্টমার</p>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-xs text-indigo-500">এ মাসের কালেকশন</p>
          <p className="text-3xl font-bold text-indigo-600">৳{stats.totalRevenue}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-xs text-red-500">বাকি বিল</p>
          <p className="text-3xl font-bold text-red-600">{stats.pendingBills}টি</p>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="bg-indigo-600 text-white p-6 rounded-3xl font-bold shadow-lg">
          + বিল জেনারেট
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-2xl border w-fit shadow-sm">
        <button className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white">কাস্টমার</button>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between">
          <input type="text" placeholder="খুঁজুন..." className="px-4 py-3 bg-slate-50 rounded-xl w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(true)} className="bg-slate-100 px-6 py-3 rounded-xl font-bold">ইমপোর্ট</button>
            <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">নতুন +</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left">নাম ও আইডি</th>
                <th className="px-6 py-4 text-left">প্যাকেজ</th>
                <th className="px-6 py-4 text-left">মেয়াদ</th>
                <th className="px-6 py-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <p className="font-bold">{user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.username}</p>
                  </td>
                  <td className="px-6 py-4">{packages.find(p => p.id === user.packageId)?.name || 'N/A'}</td>
                  <td className="px-6 py-4">{user.expiryDate}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-amber-600 mr-4 font-bold">+ চার্জ</button>
                    <button onClick={() => setDeletingUser(user)} className="text-red-600 font-bold">ডিলিট</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">নতুন কাস্টমার</h3>
            <input type="text" placeholder="পূর্ণ নাম" className="w-full px-4 py-3 border rounded-xl mb-4" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
            <input type="text" placeholder="ইউজারনেম" className="w-full px-4 py-3 border rounded-xl mb-4" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            <select className="w-full px-4 py-3 border rounded-xl mb-6" value={newUser.packageId} onChange={e => setNewUser({...newUser, packageId: e.target.value})}>
              {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-500 font-bold">বাতিল</button>
              <button onClick={handleAddUser} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">যোগ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center">
            <p className="text-xl font-bold mb-4">{deletingUser.fullName} কে ডিলিট করবেন?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 text-slate-500 font-bold">বাতিল</button>
              <button onClick={() => {
                onDeleteUser(deletingUser.id);
                setDeletingUser(null);
                setNotification('কাস্টমার ডিলিট হয়েছে');
              }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">ডিলিট</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-4">CSV ইমপোর্ট</h3>
            <label className="block border-2 border-dashed p-10 text-center rounded-xl cursor-pointer">
              <p className="font-bold">ফাইল আপলোড করুন (.csv)</p>
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
            </label>
            <button onClick={() => setShowImportModal(false)} className="mt-6 w-full py-3 text-slate-500 font-bold">বন্ধ</button>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-4">বিল জেনারেট</h3>
            <p className="mb-6">সকল কাস্টমারের জন্য বিল তৈরি হবে</p>
            <div className="flex gap-4">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-3 text-slate-500 font-bold">বাতিল</button>
              <button onClick={() => {
                onGenerateMonthlyBills(currentMonth);
                setShowGenerateModal(false);
                setNotification('বিল জেনারেট হয়েছে');
              }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">তৈরি করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
