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
  onDeleteBillsByMonth: (month: string) => void;
  onGenerateMonthlyBills: (month: string, targetUserIds?: string[]) => number;
  currentUser?: User;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const UPSTREAM_PROVIDERS = [
  'Amber IT', 'Link3', 'Carnival', 'Circle Network', 'Dot Internet', 'Maya Cyber World', 'Cyclone', 'অন্যান্য'
];

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, packages, bills, onUpdateUser, onAddUser, onDeleteUser, onAddBill, onDeleteBill, onDeleteBillsByMonth, onGenerateMonthlyBills, currentUser, onExportData, onImportData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'settings'>('users');
  const [billingSubTab, setBillingSubTab] = useState<'pending' | 'history'>('pending');
  
  // Selection States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  // Modals States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingBill, setDeletingBill] = useState<BillingRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [individualBillTarget, setIndividualBillTarget] = useState<User | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [extraChargeUser, setExtraChargeUser] = useState<User | null>(null);
  const [extraChargeAmount, setExtraChargeAmount] = useState('');
  const [extraChargeDesc, setExtraChargeDesc] = useState('');

  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [adminProfile, setAdminProfile] = useState({
    username: currentUser?.username || '',
    password: currentUser?.password || '',
    fullName: currentUser?.fullName || ''
  });

  const now = new Date();
  const currentMonthNameBn = MONTHS_BN[now.getMonth()];
  const currentYear = now.getFullYear().toString();
  const currentBillingMonthStr = `${currentMonthNameBn} ${currentYear}`;

  const [billingMonth, setBillingMonth] = useState(currentMonthNameBn);
  const [billingYear, setBillingYear] = useState(currentYear);
  
  const [payingUser, setPayingUser] = useState<{user: User, bill: BillingRecord} | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [newUser, setNewUser] = useState<Partial<User>>({
    fullName: '', username: '', password: '', role: 'customer', packageId: packages[0]?.id || '', 
    status: 'active', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataLimitGb: 0, upstreamProvider: UPSTREAM_PROVIDERS[0]
  });

  const [paymentDetails, setPaymentDetails] = useState({ 
    amount: 0, 
    method: 'Cash' as BillingRecord['method']
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const stats = {
    totalUsers: users.filter(u => u.role === 'customer').length,
    totalRevenue: bills.filter(b => b.status === 'paid' && b.billingMonth === currentBillingMonthStr).reduce((acc, b) => acc + b.amount, 0),
    monthlyDues: bills.filter(b => b.status === 'pending').length
  };

  const filteredUsers = users.filter(u => 
    u.role === 'customer' && (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const allPendingBills = bills.filter(b => b.status === 'pending')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(i => i.user && (i.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())));

  const paidHistory = bills.filter(b => b.status === 'paid')
    .map(b => ({ bill: b, user: users.find(u => u.id === b.userId) }))
    .filter(i => i.user && (i.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())));

  const collectionsByMonth = useMemo(() => {
    const paidBills = bills.filter(b => b.status === 'paid');
    const history: Record<string, number> = {};
    paidBills.forEach(bill => {
      const month = bill.billingMonth;
      history[month] = (history[month] || 0) + bill.amount;
    });
    return Object.entries(history).sort((a, b) => {
        const [monthA, yearA] = a[0].split(' ');
        const [monthB, yearB] = b[0].split(' ');
        if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
        return MONTHS_BN.indexOf(monthB) - MONTHS_BN.indexOf(monthA);
    });
  }, [bills]);

  // CSV Import Logic
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim());
        if (rows.length < 2) throw new Error("ফাইলটি ফাঁকা");

        const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
        let importCount = 0;
        let skipCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim().replace(/['"]+/g, ''));
          const data: any = {};
          headers.forEach((header, index) => { data[header] = values[index]; });

          const fullName = data.name || data.fullname || data['full name'];
          const username = data.username || data['user id'] || data.userid;
          
          if (!fullName || !username) { skipCount++; continue; }
          if (users.some(u => u.username === username)) { skipCount++; continue; }

          const userToAdd: User = {
            id: 'u' + Date.now() + i + Math.floor(Math.random() * 1000),
            fullName: fullName,
            username: username,
            password: data.password || '123456',
            email: data.email || '', phone: data.phone || '', address: data.address || '',
            role: 'customer',
            packageId: packages.find(p => p.id === data.packageid || p.name.toLowerCase().includes((data.package || '').toLowerCase()))?.id || packages[0].id,
            status: 'active',
            expiryDate: data.expiry || data.expirydate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            balance: 0, dataUsedGb: 0, dataLimitGb: 0, upstreamProvider: data.provider || UPSTREAM_PROVIDERS[0]
          };
          onAddUser(userToAdd);
          importCount++;
        }
        setNotification({ message: `${importCount} জন গ্রাহক যুক্ত হয়েছে। ${skipCount > 0 ? skipCount + ' জন গ্রাহক ডুপ্লিকেট বা ভুল তথ্যের জন্য বাদ পড়েছে' : ''}`, type: 'success' });
        setShowImportModal(false);
      } catch (err) {
        setNotification({ message: "ফাইল রিড করতে সমস্যা হয়েছে। সঠিক CSV ফাইল আপলোড করুন।", type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Actions (বাকি ফাংশনগুলো একই রেখেছি — কোনো চেঞ্জ লাগেনি)
  // ... (আপনার আগের কোডের মতোই handleBulkQuickExtend থেকে handleUpdateAdminProfile পর্যন্ত)

  return (
    <div className="space-y-6 relative pb-20">
      {/* বাকি return অংশ একই — শুধু showImportModal-এর অংশটা ঠিক করেছি */}
      {/* ... অন্যান্য কোড */}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 animate-in zoom-in duration-300 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-slate-800">গুগল শীট থেকে ইমপোর্ট</h3>
            <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
              <p className="font-bold mb-2 uppercase tracking-widest">CSV ফরম্যাট গাইড:</p>
              <p>
                শীটে অবশ্যই <span className="font-bold">Name</span> এবং <span className="font-bold">Username</span> কলাম থাকতে হবে। গুগল শীট থেকে <span className="font-bold">File &gt; Download &gt; CSV</span> হিসেবে সেভ করে আপলোড করুন।
              </p>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ফাইল আপলোড করুন (.csv)</p>
              <input type="file" className="hidden" accept=".csv" onChange={handleCsvImport} />
            </label>
            <button onClick={() => setShowImportModal(false)} className="w-full mt-8 py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">বন্ধ করুন</button>
          </div>
        </div>
      )}

      {/* বাকি মোডালগুলো আগের মতোই */}
    </div>
  );
};

export default AdminDashboard;
