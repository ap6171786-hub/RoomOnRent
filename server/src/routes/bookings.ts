import mongoose from 'mongoose';
import { Router } from 'express';
import { z } from 'zod';
import { invalidateRoomSearchCache } from '../config/redis.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';
import { Room } from '../models/Room.js';
import { isValidBookingRange } from '../utils/bookingRules.js';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

class BookingError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const requestSchema = z.object({
  roomId: z.string().regex(/^[a-f\d]{24}$/i),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  message: z.string().trim().max(1000).default(''),
});

bookingsRouter.post('/', async (request, response, next) => {
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ success: false, message: 'Please check the booking details', errors: parsed.error.flatten() });
    return;
  }

  const { roomId, startDate, endDate, message } = parsed.data;
  if (!isValidBookingRange(startDate, endDate)) {
    response.status(400).json({ success: false, message: 'Choose a future start date and an end date after it' });
    return;
  }

  const session = await mongoose.startSession();
  let booking: InstanceType<typeof Booking> | undefined;
  try {
    await session.withTransaction(async () => {
      const room = await Room.findOne({ _id: roomId, status: 'active' }).select('+ownerId').session(session);
      if (!room) throw new BookingError(404, 'Room is not available');
      if (room.ownerId.toString() === request.userId) throw new BookingError(400, 'You cannot request your own listing');
      if (startDate < room.availableFrom) throw new BookingError(400, 'This room is not available for the selected move-in date');

      [booking] = await Booking.create([{
        roomId: room._id,
        renterId: request.userId,
        ownerId: room.ownerId,
        startDate,
        endDate,
        message,
        history: [{ status: 'pending', changedBy: request.userId }],
      }], { session });

      await Notification.create([{
        userId: room.ownerId,
        type: 'booking-request',
        message: 'You have a new room booking request.',
        bookingId: booking._id,
      }], { session });
    });
    void invalidateRoomSearchCache();
    response.status(201).json({ success: true, message: 'Booking request sent', data: booking });
  } catch (error) {
    if (error instanceof BookingError) {
      response.status(error.status).json({ success: false, message: error.message });
      return;
    }
    next(error);
  } finally {
    await session.endSession();
  }
});

bookingsRouter.get('/mine', async (request, response, next) => {
  try {
    const bookings = await Booking.find({ renterId: request.userId })
      .populate('roomId', 'title city locality images rent')
      .sort({ createdAt: -1 })
      .lean();
    response.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
});

bookingsRouter.get('/owner', async (request, response, next) => {
  try {
    const bookings = await Booking.find({ ownerId: request.userId })
      .populate('roomId', 'title city locality images rent')
      .sort({ createdAt: -1 })
      .lean();
    response.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
});

bookingsRouter.patch('/:id/accept', async (request, response, next) => {
  const session = await mongoose.startSession();
  let booking: InstanceType<typeof Booking> | undefined;
  try {
    await session.withTransaction(async () => {
      booking = await Booking.findOne({ _id: request.params.id, ownerId: request.userId, status: 'pending' }).session(session) ?? undefined;
      if (!booking) throw new BookingError(404, 'Pending booking not found for your listing');

      const room = await Room.findOneAndUpdate(
        { _id: booking.roomId, status: 'active' },
        { $inc: { bookingLockVersion: 1 } },
        { new: true, session },
      );
      if (!room) throw new BookingError(409, 'This listing is no longer available');

      const overlap = await Booking.exists({
        _id: { $ne: booking._id },
        roomId: booking.roomId,
        status: 'accepted',
        startDate: { $lt: booking.endDate },
        endDate: { $gt: booking.startDate },
      }).session(session);
      if (overlap) throw new BookingError(409, 'Another confirmed booking overlaps these dates');

      booking.status = 'accepted';
      booking.history.push({ status: 'accepted', changedBy: request.userId });
      await booking.save({ session });
      await Notification.create([{
        userId: booking.renterId,
        type: 'booking-accepted',
        message: 'Your room booking request was accepted.',
        bookingId: booking._id,
      }], { session });
    });
    void invalidateRoomSearchCache();
    response.json({ success: true, message: 'Booking accepted', data: booking });
  } catch (error) {
    if (error instanceof BookingError) {
      response.status(error.status).json({ success: false, message: error.message });
      return;
    }
    next(error);
  } finally {
    await session.endSession();
  }
});

bookingsRouter.patch('/:id/reject', async (request, response, next) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, ownerId: request.userId, status: 'pending' },
      { $set: { status: 'rejected' }, $push: { history: { status: 'rejected', changedBy: request.userId } } },
      { new: true },
    );
    if (!booking) {
      response.status(404).json({ success: false, message: 'Pending booking not found for your listing' });
      return;
    }
    await Notification.create({
      userId: booking.renterId,
      type: 'booking-rejected',
      message: 'Your room booking request was declined.',
      bookingId: booking._id,
    });
    void invalidateRoomSearchCache();
    response.json({ success: true, message: 'Booking rejected', data: booking });
  } catch (error) {
    next(error);
  }
});

bookingsRouter.patch('/:id/cancel', async (request, response, next) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, renterId: request.userId, status: { $in: ['pending', 'accepted'] } },
      { $set: { status: 'cancelled' }, $push: { history: { status: 'cancelled', changedBy: request.userId } } },
      { new: true },
    );
    if (!booking) {
      response.status(404).json({ success: false, message: 'Booking not found or can no longer be cancelled' });
      return;
    }
    await Notification.create({
      userId: booking.ownerId,
      type: 'booking-cancelled',
      message: 'A renter cancelled their booking request.',
      bookingId: booking._id,
    });
    void invalidateRoomSearchCache();
    response.json({ success: true, message: 'Booking cancelled', data: booking });
  } catch (error) {
    next(error);
  }
});
