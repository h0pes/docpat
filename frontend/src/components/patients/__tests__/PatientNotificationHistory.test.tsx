/**
 * PatientNotificationHistory Component Tests
 *
 * Tests for the patient notification history display component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientNotificationHistory } from '../PatientNotificationHistory';
import * as useNotificationsModule from '@/hooks/useNotifications';
import type { Notification } from '@/types/notification';

// Mock useNotifications hooks
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useRetryNotification: vi.fn(),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock i18next - return keys as values for simpler testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock notification data
const createMockNotification = (overrides?: Partial<Notification>): Notification => ({
  id: 'notif-1',
  patient_id: 'patient-123',
  appointment_id: 'apt-123',
  notification_type: 'APPOINTMENT_REMINDER',
  recipient_email: 'patient@example.com',
  subject: 'Appointment Reminder',
  body: 'Your appointment is scheduled for tomorrow',
  status: 'SENT',
  scheduled_for: '2024-01-15T09:00:00Z',
  sent_at: '2024-01-15T09:00:00Z',
  created_at: '2024-01-14T10:00:00Z',
  updated_at: '2024-01-15T09:00:00Z',
  ...overrides,
});

const mockNotifications: Notification[] = [
  createMockNotification({ id: 'notif-1', status: 'SENT' }),
  createMockNotification({
    id: 'notif-2',
    status: 'FAILED',
    error_message: 'Email delivery failed',
  }),
  createMockNotification({ id: 'notif-3', status: 'PENDING', sent_at: undefined }),
];

describe('PatientNotificationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      data: { notifications: mockNotifications, total: 3 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    vi.mocked(useNotificationsModule.useRetryNotification).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders notification history title', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_history.title')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_history.description')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.actions.refresh')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      // Should show skeletons - look for rounded-full elements
      const skeletons = document.querySelectorAll('[class*="rounded"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error message on load error', () => {
      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
        isRefetching: false,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_history.load_error')).toBeInTheDocument();
    });

    it('shows retry button on error', () => {
      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
        isRefetching: false,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.actions.retry')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no notifications', () => {
      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: { notifications: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_history.no_notifications')).toBeInTheDocument();
    });
  });

  describe('Notification Display', () => {
    it('displays notification subjects', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getAllByText('Appointment Reminder').length).toBeGreaterThan(0);
    });

    it('displays recipient email', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      const emails = screen.getAllByText('patient@example.com');
      expect(emails.length).toBeGreaterThan(0);
    });

    it('displays status badges', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('notifications.status.sent')).toBeInTheDocument();
      expect(screen.getByText('notifications.status.failed')).toBeInTheDocument();
      expect(screen.getByText('notifications.status.pending')).toBeInTheDocument();
    });

    it('displays error message for failed notifications', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Email delivery failed')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('calls refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: { notifications: mockNotifications, total: 3 },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByText('common.actions.refresh'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('disables refresh button while refetching', () => {
      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: { notifications: mockNotifications, total: 3 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: true,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.actions.refresh').closest('button')).toBeDisabled();
    });
  });

  describe('Retry Functionality', () => {
    it('renders retry button for failed notifications', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      // Should have retry buttons for failed notifications - the second item is FAILED
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(1); // At least refresh + retry
    });
  });

  describe('Limit Prop', () => {
    it('passes limit to useNotifications hook', () => {
      render(<PatientNotificationHistory patientId="patient-123" limit={5} />, {
        wrapper: createWrapper(),
      });

      expect(useNotificationsModule.useNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: 'patient-123',
          limit: 5,
        })
      );
    });

    it('uses default limit of 10', () => {
      render(<PatientNotificationHistory patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(useNotificationsModule.useNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: 'patient-123',
          limit: 10,
        })
      );
    });
  });

  describe('Pagination Info', () => {
    it('shows pagination info when more notifications exist', () => {
      vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
        data: { notifications: mockNotifications, total: 25 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      } as any);

      render(<PatientNotificationHistory patientId="patient-123" limit={10} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/patients\.notification_history\.showing_of/)).toBeInTheDocument();
    });
  });
});
