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
    // Transform to snake_case for backend
    const requestBody = {
      username: credentials.username,
      password: credentials.password,
      mfa_code: credentials.mfaCode,
    };
    const response = await apiClient.post<LoginResponse>(
      '/api/v1/auth/login',
      requestBody
    );
    return response.data;
  },

  /**
   * Logout current user
   *
   * @param refreshToken - Refresh token to invalidate
   */
  logout: async (accessToken: string): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout', { access_token: accessToken });
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
   * @param userId - User ID to setup MFA for
   * @returns MFA setup data including QR code, secret, and backup codes
   */
  setupMfa: async (userId: string): Promise<{
    secret: string;
    qr_code: string;
    totp_uri: string;
    backup_codes: string[];
  }> => {
    const response = await apiClient.post('/api/v1/auth/mfa/setup', { user_id: userId });
    return response.data;
  },

  /**
   * Enroll/enable MFA with verification code
   *
   * @param userId - User ID to enroll MFA for
   * @param secret - TOTP secret from setup step
   * @param code - MFA verification code from authenticator app
   * @param backupCodes - Backup codes from setup step
   */
  enrollMfa: async (
    userId: string,
    secret: string,
    code: string,
    backupCodes: string[]
  ): Promise<{ message: string; mfa_enabled: boolean }> => {
    const response = await apiClient.post('/api/v1/auth/mfa/enroll', {
      user_id: userId,
      secret,
      code,
      backup_codes: backupCodes,
    });
    return response.data;
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
