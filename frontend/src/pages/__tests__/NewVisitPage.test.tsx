/**
 * NewVisitPage Component Tests
 *
 * Tests the new visit page including:
 * - Page rendering
 * - Patient requirement validation
 * - Form display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { NewVisitPage } from '../visits/NewVisitPage';

// Mock navigate and search params
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams('patientId=patient-123');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
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
  VisitForm: ({ patientId, onSubmit, onCancel }: any) => (
    <div data-testid="visit-form">
      Patient: {patientId}
      <button onClick={() => onSubmit({})}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock visits hooks
vi.mock('@/hooks/useVisits', () => ({
  useCreateVisit: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-visit-1' }),
    isPending: false,
  })),
}));

describe('NewVisitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render back button', () => {
      renderWithProviders(<NewVisitPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render visit form when patient is provided', () => {
      renderWithProviders(<NewVisitPage />, { withRouter: true });

      expect(screen.getByTestId('visit-form')).toBeInTheDocument();
    });

    it('should pass patient ID to form', () => {
      renderWithProviders(<NewVisitPage />, { withRouter: true });

      expect(screen.getByText(/patient-123/i)).toBeInTheDocument();
    });
  });

  describe('Patient Requirement', () => {
    it('should show visit form when patient is provided', () => {
      // The default mock has patientId, so form should show
      renderWithProviders(<NewVisitPage />, { withRouter: true });

      expect(screen.getByTestId('visit-form')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back on cancel', async () => {
      const { user } = renderWithProviders(<NewVisitPage />, { withRouter: true });

      const cancelBtn = screen.getByText('Cancel');
      await user.click(cancelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-123');
    });
  });
});
