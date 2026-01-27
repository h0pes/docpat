/**
 * DiagnosisCharts Component Tests
 *
 * Tests for the diagnosis trends charts component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagnosisCharts } from '../DiagnosisCharts';
import type { DiagnosisTrendsReport } from '@/types/report';

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

// Mock report data - use unique values to avoid test collisions
const createMockData = (overrides?: Partial<DiagnosisTrendsReport>): DiagnosisTrendsReport => ({
  date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
  total_diagnoses: 350,
  unique_codes: 47,
  top_diagnoses: [
    { icd10_code: 'J06.9', description: 'Acute upper respiratory infection', count: 45, percentage: 12.9 },
    { icd10_code: 'I10', description: 'Essential hypertension', count: 38, percentage: 10.9 },
    { icd10_code: 'E11.9', description: 'Type 2 diabetes mellitus', count: 32, percentage: 9.1 },
    { icd10_code: 'M54.5', description: 'Low back pain', count: 28, percentage: 8.0 },
    { icd10_code: 'K21.0', description: 'GERD with esophagitis', count: 25, percentage: 7.1 },
  ],
  monthly_trend: [
    { year: 2024, month: 1, month_name: 'January', count: 120 },
    { year: 2024, month: 2, month_name: 'February', count: 115 },
    { year: 2024, month: 3, month_name: 'March', count: 115 },
  ],
  by_category: [
    { category: 'J00-J99', category_name: 'Respiratory', count: 85 },
    { category: 'I00-I99', category_name: 'Circulatory', count: 70 },
    { category: 'E00-E90', category_name: 'Endocrine', count: 55 },
    { category: 'M00-M99', category_name: 'Musculoskeletal', count: 50 },
    { category: 'K00-K93', category_name: 'Digestive', count: 42 },
  ],
  ...overrides,
});

describe('DiagnosisCharts', () => {
  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<DiagnosisCharts isLoading />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('No Data State', () => {
    it('shows no data message when data is undefined', () => {
      render(<DiagnosisCharts />);

      expect(screen.getByText('reports.noData')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('displays total diagnoses stat card', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.totalDiagnoses')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
    });

    it('displays unique codes stat card', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.uniqueCodes')).toBeInTheDocument();
      expect(screen.getByText('47')).toBeInTheDocument();
    });

    it('displays average per month stat card', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.avgPerMonth')).toBeInTheDocument();
    });

    it('calculates average per month correctly', () => {
      const data = createMockData({
        monthly_trend: [
          { year: 2024, month: 1, month_name: 'January', count: 100 },
          { year: 2024, month: 2, month_name: 'February', count: 100 },
        ],
      });
      render(<DiagnosisCharts data={data} />);

      // Average should be (100 + 100) / 2 = 100
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Chart Sections', () => {
    it('renders top diagnoses section', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.topDiagnoses')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.topDiagnosesDesc')).toBeInTheDocument();
    });

    it('renders monthly trend section', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.monthlyTrend')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.monthlyTrendDesc')).toBeInTheDocument();
    });

    it('renders category section', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.byCategory')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.byCategoryDesc')).toBeInTheDocument();
    });

    it('renders detailed list section', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.detailedList')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.detailedListDesc')).toBeInTheDocument();
    });
  });

  describe('Charts', () => {
    it('renders bar chart for top diagnoses', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders line chart for monthly trend', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      const lineCharts = screen.getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders doughnut chart for categories', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      const doughnutCharts = screen.getAllByTestId('doughnut-chart');
      expect(doughnutCharts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Detailed Table', () => {
    it('renders table headers', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('reports.diagnoses.code')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.description')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.count')).toBeInTheDocument();
      expect(screen.getByText('reports.diagnoses.percentage')).toBeInTheDocument();
    });

    it('displays diagnosis ICD-10 codes', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('J06.9')).toBeInTheDocument();
      expect(screen.getByText('I10')).toBeInTheDocument();
      expect(screen.getByText('E11.9')).toBeInTheDocument();
    });

    it('displays diagnosis descriptions', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('Acute upper respiratory infection')).toBeInTheDocument();
      expect(screen.getByText('Essential hypertension')).toBeInTheDocument();
    });

    it('displays diagnosis counts', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      // Table should show counts
      const tableRows = document.querySelectorAll('tbody tr');
      expect(tableRows.length).toBeGreaterThan(0);
    });

    it('displays percentages', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      expect(screen.getByText('12.9%')).toBeInTheDocument();
      expect(screen.getByText('10.9%')).toBeInTheDocument();
    });

    it('applies badge styling to top 3 codes', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      // First 3 should have default badge variant
      const badges = document.querySelectorAll('[class*="bg-primary"]');
      expect(badges.length).toBeGreaterThanOrEqual(3);
    });

    it('limits table to 15 rows', () => {
      const manyDiagnoses = Array.from({ length: 20 }, (_, i) => ({
        icd10_code: `A0${i}`,
        description: `Diagnosis ${i}`,
        count: 10,
        percentage: 5,
      }));
      render(<DiagnosisCharts data={createMockData({ top_diagnoses: manyDiagnoses })} />);

      const tableRows = document.querySelectorAll('tbody tr');
      expect(tableRows.length).toBe(15);
    });
  });

  describe('Icons', () => {
    it('renders stat cards with icons', () => {
      render(<DiagnosisCharts data={createMockData()} />);

      // Icons are rendered as SVGs
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});
