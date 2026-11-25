'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Inbox } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-slate-900 focus-visible:ring-4 focus-visible:ring-slate-900/10 focus-visible:outline-none"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Inbox className="h-4 w-4" />
          </span>
          Inquiry Desk
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">
                {user.role === 'ADMIN' ? 'Admin · All inquiries' : 'Staff · My inquiries'}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {initials}
            </span>
          </div>
          <button onClick={logout} className="btn btn-secondary px-3 py-1.5">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
