
import React, { useState, useEffect, useMemo } from 'react';
import { User, Package, BillingRecord } from '../types';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  onUpdateUser: (u: User) => void;
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onAddBill: (b: BillingRecord) => void;
  onDeleteBill: (id: string) => void;
  onGenerateMonthlyBills: (month: string, targetUserIds?: string[]) => number;
  currentUser?: User;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const UPSTREAM_PROVIDERS = [
  'Amber IT', 'Link3', 'Carnival', 'Circle Network', 'Dot Internet', 'Maya Cyber World', 'Cyclone', 'Other'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, packages, bills, onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onGenerateMonthlyBills, currentUser, onExportData, onImportData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'settings'>('users');
  const [billingSubTab, setBillingSubTab] = useState<'pending' | 'history'>('pending');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingBill, setDeletingBill] = useState<BillingRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExtraDueModal, setShowExtraDueModal] = useState<User | null>(null);
  
  const now = new Date();
  const [billingMonth, setBillingMonth] = useState(MONTHS[now.getMonth()]);
  const [billingYear, setBillingYear] = useState(now.getFullYear().toString());
  const [selectedForBilling, setSelectedForBilling] = useState<string[]>([]);
  
  const [payingUser, setPayingUser] = useState<{user: User, bill: BillingRecord} | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [extraDueData, setExtraDueData] = useState({ amount: 0, description: '' });

  const [adminSettings, setAdminSettings] = useState({
    fullName: currentUser?.fullName || '',
    username: currentUser?.username || '',
    password: currentUser?.password || ''
  });

  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: '', role: 'customer', packageId: packages[0].id, 
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataLimitGb: packages[0].dataLimitGb, upstreamProvider: UPSTREAM_PROVIDERS[0]
  });

  const [paymentDetails, setPaymentDetails] = useState({ 
    amount: 0, 
    method: 'Cash' as BillingRecord['method']
  });

  const currentMonthDisplay = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0),
    monthlyDues: bills.filter(b => b.status === 'pending').length,
    monthlyRevenue: bills.filter(b => b.billingMonth === currentMonthDisplay && b.status === 'paid').reduce((acc, b) => acc + b.amount, 0)
  };

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const targetMonthStr = `${billingMonth} ${billingYear}`;
  const eligibleUsersForBilling = useMemo(() => {
    return users.filter(u => 
      u.role === 'customer' && 
      !bills.some(b => b.userId === u.id && b.billingMonth === targetMonthStr && b.type === 'package')
    );
  }, [users, bills, targetMonthStr]);

  useEffect(() => {
    setSelectedForBilling(eligibleUsersForBilling.map(u => u.id));
  }, [targetMonthStr, eligibleUsersForBilling.length]);

  const handleQuickExtend = (user: User) => {
    const currentExpiry = new Date(user.expiryDate);
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updatedUser: User = {
      ...user,
      status: 'active',
      expiryDate: newExpiry.toISOString().split('T')[0]
    };
    onUpdateUser(updatedUser);
    setNotification({ message: `Validity extended for ${user.fullName} until ${updatedUser.expiryDate}`, type: 'success' });
  };

  const handleOpenGenerateModal = () => {
    setShowGenerateModal(true);
  };

  const handleToggleUserSelection = (id: string) => {
    setSelectedForBilling(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSelectAllBilling = () => {
    if (selectedForBilling.length === eligibleUsersForBilling.length) {
      setSelectedForBilling([]);
    } else {
      setSelectedForBilling(eligibleUsersForBilling.map(u => u.id));
    }
  };

  const handleConfirmGenerateBills = () => {
    if (selectedForBilling.length === 0) {
      alert("Please select at least one customer.");
      return;
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      const count = onGenerateMonthlyBills(targetMonthStr, selectedForBilling);
      setIsGenerating(false);
      setShowGenerateModal(false);
      if (count > 0) {
        setNotification({ message: `Successfully generated ${count} bills for ${targetMonthStr}`, type: 'success' });
        setActiveTab('billing');
        setBillingSubTab('pending');
      } else {
        setNotification({ message: `No new bills generated.`, type: 'error' });
      }
    }, 800);
  };

  const handleAddExtraDue = () => {
    if (!showExtraDueModal || !extraDueData.amount || !extraDueData.description) {
      setNotification({ message: "Please enter amount and description.", type: 'error' });
      return;
    }

    const newRecord: BillingRecord = {
      id: 'misc' + Date.now(),
      userId: showExtraDueModal.id,
      amount: extraDueData.amount,
      date: '',
      billingMonth: currentMonthDisplay,
      status: 'pending',
      method: 'None',
      description: extraDueData.description,
      type: 'miscellaneous'
    };

    onAddBill(newRecord);
    setShowExtraDueModal(null);
    setExtraDueData({ amount: 0, description: '' });
    setNotification({ message: "Extra charge added successfully!", type: 'success' });
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDeleteUser = () => {
    if (deletingUser) {
      onDeleteUser(deletingUser.id);
      setNotification({ message: `Customer ${deletingUser.fullName} deleted.`, type: 'success' });
      setDeletingUser(null);
    }
  };

  const confirmDeleteBill = () => {
    if (deletingBill) {
      onDeleteBill(deletingBill.id);
      setNotification({ message: "Bill deleted successfully.", type: 'success' });
      setDeletingBill(null);
    }
  };

  const handleCollectPayment = () => {
    if (!payingUser) return;
    const updatedBill: BillingRecord = {
      ...payingUser.bill,
      amount: paymentDetails.amount,
      method: paymentDetails.method,
      date: new Date().toISOString().split('T')[0],
      status: 'paid'
    };
    onAddBill(updatedBill);
    setPayingUser(null);
    setNotification({ message: "Payment recorded!", type: 'success' });
  };

  const handleCreateUser = () => {
    if (!newUser.fullName || !newUser.username || !newUser.password) {
      setNotification({ message: "Please fill in all required fields.", type: 'error' });
      return;
    }

    const userToAdd: User = {
      id: 'u' + Date.now() + Math.random().toString(36).substr(2, 5),
      fullName: newUser.fullName!,
      username: newUser.username!,
      password: newUser.password!,
      email: '',
      phone: '',
      address: '',
      role: 'customer',
      packageId: newUser.packageId || packages[0].id,
      status: 'active',
      expiryDate: newUser.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      balance: 0,
      dataUsedGb: 0,
      dataLimitGb: newUser.dataLimitGb || 0,
      upstreamProvider: newUser.upstreamProvider || UPSTREAM_PROVIDERS[0]
    };

    onAddUser(userToAdd);
    setShowAddModal(false);
    setNewUser({
      fullName: '', username: '', password: '', role: 'customer', packageId: packages[0].id, 
      status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dataLimitGb: packages[0].dataLimitGb, upstreamProvider: UPSTREAM_PROVIDERS[0]
    });
    setNotification({ message: "New customer added successfully!", type: 'success' });
  };

  const openPaymentModal = (user: User, bill: BillingRecord) => {
    setPaymentDetails({ amount: bill.amount, method: 'Cash' });
    setPayingUser({ user, bill });
  };

  const handleUpdateAdminAccount = () => {
    if (!currentUser) return;
    onUpdateUser({ ...currentUser, ...adminSettings });
    setNotification({ message: "Admin account updated!", type: 'success' });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
    }
  };

  const allPendingBills = bills
    .filter(b => b.status === 'pending')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(item => item.user && (
      item.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ));

  const paidHistory = bills
    .filter(b => b.status === 'paid')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(item => item.user && (
      item.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ));

  return (
    <div className="space-y-6 relative">
      {notification && (
        <div className={`fixed top-20 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 flex items-center gap-3 border ${notification.type === 'success' ? 'bg-white border-green-100 text-green-700' : 'bg-white border-red-100 text-red-700'}`}>
          <span className="text-xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Customers</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.totalUsers}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Monthly Collection</p>
          <h3 className="text-2xl font-bold text-indigo-600">৳{stats.monthlyRevenue}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Pending Bills</p>
          <h3 className="text-2xl font-bold text-red-600">{stats.monthlyDues} Total</h3>
        </div>
        <button 
          onClick={handleOpenGenerateModal}
          className={`bg-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-100 flex flex-col justify-center items-center group active:scale-95 transition-all`}
        >
          <span className="font-bold text-sm">➕ Generate Bills</span>
          <span className="text-[9px] opacity-70 mt-1">Setup Month & Customers</span>
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit overflow-hidden">
        <button onClick={() => setActiveTab('users')} className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>Customer List</button>
        <button onClick={() => setActiveTab('billing')} className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>Dues & Payments</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>Settings</button>
      </div>

      {activeTab === 'billing' && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setBillingSubTab('pending')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${billingSubTab === 'pending' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>Pending Dues</button>
          <button onClick={() => setBillingSubTab('history')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${billingSubTab === 'history' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>Payment History</button>
        </div>
      )}

      {activeTab !== 'settings' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {activeTab === 'users' ? 'All Customers' : (billingSubTab === 'pending' ? 'Unpaid Invoices' : 'Successful Payments')}
            </h2>
            <div className="flex gap-2">
              <input type="text" placeholder="Search..." className="px-4 py-2 bg-slate-50 border rounded-xl text-xs w-48 focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {activeTab === 'users' && (
                <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Add Customer +</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'users' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Customer & Provider</th>
                    <th className="px-6 py-4">Package</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                           <p className="font-bold text-slate-800">{user.fullName}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 ml-4">ID: {user.username} | 🌐 {user.upstreamProvider}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-indigo-600">{packages.find(p => p.id === user.packageId)?.name}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{user.expiryDate}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleQuickExtend(user)} className="bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase px-2 py-1 rounded-md hover:bg-indigo-100">+30 Days</button>
                          <button onClick={() => setShowExtraDueModal(user)} className="text-amber-600 font-bold text-[9px] uppercase border border-amber-100 px-2 py-1 rounded-md hover:bg-amber-50">Charge</button>
                          <button onClick={() => setEditingUser(user)} className="text-indigo-600 font-bold text-xs">Edit</button>
                          <button onClick={() => handleDeleteClick(user)} className="text-red-500 font-bold text-xs">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4 text-center">Month</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {billingSubTab === 'pending' ? (
                    allPendingBills.map(({ bill, user }) => (
                      <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{user?.fullName}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${bill.type === 'miscellaneous' ? 'text-amber-500' : 'text-red-400'}`}>
                            {bill.type === 'miscellaneous' ? 'Other Due' : 'Unpaid Bill'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-xs text-slate-500">{bill.description || 'Monthly Internet Bill'}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">{bill.billingMonth}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">৳{bill.amount}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setDeletingBill(bill)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Bill">
                              🗑️
                            </button>
                            <button onClick={() => user && openPaymentModal(user, bill)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Collect Bill</button>
                           </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    paidHistory.map(({ bill, user }) => (
                      <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{user?.fullName}</p>
                          <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Paid via {bill.method}</p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-xs text-slate-500">{bill.description || 'Monthly Internet Bill'}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">{bill.date || bill.billingMonth}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">৳{bill.amount}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[9px] text-slate-400 font-bold italic">Transaction Logged</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">⚙️ Admin Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Full Name</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={adminSettings.fullName} onChange={(e) => setAdminSettings({...adminSettings, fullName: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">User ID</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={adminSettings.username} onChange={(e) => setAdminSettings({...adminSettings, username: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Password</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={adminSettings.password} onChange={(e) => setAdminSettings({...adminSettings, password: e.target.value})} />
                </div>
              </div>
              <div className="pt-4">
                <button onClick={handleUpdateAdminAccount} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg active:scale-95 transition-all">Save Changes</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">💾 Data Management</h2>
            <p className="text-xs text-slate-500 mb-6">Backup your data to a file or restore from a previous backup.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onExportData}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all active:scale-95"
              >
                📥 Export Backup (.json)
              </button>
              <div className="flex-1 relative">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button 
                  className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border-2 border-dashed border-indigo-200 px-6 py-4 rounded-2xl font-bold hover:bg-indigo-100 transition-all"
                >
                  📤 Restore Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bill Confirmation Modal */}
      {deletingBill && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Bill?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete this <span className="font-bold text-slate-800">৳{deletingBill.amount}</span> bill for <span className="font-bold text-slate-800">{deletingBill.billingMonth}</span>?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDeleteBill}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 active:scale-95 transition-all"
              >
                Yes, Delete Bill
              </button>
              <button 
                onClick={() => setDeletingBill(null)}
                className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Due Modal */}
      {showExtraDueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Extra Charge</h3>
              <button onClick={() => setShowExtraDueModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Adding charge for</p>
                <p className="font-bold text-indigo-600">{showExtraDueModal.fullName} ({showExtraDueModal.username})</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g., Router Purchase, Connection Fee" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={extraDueData.description}
                  onChange={(e) => setExtraDueData({...extraDueData, description: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount (৳)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={extraDueData.amount}
                  onChange={(e) => setExtraDueData({...extraDueData, amount: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowExtraDueModal(null)} className="flex-1 py-3 text-sm font-bold text-slate-400">Cancel</button>
              <button onClick={handleAddExtraDue} className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all">Add Charge</button>
            </div>
          </div>
        </div>
      )}

      {/* Selective Bill Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Generate Monthly Bills</h3>
                <p className="text-xs text-slate-500">Select month, year, and customers for bill generation.</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>
            
            <div className="p-6 border-b bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Select Month</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Select Year</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={billingYear}
                  onChange={(e) => setBillingYear(e.target.value)}
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="selectAll"
                  className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer"
                  checked={eligibleUsersForBilling.length > 0 && selectedForBilling.length === eligibleUsersForBilling.length}
                  onChange={handleSelectAllBilling}
                />
                <label htmlFor="selectAll" className="text-sm font-bold text-indigo-700 cursor-pointer">
                  {selectedForBilling.length === eligibleUsersForBilling.length ? 'Deselect All' : 'Select All Eligible'}
                </label>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm">
                {selectedForBilling.length} / {eligibleUsersForBilling.length} Selected
              </span>
            </div>

            <div className="flex-grow overflow-y-auto p-4 bg-white">
              {eligibleUsersForBilling.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eligibleUsersForBilling.map(user => {
                    const pkg = packages.find(p => p.id === user.packageId);
                    const isSelected = selectedForBilling.includes(user.id);
                    return (
                      <div 
                        key={user.id} 
                        onClick={() => handleToggleUserSelection(user.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-50 hover:border-slate-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                            {isSelected && <span className="text-white text-[10px]">✓</span>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.fullName}</p>
                            <p className="text-[10px] text-slate-400">ID: {user.username}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">৳{pkg?.price}</p>
                          <p className="text-[9px] text-indigo-500 font-medium">{pkg?.speed} Mbps</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h4 className="text-slate-800 font-bold">All Customers Up to Date</h4>
                  <p className="text-slate-500 text-xs mt-1">Everyone already has a bill for {targetMonthStr}.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Estimated Total for {targetMonthStr}</p>
                <p className="text-xl font-black text-indigo-600">
                  ৳{eligibleUsersForBilling
                    .filter(u => selectedForBilling.includes(u.id))
                    .reduce((acc, u) => acc + (packages.find(p => p.id === u.packageId)?.price || 0), 0)
                  }
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setShowGenerateModal(false)} className="flex-1 md:flex-none px-6 py-3 font-bold text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">Cancel</button>
                <button 
                  onClick={handleConfirmGenerateBills}
                  disabled={isGenerating || selectedForBilling.length === 0}
                  className={`flex-grow md:flex-none px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all ${isGenerating ? 'opacity-50' : 'hover:bg-indigo-700 active:scale-95'}`}
                >
                  {isGenerating ? 'Generating...' : `Generate ${selectedForBilling.length} Bills`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Customer?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-800">{deletingUser.fullName}</span>? This action cannot be undone and will delete all their records.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDeleteUser}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 active:scale-95 transition-all"
              >
                Yes, Delete Customer
              </button>
              <button 
                onClick={() => setDeletingUser(null)}
                className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">Edit Customer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                <input className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.fullName} onChange={(e)=>setEditingUser({...editingUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">User ID</label>
                <input className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.username} onChange={(e)=>setEditingUser({...editingUser, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                <input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.password || ''} onChange={(e)=>setEditingUser({...editingUser, password: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Provider</label>
                <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.upstreamProvider || ''} onChange={(e)=>setEditingUser({...editingUser, upstreamProvider: e.target.value})}>
                  {UPSTREAM_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Package</label>
                <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.packageId} onChange={(e)=>setEditingUser({...editingUser, packageId: e.target.value})}>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={editingUser.status} onChange={(e)=>setEditingUser({...editingUser, status: e.target.value as any})}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-2">
                  <span>📅 Internet Expiry Date</span>
                  <span className="text-[8px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-400">Change Manualy Anytime</span>
                </label>
                <input type="date" className="w-full px-4 py-3 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500" value={editingUser.expiryDate} onChange={(e)=>setEditingUser({...editingUser, expiryDate: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={()=>setEditingUser(null)} className="flex-1 py-3 text-sm font-bold text-slate-400">Cancel</button>
              <button onClick={()=>{onUpdateUser(editingUser); setEditingUser(null); setNotification({message: "Customer records updated successfully!", type: "success"})}} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100">Update Record</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">Add New Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="px-4 py-3 bg-slate-50 border rounded-xl text-sm" placeholder="Full Name" onChange={(e)=>setNewUser({...newUser, fullName: e.target.value})} />
              <input className="px-4 py-3 bg-slate-50 border rounded-xl text-sm" placeholder="User ID (Login ID)" onChange={(e)=>setNewUser({...newUser, username: e.target.value})} />
              <input className="px-4 py-3 bg-slate-50 border rounded-xl text-sm" type="password" placeholder="Password" onChange={(e)=>setNewUser({...newUser, password: e.target.value})} />
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Upstream Provider</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm" onChange={(e)=>setNewUser({...newUser, upstreamProvider: e.target.value})}>
                  {UPSTREAM_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Package</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm" onChange={(e)=>setNewUser({...newUser, packageId: e.target.value})}>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} (৳{p.price})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={()=>setShowAddModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-400">Cancel</button>
              <button onClick={handleCreateUser} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl text-sm font-bold">Add Customer</button>
            </div>
          </div>
        </div>
      )}

      {payingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-1">Collect Bill Payment</h3>
            <p className="text-sm text-slate-500 mb-6">{payingUser.user.fullName} - {payingUser.bill.billingMonth}</p>
            {payingUser.bill.description && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Description</p>
                <p className="text-sm font-medium text-slate-700">{payingUser.bill.description}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount</label>
                <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg" value={paymentDetails.amount} onChange={(e) => setPaymentDetails({...paymentDetails, amount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'bKash', 'Nagad', 'Rocket'].map(m => (
                    <button key={m} onClick={() => setPaymentDetails({...paymentDetails, method: m as any})} className={`py-3 rounded-2xl text-xs font-bold border-2 transition-all ${paymentDetails.method === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setPayingUser(null)} className="flex-1 py-3 text-xs font-bold text-slate-400">Cancel</button>
              <button onClick={handleCollectPayment} className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl text-xs font-bold">Save Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
