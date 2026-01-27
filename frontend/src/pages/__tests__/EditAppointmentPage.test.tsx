/**
 * EditAppointmentPage Component Tests
 *
 * Tests the edit appointment page including:
 * - Page rendering
 * - Loading states
 * - Edit disabled states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { EditAppointmentPage } from '../appointments/EditAppointmentPage';

// Mock navigate and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'appt-123' }),
  };
});

// Mock toast
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock appointment form
vi.mock('../../components/appointments', () => ({
  AppointmentForm: ({ appointment, onSubmit }: any) => (
    <div data-testid="appointment-form">
      {appointment?.id}
      <button onClick={() => onSubmit({})}>Submit</button>
    </div>
  ),
}));

import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: {
        id: 'appt-123',
        patient_id: 'patient-123',
        provider_id: 'provider-1',
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 30 * 60000).toISOString(),
        status: 'SCHEDULED',
        type: 'CHECKUP',
      },
      isLoading: false,
      error: null,
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

describe('EditAppointmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<EditAppointmentPage />, { withRouter: true });

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render appointment form', () => {
      renderWithProviders(<EditAppointmentPage />, { withRouter: true });

      expect(screen.getByTestId('appointment-form')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any);

      const { container } = renderWithProviders(<EditAppointmentPage />, { withRouter: true });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error when appointment not found', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      } as any);

      renderWithProviders(<EditAppointmentPage />, { withRouter: true });

      expect(screen.getByText(/not.*found/i)).toBeInTheDocument();
    });
  });

  describe('Edit Disabled', () => {
    it('should show warning for cancelled appointments', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          id: 'appt-123',
          status: 'CANCELLED',
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(<EditAppointmentPage />, { withRouter: true });

      // There may be multiple text elements for the warning, use queryAllBy to check at least one exists
      const warnings = screen.queryAllByText(/cannot.*edit/i);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should show warning for completed appointments', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          id: 'appt-123',
          status: 'COMPLETED',
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(<EditAppointmentPage />, { withRouter: true });

      // There may be multiple text elements for the warning, use queryAllBy to check at least one exists
      const warnings = screen.queryAllByText(/cannot.*edit/i);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});
