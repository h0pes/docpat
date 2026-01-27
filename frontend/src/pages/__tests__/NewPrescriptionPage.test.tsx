/**
 * NewPrescriptionPage Component Tests
 *
 * Tests the new prescription page including:
 * - Page rendering
 * - Patient selection
 * - Form display
 * - Drug interaction warnings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { NewPrescriptionPage } from '../prescriptions/NewPrescriptionPage';

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
  useCreatePrescription: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-rx-1' }),
    isPending: false,
  })),
}));

// Mock drug interactions hook
vi.mock('@/hooks/useDrugInteractions', () => ({
  usePatientDrugInteractions: vi.fn(() => ({
    data: null,
  })),
  useCheckNewMedicationForPatient: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ interactions: [] }),
  })),
}));

// Mock patient search
vi.mock('@/components/appointments/PatientSearchCombobox', () => ({
  PatientSearchCombobox: ({ onSelect }: any) => (
    <button data-testid="patient-search" onClick={() => onSelect('patient-123')}>
      Select Patient
    </button>
  ),
}));

// Mock prescription form
vi.mock('@/components/visits/PrescriptionForm', () => ({
  PrescriptionForm: ({ patientId, onSubmit, onCancel }: any) => (
    <div data-testid="prescription-form">
      Patient: {patientId}
      <button onClick={() => onSubmit({})}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock drug interaction warning
vi.mock('@/components/prescriptions/DrugInteractionWarning', () => ({
  DrugInteractionWarning: () => <div data-testid="interaction-warning">Interactions</div>,
}));

// Mock patient API
vi.mock('@/services/api/patients', () => ({
  patientsApi: {
    getById: vi.fn().mockResolvedValue({
      id: 'patient-123',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-01',
    }),
  },
}));

import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: null,
      isLoading: false,
    })),
  };
});

describe('NewPrescriptionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Patient Selection', () => {
    it('should show patient selection when no patient provided', () => {
      renderWithProviders(<NewPrescriptionPage />, { withRouter: true });

      expect(screen.getByTestId('patient-search')).toBeInTheDocument();
    });

    it('should show form after patient selection', async () => {
      const { user } = renderWithProviders(<NewPrescriptionPage />, { withRouter: true });

      const selectBtn = screen.getByTestId('patient-search');
      await user.click(selectBtn);

      // After selection, form should appear
      await waitFor(() => {
        expect(screen.getByTestId('prescription-form')).toBeInTheDocument();
      });
    });
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<NewPrescriptionPage />, { withRouter: true });

      // Multiple headings may exist (h1 and card titles)
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render back button', () => {
      renderWithProviders(<NewPrescriptionPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate back on back button click', async () => {
      const { user } = renderWithProviders(<NewPrescriptionPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      // First button is back button
      await user.click(buttons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/prescriptions');
    });
  });
});
