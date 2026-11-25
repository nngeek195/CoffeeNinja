'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { ApiError, Inquiry, InquiryStatus } from '@/types';
import { Navbar } from '@/components/Navbar';
import { STATUS_META, StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  SearchX,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';

const LIFECYCLE: InquiryStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

const NEXT_STEP: Record<InquiryStatus, { next: InquiryStatus; label: string } | null> = {
  NEW: { next: 'IN_PROGRESS', label: 'Start progress' },
  IN_PROGRESS: { next: 'RESOLVED', label: 'Mark as resolved' },
  RESOLVED: null,
};

const ERROR_SCREENS: Record<number, { title: string; icon: typeof AlertCircle; tone: string }> = {
  403: { title: 'Access denied', icon: ShieldAlert, tone: 'bg-red-50 text-red-600' },
  404: { title: 'Inquiry not found', icon: SearchX, tone: 'bg-slate-100 text-slate-500' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function InquiryDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<{ status: number; message: string } | null>(null);

  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInquiry = useCallback(
    () =>
      apiFetch<{ inquiry: Inquiry }>(`/inquiries/${id}`)
        .then((data) => {
          setInquiry(data.inquiry);
          setPageError(null);
          setActionError(null);
          setIsStale(false);
        })
        .catch((err: ApiError) => {
          if (err.status === 401) {
            logout();
            return;
          }
          setPageError({ status: err.status, message: err.message || 'Unable to load inquiry.' });
        })
        .finally(() => setLoading(false)),
    [id, logout]
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && id) loadInquiry();
  }, [user, id, loadInquiry]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInquiry();
    setRefreshing(false);
  };

  const handleStatusChange = async (nextStatus: InquiryStatus) => {
    if (!inquiry) return;
    setUpdating(true);
    setActionError(null);
    setNotice(null);

    try {
      const data = await apiFetch<{ inquiry: Inquiry }>(`/inquiries/${inquiry.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, version: inquiry.version }),
      });
      setInquiry(data.inquiry);
      setNotice(`Status updated to ${STATUS_META[data.inquiry.status].label}.`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        logout();
        return;
      }
      setIsStale(apiErr.status === 409 && apiErr.code === 'STALE_DATA');
      setActionError(apiErr.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || !user) {
    return <SessionCheck />;
  }

  const nextStep = inquiry ? NEXT_STEP[inquiry.status] : null;
  const currentIndex = inquiry ? LIFECYCLE.indexOf(inquiry.status) : 0;
  const errorScreen = pageError ? ERROR_SCREENS[pageError.status] : undefined;
  const ErrorIcon = errorScreen?.icon ?? AlertCircle;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:ring-4 focus-visible:ring-slate-900/10 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" />
          All inquiries
        </Link>

        {loading ? (
          <div className="card space-y-6 p-6" aria-busy="true" aria-label="Loading inquiry">
            <div className="space-y-3">
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
            <div className="skeleton h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="space-y-2">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-4 w-3/4" />
                </div>
              ))}
            </div>
            <div className="skeleton h-24 w-full" />
          </div>
        ) : pageError ? (
          <div className="card px-6 py-14 text-center">
            <span
              className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                errorScreen?.tone ?? 'bg-amber-50 text-amber-600'
              }`}
            >
              <ErrorIcon className="h-6 w-6" />
            </span>
            <h1 className="text-lg font-semibold text-slate-900">
              {errorScreen?.title ?? 'Unable to open inquiry'}
            </h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{pageError.message}</p>
            {pageError.status > 0 && (
              <p className="mt-3 font-mono text-xs text-slate-400">Error {pageError.status}</p>
            )}
            <Link href="/" className="btn btn-primary mt-6">
              Back to dashboard
            </Link>
          </div>
        ) : inquiry ? (
          <article className="card overflow-hidden">
            <header className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">{inquiry.subject}</h1>
                <StatusBadge status={inquiry.status} />
              </div>
              <p className="mt-1.5 font-mono text-xs text-slate-400">
                {inquiry.id} · v{inquiry.version}
              </p>
            </header>

            <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
              <ol className="flex items-center" aria-label="Inquiry lifecycle">
                {LIFECYCLE.map((step, index) => {
                  const done = index < currentIndex || inquiry.status === 'RESOLVED';
                  const current = index === currentIndex && !done;
                  return (
                    <li key={step} className={`flex items-center ${index < LIFECYCLE.length - 1 ? 'flex-1' : ''}`}>
                      <div className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            done
                              ? 'bg-emerald-500 text-white'
                              : current
                                ? 'bg-slate-900 text-white ring-4 ring-slate-900/10'
                                : 'border border-slate-300 bg-white text-slate-400'
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                        </span>
                        <span
                          className={`text-sm font-medium whitespace-nowrap ${
                            done || current ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {STATUS_META[step].label}
                        </span>
                      </div>
                      {index < LIFECYCLE.length - 1 && (
                        <span
                          className={`mx-3 h-px flex-1 ${index < currentIndex ? 'bg-emerald-400' : 'bg-slate-200'}`}
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="space-y-6 px-6 py-6">
              {isStale ? (
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{actionError}</span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="btn shrink-0 bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700 focus-visible:ring-amber-600/25"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              ) : actionError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              ) : notice ? (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {notice}
                </div>
              ) : null}

              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                {[
                  { label: 'Customer', value: inquiry.customerName },
                  { label: 'Contact', value: inquiry.customerContact },
                  { label: 'Recorded by', value: inquiry.createdBy.name },
                  { label: 'Last updated', value: formatDate(inquiry.updatedAt) },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{item.label}</dt>
                    <dd className="mt-1 text-sm font-medium break-words text-slate-900">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <h2 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Description</h2>
                <p className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                  {inquiry.description}
                </p>
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Recorded {formatDate(inquiry.createdAt)}</p>
              {nextStep ? (
                <button
                  disabled={updating || isStale}
                  onClick={() => handleStatusChange(nextStep.next)}
                  className="btn btn-primary"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {updating ? 'Updating…' : nextStep.label}
                  {!updating && <ArrowRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Resolved and closed
                </span>
              )}
            </footer>
          </article>
        ) : null}
      </main>
    </div>
  );
}

function SessionCheck() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

export default function InquiryDetailPage() {
  return (
    <Suspense fallback={<SessionCheck />}>
      <InquiryDetailContent />
    </Suspense>
  );
}
