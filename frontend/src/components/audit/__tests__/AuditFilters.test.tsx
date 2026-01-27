/**
 * AuditFilters Component Tests
 *
 * Tests for the audit log filter panel with date range, user, action, and entity filters.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditFilters } from '../AuditFilters';
import type { AuditLogsFilter } from '@/types/audit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'audit.filters.title': 'Filters',
        'audit.filters.clear': 'Clear Filters',
        'audit.filters.date_range': 'Date Range',
        'audit.filters.date_from': 'From Date',
        'audit.filters.date_to': 'To Date',
        'audit.filters.select_date': 'Select date',
        'audit.filters.user': 'User',
        'audit.filters.all_users': 'All Users',
        'audit.filters.action': 'Action',
        'audit.filters.all_actions': 'All Actions',
        'audit.filters.entity_type': 'Entity Type',
        'audit.filters.all_entities': 'All Entities',
        'audit.filters.entity_id': 'Entity ID',
        'audit.filters.entity_id_placeholder': 'Search by entity ID',
        'audit.filters.ip_address': 'IP Address',
        'audit.filters.ip_address_placeholder': 'Search by IP address',
        'audit.filters.presets.today': 'Today',
        'audit.filters.presets.yesterday': 'Yesterday',
        'audit.filters.presets.last7days': 'Last 7 Days',
        'audit.filters.presets.last30days': 'Last 30 Days',
        'audit.filters.presets.thisMonth': 'This Month',
      };
      return translations[key] || key;
    },
  }),
}));

// Stable mock data - outside vi.mock to prevent re-renders
const mockFilterOptions = {
  actions: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'],
  entity_types: ['PATIENT', 'APPOINTMENT', 'USER', 'PRESCRIPTION'],
};

const mockUsers = {
  users: [
    { id: 'user-1', email: 'admin@example.com', first_name: 'Admin', last_name: 'User' },
    { id: 'user-2', email: 'doctor@example.com', first_name: 'John', last_name: 'Doctor' },
  ],
  total: 2,
};

// Mock hooks
vi.mock('@/hooks/useAuditLogs', () => ({
  useAuditFilterOptions: () => ({
    data: mockFilterOptions,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({
    data: mockUsers,
    isLoading: false,
  }),
}));

// Mock audit types
vi.mock('@/types/audit', () => ({
  getActionDisplayName: (action: string) => action.charAt(0) + action.slice(1).toLowerCase(),
  getEntityTypeDisplayName: (type: string) => type.charAt(0) + type.slice(1).toLowerCase(),
}));

// Mock date-fns (partial, keeping most real implementations)
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: (date: Date, formatStr: string) => {
      if (formatStr === 'yyyy-MM-dd') {
        return date.toISOString().split('T')[0];
      }
      if (formatStr === 'PP') {
        return 'Jan 15, 2026';
      }
      return date.toISOString();
    },
  };
});

describe('AuditFilters', () => {
  const defaultFilter: AuditLogsFilter = {
    page: 1,
    page_size: 20,
  };

  const defaultProps = {
    filter: defaultFilter,
    onFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders filter title', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders date range label', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    it('renders date preset buttons', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });

    it('renders from date picker trigger', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('From Date')).toBeInTheDocument();
    });

    it('renders to date picker trigger', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('To Date')).toBeInTheDocument();
    });

    it('renders user filter', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('renders action filter', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('renders entity type filter', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('Entity Type')).toBeInTheDocument();
    });

    it('renders entity ID search input', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('Entity ID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by entity ID')).toBeInTheDocument();
    });

    it('renders IP address search input', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.getByText('IP Address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by IP address')).toBeInTheDocument();
    });
  });

  describe('Active Filter Count', () => {
    it('shows filter count badge when filters are active', () => {
      const filterWithActive: AuditLogsFilter = {
        ...defaultFilter,
        user_id: 'user-1',
        action: 'CREATE',
      };

      render(<AuditFilters {...defaultProps} filter={filterWithActive} />);

      // Badge should show "2" for 2 active filters
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows clear button when filters are active', () => {
      const filterWithActive: AuditLogsFilter = {
        ...defaultFilter,
        user_id: 'user-1',
      };

      render(<AuditFilters {...defaultProps} filter={filterWithActive} />);

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('does not show clear button when no filters are active', () => {
      render(<AuditFilters {...defaultProps} />);

      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });
  });

  describe('Date Presets', () => {
    it('calls onFilterChange when Today preset is clicked', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<AuditFilters {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Today'));

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.any(String),
          date_to: expect.any(String),
          page: 1,
        })
      );
    });

    it('calls onFilterChange when Last 7 Days preset is clicked', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<AuditFilters {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Last 7 Days'));

      expect(onFilterChange).toHaveBeenCalled();
    });

    it('calls onFilterChange when Last 30 Days preset is clicked', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<AuditFilters {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Last 30 Days'));

      expect(onFilterChange).toHaveBeenCalled();
    });
  });

  describe('Clear Filters', () => {
    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      const filterWithActive: AuditLogsFilter = {
        ...defaultFilter,
        user_id: 'user-1',
        action: 'CREATE',
        date_from: '2026-01-01',
      };

      render(
        <AuditFilters {...defaultProps} filter={filterWithActive} onFilterChange={onFilterChange} />
      );

      await user.click(screen.getByText('Clear Filters'));

      expect(onFilterChange).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
    });
  });

  describe('Entity ID Search', () => {
    it('allows typing in entity ID search', async () => {
      const user = userEvent.setup();
      render(<AuditFilters {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by entity ID');
      await user.type(input, 'entity-123');

      expect(input).toHaveValue('entity-123');
    });

    it('debounces entity ID search', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<AuditFilters {...defaultProps} onFilterChange={onFilterChange} />);

      const input = screen.getByPlaceholderText('Search by entity ID');
      await user.type(input, 'test');

      // Should debounce and eventually call onFilterChange
      await waitFor(
        () => {
          expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
              entity_id: 'test',
              page: 1,
            })
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe('IP Address Search', () => {
    it('allows typing in IP address search', async () => {
      const user = userEvent.setup();
      render(<AuditFilters {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by IP address');
      await user.type(input, '192.168.1.1');

      expect(input).toHaveValue('192.168.1.1');
    });

    it('debounces IP address search', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<AuditFilters {...defaultProps} onFilterChange={onFilterChange} />);

      const input = screen.getByPlaceholderText('Search by IP address');
      await user.type(input, '10.0.0.1');

      await waitFor(
        () => {
          expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
              ip_address: '10.0.0.1',
              page: 1,
            })
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Loading State', () => {
    it('renders normally when not loading', () => {
      render(<AuditFilters {...defaultProps} isLoading={false} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('accepts isLoading prop', () => {
      const { container } = render(<AuditFilters {...defaultProps} isLoading={true} />);

      expect(container).toBeInTheDocument();
    });
  });

  describe('Initial Filter Values', () => {
    it('displays selected date range from filter', () => {
      const filterWithDates: AuditLogsFilter = {
        ...defaultFilter,
        date_from: '2026-01-01',
        date_to: '2026-01-15',
      };

      render(<AuditFilters {...defaultProps} filter={filterWithDates} />);

      // Should show the dates
      expect(screen.getAllByText('Jan 15, 2026').length).toBeGreaterThanOrEqual(1);
    });
  });
});
