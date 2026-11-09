import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { bookingsRouter } from './routes/bookings.js';
import { favouritesRouter } from './routes/favourites.js';
import { notificationsRouter } from './routes/notifications.js';
import { paymentsRouter } from './routes/payments.js';
import { roomsRouter } from './routes/rooms.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health/live', (_request, response) => response.json({ success: true, status: 'ok' }));
app.get('/health', (_request, response) => {
  if (mongoose.connection.readyState !== 1) {
    response.status(503).json({ success: false, status: 'not-ready', database: 'disconnected' });
    return;
  }
  response.json({ success: true, status: 'ready', database: 'connected' });
});
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/rooms', roomsRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/favourites', favouritesRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/payments', paymentsRouter);

app.use((_request, response) => {
  response.status(404).json({ success: false, message: 'Route not found' });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    response.status(409).json({ success: false, message: 'A record with these details already exists' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'CastError') {
    response.status(400).json({ success: false, message: 'Invalid resource identifier' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ValidationError') {
    response.status(400).json({ success: false, message: 'The submitted data is invalid' });
    return;
  }
  response.status(500).json({ success: false, message: 'An unexpected server error occurred' });
};
app.use(errorHandler);
