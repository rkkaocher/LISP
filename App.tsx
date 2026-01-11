import React, { useState, useEffect } from 'react';
import { AuthState, User, Package, BillingRecord } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import Auth from './components/Login'; 
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

const mapProfileToUser = (data: any, authEmail?: string): User => {
  let userRole = (data.Role?.toLowerCase() as any) || 'customer';
  if (authEmail === 'rkkaocher@gmail.com') {
    userRole = 'admin';
  }

  return {
    id: data.id,
    username: data.User_id || '',
    fullName: data.Name || '',    
    email: authEmail || '',      
    phone: data.Phone_number || '', 
    address: data.Address || '',   
    role: userRole, 
    packageId: data.Package || '10 Mbps', 
    status: data.status || 'active',
    expiryDate: data.Expiry_date || '', 
    balance: data.Due_amount || 0,     
    dataUsedGb: data.data_used_gb || 0,
    dataLimitGb: data.data_limit_gb || 0,
  };
};

const mapUserToProfile = (user: Partial<User>) => {
  const profile: any = {};
  if (user.id) profile.id = user.id;
  if (user.username) profile.User_id = user.username;
  if (user.fullName !== undefined) profile.Name = user.fullName;
  if (user.phone !== undefined) profile.Phone_number = user.phone;
  if (user.address !== undefined) profile.Address = user.address;
  if (user.role) profile.Role = user.role.charAt(0).toUpperCase() + user.role.slice(1); 
  if (user.packageId !== undefined) profile.Package = user.packageId;
  if (user.expiryDate !== undefined) profile.Expiry_date = user.expiryDate;
  if (user.balance !== undefined) profile.Due_amount = user.balance;
  return profile;
};

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<string[]>(['অ্যাপ্লিকেশন শুরু হচ্ছে...']);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState(isSupabaseConfigured());

  const addLog = (msg: string) => setDiagnostics(prev => [...prev.slice(-4), msg]);

  useEffect(() => {
    // 10 second timeout for diagnostics
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('সুপাবাস সার্ভার থেকে কোনো রেসপন্স পাওয়া যাচ্ছে না। আপনার প্রজেক্টের RLS পলিসি অথবা টেবিল নামগুলো সঠিক আছে কি না চেক করুন।');
      }
    }, 10000);

    const initAuth = async () => {
      try {
        addLog('সুপাবাস সেশন চেক করা হচ্ছে...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          addLog('প্রোফাইল তথ্য সংগ্রহ করা হচ্ছে...');
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          addLog('লগইন করার জন্য প্রস্তুত।');
        }
      } catch (err: any) {
        console.error("Auth init error:", err.message);
        setError(`কানেকশন এরর: ${err.message}`);
      } finally {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    if (isConfigured) {
      initAuth();
    } else {
      setLoading(false);
      setError('সুপাবাস এপিআই কী কনফিগার করা হয়নি।');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email);
      } else {
        setAuth({ user: null, isAuthenticated: false });
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [isConfigured]);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        // This is where most common "loading" issues happen (e.g. table not found or RLS error)
        throw new Error(`ডেটাবেস টেবিল এক্সেস এরর: ${profileError.message}`);
      }
      
      if (data) {
        setAuth({ user: mapProfileToUser(data, email), isAuthenticated: true });
        setError(null);
      } else {
        const minimalUser: User = {
          id: userId,
          username: email?.split('@')[0] || '',
          fullName: 'নতুন কাস্টমার',
          email: email || '',
          phone: '',
          address: '',
          role: email === 'rkkaocher@gmail.com' ? 'admin' : 'customer',
          packageId: '10 Mbps',
          status: 'active',
          expiryDate: '',
          balance: 0,
          dataUsedGb: 0,
          dataLimitGb: 0
        };
        setAuth({ user: minimalUser, isAuthenticated: true });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchData = async () => {
    if (!auth.isAuthenticated) return;
    try {
      const { data: pkgData } = await supabase.from('Packages').select('*');
      if (pkgData) {
        setPackages(pkgData.map(p => ({
          id: p.Package_name, 
          name: p.Package_name || '',
          speed: parseInt(p.Speed_Mbps) || 0,
          price: p.Price || 0,
          validityDays: parseInt(p.Validity) || 30,
          dataLimitGb: (p.Data_Limit && p.Data_Limit.toLowerCase().includes('unlimited')) ? 0 : (parseInt(p.Data_Limit) || 0)
        })));
      }

      if (auth.user?.role === 'admin') {
        const { data: userData } = await supabase.from('Customers').select('*');
        const { data: billData } = await supabase.from('Payments').select('*').order('created_at', { ascending: false });
        
        if (userData) setUsers(userData.map(u => mapProfileToUser(u)));
        if (billData) setBills(billData.map(b => ({
          id: b.id,
          userId: b.User_id,
          amount: b.Paid_amount || 0,
          billingMonth: b.Month || 'N/A',
          status: 'paid',
          method: b.Payment_method || 'None',
          date: b.Payment_date?.split('T')[0] || b.created_at?.split('T')[0]
        })));
      } else {
        const { data: billData } = await supabase
          .from('Payments')
          .select('*')
          .eq('User_id', auth.user?.username)
          .order('created_at', { ascending: false });

        if (billData) setBills(billData.map(b => ({
          id: b.id,
          userId: b.User_id,
          amount: b.Paid_amount || 0,
          billingMonth: b.Month || 'N/A',
          status: 'paid',
          method: b.Payment_method || 'None',
          date: b.Payment_date?.split('T')[0] || b.created_at?.split('T')[0]
        })));
      }
    } catch (err: any) {
      console.error("Data loading error:", err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.isAuthenticated, auth.user?.role, auth.user?.id, auth.user?.username]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuth({ user: null, isAuthenticated: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 w-full max-w-xs">
          <p className="text-white font-bold text-[10px] uppercase tracking-widest mb-4 text-center">সিস্টেম ডায়াগনস্টিকস</p>
          <div className="space-y-2">
            {diagnostics.map((log, i) => (
              <p key={i} className="text-[10px] text-slate-400 font-medium">
                <span className="text-indigo-500 mr-2">></span> {log}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl">⚠️</div>
          <h2 className="text-xl font-black text-slate-800">কানেকশন সমস্যা!</h2>
          <p className="text-slate-500 text-xs leading-relaxed">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold text-white">রিলোড দিন</button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) return <Auth />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={auth.user!} onLogout={handleLogout} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {auth.user?.role === 'admin' ? (
          <AdminDashboard 
            users={users} packages={packages} bills={bills}
            onUpdateUser={async (u) => {
              const profileData = mapUserToProfile(u);
              const { error } = await supabase.from('Customers').update(profileData).eq('id', u.id);
              if (!error) setUsers(prev => prev.map(x => x.id === u.id ? u : x));
            }} 
            onAddUser={async (u) => {
              const profileData = mapUserToProfile(u);
              const { data, error } = await supabase.from('Customers').insert(profileData).select().single();
              if (!error && data) setUsers(prev => [...prev, mapProfileToUser(data)]);
            }}
            onDeleteUser={async (id) => {
              await supabase.from('Customers').delete().eq('id', id);
              setUsers(u => u.filter(x => x.id !== id));
            }}
            onAddBill={async (b) => {
              const payload = {
                User_id: b.userId,
                Paid_amount: b.amount,
                Month: b.billingMonth.substring(0, 3),
                Payment_method: b.method,
                Payment_date: new Date().toISOString()
              };
              const { data, error } = await supabase.from('Payments').insert(payload).select().single();
              if (!error && data) fetchData();
            }}
            onDeleteBill={async (id) => {
              await supabase.from('Payments').delete().eq('id', id);
              setBills(b => b.filter(x => x.id !== id));
            }}
            onGenerateMonthlyBills={async (month, targetIds) => 0}
          />
        ) : (
          <CustomerDashboard user={auth.user!} packages={packages} bills={bills} />
        )}
      </main>
      <footer className="bg-white border-t py-6 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        <p>&copy; {new Date().getFullYear()} NexusConnect Broadband. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default App;