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
  users = [], packages = [], bills = [], onUpdateUser = () => {}, onAddUser = () => {}, onDeleteUser = () => {}, onAddBill = () => {}, onDeleteBill = () => {}, onDeleteBillsByMonth = () => {}, onGenerateMonthlyBills = () => 0, currentUser, onExportData = () => {}, onImportData = () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'settings'>('users');
  const [billingSubTab, setBillingSubTab] = useState<'pending' | 'history'>('pending');
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [extraChargeUser, setExtraChargeUser] = useState<User | null>(null);
  const [extraChargeAmount, setExtraChargeAmount] = useState('');
  const [extraChargeDesc, setExtraChargeDesc] = useState('');

  const now = new Date();
  const currentMonthNameBn = MONTHS_BN[now.getMonth()];
  const currentYear = now.getFullYear().toString();
  const currentBillingMonthStr = `${currentMonthNameBn} ${currentYear}`;

  const [billingMonth, setBillingMonth] = useState(currentMonthNameBn);
  const [billingYear, setBillingYear] = useState(currentYear);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: '', role: 'customer', packageId: packages[0]?.id || '', 
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataLimitGb: 0, upstreamProvider: UPSTREAM_PROVIDERS[0]
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
    .filter(i => i.user);

  const paidHistory = bills.filter(b => b.status === 'paid')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(i => i.user);

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
            packageId: packages.find(p => p.id === data.packageid || p.name.toLowerCase().includes((data.package || '').toLowerCase()))?.id || packages[0]?.id || '',
            status: 'active',
            expiryDate: data.expiry || data.expirydate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            balance: 0, dataUsedGb: 0, dataLimitGb: 0, upstreamProvider: data.provider || UPSTREAM_PROVIDERS[0]
          };
          onAddUser(userToAdd);
          importCount++;
        }
        setNotification({ message: `${importCount} জন গ্রাহক যুক্ত হয়েছে।`, type: 'success' });
        setShowImportModal(false);
      } catch (err) {
        setNotification({ message: "ফাইল রিড করতে সমস্যা হয়েছে।", type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmGenerateBills = () => {
    const targetMonthStr = `${billingMonth} ${billingYear}`;
    const count = onGenerateMonthlyBills(targetMonthStr);
    setShowGenerateModal(false);
    setNotification({ message: `${count}টি নতুন বিল জেনারেট করা হয়েছে`, type: 'success' });
  };

  const handleAddExtraCharge = () => {
    if (!extraChargeUser || !extraChargeAmount || !extraChargeDesc) return;
    onAddBill({
      id: 'b' + Date.now(), userId: extraChargeUser.id, amount: Number(extraChargeAmount),
      date: '', billingMonth: currentBillingMonthStr, status: 'pending', method: 'None', type: 'miscellaneous', description: extraChargeDesc
    });
    setExtraChargeUser(null); setExtraChargeAmount(''); setExtraChargeDesc('');
    setNotification({ message: "এক্সট্রা চার্জ যোগ করা হয়েছে", type: 'success' });
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border">
          <p className="text-xs text-slate-500">মোট কাস্টমার</p>
          <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border">
          <p className="text-xs text-slate-500">{currentMonthNameBn}-এর কালেকশন</p>
          <h3 className="text-2xl font-bold text-indigo-600">৳{stats.totalRevenue}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border">
          <p className="text-xs text-red-500">বাকি বিল</p>
          <h3 className="text-2xl font-bold text-red-600">{stats.monthlyDues}টি</h3>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="bg-indigo-600 text-white p-5 rounded-3xl font-bold">
          ➕ বিল জেনারেট
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border w-fit">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>কাস্টমার</button>
        <button onClick={() => setActiveTab('billing')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>বিলিং</button>
        <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>সেটিংস</button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border overflow-hidden">
          <div className="p-6 border-b flex justify-between">
            <input type="text" placeholder="খুঁজুন..." className="px-4 py-3 bg-slate-50 rounded-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setShowImportModal(true)} className="bg-slate-100 px-6 py-3 rounded-xl font-bold">ইমপোর্ট</button>
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">নতুন +</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">নাম ও আইডি</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">প্যাকেজ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">মেয়াদ</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-t">
                    <td className="px-6 py-4">
                      <p className="font-bold">{user.fullName}</p>
                      <p className="text-xs text-slate-500">{user.username}</p>
                    </td>
                    <td className="px-6 py-4">{packages.find(p => p.id === user.packageId)?.name}</td>
                    <td className="px-6 py-4">{user.expiryDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setExtraChargeUser(user)} className="text-amber-600 mr-3">+ চার্জ</button>
                      <button className="text-red-500">ডিলিট</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">শীট থেকে ইমপোর্ট</h3>
            <p className="text-sm text-slate-500 mb-6">CSV ফাইলে Name ও Username কলাম থাকতে হবে</p>
            <label className="block border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center cursor-pointer">
              <span className="text-4xl">📄</span>
              <p className="mt-4 font-bold">ফাইল আপলোড করুন (.csv)</p>
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
            </label>
            <button onClick={() => setShowImportModal(false)} className="mt-6 w-full py-3 text-slate-500 font-bold">বন্ধ করুন</button>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">বিল জেনারেট</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <select value={billingMonth} onChange={e => setBillingMonth(e.target.value)} className="px-4 py-3 border rounded-xl">
                {MONTHS_BN.map(m => <option key={m}>{m}</option>)}
              </select>
              <select value={billingYear} onChange={e => setBillingYear(e.target.value)} className="px-4 py-3 border rounded-xl">
                <option>2024</option>
                <option>2025</option>
                <option>2026</option>
              </select>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-3 text-slate-500 font-bold">বাতিল</button>
              <button onClick={handleConfirmGenerateBills} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">জেনারেট করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Charge Modal */}
      {extraChargeUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">অতিরিক্ত চার্জ - {extraChargeUser.fullName}</h3>
            <input type="number" placeholder="পরিমাণ" value={extraChargeAmount} onChange={e => setExtraChargeAmount(e.target.value)} className="w-full px-4 py-3 border rounded-xl mb-4" />
            <input type="text" placeholder="বিবরণ" value={extraChargeDesc} onChange={e => setExtraChargeDesc(e.target.value)} className="w-full px-4 py-3 border rounded-xl mb-6" />
            <div className="flex gap-4">
              <button onClick={() => setExtraChargeUser(null)} className="flex-1 py-3 text-slate-500 font-bold">বাতিল</button>
              <button onClick={handleAddExtraCharge} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold">যোগ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
