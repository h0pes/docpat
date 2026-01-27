/**
 * EditUserPage Component Tests
 *
 * Tests the edit user page including:
 * - Admin-only access
 * - Form display with user data
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { EditUserPage } from '../users/EditUserPage';

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

// Mock auth store - default to admin
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
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useUpdateUser: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

// Mock user form
vi.mock('@/components/users/UserForm', () => ({
  UserForm: ({ user, onCancel }: any) => (
    <div data-testid="user-form">
      {user?.first_name} {user?.last_name}
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock spinner
vi.mock('@/components/Spinner', () => ({
  FullPageSpinner: () => <div data-testid="spinner">Loading...</div>,
}));

import { useUser } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/authStore';

describe('EditUserPage', () => {
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
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('Admin Access', () => {
    it('should render page for admin users', () => {
      renderWithProviders(<EditUserPage />, { withRouter: true });

      expect(screen.getByTestId('user-form')).toBeInTheDocument();
    });

    it('should show access denied for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { id: 'user-1', username: 'doctor', role: 'DOCTOR' },
      } as any);

      renderWithProviders(<EditUserPage />, { withRouter: true });

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<EditUserPage />, { withRouter: true });

      // Multiple headings may exist
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render user form with data', () => {
      renderWithProviders(<EditUserPage />, { withRouter: true });

      expect(screen.getByTestId('user-form')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
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

      renderWithProviders(<EditUserPage />, { withRouter: true });

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

      renderWithProviders(<EditUserPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back on cancel', async () => {
      const { user } = renderWithProviders(<EditUserPage />, { withRouter: true });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/users/user-123');
    });
  });
});
