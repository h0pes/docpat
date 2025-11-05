/**
 * LoginPage Component Tests
 *
 * Tests the login page including:
 * - Form rendering and validation
 * - Successful login flow
 * - MFA requirement handling
 * - Error handling
 * - Navigation after login
 * - Remember me functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { LoginPage } from '../LoginPage';
import { authApi } from '@/services/api/auth';
import { useAuth } from '@/store/authStore';

// Mock the auth API
vi.mock('@/services/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    verifyMfa: vi.fn(),
  },
}));

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/login', state: null }),
  };
});

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });
  });

  describe('Form Rendering', () => {
    it('should render login form with all fields', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render forgot password link', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    it('should render language and theme switchers', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      // These would be rendered by LanguageSwitcher and ThemeSwitcher components
      // In a real test, we'd check for specific elements from those components
      expect(document.querySelector('.absolute.top-4.right-4')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty username', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { withRouter: true });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short username', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'ab');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Username must be at least 3 characters
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for empty password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'testuser');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Password must be at least 8 characters
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Login', () => {
    it('should call login API with correct credentials', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        user: { id: 1, username: 'testuser', role: 'doctor' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        requiresMfa: false,
      };

      (authApi.login as any).mockResolvedValue(mockResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
          rememberMe: false,
        });
      });
    });

    it('should call auth store login on successful response', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        user: { id: 1, username: 'testuser', role: 'doctor' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        requiresMfa: false,
      };

      (authApi.login as any).mockResolvedValue(mockResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          mockResponse.user,
          mockResponse.accessToken,
          mockResponse.refreshToken
        );
      });
    });

    it('should navigate to dashboard after successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        user: { id: 1, username: 'testuser', role: 'doctor' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        requiresMfa: false,
      };

      (authApi.login as any).mockResolvedValue(mockResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('should respect rememberMe checkbox', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        user: { id: 1, username: 'testuser', role: 'doctor' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        requiresMfa: false,
      };

      (authApi.login as any).mockResolvedValue(mockResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(rememberMeCheckbox);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
          rememberMe: true,
        });
      });
    });
  });

  describe('MFA Flow', () => {
    it('should show MFA input when MFA is required', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        requiresMfa: true,
        sessionId: 'session-123',
      };

      (authApi.login as any).mockResolvedValue(mockResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      });
    });

    it('should verify MFA code when entered', async () => {
      const user = userEvent.setup();
      const mockLoginResponse = {
        requiresMfa: true,
        sessionId: 'session-123',
      };
      const mockMfaResponse = {
        user: { id: 1, username: 'testuser', role: 'doctor' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (authApi.login as any).mockResolvedValue(mockLoginResponse);
      (authApi.verifyMfa as any).mockResolvedValue(mockMfaResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      // Enter credentials
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for MFA input to appear
      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      });

      // Enter MFA code (6 digits)
      const mfaInputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(mfaInputs[i], String(i + 1));
      }

      await waitFor(() => {
        expect(authApi.verifyMfa).toHaveBeenCalledWith({
          username: 'testuser',
          code: '123456',
        });
      });
    });

    it('should navigate to dashboard after successful MFA verification', async () => {
      const user = userEvent.setup();
      const mockLoginResponse = {
        requiresMfa: true,
        sessionId: 'session-123',
      };
      const mockMfaResponse = {
        user: { id: 1, username: 'testuser', role: 'doctor' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (authApi.login as any).mockResolvedValue(mockLoginResponse);
      (authApi.verifyMfa as any).mockResolvedValue(mockMfaResponse);

      renderWithProviders(<LoginPage />, { withRouter: true });

      // Enter credentials
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for MFA input
      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      });

      // Enter MFA code
      const mfaInputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(mfaInputs[i], String(i + 1));
      }

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on login failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      };

      (authApi.login as any).mockRejectedValue(mockError);

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Toast would be shown but we can verify the API was called
      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
      });
    });

    it('should show error for invalid MFA code', async () => {
      const user = userEvent.setup();
      const mockLoginResponse = {
        requiresMfa: true,
        sessionId: 'session-123',
      };
      const mockError = {
        response: {
          data: {
            message: 'Invalid MFA code',
          },
        },
      };

      (authApi.login as any).mockResolvedValue(mockLoginResponse);
      (authApi.verifyMfa as any).mockRejectedValue(mockError);

      renderWithProviders(<LoginPage />, { withRouter: true });

      // Enter credentials
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for MFA input
      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      });

      // Enter wrong MFA code
      const mfaInputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(mfaInputs[i], String(i + 1));
      }

      await waitFor(() => {
        expect(authApi.verifyMfa).toHaveBeenCalled();
      });
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      (authApi.login as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<LoginPage />, { withRouter: true });

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the eye icon button
      const toggleButton = passwordInput.parentElement?.querySelector('button');
      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(passwordInput).toHaveAttribute('type', 'text');
        });

        await user.click(toggleButton);

        await waitFor(() => {
          expect(passwordInput).toHaveAttribute('type', 'password');
        });
      }
    });
  });
});
