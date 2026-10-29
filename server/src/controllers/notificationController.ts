import { Response } from 'express';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { parsePagination } from '../utils/pagination.js';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const pagination = parsePagination(req.query.page, req.query.limit, 50);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Notification.countDocuments({ recipient: req.user._id }),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);

  res.json({
    success: true,
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      pages: Math.ceil(total / pagination.limit),
    },
  });
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;

  if (id === 'all') {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
    return;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { read: true },
    { new: true },
  );
  if (!notification) {
    res.status(404).json({ success: false, message: 'Notification not found.' });
    return;
  }
  res.json({ success: true, message: 'Notification marked as read.' });
}
