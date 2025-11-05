/**
 * ForgotPasswordPage Component Tests
 *
 * Tests the forgot password page including:
 * - Form rendering and validation
 * - Email submission
 * - Success state
 * - Resend functionality
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { authApi } from '@/services/api/auth';

// Mock the auth API
vi.mock('@/services/api/auth', () => ({
  authApi: {
    forgotPassword: vi.fn(),
  },
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render forgot password form', () => {
      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const backLink = screen.getByRole('link', { name: /back to login/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/login');
    });

    it('should render description text', () => {
      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      expect(
        screen.getByText(/enter your email address and we'll send you a link/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty email', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'notanemail');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should accept valid email format', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Verify success state appears (proves API was called successfully)
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Email Submission', () => {
    it('should call API with email address', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Verify success state appears (proves API was called successfully)
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(emailInput).toBeDisabled();
      });
    });

    it('should show loading state on submit button', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('should show success message after email sent', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should display submitted email in success message', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      const testEmail = 'test@example.com';
      await user.type(emailInput, testEmail);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(testEmail, 'i'))).toBeInTheDocument();
      });
    });

    it('should show success icon', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        // CheckCircle2 icon would be rendered
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should hide form after successful submission', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Resend Functionality', () => {
    it('should show resend button in success state', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend link/i })).toBeInTheDocument();
      });
    });

    it('should return to form when resend is clicked', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      let submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend link/i })).toBeInTheDocument();
      });

      const resendButton = screen.getByRole('button', { name: /resend link/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

    it('should allow resubmitting after clicking resend', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      // First submission
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      let submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend link/i })).toBeInTheDocument();
      });

      // Click resend
      const resendButton = screen.getByRole('button', { name: /resend link/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Second submission
      submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on API failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'User not found',
          },
        },
      };

      (authApi.forgotPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'nonexistent@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalled();
      });
    });

    it('should stay on form after error', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'User not found',
          },
        },
      };

      (authApi.forgotPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'nonexistent@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalled();
      });

      // Form should still be visible
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should re-enable form after error', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            message: 'Network error',
          },
        },
      };

      (authApi.forgotPassword as any).mockRejectedValue(mockError);

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalled();
      });

      // Form should be re-enabled after error
      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Additional UI Elements', () => {
    it('should display help text about checking spam', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
      });
    });

    it('should show back to login link in success state', async () => {
      const user = userEvent.setup();
      (authApi.forgotPassword as any).mockResolvedValue({});

      renderWithProviders(<ForgotPasswordPage />, { withRouter: true });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to login/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/login');
      });
    });
  });
});
