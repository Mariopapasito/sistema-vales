import api from './api';

let refreshTokenTimeout: NodeJS.Timeout | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;

export const scheduleTokenRefresh = (token: string) => {
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    
    // Refresh 2 minutes before expiry
    const refreshTime = expiresIn - 120000;
    
    if (refreshTime > 0) {
      refreshTokenTimeout = setTimeout(async () => {
        await attemptRefresh();
      }, refreshTime);
    } else if (expiresIn > 0) {
      // Token about to expire — refresh immediately
      setTimeout(attemptRefresh, 0);
    }
  } catch (error) {
    console.error('Error scheduling token refresh:', error);
  }
};

const attemptRefresh = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    const response = await api.post('/auth/refresh-token', { refreshToken });

    localStorage.setItem('accessToken', response.data.accessToken);
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }

    retryCount = 0; // reset on success

    window.dispatchEvent(new CustomEvent('tokenRefreshed', {
      detail: { accessToken: response.data.accessToken }
    }));

    scheduleTokenRefresh(response.data.accessToken);
  } catch (error: any) {
    // Network error — retry up to MAX_RETRIES before giving up
    const isNetworkError = !error.response;
    if (isNetworkError && retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.min(30000 * retryCount, 120000); // 30s, 60s, 120s
      console.warn(`Token refresh failed (network), retrying in ${delay / 1000}s...`);
      refreshTokenTimeout = setTimeout(attemptRefresh, delay);
    } else {
      // Refresh token expired (401) — only then force logout
      console.error('Token refresh failed permanently:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }
};

export const clearTokenRefreshTimeout = () => {
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
    refreshTokenTimeout = null;
  }
};
