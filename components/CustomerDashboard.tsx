import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Package, BillingRecord } from '../types';
import { getSupportAdvice } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface CustomerDashboardProps {
  user: User;
  packages: Package[];
  bills: BillingRecord[];
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, packages, bills }) => {
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

  const currentPackage = useMemo(() => 
    packages.find(p => p.id === user.packageId),
    [packages, user.packageId]
  );

  const daysRemaining = useMemo(() => {
    if (!user.expiryDate) return 0;
    const expiry = new Date(user.expiryDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [user.expiryDate]);

  const isExpired = daysRemaining === 0 || user.status !== 'active';

  const handleAiAsk = async () => {
    if (!aiMessage.trim() || isLoading) return;
    const userMsg = aiMessage;
    setAiMessage('');
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);
    const advice = await getSupportAdvice(userMsg, chatHistory.map(m => ({ role: m.role, text: m.text })));
    setChatHistory(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: advice }]);
    setIsLoading(false);
  };

  const getMethodBadge = (method: string) => {
    if (method.includes('বিকাশ')) return 'bg-[#D12053] text-white';
    if (method.includes('নগদ')) return 'bg-[#F7941D] text-white';
    return 'bg-emerald-600 text-white';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-card rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-xs font-black uppercase tracking-widest opacity-80">
                {!isExpired ? 'কানেকশন সচল আছে' : 'কানেকশন বন্ধ'}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              {currentPackage?.speed || 0} <span className="text-xl md:text-2xl font-bold opacity-70">Mbps</span>
            </h1>
            <p className="text-lg font-medium opacity-90">
              প্যাকেজ: <span className="font-bold">{user.packageId}</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] text-center min-w-[200px]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">মেয়াদ বাকি আছে</p>
            <div className="text-5xl font-black mb-1">{daysRemaining}</div>
            <p className="text-sm font-bold opacity-80">দিন</p>
          </div>
        </div>
      </section>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'ইউজার আইডি', val: user.username, icon: '👤', color: 'bg-blue-50 text-blue-600' },
          { label: 'ডাটা লিমিট', val: 'আনলিমিটেড', icon: '♾️', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'বর্তমান ডিউ', val: `৳${user.balance}`, icon: '💰', color: 'bg-rose-50 text-rose-600' },
          { label: 'মেয়াদ শেষ হবে', val: user.expiryDate || '-', icon: '📅', color: 'bg-amber-50 text-amber-600' }
        ].map((s, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className={`w-12 h-12 ${s.color} rounded-2xl flex items-center justify-center text-xl mb-3 shadow-sm`}>{s.icon}</div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-sm font-black text-slate-800 tracking-tight">{s.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-800 flex items-center gap-3 mb-8">
              <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">📄</span>
              পেমেন্ট রেকর্ড
            </h4>
            <div className="space-y-4">
              {bills.length > 0 ? bills.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-6 rounded-[2rem] border bg-slate-50 border-slate-100">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${getMethodBadge(bill.method)}`}>
                      {bill.method === 'None' ? '!' : bill.method[0]}
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-800">{bill.billingMonth}</p>
                      <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase border mt-1 inline-block bg-emerald-50 text-emerald-600 border-emerald-100">
                        পরিশোধিত
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">৳{bill.amount}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{bill.date}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center py-10 text-slate-400 font-bold">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0F172A] rounded-[3rem] p-8 text-white shadow-xl">
            <h4 className="text-xs font-black mb-8 opacity-60 uppercase tracking-[0.3em]">সাপোর্ট ও হটলাইন</h4>
            <div className="space-y-4">
              <a href="tel:01827166214" className="flex items-center gap-5 p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all">
                <span className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl">📞</span>
                <div>
                  <p className="text-[10px] font-black text-indigo-300 uppercase mb-1">হটলাইন</p>
                  <p className="text-lg font-black">০১৮২৭-১৬৬২১৪</p>
                </div>
              </a>
            </div>
          </div>

          <button onClick={() => setShowAiChat(true)} className="w-full bg-indigo-600 p-6 rounded-[2.5rem] shadow-lg shadow-indigo-100 text-white flex items-center justify-center gap-4 hover:scale-[1.02] transition-all">
             <span className="text-2xl">🤖</span>
             <span className="font-bold">AI অ্যাসিস্ট্যান্টের সাহায্য নিন</span>
          </button>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAiChat && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">🤖</div>
                <h3 className="font-black text-lg">NexusConnect AI</h3>
              </div>
              <button onClick={() => setShowAiChat(false)} className="text-2xl">✕</button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto bg-slate-50 space-y-4">
              {chatHistory.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && <p className="text-[10px] font-black text-slate-400">AI টাইপ করছে...</p>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
              <input type="text" className="flex-grow px-5 py-3 rounded-2xl bg-slate-50 outline-none" placeholder="আপনার সমস্যাটি লিখুন..." value={aiMessage} onChange={e => setAiMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAiAsk()} />
              <button onClick={handleAiAsk} className="w-12 h-12 bg-indigo-600 text-white rounded-xl">🚀</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;