import { z } from 'zod';
import { InquiryStatus } from '@prisma/client';

const PHONE_PATTERN = /^\+?[0-9][0-9\s\-()]{6,19}$/;

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createInquirySchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(100),
  customerContact: z
    .string()
    .trim()
    .max(100)
    .refine(
      (value) => z.email().safeParse(value).success || PHONE_PATTERN.test(value),
      'Provide a valid email or phone number'
    ),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000),
});

export const updateStatusSchema = z.object({
  status: z.enum(InquiryStatus, { error: 'Status must be NEW, IN_PROGRESS, or RESOLVED' }),
  version: z.number().int().positive('Valid version number is required'),
});

export const uuidSchema = z.uuid('Invalid inquiry ID format');
