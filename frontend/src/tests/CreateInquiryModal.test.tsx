import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateInquiryModal } from '@/components/CreateInquiryModal';

describe('CreateInquiryModal', () => {
  it('displays inline validation errors when submitted with empty fields', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();

    render(<CreateInquiryModal onClose={onClose} onCreated={onCreated} />);

    const submitButton = screen.getByRole('button', { name: /save inquiry/i });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(/please fix the highlighted fields/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/customer name must be at least 2 characters/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/description must be at least 10 characters/i)
    ).toBeInTheDocument();

    expect(onCreated).not.toHaveBeenCalled();
  });
});