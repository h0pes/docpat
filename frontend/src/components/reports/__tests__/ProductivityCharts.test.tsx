/**
 * ProductivityCharts Component Tests
 *
 * Tests for the provider productivity charts component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductivityCharts } from '../ProductivityCharts';
import type { ProviderProductivityReport } from '@/types/report';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

// Mock report data
const createMockData = (overrides?: Partial<ProviderProductivityReport>): ProviderProductivityReport => ({
  date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
  summary: {
    total_appointments: 150,
    completed_appointments: 135,
    total_visits: 130,
    total_prescriptions: 85,
    total_documents: 45,
    avg_appointment_duration: 25,
  },
  by_provider: [
    {
      provider_id: 'provider-1',
      provider_name: 'Dr. John Smith',
      provider_role: 'DOCTOR',
      appointments_completed: 80,
      visits_documented: 75,
      prescriptions_written: 50,
      documents_generated: 25,
      unique_patients_seen: 60,
      avg_visits_per_day: 3.5,
      completion_rate: 95,
    },
    {
      provider_id: 'provider-2',
      provider_name: 'Dr. Jane Doe',
      provider_role: 'DOCTOR',
      appointments_completed: 55,
      visits_documented: 55,
      prescriptions_written: 35,
      documents_generated: 20,
      unique_patients_seen: 45,
      avg_visits_per_day: 2.8,
      completion_rate: 88,
    },
  ],
  ...overrides,
});

describe('ProductivityCharts', () => {
  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<ProductivityCharts isLoading />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders 6 summary stat skeletons', () => {
      render(<ProductivityCharts isLoading />);

      // Should have skeleton cards
      const cards = document.querySelectorAll('[class*="rounded"]');
      expect(cards.length).toBeGreaterThan(5);
    });
  });

  describe('No Data State', () => {
    it('shows no data message when data is undefined', () => {
      render(<ProductivityCharts />);

      expect(screen.getByText('reports.noData')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('displays total appointments stat card', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.totalAppointments')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('displays completed appointments stat card', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.completedAppointments')).toBeInTheDocument();
      expect(screen.getByText('135')).toBeInTheDocument();
    });

    it('displays total visits stat card', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.totalVisits')).toBeInTheDocument();
      expect(screen.getByText('130')).toBeInTheDocument();
    });

    it('displays total prescriptions stat card', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.totalPrescriptions')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('displays total documents stat card', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.totalDocuments')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('displays average duration stat card', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.avgDuration')).toBeInTheDocument();
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });
  });

  describe('Provider Comparison Chart', () => {
    it('renders provider comparison section when providers exist', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.providerComparison')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.providerComparisonDesc')).toBeInTheDocument();
    });

    it('renders bar chart for comparison', () => {
      render(<ProductivityCharts data={createMockData()} />);

      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBeGreaterThanOrEqual(1);
    });

    it('hides comparison when no providers', () => {
      render(<ProductivityCharts data={createMockData({ by_provider: [] })} />);

      expect(screen.queryByText('reports.productivity.providerComparison')).not.toBeInTheDocument();
    });
  });

  describe('Patients by Provider Chart', () => {
    it('renders patients by provider section', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.patientsBySProvider')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.patientsByProviderDesc')).toBeInTheDocument();
    });
  });

  describe('Provider Details Table', () => {
    it('renders provider details section', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.providerDetails')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.providerDetailsDesc')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('reports.productivity.provider')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.role')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.appointments')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.visits')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.prescriptions')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.avgVisitsPerDay')).toBeInTheDocument();
      expect(screen.getByText('reports.productivity.completionRate')).toBeInTheDocument();
    });

    it('displays provider names', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
      expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    });

    it('displays provider roles as badges', () => {
      render(<ProductivityCharts data={createMockData()} />);

      const doctorBadges = screen.getAllByText('DOCTOR');
      expect(doctorBadges.length).toBe(2);
    });

    it('displays provider statistics', () => {
      render(<ProductivityCharts data={createMockData()} />);

      // Check for specific values
      expect(screen.getByText('80')).toBeInTheDocument(); // appointments
      expect(screen.getByText('75')).toBeInTheDocument(); // visits
      expect(screen.getByText('50')).toBeInTheDocument(); // prescriptions
    });

    it('displays average visits per day', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('3.5')).toBeInTheDocument();
      expect(screen.getByText('2.8')).toBeInTheDocument();
    });

    it('displays completion rate with progress bar', () => {
      render(<ProductivityCharts data={createMockData()} />);

      // Should show percentage values
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();

      // Should have progress bars
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBe(2);
    });

    it('applies rate colors to completion rates', () => {
      render(<ProductivityCharts data={createMockData()} />);

      // High rate (95%) should have green color
      const greenRates = document.querySelectorAll('[class*="green"]');
      expect(greenRates.length).toBeGreaterThan(0);
    });
  });

  describe('Empty Provider State', () => {
    it('shows no providers message when by_provider is empty', () => {
      render(<ProductivityCharts data={createMockData({ by_provider: [] })} />);

      expect(screen.getByText('reports.productivity.noProviders')).toBeInTheDocument();
    });

    it('hides table when no providers', () => {
      render(<ProductivityCharts data={createMockData({ by_provider: [] })} />);

      expect(screen.queryByText('reports.productivity.providerDetails')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders summary cards with appropriate icons', () => {
      render(<ProductivityCharts data={createMockData()} />);

      // Icons are rendered as SVGs
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('applies different colors to different icons', () => {
      render(<ProductivityCharts data={createMockData()} />);

      // Should have various icon colors
      const blueIcons = document.querySelectorAll('[class*="blue"]');
      const greenIcons = document.querySelectorAll('[class*="green"]');
      const amberIcons = document.querySelectorAll('[class*="amber"]');
      const purpleIcons = document.querySelectorAll('[class*="purple"]');

      expect(blueIcons.length + greenIcons.length + amberIcons.length + purpleIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Formatting', () => {
    it('formats appointment duration with "min" suffix', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('25 min')).toBeInTheDocument();
    });

    it('formats completion rate as percentage', () => {
      render(<ProductivityCharts data={createMockData()} />);

      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });
});
