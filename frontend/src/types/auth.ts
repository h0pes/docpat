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
  rememberMe?: boolean;
}

/**
 * Token pair from backend
 */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

/**
 * Login response from API
 */
export interface LoginResponse {
  tokens: TokenPair;
  user: User;
  requiresMfa?: boolean;
  /** Indicates if MFA setup is required (global mfa_required setting is ON but user hasn't set up MFA) */
  requiresMfaSetup?: boolean;
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
  tokens: TokenPair;
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
