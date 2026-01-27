/**
 * EditPatientPage Component Tests
 *
 * Tests the edit patient page including:
 * - Page rendering
 * - Form display with patient data
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { EditPatientPage } from '../patients/EditPatientPage';

// Mock navigate and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'patient-123' }),
  };
});

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock patient form
vi.mock('@/components/patients', () => ({
  PatientForm: ({ patient, onCancel }: any) => (
    <div data-testid="patient-form">
      {patient?.first_name} {patient?.last_name}
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
  NotificationPreferencesSection: () => (
    <div data-testid="notification-preferences">Notification Preferences</div>
  ),
}));

// Mock spinner
vi.mock('@/components/Spinner', () => ({
  FullPageSpinner: () => <div data-testid="spinner">Loading...</div>,
}));

import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: {
        id: 'patient-123',
        first_name: 'John',
        last_name: 'Doe',
      },
      isLoading: false,
      isError: false,
      error: null,
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      cancelQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
    })),
  };
});

describe('EditPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<EditPatientPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
    });

    it('should render patient form with data', () => {
      renderWithProviders(<EditPatientPage />, { withRouter: true });

      expect(screen.getByTestId('patient-form')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should render notification preferences section', () => {
      renderWithProviders(<EditPatientPage />, { withRouter: true });

      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show spinner when loading', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<EditPatientPage />, { withRouter: true });

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error when patient not found', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Patient not found'),
      } as any);

      renderWithProviders(<EditPatientPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to patient detail on cancel', async () => {
      // Ensure useQuery returns data so form is rendered
      vi.mocked(useQuery).mockReturnValue({
        data: {
          id: 'patient-123',
          first_name: 'John',
          last_name: 'Doe',
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const { user } = renderWithProviders(<EditPatientPage />, { withRouter: true });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-123');
    });
  });
});
