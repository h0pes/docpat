/**
 * Users API Service Tests
 *
 * Tests for user management API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersApi } from '../users';
import { apiClient } from '../axios-instance';
import type { User, UserListResponse } from '@/types/user';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

const mockUserList: UserListResponse = {
  users: [mockUser],
  total: 1,
  page: 1,
  page_size: 20,
};

describe('usersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all users with default params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUserList });

      const result = await usersApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users', {
        params: {
          limit: 20,
          offset: 0,
          role: undefined,
          is_active: undefined,
          search: undefined,
        },
      });
      expect(result).toEqual(mockUserList);
    });

    it('should fetch users with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUserList });

      await usersApi.getAll({
        limit: 10,
        offset: 20,
        role: 'ADMIN',
        is_active: true,
        search: 'test',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users', {
        params: {
          limit: 10,
          offset: 20,
          role: 'ADMIN',
          is_active: true,
          search: 'test',
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(usersApi.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    it('should fetch user by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

      const result = await usersApi.getById('user-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users/user-1');
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('User not found'));

      await expect(usersApi.getById('invalid-id')).rejects.toThrow('User not found');
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUser });

      const createData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        role: 'DOCTOR' as const,
      };

      const result = await usersApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users', createData);
      expect(result).toEqual(mockUser);
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Username already exists'));

      await expect(
        usersApi.create({
          username: 'existing',
          email: 'test@example.com',
          password: 'password',
          first_name: 'Test',
          last_name: 'User',
          role: 'DOCTOR',
        })
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, first_name: 'Updated' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedUser });

      const result = await usersApi.update('user-1', { first_name: 'Updated' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/users/user-1', {
        first_name: 'Updated',
      });
      expect(result.first_name).toBe('Updated');
    });
  });

  describe('activate', () => {
    it('should activate user successfully', async () => {
      const activeUser = { ...mockUser, is_active: true };
      vi.mocked(apiClient.post).mockResolvedValue({ data: activeUser });

      const result = await usersApi.activate('user-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/user-1/activate');
      expect(result.is_active).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user successfully', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      vi.mocked(apiClient.post).mockResolvedValue({ data: inactiveUser });

      const result = await usersApi.deactivate('user-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/user-1/deactivate');
      expect(result.is_active).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('should assign role successfully', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: adminUser });

      const result = await usersApi.assignRole('user-1', { role: 'ADMIN' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/user-1/role', {
        role: 'ADMIN',
      });
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await usersApi.resetPassword('user-1', { new_password: 'NewPassword123!' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/user-1/reset-password', {
        new_password: 'NewPassword123!',
      });
    });
  });

  describe('resetMfa', () => {
    it('should reset MFA successfully', async () => {
      const userWithMfaDisabled = { ...mockUser, mfa_enabled: false };
      vi.mocked(apiClient.post).mockResolvedValue({ data: userWithMfaDisabled });

      const result = await usersApi.resetMfa('user-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/user-1/reset-mfa');
      expect(result.mfa_enabled).toBe(false);
    });
  });
});
