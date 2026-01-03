
import React, { useState } from 'react';
import { User, Package, BillingRecord } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSupportAdvice } from '../services/geminiService';

interface CustomerDashboardProps {
  user: User;
  packages: Package[];
  bills: BillingRecord[];
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, packages, bills }) => {
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentPackage = packages.find(p => p.id === user.packageId);

  const usageData = [
    { day: 'Mon', usage: 4.2 }, { day: 'Tue', usage: 3.8 }, { day: 'Wed', usage: 5.1 },
    { day: 'Thu', usage: 4.9 }, { day: 'Fri', usage: 7.4 }, { day: 'Sat', usage: 10.2 }, { day: 'Sun', usage: 8.5 },
  ];

  const handleAiAsk = async () => {
    if (!aiMessage.trim()) return;
    setIsLoading(true);
    const advice = await getSupportAdvice(aiMessage);
    setAiResponse(advice);
    setIsLoading(false);
  };

  const getMethodBadge = (method: BillingRecord['method']) => {
    switch(method) {
      case 'bKash': return 'bg-[#D12053] text-white';
      case 'Nagad': return 'bg-[#F7941D] text-white';
      case 'Rocket': return 'bg-[#8C3494] text-white';
      case 'Cash': return 'bg-green-600 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  // Improved sorting to handle date strings better (Latest first)
  const sortedBills = [...bills].sort((a, b) => {
    // Attempt to parse actual dates if they exist, otherwise compare month strings
    const dateA = a.date ? new Date(a.date).getTime() : new Date(a.billingMonth).getTime();
    const dateB = b.date ? new Date(b.date).getTime() : new Date(b.billingMonth).getTime();
    return dateB - dateA;
  });

  const pendingBills = sortedBills.filter(b => b.status === 'pending');
  const paidBills = sortedBills.filter(b => b.status === 'paid');

  return (
    <div className="relative pb-24">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <span className="text-[10px] font-extrabold opacity-70 uppercase tracking-[0.2em] mb-2 block">Premium Connectivity</span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-none tracking-tight">
              {currentPackage?.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.status === 'active' ? 'bg-green-400/20 text-green-300 border-green-400/30' : 'bg-red-400/20 text-red-300 border-red-400/30'}`}>
                ● {user.status.charAt(0).toUpperCase() + user.status.slice(1)} Connection
              </span>
              <span className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-[10px] font-medium">IP: 103.145.22.12</span>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="text-center bg-white/10 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1 tracking-widest">Internet Validity</p>
              <p className="text-xl font-black">{new Date(user.expiryDate).toLocaleDateString('en-GB')}</p>
            </div>
            <div className="text-center bg-white/10 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1 tracking-widest">Monthly Bill</p>
              <p className="text-xl font-black">৳{currentPackage?.price}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Current Speed', val: `${currentPackage?.speed} Mbps`, icon: '⚡', color: 'bg-blue-50 text-blue-600' },
                { label: 'Uptime', val: '99.9%', icon: '🚀', color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Package Type', val: 'Unlimited', icon: '📊', color: 'bg-violet-50 text-violet-600' },
                { label: 'Stability', val: 'High', icon: '📡', color: 'bg-amber-50 text-amber-600' }
              ].map((s, idx) => (
                <div key={idx} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <div className={`w-10 h-10 ${s.color} rounded-2xl flex items-center justify-center text-lg mb-2 shadow-sm`}>{s.icon}</div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{s.label}</p>
                  <p className="text-sm font-bold text-slate-800 tracking-tight">{s.val}</p>
                </div>
              ))}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-8">
                <span className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-sm">💳</span>
                My Billing Records
              </h4>
              
              <div className="space-y-4">
                {pendingBills.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-5 bg-red-50 border border-red-100 rounded-[1.5rem] animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">⚠️</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.billingMonth}</p>
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide">Due - Please pay to avoid suspension</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-red-600">৳{bill.amount}</p>
                    </div>
                  </div>
                ))}

                {paidBills.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${getMethodBadge(bill.method)}`}>
                        {bill.method[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.billingMonth}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase">Paid</span>
                          <p className="text-[9px] text-slate-400 font-medium">On: {bill.date}</p>
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-slate-700">৳{bill.amount}</p>
                  </div>
                ))}
                
                {bills.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-slate-400 text-sm">No billing records found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
              <h4 className="text-sm font-bold mb-6 opacity-80 uppercase tracking-widest">Technical Support</h4>
              <div className="space-y-4 relative z-10">
                <a href="tel:+8801827166214" className="flex items-center gap-4 p-4 bg-white/10 rounded-3xl border border-white/5 hover:bg-white/20 transition-all group">
                  <span className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-lg">📞</span>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase">24/7 Hotline</p>
                    <p className="text-sm font-bold">+880 1827-166214</p>
                  </div>
                </a>
                <button onClick={() => setShowAiChat(true)} className="w-full flex items-center gap-4 p-4 bg-indigo-500 rounded-3xl border border-indigo-400 group">
                  <span className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-lg">🤖</span>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-white uppercase">AI Support</p>
                    <p className="text-sm font-bold">Ask for help</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAiChat && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[600px]">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold">NexusConnect AI Support</h3>
              <button onClick={() => setShowAiChat(false)} className="text-white hover:opacity-70">✕</button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto space-y-4">
              <div className="bg-slate-50 p-4 rounded-3xl rounded-tl-none text-sm text-slate-700 border border-slate-100">
                Hi! How can I help you with your internet connection today?
              </div>
              {aiResponse && <div className="bg-indigo-50 p-4 rounded-3xl rounded-tr-none text-sm text-indigo-700 self-end ml-10 border border-indigo-100">{aiResponse}</div>}
              {isLoading && <div className="text-center text-xs text-slate-400 italic">Thinking...</div>}
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-2">
              <input type="text" className="flex-grow px-4 py-2 rounded-xl border outline-none" placeholder="Type your issue..." value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAiAsk()} />
              <button onClick={handleAiAsk} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold">Ask</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
