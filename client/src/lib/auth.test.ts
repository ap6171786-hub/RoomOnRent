import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth';

describe('authentication form validation', () => {
  it('requires a valid email and a non-empty password for login', () => {
    expect(loginSchema.safeParse({ email: 'renter@example.in', password: 'secret' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success).toBe(false);
  });

  it('accepts an Indian mobile number or an omitted number', () => {
    const base = { name: 'Asha Patel', email: 'asha@example.in', password: 'A-long-passphrase-2026' };
    expect(registerSchema.safeParse({ ...base, phone: '+91 98765 43210' }).success).toBe(true);
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
  });
});
