import React, { useState } from 'react';
import { useNotifications, INotification } from '../hooks/useNotifications';
import {
  BellIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  MapPinIcon,
  XMarkIcon,
  AtSymbolIcon,
} from '@heroicons/react/24/outline';
import '../styles/Notifications.css';

export const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.leida)
    : notifications;

  const getNotificationIcon = (tipo: INotification['tipo']) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      NEW_ORDER: <ClipboardDocumentListIcon style={{ width: 18, height: 18 }} />,
      ORDER_STATUS_CHANGED: <ChartBarIcon style={{ width: 18, height: 18 }} />,
      CALENDAR_EVENT: <CalendarDaysIcon style={{ width: 18, height: 18 }} />,
      SYSTEM: <Cog6ToothIcon style={{ width: 18, height: 18 }} />,
      MENTION: <AtSymbolIcon style={{ width: 18, height: 18 }} />,
    };
    return iconMap[tipo] || <MapPinIcon style={{ width: 18, height: 18 }} />;
  };

  const handleNotificationClick = (notification: INotification) => {
    if (!notification.leida) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="notification-center">
      {/* Bell Icon */}
      <div className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
        <BellIcon className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="notification-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas ({notifications.length})
            </button>
            <button
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.leida ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.tipo)}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.titulo}</h4>
                    <p>{notification.mensaje}</p>
                    <small>{new Date(notification.createdAt).toLocaleString()}</small>
                  </div>
                  <button
                    className="notification-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <XMarkIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="notification-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;
