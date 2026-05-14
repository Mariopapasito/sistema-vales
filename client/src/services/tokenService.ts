import api from './api';

let refreshTokenTimeout: NodeJS.Timeout | null = null;

export const scheduleTokenRefresh = (token: string) => {
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    
    const refreshTime = expiresIn - 60000;
    
    if (refreshTime > 0) {
      refreshTokenTimeout = setTimeout(async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await api.post('/auth/refresh-token', {
              refreshToken
            });
            
            localStorage.setItem('accessToken', response.data.accessToken);
            if (response.data.refreshToken) {
              localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            
            window.dispatchEvent(new CustomEvent('tokenRefreshed', {
              detail: { accessToken: response.data.accessToken }
            }));
            
            scheduleTokenRefresh(response.data.accessToken);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }, refreshTime);
    }
  } catch (error) {
    console.error('Error scheduling token refresh:', error);
  }
};

export const clearTokenRefreshTimeout = () => {
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
    refreshTokenTimeout = null;
  }
};
