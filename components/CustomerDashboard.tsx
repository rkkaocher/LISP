import React, { useState, useEffect, useRef } from 'react';
import { User, Package, BillingRecord } from '../types';
import { getSupportAdvice } from '../services/geminiService';
import { supabase } from '../lib/supabaseClient'; // আপনার ফাইলের লোকেশন অনুযায়ী পাথ ঠিক করে নিন

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

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user: initialUser, packages, bills: initialBills }) => {
  // --- ছোট কোডটি এখানে বসানো হয়েছে (State & Fetching) ---
  const [customerData, setCustomerData] = useState<any>(initialUser);
  const [payments, setPayments] = useState<any[]>(initialBills);
  const [loading, setLoading] = useState(true);

  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Customers টেবিল থেকে ডাটা আনা
          const { data: customer } = await supabase
            .from('Customers')
            .select('*')
            .eq('id', authUser.id)
            .single();

          // Payments টেবিল থেকে ডাটা আনা
          const { data: paymentData } = await supabase
            .from('Payments')
            .select('*')
            .eq('customer_id', authUser.id)
            .order('payment_date', { ascending: false });

          if (customer) setCustomerData(customer);
          if (paymentData) setPayments(paymentData || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  // --- ছোট কোড শেষ ---

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

  if (loading) return <div className="text-center py-20 text-indigo-600 font-bold">লোড হচ্ছে...</div>;
  if (!customerData) return <div className="text-center py-20 text-red-500 font-bold">লগইন করুন অথবা ডাটা খুঁজে পাওয়া যায়নি</div>;

  // স্ট্যাটাস এবং প্যাকেজ ক্যালকুলেশন
  const expiryDateObj = new Date(customerData.Expiry_date || new Date());
  const isExpired = expiryDateObj < new Date();
  const statusText = isExpired ? 'মেয়াদ উত্তীর্ণ (Expired)' : 'সচল (Active)';
  const statusColorClass = isExpired ? 'bg-red-400/20 text-red-300 border-red-400/30' : 'bg-green-400/20 text-green-300 border-green-400/30';

  const handleAiAsk = async () => {
    if (!aiMessage.trim() || isLoading) return;
    const userMsg = aiMessage;
    setAiMessage('');
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);
    const advice = await getSupportAdvice(userMsg, chatHistory.map(m => ({ role: m.role, text: m.text })));
    setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: advice || 'দুঃখিত সাহায্য করতে পারছি না।' }]);
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-200px)]">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* ব্যানার সেকশন */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <span className="text-[10px] font-extrabold opacity-70 uppercase tracking-[0.2em] mb-2 block">ইন্টারনেট কানেকশন</span>
            <h2 className="text-3xl md:text-4xl font-extrabold">{customerData.Package}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${statusColorClass}`}>● {statusText}</span>
              <span className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-[10px] font-medium">আইপি: 103.145.22.12</span>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="text-center bg-white/10 px-6 py-4 rounded-3xl border border-white/10">
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1">মেয়াদ শেষ</p>
              <p className="text-xl font-black">{new Date(customerData.Expiry_date).toLocaleDateString('bn-BD')}</p>
            </div>
            <div className="text-center bg-white/10 px-6 py-4 rounded-3xl border border-white/10">
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1">মাসিক বিল</p>
              <p className="text-xl font-black">৳{customerData.Monthly_bill}</p>
            </div>
          </div>
        </div>

        {/* বিলিং রেকর্ড সেকশন */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-8">💳 বিলিং রেকর্ড</h4>
          <div className="space-y-4">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem]">
                <div>
                  <p className="text-sm font-bold text-slate-800">{p.month || 'ইন্টারনেট বিল'}</p>
                  <p className="text-[9px] text-slate-400">{new Date(p.payment_date).toLocaleDateString('bn-BD')}</p>
                </div>
                <p className="font-bold text-indigo-600">৳{p.amount}</p>
              </div>
            ))}
            {payments.length === 0 && <p className="text-center text-slate-400">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।</p>}
          </div>
        </div>

        {/* AI সাপোর্ট চ্যাট সেকশন (আপনার ডিজাইন অনুযায়ী বাকি অংশ...) */}
      </div>

      {/* Floating AI Support Button */}
      <div className="fixed bottom-6 right-6 z-[80]">
        <button onClick={() => setShowAiChat(!showAiChat)} className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl bg-indigo-600 text-white">
          {showAiChat ? '✕' : '🤖'}
        </button>
      </div>
      
      {/* AI চ্যাট উইন্ডো কোড এখানে থাকবে */}
      {showAiChat && (
        <div className="fixed bottom-24 right-6 w-[350px] bg-white h-[500px] rounded-[2rem] shadow-2xl border border-slate-200 z-[100] flex flex-col overflow-hidden">
           <div className="bg-indigo-600 p-4 text-white font-bold">AI সাপোর্ট</div>
           <div className="flex-grow p-4 overflow-y-auto space-y-3">
              {chatHistory.map(m => (
                <div key={m.id} className={`${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block p-3 rounded-2xl text-[11px] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{m.text}</span>
                </div>
              ))}
           </div>
           <div className="p-4 border-t flex gap-2">
              <input value={aiMessage} onChange={(e)=>setAiMessage(e.target.value)} className="flex-grow bg-slate-100 rounded-xl px-4 text-xs outline-none" placeholder="সমস্যাটি লিখুন..." />
              <button onClick={handleAiAsk} className="bg-indigo-600 p-2 rounded-xl text-white">🚀</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
