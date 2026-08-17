import express from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import NotificationService from '../services/notificationService';
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
router.post('/bitacora', async (req: AuthRequest, res) => {
  try {
    const { tipo, nombre, estacion, fecha, folio } = req.body || {};
    const createdBy = req.user;

    if (!createdBy) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!['station', 'weekly'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de bitácora inválido' });
    }

    const ns = new NotificationService();
    await ns.notifyByRoles(['jefe'], {
      tipo: 'NEW_ORDER',
      titulo: '📋 Nueva bitácora registrada',
      mensaje: `${createdBy.nombre} registró ${nombre || 'una bitácora'}${estacion ? ` para ${estacion}` : ''}${folio ? ` con folio ${folio}` : ''}`,
      datos: {
        tipo,
        nombre,
        estacion,
        fecha,
        folio,
        createdBy: createdBy.nombre,
      }
    }, createdBy.id);

    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('[Notification] Error creating bitacora notification:', error);
    return res.status(500).json({ message: 'Error al crear notificación de bitácora', error: error.message });
  }
});
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
