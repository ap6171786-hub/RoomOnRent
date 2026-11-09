import { Schema, model } from 'mongoose';

const historySchema = new Schema({
  status: { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const bookingSchema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  renterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'], default: 'pending', index: true },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

bookingSchema.index({ roomId: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ renterId: 1, createdAt: -1 });
bookingSchema.index({ ownerId: 1, status: 1, createdAt: -1 });

export const Booking = model('Booking', bookingSchema);
