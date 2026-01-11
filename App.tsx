import React, { useState, useEffect } from 'react';
import { AuthState, User, Package, BillingRecord } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import Auth from './components/Login'; 
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

// Admin constant for matching
const ADMIN_EMAIL = 'rkkaocher@gmail.com';

const mapProfileToUser = (data: any, authEmail?: string): User => {
  // Priority 1: Email check (Hardcoded admin)
  // Priority 2: Database role check
  let userRole: 'admin' | 'customer' = (authEmail === ADMIN_EMAIL || data.Role?.toLowerCase() === 'admin') ? 'admin' : 'customer';

  return {
    id: data.id,
    username: data.User_id || '',
    fullName: data.Name || '',    
    email: authEmail || data.Email || '',      
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

  const addLog = (msg: string) => setDiagnostics(prev => [...prev.slice(-3), msg]);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase URL or Key is missing in configuration.");
        }

        addLog('সুপাবাস কানেকশন চেক করা হচ্ছে...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          addLog('প্রোফাইল ডেটা রিট্রিভ করা হচ্ছে...');
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          addLog('লগইন করার জন্য প্রস্তুত।');
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(err.message || "সার্ভারের সাথে যোগাযোগ করা সম্ভব হচ্ছে না।");
        setLoading(false);
      }
    };

    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        await fetchUserProfile(session.user.id, session.user.email);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setAuth({ user: null, isAuthenticated: false });
        setUsers([]);
        setBills([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        // If error is related to table permissions or missing table
        throw new Error(`ডেটাবেস টেবিল এরর: ${profileError.message}`);
      }
      
      if (data) {
        setAuth({ user: mapProfileToUser(data, email), isAuthenticated: true });
        setError(null);
      } else {
        // If user exists in Auth but not in Customers table (e.g. just signed up)
        const isSystemAdmin = email === ADMIN_EMAIL;
        const defaultUser: User = {
          id: userId,
          username: email?.split('@')[0] || 'user',
          fullName: isSystemAdmin ? 'সিস্টেম অ্যাডমিন' : 'নতুন কাস্টমার',
          email: email || '',
          phone: '',
          address: '',
          role: isSystemAdmin ? 'admin' : 'customer',
          packageId: '10 Mbps',
          status: 'active',
          expiryDate: '',
          balance: 0,
          dataUsedGb: 0,
          dataLimitGb: 0
        };
        setAuth({ user: defaultUser, isAuthenticated: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!auth.isAuthenticated || !auth.user) return;
    try {
      // Get Packages (allowed for all)
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

      if (auth.user.role === 'admin') {
        // Admin gets everything
        const { data: userData } = await supabase.from('Customers').select('*');
        const { data: billData } = await supabase.from('Payments').select('*').order('created_at', { ascending: false });
        
        if (userData) setUsers(userData.map(u => mapProfileToUser(u, u.Email)));
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
        // Customer sees only their own payments (handled by RLS automatically)
        const { data: billData } = await supabase.from('Payments').select('*');
        if (billData) {
          setBills(billData.map(b => ({
            id: b.id,
            userId: b.User_id,
            amount: b.Paid_amount || 0,
            billingMonth: b.Month || 'N/A',
            status: 'paid',
            method: b.Payment_method || 'None',
            date: b.Payment_date?.split('T')[0] || b.created_at?.split('T')[0]
          })));
        }
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.isAuthenticated, auth.user?.role]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 w-full max-w-xs">
          <p className="text-white font-bold text-[10px] uppercase tracking-widest mb-4 text-center">সিস্টেম প্রসেসিং</p>
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
          <h2 className="text-xl font-black text-slate-800">অ্যাক্সেস সমস্যা</h2>
          <p className="text-slate-500 text-xs leading-relaxed">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold text-white">আবার চেষ্টা করুন</button>
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
              await supabase.from('Customers').update(profileData).eq('id', u.id);
              fetchData();
            }} 
            onAddUser={async (u) => {
              const profileData = mapUserToProfile(u);
              await supabase.from('Customers').insert(profileData);
              fetchData();
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
              await supabase.from('Payments').insert(payload);
              fetchData();
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