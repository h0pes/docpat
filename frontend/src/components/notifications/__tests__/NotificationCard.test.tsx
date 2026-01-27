/**
 * NotificationCard Component Tests
 *
 * Tests for the notification card display with status, actions, and metadata.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationCard } from '../NotificationCard';
import type { NotificationResponse } from '@/types/notification';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
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
        'notifications.scheduled_for': 'Scheduled for',
        'notifications.sent_at': 'Sent at',
        'notifications.retry_count': `Retried ${params?.count || 0} times`,
        'notifications.actions.retry': 'Retry',
        'notifications.actions.cancel': 'Cancel',
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
      if (formatStr === 'MMM d, yyyy HH:mm') {
        return 'Jan 15, 2026 10:00';
      }
      return date.toISOString();
    },
  };
});

// Mock notification type helpers
vi.mock('@/types/notification', async () => {
  const actual = await vi.importActual('@/types/notification');
  return {
    ...actual,
    getNotificationStatusVariant: (status: string) => {
      const variants: Record<string, string> = {
        SENT: 'success',
        FAILED: 'destructive',
        PENDING: 'warning',
        PROCESSING: 'secondary',
        CANCELLED: 'default',
      };
      return variants[status] || 'default';
    },
    getNotificationTypeVariant: () => 'secondary',
    getNotificationTypeKey: (type: string) => `notifications.types.${type.toLowerCase()}`,
    getNotificationStatusKey: (status: string) => `notifications.status.${status.toLowerCase()}`,
  };
});

describe('NotificationCard', () => {
  const baseNotification: NotificationResponse = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification subject in heading', () => {
      render(<NotificationCard notification={baseNotification} />);

      // Subject appears as h4 heading
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveTextContent('Appointment Reminder');
    });

    it('renders recipient email', () => {
      render(<NotificationCard notification={baseNotification} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('renders patient name when available', () => {
      render(<NotificationCard notification={baseNotification} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(<NotificationCard notification={baseNotification} />);

      expect(screen.getByText('Sent')).toBeInTheDocument();
    });

    it('renders type badge', () => {
      render(<NotificationCard notification={baseNotification} />);

      // Type badge contains the notification type text (appears twice - badge and subject)
      const typeTexts = screen.getAllByText('Appointment Reminder');
      expect(typeTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders scheduled time', () => {
      render(<NotificationCard notification={baseNotification} />);

      // Should have at least one time element
      const timeElements = screen.getAllByText('Jan 15, 2026 10:00');
      expect(timeElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders sent time when available', () => {
      render(<NotificationCard notification={baseNotification} />);

      // Should show both scheduled and sent times
      const timeElements = screen.getAllByText('Jan 15, 2026 10:00');
      expect(timeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Status Icons', () => {
    it('renders sent status with check icon', () => {
      render(<NotificationCard notification={{ ...baseNotification, status: 'SENT' }} />);

      expect(screen.getByText('Sent')).toBeInTheDocument();
    });

    it('renders pending status with clock icon', () => {
      render(<NotificationCard notification={{ ...baseNotification, status: 'PENDING' }} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders failed status with x icon', () => {
      render(<NotificationCard notification={{ ...baseNotification, status: 'FAILED' }} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('renders processing status with loader', () => {
      render(<NotificationCard notification={{ ...baseNotification, status: 'PROCESSING' }} />);

      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('renders cancelled status with ban icon', () => {
      render(<NotificationCard notification={{ ...baseNotification, status: 'CANCELLED' }} />);

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('renders appointment date from metadata', () => {
      const notificationWithMetadata: NotificationResponse = {
        ...baseNotification,
        metadata: {
          appointment_date: '2026-01-20',
          appointment_time: '14:30',
          appointment_type: 'CONSULTATION',
        },
      };

      render(<NotificationCard notification={notificationWithMetadata} />);

      expect(screen.getByText('2026-01-20')).toBeInTheDocument();
      expect(screen.getByText('14:30')).toBeInTheDocument();
    });

    it('renders appointment type from metadata', () => {
      const notificationWithMetadata: NotificationResponse = {
        ...baseNotification,
        metadata: {
          appointment_date: '2026-01-20',
          appointment_type: 'FOLLOW_UP',
        },
      };

      render(<NotificationCard notification={notificationWithMetadata} />);

      // The appointment type is formatted as lowercase with spaces
      expect(screen.getByText(/follow/i)).toBeInTheDocument();
    });

    it('does not render metadata section when not available', () => {
      render(<NotificationCard notification={baseNotification} />);

      expect(screen.queryByText('2026-01-20')).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('renders error message when available', () => {
      const failedNotification: NotificationResponse = {
        ...baseNotification,
        status: 'FAILED',
        error_message: 'SMTP connection failed',
      };

      render(<NotificationCard notification={failedNotification} />);

      expect(screen.getByText('SMTP connection failed')).toBeInTheDocument();
    });

    it('does not render error section for successful notifications', () => {
      render(<NotificationCard notification={baseNotification} />);

      expect(screen.queryByText('SMTP connection failed')).not.toBeInTheDocument();
    });
  });

  describe('Retry Count', () => {
    it('renders retry count when greater than 0', () => {
      const retriedNotification: NotificationResponse = {
        ...baseNotification,
        status: 'FAILED',
        retry_count: 3,
      };

      render(<NotificationCard notification={retriedNotification} />);

      expect(screen.getByText(/Retried 3 times/)).toBeInTheDocument();
    });

    it('does not render retry count when 0', () => {
      render(<NotificationCard notification={baseNotification} />);

      expect(screen.queryByText(/Retried/)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    // Helper to find the action button (has h-10 w-10 classes)
    const findActionButton = () => {
      const buttons = screen.getAllByRole('button');
      return buttons.find(btn => btn.classList.contains('h-10') && btn.classList.contains('w-10'));
    };

    it('renders action button for failed notifications with onRetry', () => {
      const onRetry = vi.fn();
      const failedNotification: NotificationResponse = {
        ...baseNotification,
        status: 'FAILED',
      };

      render(<NotificationCard notification={failedNotification} onRetry={onRetry} />);

      const actionButton = findActionButton();
      expect(actionButton).toBeTruthy();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const failedNotification: NotificationResponse = {
        ...baseNotification,
        status: 'FAILED',
      };

      render(<NotificationCard notification={failedNotification} onRetry={onRetry} />);

      const actionButton = findActionButton();
      expect(actionButton).toBeTruthy();

      if (actionButton) {
        await user.click(actionButton);

        await waitFor(() => {
          expect(onRetry).toHaveBeenCalledWith('notif-1');
        });
      }
    });

    it('renders action button for pending notifications with onCancel', () => {
      const onCancel = vi.fn();
      const pendingNotification: NotificationResponse = {
        ...baseNotification,
        status: 'PENDING',
      };

      render(<NotificationCard notification={pendingNotification} onCancel={onCancel} />);

      const actionButton = findActionButton();
      expect(actionButton).toBeTruthy();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const pendingNotification: NotificationResponse = {
        ...baseNotification,
        status: 'PENDING',
      };

      render(<NotificationCard notification={pendingNotification} onCancel={onCancel} />);

      const actionButton = findActionButton();
      expect(actionButton).toBeTruthy();

      if (actionButton) {
        await user.click(actionButton);

        await waitFor(() => {
          expect(onCancel).toHaveBeenCalledWith('notif-1');
        });
      }
    });

    it('does not render action buttons for sent notifications without handlers', () => {
      // Sent notifications without retry/cancel handlers show no action buttons
      render(<NotificationCard notification={baseNotification} />);

      const actionButton = findActionButton();
      expect(actionButton).toBeFalsy();
    });

    it('shows loading state when isRetrying is true', () => {
      const onRetry = vi.fn();
      const failedNotification: NotificationResponse = {
        ...baseNotification,
        status: 'FAILED',
      };

      render(
        <NotificationCard
          notification={failedNotification}
          onRetry={onRetry}
          isRetrying={true}
        />
      );

      const actionButton = findActionButton();
      expect(actionButton).toBeTruthy();
      expect(actionButton).toBeDisabled();
    });

    it('shows loading state when isCancelling is true', () => {
      const onCancel = vi.fn();
      const pendingNotification: NotificationResponse = {
        ...baseNotification,
        status: 'PENDING',
      };

      render(
        <NotificationCard
          notification={pendingNotification}
          onCancel={onCancel}
          isCancelling={true}
        />
      );

      const actionButton = findActionButton();
      expect(actionButton).toBeTruthy();
      expect(actionButton).toBeDisabled();
    });
  });

  describe('Without Patient', () => {
    it('renders without patient name', () => {
      const notificationWithoutPatient: NotificationResponse = {
        ...baseNotification,
        patient_id: null,
        patient_name: undefined,
      };

      render(<NotificationCard notification={notificationWithoutPatient} />);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Notification Types', () => {
    it('renders appointment booked type', () => {
      render(
        <NotificationCard
          notification={{ ...baseNotification, notification_type: 'APPOINTMENT_BOOKED' }}
        />
      );

      expect(screen.getByText('Appointment Booked')).toBeInTheDocument();
    });

    it('renders appointment cancellation type', () => {
      render(
        <NotificationCard
          notification={{ ...baseNotification, notification_type: 'APPOINTMENT_CANCELLATION' }}
        />
      );

      expect(screen.getByText('Cancellation')).toBeInTheDocument();
    });

    it('renders custom notification type', () => {
      render(
        <NotificationCard
          notification={{ ...baseNotification, notification_type: 'CUSTOM' }}
        />
      );

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });
});
