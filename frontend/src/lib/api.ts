import { ApiError } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch (err) {
    if (options.signal?.aborted) throw err;
    const error: ApiError = {
      status: 0,
      message: 'Unable to reach the server. Check your connection and try again.',
    };
    throw error;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error: ApiError = {
      status: res.status,
      message: data.error || 'Something went wrong. Please try again.',
      code: data.code,
      details: data.details,
    };
    throw error;
  }

  return data as T;
}
