/**
 * User Management Hooks
 *
 * React Query hooks for user management operations.
 * Provides declarative data fetching and mutations with caching.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  ResetPasswordRequest,
  UserListQuery,
  UserListResponse,
} from '@/types/user';

/**
 * Query keys for user-related data
 * Following React Query best practices for key structure
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserListQuery) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Fetch all users with pagination and filters
 *
 * @param params - Query parameters for filtering and pagination
 * @param options - Additional React Query options
 * @returns Query result with paginated users
 */
export function useUsers(
  params?: UserListQuery,
  options?: Omit<UseQueryOptions<UserListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UserListResponse>({
    queryKey: userKeys.list(params || {}),
    queryFn: () => usersApi.getAll(params),
    ...options,
  });
}

/**
 * Fetch a single user by ID
 *
 * @param id - User UUID
 * @param options - Additional React Query options
 * @returns Query result with user details
 */
export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery<User>({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Create a new user
 *
 * @returns Mutation for creating a user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: (newUser) => {
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      // Set the new user in cache
      queryClient.setQueryData(userKeys.detail(newUser.id), newUser);
    },
  });
}

/**
 * Update an existing user
 *
 * @returns Mutation for updating a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: (updatedUser) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Activate a user
 *
 * @returns Mutation for activating a user
 */
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: (updatedUser) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Deactivate a user
 *
 * @returns Mutation for deactivating a user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: (updatedUser) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Assign role to a user
 *
 * @returns Mutation for assigning a role
 */
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignRoleRequest }) =>
      usersApi.assignRole(id, data),
    onSuccess: (updatedUser) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Reset user password
 *
 * @returns Mutation for resetting password
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetPasswordRequest }) =>
      usersApi.resetPassword(id, data),
  });
}

/**
 * Reset user MFA
 *
 * @returns Mutation for resetting MFA
 */
export function useResetMfa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.resetMfa(id),
    onSuccess: (updatedUser) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
