
import React, { useState } from 'react';
import { User, Package, BillingRecord } from '../types';
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

  const sortedBills = [...bills].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : new Date(a.billingMonth).getTime();
    const dateB = b.date ? new Date(b.date).getTime() : new Date(b.billingMonth).getTime();
    return dateB - dateA;
  });

  const pendingBills = sortedBills.filter(b => b.status === 'pending');
  const paidBills = sortedBills.filter(b => b.status === 'paid');

  return (
    <div className="relative min-h-[calc(100vh-200px)]">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <span className="text-[10px] font-extrabold opacity-70 uppercase tracking-[0.2em] mb-2 block">ইন্টারনেট কানেকশন</span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-none tracking-tight">
              {currentPackage?.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.status === 'active' ? 'bg-green-400/20 text-green-300 border-green-400/30' : 'bg-red-400/20 text-red-300 border-red-400/30'}`}>
                ● {user.status === 'active' ? 'সচল (Active)' : 'বন্ধ (Inactive)'}
              </span>
              <span className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-[10px] font-medium">আইপি: 103.145.22.12</span>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="text-center bg-white/10 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1 tracking-widest">ইন্টারনেটের মেয়াদ</p>
              <p className="text-xl font-black">{new Date(user.expiryDate).toLocaleDateString('bn-BD')}</p>
            </div>
            <div className="text-center bg-white/10 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1 tracking-widest">মাসিক বিল</p>
              <p className="text-xl font-black">৳{currentPackage?.price}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'বর্তমান স্পিড', val: `${currentPackage?.speed} Mbps`, icon: '⚡', color: 'bg-blue-50 text-blue-600' },
                { label: 'আপটাইম', val: '৯৯.৯%', icon: '🚀', color: 'bg-emerald-50 text-emerald-600' },
                { label: 'প্যাকেজ টাইপ', val: 'আনলিমিটেড', icon: '📊', color: 'bg-violet-50 text-violet-600' },
                { label: 'স্ট্যাবিলিটি', val: 'হাই', icon: '📡', color: 'bg-amber-50 text-amber-600' }
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
                বিলিং রেকর্ড
              </h4>
              
              <div className="space-y-4">
                {pendingBills.map(bill => (
                  /* Fixed line 99: type property access is now valid after interface update */
                  <div key={bill.id} className={`flex items-center justify-between p-5 rounded-[1.5rem] animate-pulse ${bill.type === 'miscellaneous' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                        {/* Fixed line 102: valid property access */}
                        {bill.type === 'miscellaneous' ? '📋' : '⚠️'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.billingMonth}</p>
                        {/* Fixed line 106: valid property access */}
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${bill.type === 'miscellaneous' ? 'text-amber-600' : 'text-red-500'}`}>
                          {bill.description || 'বাকি বিল - ইন্টারনেট'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Fixed line 112: valid property access */}
                      <p className={`text-lg font-black ${bill.type === 'miscellaneous' ? 'text-amber-600' : 'text-red-600'}`}>৳{bill.amount}</p>
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
                          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase">পরিশোধিত</span>
                          <p className="text-[9px] text-slate-400 font-medium">{bill.description || 'মাসিক ইন্টারনেট বিল'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-slate-700">৳{bill.amount}</p>
                       <p className="text-[8px] text-slate-400">{bill.date}</p>
                    </div>
                  </div>
                ))}
                
                {bills.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-slate-400 text-sm">কোনো বিলিং রেকর্ড পাওয়া যায়নি।</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
              <h4 className="text-sm font-bold mb-6 opacity-80 uppercase tracking-widest">কাস্টমার সাপোর্ট</h4>
              <div className="space-y-4 relative z-10">
                <a href="tel:+8801827166214" className="flex items-center gap-4 p-4 bg-white/10 rounded-3xl border border-white/5 hover:bg-white/20 transition-all group">
                  <span className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-lg">📞</span>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase">২৪/৭ হটলাইন</p>
                    <p className="text-sm font-bold text-white tracking-tight">+৮৮০ ১৮২৭-১৬৬২১৪</p>
                  </div>
                </a>
                <div className="p-4 bg-white/5 border border-white/10 rounded-3xl">
                   <p className="text-[10px] font-bold text-indigo-300 uppercase mb-2">অফিস ঠিকানা</p>
                   <p className="text-xs text-slate-300 leading-relaxed">রংপুর ব্রাঞ্চ অফিস, সিটি সেন্টার প্লাজা, রংপুর, বাংলাদেশ।</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Support Button */}
      <div className="fixed bottom-6 right-6 z-[80]">
        <button 
          onClick={() => setShowAiChat(!showAiChat)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all active:scale-90 animate-bounce-subtle ${showAiChat ? 'bg-red-500 text-white rotate-90' : 'bg-indigo-600 text-white'}`}
        >
          {showAiChat ? '✕' : '🤖'}
          {!showAiChat && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Floating AI Chat Window */}
      {showAiChat && (
        <div className="fixed inset-0 z-[100] md:inset-auto md:bottom-24 md:right-6 md:w-[400px] flex items-end justify-center md:items-end md:justify-end animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-white w-full h-full md:h-[550px] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">🤖</div>
                <div>
                  <h3 className="font-bold text-sm">NexusConnect অ্যাসিস্ট্যান্ট</h3>
                  <p className="text-[9px] opacity-70 uppercase tracking-widest">২৪/৭ অনলাইন</p>
                </div>
              </div>
              <button onClick={() => setShowAiChat(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
            </div>
            
            <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-xs self-end">🤖</div>
                <div className="max-w-[80%] bg-white p-4 rounded-2xl rounded-bl-none text-xs text-slate-700 shadow-sm border border-slate-100">
                  নমস্কার! আমি নেক্সাস কানেক্ট AI। আপনার ইন্টারনেট কানেকশন বা বিল নিয়ে কোনো সমস্যা হলে আমাকে জিজ্ঞাসা করতে পারেন।
                </div>
              </div>

              {aiResponse && (
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs self-end font-bold">U</div>
                  <div className="max-w-[80%] bg-indigo-600 p-4 rounded-2xl rounded-br-none text-xs text-white shadow-md shadow-indigo-100">
                    {aiResponse}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex gap-2 items-center text-[10px] text-slate-400 ml-11">
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  AI ভাবছে...
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-50 flex gap-2">
              <input 
                type="text" 
                className="flex-grow px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none text-xs focus:ring-2 focus:ring-indigo-500 transition-all" 
                placeholder="আপনার সমস্যাটি এখানে লিখুন..." 
                value={aiMessage} 
                onChange={(e) => setAiMessage(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleAiAsk()} 
              />
              <button 
                onClick={handleAiAsk} 
                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
