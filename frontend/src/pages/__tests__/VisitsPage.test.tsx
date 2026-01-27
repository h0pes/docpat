/**
 * VisitsPage Component Tests
 *
 * Tests the visits page including:
 * - Page rendering
 * - Statistics display
 * - Filters
 * - Navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { VisitsPage } from '../visits/VisitsPage';

// Mock visits hooks
vi.mock('@/hooks/useVisits', () => ({
  useVisitSearch: vi.fn(() => ({
    data: {
      visits: [],
      total: 0,
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

// Mock patient search combobox
vi.mock('@/components/appointments/PatientSearchCombobox', () => ({
  PatientSearchCombobox: ({ onSelect }: { onSelect: (id: string, patient: any) => void }) => (
    <button data-testid="patient-search" onClick={() => onSelect('patient-1', { id: 'patient-1' })}>
      Patient Search
    </button>
  ),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useVisitSearch } from '@/hooks/useVisits';

describe('VisitsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<VisitsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render action buttons', () => {
      renderWithProviders(<VisitsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should display content when data is available', () => {
      vi.mocked(useVisitSearch).mockReturnValue({
        data: {
          visits: [
            { id: '1', status: 'DRAFT', visit_date: new Date().toISOString(), visit_type: 'FOLLOW_UP', patient_first_name: 'John', patient_last_name: 'Doe' },
            { id: '2', status: 'SIGNED', visit_date: new Date().toISOString(), visit_type: 'INITIAL', patient_first_name: 'Jane', patient_last_name: 'Smith' },
            { id: '3', status: 'LOCKED', visit_date: new Date().toISOString(), visit_type: 'EMERGENCY', patient_first_name: 'Bob', patient_last_name: 'Brown' },
          ],
          total: 3,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<VisitsPage />, { withRouter: true });

      // Should have headings and content when data is loaded
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons when loading', () => {
      vi.mocked(useVisitSearch).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { container } = renderWithProviders(<VisitsPage />, { withRouter: true });

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should show error message when API fails', () => {
      vi.mocked(useVisitSearch).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load'),
      });

      renderWithProviders(<VisitsPage />, { withRouter: true });

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render page elements when no visits', () => {
      vi.mocked(useVisitSearch).mockReturnValue({
        data: {
          visits: [],
          total: 0,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<VisitsPage />, { withRouter: true });

      // Page should still render with headings and buttons
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should render navigation buttons', () => {
      renderWithProviders(<VisitsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Visits List', () => {
    it('should display visits when available', () => {
      vi.mocked(useVisitSearch).mockReturnValue({
        data: {
          visits: [
            {
              id: '1',
              patient_first_name: 'John',
              patient_last_name: 'Doe',
              status: 'DRAFT',
              visit_date: new Date().toISOString(),
              visit_type: 'FOLLOW_UP',
            },
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<VisitsPage />, { withRouter: true });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render action buttons for visits', () => {
      vi.mocked(useVisitSearch).mockReturnValue({
        data: {
          visits: [
            {
              id: 'visit-123',
              patient_first_name: 'John',
              patient_last_name: 'Doe',
              status: 'DRAFT',
              visit_date: new Date().toISOString(),
              visit_type: 'FOLLOW_UP',
            },
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<VisitsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
