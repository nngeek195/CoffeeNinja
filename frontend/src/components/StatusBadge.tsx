import { InquiryStatus } from '@/types';

const STATUS_STYLES: Record<InquiryStatus, { label: string; classes: string }> = {
  NEW: { label: 'New', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  RESOLVED: { label: 'Resolved', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export function StatusBadge({ status }: { status: InquiryStatus }) {
  const config = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
}