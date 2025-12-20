/**
 * Users API Service
 *
 * API methods for user management operations.
 * All endpoints require ADMIN role (except get own user).
 */

import { apiClient } from './axios-instance';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  ResetPasswordRequest,
  UserListQuery,
  UserListResponse,
} from '../../types/user';

/**
 * Users API endpoints
 * Base path: /api/v1/users
 */
export const usersApi = {
  /**
   * List all users with pagination and filters (ADMIN only)
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of users
   */
  getAll: async (params?: UserListQuery): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/api/v1/users', {
      params: {
        limit: params?.limit || 20,
        offset: params?.offset || 0,
        role: params?.role,
        is_active: params?.is_active,
        search: params?.search,
      },
    });
    return response.data;
  },

  /**
   * Get user by ID (ADMIN or own user)
   *
   * @param id - User UUID
   * @returns User details
   */
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/api/v1/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user (ADMIN only)
   *
   * @param data - User creation data
   * @returns Created user
   */
  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<User>('/api/v1/users', data);
    return response.data;
  },

  /**
   * Update user (ADMIN or own user with restrictions)
   * Note: Only admins can change roles
   *
   * @param id - User UUID
   * @param data - User update data
   * @returns Updated user
   */
  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put<User>(`/api/v1/users/${id}`, data);
    return response.data;
  },

  /**
   * Activate user (ADMIN only)
   *
   * @param id - User UUID
   * @returns Updated user
   */
  activate: async (id: string): Promise<User> => {
    const response = await apiClient.post<User>(`/api/v1/users/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate user (ADMIN only)
   *
   * @param id - User UUID
   * @returns Updated user
   */
  deactivate: async (id: string): Promise<User> => {
    const response = await apiClient.post<User>(
      `/api/v1/users/${id}/deactivate`
    );
    return response.data;
  },

  /**
   * Assign role to user (ADMIN only)
   *
   * @param id - User UUID
   * @param data - Role assignment data
   * @returns Updated user
   */
  assignRole: async (id: string, data: AssignRoleRequest): Promise<User> => {
    const response = await apiClient.post<User>(
      `/api/v1/users/${id}/role`,
      data
    );
    return response.data;
  },

  /**
   * Reset user password (ADMIN only)
   *
   * @param id - User UUID
   * @param data - New password data
   */
  resetPassword: async (
    id: string,
    data: ResetPasswordRequest
  ): Promise<void> => {
    await apiClient.post(`/api/v1/users/${id}/reset-password`, data);
  },

  /**
   * Reset user MFA (ADMIN only)
   *
   * Clears MFA secret and backup codes, disabling MFA for the user.
   * The user will need to re-enroll in MFA.
   *
   * @param id - User UUID
   * @returns Updated user with mfa_enabled: false
   */
  resetMfa: async (id: string): Promise<User> => {
    const response = await apiClient.post<User>(`/api/v1/users/${id}/reset-mfa`);
    return response.data;
  },
};
