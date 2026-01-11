import React, { useState, useEffect } from 'react';
import { AuthState, User, Package, BillingRecord } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import Auth from './components/Login'; 
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

// Mapping from DB columns to UI types
const mapProfileToUser = (data: any, authEmail?: string): User => {
  // Hardcoded Admin Access for the requested email
  let userRole = (data.Role?.toLowerCase() as any) || 'customer';
  if (authEmail === 'rkkaocher@gmail.com') {
    userRole = 'admin';
  }

  return {
    id: data.id, // UUID from Auth
    username: data.User_id || '', // String ID like 'mi@mazedul'
    fullName: data.Name || '',    
    email: authEmail || '',      // From Auth session, not DB column
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
  // Note: No email column in user's Customers table
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
  const [isConfigured] = useState(isSupabaseConfigured());
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        }
      } catch (err: any) {
        console.error("Auth init error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email);
      } else {
        setAuth({ user: null, isAuthenticated: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (error.message.includes('Customers')) setTableMissing(true);
        throw error;
      }
      
      if (data) {
        setAuth({ user: mapProfileToUser(data, email), isAuthenticated: true });
        setTableMissing(false);
      } else {
        // If profile doesn't exist yet but user is authenticated (e.g., first sign up)
        // We still set auth but with minimal info, handle role check here too
        const minimalUser: User = {
          id: userId,
          username: email?.split('@')[0] || '',
          fullName: 'New User',
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
      console.error("Profile fetch error:", err.message);
    }
  };

  const fetchData = async () => {
    if (!auth.isAuthenticated || !isConfigured) return;
    try {
      // 1. Fetch Packages
      const { data: pkgData, error: pkgError } = await supabase.from('Packages').select('*');
      if (pkgError) {
        if (pkgError.message.includes('Packages')) setTableMissing(true);
      } else if (pkgData) {
        setPackages(pkgData.map(p => ({
          id: p.Package_name, 
          name: p.Package_name || '',
          speed: parseInt(p.Speed_Mbps) || 0,
          price: p.Price || 0,
          validityDays: parseInt(p.Validity) || 30,
          dataLimitGb: (p.Data_Limit && p.Data_Limit.toLowerCase().includes('unlimited')) ? 0 : (parseInt(p.Data_Limit) || 0)
        })));
      }

      // 2. Fetch Bills (Payments) linked via User_id string
      if (auth.user?.role === 'admin') {
        const { data: userData } = await supabase.from('Customers').select('*');
        const { data: billData } = await supabase.from('Payments').select('*').order('created_at', { ascending: false });
        
        if (userData) setUsers(userData.map(u => mapProfileToUser(u)));
        if (billData) setBills(billData.map(b => ({
          id: b.id,
          userId: b.User_id, // Link string
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
          .eq('User_id', auth.user?.username) // Matching the username string 'mi@mazedul' etc
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
      console.error("Data fetch error:", err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.isAuthenticated, auth.user?.role, auth.user?.id, auth.user?.username, isConfigured]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuth({ user: null, isAuthenticated: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black text-[10px] tracking-widest uppercase animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white">
        <div className="max-w-2xl w-full bg-[#1E293B] rounded-[2rem] p-10 border border-indigo-500/20 shadow-2xl">
          <h2 className="text-2xl font-black mb-4 text-indigo-400">টেবিল সেটআপ ভুল! ⚠️</h2>
          <p className="text-slate-400 mb-6 text-sm">Supabase-এ কলামের নামগুলো চেক করুন।</p>
          <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all">রিলোড দিন</button>
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
            onDeleteBillsByMonth={() => {}} 
            onGenerateMonthlyBills={async (month, targetIds) => {
              return 0;
            }}
            currentUser={auth.user} onExportData={() => {}} onImportData={() => {}}
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