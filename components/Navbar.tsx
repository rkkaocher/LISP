
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            N
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">
            NexusConnect <span className="text-indigo-600">Portal</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-700">{user.fullName}</span>
            <span className="text-xs text-slate-500 capitalize">{user.role}</span>
          </div>
          <button 
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors border border-slate-200 rounded-full hover:border-red-100 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
