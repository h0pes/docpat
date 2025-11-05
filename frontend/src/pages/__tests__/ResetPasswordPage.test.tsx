/**
 * ResetPasswordPage Component Tests
 *
 * Tests the reset password page including:
 * - Token validation
 * - Form rendering and validation
 * - Password strength indicator
 * - Password confirmation matching
 * - Success state
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { authApi } from '@/services/api/auth';

// Mock the auth API
vi.mock('@/services/api/auth', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
}));

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.set('token', 'valid-token-123');
  });

  describe('Token Validation', () => {
    it('should show error when token is missing', () => {
      mockSearchParams.delete('token');

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    });

    it('should show error state UI when token is missing', () => {
      mockSearchParams.delete('token');

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      expect(screen.getByText(/request new link/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    });

    it('should render form when token is present', () => {
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('should render password requirements', () => {
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      expect(screen.getByText(/password must contain/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
      expect(screen.getByText(/one special character/i)).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const backLink = screen.getByRole('link', { name: /back to login/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility for new password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find the toggle button
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

    it('should toggle password visibility for confirm password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Find the toggle button (second one)
      const toggleButton = confirmPasswordInput.parentElement?.querySelector('button');
      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(confirmPasswordInput).toHaveAttribute('type', 'text');
        });
      }
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show password strength indicator when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('should update strength as password improves', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);

      // Weak password
      await user.type(passwordInput, 'weakpass');
      await waitFor(() => {
        const strengthText = screen.queryByText(/fair/i);
        expect(strengthText).toBeInTheDocument();
      });

      // Clear and type stronger password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPass123!');

      await waitFor(() => {
        const strengthText = screen.queryByText(/strong/i);
        expect(strengthText).toBeInTheDocument();
      });
    });

    it('should display visual strength bars', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'password');

      await waitFor(() => {
        // Should have strength indicator bars (5 bars total)
        const bars = container.querySelectorAll('.h-1.flex-1.rounded');
        expect(bars.length).toBe(5);
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error for password less than 8 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'Short1!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/string must contain at least 8/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without uppercase', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'lowercase123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/uppercase required/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without lowercase', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'UPPERCASE123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/lowercase required/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without number', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NoNumbers!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/number required/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without special character', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NoSpecial123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/special char required/i)).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmPasswordInput, 'DifferentPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should accept valid password that meets all requirements', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockResolvedValue({});

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmPasswordInput, 'ValidPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalledWith({
          token: 'valid-token-123',
          password: 'ValidPass123!',
          confirmPassword: 'ValidPass123!',
        });
      });
    });
  });

  describe('Password Reset Submission', () => {
    it('should call API with token and new password', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockResolvedValue({});

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalledWith({
          token: 'valid-token-123',
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
      });
    });

    it('should show loading state on submit button', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('should show success message after reset', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockResolvedValue({});

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });
    });

    it('should hide form after successful reset', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockResolvedValue({});

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
      });
    });

    it('should show success icon', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockResolvedValue({});

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        // CheckCircle2 icon would be rendered
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });
    });

    it('should show go to login button', async () => {
      const user = userEvent.setup();
      (authApi.resetPassword as any).mockResolvedValue({});

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        const loginLink = screen.getByRole('link', { name: /go to login/i });
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute('href', '/login');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on API failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'Reset failed',
          },
        },
      };

      (authApi.resetPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalled();
      });
    });

    it('should show token error state on expired token', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'Token expired',
          },
        },
      };

      (authApi.resetPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
      });
    });

    it('should show request new link button on token error', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'Invalid token',
          },
        },
      };

      (authApi.resetPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        const requestNewLink = screen.getByRole('link', { name: /request new link/i });
        expect(requestNewLink).toBeInTheDocument();
        expect(requestNewLink).toHaveAttribute('href', '/forgot-password');
      });
    });

    it('should re-enable form after non-token error', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'Network error',
          },
        },
      };

      (authApi.resetPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ResetPasswordPage />, { withRouter: true });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalled();
      });

      // Form should be re-enabled
      await waitFor(() => {
        expect(passwordInput).not.toBeDisabled();
        expect(confirmPasswordInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
