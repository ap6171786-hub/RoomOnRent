import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getCachedJson, invalidateRoomSearchCache, setCachedJson } from '../config/redis.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

export const roomsRouter = Router();

const querySchema = z.object({
  city: z.string().trim().max(80).optional(),
  roomType: z.enum(['Single Room', 'Double Sharing', 'Triple Sharing', 'PG', '1 BHK', '2 BHK', '3 BHK', 'Flat/Apartment']).optional(),
  q: z.string().trim().max(100).optional(),
  minRent: z.coerce.number().nonnegative().optional(),
  maxRent: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(30).default(9),
});

const roomInputSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(3000),
  rent: z.number().positive().max(1_000_000),
  deposit: z.number().min(0).max(10_000_000),
  roomType: z.enum(['Single Room', 'Double Sharing', 'Triple Sharing', 'PG', '1 BHK', '2 BHK', '3 BHK', 'Flat/Apartment']),
  propertyType: z.enum(['Apartment', 'Independent House', 'PG', 'Villa', 'Studio']),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(100),
  address: z.string().trim().min(4).max(300),
  images: z.array(z.string().url()).max(10),
  amenities: z.array(z.string().trim().min(1).max(50)).max(30),
  furnishing: z.enum(['Furnished', 'Semi-furnished', 'Unfurnished']),
  availableFrom: z.coerce.date(),
  maxOccupants: z.number().int().min(1).max(20),
  rules: z.array(z.string().trim().min(1).max(200)).max(30),
});

const roomUpdateSchema = roomInputSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

roomsRouter.post('/', requireAuth, async (request, response, next) => {
  try {
    const parsed = roomInputSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: 'Please check the listing details', errors: parsed.error.flatten() });
      return;
    }
    const owner = await User.findOne({ _id: request.userId, accountStatus: 'active' }).select('name');
    if (!owner) {
      response.status(401).json({ success: false, message: 'Account is unavailable' });
      return;
    }
    const room = await Room.create({ ...parsed.data, ownerId: owner._id, ownerName: owner.name });
    void invalidateRoomSearchCache();
    response.status(201).json({ success: true, message: 'Listing created', data: room });
  } catch (error) {
    next(error);
  }
});

roomsRouter.get('/', async (request, response, next) => {
  try {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: 'Invalid room search filters', errors: parsed.error.flatten() });
      return;
    }

    const { city, roomType, q, minRent, maxRent, page, limit } = parsed.data;
    const cacheKey = `rooms:search:${createHash('sha256').update(JSON.stringify({ city: city?.toLowerCase(), roomType, q, minRent, maxRent, page, limit })).digest('hex')}`;
    const cached = await getCachedJson(cacheKey);
    if (cached) {
      response.json(cached);
      return;
    }

    const filter: Record<string, unknown> = { status: 'active' };
    if (city) filter.city = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (roomType) filter.roomType = roomType;
    if (q) filter.$text = { $search: q };
    if (minRent !== undefined || maxRent !== undefined) {
      filter.rent = {
        ...(minRent !== undefined ? { $gte: minRent } : {}),
        ...(maxRent !== undefined ? { $lte: maxRent } : {}),
      };
    }

    const [rooms, total] = await Promise.all([
      Room.find(filter).select('-address').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Room.countDocuments(filter),
    ]);

    const result = {
      success: true,
      data: rooms,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
    await setCachedJson(cacheKey, result, 45);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

roomsRouter.get('/mine', requireAuth, async (request, response, next) => {
  try {
    const rooms = await Room.find({ ownerId: request.userId, status: { $ne: 'inactive' } }).sort({ createdAt: -1 }).lean();
    response.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
});

roomsRouter.patch('/:id', requireAuth, async (request, response, next) => {
  try {
    const parsed = roomUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: 'Please check the listing details', errors: parsed.error.flatten() });
      return;
    }
    const room = await Room.findOneAndUpdate(
      { _id: request.params.id, ownerId: request.userId },
      { $set: parsed.data },
      { new: true, runValidators: true },
    ).select('-address');
    if (!room) {
      response.status(404).json({ success: false, message: 'Listing not found or you do not have permission to edit it' });
      return;
    }
    void invalidateRoomSearchCache();
    response.json({ success: true, message: 'Listing updated', data: room });
  } catch (error) {
    next(error);
  }
});

roomsRouter.delete('/:id', requireAuth, async (request, response, next) => {
  try {
    const room = await Room.findOneAndUpdate(
      { _id: request.params.id, ownerId: request.userId, status: { $ne: 'inactive' } },
      { $set: { status: 'inactive' } },
      { new: true },
    ).select('_id');
    if (!room) {
      response.status(404).json({ success: false, message: 'Listing not found or already removed' });
      return;
    }
    void invalidateRoomSearchCache();
    response.json({ success: true, message: 'Listing archived' });
  } catch (error) {
    next(error);
  }
});

roomsRouter.get('/:id', async (request, response, next) => {
  try {
    const room = await Room.findOne({ _id: request.params.id, status: 'active' }).select('-address').lean();
    if (!room) {
      response.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    response.json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
});
