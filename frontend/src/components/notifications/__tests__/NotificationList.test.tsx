/**
 * NotificationList Component Tests
 *
 * Tests for the notification list with loading, empty, error states, and pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationList } from '../NotificationList';
import type { NotificationResponse } from '@/types/notification';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.load_more': 'Load More',
        'notifications.empty.title': 'No Notifications',
        'notifications.empty.description': 'There are no notifications to display',
        'notifications.errors.load_failed': 'Failed to load notifications',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock NotificationCard component
vi.mock('../NotificationCard', () => ({
  NotificationCard: ({
    notification,
    onRetry,
    onCancel,
    isRetrying,
    isCancelling,
  }: {
    notification: NotificationResponse;
    onRetry?: (id: string) => void;
    onCancel?: (id: string) => void;
    isRetrying?: boolean;
    isCancelling?: boolean;
  }) => (
    <div data-testid={`notification-card-${notification.id}`}>
      <span data-testid="subject">{notification.subject}</span>
      <span data-testid="status">{notification.status}</span>
      {onRetry && notification.status === 'FAILED' && (
        <button
          data-testid={`retry-${notification.id}`}
          onClick={() => onRetry(notification.id)}
          disabled={isRetrying}
        >
          Retry
        </button>
      )}
      {onCancel && notification.status === 'PENDING' && (
        <button
          data-testid={`cancel-${notification.id}`}
          onClick={() => onCancel(notification.id)}
          disabled={isCancelling}
        >
          Cancel
        </button>
      )}
    </div>
  ),
}));

describe('NotificationList', () => {
  const mockNotifications: NotificationResponse[] = [
    {
      id: 'notif-1',
      patient_id: 'patient-1',
      patient_name: 'John Doe',
      appointment_id: 'apt-1',
      notification_type: 'APPOINTMENT_REMINDER',
      delivery_method: 'EMAIL',
      recipient_email: 'john@example.com',
      recipient_phone: null,
      subject: 'Appointment Reminder',
      body: 'Your appointment is tomorrow',
      status: 'SENT',
      scheduled_for: '2026-01-15T10:00:00Z',
      sent_at: '2026-01-15T10:00:00Z',
      error_message: null,
      retry_count: 0,
      created_at: '2026-01-14T10:00:00Z',
      created_by: 'user-1',
    },
    {
      id: 'notif-2',
      patient_id: 'patient-2',
      patient_name: 'Jane Smith',
      appointment_id: 'apt-2',
      notification_type: 'APPOINTMENT_BOOKED',
      delivery_method: 'EMAIL',
      recipient_email: 'jane@example.com',
      recipient_phone: null,
      subject: 'Appointment Confirmed',
      body: 'Your appointment has been confirmed',
      status: 'PENDING',
      scheduled_for: '2026-01-16T10:00:00Z',
      sent_at: null,
      error_message: null,
      retry_count: 0,
      created_at: '2026-01-14T10:00:00Z',
      created_by: 'user-1',
    },
    {
      id: 'notif-3',
      patient_id: 'patient-3',
      patient_name: 'Bob Wilson',
      appointment_id: 'apt-3',
      notification_type: 'APPOINTMENT_REMINDER',
      delivery_method: 'EMAIL',
      recipient_email: 'bob@example.com',
      recipient_phone: null,
      subject: 'Failed Reminder',
      body: 'Reminder failed',
      status: 'FAILED',
      scheduled_for: '2026-01-14T10:00:00Z',
      sent_at: null,
      error_message: 'SMTP connection failed',
      retry_count: 2,
      created_at: '2026-01-13T10:00:00Z',
      created_by: 'user-1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification cards', () => {
      render(<NotificationList notifications={mockNotifications} />);

      expect(screen.getByTestId('notification-card-notif-1')).toBeInTheDocument();
      expect(screen.getByTestId('notification-card-notif-2')).toBeInTheDocument();
      expect(screen.getByTestId('notification-card-notif-3')).toBeInTheDocument();
    });

    it('renders all notification subjects', () => {
      render(<NotificationList notifications={mockNotifications} />);

      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
      expect(screen.getByText('Appointment Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Failed Reminder')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading with no notifications', () => {
      render(<NotificationList notifications={[]} isLoading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not show loading spinner when has notifications', () => {
      render(<NotificationList notifications={mockNotifications} isLoading={true} />);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error occurs', () => {
      const error = new Error('Network error');
      render(<NotificationList notifications={[]} error={error} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows default error message when error has no message', () => {
      const error = new Error();
      error.message = '';
      render(<NotificationList notifications={[]} error={error} />);

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notifications', () => {
      render(<NotificationList notifications={[]} />);

      expect(screen.getByText('No Notifications')).toBeInTheDocument();
      expect(screen.getByText('There are no notifications to display')).toBeInTheDocument();
    });

    it('does not show empty state when notifications exist', () => {
      render(<NotificationList notifications={mockNotifications} />);

      expect(screen.queryByText('No Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows load more button when hasMore is true', () => {
      render(
        <NotificationList
          notifications={mockNotifications}
          hasMore={true}
          onLoadMore={vi.fn()}
        />
      );

      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('does not show load more button when hasMore is false', () => {
      render(
        <NotificationList
          notifications={mockNotifications}
          hasMore={false}
          onLoadMore={vi.fn()}
        />
      );

      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });

    it('calls onLoadMore when load more button is clicked', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      await user.click(screen.getByText('Load More'));

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('disables load more button when isLoadingMore is true', () => {
      render(
        <NotificationList
          notifications={mockNotifications}
          hasMore={true}
          onLoadMore={vi.fn()}
          isLoadingMore={true}
        />
      );

      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    });

    it('shows loading text when isLoadingMore', () => {
      render(
        <NotificationList
          notifications={mockNotifications}
          hasMore={true}
          onLoadMore={vi.fn()}
          isLoadingMore={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Retry Action', () => {
    it('passes onRetry to notification cards', () => {
      const onRetry = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          onRetry={onRetry}
        />
      );

      // The failed notification should have a retry button
      expect(screen.getByTestId('retry-notif-3')).toBeInTheDocument();
    });

    it('calls onRetry with notification id', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          onRetry={onRetry}
        />
      );

      await user.click(screen.getByTestId('retry-notif-3'));

      expect(onRetry).toHaveBeenCalledWith('notif-3');
    });

    it('passes retryingId to correct card', () => {
      const onRetry = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          onRetry={onRetry}
          retryingId="notif-3"
        />
      );

      expect(screen.getByTestId('retry-notif-3')).toBeDisabled();
    });
  });

  describe('Cancel Action', () => {
    it('passes onCancel to notification cards', () => {
      const onCancel = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          onCancel={onCancel}
        />
      );

      // The pending notification should have a cancel button
      expect(screen.getByTestId('cancel-notif-2')).toBeInTheDocument();
    });

    it('calls onCancel with notification id', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByTestId('cancel-notif-2'));

      expect(onCancel).toHaveBeenCalledWith('notif-2');
    });

    it('passes cancellingId to correct card', () => {
      const onCancel = vi.fn();

      render(
        <NotificationList
          notifications={mockNotifications}
          onCancel={onCancel}
          cancellingId="notif-2"
        />
      );

      expect(screen.getByTestId('cancel-notif-2')).toBeDisabled();
    });
  });

  describe('State Priority', () => {
    it('shows loading state over empty state', () => {
      render(<NotificationList notifications={[]} isLoading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('No Notifications')).not.toBeInTheDocument();
    });

    it('shows loading state when isLoading with empty notifications (takes priority)', () => {
      // The component checks loading first, so loading takes priority over error
      // when both are present and notifications are empty
      const error = new Error('Test error');
      render(<NotificationList notifications={[]} isLoading={true} error={error} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows error state when not loading', () => {
      const error = new Error('Test error');
      render(<NotificationList notifications={[]} isLoading={false} error={error} />);

      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.queryByText('No Notifications')).not.toBeInTheDocument();
    });

    it('shows error state over empty state', () => {
      const error = new Error('Test error');
      render(<NotificationList notifications={[]} error={error} />);

      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.queryByText('No Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Single Notification', () => {
    it('renders single notification correctly', () => {
      render(<NotificationList notifications={[mockNotifications[0]]} />);

      expect(screen.getByTestId('notification-card-notif-1')).toBeInTheDocument();
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
    });
  });
});
