import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { scheduleTokenRefresh, clearTokenRefreshTimeout } from '../../services/tokenService';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'jefe' | 'sistemas' | 'estacion' | 'compras';
  estacion: string;
  foto?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  loading: false,
  error: null,
  initialized: false,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      scheduleTokenRefresh(accessToken);
      return { accessToken, refreshToken, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
    }
  }
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const accessToken = state.auth.accessToken || localStorage.getItem('accessToken');

      if (!accessToken) {
        return rejectWithValue('No token found');
      }

      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (accessToken) {
        scheduleTokenRefresh(accessToken);
      }
      return { user: response.data };
    } catch (error: any) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return rejectWithValue('Session expired');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      clearTokenRefreshTimeout();
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.initialized = true;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.initialized = true;
      })
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.initialized = true;
      });
  },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
