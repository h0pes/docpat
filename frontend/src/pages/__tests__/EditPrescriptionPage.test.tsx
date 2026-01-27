/**
 * EditPrescriptionPage Component Tests
 *
 * Tests the edit prescription page including:
 * - Page rendering
 * - Loading states
 * - Edit disabled for non-active prescriptions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { EditPrescriptionPage } from '../prescriptions/EditPrescriptionPage';

// Mock navigate and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'rx-123' }),
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
    user: { id: 'user-1' },
  })),
}));

// Mock prescription hooks
vi.mock('@/hooks/useVisits', () => ({
  usePrescription: vi.fn(() => ({
    data: {
      id: 'rx-123',
      patient_id: 'patient-123',
      provider_id: 'provider-1',
      medication_name: 'Aspirin',
      dosage: '100mg',
      frequency: 'Once daily',
      status: 'ACTIVE',
      prescribed_date: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useUpdatePrescription: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
}));

// Mock drug interactions
vi.mock('@/hooks/useDrugInteractions', () => ({
  usePatientDrugInteractions: vi.fn(() => ({
    data: null,
  })),
}));

// Mock prescription form
vi.mock('@/components/visits/PrescriptionForm', () => ({
  PrescriptionForm: ({ initialValues, onCancel }: any) => (
    <div data-testid="prescription-form">
      {initialValues?.medication_name}
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock drug interaction warning
vi.mock('@/components/prescriptions/DrugInteractionWarning', () => ({
  DrugInteractionWarning: () => <div data-testid="interaction-warning">Interactions</div>,
}));

import { usePrescription } from '@/hooks/useVisits';

describe('EditPrescriptionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
    });

    it('should render prescription form with data', () => {
      renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

      expect(screen.getByTestId('prescription-form')).toBeInTheDocument();
      expect(screen.getByText(/aspirin/i)).toBeInTheDocument();
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

      const { container } = renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

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

      renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Edit Disabled States', () => {
    it('should show warning for discontinued prescriptions', () => {
      vi.mocked(usePrescription).mockReturnValue({
        data: {
          id: 'rx-123',
          status: 'DISCONTINUED',
          medication_name: 'Aspirin',
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

      // There may be multiple warning text elements, check at least one exists
      const warnings = screen.queryAllByText(/cannot.*edit/i);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should show warning for cancelled prescriptions', () => {
      vi.mocked(usePrescription).mockReturnValue({
        data: {
          id: 'rx-123',
          status: 'CANCELLED',
          medication_name: 'Aspirin',
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

      // There may be multiple warning text elements, check at least one exists
      const warnings = screen.queryAllByText(/cannot.*edit/i);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate back on cancel', async () => {
      // Ensure prescription is ACTIVE so form is shown
      vi.mocked(usePrescription).mockReturnValue({
        data: {
          id: 'rx-123',
          patient_id: 'patient-123',
          provider_id: 'provider-1',
          medication_name: 'Aspirin',
          dosage: '100mg',
          frequency: 'Once daily',
          status: 'ACTIVE',
          prescribed_date: new Date().toISOString(),
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const { user } = renderWithProviders(<EditPrescriptionPage />, { withRouter: true });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/prescriptions/rx-123');
    });
  });
});
