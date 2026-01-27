/**
 * PrescriptionsPage Component Tests
 *
 * Tests the prescriptions page including:
 * - Page rendering
 * - Statistics display
 * - Filters
 * - Prescription actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { PrescriptionsPage } from '../prescriptions/PrescriptionsPage';

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      username: 'doctor',
      role: 'DOCTOR',
    },
  })),
}));

// Mock visits hooks
vi.mock('@/hooks/useVisits', () => ({
  usePrescriptionSearch: vi.fn(() => ({
    data: {
      prescriptions: [],
      total: 0,
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useDiscontinuePrescription: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeletePrescription: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCreatePrescription: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useResumePrescription: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCreateCustomMedication: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock drug interactions hook
vi.mock('@/hooks/useDrugInteractions', () => ({
  usePatientDrugInteractions: vi.fn(() => ({
    data: null,
  })),
}));

// Mock components
vi.mock('@/components/prescriptions', () => ({
  PrescriptionCard: ({ prescription, onView }: any) => (
    <div data-testid="prescription-card" onClick={onView}>
      {prescription.medication_name}
    </div>
  ),
  PrescriptionFilters: () => <div data-testid="prescription-filters">Filters</div>,
  DiscontinueDialog: () => <div data-testid="discontinue-dialog">Discontinue Dialog</div>,
  RenewDialog: () => <div data-testid="renew-dialog">Renew Dialog</div>,
  PrintPrescriptionDialog: () => <div data-testid="print-dialog">Print Dialog</div>,
  StatusLegend: () => <div data-testid="status-legend">Status Legend</div>,
}));

vi.mock('@/components/prescriptions/CustomMedicationDialog', () => ({
  CustomMedicationDialog: ({ open }: any) => (
    open ? <div data-testid="custom-medication-dialog">Custom Medication Dialog</div> : null
  ),
}));

vi.mock('@/components/appointments/PatientSearchCombobox', () => ({
  PatientSearchCombobox: ({ onSelect }: any) => (
    <button data-testid="patient-search" onClick={() => onSelect('patient-1')}>
      Patient Search
    </button>
  ),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
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

import { usePrescriptionSearch } from '@/hooks/useVisits';

describe('PrescriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render action buttons', () => {
      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render filters', () => {
      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      expect(screen.getByTestId('prescription-filters')).toBeInTheDocument();
    });

    it('should render status legend', () => {
      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      expect(screen.getByTestId('status-legend')).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('should display prescriptions when data is available', () => {
      vi.mocked(usePrescriptionSearch).mockReturnValue({
        data: {
          prescriptions: [
            { id: '1', status: 'ACTIVE', medication_name: 'Test Med' },
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      expect(screen.getByText('Test Med')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons when loading', () => {
      vi.mocked(usePrescriptionSearch).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { container } = renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should show error message when API fails', () => {
      vi.mocked(usePrescriptionSearch).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load'),
      });

      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render page with no prescriptions', () => {
      vi.mocked(usePrescriptionSearch).mockReturnValue({
        data: {
          prescriptions: [],
          total: 0,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      // Page should still render filters and legend
      expect(screen.getByTestId('prescription-filters')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render navigation buttons', () => {
      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Prescriptions List', () => {
    it('should display prescriptions when available', () => {
      vi.mocked(usePrescriptionSearch).mockReturnValue({
        data: {
          prescriptions: [
            { id: '1', medication_name: 'Aspirin', status: 'ACTIVE' },
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<PrescriptionsPage />, { withRouter: true });

      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });
  });
});
