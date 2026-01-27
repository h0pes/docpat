/**
 * NotificationOptions Component Tests
 *
 * Tests for notification options in appointment creation/editing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationOptions } from '../NotificationOptions';
import { patientsApi } from '@/services/api/patients';

// Mock the patients API
vi.mock('@/services/api/patients', () => ({
  patientsApi: {
    getById: vi.fn(),
  },
}));

// Mock the notifications hooks
vi.mock('@/hooks/useNotifications', () => ({
  usePatientNotificationPreferences: vi.fn(() => ({
    data: {
      email_enabled: true,
      reminder_enabled: true,
      reminder_days_before: 1,
    },
    isLoading: false,
  })),
  useEmailStatus: vi.fn(() => ({
    data: { enabled: true },
    isLoading: false,
  })),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading',
        'appointments.notifications.send_confirmation': 'Send email confirmation',
        'appointments.notifications.send_cancellation': 'Send cancellation notice',
        'appointments.notifications.confirmation_tooltip': 'Patient will receive an email confirmation',
        'appointments.notifications.cancellation_tooltip': 'Patient will receive a cancellation notice',
        'appointments.notifications.email_service_disabled': 'Email service is disabled',
        'appointments.notifications.no_email': 'Patient has no email address',
        'appointments.notifications.email_disabled_for_patient': 'Email notifications disabled for this patient',
        'appointments.notifications.reminders_enabled': `Reminders enabled (${params?.days || 1} days before)`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock patient data
const mockPatientWithEmail = {
  id: 'patient-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  date_of_birth: '1980-01-01',
  status: 'ACTIVE',
};

const mockPatientWithoutEmail = {
  ...mockPatientWithEmail,
  email: null,
};

// Helper to create QueryClient wrapper
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

describe('NotificationOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatientWithEmail);
  });

  describe('Rendering', () => {
    it('should render notification checkbox', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Send email confirmation')).toBeInTheDocument();
      });
    });

    it('should display patient email when available', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });
    });

    it('should not render when patientId is empty', () => {
      const { container } = render(
        <NotificationOptions
          patientId=""
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching patient data', () => {
      vi.mocked(patientsApi.getById).mockReturnValue(new Promise(() => {}));

      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Notification Type', () => {
    it('should render confirmation type by default', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Send email confirmation')).toBeInTheDocument();
      });
    });

    it('should render cancellation type when specified', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
          notificationType="cancellation"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Send cancellation notice')).toBeInTheDocument();
      });
    });
  });

  describe('Checkbox Interaction', () => {
    it('should call onSendNotificationChange when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onSendNotificationChange = vi.fn();

      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={false}
          onSendNotificationChange={onSendNotificationChange}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('checkbox'));
      expect(onSendNotificationChange).toHaveBeenCalledWith(true);
    });

    it('should be checked when sendNotification is true', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });
    });

    it('should be unchecked when sendNotification is false', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={false}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });
    });
  });

  describe('Disabled States', () => {
    it('should disable checkbox when patient has no email', async () => {
      vi.mocked(patientsApi.getById).mockResolvedValue(mockPatientWithoutEmail);

      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeDisabled();
      });
    });

    it('should show warning when patient has no email', async () => {
      vi.mocked(patientsApi.getById).mockResolvedValue(mockPatientWithoutEmail);

      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Patient has no email address')).toBeInTheDocument();
      });
    });
  });

  describe('Reminder Information', () => {
    it('should display reminder information when enabled', async () => {
      render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Reminders enabled/)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', async () => {
      const { container } = render(
        <NotificationOptions
          patientId="patient-1"
          sendNotification={true}
          onSendNotificationChange={vi.fn()}
          className="custom-class"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });
});
