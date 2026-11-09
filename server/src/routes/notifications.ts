import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { Notification } from '../models/Notification.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (request, response, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: request.userId }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: request.userId, readAt: null }),
    ]);
    response.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/:id/read', async (request, response, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: request.params.id, userId: request.userId, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) {
      response.status(404).json({ success: false, message: 'Unread notification not found' });
      return;
    }
    response.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});
