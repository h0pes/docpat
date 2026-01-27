/**
 * Reports API Service Tests
 *
 * Tests for reporting and analytics API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsApi } from '../reports';
import { apiClient } from '../axios-instance';
import type {
  AppointmentUtilizationReport,
  PatientStatisticsReport,
  DiagnosisTrendsReport,
  ProviderProductivityReport,
  RevenueReport,
  DashboardReport,
} from '@/types/report';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock report data
const mockAppointmentReport: AppointmentUtilizationReport = {
  total_appointments: 500,
  completed: 400,
  cancelled: 50,
  no_show: 30,
  rescheduled: 20,
  utilization_rate: 80,
  average_duration: 25,
  by_type: {
    consultation: 200,
    followup: 150,
    procedure: 100,
    checkup: 50,
  },
  by_provider: [
    { provider_id: 'p1', provider_name: 'Dr. Smith', appointments: 200 },
    { provider_id: 'p2', provider_name: 'Dr. Jones', appointments: 150 },
  ],
  trends: [
    { date: '2024-01-01', count: 20 },
    { date: '2024-01-02', count: 25 },
  ],
};

const mockPatientReport: PatientStatisticsReport = {
  total_patients: 1000,
  active_patients: 850,
  new_this_month: 50,
  new_this_week: 12,
  by_gender: { male: 450, female: 500, other: 50 },
  by_age_group: {
    '0-17': 100,
    '18-35': 300,
    '36-55': 350,
    '56+': 250,
  },
  registration_trends: [
    { date: '2024-01-01', count: 5 },
    { date: '2024-01-02', count: 3 },
  ],
};

const mockDiagnosisReport: DiagnosisTrendsReport = {
  total_diagnoses: 800,
  unique_codes: 150,
  top_diagnoses: [
    { code: 'J06.9', description: 'Acute upper respiratory infection', count: 100 },
    { code: 'I10', description: 'Essential hypertension', count: 80 },
  ],
  by_category: {
    respiratory: 200,
    cardiovascular: 150,
    musculoskeletal: 100,
  },
  trends: [
    { date: '2024-01-01', count: 30 },
    { date: '2024-01-02', count: 35 },
  ],
};

const mockProductivityReport: ProviderProductivityReport = {
  providers: [
    {
      provider_id: 'p1',
      provider_name: 'Dr. Smith',
      appointments_scheduled: 100,
      appointments_completed: 90,
      patients_seen: 85,
      average_visit_duration: 22,
      utilization_rate: 90,
    },
  ],
  average_productivity: 85,
  total_patients_seen: 500,
};

const mockRevenueReport: RevenueReport = {
  total_visits: 400,
  billable_visits: 380,
  by_visit_type: {
    consultation: 150,
    followup: 120,
    procedure: 80,
    checkup: 50,
  },
  by_provider: [
    { provider_id: 'p1', provider_name: 'Dr. Smith', visits: 150 },
  ],
  trends: [
    { date: '2024-01-01', visits: 15 },
    { date: '2024-01-02', visits: 18 },
  ],
};

const mockDashboardReport: DashboardReport = {
  today_appointments: 15,
  pending_appointments: 8,
  patients_seen_today: 10,
  new_patients_this_week: 5,
  recent_activity: [
    {
      type: 'appointment',
      description: 'New appointment scheduled',
      timestamp: '2024-01-15T10:00:00Z',
    },
  ],
  quick_stats: {
    total_patients: 1000,
    total_appointments_this_month: 300,
    completion_rate: 85,
  },
};

describe('reportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAppointmentReport', () => {
    it('should fetch appointment report without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentReport });

      const result = await reportsApi.getAppointmentReport();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/appointments', {
        params: undefined,
      });
      expect(result).toEqual(mockAppointmentReport);
    });

    it('should fetch appointment report with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentReport });

      await reportsApi.getAppointmentReport({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        provider_id: 'p1',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/appointments', {
        params: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          provider_id: 'p1',
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(reportsApi.getAppointmentReport()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getPatientReport', () => {
    it('should fetch patient report without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPatientReport });

      const result = await reportsApi.getPatientReport();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/patients', {
        params: undefined,
      });
      expect(result).toEqual(mockPatientReport);
    });

    it('should fetch patient report with date range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPatientReport });

      await reportsApi.getPatientReport({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/patients', {
        params: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      });
    });
  });

  describe('getDiagnosisReport', () => {
    it('should fetch diagnosis report', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDiagnosisReport });

      const result = await reportsApi.getDiagnosisReport();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/diagnoses', {
        params: undefined,
      });
      expect(result).toEqual(mockDiagnosisReport);
    });

    it('should fetch diagnosis report with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDiagnosisReport });

      await reportsApi.getDiagnosisReport({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        provider_id: 'p1',
        limit: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/diagnoses', {
        params: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          provider_id: 'p1',
          limit: 20,
        },
      });
    });

    it('should include top diagnoses', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDiagnosisReport });

      const result = await reportsApi.getDiagnosisReport();

      expect(result.top_diagnoses).toBeInstanceOf(Array);
      expect(result.top_diagnoses.length).toBeGreaterThan(0);
    });
  });

  describe('getProductivityReport', () => {
    it('should fetch productivity report', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockProductivityReport });

      const result = await reportsApi.getProductivityReport();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/productivity', {
        params: undefined,
      });
      expect(result).toEqual(mockProductivityReport);
    });

    it('should fetch productivity for specific provider', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockProductivityReport });

      await reportsApi.getProductivityReport({ provider_id: 'p1' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/productivity', {
        params: { provider_id: 'p1' },
      });
    });
  });

  describe('getRevenueReport', () => {
    it('should fetch revenue report', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockRevenueReport });

      const result = await reportsApi.getRevenueReport();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/revenue', {
        params: undefined,
      });
      expect(result).toEqual(mockRevenueReport);
    });

    it('should fetch revenue report with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockRevenueReport });

      await reportsApi.getRevenueReport({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        provider_id: 'p1',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/revenue', {
        params: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          provider_id: 'p1',
        },
      });
    });
  });

  describe('getDashboardReport', () => {
    it('should fetch dashboard report', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDashboardReport });

      const result = await reportsApi.getDashboardReport();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reports/dashboard');
      expect(result).toEqual(mockDashboardReport);
    });

    it('should include quick stats', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDashboardReport });

      const result = await reportsApi.getDashboardReport();

      expect(result.quick_stats).toBeDefined();
      expect(result.quick_stats.total_patients).toBe(1000);
    });

    it('should include recent activity', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDashboardReport });

      const result = await reportsApi.getDashboardReport();

      expect(result.recent_activity).toBeInstanceOf(Array);
    });
  });

  describe('exportReport', () => {
    it('should export report as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockBlob });

      const result = await reportsApi.exportReport({
        report_type: 'appointments',
        format: 'csv',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/reports/export',
        {
          report_type: 'appointments',
          format: 'csv',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });

    it('should export report as PDF', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockBlob });

      const result = await reportsApi.exportReport({
        report_type: 'patients',
        format: 'pdf',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/reports/export',
        { report_type: 'patients', format: 'pdf' },
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });

    it('should export report as Excel', async () => {
      const mockBlob = new Blob(['Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockBlob });

      await reportsApi.exportReport({
        report_type: 'productivity',
        format: 'excel',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/reports/export',
        { report_type: 'productivity', format: 'excel' },
        { responseType: 'blob' }
      );
    });

    it('should handle export error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Export failed'));

      await expect(
        reportsApi.exportReport({ report_type: 'appointments', format: 'csv' })
      ).rejects.toThrow('Export failed');
    });
  });
});
