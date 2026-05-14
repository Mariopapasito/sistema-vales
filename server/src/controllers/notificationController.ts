import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.findAll({
      where: { usuarioId: req.user?.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.count({ where: { usuarioId: req.user?.id, leida: false } });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.update(
      { leida: true },
      { where: { id: req.params.id, usuarioId: req.user?.id } }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.update({ leida: true }, { where: { usuarioId: req.user?.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.destroy({ where: { id: req.params.id, usuarioId: req.user?.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};
