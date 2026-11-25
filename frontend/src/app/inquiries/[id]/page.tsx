'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { ApiError, Inquiry, InquiryStatus } from '@/types';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const NEXT_STEP: Record<InquiryStatus, { next: InquiryStatus; label: string } | null> = {
  NEW: { next: 'IN_PROGRESS', label: 'Mark as In Progress' },
  IN_PROGRESS: { next: 'RESOLVED', label: 'Mark as Resolved' },
  RESOLVED: null,
};

function InquiryDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<{ status: number; message: string } | null>(null);

  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchInquiry = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    setActionError(null);
    setIsStale(false);

    try {
      const data = await apiFetch<{ inquiry: Inquiry }>(`/inquiries/${id}`);
      setInquiry(data.inquiry);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        router.push('/login');
        return;
      }
      setPageError({
        status: apiErr.status || 500,
        message: apiErr.message || 'Unable to load inquiry.',
      });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && id) {
      fetchInquiry();
    }
  }, [user, id, fetchInquiry]);

  const handleStatusChange = async (nextStatus: InquiryStatus) => {
    if (!inquiry) return;
    setUpdating(true);
    setActionError(null);
    setIsStale(false);

    try {
      const data = await apiFetch<{ inquiry: Inquiry }>(`/inquiries/${inquiry.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          version: inquiry.version,
        }),
      });
      setInquiry(data.inquiry);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409 && apiErr.code === 'STALE_DATA') {
        setIsStale(true);
      }
      setActionError(apiErr.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inquiries
        </Link>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 animate-pulse h-64" />
        ) : pageError ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            {pageError.status === 403 ? (
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
            ) : (
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            )}
            <h2 className="text-lg font-semibold text-slate-900">
              {pageError.status === 403
                ? 'Access Denied (403)'
                : pageError.status === 404
                ? 'Inquiry Not Found (404)'
                : 'Unable to Open Inquiry'}
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              {pageError.message}
            </p>
            <Link
              href="/"
              className="inline-block mt-5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : inquiry ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">{inquiry.subject}</h1>
                  <StatusBadge status={inquiry.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ID: {inquiry.id} · Version {inquiry.version}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="mx-6 mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{actionError}</span>
                </div>
                {isStale && (
                  <button
                    onClick={fetchInquiry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh Latest Data
                  </button>
                )}
              </div>
            )}

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-medium">Customer</p>
                  <p className="font-medium text-slate-900 mt-0.5">{inquiry.customerName}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-medium">Contact</p>
                  <p className="font-medium text-slate-900 mt-0.5">{inquiry.customerContact}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-medium">Handled By</p>
                  <p className="font-medium text-slate-900 mt-0.5">{inquiry.createdBy.name}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-medium">Last Updated</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {new Date(inquiry.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {inquiry.description}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Lifecycle: <span className="font-medium">New → In Progress → Resolved</span>
                </div>

                {NEXT_STEP[inquiry.status] ? (
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange(NEXT_STEP[inquiry.status]!.next)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg cursor-pointer"
                  >
                    {updating ? 'Updating...' : NEXT_STEP[inquiry.status]!.label}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    This inquiry is resolved and closed
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function InquiryDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
          Loading inquiry...
        </div>
      }
    >
      <InquiryDetailContent />
    </Suspense>
  );
}