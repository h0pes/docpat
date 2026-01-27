/**
 * UsersPage Component Tests
 *
 * Tests the users page including:
 * - Admin-only access
 * - User list display
 * - User actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { UsersPage } from '../users/UsersPage';

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: '1',
      username: 'admin',
      role: 'ADMIN',
    },
  })),
}));

// Mock users hooks
vi.mock('@/hooks/useUsers', () => ({
  useUsers: vi.fn(() => ({
    data: { users: [], total: 25 },
    isLoading: false,
  })),
  useActivateUser: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
  useDeactivateUser: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

// Mock UserList component
vi.mock('@/components/users/UserList', () => ({
  UserList: ({ onViewUser, onEditUser, onActivateUser, onDeactivateUser }: any) => (
    <div data-testid="user-list">
      <button onClick={() => onViewUser({ id: '1', first_name: 'John', last_name: 'Doe' })}>
        View User
      </button>
      <button onClick={() => onEditUser({ id: '1', first_name: 'John', last_name: 'Doe' })}>
        Edit User
      </button>
      <button onClick={() => onActivateUser({ id: '1', first_name: 'John', last_name: 'Doe' })}>
        Activate User
      </button>
      <button onClick={() => onDeactivateUser({ id: '1', first_name: 'John', last_name: 'Doe' })}>
        Deactivate User
      </button>
    </div>
  ),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useAuthStore } from '@/store/authStore';

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'admin',
        role: 'ADMIN',
      },
    });
  });

  describe('Admin Access', () => {
    it('should render page for admin users', () => {
      renderWithProviders(<UsersPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
      expect(screen.getByTestId('user-list')).toBeInTheDocument();
    });

    it('should show access denied for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          id: '1',
          username: 'doctor',
          role: 'DOCTOR',
        },
      });

      renderWithProviders(<UsersPage />, { withRouter: true });

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
      expect(screen.queryByTestId('user-list')).not.toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('should render action buttons', () => {
      renderWithProviders(<UsersPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should display page content', () => {
      renderWithProviders(<UsersPage />, { withRouter: true });

      // Page should render with user list
      expect(screen.getByTestId('user-list')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render navigation buttons', () => {
      renderWithProviders(<UsersPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should navigate to user detail on view', async () => {
      const { user } = renderWithProviders(<UsersPage />, { withRouter: true });

      const viewBtn = screen.getByText('View User');
      await user.click(viewBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/users/1');
    });

    it('should navigate to user edit on edit', async () => {
      const { user } = renderWithProviders(<UsersPage />, { withRouter: true });

      const editBtn = screen.getByText('Edit User');
      await user.click(editBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/users/1/edit');
    });
  });

  describe('User Actions', () => {
    it('should call activate mutation on activate', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      const { useActivateUser } = await vi.importMock('@/hooks/useUsers');
      vi.mocked(useActivateUser).mockReturnValue({
        mutateAsync: mockMutateAsync,
      });

      const { user } = renderWithProviders(<UsersPage />, { withRouter: true });

      const activateBtn = screen.getByText('Activate User');
      await user.click(activateBtn);

      expect(mockMutateAsync).toHaveBeenCalledWith('1');
    });

    it('should call deactivate mutation on deactivate', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      const { useDeactivateUser } = await vi.importMock('@/hooks/useUsers');
      vi.mocked(useDeactivateUser).mockReturnValue({
        mutateAsync: mockMutateAsync,
      });

      const { user } = renderWithProviders(<UsersPage />, { withRouter: true });

      const deactivateBtn = screen.getByText('Deactivate User');
      await user.click(deactivateBtn);

      expect(mockMutateAsync).toHaveBeenCalledWith('1');
    });
  });
});
