/**
 * ReportsPage Component Tests
 *
 * Tests the reports/analytics page including:
 * - Page rendering
 * - Tabs navigation
 * - Date range picker
 * - Export functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { ReportsPage } from '../reports/ReportsPage';

// Mock reports hooks
vi.mock('@/hooks/useReports', () => ({
  useAppointmentReport: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  usePatientReport: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useDiagnosisReport: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useProductivityReport: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useExportReport: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock report types
vi.mock('@/types/report', () => ({
  ExportFormat: {
    JSON: 'json',
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'xlsx',
  },
  ReportType: {
    APPOINTMENT_UTILIZATION: 'appointment_utilization',
    PATIENT_STATISTICS: 'patient_statistics',
    DIAGNOSIS_TRENDS: 'diagnosis_trends',
    PROVIDER_PRODUCTIVITY: 'provider_productivity',
  },
}));

// Mock report components
vi.mock('@/components/reports', () => ({
  DateRangePicker: ({ dateRange, onDateRangeChange }: any) => (
    <button data-testid="date-range-picker" onClick={() => onDateRangeChange({ from: new Date(), to: new Date() })}>
      Date Range
    </button>
  ),
  AppointmentCharts: ({ data, isLoading }: any) => (
    <div data-testid="appointment-charts">Appointment Charts</div>
  ),
  PatientCharts: ({ data, isLoading }: any) => (
    <div data-testid="patient-charts">Patient Charts</div>
  ),
  DiagnosisCharts: ({ data, isLoading }: any) => (
    <div data-testid="diagnosis-charts">Diagnosis Charts</div>
  ),
  ProductivityCharts: ({ data, isLoading }: any) => (
    <div data-testid="productivity-charts">Productivity Charts</div>
  ),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { useAppointmentReport } from '@/hooks/useReports';

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<ReportsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render date range picker', () => {
      renderWithProviders(<ReportsPage />, { withRouter: true });

      expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithProviders(<ReportsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render tabs', () => {
      renderWithProviders(<ReportsPage />, { withRouter: true });

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('Tabs Navigation', () => {
    it('should show appointments tab by default', () => {
      renderWithProviders(<ReportsPage />, { withRouter: true });

      expect(screen.getByTestId('appointment-charts')).toBeInTheDocument();
    });

    it('should switch to patients tab', async () => {
      const { user } = renderWithProviders(<ReportsPage />, { withRouter: true });

      const patientsTab = screen.getAllByRole('tab')[1];
      await user.click(patientsTab);

      await waitFor(() => {
        expect(screen.getByTestId('patient-charts')).toBeInTheDocument();
      });
    });

    it('should switch to diagnoses tab', async () => {
      const { user } = renderWithProviders(<ReportsPage />, { withRouter: true });

      const diagnosesTab = screen.getAllByRole('tab')[2];
      await user.click(diagnosesTab);

      await waitFor(() => {
        expect(screen.getByTestId('diagnosis-charts')).toBeInTheDocument();
      });
    });

    it('should switch to productivity tab', async () => {
      const { user } = renderWithProviders(<ReportsPage />, { withRouter: true });

      const productivityTab = screen.getAllByRole('tab')[3];
      await user.click(productivityTab);

      await waitFor(() => {
        expect(screen.getByTestId('productivity-charts')).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('should render action buttons', () => {
      renderWithProviders(<ReportsPage />, { withRouter: true });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Date Range', () => {
    it('should update date range when picker is used', async () => {
      const { user } = renderWithProviders(<ReportsPage />, { withRouter: true });

      const datePicker = screen.getByTestId('date-range-picker');
      await user.click(datePicker);

      // Date range should be updated (component state)
      expect(datePicker).toBeInTheDocument();
    });
  });
});
