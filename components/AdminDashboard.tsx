
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stats for Dashboard
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const expired = users.filter(u => u.status === 'expired').length;
    const unpaid = users.filter(u => u.balance > 0).length;
    const totalDue = users.reduce((acc, curr) => acc + curr.balance, 0);
    const monthlyIncome = bills.filter(b => b.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const openTickets = tickets?.filter(t => t.status === 'open').length || 0;

    return { total, active, expired, unpaid, totalDue, monthlyIncome, openTickets };
  }, [users, bills, tickets]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
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
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="flex overflow-x-auto bg-white p-1 rounded-3xl border border-slate-100 shadow-sm w-full md:w-fit no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'clients', label: 'Clients', icon: '👥' },
          { id: 'billing', label: 'Billing', icon: '💰' },
          { id: 'tickets', label: 'Support', icon: '🛠️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] md:text-xs font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Clients</p>
              <h3 className="text-3xl md:text-4xl font-black text-slate-800">{stats.active} <span className="text-sm opacity-50">/ {stats.total}</span></h3>
              <div className="w-full bg-slate-50 h-1.5 mt-4 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(stats.active / stats.total) * 100}%` }}></div>
              </div>
            </div>
            {/* ... other stats cards ... */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monthly Income</p>
              <h3 className="text-3xl md:text-4xl font-black text-indigo-600">৳{stats.monthlyIncome}</h3>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Outstanding Due</p>
              <h3 className="text-3xl md:text-4xl font-black text-rose-500">৳{stats.totalDue}</h3>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Open Issues</p>
              <h3 className="text-3xl md:text-4xl font-black text-amber-500">{stats.openTickets}</h3>
            </div>
          </div>
          
          {/* Chart placeholder logic... */}
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100">
             <h4 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">Zone Distribution</h4>
             <div className="space-y-4">
                {ZONES.map(z => {
                  const zoneClients = users.filter(u => u.zone === z).length;
                  const pct = stats.total > 0 ? (zoneClients / stats.total) * 100 : 0;
                  return (
                    <div key={z} className="group">
                      <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase">
                         <span className="text-slate-500 group-hover:text-indigo-600 transition-colors">{z}</span>
                         <span className="text-slate-800">{zoneClients} Users</span>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                         <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search..." 
                className="px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold w-full md:w-64 outline-none focus:ring-4 focus:ring-indigo-500/10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select 
                className="px-4 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleOpenAddModal} className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all">
                + Add Client
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Client</th>
                  <th className="px-8 py-6">Zone & ID</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Due</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none mb-1">{user.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400">{user.phone}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase">{user.zone || 'N/A'}</span>
                       <p className="text-[10px] font-bold text-slate-400 mt-1">ID: {user.username}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className={`text-sm font-black ${user.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>৳{user.balance}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button onClick={() => handleOpenEditModal(user)} className="p-3 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl transition-all">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-50">
             {filteredUsers.map(user => (
               <div key={user.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="text-sm font-black text-slate-800">{user.fullName}</h4>
                        <p className="text-[10px] font-bold text-slate-400">{user.phone} • {user.zone}</p>
                     </div>
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {user.status}
                     </span>
                  </div>
                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-[9px] font-black text-slate-300 uppercase">Balance</p>
                        <p className={`text-sm font-black ${user.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>৳{user.balance}</p>
                     </div>
                     <button onClick={() => handleOpenEditModal(user)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black">Edit User</button>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600 p-8 text-white">
                 <h3 className="text-xl font-black">{editingUser.fullName ? 'Edit Client' : 'Add New Client'}</h3>
                 <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">Configure client profile and plan</p>
              </div>
              <form onSubmit={handleSaveUser} className="p-8 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                          type="text" required 
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.fullName}
                          onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username / ID</label>
                       <input 
                          type="text" required
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.username}
                          onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                       <input 
                          type="tel" required
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.phone}
                          onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone</label>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internet Package</label>
                    <select 
                       className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                       value={editingUser.packageId}
                       onChange={e => setEditingUser({...editingUser, packageId: e.target.value})}
                    >
                       {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                       <select 
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                          value={editingUser.status}
                          onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}
                       >
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                          <option value="suspended">Suspended</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Amount</label>
                       <input 
                          type="number"
                          className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                          value={editingUser.balance}
                          onChange={e => setEditingUser({...editingUser, balance: parseInt(e.target.value) || 0})}
                       />
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                       {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       {isSaving ? 'Saving...' : 'Save Changes'}
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
