'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { ApiError, Inquiry, InquiryStatus } from '@/types';
import { Navbar } from '@/components/Navbar';
import { STATUS_META, StatusBadge } from '@/components/StatusBadge';
import { CreateInquiryModal } from '@/components/CreateInquiryModal';
import {
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Inbox,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

type StatusFilter = InquiryStatus | 'ALL';

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isFiltered = search.trim() !== '' || statusFilter !== 'ALL';

  const loadInquiries = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params}` : '';

      try {
        const data = await apiFetch<{ inquiries: Inquiry[] }>(`/inquiries${query}`, { signal });
        setInquiries(data.inquiries);
        setError(null);
      } catch (err) {
        if (signal?.aborted) return;
        const apiErr = err as ApiError;
        if (apiErr.status === 401) {
          logout();
          return;
        }
        setError(apiErr.message || 'Failed to load inquiries.');
      }
      setLoading(false);
    },
    [search, statusFilter, logout]
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      loadInquiries(controller.signal);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [user, loadInquiries]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const closeModal = useCallback(() => setShowCreateModal(false), []);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking session…
      </div>
    );
  }

  const showSkeleton = loading && inquiries.length === 0 && !error;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customer inquiries</h1>
            <p className="mt-1 text-sm text-slate-500">
              {user.role === 'ADMIN'
                ? 'All inquiries recorded across the team.'
                : 'Inquiries you have recorded.'}
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            New inquiry
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, contact, or subject"
              aria-label="Search inquiries"
              className="input pr-9 pl-9"
            />
            {loading && !showSkeleton && (
              <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          <div
            role="group"
            aria-label="Filter by status"
            className="flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xs"
          >
            {STATUS_FILTERS.map((value) => {
              const active = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(value)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-4 focus-visible:ring-slate-900/10 focus-visible:outline-none ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {value !== 'ALL' && (
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[value].dot}`} aria-hidden="true" />
                  )}
                  {value === 'ALL' ? 'All' : STATUS_META[value].label}
                </button>
              );
            })}
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                loadInquiries();
              }}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {showSkeleton ? (
          <div className="card divide-y divide-slate-100" aria-busy="true" aria-label="Loading inquiries">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 space-y-2.5">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
                <div className="skeleton hidden h-3 w-24 sm:block" />
              </div>
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          !error && (
            <div className="card px-6 py-14 text-center">
              <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                <Inbox className="h-5 w-5 text-slate-500" />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                {isFiltered ? 'No matching inquiries' : 'No inquiries yet'}
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                {isFiltered
                  ? 'Try a different search term or status filter.'
                  : 'Record your first customer inquiry to get started.'}
              </p>
              <div className="mt-5">
                {isFiltered ? (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('ALL');
                    }}
                    className="btn btn-secondary"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                    <Plus className="h-4 w-4" />
                    New inquiry
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <ul
            className={`card divide-y divide-slate-100 overflow-hidden transition-opacity ${
              loading ? 'opacity-60' : ''
            }`}
          >
            {inquiries.map((inquiry) => (
              <li key={inquiry.id}>
                <Link
                  href={`/inquiries/${inquiry.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate text-sm font-medium text-slate-900">{inquiry.subject}</p>
                      <StatusBadge status={inquiry.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      <span className="text-slate-700">{inquiry.customerName}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      {inquiry.customerContact}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 sm:hidden">{formatDate(inquiry.createdAt)}</p>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
                    <p>{formatDate(inquiry.createdAt)}</p>
                    {user.role === 'ADMIN' && <p className="mt-0.5 text-slate-400">{inquiry.createdBy.name}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showCreateModal && (
        <CreateInquiryModal
          onClose={closeModal}
          onCreated={(created) => {
            setShowCreateModal(false);
            setNotice(`Inquiry “${created.subject}” recorded.`);
            loadInquiries();
          }}
        />
      )}
    </div>
  );
}
