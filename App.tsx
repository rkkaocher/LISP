
import React, { useState, useEffect } from 'react';
import { AuthState, User, Package, BillingRecord, Ticket } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import Auth from './components/Login'; 
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

const ADMIN_EMAIL = 'rkkaocher@gmail.com';

const mapProfileToUser = (data: any, authEmail?: string): User => {
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<string[]>(['সিস্টেম স্টার্ট হচ্ছে...']);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => setDiagnostics(prev => [...prev, msg]);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!isSupabaseConfigured()) throw new Error("সুপাবাস কনফিগারেশন মিসিং!");
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    initialize();

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
  }, []);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const { data, error: profileError } = await supabase.from('Customers').select('*').eq('id', userId).maybeSingle();
      if (profileError) throw profileError;
      
      if (data) {
        setAuth({ user: mapProfileToUser(data, email), isAuthenticated: true });
      } else {
        setAuth({ 
          user: {
            id: userId,
            username: email?.split('@')[0] || 'user',
            fullName: email === ADMIN_EMAIL ? 'অ্যাডমিন' : 'কাস্টমার',
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      if (auth.user.role === 'admin') {
        const { data: userData } = await supabase.from('Customers').select('*');
        const { data: billData } = await supabase.from('Payments').select('*');
        // Simulated Tickets for Admin
        setTickets([
          { id: '1', userId: 'demo', userName: 'Rahim Khan', category: 'Speed Issue', description: 'Low download speed in Dhap area', status: 'open', priority: 'high', createdAt: new Date().toISOString(), zone: 'Dhap' }
        ]);

        if (userData) setUsers(userData.map(u => mapProfileToUser(u, u.Email)));
        if (billData) setBills(billData.map(b => ({
          id: b.id, userId: b.User_id, amount: b.Paid_amount || 0,
          billingMonth: b.Month || 'N/A', status: 'paid',
          method: b.Payment_method || 'None', date: b.Payment_date?.split('T')[0] || ''
        })));
      } else {
        const { data: billData } = await supabase.from('Payments').select('*');
        if (billData) setBills(billData.map(b => ({
          id: b.id, userId: b.User_id, amount: b.Paid_amount || 0,
          billingMonth: b.Month || 'N/A', status: 'paid',
          method: b.Payment_method || 'None', date: b.Payment_date?.split('T')[0] || ''
        })));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.isAuthenticated, auth.user?.role]);

  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
      <p className="text-white font-black text-xs uppercase tracking-[0.3em]">NexusConnect Loading...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md">
        <h2 className="text-2xl font-black text-slate-800 mb-4">Error Detected</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">Could not establish connection to the server.</p>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold">Retry</button>
      </div>
    </div>
  );

  if (!auth.isAuthenticated) return <Auth />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={auth.user!} onLogout={() => supabase.auth.signOut()} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {auth.user?.role === 'admin' ? (
          <AdminDashboard 
            users={users} packages={packages} bills={bills} tickets={tickets}
            onUpdateUser={async (u) => { await supabase.from('Customers').update(mapUserToProfile(u)).eq('id', u.id); fetchData(); }} 
            onAddUser={async (u) => { await supabase.from('Customers').insert(mapUserToProfile(u)); fetchData(); }}
            onDeleteUser={async (id) => { await supabase.from('Customers').delete().eq('id', id); fetchData(); }}
            onAddBill={async (b) => {
              await supabase.from('Payments').insert({ User_id: b.userId, Paid_amount: b.amount, Month: b.billingMonth, Payment_method: b.method, Payment_date: new Date().toISOString() });
              fetchData();
            }}
            onDeleteBill={async (id) => { await supabase.from('Payments').delete().eq('id', id); fetchData(); }}
            onGenerateMonthlyBills={async () => 0}
          />
        ) : (
          <CustomerDashboard user={auth.user!} packages={packages} bills={bills} />
        )}
      </main>
      <footer className="bg-white border-t py-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        &copy; {new Date().getFullYear()} NexusConnect Broadband • High Performance Connectivity
      </footer>
    </div>
  );
};

export default App;
