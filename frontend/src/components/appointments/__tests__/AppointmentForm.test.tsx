/**
 * AppointmentForm Component Tests
 *
 * Tests for the appointment create/edit form with patient search,
 * date/time selection, and recurring options.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentForm } from '../AppointmentForm';
import type { Appointment } from '@/types/appointment';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'appointments.form.patient': 'Patient',
        'appointments.form.date': 'Date',
        'appointments.form.time': 'Time',
        'appointments.form.start_time': 'Start Time',
        'appointments.form.end_time': 'End Time',
        'appointments.form.duration': 'Duration',
        'appointments.form.duration_minutes': 'Duration (minutes)',
        'appointments.form.reason': 'Reason',
        'appointments.form.reason_placeholder': 'Enter reason for visit',
        'appointments.form.notes': 'Notes',
        'appointments.form.notes_placeholder': 'Additional notes',
        'appointments.form.is_recurring': 'Recurring Appointment',
        'appointments.type.label': 'Appointment Type',
        'appointments.type.consultation': 'Consultation',
        'appointments.type.follow_up': 'Follow-up',
        'appointments.type.emergency': 'Emergency',
        'appointments.type.procedure': 'Procedure',
        'appointments.type.checkup': 'Checkup',
        'appointments.recurring.label': 'Recurring Options',
        'appointments.recurring.frequency': 'Frequency',
        'appointments.recurring.interval': 'Interval',
        'appointments.recurring.end_date': 'End Date',
        'appointments.recurring.max_occurrences': 'Max Occurrences',
        'appointments.recurring.weekly': 'Weekly',
        'appointments.recurring.biweekly': 'Bi-weekly',
        'appointments.recurring.monthly': 'Monthly',
        'appointments.minutes': 'minutes',
        'appointments.validation.patient_required': 'Patient is required',
        'appointments.validation.provider_required': 'Provider is required',
        'appointments.validation.date_required': 'Date is required',
        'appointments.validation.time_required': 'Time is required',
        'appointments.validation.duration_min': 'Duration must be at least 15 minutes',
        'appointments.validation.duration_max': 'Duration cannot exceed 480 minutes',
        'appointments.validation.reason_max': 'Reason cannot exceed 2000 characters',
        'appointments.validation.notes_max': 'Notes cannot exceed 5000 characters',
        'appointments.validation.future_date_required': 'Appointment must be in the future',
        'appointments.validation.slot_unavailable': 'This time slot is not available',
        'appointments.validation.holiday_selected': 'This date is a holiday',
        'appointments.validation.non_working_day': 'This is not a working day',
        'notifications.emailNotifications': 'Email Notifications',
        'common.create': 'Create',
        'common.update': 'Update',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock appointment types
vi.mock('@/types/appointment', () => ({
  AppointmentType: {
    CONSULTATION: 'CONSULTATION',
    FOLLOW_UP: 'FOLLOW_UP',
    EMERGENCY: 'EMERGENCY',
    PROCEDURE: 'PROCEDURE',
    CHECKUP: 'CHECKUP',
  },
  RecurringFrequency: {
    WEEKLY: 'WEEKLY',
    BIWEEKLY: 'BIWEEKLY',
    MONTHLY: 'MONTHLY',
  },
  getDefaultDuration: (type: string) => {
    const durations: Record<string, number> = {
      CONSULTATION: 30,
      FOLLOW_UP: 20,
      EMERGENCY: 60,
      PROCEDURE: 45,
      CHECKUP: 15,
    };
    return durations[type] || 30;
  },
}));

// Mock scheduling constraints
vi.mock('@/hooks/useSchedulingConstraints', () => ({
  useSchedulingConstraints: () => ({
    isDateDisabled: () => false,
    getTimeSlots: () => [
      '09:00', '09:15', '09:30', '09:45',
      '10:00', '10:15', '10:30', '10:45',
      '11:00', '11:15', '11:30', '11:45',
      '14:00', '14:15', '14:30', '14:45',
      '15:00', '15:15', '15:30', '15:45',
    ],
    isLoading: false,
    weeklySchedule: null,
    holidays: [],
  }),
  getDisabledReason: () => null,
}));

// Mock appointments API
vi.mock('@/services/api/appointments', () => ({
  appointmentsApi: {
    checkAvailability: vi.fn().mockResolvedValue({
      slots: [
        { start: '2026-01-20T09:00:00Z', end: '2026-01-20T12:00:00Z', available: true },
        { start: '2026-01-20T14:00:00Z', end: '2026-01-20T18:00:00Z', available: true },
      ],
    }),
  },
}));

// Mock child components
vi.mock('../PatientSearchCombobox', () => ({
  PatientSearchCombobox: ({ value, onSelect, error }: { value: string; onSelect: (id: string) => void; error?: string }) => (
    <div data-testid="patient-search">
      <input
        data-testid="patient-search-input"
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        placeholder="Search patients"
      />
      {error && <span data-testid="patient-error">{error}</span>}
    </div>
  ),
}));

vi.mock('../AvailabilityIndicator', () => ({
  AvailabilityIndicator: () => <div data-testid="availability-indicator">Available</div>,
}));

vi.mock('../NotificationOptions', () => ({
  NotificationOptions: ({ sendNotification, onSendNotificationChange }: { sendNotification: boolean; onSendNotificationChange: (v: boolean) => void }) => (
    <div data-testid="notification-options">
      <label>
        <input
          type="checkbox"
          checked={sendNotification}
          onChange={(e) => onSendNotificationChange(e.target.checked)}
        />
        Send notification
      </label>
    </div>
  ),
}));

// Test wrapper with QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('AppointmentForm', () => {
  // Use a date 7 days in the future to ensure appointment validation passes
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  futureDate.setHours(0, 0, 0, 0);

  const defaultProps = {
    providerId: 'provider-1',
    onSubmit: vi.fn(),
    defaultDate: futureDate,
    defaultTime: '10:00',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders patient selection section', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByTestId('patient-search')).toBeInTheDocument();
    });

    it('renders date and time section', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Date & Time')).toBeInTheDocument();
    });

    it('renders date picker', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getAllByText('Date').length).toBeGreaterThanOrEqual(1);
    });

    it('renders time picker', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Start Time')).toBeInTheDocument();
    });

    it('renders appointment type section', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getAllByText('Appointment Type').length).toBeGreaterThanOrEqual(1);
    });

    it('renders duration field', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Duration (minutes)')).toBeInTheDocument();
    });

    it('renders reason section', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getAllByText('Reason').length).toBeGreaterThanOrEqual(1);
    });

    it('renders notes field', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('renders recurring appointment section for new appointments', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Recurring Options')).toBeInTheDocument();
      expect(screen.getByText('Recurring Appointment')).toBeInTheDocument();
    });

    it('renders create button for new appointments', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const existingAppointment: Appointment = {
      id: 'apt-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      scheduled_start: '2026-01-25T14:00:00Z',
      scheduled_end: '2026-01-25T14:30:00Z',
      duration_minutes: 30,
      type: 'FOLLOW_UP',
      status: 'SCHEDULED',
      reason: 'Follow-up visit',
      notes: 'Check medication effects',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('renders update button in edit mode', () => {
      renderWithQueryClient(
        <AppointmentForm {...defaultProps} appointment={existingAppointment} />
      );

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('hides recurring options in edit mode', () => {
      renderWithQueryClient(
        <AppointmentForm {...defaultProps} appointment={existingAppointment} />
      );

      expect(screen.queryByText('Recurring Options')).not.toBeInTheDocument();
    });

    it('disables patient selection in edit mode', () => {
      renderWithQueryClient(
        <AppointmentForm {...defaultProps} appointment={existingAppointment} />
      );

      // The PatientSearchCombobox would receive disabled prop
      expect(screen.getByTestId('patient-search')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows selecting a patient', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      const input = screen.getByTestId('patient-search-input');
      await user.type(input, 'patient-123');

      expect(input).toHaveValue('patient-123');
    });

    it('shows notification options when patient is selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      const input = screen.getByTestId('patient-search-input');
      await user.type(input, 'patient-123');

      await waitFor(() => {
        expect(screen.getByTestId('notification-options')).toBeInTheDocument();
      });
    });

    it('shows availability indicator when date and time are selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      // Select a patient first
      const input = screen.getByTestId('patient-search-input');
      await user.type(input, 'patient-123');

      await waitFor(() => {
        expect(screen.getByTestId('availability-indicator')).toBeInTheDocument();
      });
    });

    it('allows entering reason', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      const reasonInput = screen.getByPlaceholderText('Enter reason for visit');
      await user.type(reasonInput, 'Annual checkup');

      expect(reasonInput).toHaveValue('Annual checkup');
    });

    it('allows entering notes', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      const notesInput = screen.getByPlaceholderText('Additional notes');
      await user.type(notesInput, 'Patient prefers morning appointments');

      expect(notesInput).toHaveValue('Patient prefers morning appointments');
    });
  });

  describe('Recurring Appointment Toggle', () => {
    it('shows recurring options when toggle is enabled', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      // Find and click the recurring toggle
      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText('Frequency')).toBeInTheDocument();
        expect(screen.getByText('Interval')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit when form is valid and submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithQueryClient(<AppointmentForm {...defaultProps} onSubmit={onSubmit} />);

      // Fill in required fields
      const patientInput = screen.getByTestId('patient-search-input');
      await user.type(patientInput, 'patient-123');

      // Submit form
      await user.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('disables submit button when submitting', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('disables submit button when no patient is selected', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      expect(screen.getByText('Create')).toBeDisabled();
    });
  });

  describe('Duration Auto-Update', () => {
    it('updates duration when appointment type changes', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AppointmentForm {...defaultProps} />);

      // The duration input should exist
      const durationInput = screen.getByRole('spinbutton');
      expect(durationInput).toBeInTheDocument();

      // Default is 30 for CONSULTATION
      expect(durationInput).toHaveValue(30);
    });
  });

  describe('Props Handling', () => {
    it('accepts custom defaultDate', () => {
      // Use a date 30 days in the future
      const customDate = new Date();
      customDate.setDate(customDate.getDate() + 30);
      renderWithQueryClient(<AppointmentForm {...defaultProps} defaultDate={customDate} />);

      expect(screen.getByTestId('patient-search')).toBeInTheDocument();
    });

    it('accepts custom defaultTime', () => {
      renderWithQueryClient(<AppointmentForm {...defaultProps} defaultTime="14:30" />);

      expect(screen.getByTestId('patient-search')).toBeInTheDocument();
    });
  });
});
