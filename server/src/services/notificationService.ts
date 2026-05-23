import Notification from '../models/Notification';
import User from '../models/User';
import { sendPushToRole, sendPushToUser } from '../routes/push';

interface NotificationData {
  tipo: 'NEW_ORDER' | 'ORDER_STATUS_CHANGED' | 'CALENDAR_EVENT' | 'SYSTEM';
  titulo: string;
  mensaje: string;
  datos?: any;
}

export class NotificationService {
  async notifyByRoles(
    roles: string[],
    notificationData: NotificationData,
    excludeUserId?: number
  ) {
    try {
      const { Op } = require('sequelize');
      const users = await User.findAll({
        where: { rol: { [Op.in]: roles } }
      });

      const targetUserIds = users
        .map((u: any) => u.id as number)
        .filter((id: number) => id !== excludeUserId);

      await this.createNotificationsForUsers(targetUserIds, notificationData);

      await sendPushToRole(
        roles,
        {
          titulo: notificationData.titulo.replace(/[^\w\s\-áéíóúÁÉÍÓÚñÑ]/g, ''),
          mensaje: notificationData.mensaje,
          tipo: notificationData.tipo,
          datos: notificationData.datos || {}
        },
        excludeUserId
      );
    } catch (error) {
      console.error('[NotificationService] Error notifyByRoles:', error);
    }
  }

  async createNotificationsForUsers(userIds: number[], notificationData: NotificationData) {
    try {
      const notifications = userIds.map((userId: number) => ({
        usuarioId: userId,
        tipo: notificationData.tipo,
        titulo: notificationData.titulo,
        mensaje: notificationData.mensaje,
        datos: notificationData.datos || {},
        leida: false
      }));

      await Notification.bulkCreate(notifications);
    } catch (error) {
      console.error('[NotificationService] Error creating notifications:', error);
    }
  }

  async notifyUser(userId: number, notificationData: NotificationData) {
    try {
      await Notification.create({
        usuarioId: userId,
        tipo: notificationData.tipo,
        titulo: notificationData.titulo,
        mensaje: notificationData.mensaje,
        datos: notificationData.datos || {},
        leida: false
      });

      // Also send push notification to this specific user
      await sendPushToUser(userId, {
        titulo: notificationData.titulo,
        mensaje: notificationData.mensaje,
        tipo: notificationData.tipo,
        datos: notificationData.datos || {}
      });
    } catch (error) {
      console.error('[NotificationService] Error notifying user:', error);
    }
  }

  async notifyNewOrder(order: any, createdByUser: any) {
    const notificationData: NotificationData = {
      tipo: 'NEW_ORDER',
      titulo: 'Nueva orden de trabajo',
      mensaje: `${createdByUser.nombre} creo una nueva orden de trabajo`,
      datos: {
        orderId: order.id,
        createdBy: createdByUser.nombre,
        prioridad: order.prioridad,
        descripcion: order.descripcionProblema
      }
    };

    await this.notifyByRoles(['sistemas', 'jefe'], notificationData, createdByUser.id);
  }

  async notifyOrderStatusChange(
    order: any,
    oldStatus: string,
    newStatus: string,
    changedBy: any
  ) {
    const statusLabels: { [key: string]: string } = {
      'sin-iniciar': 'Sin iniciar',
      'en-proceso': 'En proceso',
      'completada': 'Completada'
    };

    const notificationData: NotificationData = {
      tipo: 'ORDER_STATUS_CHANGED',
      titulo: 'Cambio de estado en orden',
      mensaje: `${changedBy.nombre} cambio una orden de ${statusLabels[oldStatus] || oldStatus} a ${statusLabels[newStatus] || newStatus}`,
      datos: {
        orderId: order.id,
        oldStatus,
        newStatus,
        changedBy: changedBy.nombre
      }
    };

    await this.notifyByRoles(['sistemas', 'jefe', 'estacion', 'almacen', 'constructora'], notificationData);
  }
}

export default NotificationService;
