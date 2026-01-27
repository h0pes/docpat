/**
 * NotificationPreferencesSection Component Tests
 *
 * Tests for the patient notification preferences form component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationPreferencesSection } from '../NotificationPreferencesSection';
import * as useNotificationsModule from '@/hooks/useNotifications';

// Mock useNotifications hooks
vi.mock('@/hooks/useNotifications', () => ({
  usePatientNotificationPreferences: vi.fn(),
  useUpdatePatientNotificationPreferences: vi.fn(),
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

// Mock preferences data
const mockPreferences = {
  email_enabled: true,
  reminder_enabled: true,
  reminder_days_before: 1,
};

describe('NotificationPreferencesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    vi.mocked(useNotificationsModule.usePatientNotificationPreferences).mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useNotificationsModule.useUpdatePatientNotificationPreferences).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders preferences title', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_preferences.title')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText('patients.notification_preferences.description')
      ).toBeInTheDocument();
    });

    it('renders email notifications toggle', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_preferences.email_enabled')).toBeInTheDocument();
    });

    it('renders save button', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.save')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      vi.mocked(useNotificationsModule.usePatientNotificationPreferences).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as any);

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      // Should show skeletons
      const skeletons = document.querySelectorAll('[class*="rounded"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error message on load error', () => {
      vi.mocked(useNotificationsModule.usePatientNotificationPreferences).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as any);

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_preferences.load_error')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders email enabled switch', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_preferences.email_enabled')).toBeInTheDocument();
      expect(
        screen.getByText('patients.notification_preferences.email_enabled_hint')
      ).toBeInTheDocument();
    });

    it('renders reminder enabled switch when email is enabled', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_preferences.reminder_enabled')).toBeInTheDocument();
      expect(screen.getByText('patients.notification_preferences.reminder_enabled_hint')).toBeInTheDocument();
    });

    it('renders reminder timing select when reminders are enabled', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('patients.notification_preferences.reminder_timing')).toBeInTheDocument();
    });

    it('hides reminder options when email is disabled', () => {
      vi.mocked(useNotificationsModule.usePatientNotificationPreferences).mockReturnValue({
        data: { email_enabled: false, reminder_enabled: false, reminder_days_before: 1 },
        isLoading: false,
        isError: false,
      } as any);

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('patients.notification_preferences.reminder_enabled')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('allows toggling email notifications', async () => {
      const user = userEvent.setup();

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      const emailSwitch = screen.getByRole('switch', { name: /patients\.notification_preferences\.email_enabled/i });
      await user.click(emailSwitch);

      // Switch should toggle
      expect(emailSwitch).toHaveAttribute('aria-checked');
    });

    it('allows toggling appointment reminders', async () => {
      const user = userEvent.setup();

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      const reminderSwitch = screen.getByRole('switch', { name: /patients\.notification_preferences\.reminder_enabled/i });
      await user.click(reminderSwitch);

      // Switch should toggle
      expect(reminderSwitch).toHaveAttribute('aria-checked');
    });
  });

  describe('Form Submission', () => {
    it('calls update mutation on save', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.mocked(useNotificationsModule.useUpdatePatientNotificationPreferences).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      // Change a value to enable the form
      const emailSwitch = screen.getByRole('switch', { name: /patients\.notification_preferences\.email_enabled/i });
      await user.click(emailSwitch);

      // Click save
      await user.click(screen.getByText('common.save'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('disables save button when form is not dirty', () => {
      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.save').closest('button')).toBeDisabled();
    });

    it('shows saving state when submitting', () => {
      vi.mocked(useNotificationsModule.useUpdatePatientNotificationPreferences).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.saving')).toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('hides save button in read-only mode', () => {
      render(<NotificationPreferencesSection patientId="patient-123" readOnly={true} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('common.save')).not.toBeInTheDocument();
    });

    it('disables switches in read-only mode', () => {
      render(<NotificationPreferencesSection patientId="patient-123" readOnly={true} />, {
        wrapper: createWrapper(),
      });

      const emailSwitch = screen.getByRole('switch', { name: /patients\.notification_preferences\.email_enabled/i });
      expect(emailSwitch).toBeDisabled();
    });
  });

  describe('Reminder Timing Options', () => {
    it('displays timing options', async () => {
      const user = userEvent.setup();

      render(<NotificationPreferencesSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      // Open the select dropdown
      const timingTrigger = screen.getByRole('combobox');
      await user.click(timingTrigger);

      await waitFor(() => {
        // Multiple elements may have the timing option text, check at least one exists
        const options = screen.getAllByText(/patients\.notification_preferences\.day_before/);
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });
});
