import { z } from 'zod';
import { InquiryStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createInquirySchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(100),
  customerContact: z.string().trim().min(5, 'Provide a valid email or phone number').max(100),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(InquiryStatus, {
    errorMap: () => ({ message: 'Status must be NEW, IN_PROGRESS, or RESOLVED' }),
  }),
  version: z.number().int().positive('Valid version number is required'),
});

export const uuidSchema = z.string().uuid('Invalid inquiry ID format');
