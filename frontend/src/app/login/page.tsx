'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ApiError, User } from '@/types';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

const TEST_ACCOUNTS = [
  { role: 'Staff', email: 'alice@coffeeninja.lk' },
  { role: 'Staff', email: 'bob@coffeeninja.lk' },
  { role: 'Admin', email: 'admin@coffeeninja.lk' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.token, data.user);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Sign in failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <Inbox className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in to Inquiry Desk</h1>
        <p className="mt-1.5 text-sm text-slate-500">Customer inquiry management for staff</p>
      </div>

      <div className="card w-full max-w-sm p-6 sm:p-8">
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@coffeeninja.lk"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <div className="mt-6 w-full max-w-sm rounded-xl border border-dashed border-slate-300 px-5 py-4 text-xs text-slate-500">
        <p className="mb-2 font-medium text-slate-700">
          Seeded test accounts · password <code className="font-mono text-slate-900">password123</code>
        </p>
        <ul className="space-y-1">
          {TEST_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex justify-between gap-3">
              <span className="font-mono text-slate-700">{account.email}</span>
              <span>{account.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
