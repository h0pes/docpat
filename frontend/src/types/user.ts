/**
 * User Management Type Definitions
 *
 * Type definitions for user management operations.
 * These types align with the backend API in handlers/users.rs
 */

/**
 * User role in the system
 */
export type UserRole = 'ADMIN' | 'DOCTOR';

/**
 * User status for display purposes
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

/**
 * User response from API
 * Matches UserResponse struct in backend/src/handlers/users.rs
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  last_login: string | null;
}

/**
 * Request body for creating a new user
 * Matches CreateUserRequest in backend/src/handlers/users.rs
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

/**
 * Request body for updating a user
 * Matches UpdateUserRequest in backend/src/handlers/users.rs
 */
export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  /** Only admins can change roles */
  role?: UserRole;
}

/**
 * Request body for role assignment
 * Matches AssignRoleRequest in backend/src/handlers/users.rs
 */
export interface AssignRoleRequest {
  role: UserRole;
}

/**
 * Request body for password reset
 * Matches ResetPasswordRequest in backend/src/handlers/users.rs
 */
export interface ResetPasswordRequest {
  new_password: string;
}

/**
 * Query parameters for listing users
 * Matches ListUsersQuery in backend/src/handlers/users.rs
 */
export interface UserListQuery {
  limit?: number;
  offset?: number;
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

/**
 * List users response
 * Matches ListUsersResponse in backend/src/handlers/users.rs
 */
export interface UserListResponse {
  users: User[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Get computed user status from user data
 * @param user - User object
 * @returns UserStatus string
 */
export function getUserStatus(user: User): UserStatus {
  if (!user.is_active) {
    return 'INACTIVE';
  }
  // Note: locked_until is not exposed in the API response
  // If needed, backend would need to include this field
  return 'ACTIVE';
}

/**
 * Get user's full name
 * @param user - User object
 * @returns Full name string
 */
export function getUserFullName(user: User): string {
  return `${user.first_name} ${user.last_name}`.trim();
}

/**
 * Get user's initials for avatar
 * @param user - User object
 * @returns Initials string (e.g., "JD")
 */
export function getUserInitials(user: User): string {
  const first = user.first_name?.[0] || '';
  const last = user.last_name?.[0] || '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Format user's last login for display
 * @param lastLogin - ISO date string or null
 * @returns Formatted string
 */
export function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) {
    return 'Never';
  }
  const date = new Date(lastLogin);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
