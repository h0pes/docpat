/**
 * NewUserPage Component Tests
 *
 * Tests the new user page including:
 * - Admin-only access
 * - Form display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { NewUserPage } from '../users/NewUserPage';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
  useCreateUser: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-user-1' }),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

// Mock user form
vi.mock('@/components/users/UserForm', () => ({
  UserForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="user-form">
      <button onClick={() => onSubmit({ username: 'newuser' })}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import { useAuthStore } from '@/store/authStore';

describe('NewUserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin user for most tests
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    } as any);
  });

  describe('Admin Access', () => {
    it('should render page for admin users', () => {
      renderWithProviders(<NewUserPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      expect(screen.getByTestId('user-form')).toBeInTheDocument();
    });

    it('should show access denied for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { id: 'user-1', username: 'doctor', role: 'DOCTOR' },
      } as any);

      renderWithProviders(<NewUserPage />, { withRouter: true });

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
      expect(screen.queryByTestId('user-form')).not.toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<NewUserPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render user form', () => {
      renderWithProviders(<NewUserPage />, { withRouter: true });

      expect(screen.getByTestId('user-form')).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderWithProviders(<NewUserPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate back on cancel', async () => {
      const { user } = renderWithProviders(<NewUserPage />, { withRouter: true });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/users');
    });
  });
});
