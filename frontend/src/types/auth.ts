/**
 * Authentication Type Definitions
 *
 * Type definitions for authentication-related data structures used throughout
 * the application.
 */

/**
 * User role in the system
 */
export type UserRole = 'ADMIN' | 'DOCTOR';

/**
 * User authentication data
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  mfaEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
  mfaCode?: string;
}

/**
 * Login response from API
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresMfa: boolean;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication context state
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
