import React, { useState, useMemo } from 'react';
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
  onGenerateMonthlyBills: (month: string, targetUserIds?: string[]) => Promise<number>;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users = [], packages = [], bills = [], onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onGenerateMonthlyBills 
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'payments' | 'packages' | 'stats'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Stats Logic
  const stats = useMemo(() => {
    const active = users.filter(u => u.status === 'active').length;
    const expired = users.filter(u => u.status === 'expired').length;
    const revenue = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
    
    // Package Distribution for Pie Chart
    const pkgDist = packages.map(pkg => ({
      name: pkg.name.split('-')[0],
      count: users.filter(u => u.packageId === pkg.id).length
    })).filter(p => p.count > 0);

    return { active, expired, revenue, pkgDist };
  }, [users, bills, packages]);

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Navigation & Search Bar */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {[
            { id: 'customers', label: 'Customers', icon: '👥' },
            { id: 'payments', label: 'Payments', icon: '💳' },
            { id: 'packages', label: 'Packages', icon: '📦' },
            { id: 'stats', label: 'Statistics', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-grow lg:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
            <input 
              type="text" 
              placeholder="Search customers..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowGenerateModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            + Generate Bills
          </button>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Growth Bar Chart Visualization */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 tracking-tight">Customer Growth</h3>
            <select className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border-none outline-none">
              <option>Last 6 Months</option>
            </select>
          </div>
          <div className="h-48 flex items-end justify-between gap-4 px-2">
            {[40, 70, 45, 90, 65, 85].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full bg-slate-50 rounded-full h-40 relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-indigo-500 rounded-full transition-all duration-1000 group-hover:bg-indigo-600" 
                    style={{ height: `${val}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{MONTHS_BN[i+1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Package Distribution Pie Chart Visualization */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 tracking-tight mb-8">Package Usage</h3>
          <div className="flex items-center justify-center relative">
            <div className="w-48 h-48 rounded-full border-[16px] border-slate-50 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500 rotate-[45deg] origin-center" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }}></div>
              <div className="absolute inset-0 bg-emerald-400 rotate-[180deg] origin-center" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }}></div>
              <div className="z-10 bg-white w-24 h-24 rounded-full shadow-inner flex flex-col items-center justify-center">
                 <span className="text-xl font-black text-slate-800">{users.length}</span>
                 <span className="text-[8px] font-bold text-slate-400 uppercase">Users</span>
              </div>
            </div>
            <div className="ml-8 space-y-3">
              {stats.pkgDist.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  <span className="text-[10px] font-bold text-slate-500">{p.name} ({p.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Subscriptions Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 tracking-tight">Subscription Management</h3>
          <div className="flex gap-2">
             <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">📄</button>
             <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">⚙️</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Package Info</th>
                <th className="px-8 py-5">Statements</th>
                <th className="px-8 py-5">Expiry</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-sm font-black text-indigo-500">
                        {user.fullName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{user.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400">ID: {user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md w-fit mb-1">{user.packageId}</span>
                      <span className="text-xs font-bold text-slate-500">Fiber Broadband</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase w-fit ${user.balance > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                        {user.balance > 0 ? `Unpaid: ৳${user.balance}` : 'No Dues'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-600">
                    {user.expiryDate}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingUser(user)} className="bg-slate-100 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-sm">✏️</button>
                      <button onClick={() => onDeleteUser(user.id)} className="bg-slate-100 p-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-sm">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 font-bold">No customers found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern Generating Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-3xl font-black text-slate-800 mb-2">Monthly Billing</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Select the period to generate automated invoices for all active customers.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-700 outline-none">
                  {MONTHS_BN.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-700 outline-none">
                  <option>2024</option>
                  <option>2025</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 font-bold text-slate-400 py-4 hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={() => { setShowGenerateModal(false); alert('Billing generated!'); }} className="flex-2 bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100">Confirm & Generate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;