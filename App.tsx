
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, User, Package, BillingRecord, Ticket } from './types.ts';
import { supabase, isSupabaseConfigured } from './services/supabaseClient.ts';
import Auth from './components/Login.tsx'; 
import CustomerDashboard from './components/CustomerDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import Navbar from './components/Navbar.tsx';

const ADMIN_EMAIL = 'rkkaocher@gmail.com';

const mapProfileToUser = (data: any, authEmail?: string): User => {
  const dbRole = (data?.Role || '').toString().toLowerCase().trim();
  const isAdmin = (authEmail === ADMIN_EMAIL || dbRole === 'admin');
  
  return {
    id: data.id,
    username: data.User_id || authEmail?.split('@')[0] || '',
    fullName: data.Name || 'Nexus User',    
    email: authEmail || data.Email || '',      
    phone: data.Phone_number || '', 
    address: data.Address || '',   
    role: isAdmin ? 'admin' : 'customer', 
    packageId: data.Package || '10 Mbps', 
    status: (data.status || 'active').toLowerCase() as any,
    expiryDate: data.Expiry_date || new Date().toISOString().split('T')[0], 
    balance: data.Due_amount || 0,     
    dataUsedGb: data.data_used_gb || 0,
    dataLimitGb: data.data_limit_gb || 0,
    zone: data.Zone || 'General',
  };
};

const mapUserToProfile = (user: User) => {
  return {
    id: user.id,
    User_id: user.username,
    Name: user.fullName,
    Email: user.email,
    Phone_number: user.phone,
    Address: user.address,
    Role: user.role === 'admin' ? 'Admin' : 'Customer',
    Package: user.packageId,
    status: user.status,
    Expiry_date: user.expiryDate,
    Due_amount: user.balance,
    Zone: user.zone,
  };
};

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const fetchUserProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (data) {
        setAuth({ user: mapProfileToUser(data, email), isAuthenticated: true });
      } else {
        setAuth({ 
          user: {
            id: userId,
            username: email?.split('@')[0] || 'user',
            fullName: email === ADMIN_EMAIL ? 'অ্যাডমিন' : 'নতুন কাস্টমার',
            email: email || '',
            phone: '',
            address: '',
            role: email === ADMIN_EMAIL ? 'admin' : 'customer',
            packageId: '10 Mbps',
            status: 'active',
            expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            balance: 0,
            dataUsedGb: 0,
            dataLimitGb: 0,
            zone: 'General'
          }, 
          isAuthenticated: true 
        });
      }
    } catch (err: any) {
      console.error("Profile Fetch Error:", err);
      setError("প্রোফাইল তথ্য লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeApp = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) throw new Error("সুপাবাস কানেক্ট করা যায়নি!");
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email);
      } else {
        setAuth({ user: null, isAuthenticated: false });
        setLoading(false);
      }
    } catch (err: any) {
      setError("সার্ভারের সাথে কানেক্ট করা সম্ভব হচ্ছে না।");
      setLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        await fetchUserProfile(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setAuth({ user: null, isAuthenticated: false });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [initializeApp, fetchUserProfile]);

  const fetchData = async () => {
    if (!auth.isAuthenticated || !auth.user) return;
    try {
      const { data: pkgData } = await supabase.from('Packages').select('*');
      if (pkgData) {
        setPackages(pkgData.map(p => ({
          id: p.Package_name, 
          name: p.Package_name,
          speed: parseInt(p.Speed_Mbps) || 0,
          price: p.Price || 0,
          validityDays: 30,
          dataLimitGb: 0
        })));
      }

      const today = new Date().toISOString().split('T')[0];

      if (auth.user.role === 'admin') {
        const { data: userData } = await supabase.from('Customers').select('*');
        const { data: billData } = await supabase.from('Payments').select('*');
        
        if (userData) {
          const mappedUsers = userData.map(u => mapProfileToUser(u, u.Email));
          const updatedUsers = await Promise.all(mappedUsers.map(async (user) => {
            if (user.status === 'active' && user.expiryDate && user.expiryDate < today) {
              await supabase.from('Customers').update({ status: 'expired' }).eq('id', user.id);
              return { ...user, status: 'expired' as any };
            }
            return user;
          }));
          setUsers(updatedUsers);
        }

        if (billData) setBills(billData.map(b => ({
          id: b.id, userId: b.User_id, amount: b.Paid_amount || 0,
          billingMonth: b.Month || 'N/A', status: 'paid',
          method: b.Payment_method || 'None', date: b.Payment_date?.split('T')[0] || ''
        })));
      } else {
        if (auth.user.status === 'active' && auth.user.expiryDate && auth.user.expiryDate < today) {
           await supabase.from('Customers').update({ status: 'expired' }).eq('id', auth.user.id);
           setAuth(prev => prev.user ? { ...prev, user: { ...prev.user, status: 'expired' as any } } : prev);
        }

        const { data: billData } = await supabase.from('Payments').select('*').eq('User_id', auth.user.username);
        if (billData) setBills(billData.map(b => ({
          id: b.id, userId: b.User_id, amount: b.Paid_amount || 0,
          billingMonth: b.Month || 'N/A', status: 'paid',
          method: b.Payment_method || 'None', date: b.Payment_date?.split('T')[0] || ''
        })));
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.isAuthenticated, auth.user?.role]);

  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
      <p className="text-white font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Connecting to NexusConnect...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md animate-in zoom-in duration-300">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">⚠️</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">{error}</h2>
        <p className="text-slate-500 text-xs mb-8 font-medium">আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।</p>
        <button onClick={initializeApp} className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all">Retry Now</button>
      </div>
    </div>
  );

  if (!auth.isAuthenticated || !auth.user) return <Auth />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {auth.user.role !== 'admin' && (
        <Navbar 
          user={auth.user} 
          isDarkMode={isDarkMode} 
          onToggleDarkMode={toggleDarkMode} 
          onLogout={() => supabase.auth.signOut()} 
        />
      )}
      
      <main className={`flex-grow container mx-auto px-4 ${auth.user.role === 'admin' ? 'py-0' : 'py-8'}`}>
        {auth.user.role === 'admin' ? (
          <AdminDashboard 
            users={users} 
            packages={packages} 
            bills={bills}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            onLogout={() => supabase.auth.signOut()}
            onUpdateUser={async (u) => { 
              const { error } = await supabase.from('Customers').update(mapUserToProfile(u)).eq('id', u.id); 
              if (error) throw error;
              await fetchData(); 
            }} 
            onAddUser={async (u) => { 
              const { error } = await supabase.from('Customers').insert(mapUserToProfile(u)); 
              if (error) throw error;
              await fetchData(); 
            }}
            onDeleteUser={async (id) => { 
              await supabase.from('Customers').delete().eq('id', id); 
              await fetchData(); 
            }}
            onAddBill={async (b) => {
              await supabase.from('Payments').insert({ User_id: b.userId, Paid_amount: b.amount, Month: b.billingMonth, Payment_method: b.method, Payment_date: new Date().toISOString() });
              await fetchData();
            }}
            onDeleteBill={async (id) => { await supabase.from('Payments').delete().eq('id', id); await fetchData(); }}
            onGenerateMonthlyBills={async () => 0}
          />
        ) : (
          <CustomerDashboard user={auth.user} packages={packages} bills={bills} />
        )}
      </main>
      <footer className="bg-white dark:bg-slate-900 dark:border-slate-800 border-t py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
        NexusConnect High Performance Connectivity • {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
