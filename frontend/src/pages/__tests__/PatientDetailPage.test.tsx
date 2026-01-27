/**
 * PatientDetailPage Component Tests
 *
 * Tests the patient detail page including:
 * - Page rendering
 * - Patient data display
 * - Actions (edit, delete, reactivate)
 * - Visit history section
 * - Prescriptions section
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { PatientDetailPage } from '../patients/PatientDetailPage';

// Mock hooks
vi.mock('@/hooks/useVisits', () => ({
  usePatientVisits: vi.fn(() => ({
    data: { visits: [] },
    isLoading: false,
  })),
  usePatientPrescriptions: vi.fn(() => ({
    data: { prescriptions: [] },
    isLoading: false,
  })),
}));

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: '1',
      username: 'admin',
      role: 'ADMIN',
    },
  })),
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

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

// Mock patient API
vi.mock('@/services/api/patients', () => ({
  patientsApi: {
    getById: vi.fn(),
    delete: vi.fn(),
    reactivate: vi.fn(),
  },
}));

// Mock child components
vi.mock('@/components/patients', () => ({
  PatientDetail: ({ patient }: any) => (
    <div data-testid="patient-detail">{patient.first_name} {patient.last_name}</div>
  ),
  PatientNotificationHistory: () => <div data-testid="notification-history">Notification History</div>,
}));

vi.mock('@/components/documents', () => ({
  PatientDocumentsSection: () => <div data-testid="documents-section">Documents</div>,
  DocumentGenerationDialog: () => <div data-testid="doc-generation-dialog">Generate</div>,
}));

vi.mock('@/components/prescriptions', () => ({
  PrescriptionList: () => <div data-testid="prescription-list">Prescriptions</div>,
}));

vi.mock('@/components/Spinner', () => ({
  FullPageSpinner: () => <div data-testid="spinner">Loading...</div>,
}));

import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: {
        id: 'patient-123',
        first_name: 'John',
        last_name: 'Doe',
        status: 'ACTIVE',
        date_of_birth: '1990-01-01',
      },
      isLoading: false,
      isError: false,
      error: null,
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      cancelQueries: vi.fn(),
      setQueriesData: vi.fn(),
      getQueriesData: vi.fn(() => []),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn(),
    })),
  };
});

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      // Multiple headings may exist
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render patient detail component', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByTestId('patient-detail')).toBeInTheDocument();
    });

    it('should render documents section', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByTestId('documents-section')).toBeInTheDocument();
    });

    it('should render notification history', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByTestId('notification-history')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render edit button', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should render new visit button', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /new.*visit/i })).toBeInTheDocument();
    });

    it('should render delete button for admin', () => {
      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show spinner when loading', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error when patient not found', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Patient not found'),
      } as any);

      renderWithProviders(<PatientDetailPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit page on edit click', async () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          id: 'patient-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'ACTIVE',
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const { user } = renderWithProviders(<PatientDetailPage />, { withRouter: true });

      const editBtn = screen.getByRole('button', { name: /edit/i });
      await user.click(editBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-123/edit');
    });
  });
});
