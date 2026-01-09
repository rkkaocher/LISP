import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। অথবা একাউন্টটি সক্রিয় নেই।');
      }
    } catch (err) {
      setError('সার্ভারে সমস্যা হচ্ছে। পরে চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6 selection:bg-indigo-500/30">
      {/* Background Glows for Depth */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Header Logo & Title */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2.2rem] mx-auto flex items-center justify-center text-white text-4xl font-black shadow-[0_20px_50px_rgba(79,70,229,0.3)] mb-8 transform hover:rotate-6 transition-transform cursor-default">
            N
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">NexusConnect</h1>
          <p className="text-slate-400 text-sm font-medium">আপনার প্রোডাকশন পোর্টালে স্বাগতম</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] relative overflow-hidden">
          {/* Top Gradient Bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"></div>
          
          <form onSubmit={handleSubmit} className="p-10 md:p-12">
            {error && (
              <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <div className="space-y-8">
              {/* Email Input */}
              <div className="relative group">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1 transition-colors group-focus-within:text-indigo-500">
                  ইমেইল অ্যাড্রেস
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl opacity-40 group-focus-within:opacity-100 transition-opacity">📧</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-300"
                    placeholder="আপনার ইমেইল দিন"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="relative group">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1 transition-colors group-focus-within:text-indigo-500">
                  পাসওয়ার্ড
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl opacity-40 group-focus-within:opacity-100 transition-opacity">🔑</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-16 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-[2rem] shadow-[0_15px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] transition-all transform active:scale-[0.98] mt-4 tracking-tight disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>চেকিং...</span>
                  </>
                ) : (
                  'লগইন করুন'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            NexusConnect Cloud Security
          </p>
          <button className="text-indigo-400 text-xs font-bold hover:text-indigo-300 hover:underline underline-offset-8 decoration-indigo-400/30 transition-all">
            পাসওয়ার্ড ভুলে গেছেন?
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;