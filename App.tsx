import React, { useState, useEffect, useMemo } from 'react';
import { AuthState, User, Package, BillingRecord } from './types.ts';
import { INITIAL_USERS, PACKAGES, MOCK_BILLING } from './constants.tsx';
import Login from './components/Login.tsx';
import CustomerDashboard from './components/CustomerDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import Navbar from './components/Navbar.tsx';

const App: React.FC = () => {
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
    if (auth.user?.id === updatedUser.id) {
      setAuth(prev => ({ ...prev, user: updatedUser }));
    }
  };

  const addUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setBills(prev => prev.filter(b => b.userId !== id));
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

    const user = users.find(u => u.id === record.userId);
    if (user && record.status === 'paid' && record.type !== 'miscellaneous') {
      const currentExpiry = new Date(user.expiryDate);
      const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
      updateUser({
        ...user,
        status: 'active',
        expiryDate: newExpiry.toISOString().split('T')[0]
      });
    }
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const generateMonthlyBills = (month: string, targetUserIds?: string[]): number => {
    const customers = users.filter(u => u.role === 'customer');
    const newBills: BillingRecord[] = [];
    
    customers.forEach(user => {
      if (targetUserIds && !targetUserIds.includes(user.id)) return;

      const alreadyHasBill = bills.some(b => b.userId === user.id && b.billingMonth === month && b.type === 'package');
      if (!alreadyHasBill) {
        const pkg = packages.find(p => p.id === user.packageId);
        newBills.push({
          id: 'b' + Date.now() + Math.random().toString(36).substr(2, 9),
          userId: user.id,
          amount: pkg?.price || 0,
          date: '',
          billingMonth: month,
          status: 'pending',
          method: 'None',
          type: 'package',
          description: 'Monthly Internet Subscription'
        });
      }
    });

    if (newBills.length > 0) {
      setBills(prev => [...newBills, ...prev]);
      return newBills.length;
    }
    return 0;
  };

  const handleExportData = () => {
    const data = { users, bills, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.users && data.bills) {
          setUsers(data.users);
          setBills(data.bills);
          alert('Data restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error reading backup file.');
      }
    };
    reader.readAsText(file);
  };

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
            onDeleteBill={deleteBill}
            onGenerateMonthlyBills={generateMonthlyBills}
            currentUser={auth.user}
            onExportData={handleExportData}
            onImportData={handleImportData}
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