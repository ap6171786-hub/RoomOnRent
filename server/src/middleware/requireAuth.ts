import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const requireAuth: RequestHandler = (request, response, next) => {
  const authorization = request.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) {
    response.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(accessToken, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      response.status(401).json({ success: false, message: 'Invalid access token' });
      return;
    }
    request.userId = payload.sub;
    next();
  } catch {
    response.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
};
