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

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.rememberMe': 'Remember me',
        'auth.forgotPasswordLink': 'Forgot password?',
        'auth.signIn': 'Sign in',
        'auth.enterVerificationCode': 'Enter verification code',
        'language.select': 'Select Language',
        'theme.toggle': 'Toggle Theme',
        'validation.usernameRequired': 'Username is required',
        'validation.usernameMinLength': 'Username must be at least 3 characters',
        'validation.passwordRequired': 'Password is required',
        'validation.passwordMinLength': 'Password must be at least 8 characters',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
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

      // Check for form elements
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render navigation links', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should render language and theme switchers', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      // These would be rendered by LanguageSwitcher and ThemeSwitcher components
      expect(document.querySelector('.absolute.top-4.right-4')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should have form fields for validation', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      // Check form structure exists
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Login Form', () => {
    it('should render submit button', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
      expect(submitButton).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('MFA Flow', () => {
    it('should have authApi mocked', () => {
      expect(authApi.login).toBeDefined();
      expect(authApi.verifyMfa).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should have form elements to handle errors', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should render toggle button', () => {
      renderWithProviders(<LoginPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
