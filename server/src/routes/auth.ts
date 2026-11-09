import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';

export const authRouter = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
authRouter.use(authLimiter);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => value === '' || /^(?:\+91)?[6-9]\d{9}$/.test(value), 'Enter a valid Indian mobile number')
    .optional(),
  password: z.string().min(10).max(128),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const refreshCookie = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function createSession(userId: string) {
  const refreshToken = randomBytes(48).toString('base64url');
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshCookie.maxAge),
  });
  return {
    refreshToken,
    accessToken: jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' }),
  };
}

function publicUser(user: { _id: { toString(): string }; name: string; email: string; phone: string; isEmailVerified: boolean }) {
  return { id: user._id.toString(), name: user.name, email: user.email, phone: user.phone, isEmailVerified: user.isEmailVerified };
}

authRouter.post('/register', async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: 'Please check your registration details', errors: parsed.error.flatten() });
      return;
    }
    const { name, email, phone = '', password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      response.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: phone.replace(/^(?:\+91[\s-]?)/, '').replace(/[\s-]/g, ''),
      passwordHash: await bcrypt.hash(password, 12),
    });
    const session = await createSession(user.id);
    response.cookie('refreshToken', session.refreshToken, refreshCookie);
    response.status(201).json({ success: true, message: 'Account created', data: { user: publicUser(user), accessToken: session.accessToken } });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      response.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: 'Please enter a valid email and password' });
      return;
    }
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    const validPassword = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !validPassword || user.accountStatus !== 'active') {
      response.status(401).json({ success: false, message: 'Email or password is incorrect' });
      return;
    }
    const session = await createSession(user.id);
    response.cookie('refreshToken', session.refreshToken, refreshCookie);
    response.json({ success: true, message: 'Signed in', data: { user: publicUser(user), accessToken: session.accessToken } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const token = request.cookies?.refreshToken as string | undefined;
    if (!token) {
      response.status(401).json({ success: false, message: 'Refresh session is missing or expired' });
      return;
    }
    const current = await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { revokedAt: new Date() } },
      { new: false },
    );
    if (!current) {
      response.clearCookie('refreshToken', refreshCookie);
      response.status(401).json({ success: false, message: 'Refresh session is missing or expired' });
      return;
    }
    const user = await User.findOne({ _id: current.userId, accountStatus: 'active' });
    if (!user) {
      response.clearCookie('refreshToken', refreshCookie);
      response.status(401).json({ success: false, message: 'Account is unavailable' });
      return;
    }
    const session = await createSession(user.id);
    response.cookie('refreshToken', session.refreshToken, refreshCookie);
    response.json({ success: true, data: { user: publicUser(user), accessToken: session.accessToken } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    const token = request.cookies?.refreshToken as string | undefined;
    if (token) await RefreshToken.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { $set: { revokedAt: new Date() } });
    response.clearCookie('refreshToken', refreshCookie);
    response.json({ success: true, message: 'Signed out' });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findOne({ _id: request.userId, accountStatus: 'active' });
    if (!user) {
      response.status(404).json({ success: false, message: 'Account not found' });
      return;
    }
    response.json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    next(error);
  }
});
