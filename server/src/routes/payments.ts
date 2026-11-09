import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { Payment } from '../models/Payment.js';
import { Booking } from '../models/Booking.js';
import { Room } from '../models/Room.js';
import { MockPaymentProvider } from '../integrations/payments.js';

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);
const demoProvider = new MockPaymentProvider();

paymentsRouter.post('/demo', async (request, response, next) => {
  const parsed = z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i) }).safeParse(request.body);
  const idempotencyKey = request.get('idempotency-key');
  if (!parsed.success || !idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) {
    response.status(400).json({ success: false, message: 'A valid booking ID and Idempotency-Key are required' });
    return;
  }

  try {
    const existing = await Payment.findOne({ userId: request.userId, idempotencyKey });
    if (existing) {
      if (existing.bookingId.toString() !== parsed.data.bookingId) {
        response.status(409).json({ success: false, message: 'This idempotency key was already used for another booking' });
        return;
      }
      response.json({ success: true, demo: true, message: 'Demo payment already processed', data: existing });
      return;
    }

    const booking = await Booking.findOne({ _id: parsed.data.bookingId, renterId: request.userId, status: 'accepted' });
    if (!booking) {
      response.status(404).json({ success: false, message: 'An accepted booking for this account was not found' });
      return;
    }
    const room = await Room.findById(booking.roomId).select('rent');
    if (!room) {
      response.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    const result = await demoProvider.initiate({ amount: room.rent, idempotencyKey });
    const [payment] = await Payment.create([{
      bookingId: booking._id,
      userId: request.userId,
      amount: room.rent,
      status: result.status,
      provider: demoProvider.name,
      transactionReference: result.transactionReference,
      idempotencyKey,
      verifiedAt: result.verifiedAt,
    }]);
    response.status(201).json({ success: true, demo: true, message: 'Demo payment completed. No money was collected.', data: payment });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      const existing = await Payment.findOne({ userId: request.userId, idempotencyKey });
      if (existing?.bookingId.toString() === parsed.data.bookingId) {
        response.json({ success: true, demo: true, message: 'Demo payment already processed', data: existing });
        return;
      }
    }
    next(error);
  }
});

paymentsRouter.post('/:id/verify', async (request, response, next) => {
  try {
    const payment = await Payment.findOne({ _id: request.params.id, userId: request.userId });
    if (!payment) {
      response.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    const verified = payment.provider === demoProvider.name
      && await demoProvider.verify(payment.transactionReference, payment.amount);
    if (!verified || payment.status !== 'succeeded' || !payment.verifiedAt) {
      response.status(409).json({ success: false, message: 'Payment could not be verified' });
      return;
    }
    response.json({ success: true, demo: payment.provider === 'mock', data: payment });
  } catch (error) {
    next(error);
  }
});
