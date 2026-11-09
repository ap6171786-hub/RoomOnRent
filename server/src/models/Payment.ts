import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  status: { type: String, enum: ['pending', 'succeeded', 'failed'], required: true, index: true },
  provider: { type: String, enum: ['mock', 'razorpay'], required: true },
  transactionReference: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, required: true },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export const Payment = model('Payment', paymentSchema);
