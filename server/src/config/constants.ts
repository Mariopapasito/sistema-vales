// User roles
export enum UserRole {
  ESTACIONES = 'estaciones',
  SISTEMAS = 'sistemas',
  JEFE = 'jefe',
  COMPRAS = 'compras'
}

// Order status
export enum OrderStatus {
  SIN_INICIAR = 'sin_iniciar',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada'
}

// Order priorities
export enum Priority {
  ALTA = 'alta',
  BAJA = 'baja',
  PARO = 'paro',
  CORRECTIVO = 'correctivo'
}

// Role permissions
export const ROLE_PERMISSIONS = {
  [UserRole.ESTACIONES]: {
    canCreateOrder: true,
    canViewAllOrders: false,
    canChangeStatus: false,
    canViewCalendar: false,
    canManageCalendar: false,
    canManageUsers: false
  },
  [UserRole.SISTEMAS]: {
    canCreateOrder: true,
    canViewAllOrders: true,
    canChangeStatus: true,
    canViewCalendar: true,
    canManageCalendar: true,
    canManageUsers: false
  },
  [UserRole.JEFE]: {
    canCreateOrder: true,
    canViewAllOrders: true,
    canChangeStatus: true,
    canViewCalendar: true,
    canManageCalendar: true,
    canManageUsers: true
  },
  [UserRole.COMPRAS]: {
    canCreateOrder: false,
    canViewAllOrders: true,
    canChangeStatus: false,
    canViewCalendar: false,
    canManageCalendar: false,
    canManageUsers: false
  }
};

// Status colors for frontend
export const STATUS_COLORS = {
  [OrderStatus.SIN_INICIAR]: '#ef4444', // red
  [OrderStatus.EN_PROCESO]: '#f59e0b', // yellow
  [OrderStatus.COMPLETADA]: '#22c55e'  // green
};

// Priority colors for frontend
export const PRIORITY_COLORS = {
  [Priority.ALTA]: '#ef4444',
  [Priority.BAJA]: '#22c55e',
  [Priority.PARO]: '#8b5cf6',
  [Priority.CORRECTIVO]: '#3b82f6'
};