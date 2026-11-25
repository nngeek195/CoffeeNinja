'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { apiFetch } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function restoreSession(): Promise<User | null> {
  if (!localStorage.getItem('token')) return null;
  try {
    const res = await apiFetch<{ user: User }>('/auth/me');
    return res.user;
  } catch {
    localStorage.removeItem('token');
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    restoreSession().then((restored) => {
      setUser(restored);
      setLoading(false);
    });
  }, []);

  const login = useCallback(
    (token: string, userData: User) => {
      localStorage.setItem('token', token);
      setUser(userData);
      router.push('/');
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
