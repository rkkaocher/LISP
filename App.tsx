import React, { useState, useEffect } from 'react';
import { AuthState, User, Package, BillingRecord } from './types';
import { getSupabaseClient, isSupabaseConfigured, initializeSupabase } from './services/supabaseClient';
import Login from './components/Login';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  
  const [setupUrl, setSetupUrl] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [setupError, setSetupError] = useState('');

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setAuth({ user: null, isAuthenticated: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setAuth({ user: data as User, isAuthenticated: true });
    }
  };

  const fetchData = async () => {
    if (!auth.isAuthenticated || !isConfigured) return;
    try {
      const { data: pkgData } = await supabase.from('packages').select('*');
      if (pkgData) setPackages(pkgData);

      if (auth.user?.role === 'admin') {
        const { data: userData } = await supabase.from('profiles').select('*');
        const { data: billData } = await supabase.from('billing_records').select('*').order('created_at', { ascending: false });
        if (userData) setUsers(userData);
        if (billData) setBills(billData);
      } else {
        const { data: billData } = await supabase
          .from('billing_records')
          .select('*')
          .eq('user_id', auth.user?.id)
          .order('created_at', { ascending: false });
        if (billData) setBills(billData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.isAuthenticated, auth.user?.role, auth.user?.id, isConfigured]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuth({ user: null, isAuthenticated: false });
  };

  const handleAddUser = async (user: User) => {
    // In a real app, you'd use a Supabase Edge Function to create auth user + profile
    // Here we assume profiles can be created directly for demo
    const { data, error } = await supabase.from('profiles').insert([user]).select().single();
    if (!error && data) {
      setUsers(prev => [...prev, data as User]);
    }
  };

  const updateUser = async (updatedUser: User) => {
    const { error } = await supabase
      .from('profiles')
      .update(updatedUser)
      .eq('id', updatedUser.id);
    
    if (!error) {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (auth.user?.id === updatedUser.id) {
        setAuth(prev => ({ ...prev, user: updatedUser }));
      }
    }
  };

  const handleGenerateBills = async (month: string, targetUserIds?: string[]) => {
    const usersToBill = targetUserIds 
      ? users.filter(u => targetUserIds.includes(u.id))
      : users.filter(u => u.role === 'customer' && u.status === 'active');

    const newBills = usersToBill.map(u => {
      const pkg = packages.find(p => p.id === u.packageId);
      return {
        user_id: u.id,
        amount: pkg?.price || 0,
        billing_month: month,
        status: 'pending',
        type: 'package',
        method: 'None'
      };
    });

    const { data, error } = await supabase.from('billing_records').insert(newBills).select();
    if (!error && data) {
      setBills(prev => [...data, ...prev]);
      return data.length;
    }
    return 0;
  };

  const handleAddBill = async (record: BillingRecord) => {
    const { data, error } = await supabase.from('billing_records').upsert(record).select().single();
    if (!error && data) {
      setBills(prev => [data, ...prev.filter(b => b.id !== data.id)]);
      
      if (record.status === 'paid' && record.type !== 'miscellaneous') {
        const user = users.find(u => u.id === record.userId) || (auth.user?.id === record.userId ? auth.user : null);
        if (user) {
          const currentExpiry = new Date(user.expiryDate);
          const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 30 * 24 * 60 * 60 * 1000);
          updateUser({
            ...user,
            status: 'active',
            expiryDate: newExpiry.toISOString().split('T')[0]
          });
        }
      }
    }
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUrl.includes('.supabase.co')) {
      setSetupError('সঠিক Supabase URL দিন।');
      return;
    }
    if (initializeSupabase(setupUrl, setupKey)) {
      setIsConfigured(true);
      setLoading(true);
    } else {
      setSetupError('সেটআপ ব্যর্থ।');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
        <div className="w-full max-w-[500px] bg-white rounded-[3rem] p-10 shadow-2xl">
          <h1 className="text-2xl font-black mb-6 text-center">সুপাবেস কানেক্ট করুন</h1>
          <form onSubmit={handleSetupSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Supabase URL</label>
              <input type="text" required value={setupUrl} onChange={e => setSetupUrl(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Anon Key</label>
              <input type="password" required value={setupKey} onChange={e => setSetupKey(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none" />
            </div>
            {setupError && <p className="text-red-500 text-xs font-bold">{setupError}</p>}
            <button className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl">কানেক্ট করুন</button>
          </form>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) return <Login />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={auth.user!} onLogout={handleLogout} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {auth.user?.role === 'admin' ? (
          <AdminDashboard 
            users={users} packages={packages} bills={bills}
            onUpdateUser={updateUser} onAddUser={handleAddUser}
            onDeleteUser={id => { supabase.from('profiles').delete().eq('id', id); setUsers(u => u.filter(x => x.id !== id)); }}
            onAddBill={handleAddBill} onDeleteBill={id => { supabase.from('billing_records').delete().eq('id', id); setBills(b => b.filter(x => x.id !== id)); }}
            onDeleteBillsByMonth={() => {}} onGenerateMonthlyBills={handleGenerateBills}
            currentUser={auth.user} onExportData={() => {}} onImportData={() => {}}
          />
        ) : (
          <CustomerDashboard user={auth.user!} packages={packages} bills={bills} />
        )}
      </main>
      <footer className="bg-white border-t py-6 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} NexusConnect. সকল স্বত্ব সংরক্ষিত।</p>
      </footer>
    </div>
  );
};

export default App;