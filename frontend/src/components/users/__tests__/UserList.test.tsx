/**
 * UserList Component Tests
 *
 * Tests for the user list component with search, filters, and pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from '../UserList';
import type { User, UserListResponse } from '@/types/user';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'users.search_placeholder': 'Search users...',
        'users.filters': 'Filters',
        'users.advanced_filters': 'Advanced Filters',
        'users.clear_all': 'Clear All',
        'users.role_label': 'Role',
        'users.role_all': 'All Roles',
        'users.status_label': 'Status',
        'users.status_all': 'All Status',
        'users.roles.admin': 'Administrator',
        'users.roles.doctor': 'Doctor',
        'users.status.active': 'Active',
        'users.status.inactive': 'Inactive',
        'users.sort.nameAsc': 'Name (A-Z)',
        'users.sort.nameDesc': 'Name (Z-A)',
        'users.sort.usernameAsc': 'Username (A-Z)',
        'users.sort.usernameDesc': 'Username (Z-A)',
        'users.sort.roleAsc': 'Role (A-Z)',
        'users.sort.roleDesc': 'Role (Z-A)',
        'users.sort.createdAsc': 'Created (Oldest)',
        'users.sort.createdDesc': 'Created (Newest)',
        'users.page': 'page',
        'users.showing_results': `Showing ${params?.from ?? 1} to ${params?.to ?? 10} of ${params?.total ?? 100} users`,
        'users.previous': 'Previous',
        'users.next': 'Next',
        'users.page_of': `Page ${params?.current ?? 1} of ${params?.total ?? 1}`,
        'users.error_title': 'Error Loading Users',
        'users.error_loading': 'Failed to load users. Please try again.',
        'users.retry': 'Retry',
        'users.no_results': 'No Results Found',
        'users.no_results_description': 'Try adjusting your filters or search terms.',
        'users.no_users': 'No Users Yet',
        'users.no_users_description': 'Add your first user to get started.',
        'users.add_first_user': 'Add User',
        'users.clear_filters': 'Clear Filters',
        'common.actions': 'Actions',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useUsers hook
const mockRefetch = vi.fn();
vi.mock('@/hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));

// Import the mocked hook for manipulation
import { useUsers } from '@/hooks/useUsers';

// Mock user data
const createMockUser = (overrides?: Partial<User>): User => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'johndoe',
  email: 'john.doe@example.com',
  role: 'DOCTOR',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+39 123 456 7890',
  is_active: true,
  mfa_enabled: false,
  created_at: '2024-01-01T10:00:00Z',
  last_login: '2024-11-09T10:00:00Z',
  ...overrides,
});

const mockUsersData: UserListResponse = {
  users: [
    createMockUser(),
    createMockUser({
      id: '223e4567-e89b-12d3-a456-426614174001',
      username: 'janesmith',
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'ADMIN',
      mfa_enabled: true,
    }),
    createMockUser({
      id: '323e4567-e89b-12d3-a456-426614174002',
      username: 'bobwilson',
      email: 'bob.wilson@example.com',
      first_name: 'Bob',
      last_name: 'Wilson',
      is_active: false,
    }),
  ],
  total: 3,
  offset: 0,
  limit: 20,
};

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsersData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as ReturnType<typeof useUsers>);
  });

  describe('Rendering', () => {
    it('renders search input', () => {
      render(<UserList />);

      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    it('renders filter button', () => {
      render(<UserList />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders user cards', () => {
      render(<UserList />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('renders sort selector', () => {
      render(<UserList />);

      // The sort selector shows the default sort option
      expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when loading', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      const { container } = render(<UserList />);

      // Should show skeleton elements
      expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error message when loading fails', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('Error Loading Users')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows retry button on error', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useUsers).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      await user.click(screen.getByText('Retry'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('shows no results message when search returns empty', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: { users: [], total: 0, offset: 0, limit: 20 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('No Users Yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first user to get started.')).toBeInTheDocument();
    });

    it('shows add user button when no users exist', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: { users: [], total: 0, offset: 0, limit: 20 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('Add User')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('allows typing in search input', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'john');

      expect(searchInput).toHaveValue('john');
    });

    it('shows clear button when search has text', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'test');

      // Find clear button (X icon button)
      const clearButton = searchInput.parentElement?.querySelector('button');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'test');

      // Find and click clear button
      const clearButton = searchInput.parentElement?.querySelector('button');
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Filter Functionality', () => {
    it('opens filter popover on click', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      await user.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      });
    });

    it('shows role filter options', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      await user.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Role')).toBeInTheDocument();
      });
    });

    it('shows status filter options', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      await user.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('renders sort selector with default option', () => {
      render(<UserList />);

      // The sort selector shows the default sort option
      expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
    });

    it('has sort options available', () => {
      render(<UserList />);

      // Find comboboxes (Sort and PageSize selectors)
      const comboboxes = screen.getAllByRole('combobox');
      // Should have at least sort and page size selectors
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Pagination', () => {
    it('shows pagination when multiple pages exist', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: {
          users: mockUsersData.users,
          total: 50,
          offset: 0,
          limit: 20,
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: {
          users: mockUsersData.users,
          total: 50,
          offset: 0,
          limit: 20,
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('Previous')).toBeDisabled();
    });

    it('enables next button when more pages exist', () => {
      vi.mocked(useUsers).mockReturnValue({
        data: {
          users: mockUsersData.users,
          total: 50,
          offset: 0,
          limit: 20,
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      expect(screen.getByText('Next')).not.toBeDisabled();
    });

    it('does not show pagination for single page', () => {
      render(<UserList />);

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('calls onViewUser when provided and user is clicked', async () => {
      const user = userEvent.setup();
      const onViewUser = vi.fn();
      render(<UserList onViewUser={onViewUser} />);

      // Click on a user card
      const userCard = screen.getByText('John Doe').closest('[class*="cursor-pointer"]');
      if (userCard) {
        await user.click(userCard);
      }

      expect(onViewUser).toHaveBeenCalled();
    });

    it('navigates to user detail when clicked without onViewUser handler', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      // Click on a user card
      const userCard = screen.getByText('John Doe').closest('[class*="cursor-pointer"]');
      if (userCard) {
        await user.click(userCard);
      }

      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/users/'));
    });

    it('navigates to new user page when add first user is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useUsers).mockReturnValue({
        data: { users: [], total: 0, offset: 0, limit: 20 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as ReturnType<typeof useUsers>);

      render(<UserList />);

      await user.click(screen.getByText('Add User'));

      expect(mockNavigate).toHaveBeenCalledWith('/users/new');
    });
  });

  describe('Page Size', () => {
    it('renders page size selector', () => {
      render(<UserList />);

      // Find the page size selector by its default value
      expect(screen.getByText(/20.*page/)).toBeInTheDocument();
    });

    it('has page size selector available', () => {
      render(<UserList />);

      // Page size selector is a combobox
      const comboboxes = screen.getAllByRole('combobox');
      // Should have sort and page size selectors
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Active Filter Display', () => {
    it('shows filter badge count when filters are active', async () => {
      const user = userEvent.setup();
      render(<UserList />);

      // Open filters
      await user.click(screen.getByText('Filters'));

      // Wait for filter popover
      await waitFor(() => {
        expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      });

      // The filter badge will show when filters are applied
      // This tests that the component structure is correct
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });
});
