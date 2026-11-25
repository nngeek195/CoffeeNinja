'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ApiError, Inquiry } from '@/types';
import { X, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (inquiry: Inquiry) => void;
}

export function CreateInquiryModal({ onClose, onCreated }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const validateClient = () => {
    const errors: Record<string, string[]> = {};
    if (customerName.trim().length < 2) {
      errors.customerName = ['Customer name must be at least 2 characters'];
    }
    if (customerContact.trim().length < 5) {
      errors.customerContact = ['Provide a valid email or phone number (min 5 chars)'];
    }
    if (subject.trim().length < 3) {
      errors.subject = ['Subject must be at least 3 characters'];
    }
    if (description.trim().length < 10) {
      errors.description = ['Description must be at least 10 characters'];
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError('Please fix the highlighted fields before submitting.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const data = await apiFetch<{ inquiry: Inquiry }>('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerContact,
          subject,
          description,
        }),
      });
      onCreated(data.inquiry);
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr.message || 'Failed to save inquiry.');
      if (apiErr.details) {
        setFieldErrors(apiErr.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Record New Inquiry</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">
              Customer Name *
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., Nimal Perera"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {fieldErrors.customerName && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.customerName[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="customerContact" className="block text-sm font-medium text-slate-700 mb-1">
              Contact (Email or Phone) *
            </label>
            <input
              id="customerContact"
              type="text"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="e.g., nimal@example.com or +94 77 555 1234"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {fieldErrors.customerContact && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.customerContact[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">
              Subject *
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the request"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {fieldErrors.subject && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.subject[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the customer's inquiry in detail..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}