import React, { useState, useEffect } from 'react';
import { AuthState, User, Package, BillingRecord } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import Auth from './components/Login'; 
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

// Consistent Admin Email Check
const ADMIN_EMAIL = 'rkkaocher@gmail.com';

const mapProfileToUser = (data: any, authEmail?: string): User => {
  // Use email-based admin role as a priority to match RLS 'authenticated' admin status
  let userRole: 'admin' | 'customer' = (authEmail === ADMIN_EMAIL) ? 'admin' : 'customer';

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
  const [diagnostics, setDiagnostics] = useState<string[]>(['সিস্টেম চেক করা হচ্ছে...']);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState(isSupabaseConfigured());

  const addLog = (msg: string) => setDiagnostics(prev => [...prev.slice(-3), msg]);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('সার্ভার থেকে রেসপন্স পাওয়া যাচ্ছে না। দয়া করে আপনার ইন্টারনেট এবং সুপাবাস সেটিংস চেক করুন।');
      }
    }, 10000);

    const initAuth = async () => {
      try {
        addLog('সেশন চেক করা হচ্ছে...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          addLog('প্রোফাইল লোড করা হচ্ছে...');
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          addLog('লগইন পেজে পাঠানো হচ্ছে...');
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
        setUsers([]);
        setBills([]);
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

      if (profileError) throw new Error(`ডেটাবেস এক্সেস এরর: ${profileError.message}`);
      
      if (data) {
        setAuth({ user: mapProfileToUser(data, email), isAuthenticated: true });
        setError(null);
      } else {
        // Fallback for new users or admin whose profile isn't in Customers table yet
        const minimalUser: User = {
          id: userId,
          username: email?.split('@')[0] || 'new_user',
          fullName: (email === ADMIN_EMAIL) ? 'সিস্টেম অ্যাডমিন' : 'নতুন কাস্টমার',
          email: email || '',
          phone: '',
          address: '',
          role: (email === ADMIN_EMAIL) ? 'admin' : 'customer',
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
      // Packages are visible to all (public policy)
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
        // Admin RLS policy: ALL command permitted
        const { data: userData } = await supabase.from('Customers').select('*');
        const { data: billData } = await supabase.from('Payments').select('*').order('created_at', { ascending: false });
        
        if (userData) setUsers(userData.map(u => mapProfileToUser(u, u.Email))); // Ensure email is passed if available
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
        // Customer RLS policy: SELECT command restricted to own data
        // No explicit filter needed as Supabase RLS handles it, but we can add .eq for clarity
        const { data: billData } = await supabase
          .from('Payments')
          .select('*')
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
  }, [auth.isAuthenticated, auth.user?.role, auth.user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuth({ user: null, isAuthenticated: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 w-full max-w-xs">
          <p className="text-white font-bold text-[10px] uppercase tracking-widest mb-4 text-center">সার্ভার কানেক্ট হচ্ছে...</p>
          <div className="space-y-2">
            {diagnostics.map((log, i) => (
              <p key={i} className="text-[10px] text-slate-400 font-medium">
                <span className="text-indigo-500 mr-2">&gt;</span> {log}
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
          <h2 className="text-xl font-black text-slate-800">ডেটাবেস এরর!</h2>
          <p className="text-slate-500 text-xs leading-relaxed">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold text-white shadow-lg">রিলোড দিন</button>
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
              if (!error) fetchData();
            }} 
            onAddUser={async (u) => {
              const profileData = mapUserToProfile(u);
              const { error } = await supabase.from('Customers').insert(profileData);
              if (!error) fetchData();
            }}
            onDeleteUser={async (id) => {
              await supabase.from('Customers').delete().eq('id', id);
              fetchData();
            }}
            onAddBill={async (b) => {
              const payload = {
                User_id: b.userId,
                Paid_amount: b.amount,
                Month: b.billingMonth.substring(0, 3),
                Payment_method: b.method,
                Payment_date: new Date().toISOString()
              };
              const { error } = await supabase.from('Payments').insert(payload);
              if (!error) fetchData();
            }}
            onDeleteBill={async (id) => {
              await supabase.from('Payments').delete().eq('id', id);
              fetchData();
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