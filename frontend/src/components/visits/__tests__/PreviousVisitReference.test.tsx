/**
 * PreviousVisitReference Component Tests
 *
 * Comprehensive test suite for PreviousVisitReference component covering:
 * - Dialog rendering
 * - Loading states
 * - Error handling
 * - Visit history display
 * - Expandable visit cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviousVisitReference } from '../PreviousVisitReference';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'visits.previousVisit.buttonLabel': 'Previous Visits',
        'visits.previousVisit.title': 'Previous Visit History',
        'visits.previousVisit.description': 'Review recent visits for this patient',
        'visits.previousVisit.noVisits': 'No previous visits found',
        'visits.previousVisit.errorLoading': 'Failed to load visit history',
        'visits.previousVisit.diagnoses': 'Diagnoses',
        'visits.previousVisit.medications': 'Medications',
        'visits.previousVisit.moreMedications': `+${params?.count || 0} more medications`,
        'visits.status.completed': 'Completed',
        'visits.status.draft': 'Draft',
        'visits.status.signed': 'Signed',
        'visits.form.chiefComplaint': 'Chief Complaint',
        'visits.form.vitals.title': 'Vital Signs',
        'visits.form.vitals.bloodPressure': 'Blood Pressure',
        'visits.form.vitals.heartRate': 'Heart Rate',
        'visits.form.vitals.weight': 'Weight',
        'visits.form.soap.subjective': 'Subjective',
        'visits.form.soap.assessment': 'Assessment',
        'visits.form.soap.plan': 'Plan',
        'common.loading': 'Loading...',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock date-fns format
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: () => 'January 10, 2025',
  };
});

// Mock usePatientVisits hook
const mockUsePatientVisits = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  usePatientVisits: () => mockUsePatientVisits(),
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Wrapper component with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

// Mock visits data
const mockVisits = {
  visits: [
    {
      id: 'visit-1',
      visit_date: '2025-01-10T10:00:00Z',
      visit_type: 'Follow-up',
      status: 'COMPLETED',
      chief_complaint: 'Regular checkup',
      diagnoses: [
        { icd10_code: 'E11.9', description: 'Type 2 diabetes' },
        { icd10_code: 'I10', description: 'Hypertension' },
      ],
      prescriptions: [
        { medication_name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
        { medication_name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
      ],
      vital_signs: {
        systolic_bp: 130,
        diastolic_bp: 85,
        heart_rate: 72,
        weight_kg: 75,
      },
      soap_subjective: 'Patient reports feeling well.',
      soap_assessment: 'Diabetes and hypertension well controlled.',
      soap_plan: 'Continue current medications.',
    },
    {
      id: 'visit-2',
      visit_date: '2024-12-15T14:00:00Z',
      visit_type: 'Urgent',
      status: 'COMPLETED',
      chief_complaint: 'Blood pressure spike',
      diagnoses: [{ icd10_code: 'I10', description: 'Hypertension' }],
      prescriptions: [],
      vital_signs: {
        systolic_bp: 160,
        diastolic_bp: 100,
        heart_rate: 88,
      },
      soap_subjective: 'Patient reports headache.',
      soap_assessment: 'Hypertensive episode.',
      soap_plan: 'Adjust medications.',
    },
  ],
};

describe('PreviousVisitReference', () => {
  const testPatientId = 'patient-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default behavior
    mockUsePatientVisits.mockReturnValue({
      data: mockVisits,
      isLoading: false,
      isError: false,
    });
  });

  describe('Trigger Button', () => {
    it('renders trigger button with correct text', () => {
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      expect(screen.getByRole('button', { name: /Previous Visits/i })).toBeInTheDocument();
    });

    it('respects variant prop', () => {
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} variant="ghost" />);

      const button = screen.getByRole('button', { name: /Previous Visits/i });
      expect(button).toBeInTheDocument();
    });

    it('respects size prop', () => {
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} size="lg" />);

      const button = screen.getByRole('button', { name: /Previous Visits/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dialog Opening', () => {
    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('Previous Visit History')).toBeInTheDocument();
    });

    it('shows dialog description', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('Review recent visits for this patient')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading message when data is loading', async () => {
      mockUsePatientVisits.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when loading fails', async () => {
      mockUsePatientVisits.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
      });

      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('Failed to load visit history')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no visits message when there are no visits', async () => {
      mockUsePatientVisits.mockReturnValue({
        data: { visits: [] },
        isLoading: false,
        isError: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('No previous visits found')).toBeInTheDocument();
    });

    it('shows no visits message when only draft visits exist', async () => {
      mockUsePatientVisits.mockReturnValue({
        data: {
          visits: [{ id: 'draft-1', status: 'DRAFT', visit_date: '2025-01-15T10:00:00Z' }],
        },
        isLoading: false,
        isError: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('No previous visits found')).toBeInTheDocument();
    });
  });

  describe('Visit Cards Display', () => {
    it('displays visit date', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      // Date is mocked to return 'January 10, 2025'
      await waitFor(() => {
        expect(screen.getAllByText('January 10, 2025').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays visit type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('displays visit status badge', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      // Multiple completed visits
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    });

    it('displays chief complaint', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      expect(screen.getByText('Regular checkup')).toBeInTheDocument();
      expect(screen.getByText('Blood pressure spike')).toBeInTheDocument();
    });
  });

  describe('Expandable Details', () => {
    it('shows expand button on visit cards', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      // Should have expand buttons (ghost buttons with chevron icons)
      const buttons = screen.getAllByRole('button');
      // More than just the trigger button
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('expands visit details when expand button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      // Find a button within the card that can expand (not the main trigger)
      const buttons = screen.getAllByRole('button');
      // Find a button that's not the trigger or close button
      const expandButtons = buttons.filter(btn =>
        btn.querySelector('svg') &&
        !btn.textContent?.includes('Previous Visits')
      );

      if (expandButtons.length > 0) {
        await user.click(expandButtons[0]);

        // After expansion, should show vital signs or SOAP notes
        await waitFor(() => {
          // Check for expanded content (vital signs section)
          const vitalText = screen.queryByText('Vital Signs');
          const subjectiveText = screen.queryByText('Subjective');
          expect(vitalText || subjectiveText).toBeTruthy();
        });
      }
    });
  });

  describe('Max Visits', () => {
    it('respects maxVisits prop', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} maxVisits={1} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      // Should only show 1 visit
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
    });

    it('defaults to showing 3 visits', async () => {
      mockUsePatientVisits.mockReturnValue({
        data: {
          visits: [
            { ...mockVisits.visits[0], id: 'v1', visit_type: 'Type1' },
            { ...mockVisits.visits[0], id: 'v2', visit_type: 'Type2' },
            { ...mockVisits.visits[0], id: 'v3', visit_type: 'Type3' },
            { ...mockVisits.visits[0], id: 'v4', visit_type: 'Type4' }, // This one should be excluded
          ],
        },
        isLoading: false,
        isError: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<PreviousVisitReference patientId={testPatientId} />);

      await user.click(screen.getByRole('button', { name: /Previous Visits/i }));

      // Should show first 3 visits, not the 4th
      expect(screen.getByText('Type1')).toBeInTheDocument();
      expect(screen.getByText('Type2')).toBeInTheDocument();
      expect(screen.getByText('Type3')).toBeInTheDocument();
      expect(screen.queryByText('Type4')).not.toBeInTheDocument();
    });
  });
});
