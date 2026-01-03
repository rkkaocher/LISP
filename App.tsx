
import React, { useState, useEffect, useMemo } from 'react';
import { AuthState, User, Package, BillingRecord } from './types';
import { INITIAL_USERS, PACKAGES, MOCK_BILLING } from './constants';
import Login from './components/Login';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  // Use lazy initializers to load from localStorage on the very first render
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('isp_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch (e) {
      console.error("Failed to load users:", e);
      return INITIAL_USERS;
    }
  });

  const [bills, setBills] = useState<BillingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('isp_bills');
      return saved ? JSON.parse(saved) : MOCK_BILLING;
    } catch (e) {
      console.error("Failed to load bills:", e);
      return MOCK_BILLING;
    }
  });

  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [packages] = useState<Package[]>(PACKAGES);

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isp_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('isp_bills', JSON.stringify(bills));
  }, [bills]);

  const handleLogin = (username: string, password: string): boolean => {
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setAuth({ user: foundUser, isAuthenticated: true });
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    
    // If the updated user is the currently logged in user, update auth state
    if (auth.user?.id === updatedUser.id) {
      setAuth(prev => ({ ...prev, user: updatedUser }));
    }
  };

  const addUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addBillingRecord = (record: BillingRecord) => {
    setBills(prev => {
      const existingIndex = prev.findIndex(b => b.id === record.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = record;
        return next;
      }
      return [record, ...prev];
    });

    // If payment is successful, extend user expiry
    const user = users.find(u => u.id === record.userId);
    if (user && record.status === 'paid') {
      const currentExpiry = new Date(user.expiryDate);
      const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
      updateUser({
        ...user,
        status: 'active',
        expiryDate: newExpiry.toISOString().split('T')[0]
      });
    }
  };

  const generateMonthlyBills = (month: string) => {
    const customers = users.filter(u => u.role === 'customer');
    const newBills: BillingRecord[] = [];
    
    customers.forEach(user => {
      const alreadyHasBill = bills.some(b => b.userId === user.id && b.billingMonth === month);
      if (!alreadyHasBill) {
        const pkg = packages.find(p => p.id === user.packageId);
        newBills.push({
          id: 'b' + Date.now() + Math.random().toString(36).substr(2, 9),
          userId: user.id,
          amount: pkg?.price || 0,
          date: '',
          billingMonth: month,
          status: 'pending',
          method: 'None'
        });
      }
    });

    if (newBills.length > 0) {
      setBills(prev => [...newBills, ...prev]);
      alert(`${newBills.length} জন কাস্টমারের জন্য ${month}-এর ডিউ বিল তৈরি করা হয়েছে।`);
    } else {
      alert(`এই মাসের বিল আগেই তৈরি করা হয়েছে অথবা কোনো কাস্টমার নেই।`);
    }
  };

  // Memoize filtered bills to prevent unnecessary CustomerDashboard re-renders
  const userBills = useMemo(() => 
    bills.filter(b => b.userId === auth.user?.id),
    [bills, auth.user?.id]
  );

  if (!auth.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={auth.user!} onLogout={handleLogout} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {auth.user?.role === 'admin' ? (
          <AdminDashboard 
            users={users} 
            packages={packages} 
            bills={bills}
            onUpdateUser={updateUser}
            onAddUser={addUser}
            onDeleteUser={deleteUser}
            onAddBill={addBillingRecord}
            onGenerateMonthlyBills={generateMonthlyBills}
          />
        ) : (
          <CustomerDashboard 
            user={auth.user!} 
            packages={packages} 
            bills={userBills}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} NexusConnect Broadband Services. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
