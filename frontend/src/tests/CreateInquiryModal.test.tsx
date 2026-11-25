import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateInquiryModal } from '@/components/CreateInquiryModal';

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: 'Nimal Perera' } });
  fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: 'nimal@example.com' } });
  fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Billing question' } });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Customer was charged twice this month.' },
  });
}

describe('CreateInquiryModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('displays inline validation errors when submitted with empty fields', async () => {
    const onCreated = vi.fn();
    render(<CreateInquiryModal onClose={vi.fn()} onCreated={onCreated} />);

    fireEvent.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(await screen.findByText(/please fix the highlighted fields/i)).toBeInTheDocument();
    expect(screen.getByText(/customer name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('rejects a contact that is neither an email nor a phone number', () => {
    render(<CreateInquiryModal onClose={vi.fn()} onCreated={vi.fn()} />);
    fillValidForm();
    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: 'not-a-contact' } });

    fireEvent.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(screen.getByText(/provide a valid email or phone number/i)).toBeInTheDocument();
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<CreateInquiryModal onClose={onClose} onCreated={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the server message when a duplicate inquiry is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'An open inquiry with this contact and subject already exists.' }),
      })
    );
    const onCreated = vi.fn();
    render(<CreateInquiryModal onClose={vi.fn()} onCreated={onCreated} />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows a friendly message when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<CreateInquiryModal onClose={vi.fn()} onCreated={vi.fn()} />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(await screen.findByText(/unable to reach the server/i)).toBeInTheDocument();
  });
});
