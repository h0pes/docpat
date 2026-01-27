/**
 * Auth Store Tests
 *
 * Tests for authentication context provider and useAuth hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../authStore';
import { authApi } from '@/services/api/auth';
import type { User } from '@/types/auth';

// Mock the auth API
vi.mock('@/services/api/auth', () => ({
  authApi: {
    logout: vi.fn(),
  },
}));

// Mock user data
const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'DOCTOR',
  is_active: true,
  mfa_enabled: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAccessToken = 'mock-access-token';
const mockRefreshToken = 'mock-refresh-token';

// Wrapper component for hook tests
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial unauthenticated state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should set user and tokens on login', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.accessToken).toBe(mockAccessToken);
      expect(result.current.refreshToken).toBe(mockRefreshToken);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should persist auth data to localStorage', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(localStorage.getItem('docpat-access-token')).toBe(mockAccessToken);
      expect(localStorage.getItem('docpat-refresh-token')).toBe(mockRefreshToken);
      expect(localStorage.getItem('docpat-user')).toBe(JSON.stringify(mockUser));
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      vi.mocked(authApi.logout).mockResolvedValue();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First login
      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call backend logout API', async () => {
      vi.mocked(authApi.logout).mockResolvedValue();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(authApi.logout).toHaveBeenCalledWith(mockAccessToken);
    });

    it('should clear localStorage on logout', async () => {
      vi.mocked(authApi.logout).mockResolvedValue();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('docpat-access-token')).toBeNull();
      expect(localStorage.getItem('docpat-refresh-token')).toBeNull();
      expect(localStorage.getItem('docpat-user')).toBeNull();
    });

    it('should still logout locally if backend call fails', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('updateTokens', () => {
    it('should update tokens', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      act(() => {
        result.current.updateTokens(newAccessToken, newRefreshToken);
      });

      expect(result.current.accessToken).toBe(newAccessToken);
      expect(result.current.refreshToken).toBe(newRefreshToken);
    });

    it('should persist new tokens to localStorage when user exists', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      act(() => {
        result.current.updateTokens(newAccessToken, newRefreshToken);
      });

      expect(localStorage.getItem('docpat-access-token')).toBe(newAccessToken);
      expect(localStorage.getItem('docpat-refresh-token')).toBe(newRefreshToken);
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      const updatedUser = { ...mockUser, first_name: 'Updated' };

      act(() => {
        result.current.updateUser(updatedUser);
      });

      expect(result.current.user?.first_name).toBe('Updated');
    });

    it('should persist updated user to localStorage', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      const updatedUser = { ...mockUser, first_name: 'Updated' };

      act(() => {
        result.current.updateUser(updatedUser);
      });

      const storedUser = JSON.parse(localStorage.getItem('docpat-user') || '{}');
      expect(storedUser.first_name).toBe('Updated');
    });
  });

  describe('setLoading', () => {
    it('should set loading state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should load auth from localStorage on mount', async () => {
      // Pre-populate localStorage
      localStorage.setItem('docpat-access-token', mockAccessToken);
      localStorage.setItem('docpat-refresh-token', mockRefreshToken);
      localStorage.setItem('docpat-user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.accessToken).toBe(mockAccessToken);
      expect(result.current.refreshToken).toBe(mockRefreshToken);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Pre-populate localStorage with corrupted data
      localStorage.setItem('docpat-access-token', mockAccessToken);
      localStorage.setItem('docpat-refresh-token', mockRefreshToken);
      localStorage.setItem('docpat-user', 'not-valid-json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not crash, but auth state will be empty
      expect(result.current.isAuthenticated).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle missing localStorage data', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should require both user and accessToken for isAuthenticated', async () => {
      // Only set accessToken, no user
      localStorage.setItem('docpat-access-token', mockAccessToken);
      localStorage.setItem('docpat-refresh-token', mockRefreshToken);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
