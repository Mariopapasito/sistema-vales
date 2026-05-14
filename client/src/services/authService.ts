import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import { User, LoginCredentials } from '@/types';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post<{ accessToken: string }>(API_ENDPOINTS.AUTH.REFRESH, {
      refreshToken
    });
    return response.data;
  }
};

export default authService;