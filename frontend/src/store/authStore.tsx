/**
 * Authentication Store
 *
 * Manages authentication state using React Context with localStorage persistence.
 * Provides login, logout, and token management functionality.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, AuthState } from '../types/auth';
import { authApi } from '../services/api/auth';

interface AuthContextType extends AuthState {
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'docpat-access-token',
  REFRESH_TOKEN: 'docpat-refresh-token',
  USER: 'docpat-user',
};

/**
 * Load authentication data from localStorage
 */
function loadAuthFromStorage(): Partial<AuthState> {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const user = userStr ? (JSON.parse(userStr) as User) : null;

    return {
      user,
      accessToken,
      refreshToken,
      isAuthenticated: !!(user && accessToken),
    };
  } catch (error) {
    console.error('Failed to load auth from storage:', error);
    return {};
  }
}

/**
 * Save authentication data to localStorage
 */
function saveAuthToStorage(
  user: User | null,
  accessToken: string | null,
  refreshToken: string | null
): void {
  try {
    if (user && accessToken && refreshToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } catch (error) {
    console.error('Failed to save auth to storage:', error);
  }
}

/**
 * AuthProvider component that manages authentication state
 *
 * @param children - Child components that will have access to auth context
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    ...loadAuthFromStorage(),
  }));

  useEffect(() => {
    // Initial load complete
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  const login = (user: User, accessToken: string, refreshToken: string) => {
    setState({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
    saveAuthToStorage(user, accessToken, refreshToken);
  };

  const logout = async () => {
    // Call backend to log the logout action for audit purposes
    if (state.accessToken) {
      try {
        await authApi.logout(state.accessToken);
      } catch (error) {
        // Log error but don't block logout - user should still be logged out locally
        console.error('Failed to notify backend of logout:', error);
      }
    }

    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    saveAuthToStorage(null, null, null);
  };

  const updateTokens = (accessToken: string, refreshToken: string) => {
    setState((prev) => ({
      ...prev,
      accessToken,
      refreshToken,
    }));
    if (state.user) {
      saveAuthToStorage(state.user, accessToken, refreshToken);
    }
  };

  const setLoading = (isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  };

  const updateUser = (user: User) => {
    setState((prev) => ({ ...prev, user }));
    if (state.accessToken && state.refreshToken) {
      saveAuthToStorage(user, state.accessToken, state.refreshToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateTokens,
        updateUser,
        setLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 *
 * @returns Authentication context
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Alias for useAuth hook for backward compatibility
 */
export { useAuth as useAuthStore };
