
import React, { useState, useMemo } from 'react';
import { User, Package, BillingRecord, Ticket, ClientStatus } from '../types';
import { ZONES } from '../constants';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  tickets?: Ticket[];
  onUpdateUser: (u: User) => Promise<void>;
  onAddUser: (u: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onAddBill: (b: BillingRecord) => void;
  onDeleteBill: (id: string) => void;
  onGenerateMonthlyBills: (month: string) => Promise<number>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], packages = [], bills = [], tickets = [], onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onGenerateMonthlyBills 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'billing' | 'tickets'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [showDueOnly, setShowDueOnly] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const expired = users.filter(u => u.status === 'expired').length;
    const totalDue = users.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    const monthlyIncome = bills.filter(b => b.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);

    return { total, active, expired, totalDue, monthlyIncome };
  }, [users, bills]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesDue = !showDueOnly || (u.balance && u.balance > 0);
    return matchesSearch && matchesStatus && matchesDue;
  });

  const handleOpenAddModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingUser({
      id: crypto.randomUUID(),
      username: '',
      fullName: '',
      email: '',
      phone: '',
      address: '',
      role: 'customer',
      packageId: packages[0]?.id || '10 Mbps',
      status: 'active',
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      balance: 0,
      dataUsedGb: 0,
      dataLimitGb: 0,
      zone: ZONES[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser({ ...user });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const isExisting = users.some(u => u.id === editingUser.id);
      if (isExisting) {
        await onUpdateUser(editingUser);
      } else {
        await onAddUser(editingUser);
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Save error:", err);
      alert("সেভ করতে ব্যর্থ হয়েছে। নেটওয়ার্ক চেক করুন।");
    } finally {
      setIsSaving(false);
    }
  };

  const viewDueUsers = () => {
    setShowDueOnly(true);
    setStatusFilter('all');
    setSearchTerm('');
    setActiveTab('clients');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {/* Navigation */}
      <div className="flex overflow-x-auto bg-white p-1 rounded-3xl border border-slate-100 shadow-sm w-full md:w-fit no-scrollbar">
        {[
          { id: 'overview', label: 'সারাংশ', icon: '📊' },
          { id: 'clients', label: 'কাস্টমার', icon: '👥' },
          { id: 'billing', label: 'বিলিং', icon: '💰' },
          { id: 'tickets', label: 'সাপোর্ট', icon: '🛠️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">মোট গ্রাহক</p>
              <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{stats.total}</h3>
            </div>
            <p className="text-[10px] font-bold text-emerald-500 mt-2">{stats.active} জন সচল</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">মেয়াদোত্তীর্ণ (EXPIRED)</p>
              <h3 className="text-4xl font-black text-rose-500 tracking-tighter">{stats.expired}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">মোট বকেয়া</p>
              <h3 className="text-4xl font-black text-rose-600 tracking-tighter">৳{stats.totalDue}</h3>
            </div>
            <button 
              onClick={viewDueUsers}
              className="mt-4 text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all w-fit uppercase tracking-wider"
            >
              বকেয়া ইউজার দেখুন →
            </button>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">মাসিক আয়</p>
              <h3 className="text-4xl font-black text-indigo-600 tracking-tighter">৳{stats.monthlyIncome}</h3>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <input 
                  type="text" 
                  placeholder="নাম বা আইডি দিয়ে খুঁজুন..." 
                  className="px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold w-full md:w-64 outline-none focus:ring-4 focus:ring-indigo-500/10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <select 
                  className="px-4 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">সব স্ট্যাটাস</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button 
                onClick={handleOpenAddModal}
                className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.95] transition-all z-10"
              >
                + Add Client
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowDueOnly(!showDueOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${showDueOnly ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {showDueOnly ? '✕ বকেয়া ফিল্টার সরান' : '🛑 শুধুমাত্র বকেয়া দেখান'}
              </button>
              {showDueOnly && <span className="text-[10px] font-bold text-slate-400">ফিল্টার চালু আছে</span>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50/50">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">গ্রাহক</th>
                  <th className="px-8 py-6">জোন ও আইডি</th>
                  <th className="px-8 py-6">স্ট্যাটাস</th>
                  <th className="px-8 py-6">বকেয়া</th>
                  <th className="px-8 py-6 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none mb-1">{user.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400">{user.phone}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase">{user.zone}</span>
                       <p className="text-[10px] font-bold text-slate-400 mt-1">ID: {user.username}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        user.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {user.status === 'active' ? 'সচল' : 'মেয়াদ শেষ'}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-black text-sm">
                      <span className={user.balance > 0 ? 'text-rose-600' : 'text-slate-400'}>৳{user.balance || 0}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                         onClick={() => handleOpenEditModal(user)} 
                         className="p-3 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"
                         title="এডিট করুন"
                       >
                         ✏️
                       </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold">
                      কোনো কাস্টমার পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600 p-8 text-white">
                 <div className="flex justify-between items-start">
                    <div>
                       <h3 className="text-xl font-black">{editingUser.fullName ? 'কাস্টমার আপডেট' : 'নতুন কাস্টমার যোগ'}</h3>
                       <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">প্রোফাইল ইনফরমেশন</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white text-2xl">✕</button>
                 </div>
              </div>
              <form onSubmit={handleSaveUser} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পূর্ণ নাম</label>
                       <input 
                          type="text" required 
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.fullName}
                          onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজার আইডি</label>
                       <input 
                          type="text" required
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.username}
                          onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ফোন নাম্বার</label>
                       <input 
                          type="tel" required
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.phone}
                          onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">জোন</label>
                       <select 
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                          value={editingUser.zone}
                          onChange={e => setEditingUser({...editingUser, zone: e.target.value})}
                       >
                          {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইন্টারনেট প্যাকেজ</label>
                    <select 
                       className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                       value={editingUser.packageId}
                       onChange={e => setEditingUser({...editingUser, packageId: e.target.value})}
                    >
                       {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">স্ট্যাটাস</label>
                       <select 
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                          value={editingUser.status}
                          onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}
                       >
                          <option value="active">Active (সচল)</option>
                          <option value="expired">Expired (মেয়াদ শেষ)</option>
                          <option value="suspended">Suspended (স্থগিত)</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">বকেয়া পরিমাণ (৳)</label>
                       <input 
                          type="number"
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                          value={editingUser.balance}
                          onChange={e => setEditingUser({...editingUser, balance: parseInt(e.target.value) || 0})}
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">মেয়াদ শেষ হবার তারিখ</label>
                    <input 
                       type="date"
                       className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                       value={editingUser.expiryDate}
                       onChange={e => setEditingUser({...editingUser, expiryDate: e.target.value})}
                    />
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-400">বাতিল</button>
                    <button type="submit" disabled={isSaving} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
                       {isSaving ? 'প্রসেসিং...' : 'সংরক্ষণ করুন'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
