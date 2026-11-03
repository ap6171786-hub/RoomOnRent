import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "./auth.js";
import { invalidateRoomSearchCache } from "./cache.js";
import { Booking, Room } from "./models.js";

export const bookingRouter = Router();
bookingRouter.use(requireAuth);

bookingRouter.post("/", requireRole("TENANT"), async (request, response, next) => {
  try {
    const input = z.object({
      roomId: z.string().regex(/^[a-f\d]{24}$/i),
      moveInDate: z.coerce.date().refine((date) => date.getTime() >= Date.now(), "Move-in date must be today or later"),
    }).parse(request.body);
    const room = await Room.findOne({ _id: input.roomId, available: true });
    if (!room) {
      response.status(409).json({ error: "This room is no longer available" });
      return;
    }
    const booking = await Booking.create({
      room: room._id,
      tenant: request.user!.id,
      owner: room.owner,
      moveInDate: input.moveInDate,
    });
    response.status(201).json({ booking });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      response.status(409).json({ error: "You already have an active booking request for this room" });
      return;
    }
    next(error);
  }
});

bookingRouter.get("/mine", requireRole("TENANT"), async (request, response, next) => {
  try {
    const bookings = await Booking.find({ tenant: request.user!.id }).sort({ createdAt: -1 }).populate("room").lean();
    response.json({ items: bookings });
  } catch (error) {
    next(error);
  }
});

bookingRouter.get("/owner", requireRole("OWNER", "ADMIN"), async (request, response, next) => {
  try {
    const filter = request.user!.role === "ADMIN" ? {} : { owner: request.user!.id };
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).populate("room").populate("tenant", "name email").lean();
    response.json({ items: bookings });
  } catch (error) {
    next(error);
  }
});

bookingRouter.patch("/:id/status", requireRole("OWNER", "ADMIN"), async (request, response, next) => {
  try {
    const { status } = z.object({ status: z.enum(["ACCEPTED", "REJECTED"]) }).parse(request.body);
    const filter = request.user!.role === "ADMIN"
      ? { _id: request.params.id, status: "PENDING" }
      : { _id: request.params.id, owner: request.user!.id, status: "PENDING" };
    const booking = await Booking.findOne(filter);
    if (!booking) {
      response.status(404).json({ error: "Pending booking not found" });
      return;
    }
    if (status === "ACCEPTED") {
      const room = await Room.findOneAndUpdate(
        { _id: booking.room, available: true },
        { $set: { available: false, activeBooking: booking._id } },
        { new: true },
      );
      if (!room) {
        response.status(409).json({ error: "The room has already been booked" });
        return;
      }
      await invalidateRoomSearchCache();
    }
    booking.status = status;
    booking.statusHistory.push({ status, changedAt: new Date() });
    await booking.save();
    response.json({ booking });
  } catch (error) {
    next(error);
  }
});

bookingRouter.patch("/:id/cancel", requireRole("TENANT"), async (request, response, next) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, tenant: request.user!.id, status: { $in: ["PENDING", "ACCEPTED"] } },
      { $set: { status: "CANCELLED" }, $push: { statusHistory: { status: "CANCELLED", changedAt: new Date() } } },
      { new: true },
    );
    if (!booking) {
      response.status(404).json({ error: "Eligible booking not found" });
      return;
    }
    const releasedRoom = await Room.findOneAndUpdate(
      { _id: booking.room, activeBooking: booking._id },
      { $set: { available: true }, $unset: { activeBooking: 1 } },
    );
    if (releasedRoom) {
      await invalidateRoomSearchCache();
    }
    response.json({ booking });
  } catch (error) {
    next(error);
  }
});
