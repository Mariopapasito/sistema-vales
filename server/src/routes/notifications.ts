import express from 'express';
import { protect } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} from '../controllers/notificationController';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/count/unread', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
