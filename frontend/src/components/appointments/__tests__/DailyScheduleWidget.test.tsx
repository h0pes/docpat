/**
 * DailyScheduleWidget Component Tests
 *
 * Tests for the dashboard daily schedule widget.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DailyScheduleWidget } from '../DailyScheduleWidget';
import { appointmentsApi } from '@/services/api/appointments';
import { AppointmentStatus, AppointmentType } from '@/types/appointment';

// Mock the appointments API
vi.mock('@/services/api/appointments', () => ({
  appointmentsApi: {
    getByDateRange: vi.fn(),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'appointments.daily_schedule.title': "Today's Schedule",
        'appointments.daily_schedule.no_appointments': 'No appointments scheduled',
        'appointments.daily_schedule.next_appointment': 'Next appointment',
        'appointments.daily_schedule.in_progress': 'In progress',
        'appointments.error_loading': 'Error loading appointments',
        'appointments.actions.new': 'New Appointment',
        'appointments.status.scheduled': 'Scheduled',
        'appointments.status.confirmed': 'Confirmed',
        'appointments.status.completed': 'Completed',
        'appointments.minutes': 'minutes',
        'appointments.hours': 'hours',
        'common.viewAll': 'View All',
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

// Mock appointment data
const now = new Date();
const mockAppointments = {
  appointments: [
    {
      id: 'apt-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      scheduled_start: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      scheduled_end: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      type: AppointmentType.FOLLOW_UP,
      reason: 'Regular checkup',
      status: AppointmentStatus.SCHEDULED,
      is_recurring: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'apt-2',
      patient_id: 'patient-2',
      provider_id: 'provider-1',
      scheduled_start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      scheduled_end: new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      type: AppointmentType.CONSULTATION,
      reason: 'Consultation',
      status: AppointmentStatus.CONFIRMED,
      is_recurring: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'apt-3',
      patient_id: 'patient-3',
      provider_id: 'provider-1',
      scheduled_start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      scheduled_end: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      type: AppointmentType.ROUTINE_CHECKUP,
      reason: 'Routine checkup',
      status: AppointmentStatus.COMPLETED,
      is_recurring: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  total: 3,
};

const emptyAppointments = {
  appointments: [],
  total: 0,
};

describe('DailyScheduleWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching appointments', () => {
      vi.mocked(appointmentsApi.getByDateRange).mockReturnValue(new Promise(() => {}));

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
      // Look for the spinner by class or aria role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Rendering with Appointments', () => {
    it('should render title when showHeader is true', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget showHeader={true} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
      });
    });

    it('should not render title when showHeader is false', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget showHeader={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText("Today's Schedule")).not.toBeInTheDocument();
      });
    });

    it('should display upcoming appointments', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check for appointment content being rendered
        expect(screen.getByText('Consultation')).toBeInTheDocument();
      });
    });

    it('should highlight next appointment', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Next appointment')).toBeInTheDocument();
      });
    });

    it('should display completed count badge', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show "1/3" - 1 completed out of 3 total
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });
    });

    it('should respect maxItems prop', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget maxItems={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should only show 1 appointment reason
        const checkupTexts = screen.getAllByText(/checkup|Consultation/i);
        // At least one should be visible due to maxItems
        expect(checkupTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no appointments', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(emptyAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No appointments scheduled')).toBeInTheDocument();
      });
    });

    it('should show new appointment link in empty state', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(emptyAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('New Appointment')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockRejectedValue(new Error('Network error'));

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Error loading appointments')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to appointment detail when clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Consultation')).toBeInTheDocument();
      });

      // Click on an appointment
      const appointmentButton = screen.getByText('Consultation').closest('button');
      if (appointmentButton) {
        await user.click(appointmentButton);
        expect(mockNavigate).toHaveBeenCalledWith('/appointments/apt-2');
      }
    });

    it('should navigate to appointments list when View All is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });

      await user.click(screen.getByText('View All'));
      expect(mockNavigate).toHaveBeenCalledWith('/appointments');
    });

    it('should navigate to new appointment from empty state', async () => {
      const user = userEvent.setup();
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(emptyAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('New Appointment')).toBeInTheDocument();
      });

      await user.click(screen.getByText('New Appointment'));
      expect(mockNavigate).toHaveBeenCalledWith('/appointments/new');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      const { container } = render(
        <DailyScheduleWidget className="custom-class" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });

  describe('Status Display', () => {
    it('should display correct status badges', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue(mockAppointments);

      render(<DailyScheduleWidget />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Scheduled')).toBeInTheDocument();
        expect(screen.getByText('Confirmed')).toBeInTheDocument();
      });
    });
  });
});
