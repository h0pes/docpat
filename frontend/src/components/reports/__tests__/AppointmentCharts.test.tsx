/**
 * AppointmentCharts Component Tests
 *
 * Tests for the appointment utilization charts component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentCharts } from '../AppointmentCharts';
import type { AppointmentUtilizationReport } from '@/types/report';

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
const createMockData = (overrides?: Partial<AppointmentUtilizationReport>): AppointmentUtilizationReport => ({
  date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
  total_scheduled: 100,
  completed: 85,
  cancelled: 10,
  no_shows: 5,
  utilization_rate: 85,
  no_show_rate: 5,
  cancellation_rate: 10,
  avg_appointments_per_day: 3.2,
  by_type: { 'REGULAR': 60, 'FOLLOW_UP': 30, 'URGENT': 10 },
  by_day_of_week: [
    { day: 0, day_name: 'Sunday', count: 0 },
    { day: 1, day_name: 'Monday', count: 20 },
    { day: 2, day_name: 'Tuesday', count: 22 },
    { day: 3, day_name: 'Wednesday', count: 18 },
    { day: 4, day_name: 'Thursday', count: 25 },
    { day: 5, day_name: 'Friday', count: 15 },
    { day: 6, day_name: 'Saturday', count: 0 },
  ],
  by_hour: [
    { hour: 8, count: 10 },
    { hour: 9, count: 15 },
    { hour: 10, count: 20 },
    { hour: 11, count: 18 },
    { hour: 14, count: 15 },
    { hour: 15, count: 12 },
    { hour: 16, count: 10 },
  ],
  daily_trend: [
    { date: '2024-01-01', scheduled: 5, completed: 4, cancelled: 1, no_shows: 0 },
    { date: '2024-01-02', scheduled: 6, completed: 5, cancelled: 0, no_shows: 1 },
    { date: '2024-01-03', scheduled: 4, completed: 4, cancelled: 0, no_shows: 0 },
  ],
  ...overrides,
});

describe('AppointmentCharts', () => {
  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<AppointmentCharts isLoading />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders multiple stat card skeletons', () => {
      render(<AppointmentCharts isLoading />);

      // Should have skeleton cards for stats
      const cards = document.querySelectorAll('[class*="rounded"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('No Data State', () => {
    it('shows no data message when data is undefined', () => {
      render(<AppointmentCharts />);

      expect(screen.getByText('reports.noData')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders stat cards with correct titles', () => {
      render(<AppointmentCharts data={createMockData()} />);

      expect(screen.getByText('reports.appointments.totalScheduled')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.utilizationRate')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.noShowRate')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.cancellationRate')).toBeInTheDocument();
    });

    it('displays total scheduled appointments', () => {
      render(<AppointmentCharts data={createMockData({ total_scheduled: 100 })} />);

      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('displays utilization rate as percentage', () => {
      render(<AppointmentCharts data={createMockData({ utilization_rate: 85 })} />);

      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });

    it('displays no-show rate as percentage', () => {
      render(<AppointmentCharts data={createMockData({ no_show_rate: 5 })} />);

      expect(screen.getByText('5.0%')).toBeInTheDocument();
    });

    it('displays cancellation rate as percentage', () => {
      render(<AppointmentCharts data={createMockData({ cancellation_rate: 10 })} />);

      expect(screen.getByText('10.0%')).toBeInTheDocument();
    });

    it('displays average appointments per day', () => {
      render(<AppointmentCharts data={createMockData({ avg_appointments_per_day: 3.2 })} />);

      expect(screen.getByText(/3\.2/)).toBeInTheDocument();
    });
  });

  describe('Chart Sections', () => {
    it('renders status breakdown section', () => {
      render(<AppointmentCharts data={createMockData()} />);

      expect(screen.getByText('reports.appointments.statusBreakdown')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.statusBreakdownDesc')).toBeInTheDocument();
    });

    it('renders daily trend section', () => {
      render(<AppointmentCharts data={createMockData()} />);

      expect(screen.getByText('reports.appointments.dailyTrend')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.dailyTrendDesc')).toBeInTheDocument();
    });

    it('renders day of week section', () => {
      render(<AppointmentCharts data={createMockData()} />);

      expect(screen.getByText('reports.appointments.byDayOfWeek')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.byDayOfWeekDesc')).toBeInTheDocument();
    });

    it('renders hourly distribution section', () => {
      render(<AppointmentCharts data={createMockData()} />);

      expect(screen.getByText('reports.appointments.byHour')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.byHourDesc')).toBeInTheDocument();
    });

    it('renders appointment type section', () => {
      render(<AppointmentCharts data={createMockData()} />);

      expect(screen.getByText('reports.appointments.byType')).toBeInTheDocument();
      expect(screen.getByText('reports.appointments.byTypeDesc')).toBeInTheDocument();
    });
  });

  describe('Charts', () => {
    it('renders doughnut charts', () => {
      render(<AppointmentCharts data={createMockData()} />);

      const doughnutCharts = screen.getAllByTestId('doughnut-chart');
      expect(doughnutCharts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders line chart for daily trend', () => {
      render(<AppointmentCharts data={createMockData()} />);

      const lineCharts = screen.getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders bar charts for distributions', () => {
      render(<AppointmentCharts data={createMockData()} />);

      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Rate Colors', () => {
    it('applies success color for high utilization rate', () => {
      render(<AppointmentCharts data={createMockData({ utilization_rate: 90 })} />);

      // High rate should have green color class
      const rateElement = screen.getByText('90.0%');
      expect(rateElement.className).toMatch(/green/);
    });

    it('applies warning color for medium rate', () => {
      render(<AppointmentCharts data={createMockData({ utilization_rate: 70 })} />);

      // Medium rate should have yellow color class
      const rateElement = screen.getByText('70.0%');
      expect(rateElement.className).toMatch(/yellow/);
    });

    it('applies danger color for low rate', () => {
      render(<AppointmentCharts data={createMockData({ utilization_rate: 50 })} />);

      // Low rate should have red color class
      const rateElement = screen.getByText('50.0%');
      expect(rateElement.className).toMatch(/red/);
    });
  });
});
