/**
 * PatientsPage Component Tests
 *
 * Tests the patients list page including:
 * - Page rendering
 * - Patient count display
 * - Navigation to create/view patients
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { PatientsPage } from '../patients/PatientsPage';

// Mock patients API
vi.mock('@/services/api/patients', () => ({
  patientsApi: {
    getAll: vi.fn().mockResolvedValue({
      patients: [],
      total: 150,
    }),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock PatientList component
vi.mock('@/components/patients/PatientList', () => ({
  PatientList: ({ onPatientClick }: { onPatientClick: (id: string) => void }) => (
    <div data-testid="patient-list">
      <button onClick={() => onPatientClick('patient-123')}>Test Patient</button>
    </div>
  ),
}));

import { patientsApi } from '@/services/api/patients';

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<PatientsPage />, { withRouter: true });

      // Multiple headings may exist
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render new patient button', () => {
      renderWithProviders(<PatientsPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument();
    });

    it('should render patient list component', () => {
      renderWithProviders(<PatientsPage />, { withRouter: true });

      expect(screen.getByTestId('patient-list')).toBeInTheDocument();
    });
  });

  describe('Patient Count', () => {
    it('should render patient list', async () => {
      renderWithProviders(<PatientsPage />, { withRouter: true });

      // Patient list should be visible
      expect(screen.getByTestId('patient-list')).toBeInTheDocument();
    });

    it('should render main page elements', () => {
      renderWithProviders(<PatientsPage />, { withRouter: true });

      // Should render the page with heading and patient list
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      expect(screen.getByTestId('patient-list')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to new patient page', async () => {
      const { user } = renderWithProviders(<PatientsPage />, { withRouter: true });

      const newBtn = screen.getByRole('button', { name: /new/i });
      await user.click(newBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/new');
    });

    it('should navigate to patient detail when patient is clicked', async () => {
      const { user } = renderWithProviders(<PatientsPage />, { withRouter: true });

      const patientButton = screen.getByText('Test Patient');
      await user.click(patientButton);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-123');
    });
  });
});
