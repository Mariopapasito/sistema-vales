import { useEffect, useState } from 'react';
import api from '../services/api';

export interface INotification {
  id: number;
  tipo: 'NEW_ORDER' | 'ORDER_STATUS_CHANGED' | 'CALENDAR_EVENT' | 'SYSTEM' | 'MENTION';
  titulo: string;
  mensaje: string;
  datos?: any;
  leida: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Obtener notificaciones
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener contador de no leídas
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/count/unread');
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Marcar como leída
  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, leida: true } : n
      ));
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Eliminar notificación
  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Inicializar
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Recargar cada 30 segundos
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};
