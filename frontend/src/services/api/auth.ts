/**
 * Authentication API Service
 *
 * API methods for user authentication, including login, logout, MFA, and token refresh.
 */

import { apiClient } from './axios-instance';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../../types/auth';

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Login with username and password
   *
   * @param credentials - Username, password, and optional MFA code
   * @returns Login response with tokens and user data
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/api/v1/auth/login',
      credentials
    );
    return response.data;
  },

  /**
   * Logout current user
   *
   * @param refreshToken - Refresh token to invalidate
   */
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout', { refreshToken });
  },

  /**
   * Refresh access token using refresh token
   *
   * @param request - Refresh token request
   * @returns New access and refresh tokens
   */
  refreshToken: async (
    request: RefreshTokenRequest
  ): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>(
      '/api/v1/auth/refresh',
      request
    );
    return response.data;
  },

  /**
   * Setup MFA (get QR code and backup codes)
   *
   * @returns MFA setup data including QR code URI and backup codes
   */
  setupMfa: async (): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> => {
    const response = await apiClient.post('/api/v1/auth/mfa/setup');
    return response.data;
  },

  /**
   * Enroll/enable MFA with verification code
   *
   * @param code - MFA verification code
   */
  enrollMfa: async (code: string): Promise<void> => {
    await apiClient.post('/api/v1/auth/mfa/enroll', { code });
  },

  /**
   * Verify MFA code during login
   *
   * @param data - Username and MFA code
   * @returns Login response with tokens and user data
   */
  verifyMfa: async (data: { username: string; code: string }): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/api/v1/auth/mfa/verify',
      data
    );
    return response.data;
  },

  /**
   * Request password reset
   *
   * @param data - Email address to send reset link to
   */
  forgotPassword: async (data: { email: string }): Promise<void> => {
    await apiClient.post('/api/v1/auth/forgot-password', data);
  },

  /**
   * Reset password with token
   *
   * @param data - New password and reset token
   */
  resetPassword: async (data: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> => {
    await apiClient.post('/api/v1/auth/reset-password', data);
  },
};
