import React, { useState } from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              N
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              NexusConnect <span className="text-indigo-600">পোর্টাল</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-700">{user.fullName}</span>
              <span className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? 'অ্যাডমিন' : 'কাস্টমার'}</span>
            </div>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors border border-slate-200 rounded-full hover:border-red-100 hover:bg-red-50"
            >
              লগআউট
            </button>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🚪
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">লগআউট নিশ্চিত করুন</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <span className="font-bold text-indigo-600">NexusConnect</span> থেকে লগআউট করতে চান? পুনরায় লগইন করতে আপনার আইডি ও পাসওয়ার্ড লাগবে।
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={onLogout}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
              >
                হ্যাঁ, লগআউট করুন
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
              >
                ফিরে যান
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;