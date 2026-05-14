import { UserRole, OrderStatus, Priority } from '../config/constants';
import { Request } from 'express';

// User types
export interface IUser {
  _id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estacion: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Order types
export interface IOrderHistory {
  estado: OrderStatus;
  fecha: Date;
  usuario: string;
  notas?: string;
}

export interface IOrder {
  _id: string;
  folio: string;
  fechaCreacion: Date;
  usuario: string;
  nombreUsuario: string;
  estacion: string;
  prioridad: Priority[];
  ubicacion: string;
  descripcionProblema: string;
  observaciones?: string;
  imagenes: string[];
  estado: OrderStatus;
  historialEstado: IOrderHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// Calendar types
export interface ICalendarEvent {
  _id: string;
  titulo: string;
  descripcion?: string;
  fechaInicio: Date;
  fechaFin: Date;
  color: string;
  responsable?: string;
  creadoPor: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    rol: string;
  };
}