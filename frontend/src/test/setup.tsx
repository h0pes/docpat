/**
 * Vitest setup file
 *
 * Configures the testing environment with Testing Library
 * and necessary mocks for i18n, router, and other dependencies.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock i18next
vi.mock('react-i18next', () => {
  // Simple English translations for testing
  const translations: Record<string, string> = {
    // App
    'app.name': 'DocPat',
    'app.tagline': 'Medical Practice Management System',
    'app.error': 'Error',

    // Common
    'common.loading': 'Loading',
    'common.back': 'Back',

    // Errors
    'errors.generic': 'An error occurred',

    // Auth common
    'auth.login': 'Sign In',
    'auth.login.title': 'Sign In',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.login.username': 'Username',
    'auth.login.password': 'Password',
    'auth.login.rememberMe': 'Remember me',
    'auth.login.submit': 'Sign in',
    'auth.login.forgotPassword': 'Forgot password?',
    'auth.loginButton': 'Sign in',
    'auth.loggingIn': 'Signing in...',
    'auth.loginSuccess': 'Login successful',
    'auth.loginError': 'Login failed',
    'auth.logoutNow': 'Logout Now',
    'auth.stayLoggedIn': 'Stay Logged In',

    // Forgot Password
    'auth.forgotPassword.title': 'Forgot Password',
    'auth.forgotPassword.description': "Enter your email address and we'll send you a link to reset your password",
    'auth.forgotPassword.email': 'Email',
    'auth.forgotPassword.submit': 'Send Reset Link',
    'auth.forgotPassword.sendLink': 'Send Reset Link',
    'auth.forgotPassword.backToLogin': 'Back to Login',
    'auth.forgotPassword.success': 'Password reset link sent',
    'auth.forgotPassword.successDescription': 'If an account exists with that email, you will receive a password reset link shortly.',
    'auth.forgotPassword.checkEmail': 'Check your email',
    'auth.forgotPassword.checkEmailDescription': 'We sent a password reset link to {{email}}',
    'auth.forgotPassword.emailSent': 'Email sent',
    'auth.forgotPassword.emailSentDescription': 'Check your inbox for the reset link',
    'auth.forgotPassword.error': 'Failed to send reset link',
    'auth.forgotPassword.resendLink': 'Resend link',
    'auth.forgotPassword.didntReceive': "Didn't receive the email? Check your spam folder or try again",
    'auth.backToLogin': 'Back to Login',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'Enter your email',

    // Reset Password
    'auth.resetPassword.title': 'Reset Password',
    'auth.resetPassword.description': 'Enter your new password',
    'auth.resetPassword.newPassword': 'New Password',
    'auth.resetPassword.confirmPassword': 'Confirm Password',
    'auth.resetPassword.submit': 'Reset Password',
    'auth.resetPassword.resetButton': 'Reset Password',
    'auth.resetPassword.success': 'Password reset successfully',
    'auth.resetPassword.successDescription': 'You can now log in with your new password',
    'auth.resetPassword.invalidToken': 'Invalid or expired link',
    'auth.resetPassword.invalidTokenDescription': 'This password reset link is invalid or has expired',
    'auth.resetPassword.error': 'Failed to reset password',
    'auth.forgotPassword.requestNew': 'Request new link',
    'auth.newPassword': 'New Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.passwordPlaceholder': 'Enter your password',
    'auth.confirmPasswordPlaceholder': 'Confirm your password',
    'auth.goToLogin': 'Go to Login',
    'auth.passwordRequirements': 'Password must contain',
    'auth.passwordRequirement.length': 'At least 8 characters',
    'auth.passwordRequirement.uppercase': 'One uppercase letter',
    'auth.passwordRequirement.lowercase': 'One lowercase letter',
    'auth.passwordRequirement.number': 'One number',
    'auth.passwordRequirement.special': 'One special character',
    'auth.passwordStrength.weak': 'Weak',
    'auth.passwordStrength.fair': 'Fair',
    'auth.passwordStrength.good': 'Good',
    'auth.passwordStrength.strong': 'Strong',
    'auth.passwordStrength.veryStrong': 'Very Strong',

    // MFA
    'auth.mfa.title': 'Two-Factor Authentication',
    'auth.mfa.enterCode': 'Enter verification code',
    'auth.mfa.code': 'Verification Code',
    'auth.mfa.codePlaceholder': 'Enter 6-digit code',
    'auth.mfa.verify': 'Verify',
    'auth.mfa.invalidCode': 'Invalid verification code',
    'auth.mfa.digit': 'Digit',
    'auth.mfa.enterCodeHelp': 'Enter the 6-digit code from your authenticator app',

    // Session
    'auth.session.aboutToExpire': 'Session About to Expire',
    'auth.session.timeRemaining': 'Time Remaining',
    'auth.session.stayLoggedIn': 'Stay Logged In',
    'auth.session.logoutNow': 'Logout Now',

    // Validation
    'auth.validation.usernameRequired': 'Username is required',
    'auth.validation.passwordRequired': 'Password is required',
    'auth.validation.emailRequired': 'Email is required',
    'auth.validation.emailInvalid': 'Invalid email address',
    'auth.validation.passwordMinLength': 'Password must be at least 8 characters',
    'auth.validation.usernameMinLength': 'String must contain at least 3 character(s)',
    'auth.validation.mfaCodeInvalid': 'Invalid verification code',
  };

  // Create stable function references to avoid infinite loops in useEffect
  const tFunction = (key: string, params?: Record<string, unknown>) => {
    // Get translation from map, or return key if not found
    let result = translations[key] || key;

    // For interpolated strings, replace the params
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([paramKey, value]) => {
        result = result.replace(`{{${paramKey}}}`, String(value));
      });
    }
    return result;
  };

  const changeLanguage = vi.fn();

  return {
    useTranslation: () => ({
      t: tFunction,
      i18n: {
        language: 'en',
        changeLanguage,
      },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', state: null }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

// Mock IntersectionObserver (for components that use it)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver (for components that use it)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock pointer capture methods for Radix UI components (Select, etc.)
// jsdom doesn't support these methods which Radix UI uses
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}

// Mock scrollIntoView for components that use it
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
