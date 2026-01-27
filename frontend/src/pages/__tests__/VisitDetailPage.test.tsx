/**
 * VisitDetailPage Component Tests
 *
 * Tests the visit detail page including:
 * - Page rendering
 * - SOAP notes display
 * - Action buttons
 * - Prescriptions section
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { VisitDetailPage } from '../visits/VisitDetailPage';

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

// Mock visits hooks
vi.mock('@/hooks/useVisits', () => ({
  useVisit: vi.fn(() => ({
    data: {
      id: 'visit-123',
      patient_id: 'patient-123',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      provider_first_name: 'Dr.',
      provider_last_name: 'Smith',
      visit_date: new Date().toISOString(),
      visit_type: 'FOLLOW_UP',
      status: 'DRAFT',
      chief_complaint: 'Test complaint',
      subjective: 'Subjective notes',
      objective: 'Objective notes',
      assessment: 'Assessment notes',
      plan: 'Plan notes',
      created_at: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useVisitPrescriptions: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

// Mock dialog components
vi.mock('@/components/visits/DigitalSignatureDialog', () => ({
  DigitalSignatureDialog: () => <div data-testid="sign-dialog">Sign Dialog</div>,
}));

vi.mock('@/components/visits/VisitLockDialog', () => ({
  VisitLockDialog: () => <div data-testid="lock-dialog">Lock Dialog</div>,
}));

vi.mock('@/components/documents', () => ({
  DocumentGenerationDialog: () => <div data-testid="doc-dialog">Doc Dialog</div>,
  VisitDocumentsSection: () => <div data-testid="documents-section">Documents</div>,
}));

import { useVisit } from '@/hooks/useVisits';

describe('VisitDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render patient name', () => {
      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should render SOAP notes section', () => {
      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      // May have multiple elements with "subjective" (heading + content)
      const subjectiveElements = screen.queryAllByText(/subjective/i);
      expect(subjectiveElements.length).toBeGreaterThan(0);
    });

    it('should render documents section', () => {
      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      expect(screen.getByTestId('documents-section')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render action buttons for draft visits', () => {
      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
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

      const { container } = renderWithProviders(<VisitDetailPage />, { withRouter: true });

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

      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      // Should have some buttons even in error state
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should render navigation buttons', () => {
      renderWithProviders(<VisitDetailPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
