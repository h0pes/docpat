/**
 * PatientCharts Component Tests
 *
 * Tests for the patient statistics charts component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientCharts } from '../PatientCharts';
import type { PatientStatisticsReport } from '@/types/report';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
}));

// Mock report data
const createMockData = (overrides?: Partial<PatientStatisticsReport>): PatientStatisticsReport => ({
  date_range: null,
  total_patients: 500,
  active_patients: 450,
  inactive_patients: 40,
  deceased_patients: 10,
  patients_with_insurance: 300,
  new_patients_in_period: 25,
  by_gender: {
    male: 200,
    female: 280,
    other: 10,
    unspecified: 10,
  },
  age_distribution: [
    { age_group: '0-18', count: 50 },
    { age_group: '19-30', count: 80 },
    { age_group: '31-45', count: 120 },
    { age_group: '46-60', count: 130 },
    { age_group: '61-75', count: 80 },
    { age_group: '76+', count: 40 },
  ],
  monthly_registrations: [
    { year: 2024, month: 1, month_name: 'January', count: 10 },
    { year: 2024, month: 2, month_name: 'February', count: 8 },
    { year: 2024, month: 3, month_name: 'March', count: 12 },
  ],
  ...overrides,
});

describe('PatientCharts', () => {
  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<PatientCharts isLoading />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders multiple stat card skeletons', () => {
      render(<PatientCharts isLoading />);

      // Should have skeleton cards for stats
      const cards = document.querySelectorAll('[class*="rounded"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('No Data State', () => {
    it('shows no data message when data is undefined', () => {
      render(<PatientCharts />);

      expect(screen.getByText('reports.noData')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('displays total patients stat card', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.totalPatients')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('displays active patients stat card', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.activePatients')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
    });

    it('displays inactive patients stat card', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.inactivePatients')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });

    it('displays patients with insurance stat card', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.withInsurance')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    it('displays insurance percentage in subtext', () => {
      render(<PatientCharts data={createMockData({ total_patients: 500, patients_with_insurance: 300 })} />);

      // 300/500 = 60%
      expect(screen.getByText(/60\.0%/)).toBeInTheDocument();
    });
  });

  describe('Chart Sections', () => {
    it('renders status breakdown section', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.statusBreakdown')).toBeInTheDocument();
      expect(screen.getByText('reports.patients.statusBreakdownDesc')).toBeInTheDocument();
    });

    it('renders gender distribution section', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.genderDistribution')).toBeInTheDocument();
      expect(screen.getByText('reports.patients.genderDistributionDesc')).toBeInTheDocument();
    });

    it('renders age distribution section', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.ageDistribution')).toBeInTheDocument();
      expect(screen.getByText('reports.patients.ageDistributionDesc')).toBeInTheDocument();
    });

    it('renders registration trend section', () => {
      render(<PatientCharts data={createMockData()} />);

      expect(screen.getByText('reports.patients.registrationTrend')).toBeInTheDocument();
      expect(screen.getByText('reports.patients.registrationTrendDesc')).toBeInTheDocument();
    });
  });

  describe('Charts', () => {
    it('renders doughnut charts for status and gender', () => {
      render(<PatientCharts data={createMockData()} />);

      const doughnutCharts = screen.getAllByTestId('doughnut-chart');
      expect(doughnutCharts.length).toBe(2);
    });

    it('renders bar chart for age distribution', () => {
      render(<PatientCharts data={createMockData()} />);

      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders line chart for registration trend', () => {
      render(<PatientCharts data={createMockData()} />);

      const lineCharts = screen.getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('New Patients in Period', () => {
    it('displays new patients section when data available', () => {
      render(<PatientCharts data={createMockData({ new_patients_in_period: 25 })} />);

      expect(screen.getByText('reports.patients.newPatientsInPeriod')).toBeInTheDocument();
      expect(screen.getByText('reports.patients.newPatientsInPeriodDesc')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('hides new patients section when null', () => {
      render(<PatientCharts data={createMockData({ new_patients_in_period: null })} />);

      expect(screen.queryByText('reports.patients.newPatientsInPeriod')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders stat cards with icons', () => {
      render(<PatientCharts data={createMockData()} />);

      // Icons are rendered as SVGs
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('applies correct icon colors', () => {
      render(<PatientCharts data={createMockData()} />);

      // Should have green color for active patients icon
      const greenIcons = document.querySelectorAll('[class*="green"]');
      expect(greenIcons.length).toBeGreaterThan(0);

      // Should have red color for insurance icon
      const redIcons = document.querySelectorAll('[class*="red"]');
      expect(redIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Formatting', () => {
    it('formats large numbers with locale string', () => {
      render(<PatientCharts data={createMockData({ total_patients: 1500 })} />);

      // Should show formatted number (locale-dependent, but > 999)
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });
  });
});
