import React from 'react';
import { User, Package, BillingRecord } from '../types';

interface AdminDashboardProps {
  users: User[];
  packages: Package[];
  bills: BillingRecord[];
  currentUser?: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users = [], packages = [], bills = [], currentUser }) => {
  return (
    <div className="p-8 bg-white rounded-3xl">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">এডমিন ড্যাশবোর্ড — টেস্টিং মোড</h1>
      <p className="text-xl mb-6">স্বাগতম, {currentUser?.fullName || 'Admin'}!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-200">
          <p className="text-sm text-indigo-600 font-bold">মোট কাস্টমার</p>
          <p className="text-4xl font-black text-indigo-700">{users.length}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
          <p className="text-sm text-green-600 font-bold">মোট প্যাকেজ</p>
          <p className="text-4xl font-black text-green-700">{packages.length}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200">
          <p className="text-sm text-purple-600 font-bold">মোট বিল</p>
          <p className="text-4xl font-black text-purple-700">{bills.length}</p>
        </div>
      </div>

      <button 
        onClick={() => alert('বাটন কাজ করছে! এডমিন পোর্টাল ঠিক আছে 😊')} 
        className="bg-indigo-600 text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-lg hover:bg-indigo-700"
      >
        টেস্ট বাটন — ক্লিক করুন
      </button>

      <p className="mt-10 text-sm text-slate-500">
        যদি এই পেজ দেখতে পান এবং বাটন কাজ করে, তাহলে এডমিন পোর্টাল রেন্ডার হচ্ছে। 
        পরে আসল ফিচার ফিরিয়ে আনব।
      </p>
    </div>
  );
};

export default AdminDashboard;
