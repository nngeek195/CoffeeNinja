export type Role = 'STAFF' | 'ADMIN';
export type InquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Inquiry {
  id: string;
  customerName: string;
  customerContact: string;
  subject: string;
  description: string;
  status: InquiryStatus;
  version: number;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}