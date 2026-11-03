import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["TENANT", "OWNER", "ADMIN"], default: "TENANT", required: true },
    active: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true },
);

const roomSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 4000 },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Single Room", "Double Sharing", "Triple Sharing", "PG", "1BHK", "2BHK"], required: true },
    rent: { type: Number, required: true, min: 1, index: true },
    deposit: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    furnished: { type: Boolean, default: true },
    available: { type: Boolean, default: true, index: true },
    verifiedOwner: { type: Boolean, default: false },
    activeBooking: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

roomSchema.index({ city: 1, type: 1, available: 1, rent: 1 });
roomSchema.index({ title: "text", description: "text", address: "text", city: "text" });

const bookingSchema = new Schema(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    tenant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    moveInDate: { type: Date, required: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "CONFIRMED", "COMPLETED"], default: "PENDING" },
    statusHistory: {
      type: [{ status: String, changedAt: { type: Date, default: Date.now } }],
      default: [{ status: "PENDING" }],
    },
  },
  { timestamps: true },
);

bookingSchema.index(
  { room: 1, tenant: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING", "ACCEPTED", "CONFIRMED"] } },
  },
);
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ tenant: 1, createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export type RoomDocument = InferSchemaType<typeof roomSchema>;
export type BookingDocument = InferSchemaType<typeof bookingSchema>;

export const User = mongoose.models.User || model("User", userSchema);
export const Room = mongoose.models.Room || model("Room", roomSchema);
export const Booking = mongoose.models.Booking || model("Booking", bookingSchema);
