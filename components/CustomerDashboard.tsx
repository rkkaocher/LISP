
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Package, BillingRecord, Ticket } from '../types';
import { getSupportAdvice } from '../services/geminiService';

interface CustomerDashboardProps {
  user: User;
  packages: Package[];
  bills: BillingRecord[];
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, packages, bills }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'support'>('overview');
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const currentPackage = useMemo(() => packages.find(p => p.id === user.packageId), [packages, user.packageId]);
  
  const daysLeft = useMemo(() => {
    if (!user.expiryDate) return 0;
    const diff = new Date(user.expiryDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [user.expiryDate]);

  const handleSupportSubmit = async () => {
    if (!aiMessage.trim()) return;
    setIsLoading(true);
    const userText = aiMessage;
    setAiMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    const response = await getSupportAdvice(userText, chatHistory);
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Mobile-Friendly Navigation */}
      <div className="flex bg-white p-1 rounded-3xl border border-slate-100 shadow-sm w-full md:w-fit mx-auto md:mx-0">
        {[
          { id: 'overview', label: 'Dashboard', icon: '🏠' },
          { id: 'billing', label: 'Payments', icon: '💳' },
          { id: 'support', label: 'Support', icon: '🛠️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 md:flex-none px-6 py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Main Hero Card */}
          <div className="relative overflow-hidden bg-[#0F172A] rounded-[3rem] p-10 text-white shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-4 text-center md:text-left">
                   <div className="flex items-center justify-center md:justify-start gap-3">
                      <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Connection {user.status}</p>
                   </div>
                   <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                      {currentPackage?.speed || 0} <span className="text-xl md:text-3xl opacity-40 font-bold">Mbps</span>
                   </h1>
                   <p className="text-lg font-bold opacity-80">{currentPackage?.name || 'Loading...'}</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] text-center min-w-[200px]">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Days Remaining</p>
                   <div className="text-6xl font-black">{daysLeft}</div>
                   <p className="text-xs font-bold mt-2 opacity-50">Expires: {user.expiryDate}</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'Monthly Bill', val: `৳${currentPackage?.price || 0}`, icon: '🏷️', color: 'bg-indigo-50 text-indigo-600' },
               { label: 'Current Due', val: `৳${user.balance}`, icon: '💰', color: 'bg-rose-50 text-rose-600' },
               { label: 'Data Usage', val: `${user.dataUsedGb} GB`, icon: '📊', color: 'bg-emerald-50 text-emerald-600' },
               { label: 'IP Address', val: '103.14.22.4', icon: '🌐', color: 'bg-blue-50 text-blue-600' }
             ].map((s, i) => (
               <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <div className={`w-12 h-12 ${s.color} rounded-2xl flex items-center justify-center text-xl mb-4 shadow-sm`}>{s.icon}</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-sm font-black text-slate-800">{s.val}</p>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-8">
           <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">Billing & Invoices</h3>
                 <p className="text-sm text-slate-500 font-medium">Manage your subscription and payments</p>
              </div>
              {user.balance > 0 && (
                <button className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Pay Now (৳{user.balance})
                </button>
              )}
           </div>
           
           <div className="space-y-4">
              {bills.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">
                       {bill.status === 'paid' ? '✅' : '⏳'}
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-800">{bill.billingMonth}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                           {bill.status}
                        </span>
                        <p className="text-[9px] text-slate-400 font-bold">{bill.method} • {bill.date || 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-black">৳{bill.amount}</p>
                     <p className="text-[9px] font-black text-slate-300 uppercase">Inv #NC-{bill.id.slice(0,4)}</p>
                  </div>
                </div>
              ))}
              {bills.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">No billing history found.</p>}
           </div>
        </div>
      )}

      {activeTab === 'support' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
           <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
              <div>
                 <h3 className="text-xl font-black tracking-tight">AI Support Assistant</h3>
                 <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">Online • Instant Response</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🤖</div>
           </div>
           
           <div className="flex-grow p-8 overflow-y-auto bg-slate-50/50 space-y-6">
              <div className="flex justify-start">
                 <div className="max-w-[80%] bg-white p-6 rounded-[2rem] rounded-tl-none shadow-sm border border-slate-100 text-sm font-bold text-slate-700 leading-relaxed">
                   নমস্কার! আমি NexusConnect AI অ্যাসিস্ট্যান্ট। আপনার ইন্টারনেট কানেকশন বা বিল নিয়ে কোনো সমস্যা হলে আমাকে জিজ্ঞাসা করতে পারেন। আমি আপনাকে তাৎক্ষণিকভাবে সাহায্য করতে পারি।
                 </div>
              </div>
              
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-6 rounded-[2rem] text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                      {m.text}
                   </div>
                </div>
              ))}
              
              {isLoading && (
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 px-4">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    AI ভাবছে...
                 </div>
              )}
           </div>
           
           <div className="p-8 bg-white border-t border-slate-50 flex gap-4">
              <input 
                type="text" 
                className="flex-grow px-8 py-5 rounded-[2rem] bg-slate-50 border-none outline-none text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="এখানে আপনার সমস্যাটি লিখুন..."
                value={aiMessage}
                onChange={e => setAiMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSupportSubmit()}
              />
              <button onClick={handleSupportSubmit} className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                 🚀
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
