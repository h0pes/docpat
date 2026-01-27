/**
 * EditVisitPage Component Tests
 *
 * Tests the edit visit page including:
 * - Page rendering
 * - Loading states
 * - Read-only states for signed/locked visits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { EditVisitPage } from '../visits/EditVisitPage';

// Mock navigate and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'visit-123' }),
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

// Mock visit form
vi.mock('@/components/visits', () => ({
  VisitForm: ({ initialValues, onCancel }: any) => (
    <div data-testid="visit-form">
      {initialValues?.chief_complaint}
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock visits hooks
vi.mock('@/hooks/useVisits', () => ({
  useVisit: vi.fn(() => ({
    data: {
      id: 'visit-123',
      patient_id: 'patient-123',
      status: 'DRAFT',
      chief_complaint: 'Test complaint',
      appointment_id: null,
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useUpdateVisit: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
}));

import { useVisit } from '@/hooks/useVisits';

describe('EditVisitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render back button', () => {
      renderWithProviders(<EditVisitPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render visit form with data', () => {
      renderWithProviders(<EditVisitPage />, { withRouter: true });

      expect(screen.getByTestId('visit-form')).toBeInTheDocument();
      expect(screen.getByText(/test complaint/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      vi.mocked(useVisit).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      const { container } = renderWithProviders(<EditVisitPage />, { withRouter: true });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error when visit not found', () => {
      vi.mocked(useVisit).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Visit not found'),
      } as any);

      renderWithProviders(<EditVisitPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /visits/i })).toBeInTheDocument();
    });
  });

  describe('Read-only States', () => {
    it('should show warning for signed visits', () => {
      vi.mocked(useVisit).mockReturnValue({
        data: {
          id: 'visit-123',
          status: 'SIGNED',
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<EditVisitPage />, { withRouter: true });

      expect(screen.getByText(/signed/i)).toBeInTheDocument();
    });

    it('should show warning for locked visits', () => {
      vi.mocked(useVisit).mockReturnValue({
        data: {
          id: 'visit-123',
          status: 'LOCKED',
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<EditVisitPage />, { withRouter: true });

      expect(screen.getByText(/locked/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back on cancel', async () => {
      // Ensure visit status is DRAFT so form with Cancel button is shown
      vi.mocked(useVisit).mockReturnValue({
        data: {
          id: 'visit-123',
          patient_id: 'patient-123',
          status: 'DRAFT',
          chief_complaint: 'Test complaint',
          appointment_id: null,
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const { user } = renderWithProviders(<EditVisitPage />, { withRouter: true });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/visits/visit-123');
    });
  });
});
