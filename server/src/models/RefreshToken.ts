import { Schema, model } from 'mongoose';

const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
