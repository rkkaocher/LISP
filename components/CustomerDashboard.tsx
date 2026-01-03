
import React from 'react';
import { User, Package, BillingRecord } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomerDashboardProps {
  user: User;
  packages: Package[];
  bills: BillingRecord[];
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, packages, bills }) => {
  const currentPackage = packages.find(p => p.id === user.packageId);

  const usageData = [
    { day: 'Mon', usage: 4.2 }, { day: 'Tue', usage: 3.8 }, { day: 'Wed', usage: 5.1 },
    { day: 'Thu', usage: 4.9 }, { day: 'Fri', usage: 7.4 }, { day: 'Sat', usage: 10.2 }, { day: 'Sun', usage: 8.5 },
  ];

  const getMethodBadge = (method: BillingRecord['method']) => {
    switch(method) {
      case 'bKash': return 'bg-[#D12053] text-white';
      case 'Nagad': return 'bg-[#F7941D] text-white';
      case 'Rocket': return 'bg-[#8C3494] text-white';
      case 'Cash': return 'bg-green-600 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  const sortedBills = [...bills].sort((a,b) => b.billingMonth.localeCompare(a.billingMonth));
  const pendingBills = sortedBills.filter(b => b.status === 'pending');
  const paidBills = sortedBills.filter(b => b.status === 'paid');

  return (
    <div className="relative pb-20">
      <div className="space-y-6 animate-in fade-in duration-700">
        {/* Status Banner */}
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">আপনার প্যাকেজ</p>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
              {currentPackage?.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">সচল সংযোগ</span>
              {user.upstreamProvider && (
                <span className="bg-indigo-500/30 border border-white/10 px-3 py-1 rounded-full text-[10px] font-medium">🌐 {user.upstreamProvider}</span>
              )}
            </div>
          </div>
          <div className="relative z-10 flex gap-4">
            <div className="text-center bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[100px]">
              <p className="text-[10px] uppercase opacity-70 mb-0.5">মেয়াদ শেষ</p>
              <p className="text-lg font-bold">{user.expiryDate.split('-')[2]}/{user.expiryDate.split('-')[1]}</p>
            </div>
            <div className="text-center bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[100px]">
              <p className="text-[10px] uppercase opacity-70 mb-0.5">মাসিক বিল</p>
              <p className="text-lg font-bold">৳{currentPackage?.price}</p>
            </div>
          </div>
          {/* Decor */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Connection Details Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">🏢</div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">লাইন প্রোভাইডার</p>
                  <p className="text-sm font-bold text-slate-800">{user.upstreamProvider || 'Default Network'}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">⚡</div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">সর্বোচ্চ গতি</p>
                  <p className="text-sm font-bold text-slate-800">{currentPackage?.speed} Mbps</p>
                </div>
              </div>
            </div>

            {/* Monthly Billing List */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2">💳 বিল ও বকেয়া</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">Payment Logs</span>
              </h4>
              
              <div className="space-y-3">
                {pendingBills.length === 0 && paidBills.length === 0 && (
                  <p className="text-center py-10 text-slate-400 text-xs italic">কোনো বিলিং রেকর্ড পাওয়া যায়নি।</p>
                )}
                
                {pendingBills.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-2xl group transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse">🔔</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.billingMonth}</p>
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">বকেয়া বিল</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">৳{bill.amount}</p>
                      <p className="text-[10px] text-slate-400">মেয়াদ বাড়াতে বিল দিন</p>
                    </div>
                  </div>
                ))}

                {paidBills.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${getMethodBadge(bill.method)}`}>
                        {bill.method === 'Cash' ? '৳' : bill.method[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.billingMonth}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-tighter">পরিশোধিত</span>
                          <p className="text-[9px] text-slate-400 font-medium">{bill.date} • {bill.method}</p>
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-slate-700">৳{bill.amount}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">📈 ডাটা ব্যবহারের সামারি</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageData}>
                    <defs>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="usage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4 text-xs">জরুরী যোগাযোগ</h4>
              <div className="space-y-3">
                <a href="tel:+8801827166214" className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-colors group">
                  <span className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">📞</span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-800">কাস্টমার কেয়ার</p>
                    <p className="text-[10px] text-slate-400">০১৮২৭-১৬৬২১৪</p>
                  </div>
                </a>
              </div>
            </div>
            
            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl mb-3 shadow-sm">🛡️</div>
              <h5 className="text-xs font-bold text-slate-700 mb-1">নিরাপদ ব্রাউজিং</h5>
              <p className="text-[9px] text-slate-500">আপনার সংযোগটি বর্তমানে এনক্রিপ্টেড এবং সুরক্ষিত আছে।</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
