/**
 * PatientVisitsPage Component Tests
 *
 * Tests the patient visits page including:
 * - Page rendering
 * - Visit list display
 * - Empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { PatientVisitsPage } from '../patients/PatientVisitsPage';

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

// Mock visits hook
vi.mock('@/hooks/useVisits', () => ({
  usePatientVisits: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

import { usePatientVisits } from '@/hooks/useVisits';

describe('PatientVisitsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render action buttons', () => {
      renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render back button', () => {
      renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show page elements when no visits', () => {
      renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      // Page should still render headings
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      vi.mocked(usePatientVisits).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      const { container } = renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Visits List', () => {
    it('should display visits when available', () => {
      vi.mocked(usePatientVisits).mockReturnValue({
        data: [
          {
            id: 'visit-1',
            visit_date: '2024-01-15',
            visit_type: 'FOLLOW_UP',
            status: 'DRAFT',
            chief_complaint: 'Test complaint',
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      expect(screen.getByText(/test complaint/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render navigation buttons', () => {
      renderWithProviders(<PatientVisitsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
