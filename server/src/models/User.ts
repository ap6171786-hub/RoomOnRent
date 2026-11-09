import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true, select: false },
  profileImage: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
}, { timestamps: true });

export const User = model('User', userSchema);
