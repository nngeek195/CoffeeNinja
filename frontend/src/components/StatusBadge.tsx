import { InquiryStatus } from '@/types';

export const STATUS_META: Record<InquiryStatus, { label: string; badge: string; dot: string }> = {
  NEW: { label: 'New', badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  RESOLVED: {
    label: 'Resolved',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
};

export function StatusBadge({ status }: { status: InquiryStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
