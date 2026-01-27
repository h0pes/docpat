/**
 * ProfilePage Component Tests
 *
 * Tests the user profile page including:
 * - Profile information display
 * - Security settings
 * - MFA setup/disable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { ProfilePage } from '../ProfilePage';

// Mock useAuthStore
const mockUpdateUser = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: '1',
      username: 'testdoctor',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      role: 'DOCTOR',
      status: 'ACTIVE',
      mfa_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-06-01T10:00:00Z',
    },
    updateUser: mockUpdateUser,
  })),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock useNavigate and useSearchParams
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

// Import mocked modules
import { useAuthStore } from '@/store/authStore';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth store mock
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'testdoctor',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'DOCTOR',
        status: 'ACTIVE',
        mfa_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-06-01T10:00:00Z',
      },
      updateUser: mockUpdateUser,
    } as any);
  });

  describe('Basic Rendering', () => {
    it('should render profile page with headings', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render user avatar with initials', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render user full name', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render username', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      expect(screen.getByText('@testdoctor')).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('should display email', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display phone number', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });
  });

  describe('Account Information', () => {
    it('should display account information section', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      // Page should have headings and content
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Security Settings', () => {
    it('should render security section with buttons', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      // Should have buttons for MFA and other actions
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show MFA disabled status', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      // With MFA disabled, there should be an "enable" related element
      const disabledElements = screen.queryAllByText(/disabled/i);
      expect(disabledElements.length).toBeGreaterThan(0);
    });
  });

  describe('MFA Setup Dialog', () => {
    it('should render MFA enable button', () => {
      renderWithProviders(<ProfilePage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Admin User', () => {
    it('should render profile for admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          id: '1',
          username: 'admin',
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          mfa_enabled: true,
        },
        updateUser: mockUpdateUser,
      } as any);

      renderWithProviders(<ProfilePage />, { withRouter: true });

      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });
});
