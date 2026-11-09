import { Schema, model } from 'mongoose';

const favouriteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
}, { timestamps: true });

favouriteSchema.index({ userId: 1, roomId: 1 }, { unique: true });
favouriteSchema.index({ userId: 1, createdAt: -1 });

export const Favourite = model('Favourite', favouriteSchema);
