import React, { useState } from 'react';

interface LoginProps {
  onLogin: (u: string, p: string) => boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = onLogin(username, password);
    if (!success) {
      setError('ইউজার আইডি অথবা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/40 mb-6 rotate-3">
            N
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">NexusConnect</h1>
          <p className="text-slate-500 text-sm font-medium">আপনার হাই-স্পিড ইন্টারনেট পোর্টালে স্বাগতম</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded-2xl flex items-center gap-3">
              <span className="text-lg">⚠️</span> {error}
            </div>
          )}

          <div className="space-y-8">
            <div className="group">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">ইউজার আইডি</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">👤</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-700"
                  placeholder="আপনার কাস্টমার আইডি দিন"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">পাসওয়ার্ড</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-700"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-[2rem] shadow-xl shadow-indigo-500/30 transition-all transform active:scale-[0.98] mt-4 tracking-tight"
            >
              লগইন করুন
            </button>
          </div>
        </form>

        <p className="text-center mt-10 text-slate-600 text-[11px] font-bold uppercase tracking-widest">
          কোনো সমস্যা হচ্ছে? <br />
          <span className="text-indigo-400 cursor-pointer hover:underline underline-offset-4">আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন</span>
        </p>
      </div>
    </div>
  );
};

export default Login;