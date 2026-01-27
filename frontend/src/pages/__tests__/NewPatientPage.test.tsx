/**
 * NewPatientPage Component Tests
 *
 * Tests the new patient page including:
 * - Page rendering
 * - Form display
 * - Duplicate detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { NewPatientPage } from '../patients/NewPatientPage';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock patient form
vi.mock('@/components/patients/PatientForm', () => ({
  PatientForm: ({ onSubmit, onCancel, isSubmitting }: any) => (
    <div data-testid="patient-form">
      <button onClick={() => onSubmit({ first_name: 'John', last_name: 'Doe' })}>
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
      {isSubmitting && <span>Submitting...</span>}
    </div>
  ),
}));

// Mock duplicate warning
vi.mock('@/components/patients/DuplicatePatientWarning', () => ({
  DuplicatePatientWarning: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="duplicate-warning">Duplicate Warning</div> : null,
}));

// Mock tanstack query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({ id: 'new-patient-1' }),
      isPending: false,
      isError: false,
      error: null,
    })),
  };
});

describe('NewPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<NewPatientPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
    });

    it('should render patient form', () => {
      renderWithProviders(<NewPatientPage />, { withRouter: true });

      expect(screen.getByTestId('patient-form')).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderWithProviders(<NewPatientPage />, { withRouter: true });

      // Back button is typically a ghost button with icon
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to patients list on cancel', async () => {
      const { user } = renderWithProviders(<NewPatientPage />, { withRouter: true });

      const cancelBtn = screen.getByText('Cancel');
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/patients');
    });
  });
});
