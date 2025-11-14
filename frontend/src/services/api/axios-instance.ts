/**
 * Axios Instance Configuration
 *
 * Configured Axios instance with interceptors for authentication,
 * token refresh, and error handling.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Axios instance with default configuration
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add authentication token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('docpat-access-token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling and token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the access token
        const refreshToken = localStorage.getItem('docpat-refresh-token');

        if (!refreshToken) {
          // No refresh token available, redirect to login
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        const { tokens } = response.data;

        // Update stored tokens
        localStorage.setItem('docpat-access-token', tokens.access_token);
        localStorage.setItem('docpat-refresh-token', tokens.refresh_token);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('docpat-access-token');
        localStorage.removeItem('docpat-refresh-token');
        localStorage.removeItem('docpat-user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
