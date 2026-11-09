import { Schema, model } from 'mongoose';

const roomSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, select: false, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  rent: { type: Number, required: true, min: 0 },
  deposit: { type: Number, required: true, min: 0 },
  roomType: { type: String, required: true, enum: ['Single Room', 'Double Sharing', 'Triple Sharing', 'PG', '1 BHK', '2 BHK', '3 BHK', 'Flat/Apartment'] },
  propertyType: { type: String, required: true, enum: ['Apartment', 'Independent House', 'PG', 'Villa', 'Studio'] },
  city: { type: String, required: true, trim: true, index: true },
  locality: { type: String, required: true, trim: true, index: true },
  address: { type: String, required: true, trim: true },
  images: { type: [String], default: [] },
  amenities: { type: [String], default: [] },
  furnishing: { type: String, required: true, enum: ['Furnished', 'Semi-furnished', 'Unfurnished'] },
  availableFrom: { type: Date, required: true },
  maxOccupants: { type: Number, min: 1, max: 20, default: 1 },
  rules: { type: [String], default: [] },
  ownerName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'inactive', 'rented'], default: 'active', index: true },
  demoSeed: { type: Boolean, default: false, select: false },
  bookingLockVersion: { type: Number, default: 0, select: false },
}, { timestamps: true });

roomSchema.index({ city: 1, roomType: 1, rent: 1, status: 1 });
roomSchema.index({ title: 'text', description: 'text', locality: 'text', city: 'text' });

export const Room = model('Room', roomSchema);
