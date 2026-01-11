
import React, { useState, useMemo } from 'react';
import { User, Package, BillingRecord, Ticket, ClientStatus } from '../types';
import { ZONES } from '../constants';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  tickets?: Ticket[];
  onUpdateUser: (u: User) => void;
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
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

  // Stats for Dashboard
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const expired = users.filter(u => u.status === 'expired').length;
    const unpaid = users.filter(u => u.balance > 0).length;
    const totalDue = users.reduce((acc, curr) => acc + curr.balance, 0);
    const monthlyIncome = bills.filter(b => b.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const openTickets = tickets.filter(t => t.status === 'open').length;

    return { total, active, expired, unpaid, totalDue, monthlyIncome, openTickets };
  }, [users, bills, tickets]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToExcel = () => {
    const csvRows = [
      ['ID', 'Name', 'Phone', 'Package', 'Status', 'Due'],
      ...users.map(u => [u.username, u.fullName, u.phone, u.packageId, u.status, u.balance])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `client_list_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Navigation Tabs */}
      <div className="flex bg-white p-1 rounded-3xl border border-slate-100 shadow-sm w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'clients', label: 'Clients', icon: '👥' },
          { id: 'billing', label: 'Billing', icon: '💰' },
          { id: 'tickets', label: 'Support', icon: '🛠️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Clients</p>
              <h3 className="text-4xl font-black text-slate-800">{stats.active} <span className="text-sm opacity-50">/ {stats.total}</span></h3>
              <div className="w-full bg-slate-50 h-1.5 mt-4 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${(stats.active / stats.total) * 100}%` }}></div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monthly Collection</p>
              <h3 className="text-4xl font-black text-indigo-600">৳{stats.monthlyIncome}</h3>
              <p className="text-[10px] font-bold text-emerald-600 mt-2">↑ 12% from last month</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Due</p>
              <h3 className="text-4xl font-black text-rose-500">৳{stats.totalDue}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2">{stats.unpaid} unpaid clients</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Open Tickets</p>
              <h3 className="text-4xl font-black text-amber-500">{stats.openTickets}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2">Avg. solve time: 2.4h</p>
            </div>
          </div>

          {/* Charts Simulation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <h4 className="font-black text-slate-800 mb-8 tracking-tight">Income vs Expense</h4>
                <div className="flex items-end justify-between h-48 gap-4 px-4">
                  {[45, 80, 55, 95, 70, 90].map((v, i) => (
                    <div key={i} className="flex-1 space-y-2">
                       <div className="w-full bg-indigo-500 rounded-t-xl" style={{ height: `${v}%` }}></div>
                       <div className="w-full bg-slate-100 rounded-b-xl" style={{ height: `${20}%` }}></div>
                       <p className="text-[9px] font-black text-slate-400 text-center uppercase">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}</p>
                    </div>
                  ))}
                </div>
             </div>
             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <h4 className="font-black text-slate-800 mb-8 tracking-tight">Zone Wise Performance</h4>
                <div className="space-y-6">
                  {ZONES.map(z => (
                    <div key={z} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span>{z}</span>
                        <span>{Math.floor(Math.random() * 50) + 10} Clients</span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: `${Math.random() * 80 + 20}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search name, ID or phone..." 
                className="px-6 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold w-full md:w-64 outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select 
                className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={exportToExcel} className="px-6 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">Export CSV</button>
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">+ Add Client</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Client Info</th>
                  <th className="px-8 py-6">Package</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Expiry</th>
                  <th className="px-8 py-6">Balance</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black">{user.fullName[0]}</div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{user.fullName}</p>
                          <p className="text-[10px] font-bold text-slate-400">ID: {user.username} | {user.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-600">{user.packageId}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        user.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        user.status === 'expired' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-500">{user.expiryDate}</td>
                    <td className="px-8 py-6">
                      <p className={`text-sm font-black ${user.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>৳{user.balance}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button className="p-2 hover:bg-white rounded-xl transition-all">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-8">
           <h3 className="text-xl font-black text-slate-800 mb-8 tracking-tight">Support & Ticketing</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Tickets</p>
                 <p className="text-2xl font-black text-slate-800">{stats.openTickets}</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Solved Today</p>
                 <p className="text-2xl font-black text-emerald-800">14</p>
              </div>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Avg. Resolution</p>
                 <p className="text-2xl font-black text-indigo-800">2.4 Hours</p>
              </div>
           </div>
           
           <div className="space-y-4">
              {tickets.map(t => (
                <div key={t.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-md transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${t.priority === 'high' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                       {t.category.includes('Internet') ? '📡' : '⚡'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-black text-slate-800">{t.userName}</p>
                        <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">{t.zone}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{t.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${t.status === 'open' ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                        {t.status}
                     </span>
                     <p className="text-[9px] font-bold text-slate-400 mt-2">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">No active support tickets.</p>}
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
