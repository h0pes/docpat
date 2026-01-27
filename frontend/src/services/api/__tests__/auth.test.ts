/**
 * Auth API Service Tests
 *
 * Tests for authentication API endpoints including login, logout, MFA, and password reset.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi } from '../auth';
import { apiClient } from '../axios-instance';
import type { LoginResponse } from '@/types/auth';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

// Mock response data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'DOCTOR' as const,
  is_active: true,
  mfa_enabled: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

const mockLoginResponse: LoginResponse = {
  user: mockUser,
  tokens: mockTokens,
  mfa_required: false,
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockLoginResponse });

      const result = await authApi.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        username: 'testuser',
        password: 'password123',
        mfa_code: undefined,
      });
      expect(result).toEqual(mockLoginResponse);
    });

    it('should include MFA code when provided', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockLoginResponse });

      await authApi.login({
        username: 'testuser',
        password: 'password123',
        mfaCode: '123456',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        username: 'testuser',
        password: 'password123',
        mfa_code: '123456',
      });
    });

    it('should throw error on invalid credentials', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        authApi.login({ username: 'invalid', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authApi.logout('mock-access-token');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/logout', {
        access_token: 'mock-access-token',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshResponse = {
        tokens: mockTokens,
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: refreshResponse });

      const result = await authApi.refreshToken({ refreshToken: 'old-refresh-token' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result).toEqual(refreshResponse);
    });

    it('should throw error when refresh token is invalid', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid refresh token'));

      await expect(
        authApi.refreshToken({ refreshToken: 'invalid-token' })
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('setupMfa', () => {
    it('should setup MFA successfully', async () => {
      const mfaSetupResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        qr_code: 'data:image/png;base64,abc123',
        totp_uri: 'otpauth://totp/DocPat:testuser?secret=JBSWY3DPEHPK3PXP',
        backup_codes: ['ABCD1234', 'EFGH5678', 'IJKL9012'],
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: mfaSetupResponse });

      const result = await authApi.setupMfa('user-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/mfa/setup', {
        user_id: 'user-1',
      });
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.backup_codes).toHaveLength(3);
    });
  });

  describe('enrollMfa', () => {
    it('should enroll MFA successfully', async () => {
      const enrollResponse = { message: 'MFA enabled', mfa_enabled: true };
      vi.mocked(apiClient.post).mockResolvedValue({ data: enrollResponse });

      const result = await authApi.enrollMfa(
        'user-1',
        'JBSWY3DPEHPK3PXP',
        '123456',
        ['ABCD1234', 'EFGH5678']
      );

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/mfa/enroll', {
        user_id: 'user-1',
        secret: 'JBSWY3DPEHPK3PXP',
        code: '123456',
        backup_codes: ['ABCD1234', 'EFGH5678'],
      });
      expect(result.mfa_enabled).toBe(true);
    });

    it('should throw error on invalid MFA code', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid MFA code'));

      await expect(
        authApi.enrollMfa('user-1', 'secret', 'invalid', [])
      ).rejects.toThrow('Invalid MFA code');
    });
  });

  describe('verifyMfa', () => {
    it('should verify MFA code successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockLoginResponse });

      const result = await authApi.verifyMfa({
        username: 'testuser',
        code: '123456',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/mfa/verify', {
        username: 'testuser',
        code: '123456',
      });
      expect(result).toEqual(mockLoginResponse);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authApi.forgotPassword({ email: 'test@example.com' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
        email: 'test@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authApi.resetPassword({
        token: 'reset-token',
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        token: 'reset-token',
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
      });
    });

    it('should throw error on invalid reset token', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid or expired token'));

      await expect(
        authApi.resetPassword({
          token: 'invalid-token',
          password: 'newPassword123',
          confirmPassword: 'newPassword123',
        })
      ).rejects.toThrow('Invalid or expired token');
    });
  });
});
