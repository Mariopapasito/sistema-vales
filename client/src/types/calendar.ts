export interface CalendarEvent {
  _id: string;
  titulo: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin: string;
  color: string;
  responsable?: {
    _id: string;
    nombre: string;
  };
  creadoPor: {
    _id: string;
    nombre: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
}

export interface CreateEventData {
  titulo: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin: string;
  color?: string;
  responsable?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  _id: string;
}