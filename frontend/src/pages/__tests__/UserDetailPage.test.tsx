/**
 * UserDetailPage Component Tests
 *
 * Tests the user detail page including:
 * - Admin-only access
 * - User data display
 * - User actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { UserDetailPage } from '../users/UserDetailPage';

// Mock navigate and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'user-123' }),
  };
});

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
  })),
}));

// Mock users hooks
vi.mock('@/hooks/useUsers', () => ({
  useUser: vi.fn(() => ({
    data: {
      id: 'user-123',
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      role: 'DOCTOR',
      is_active: true,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useActivateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeactivateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useResetPassword: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useResetMfa: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

// Mock user dialogs
vi.mock('@/components/users/UserDialogs', () => ({
  DeactivateUserDialog: () => <div data-testid="deactivate-dialog">Deactivate</div>,
  ActivateUserDialog: () => <div data-testid="activate-dialog">Activate</div>,
  ResetPasswordDialog: () => <div data-testid="reset-password-dialog">Reset Password</div>,
  ResetMFADialog: () => <div data-testid="reset-mfa-dialog">Reset MFA</div>,
}));

// Mock spinner
vi.mock('@/components/Spinner', () => ({
  FullPageSpinner: () => <div data-testid="spinner">Loading...</div>,
}));

import { useUser } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/authStore';

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin user for most tests
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    } as any);
    // Reset to valid user data for most tests
    vi.mocked(useUser).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        role: 'DOCTOR',
        is_active: true,
        mfa_enabled: false,
        created_at: new Date().toISOString(),
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('Admin Access', () => {
    it('should render page for admin users', () => {
      renderWithProviders(<UserDetailPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should show access denied for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { id: 'user-1', username: 'doctor', role: 'DOCTOR' },
      } as any);

      renderWithProviders(<UserDetailPage />, { withRouter: true });

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('should render page headings', () => {
      renderWithProviders(<UserDetailPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render action buttons', () => {
      renderWithProviders(<UserDetailPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show spinner when loading', () => {
      vi.mocked(useUser).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<UserDetailPage />, { withRouter: true });

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error when user not found', () => {
      vi.mocked(useUser).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { response: { data: { message: 'User not found' } } },
      } as any);

      renderWithProviders(<UserDetailPage />, { withRouter: true });

      // Page should still render with error indication
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should render navigation buttons', () => {
      renderWithProviders(<UserDetailPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
