import { Schema, model } from 'mongoose';

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['booking-request', 'booking-accepted', 'booking-rejected', 'booking-cancelled'], required: true },
  message: { type: String, required: true, maxlength: 240 },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
