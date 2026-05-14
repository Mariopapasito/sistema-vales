import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CalendarState, CalendarEvent, CreateEventData } from '../../types';
import { API_ENDPOINTS } from '../../utils/constants';
import api from '../../services/api';

const initialState: CalendarState = {
  events: [],
  isLoading: false,
  error: null
};

// Async thunks
export const fetchEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async (
    params: { start?: string; end?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.start) queryParams.append('start', params.start);
      if (params.end) queryParams.append('end', params.end);

      const response = await api.get(`${API_ENDPOINTS.CALENDAR}?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar eventos');
    }
  }
);

export const createEvent = createAsyncThunk(
  'calendar/createEvent',
  async (eventData: CreateEventData, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.CALENDAR, eventData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear evento');
    }
  }
);

export const updateEvent = createAsyncThunk(
  'calendar/updateEvent',
  async (
    { id, data }: { id: string; data: Partial<CreateEventData> },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`${API_ENDPOINTS.CALENDAR}/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar evento');
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`${API_ENDPOINTS.CALENDAR}/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar evento');
    }
  }
);

export const moveEvent = createAsyncThunk(
  'calendar/moveEvent',
  async (
    { id, fechaInicio, fechaFin }: { id: string; fechaInicio: string; fechaFin: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`${API_ENDPOINTS.CALENDAR}/${id}/move`, {
        fechaInicio,
        fechaFin
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al mover evento');
    }
  }
);

// Slice
const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch events
    builder.addCase(fetchEvents.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      state.isLoading = false;
      state.events = action.payload;
    });
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create event
    builder.addCase(createEvent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createEvent.fulfilled, (state, action) => {
      state.isLoading = false;
      state.events.push(action.payload);
    });
    builder.addCase(createEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update event
    builder.addCase(updateEvent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.events.findIndex(e => e._id === action.payload._id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    });
    builder.addCase(updateEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete event
    builder.addCase(deleteEvent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.isLoading = false;
      state.events = state.events.filter(e => e._id !== action.payload);
    });
    builder.addCase(deleteEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Move event
    builder.addCase(moveEvent.fulfilled, (state, action) => {
      const index = state.events.findIndex(e => e._id === action.payload._id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    });
  }
});

export const { clearError } = calendarSlice.actions;
export default calendarSlice.reducer;