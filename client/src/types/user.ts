export enum UserRole {
  ESTACIONES = 'estaciones',
  ESTACION = 'estacion',
  ALMACEN = 'almacen',
  CONSTRUCTORA = 'constructora',
  SISTEMAS = 'sistemas',
  JEFE = 'jefe',
  MARKETING = 'marketing',
  COMPRAS = 'compras'
}

export interface User {
  _id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estacion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}