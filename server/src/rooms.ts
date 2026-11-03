import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "./auth.js";
import type { SortOrder } from "mongoose";
import { getCache, invalidateRoomSearchCache, setCache } from "./cache.js";
import { Booking, Room } from "./models.js";

const roomInput = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(4000),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(240),
  type: z.enum(["Single Room", "Double Sharing", "Triple Sharing", "PG", "1BHK", "2BHK"]),
  rent: z.coerce.number().positive().max(1_000_000),
  deposit: z.coerce.number().nonnegative().max(5_000_000),
  images: z.array(z.string().url()).max(10).default([]),
  amenities: z.array(z.string().trim().max(40)).max(30).default([]),
  furnished: z.boolean().default(true),
});

export const roomRouter = Router();

roomRouter.get("/", async (request, response, next) => {
  try {
    const cacheKey = `room-search:${request.originalUrl}`;
    const cached = await getCache<{ items: unknown[]; page: number; limit: number; total: number; pages: number }>(cacheKey);
    if (cached) {
      response.json(cached);
      return;
    }
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(24, Math.max(1, Number(request.query.limit) || 12));
    const filter: Record<string, unknown> = { available: true };
    if (typeof request.query.city === "string" && request.query.city.trim()) {
      filter.city = { $regex: request.query.city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    if (typeof request.query.type === "string" && ["Single Room", "Double Sharing", "Triple Sharing", "PG", "1BHK", "2BHK"].includes(request.query.type)) {
      filter.type = request.query.type;
    }
    const minRent = Number(request.query.minRent);
    const maxRent = Number(request.query.maxRent);
    if ((Number.isFinite(minRent) && minRent >= 0) || (Number.isFinite(maxRent) && maxRent > 0)) {
      filter.rent = {
        ...(Number.isFinite(minRent) && minRent >= 0 ? { $gte: minRent } : {}),
        ...(Number.isFinite(maxRent) && maxRent > 0 ? { $lte: maxRent } : {}),
      };
    }
    const sort: Record<string, SortOrder> = request.query.sort === "price-low" ? { rent: 1 } : request.query.sort === "price-high" ? { rent: -1 } : { createdAt: -1 };
    const [items, total] = await Promise.all([
      Room.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate("owner", "name").lean(),
      Room.countDocuments(filter),
    ]);
    const result = { items, page, limit, total, pages: Math.ceil(total / limit) };
    await setCache(cacheKey, result);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

roomRouter.get("/mine", requireAuth, requireRole("OWNER", "ADMIN"), async (request, response, next) => {
  try {
    const filter = request.user!.role === "ADMIN" ? {} : { owner: request.user!.id };
    const items = await Room.find(filter).sort({ createdAt: -1 }).lean();
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

roomRouter.get("/:id", async (request, response, next) => {
  try {
    const room = await Room.findById(request.params.id).populate("owner", "name").lean();
    if (!room) {
      response.status(404).json({ error: "Room not found" });
      return;
    }
    response.json({ room });
  } catch (error) {
    next(error);
  }
});

roomRouter.delete("/:id", requireAuth, requireRole("OWNER", "ADMIN"), async (request, response, next) => {
  try {
    const filter = request.user!.role === "ADMIN"
      ? { _id: request.params.id }
      : { _id: request.params.id, owner: request.user!.id };
    const activeBooking = await Booking.exists({ room: request.params.id, status: { $in: ["PENDING", "ACCEPTED", "CONFIRMED"] } });
    if (activeBooking) {
      response.status(409).json({ error: "This room has active booking requests and cannot be deleted yet" });
      return;
    }
    const room = await Room.findOneAndDelete(filter);
    if (!room) {
      response.status(404).json({ error: "Room not found or you do not own this listing" });
      return;
    }
    await invalidateRoomSearchCache();
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

roomRouter.post("/", requireAuth, requireRole("OWNER", "ADMIN"), async (request, response, next) => {
  try {
    const input = roomInput.parse(request.body);
    const room = await Room.create({ ...input, owner: request.user!.id, verifiedOwner: request.user!.role === "ADMIN" });
    await invalidateRoomSearchCache();
    response.status(201).json({ room });
  } catch (error) {
    next(error);
  }
});

roomRouter.patch("/:id", requireAuth, requireRole("OWNER", "ADMIN"), async (request, response, next) => {
  try {
    const input = roomInput.partial().extend({ available: z.boolean().optional() }).parse(request.body);
    const filter = request.user!.role === "ADMIN"
      ? { _id: request.params.id }
      : { _id: request.params.id, owner: request.user!.id };
    if (input.available === true && await Room.exists({ ...filter, activeBooking: { $exists: true, $ne: null } })) {
      response.status(409).json({ error: "This room is reserved by an active booking" });
      return;
    }
    const room = await Room.findOneAndUpdate(filter, { $set: input }, { new: true, runValidators: true });
    if (!room) {
      response.status(404).json({ error: "Room not found or you do not own this listing" });
      return;
    }
    await invalidateRoomSearchCache();
    response.json({ room });
  } catch (error) {
    next(error);
  }
});
