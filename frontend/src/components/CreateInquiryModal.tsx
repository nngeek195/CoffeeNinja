'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ApiError, Inquiry } from '@/types';
import { X, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (inquiry: Inquiry) => void;
}

type FieldName = 'customerName' | 'customerContact' | 'subject' | 'description';

const FIELDS: { name: FieldName; label: string; placeholder: string; multiline?: boolean }[] = [
  { name: 'customerName', label: 'Customer name', placeholder: 'e.g. Nimal Perera' },
  {
    name: 'customerContact',
    label: 'Contact (email or phone)',
    placeholder: 'nimal@example.com or +94 77 555 1234',
  },
  { name: 'subject', label: 'Subject', placeholder: 'Brief summary of the request' },
  {
    name: 'description',
    label: 'Description',
    placeholder: "Describe the customer's inquiry in detail…",
    multiline: true,
  },
];

const EMPTY_FORM: Record<FieldName, string> = {
  customerName: '',
  customerContact: '',
  subject: '',
  description: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s\-()]{6,19}$/;

function validate(form: Record<FieldName, string>) {
  const errors: Partial<Record<FieldName, string[]>> = {};
  const contact = form.customerContact.trim();

  if (form.customerName.trim().length < 2) {
    errors.customerName = ['Customer name must be at least 2 characters'];
  }
  if (!EMAIL_PATTERN.test(contact) && !PHONE_PATTERN.test(contact)) {
    errors.customerContact = ['Provide a valid email or phone number'];
  }
  if (form.subject.trim().length < 3) {
    errors.subject = ['Subject must be at least 3 characters'];
  }
  if (form.description.trim().length < 10) {
    errors.description = ['Description must be at least 10 characters'];
  }
  return errors;
}

export function CreateInquiryModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string[]>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateField = (name: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const clientErrors = validate(form);
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
        body: JSON.stringify(form),
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-inquiry-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="create-inquiry-title" className="text-base font-semibold text-slate-900">
              Record new inquiry
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">All fields are required.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="-mr-1.5 cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-4 focus-visible:ring-slate-900/10 focus-visible:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {FIELDS.map((field, index) => {
              const error = fieldErrors[field.name]?.[0];
              const inputProps = {
                id: field.name,
                value: form[field.name],
                placeholder: field.placeholder,
                className: 'input',
                'aria-invalid': error ? true : undefined,
                'aria-describedby': error ? `${field.name}-error` : undefined,
              };

              return (
                <div key={field.name}>
                  <label htmlFor={field.name} className="label">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      {...inputProps}
                      rows={4}
                      className="input resize-y"
                      onChange={(e) => updateField(field.name, e.target.value)}
                    />
                  ) : (
                    <input
                      {...inputProps}
                      ref={index === 0 ? firstInputRef : undefined}
                      type="text"
                      onChange={(e) => updateField(field.name, e.target.value)}
                    />
                  )}
                  {error && (
                    <p id={`${field.name}-error`} className="mt-1.5 text-xs font-medium text-red-600">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving…' : 'Save inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
