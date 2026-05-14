import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import { CalendarEvent, CreateEventData } from '@/types';

const calendarService = {
  getEvents: async (params?: { start?: string; end?: string }): Promise<CalendarEvent[]> => {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.append('start', params.start);
    if (params?.end) queryParams.append('end', params.end);

    const response = await api.get<CalendarEvent[]>(
      `${API_ENDPOINTS.CALENDAR}?${queryParams.toString()}`
    );
    return response.data;
  },

  getEventById: async (id: string): Promise<CalendarEvent> => {
    const response = await api.get<CalendarEvent>(`${API_ENDPOINTS.CALENDAR}/${id}`);
    return response.data;
  },

  createEvent: async (data: CreateEventData): Promise<CalendarEvent> => {
    const response = await api.post<CalendarEvent>(API_ENDPOINTS.CALENDAR, data);
    return response.data;
  },

  updateEvent: async (id: string, data: Partial<CreateEventData>): Promise<CalendarEvent> => {
    const response = await api.put<CalendarEvent>(`${API_ENDPOINTS.CALENDAR}/${id}`, data);
    return response.data;
  },

  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.CALENDAR}/${id}`);
  },

  moveEvent: async (
    id: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<CalendarEvent> => {
    const response = await api.put<CalendarEvent>(
      `${API_ENDPOINTS.CALENDAR}/${id}/move`,
      { fechaInicio, fechaFin }
    );
    return response.data;
  }
};

export default calendarService;