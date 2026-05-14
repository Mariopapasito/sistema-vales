import { OrderStatus, Priority, UserRole } from '@/types';

// User role labels
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ESTACIONES]: 'Estaciones',
  [UserRole.SISTEMAS]: 'Sistemas',
  [UserRole.JEFE]: 'Jefe',
  [UserRole.COMPRAS]: 'Compras'
};

// Order status labels
export const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.SIN_INICIAR]: 'Sin iniciar',
  [OrderStatus.EN_PROCESO]: 'En proceso',
  [OrderStatus.COMPLETADA]: 'Completada'
};

// Order status colors (Tailwind classes)
export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  [OrderStatus.SIN_INICIAR]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500'
  },
  [OrderStatus.EN_PROCESO]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500'
  },
  [OrderStatus.COMPLETADA]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500'
  }
};

// Priority labels
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.ALTA]: 'Alta',
  [Priority.BAJA]: 'Baja',
  [Priority.PARO]: 'Paro',
  [Priority.CORRECTIVO]: 'Correctivo'
};

// Priority colors (Tailwind classes)
export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  [Priority.ALTA]: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200'
  },
  [Priority.BAJA]: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  [Priority.PARO]: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  [Priority.CORRECTIVO]: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  }
};

// Calendar default colors
export const CALENDAR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
];

// Default event color
export const DEFAULT_EVENT_COLOR = '#3b82f6';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh'
  },
  ORDERS: {
    BASE: '/api/orders',
    COUNTS: '/api/orders/counts'
  },
  USERS: '/api/users',
  CALENDAR: '/api/calendar'
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20
};