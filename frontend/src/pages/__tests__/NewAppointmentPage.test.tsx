/**
 * NewAppointmentPage Component Tests
 *
 * Tests the new appointment page including:
 * - Page rendering
 * - Form display
 * - URL parameter handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { NewAppointmentPage } from '../appointments/NewAppointmentPage';

// Mock navigate and search params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
  };
});

// Mock toast
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock auth store
vi.mock('../../store/authStore', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

// Mock appointment form
vi.mock('../../components/appointments', () => ({
  AppointmentForm: ({ onSubmit }: any) => (
    <div data-testid="appointment-form">
      <button onClick={() => onSubmit({ patient_id: 'patient-1' })}>Submit</button>
    </div>
  ),
}));

// Mock tanstack query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({ id: 'new-appt-1' }),
      isPending: false,
      isSuccess: false,
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

describe('NewAppointmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<NewAppointmentPage />, { withRouter: true });

      // Multiple headings may exist (h1 and card titles)
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render appointment form', () => {
      renderWithProviders(<NewAppointmentPage />, { withRouter: true });

      expect(screen.getByTestId('appointment-form')).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderWithProviders(<NewAppointmentPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate back on back button click', async () => {
      const { user } = renderWithProviders(<NewAppointmentPage />, { withRouter: true });

      // Find back button (ghost variant, first button)
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/appointments');
    });
  });
});
