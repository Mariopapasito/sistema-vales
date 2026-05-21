export enum OrderStatus {
  SIN_INICIAR = 'sin_iniciar',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada'
}

export enum Priority {
  ALTA = 'alta',
  BAJA = 'baja',
  PARO = 'paro',
  CORRECTIVO = 'correctivo'
}

export interface StatusHistory {
  estado: OrderStatus;
  fecha: string;
  usuario: {
    _id: string;
    nombre: string;
  };
  notas?: string;
}

export interface Order {
  _id: string;
  folio: string;
  fechaCreacion: string;
  usuario: {
    _id: string;
    nombre: string;
    email: string;
    estacion: string;
  };
  nombreUsuario: string;
  estacion: string;
  prioridad: Priority[];
  ubicacion: string;
  descripcionProblema: string;
  observaciones?: string;
  imagenes: string[];
  estado: OrderStatus;
  historialEstado: StatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    estado?: OrderStatus;
  };
  counts: {
    sin_iniciar: number;
    en_proceso: number;
    completada: number;
  };
}

export interface CreateOrderData {
  prioridad: Priority[];
  ubicacion?: string;
  descripcionProblema?: string;
  observaciones?: string;
  imagenes?: string[];
}

export interface UpdateStatusData {
  estado: OrderStatus;
  notas?: string;
}