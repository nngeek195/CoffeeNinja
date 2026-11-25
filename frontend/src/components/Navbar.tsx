'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Inbox } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Inbox className="w-5 h-5 text-slate-700" />
          <span>Inquiry Desk</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">
              {user.role === 'ADMIN' ? 'Admin (All Inquiries)' : 'Staff (My Inquiries)'}
            </p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}