/**
 * useUsers Hook Tests
 *
 * Tests for user management React Query hooks including
 * queries, mutations, and cache invalidation.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useActivateUser,
  useDeactivateUser,
  useAssignRole,
  useResetPassword,
  useResetMfa,
  userKeys,
} from '../useUsers';
import { usersApi } from '@/services/api';
import type { User, UserListResponse } from '@/types/user';

// Mock the users API
vi.mock('@/services/api', () => ({
  usersApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    assignRole: vi.fn(),
    resetPassword: vi.fn(),
    resetMfa: vi.fn(),
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

/**
 * Create a test query client
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for tests
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('userKeys', () => {
  it('should generate correct all key', () => {
    expect(userKeys.all).toEqual(['users']);
  });

  it('should generate correct lists key', () => {
    expect(userKeys.lists()).toEqual(['users', 'list']);
  });

  it('should generate correct list key with filters', () => {
    const filters = { role: 'ADMIN', is_active: true };
    expect(userKeys.list(filters)).toEqual(['users', 'list', filters]);
  });

  it('should generate correct details key', () => {
    expect(userKeys.details()).toEqual(['users', 'detail']);
  });

  it('should generate correct detail key with id', () => {
    expect(userKeys.detail('user-1')).toEqual(['users', 'detail', 'user-1']);
  });
});

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUserList);
  });

  it('should fetch users successfully', async () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUserList);
    expect(usersApi.getAll).toHaveBeenCalledWith(undefined);
  });

  it('should fetch users with filters', async () => {
    const params = { role: 'ADMIN' as const, is_active: true };

    const { result } = renderHook(() => useUsers(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should handle fetch error', async () => {
    const error = new Error('Network error');
    vi.mocked(usersApi.getAll).mockRejectedValue(error);

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should show loading state initially', () => {
    vi.mocked(usersApi.getAll).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);
  });

  it('should fetch user by id', async () => {
    const { result } = renderHook(() => useUser('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUser);
    expect(usersApi.getById).toHaveBeenCalledWith('user-1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useUser(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(usersApi.getById).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(usersApi.getById).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useUser('invalid-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.create).mockResolvedValue(mockUser);
  });

  it('should create user successfully', async () => {
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    const newUserData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
      role: 'DOCTOR' as const,
    };

    result.current.mutate(newUserData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.create).toHaveBeenCalledWith(newUserData);
    expect(result.current.data).toEqual(mockUser);
  });

  it('should handle create error', async () => {
    vi.mocked(usersApi.create).mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      username: 'invalid',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'DOCTOR',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.update).mockResolvedValue(mockUser);
  });

  it('should update user successfully', async () => {
    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    });

    const updateData = {
      id: 'user-1',
      data: { first_name: 'Updated' },
    };

    result.current.mutate(updateData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.update).toHaveBeenCalledWith('user-1', { first_name: 'Updated' });
  });
});

describe('useActivateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.activate).mockResolvedValue({ ...mockUser, is_active: true });
  });

  it('should activate user successfully', async () => {
    const { result } = renderHook(() => useActivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.activate).toHaveBeenCalledWith('user-1');
    expect(result.current.data?.is_active).toBe(true);
  });
});

describe('useDeactivateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.deactivate).mockResolvedValue({ ...mockUser, is_active: false });
  });

  it('should deactivate user successfully', async () => {
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.deactivate).toHaveBeenCalledWith('user-1');
    expect(result.current.data?.is_active).toBe(false);
  });
});

describe('useAssignRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.assignRole).mockResolvedValue({ ...mockUser, role: 'ADMIN' });
  });

  it('should assign role successfully', async () => {
    const { result } = renderHook(() => useAssignRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'user-1',
      data: { role: 'ADMIN' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.assignRole).toHaveBeenCalledWith('user-1', { role: 'ADMIN' });
    expect(result.current.data?.role).toBe('ADMIN');
  });
});

describe('useResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.resetPassword).mockResolvedValue({ success: true });
  });

  it('should reset password successfully', async () => {
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'user-1',
      data: { new_password: 'NewPassword123!' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.resetPassword).toHaveBeenCalledWith('user-1', {
      new_password: 'NewPassword123!',
    });
  });
});

describe('useResetMfa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.resetMfa).mockResolvedValue({ ...mockUser, mfa_enabled: false });
  });

  it('should reset MFA successfully', async () => {
    const { result } = renderHook(() => useResetMfa(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(usersApi.resetMfa).toHaveBeenCalledWith('user-1');
    expect(result.current.data?.mfa_enabled).toBe(false);
  });
});
