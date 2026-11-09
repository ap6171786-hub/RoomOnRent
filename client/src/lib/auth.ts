import { z } from 'zod';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(80),
  email: z.string().email(),
  phone: z.string().trim().max(20).transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => value === '' || /^(?:\+91)?[6-9]\d{9}$/.test(value), 'Enter a valid Indian mobile number')
    .optional(),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
});

export type AuthUser = { id: string; name: string; email: string; phone: string; isEmailVerified: boolean };
type AuthResponse = { success: true; data: { user: AuthUser; accessToken: string } };

let accessToken: string | null = null;
let refreshInFlight: Promise<{ user: AuthUser; accessToken: string }> | null = null;
export function getAccessToken() { return accessToken; }
export function clearAccessToken() { accessToken = null; }

async function postAuth(path: string, body?: unknown): Promise<AuthResponse> {
  const response = await fetch(`${apiBase}/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsedError = z.object({ message: z.string().optional() }).safeParse(payload);
    throw new Error(parsedError.data?.message ?? 'Unable to complete sign-in. Please try again.');
  }
  const parsed = z.object({
    success: z.literal(true),
    data: z.object({
      user: z.object({ id: z.string(), name: z.string(), email: z.string(), phone: z.string(), isEmailVerified: z.boolean() }),
      accessToken: z.string(),
    }),
  }).parse(payload);
  accessToken = parsed.data.accessToken;
  return parsed;
}

export async function login(input: z.infer<typeof loginSchema>) {
  return (await postAuth('login', input)).data;
}

export async function register(input: z.infer<typeof registerSchema>) {
  return (await postAuth('register', input)).data;
}

export async function refreshSession() {
  return (await postAuth('refresh')).data;
}

function renewSession() {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function authenticatedFetch(url: string, init: RequestInit = {}) {
  const send = () => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers, credentials: 'include' });
  };
  let response = await send();
  if (response.status !== 401 || !accessToken) return response;
  try {
    await renewSession();
  } catch {
    clearAccessToken();
    window.dispatchEvent(new Event('roomonrent:session-expired'));
    throw new Error('Your session expired. Please sign in again.');
  }
  response = await send();
  return response;
}

export async function logout() {
  try {
    const response = await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('Unable to sign out. Please try again.');
  } finally {
    clearAccessToken();
  }
}
