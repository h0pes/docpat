/**
 * AppointmentsPage Component Tests
 *
 * Tests the main appointments page including:
 * - Page rendering
 * - Statistics display
 * - Calendar navigation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { AppointmentsPage } from '../appointments/AppointmentsPage';

// Mock appointments API
vi.mock('@/services/api/appointments', () => ({
  appointmentsApi: {
    getByDateRange: vi.fn().mockResolvedValue({ appointments: [] }),
    getStatistics: vi.fn().mockResolvedValue({
      upcoming_today: 5,
      upcoming_week: 20,
      no_show_rate: 0.05,
      cancellation_rate: 0.1,
    }),
    cancel: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock AppointmentCalendar to avoid react-big-calendar issues
vi.mock('@/components/appointments/AppointmentCalendar', () => ({
  AppointmentCalendar: ({ appointments, isLoading }: any) => (
    <div data-testid="appointment-calendar">
      {isLoading ? 'Loading calendar...' : `Calendar with ${appointments?.length || 0} appointments`}
    </div>
  ),
}));

// Mock PrintScheduleButton
vi.mock('@/components/appointments/PrintScheduleButton', () => ({
  PrintScheduleButton: () => <button>Print</button>,
}));

// Mock i18next with appointments translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'appointments.title': 'Appointments',
        'appointments.subtitle': 'Manage your appointments',
        'appointments.actions.new': 'New Appointment',
        'appointments.actions.cancel': 'Cancel Appointment',
        'appointments.statistics.upcoming_today': 'Today',
        'appointments.statistics.upcoming_week': 'This Week',
        'appointments.statistics.no_show_rate': 'No-Show Rate',
        'appointments.statistics.cancellation_rate': 'Cancellation Rate',
        'appointments.total_count': `${params?.count || 0} appointments`,
        'appointments.error_title': 'Error',
        'appointments.error_loading': 'Failed to load appointments',
        'appointments.retry': 'Retry',
        'appointments.cancel.confirmTitle': 'Cancel Appointment',
        'appointments.cancel.confirmMessage': 'Are you sure you want to cancel this appointment?',
        'appointments.cancel.reason_label': 'Cancellation Reason',
        'appointments.cancel.reason_placeholder': 'Enter reason for cancellation',
        'common.cancel': 'Cancel',
        'common.loading': 'Loading...',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Import mocked module
import { appointmentsApi } from '@/services/api/appointments';

describe('AppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Appointments');
    });

    it('should render new appointment button', () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /new appointment/i })).toBeInTheDocument();
    });

    it('should render statistics cards', async () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display upcoming today count', async () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should display upcoming week count', async () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument();
      });
    });

    it('should display no-show rate', async () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByText('5.0%')).toBeInTheDocument();
      });
    });

    it('should display cancellation rate', async () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByText('10.0%')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to new appointment page', async () => {
      const { user } = renderWithProviders(<AppointmentsPage />, { withRouter: true });

      const newBtn = screen.getByRole('button', { name: /new/i });
      await user.click(newBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/appointments/new');
    });
  });

  describe('Error State', () => {
    it('should show error state when API fails', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockRejectedValue(new Error('API Error'));

      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockRejectedValue(new Error('API Error'));

      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Appointments Display', () => {
    it('should display appointment count badge', async () => {
      vi.mocked(appointmentsApi.getByDateRange).mockResolvedValue({
        appointments: [
          { id: '1', patient_name: 'Test Patient' },
          { id: '2', patient_name: 'Another Patient' },
        ],
      });

      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      await waitFor(() => {
        // Check for the badge with appointment count text
        expect(screen.getByText('2 appointments')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Dialog', () => {
    it('should not show cancel dialog by default', () => {
      renderWithProviders(<AppointmentsPage />, { withRouter: true });

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
