import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { scheduleTokenRefresh, clearTokenRefreshTimeout } from '../../services/tokenService';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'jefe' | 'sistemas' | 'estacion' | 'compras' | 'almacen' | 'constructora' | 'marketing';
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
      let accessToken = state.auth.accessToken || localStorage.getItem('accessToken');
      const storedRefresh = state.auth.refreshToken || localStorage.getItem('refreshToken');

      if (!accessToken && !storedRefresh) {
        return rejectWithValue('No token found');
      }

      // Try /me with current access token
      try {
        if (accessToken) {
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          scheduleTokenRefresh(accessToken);
          return { user: response.data };
        }
      } catch (err: any) {
        // Only try refresh if it was actually an auth error (401/403), not a network error
        const isAuthError = err?.response?.status === 401 || err?.response?.status === 403;
        if (!isAuthError && err?.response) {
          // Server error (5xx), don't clear tokens — keep user logged in
          return rejectWithValue('server_error');
        }
        // Auth error or expired token — fall through to refresh
      }

      // Access token failed, try using refresh token to get a new one
      if (storedRefresh) {
        try {
          const refreshResponse = await api.post('/auth/refresh-token', { refreshToken: storedRefresh });
          const newAccessToken = refreshResponse.data.accessToken;
          const newRefreshToken = refreshResponse.data.refreshToken;

          localStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

          const meResponse = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });

          scheduleTokenRefresh(newAccessToken);
          return { user: meResponse.data, accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (refreshErr: any) {
          const isNetworkError = !refreshErr?.response;
          if (isNetworkError) {
            // Network down — don't log out, keep tokens in localStorage
            return rejectWithValue('network_error');
          }
          // True 401 on refresh — token really expired
        }
      }

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return rejectWithValue('Session expired');
    } catch (error: any) {
      const isNetworkError = !error?.response;
      if (isNetworkError) {
        return rejectWithValue('network_error');
      }
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
        if (action.payload.accessToken) {
          state.accessToken = action.payload.accessToken;
        }
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.loading = false;
        const reason = action.payload as string;
        // Network error — keep tokens, just mark as initialized so spinner goes away
        if (reason === 'network_error' || reason === 'server_error') {
          state.initialized = true;
          // Keep accessToken/refreshToken intact — user might still be "logged in"
          // but we don't have user data. Try to restore user from a retry.
          return;
        }
        // True session expiry or no tokens — clear everything
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.initialized = true;
      });
  },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
