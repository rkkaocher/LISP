
import React, { useState, useRef } from 'react';
import { User, Package, BillingRecord } from '../types';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  onUpdateUser: (u: User) => void;
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onAddBill: (b: BillingRecord) => void;
  onGenerateMonthlyBills: (month: string) => void;
}

const UPSTREAM_PROVIDERS = [
  'Amber IT', 'Link3', 'Carnival', 'Circle Network', 'Dot Internet', 'Maya Cyber World', 'Cyclone', 'Other'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, packages, bills, onUpdateUser, onAddUser, onDeleteUser, onAddBill, onGenerateMonthlyBills 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing'>('users');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [payingUser, setPayingUser] = useState<{user: User, bill: BillingRecord} | null>(null);
  
  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: '', role: 'customer', packageId: packages[0].id, 
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataLimitGb: packages[0].dataLimitGb, upstreamProvider: UPSTREAM_PROVIDERS[0]
  });

  const [paymentDetails, setPaymentDetails] = useState({ 
    amount: 0, 
    method: 'Cash' as BillingRecord['method']
  });

  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0),
    monthlyDues: bills.filter(b => b.billingMonth === currentMonth && b.status === 'pending').length,
    monthlyRevenue: bills.filter(b => b.billingMonth === currentMonth && b.status === 'paid').reduce((acc, b) => acc + b.amount, 0)
  };

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCreateUser = () => {
    if (!newUser.fullName || !newUser.username || !newUser.password) {
      alert("সব তথ্য পূরণ করুন!"); return;
    }
    const userToCreate: User = {
      ...newUser as User, id: 'u' + Date.now(), email: '', phone: '', address: '',
      role: 'customer', status: 'active', balance: 0, dataUsedGb: 0, dataLimitGb: newUser.dataLimitGb || 0
    };
    onAddUser(userToCreate);
    setShowAddModal(false);
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
  };

  const openPaymentModal = (user: User, bill?: BillingRecord) => {
    const pkg = packages.find(p => p.id === user.packageId);
    const targetBill = bill || {
      id: 'b' + Date.now(), userId: user.id, amount: pkg?.price || 0,
      billingMonth: currentMonth, date: '', status: 'pending', method: 'None'
    } as BillingRecord;

    setPaymentDetails({ amount: targetBill.amount, method: 'Cash' });
    setPayingUser({ user, bill: targetBill });
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">মোট কাস্টমার</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.totalUsers}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">এই মাসের আদায়</p>
          <h3 className="text-2xl font-bold text-indigo-600">৳{stats.monthlyRevenue}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">এই মাসের বাকি</p>
          <h3 className="text-2xl font-bold text-red-600">{stats.monthlyDues} জন</h3>
        </div>
        <button 
          onClick={() => onGenerateMonthlyBills(currentMonth)}
          className="bg-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-100 flex flex-col justify-center items-center group active:scale-95 transition-all"
        >
          <span className="font-bold text-sm">➕ ডিউ বিল জেনারেট</span>
          <span className="text-[9px] opacity-70 mt-1">({currentMonth})</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          কাস্টমার তালিকা
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          বকেয়া ও পেমেন্ট
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800">
            {activeTab === 'users' ? 'সকল কাস্টমার' : `${currentMonth}-এর রিপোর্ট`}
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" placeholder="নাম বা আইডি..." 
              className="px-4 py-2 bg-slate-50 border rounded-xl text-xs w-48 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
            {activeTab === 'users' && (
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100">নতুন কাস্টমার+</button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'users' ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">কাস্টমার ও সরবরাহকারী</th>
                  <th className="px-6 py-4">প্যাকেজ</th>
                  <th className="px-6 py-4">মেয়াদ</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{user.fullName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400">ID: {user.username}</span>
                        <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">🌐 {user.upstreamProvider || 'Not Set'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-indigo-600">
                      {packages.find(p => p.id === user.packageId)?.name}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{user.expiryDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditingUser(user)} className="text-indigo-600 font-bold text-xs hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">এডিট</button>
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
                  <th className="px-6 py-4">মাস</th>
                  <th className="px-6 py-4">অবস্থা</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => {
                  const monthBill = bills.find(b => b.userId === user.id && b.billingMonth === currentMonth);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{user.fullName}</p>
                        <p className="text-[9px] text-slate-400">{user.upstreamProvider}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{currentMonth}</td>
                      <td className="px-6 py-4">
                        {monthBill?.status === 'paid' ? (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase">পরিশোধিত ({monthBill.method})</span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100 uppercase">বাকি</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {monthBill?.status !== 'paid' && (
                          <button 
                            onClick={() => openPaymentModal(user, monthBill)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-green-700 shadow-sm transition-all"
                          >
                            বিল সংগ্রহ
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">কাস্টমার প্রোফাইল এডিট</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">নাম</label>
                <input className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.fullName} onChange={(e)=>setEditingUser({...editingUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ইউজার আইডি</label>
                <input className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.username} onChange={(e)=>setEditingUser({...editingUser, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">পাসওয়ার্ড</label>
                <input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.password || ''} onChange={(e)=>setEditingUser({...editingUser, password: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">সরবরাহকারী (Provider)</label>
                <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.upstreamProvider || ''} onChange={(e)=>setEditingUser({...editingUser, upstreamProvider: e.target.value})}>
                  {UPSTREAM_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">প্যাকেজ</label>
                <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.packageId} onChange={(e)=>setEditingUser({...editingUser, packageId: e.target.value})}>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">মেয়াদ শেষ</label>
                <input type="date" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.expiryDate} onChange={(e)=>setEditingUser({...editingUser, expiryDate: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={()=>setEditingUser(null)} className="flex-1 py-3 text-sm font-bold text-slate-400">বাতিল</button>
              <button onClick={()=>{onUpdateUser(editingUser); setEditingUser(null);}} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl text-sm font-bold">সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">নতুন কাস্টমার যুক্ত করুন</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="px-4 py-3 bg-slate-50 border rounded-xl text-sm" placeholder="নাম" onChange={(e)=>setNewUser({...newUser, fullName: e.target.value})} />
              <input className="px-4 py-3 bg-slate-50 border rounded-xl text-sm" placeholder="ইউজার আইডি (Login ID)" onChange={(e)=>setNewUser({...newUser, username: e.target.value})} />
              <input className="px-4 py-3 bg-slate-50 border rounded-xl text-sm" type="password" placeholder="পাসওয়ার্ড" onChange={(e)=>setNewUser({...newUser, password: e.target.value})} />
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">লাইন সরবরাহকারী</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm" onChange={(e)=>setNewUser({...newUser, upstreamProvider: e.target.value})}>
                  {UPSTREAM_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">প্যাকেজ</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm" onChange={(e)=>setNewUser({...newUser, packageId: e.target.value})}>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} (৳{p.price})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={()=>setShowAddModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-400">বাতিল</button>
              <button onClick={handleCreateUser} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl text-sm font-bold">কাস্টমার অ্যাড করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {payingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-1">বিল সংগ্রহ করুন</h3>
            <p className="text-sm text-slate-500 mb-6">{payingUser.user.fullName} - {payingUser.bill.billingMonth}</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">টাকার পরিমাণ</label>
                <input 
                  type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg"
                  value={paymentDetails.amount} onChange={(e) => setPaymentDetails({...paymentDetails, amount: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">পেমেন্ট মেথড</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'bKash', 'Nagad', 'Rocket'].map(m => (
                    <button 
                      key={m} onClick={() => setPaymentDetails({...paymentDetails, method: m as any})}
                      className={`py-3 rounded-2xl text-xs font-bold border-2 transition-all ${paymentDetails.method === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}
                    >
                      {m}
                    </button>
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
    </div>
  );
};

export default AdminDashboard;
