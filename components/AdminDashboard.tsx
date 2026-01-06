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
    setTimeout(() => setNotification(null), 5000);
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
      date: new Date().toISOString().split('T')[0],
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

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== 'string') {
        showNotification('ফাইল রিড করতে সমস্যা', 'error');
        return;
      }

      try {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) {
          showNotification('ফাইলে ডাটা নেই', 'error');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let addedCount = 0;
        let skippedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          const fullName = row['name'] || row['full name'] || row['fullname'] || row['customer name'] || '';
          const username = row['username'] || row['user id'] || row['userid'] || row['user'] || '';
          
          if (!fullName || !username) {
            skippedCount++;
            continue;
          }
          
          if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            skippedCount++;
            continue;
          }

          const packageName = row['package'] || row['package name'] || '';
          const foundPackage = packages.find(p => p.name.toLowerCase() === packageName.toLowerCase());
          const packageId = foundPackage?.id || packages[0]?.id || '';

          const userToAdd: User = {
            id: `u${Date.now()}${i}`,
            fullName,
            username,
            password: row['password'] || 'password123',
            role: 'customer',
            packageId,
            status: 'active',
            expiryDate: row['expiry'] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            balance: 0,
            dataUsedGb: 0,
            dataLimitGb: 0,
            upstreamProvider: row['provider'] || 'Amber IT'
          };

          onAddUser(userToAdd);
          addedCount++;
        }

        const skipMsg = skippedCount > 0 ? `, ${skippedCount} জন স্কিপ` : '';
        showNotification(`${addedCount} জন কাস্টমার যোগ হয়েছে${skipMsg}`, 'success');
        setShowImportModal(false);
      } catch (err) {
        showNotification('CSV পার্স করতে সমস্যা হয়েছে', 'error');
      }
    };

    reader.onerror = () => showNotification('ফাইল রিড করতে ব্যর্থ', 'error');
    reader.readAsText(file);
    e.target.value = ''; // Reset for next upload
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {notification && (
        <div className={`fixed top-10 right-4 z-50 px-6 py-3 rounded-xl shadow-lg border transition-all ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-semibold">{notification.message}</p>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">অ্যাডমিন ড্যাশবোর্ড</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              ইমপোর্ট CSV
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              নতুন কাস্টমার
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">মোট কাস্টমার</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalUsers} জন</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">চলতি মাসের আয় ({currentMonth})</p>
            <h3 className="text-2xl font-bold text-emerald-600">৳{stats.totalRevenue}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">বাকি বিল</p>
            <h3 className="text-2xl font-bold text-orange-500">{stats.pendingBills}টি</h3>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="নাম বা ইউজারনেম দিয়ে সার্চ করুন..."
            className="w-full max-w-md px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* User Table Placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">নাম</th>
                <th className="px-6 py-4 font-semibold text-slate-700">ইউজারনেম</th>
                <th className="px-6 py-4 font-semibold text-slate-700">প্যাকেজ</th>
                <th className="px-6 py-4 font-semibold text-slate-700">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">{user.fullName}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{user.username}</td>
                  <td className="px-6 py-4">
                    {packages.find(p => p.id === user.packageId)?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setDeletingUser(user)}
                      className="text-red-500 hover:underline font-medium"
                    >
                      ডিলিট
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">CSV থেকে ইমপোর্ট</h3>
            <p className="text-slate-500 mb-6 text-sm">প্রয়োজনীয় কলাম: Name, Username, Package</p>
            
            <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
              <p className="font-semibold text-slate-700">ফাইল সিলেক্ট করুন</p>
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
            </label>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowImportModal(false)} 
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">আপনি কি নিশ্চিত?</h3>
            <p className="text-slate-600 mb-6">কাস্টমার "{deletingUser.fullName}" কে চিরতরে ডিলিট করা হবে।</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingUser(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg">বাতিল</button>
              <button onClick={handleDeleteUser} className="flex-1 py-2 bg-red-600 text-white rounded-lg">ডিলিট করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">নতুন কাস্টমার যোগ করুন</h3>
            <div className="space-y-4">
              <input 
                className="w-full p-3 border rounded-xl" 
                placeholder="পুরো নাম" 
                value={newUser.fullName}
                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
              />
              <input 
                className="w-full p-3 border rounded-xl" 
                placeholder="ইউজারনেম" 
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
              <select 
                className="w-full p-3 border rounded-xl"
                value={newUser.packageId}
                onChange={e => setNewUser({...newUser, packageId: e.target.value})}
              >
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
              </select>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 font-bold text-slate-600">বাতিল</button>
              <button onClick={handleAddUser} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">সেভ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
