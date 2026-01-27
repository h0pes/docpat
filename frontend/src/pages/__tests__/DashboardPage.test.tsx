/**
 * DashboardPage Component Tests
 *
 * Tests the main dashboard page including:
 * - Page rendering
 * - Statistics display
 * - Recent activity
 * - Quick actions navigation
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { DashboardPage } from '../DashboardPage';

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      username: 'testdoctor',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'DOCTOR',
      status: 'ACTIVE',
    },
  })),
}));

// Mock the reports hook
vi.mock('@/hooks/useReports', () => ({
  useDashboardReport: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
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

// Mock i18next with dashboard translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'nav.dashboard': 'Dashboard',
        'nav.patients': 'Patients',
        'nav.appointments': 'Appointments',
        'nav.visits': 'Visits',
        'prescriptions.title': 'Prescriptions',
        'prescriptions.stats.active': 'Active',
        'dashboard.welcome': `Welcome back, ${params?.name || 'User'}`,
        'dashboard.active': 'Active',
        'dashboard.today': 'Today',
        'dashboard.this_week': 'This week',
        'dashboard.recent_activity': 'Recent Activity',
        'dashboard.quick_actions': 'Quick Actions',
        'dashboard.no_recent_activity': 'No recent activity',
        'dashboard.view_all_activity': 'View All Activity',
        'dashboard.new_appointment': 'New Appointment',
        'dashboard.new_patient': 'New Patient',
        'dashboard.new_visit': 'New Visit',
        'dashboard.new_prescription': 'New Prescription',
        'dashboard.error_loading': 'Failed to load dashboard data',
        'common.actions.retry': 'Retry',
        'appointments.status.scheduled': 'Scheduled',
        'appointments.status.completed': 'Completed',
        'visits.status.scheduled': 'Scheduled',
        'visits.status.completed': 'Completed',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Import mocked modules for manipulation
import { useDashboardReport } from '@/hooks/useReports';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render dashboard page with header', () => {
      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    });

    it('should render welcome message with user name', () => {
      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });

    it('should render quick actions section', () => {
      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('should render statistics cards', () => {
      renderWithProviders(<DashboardPage />, { withRouter: true });

      // Should render patient, appointment, visit, prescription cards
      expect(screen.getByText('Patients')).toBeInTheDocument();
      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons when data is loading', () => {
      vi.mocked(useDashboardReport).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      const { container } = renderWithProviders(<DashboardPage />, { withRouter: true });

      // Should show skeleton loaders
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should show error message when data loading fails', () => {
      vi.mocked(useDashboardReport).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      const mockRefetch = vi.fn();
      vi.mocked(useDashboardReport).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display statistics from API', () => {
      vi.mocked(useDashboardReport).mockReturnValue({
        data: {
          quick_stats: {
            active_patients: 150,
            appointments_today: 8,
            visits_this_week: 25,
            active_prescriptions: 42,
          },
          recent_activity: {
            recent_appointments: [],
            recent_visits: [],
          },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display recent activity', () => {
      vi.mocked(useDashboardReport).mockReturnValue({
        data: {
          quick_stats: {
            active_patients: 0,
            appointments_today: 0,
            visits_this_week: 0,
            active_prescriptions: 0,
          },
          recent_activity: {
            recent_appointments: [
              {
                id: '1',
                patient_name: 'Test Patient',
                appointment_type: 'Checkup',
                scheduled_start: new Date().toISOString(),
                status: 'SCHEDULED',
              },
            ],
            recent_visits: [],
          },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByText('Test Patient')).toBeInTheDocument();
      expect(screen.getByText('Checkup')).toBeInTheDocument();
    });

    it('should show empty state when no recent activity', () => {
      vi.mocked(useDashboardReport).mockReturnValue({
        data: {
          quick_stats: {
            active_patients: 0,
            appointments_today: 0,
            visits_this_week: 0,
            active_prescriptions: 0,
          },
          recent_activity: {
            recent_appointments: [],
            recent_visits: [],
          },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<DashboardPage />, { withRouter: true });

      expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      vi.mocked(useDashboardReport).mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });
    });

    it('should navigate to new appointment page', async () => {
      const { user } = renderWithProviders(<DashboardPage />, { withRouter: true });

      const newAppointmentBtn = screen.getByRole('button', { name: /new appointment/i });
      await user.click(newAppointmentBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/appointments/new');
    });

    it('should navigate to new patient page', async () => {
      const { user } = renderWithProviders(<DashboardPage />, { withRouter: true });

      const newPatientBtn = screen.getByRole('button', { name: /new patient/i });
      await user.click(newPatientBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/new');
    });

    it('should navigate to new visit page', async () => {
      const { user } = renderWithProviders(<DashboardPage />, { withRouter: true });

      const newVisitBtn = screen.getByRole('button', { name: /new visit/i });
      await user.click(newVisitBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/visits/new');
    });

    it('should navigate to new prescription page', async () => {
      const { user } = renderWithProviders(<DashboardPage />, { withRouter: true });

      const newPrescriptionBtn = screen.getByRole('button', { name: /new prescription/i });
      await user.click(newPrescriptionBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/prescriptions/new');
    });

    it('should navigate to view all activity', async () => {
      const { user } = renderWithProviders(<DashboardPage />, { withRouter: true });

      const viewAllBtn = screen.getByRole('button', { name: /view all activity/i });
      await user.click(viewAllBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/appointments');
    });
  });
});
