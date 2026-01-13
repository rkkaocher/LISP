
import React, { useState, useMemo } from 'react';
import { User, Package, BillingRecord, Ticket, ClientStatus } from '../types.ts';
import { ZONES } from '../constants.tsx';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  tickets?: Ticket[];
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onUpdateUser: (u: User) => Promise<void>;
  onAddUser: (u: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onAddBill: (b: BillingRecord) => void;
  onDeleteBill: (id: string) => void;
  onGenerateMonthlyBills: (month: string) => Promise<number>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], packages = [], bills = [], tickets = [], isDarkMode, onToggleDarkMode, onLogout, onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onGenerateMonthlyBills 
}) => {
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'clients' | 'packages' | 'billing' | 'support'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const unpaid = users.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
    const openTickets = tickets?.filter(t => t.status === 'open').length || 0;

    const months = [];
    const revenueData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const monthYear = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const monthlyTotal = bills
        .filter(b => b.billingMonth === monthYear || (b.date && b.date.startsWith(d.toISOString().slice(0, 7))))
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      
      months.push(monthLabel);
      revenueData.push(monthlyTotal);
    }

    return { total, active, unpaid, openTickets, months, revenueData };
  }, [users, bills, tickets]);

  const maxRev = Math.max(...stats.revenueData, 1000);
  const dataCount = stats.revenueData.length;
  
  const pointsArr = useMemo(() => {
    if (dataCount === 0) return [];
    return stats.revenueData.map((val, i) => ({
      x: (i / (dataCount - 1)) * 1000,
      y: 200 - (val / maxRev) * 160 - 20
    }));
  }, [stats.revenueData, maxRev, dataCount]);

  let curvePath = "";
  if (pointsArr.length > 0) {
    curvePath = `M ${pointsArr[0].x},${pointsArr[0].y}`;
    for (let i = 0; i < pointsArr.length - 1; i++) {
      const curr = pointsArr[i];
      const next = pointsArr[i + 1];
      const controlX = (curr.x + next.x) / 2;
      curvePath += ` C ${controlX},${curr.y} ${controlX},${next.y} ${next.x},${next.y}`;
    }
  }
  const areaPath = pointsArr.length > 0 ? `${curvePath} L 1000,200 L 0,200 Z` : "M0,200 L1000,200 Z";

  const activePct = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  const circumference = 2 * Math.PI * 96; 
  const dashOffset = circumference - (activePct / 100) * circumference;

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clients', label: 'Client Management', icon: '👥' },
    { id: 'packages', label: 'Packages', icon: '📦' },
    { id: 'billing', label: 'Billing & Payments', icon: '💳' },
    { id: 'support', label: 'Support & Tickets', icon: '🛠️' },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Clients', value: stats.total, color: 'text-blue-600', icon: '👥', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                { label: 'Active Services', value: stats.active, color: 'text-emerald-600', icon: '✅', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                { label: 'Unpaid Bills', value: `৳${stats.unpaid}`, color: 'text-amber-600', icon: '💳', bg: 'bg-amber-50 dark:bg-amber-900/10' },
                { label: 'Open Tickets', value: stats.openTickets, color: 'text-rose-600', icon: '❗', bg: 'bg-rose-50 dark:bg-rose-900/10' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 group hover:shadow-xl transition-all duration-500">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-[1.25rem] flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>{stat.icon}</div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time</span>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                  <h3 className={`text-4xl font-black mt-2 ${stat.color} tracking-tighter`}>{stat.value}</h3>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                 <div className="flex justify-between items-center mb-10">
                    <h4 className="font-black text-xl text-slate-800 dark:text-white">Revenue Trend</h4>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Collection</p>
                    </div>
                 </div>
                 <div className="h-64 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 25, 50, 75, 100].map(y => (
                        <line key={y} x1="0" y1={y*2} x2="1000" y2={y*2} stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="5,5" />
                      ))}
                      <path d={areaPath} fill="url(#chartGrad)" className="transition-all duration-1000" />
                      <path d={curvePath} fill="none" stroke="#3B82F6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-1000" />
                      {pointsArr.map((pt, i) => (
                        <circle key={i} cx={pt.x} cy={pt.y} r="6" fill="white" stroke="#3B82F6" strokeWidth="3" className="drop-shadow-md" />
                      ))}
                    </svg>
                    <div className="flex justify-between mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {stats.months.map(m => <span key={m}>{m}</span>)}
                    </div>
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                 <h4 className="font-black text-xl text-slate-800 dark:text-white mb-10">Service Status</h4>
                 <div className="relative flex items-center justify-center w-64 h-64">
                    <div className="z-10 text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Rate</p>
                       <p className="text-5xl font-black text-blue-600 tracking-tighter">{Math.round(activePct)}%</p>
                    </div>
                    <svg className="absolute w-full h-full -rotate-90 pointer-events-none">
                      <circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" strokeWidth="22" className="text-slate-50 dark:text-slate-800/40" />
                      <circle cx="128" cy="128" r="96" fill="none" stroke="#3B82F6" strokeWidth="22" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-1000 ease-in-out" />
                    </svg>
                 </div>
                 <div className="mt-12 w-full space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                      <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-blue-600"></span> Active</div>
                      <span className="font-black text-slate-800 dark:text-white">{stats.active}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                      <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></span> Others</div>
                      <span className="font-black text-slate-800 dark:text-white">{stats.total - stats.active}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">Customer Directory</h3>
              <div className="flex gap-4 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Search user..." 
                  className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button onClick={() => setIsAddingUser(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap">+ Add Client</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5 w-12 text-center">#</th>
                    <th className="px-8 py-5">User ID</th>
                    <th className="px-8 py-5">Address</th>
                    <th className="px-8 py-5">Package</th>
                    <th className="px-8 py-5">Expiry</th>
                    <th className="px-8 py-5">Days Left</th>
                    <th className="px-8 py-5">Due</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).map((u, index) => {
                    const expiry = new Date(u.expiryDate);
                    const now = new Date();
                    const diffTime = expiry.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const daysLeft = diffDays; // Allow negative values for expired IDs
                    
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-8 py-5 text-[11px] font-black text-slate-400 text-center">{index + 1}</td>
                        <td className="px-8 py-5 font-black text-slate-700 dark:text-slate-200 text-sm">{u.username}</td>
                        <td className="px-8 py-5 text-xs text-slate-500 font-bold max-w-[150px] truncate">{u.address || 'N/A'}</td>
                        <td className="px-8 py-5 text-xs text-slate-500 font-black">{u.packageId}</td>
                        <td className="px-8 py-5 text-[10px] font-bold text-slate-400">{u.expiryDate}</td>
                        <td className={`px-8 py-5 text-xs font-black ${daysLeft <= 3 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'} ${daysLeft <= 3 && daysLeft > 0 ? 'animate-pulse' : ''}`}>
                          {daysLeft} Days
                        </td>
                        <td className="px-8 py-5 font-black text-sm text-slate-700 dark:text-slate-200">৳{u.balance}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">✏️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'packages':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-500">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-[1.5rem] flex items-center justify-center text-3xl mb-8">📦</div>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{pkg.name}</h4>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-4xl font-black text-blue-600 tracking-tighter">৳{pkg.price}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">/ Month</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Speed</span>
                    <span className="text-slate-800 dark:text-slate-200">{pkg.speed} Mbps</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Validity</span>
                    <span className="text-slate-800 dark:text-slate-200">{pkg.validityDays} Days</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'billing':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 animate-in fade-in duration-500">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-8 tracking-tight">Recent Transactions</h3>
            <div className="space-y-4">
              {bills.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-xl shadow-sm">💰</div>
                    <div>
                      <p className="text-base font-black text-slate-800 dark:text-white">{bill.userId}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{bill.billingMonth} • {bill.method}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600">৳{bill.amount}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{bill.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-10 animate-in fade-in duration-500 text-center">
            <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-8 shadow-sm">🛠️</div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Support Tickets</h3>
            <p className="text-slate-500 text-sm font-medium mb-10 max-w-sm mx-auto">Track and manage customer complaints and technical issues.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 text-left">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Open Issues</p>
                <p className="text-4xl font-black text-blue-800 dark:text-blue-300 tracking-tighter">{stats.openTickets}</p>
              </div>
              <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 text-left">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Resolved Today</p>
                <p className="text-4xl font-black text-emerald-800 dark:text-emerald-300 tracking-tighter">0</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
      <aside className={`bg-[#0F172A] text-white flex flex-col fixed inset-y-0 left-0 z-[60] w-64 transform transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 h-24 flex items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-[1rem] flex items-center justify-center font-black text-xl">N</div>
            <span className="font-black text-2xl tracking-tighter">NexusISP</span>
          </div>
        </div>
        <nav className="flex-grow px-6 mt-6 space-y-3 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveMenu(item.id as any); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
              <span className="text-xl">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-grow lg:ml-64 flex flex-col min-h-screen">
        <header className="h-24 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-3 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-2xl">☰</button>
            <span className="font-black text-xl tracking-tighter text-slate-800 dark:text-white hidden sm:block">ADMIN PORTAL</span>
          </div>

          <div className="flex items-center gap-6 relative">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl border-4 border-white dark:border-slate-800 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`} alt="Admin" />
            </div>

            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                <div className="absolute right-0 top-16 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] shadow-2xl z-50 py-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 mb-2">
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Administrator</p>
                    <p className="text-[9px] text-slate-400 font-bold">Nexus ISP Super Admin</p>
                  </div>
                  <button onClick={() => { onToggleDarkMode(); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-300">
                    <span className="text-xl">{isDarkMode ? '☀️' : '🌙'}</span>
                    <span className="text-xs font-bold uppercase tracking-widest">{isDarkMode ? 'লাইট মোড' : 'ডার্ক মোড'}</span>
                  </button>
                  <button onClick={() => { setShowLogoutConfirm(true); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 transition-colors border-t border-slate-100 dark:border-slate-700 mt-2 pt-2">
                    <span className="text-xl">🚪</span> 
                    <span className="text-xs font-black uppercase tracking-widest">লগআউট</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full space-y-10 pb-24">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{activeMenu}</h2>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">NexusConnect Management</h1>
            </div>
          </div>
          {renderContent()}
        </div>
      </main>

      {/* Improved Edit Client Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl border dark:border-slate-800 my-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Edit Client Profile</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Updating info for: {editingUser.username}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl flex items-center justify-center text-xl transition-all">✕</button>
            </div>
            
            <form onSubmit={async (e) => { e.preventDefault(); setIsUpdating(true); await onUpdateUser(editingUser); setEditingUser(null); setIsUpdating(false); }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info Group */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input type="text" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Client's Full Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input type="tel" value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="01XXX-XXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                    <input type="text" value={editingUser.address} onChange={e => setEditingUser({...editingUser, address: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Current Address" />
                  </div>
                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Area</label>
                    <select value={editingUser.zone || ''} onChange={e => setEditingUser({...editingUser, zone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none">
                      <option value="">Select Zone</option>
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                </div>

                {/* Account Settings Group */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Package Plan</label>
                    <select value={editingUser.packageId} onChange={e => setEditingUser({...editingUser, packageId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none">
                      {packages.map(p => <option key={p.id} value={p.id}>{p.name} (৳{p.price})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Status</label>
                    <select value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none">
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                      <option value="left">Left</option>
                      <option value="free">Free</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                    <input type="date" value={editingUser.expiryDate} onChange={e => setEditingUser({...editingUser, expiryDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Balance (৳)</label>
                    <input type="number" value={editingUser.balance} onChange={e => setEditingUser({...editingUser, balance: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                 <button type="submit" disabled={isUpdating} className="flex-grow bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    {isUpdating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : "Save Changes"}
                 </button>
                 <button type="button" onClick={() => setEditingUser(null)} className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                    Cancel
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-sm p-10 shadow-2xl border dark:border-slate-800 text-center">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Sign Out?</h3>
            <p className="text-sm text-slate-500 mb-10">Are you sure you want to logout from NexusConnect?</p>
            <div className="flex flex-col gap-4">
              <button onClick={onLogout} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase shadow-lg hover:bg-rose-700 transition-all">Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
