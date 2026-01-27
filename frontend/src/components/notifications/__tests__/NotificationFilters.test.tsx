/**
 * NotificationFilters Component Tests
 *
 * Tests for the notification filter controls including status, type, and date range filters.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationFilters } from '../NotificationFilters';
import type { NotificationFilter } from '@/types/notification';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'notifications.filters.status': 'Status',
        'notifications.filters.type': 'Type',
        'notifications.filters.from_date': 'From Date',
        'notifications.filters.to_date': 'To Date',
        'notifications.filters.clear': 'Clear Filters',
        'notifications.filters.active_filters': 'Active Filters',
        'notifications.filters.all_statuses': 'All Statuses',
        'notifications.filters.all_types': 'All Types',
        'notifications.status.pending': 'Pending',
        'notifications.status.processing': 'Processing',
        'notifications.status.sent': 'Sent',
        'notifications.status.failed': 'Failed',
        'notifications.status.cancelled': 'Cancelled',
        'notifications.types.appointment_reminder': 'Appointment Reminder',
        'notifications.types.appointment_booked': 'Appointment Booked',
        'notifications.types.appointment_confirmation': 'Confirmation',
        'notifications.types.appointment_cancellation': 'Cancellation',
        'notifications.types.custom': 'Custom',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock date-fns format
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: (date: Date, formatStr: string) => {
      if (formatStr === 'PPP') {
        return 'January 15, 2026';
      }
      return date.toISOString();
    },
  };
});

describe('NotificationFilters', () => {
  const defaultFilters: NotificationFilter = {
    limit: 20,
    offset: 0,
  };

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders status filter', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('renders type filter', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.getByText('All Types')).toBeInTheDocument();
    });

    it('renders from date button', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.getByText('From Date')).toBeInTheDocument();
    });

    it('renders to date button', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.getByText('To Date')).toBeInTheDocument();
    });

    it('does not render clear button when no filters active', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });

    it('does not render active filters badge when no filters', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.queryByText('Active Filters')).not.toBeInTheDocument();
    });
  });

  describe('Active Filters', () => {
    it('renders clear button when filters are active', () => {
      const filtersWithStatus: NotificationFilter = {
        ...defaultFilters,
        status: 'PENDING',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithStatus} />);

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('shows active filter count badge', () => {
      const filtersWithMultiple: NotificationFilter = {
        ...defaultFilters,
        status: 'PENDING',
        notification_type: 'APPOINTMENT_REMINDER',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithMultiple} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows active filters label', () => {
      const filtersWithStatus: NotificationFilter = {
        ...defaultFilters,
        status: 'PENDING',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithStatus} />);

      expect(screen.getByText(/Active Filters/)).toBeInTheDocument();
    });

    it('counts date filters in active count', () => {
      const filtersWithDates: NotificationFilter = {
        ...defaultFilters,
        from_date: '2026-01-01T00:00:00Z',
        to_date: '2026-01-31T23:59:59Z',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithDates} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('renders status filter trigger with default value', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('displays selected status in trigger', () => {
      const filtersWithStatus: NotificationFilter = {
        ...defaultFilters,
        status: 'FAILED',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithStatus} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('counts status as active filter', () => {
      const filtersWithStatus: NotificationFilter = {
        ...defaultFilters,
        status: 'PENDING',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithStatus} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Type Filter', () => {
    it('renders type filter trigger', () => {
      render(<NotificationFilters {...defaultProps} />);

      expect(screen.getByText('All Types')).toBeInTheDocument();
    });

    it('displays selected notification type', () => {
      const filtersWithType: NotificationFilter = {
        ...defaultFilters,
        notification_type: 'APPOINTMENT_REMINDER',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithType} />);

      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
    });

    it('counts type filter as active', () => {
      const filtersWithType: NotificationFilter = {
        ...defaultFilters,
        notification_type: 'CUSTOM',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithType} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Date Filters', () => {
    it('displays from date when set', () => {
      const filtersWithFromDate: NotificationFilter = {
        ...defaultFilters,
        from_date: '2026-01-15T00:00:00Z',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithFromDate} />);

      expect(screen.getByText('January 15, 2026')).toBeInTheDocument();
    });

    it('displays to date when set', () => {
      const filtersWithToDate: NotificationFilter = {
        ...defaultFilters,
        to_date: '2026-01-15T23:59:59Z',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithToDate} />);

      expect(screen.getByText('January 15, 2026')).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const filtersWithValues: NotificationFilter = {
        ...defaultFilters,
        status: 'PENDING',
        notification_type: 'APPOINTMENT_REMINDER',
        from_date: '2026-01-01T00:00:00Z',
      };

      render(
        <NotificationFilters
          {...defaultProps}
          filters={filtersWithValues}
          onFiltersChange={onFiltersChange}
        />
      );

      await user.click(screen.getByText('Clear Filters'));

      expect(onFiltersChange).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('Filter Combinations', () => {
    it('counts multiple active filters', () => {
      const filtersWithMultiple: NotificationFilter = {
        ...defaultFilters,
        status: 'PENDING',
        notification_type: 'APPOINTMENT_REMINDER',
        from_date: '2026-01-01T00:00:00Z',
        to_date: '2026-01-31T23:59:59Z',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithMultiple} />);

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('shows selected status in trigger', () => {
      const filtersWithStatus: NotificationFilter = {
        ...defaultFilters,
        status: 'FAILED',
      };

      render(<NotificationFilters {...defaultProps} filters={filtersWithStatus} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
});
