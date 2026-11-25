'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { ApiError, Inquiry, InquiryStatus } from '@/types';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { CreateInquiryModal } from '@/components/CreateInquiryModal';
import { Plus, Search, AlertCircle, RefreshCw, Inbox, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch<{ inquiries: Inquiry[] }>(`/inquiries${query}`);
      setInquiries(data.inquiries);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        router.push('/login');
        return;
      }
      setError(apiErr.message || 'Failed to load inquiries.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchInquiries();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [user, fetchInquiries]);

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customer Inquiries</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user.role === 'ADMIN'
                ? 'Viewing all staff inquiries across the business.'
                : 'Viewing inquiries assigned to you.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Inquiry
          </button>
        </div>

        {/* Search and Status Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, contact, or subject..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | 'ALL')}
            aria-label="Filter by status"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchInquiries}
              className="inline-flex items-center gap-1 font-medium underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse p-4" />
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No inquiries found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try clearing your search or changing the status filter.'
                : 'Get started by recording your first customer inquiry.'}
            </p>
            {(search || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                className="mt-4 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Inquiry List */
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <Link
                key={inquiry.id}
                href={`/inquiries/${inquiry.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-semibold text-slate-900 truncate">
                        {inquiry.subject}
                      </h2>
                      <StatusBadge status={inquiry.status} />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium text-slate-800">{inquiry.customerName}</span>
                      {' · '}
                      {inquiry.customerContact}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Recorded {new Date(inquiry.createdAt).toLocaleString()}
                      {user.role === 'ADMIN' && ` · Owner: ${inquiry.createdBy.name}`}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateInquiryModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newInquiry) => {
            setShowCreateModal(false);
            setInquiries((prev) => [newInquiry, ...prev]);
          }}
        />
      )}
    </div>
  );
}