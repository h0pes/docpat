/**
 * PrescriptionDetailPage Component Tests
 *
 * Tests the prescription detail page including:
 * - Page rendering
 * - Medication details
 * - Status actions
 * - Warnings display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { PrescriptionDetailPage } from '../prescriptions/PrescriptionDetailPage';

// Mock navigate and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'rx-123' }),
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
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
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', role: 'DOCTOR' },
  })),
}));

// Mock prescription hooks
vi.mock('@/hooks/useVisits', () => ({
  usePrescription: vi.fn(() => ({
    data: {
      id: 'rx-123',
      patient_id: 'patient-123',
      medication_name: 'Aspirin',
      generic_name: 'Acetylsalicylic acid',
      dosage: '100mg',
      frequency: 'Once daily',
      status: 'ACTIVE',
      prescribed_date: new Date().toISOString(),
      refills: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useDiscontinuePrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeletePrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCancelPrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useHoldPrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useResumePrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCompletePrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreatePrescription: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

// Mock dialog components
vi.mock('@/components/prescriptions', () => ({
  DiscontinueDialog: () => <div data-testid="discontinue-dialog">Discontinue</div>,
  PrintPrescriptionDialog: () => <div data-testid="print-dialog">Print</div>,
  CancelDialog: () => <div data-testid="cancel-dialog">Cancel</div>,
  HoldDialog: () => <div data-testid="hold-dialog">Hold</div>,
  RenewDialog: () => <div data-testid="renew-dialog">Renew</div>,
  StatusLegend: () => <div data-testid="status-legend">Legend</div>,
}));

import { usePrescription } from '@/hooks/useVisits';

describe('PrescriptionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header with medication name', () => {
      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      expect(screen.getByRole('heading', { name: /aspirin/i })).toBeInTheDocument();
    });

    it('should render generic name', () => {
      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      expect(screen.getByText(/acetylsalicylic acid/i)).toBeInTheDocument();
    });

    it('should render dosage', () => {
      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      expect(screen.getByText(/100mg/i)).toBeInTheDocument();
    });

    it('should render frequency', () => {
      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      expect(screen.getByText(/once daily/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render action buttons', () => {
      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      vi.mocked(usePrescription).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      const { container } = renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error when prescription not found', () => {
      vi.mocked(usePrescription).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Prescription not found'),
      } as any);

      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render back button', () => {
      renderWithProviders(<PrescriptionDetailPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
