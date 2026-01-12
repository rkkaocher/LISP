
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('Customers')
            .insert([
              {
                id: authData.user.id,
                User_id: email.split('@')[0], 
                Name: fullName,              
                Phone_number: phone,         
                Address: address,            
                Role: 'Customer',            
                Package: '10 Mbps', 
                Expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                Due_amount: 0                
              }
            ]);

          if (profileError) {
            setSuccessMsg('রেজিস্ট্রেশন হয়েছে! অ্যাডমিন প্রোফাইল এপ্রুভ করলে আপনি লগইন করতে পারবেন।');
          } else {
            setSuccessMsg('রেজিস্ট্রেশন সফল! এখন লগইন করুন।');
          }
          setIsSignUp(false);
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (loginError) {
          if (loginError.message.includes('Invalid login credentials')) {
            throw new Error('ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়।');
          }
          throw loginError;
        }
      }
    } catch (err: any) {
      setError(err.message || 'একটি সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] p-4 selection:bg-indigo-500/30 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed top-[-15%] left-[-15%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
      <div className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[70%] bg-violet-600/10 blur-[150px] rounded-full"></div>

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/40 mb-6 transform hover:rotate-6 transition-all duration-500">N</div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">NexusConnect</h1>
          <p className="text-slate-400 text-sm font-medium opacity-80">{isSignUp ? 'নতুন অ্যাকাউন্ট খুলুন' : 'লগইন করে ড্যাশবোর্ড দেখুন'}</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-500"></div>
          
          <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
            {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95"><span>⚠️</span> {error}</div>}
            {successMsg && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-bold rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95"><span>✅</span> {successMsg}</div>}

            <div className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">পূর্ণ নাম</label>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all font-semibold text-slate-800" placeholder="আপনার নাম" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ফোন নাম্বার</label>
                      <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none font-semibold text-slate-800" placeholder="০১৮.." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ঠিকানা</label>
                      <input type="text" required value={address} onChange={e => setAddress(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none font-semibold text-slate-800" placeholder="রংপুর" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ইমেইল ঠিকানা</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none font-semibold text-slate-800" placeholder="example@mail.com" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none font-semibold text-slate-800" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors px-3 py-2">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>{isSignUp ? 'নিবন্ধন সম্পন্ন করুন' : 'লগইন করুন'}</span>
              )}
            </button>

            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }} className="w-full text-center text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-tight">
              {isSignUp ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'অ্যাকাউন্ট নেই? নতুন অ্যাকাউন্ট খুলুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
