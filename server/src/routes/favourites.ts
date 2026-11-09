import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { Favourite } from '../models/Favourite.js';
import { Room } from '../models/Room.js';

export const favouritesRouter = Router();
favouritesRouter.use(requireAuth);

favouritesRouter.get('/', async (request, response, next) => {
  try {
    const favourites = await Favourite.find({ userId: request.userId })
      .populate({ path: 'roomId', match: { status: 'active' }, select: 'title city locality images rent deposit roomType furnishing ownerName' })
      .sort({ createdAt: -1 })
      .lean();
    response.json({ success: true, data: favourites.filter((item) => item.roomId) });
  } catch (error) {
    next(error);
  }
});

favouritesRouter.post('/', async (request, response, next) => {
  const parsed = z.object({ roomId: z.string().regex(/^[a-f\d]{24}$/i) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ success: false, message: 'A valid room ID is required' });
    return;
  }
  try {
    if (!await Room.exists({ _id: parsed.data.roomId, status: 'active' })) {
      response.status(404).json({ success: false, message: 'Room is not available' });
      return;
    }
    const favourite = await Favourite.findOneAndUpdate(
      { userId: request.userId, roomId: parsed.data.roomId },
      { $setOnInsert: { userId: request.userId, roomId: parsed.data.roomId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    response.status(201).json({ success: true, data: favourite });
  } catch (error) {
    next(error);
  }
});

favouritesRouter.delete('/:roomId', async (request, response, next) => {
  try {
    const favourite = await Favourite.findOneAndDelete({ userId: request.userId, roomId: request.params.roomId });
    if (!favourite) {
      response.status(404).json({ success: false, message: 'Favourite not found' });
      return;
    }
    response.json({ success: true, message: 'Room removed from favourites' });
  } catch (error) {
    next(error);
  }
});
