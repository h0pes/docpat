/**
 * Reports API Service
 *
 * Provides methods for interacting with the reporting and analytics API endpoints.
 * Handles all report types: appointments, patients, diagnoses, productivity, revenue, and dashboard.
 */

import { apiClient } from './axios-instance';
import type {
  AppointmentReportFilter,
  AppointmentUtilizationReport,
  PatientReportFilter,
  PatientStatisticsReport,
  DiagnosisReportFilter,
  DiagnosisTrendsReport,
  ProductivityReportFilter,
  ProviderProductivityReport,
  RevenueReportFilter,
  RevenueReport,
  DashboardReport,
  ExportReportRequest,
} from '../../types/report';

/**
 * Reports API methods for analytics and reporting
 */
export const reportsApi = {
  /**
   * Get appointment utilization report
   * @param filter - Optional date range and provider filters
   * @returns Appointment utilization statistics and trends
   */
  getAppointmentReport: async (
    filter?: AppointmentReportFilter
  ): Promise<AppointmentUtilizationReport> => {
    const response = await apiClient.get<AppointmentUtilizationReport>(
      '/api/v1/reports/appointments',
      { params: filter }
    );
    return response.data;
  },

  /**
   * Get patient statistics report
   * @param filter - Optional date range filter for new patient registrations
   * @returns Patient demographics and registration statistics
   */
  getPatientReport: async (
    filter?: PatientReportFilter
  ): Promise<PatientStatisticsReport> => {
    const response = await apiClient.get<PatientStatisticsReport>(
      '/api/v1/reports/patients',
      { params: filter }
    );
    return response.data;
  },

  /**
   * Get diagnosis trends report
   * @param filter - Optional date range, provider, and limit filters
   * @returns Diagnosis distribution and trend statistics
   */
  getDiagnosisReport: async (
    filter?: DiagnosisReportFilter
  ): Promise<DiagnosisTrendsReport> => {
    const response = await apiClient.get<DiagnosisTrendsReport>(
      '/api/v1/reports/diagnoses',
      { params: filter }
    );
    return response.data;
  },

  /**
   * Get provider productivity report
   * @param filter - Optional date range and provider filters
   * @returns Productivity metrics per provider
   */
  getProductivityReport: async (
    filter?: ProductivityReportFilter
  ): Promise<ProviderProductivityReport> => {
    const response = await apiClient.get<ProviderProductivityReport>(
      '/api/v1/reports/productivity',
      { params: filter }
    );
    return response.data;
  },

  /**
   * Get revenue report
   * @param filter - Optional date range and provider filters
   * @returns Revenue/visit-based statistics
   */
  getRevenueReport: async (
    filter?: RevenueReportFilter
  ): Promise<RevenueReport> => {
    const response = await apiClient.get<RevenueReport>(
      '/api/v1/reports/revenue',
      { params: filter }
    );
    return response.data;
  },

  /**
   * Get dashboard overview report
   * @returns Quick stats and recent activity for the dashboard
   */
  getDashboardReport: async (): Promise<DashboardReport> => {
    const response = await apiClient.get<DashboardReport>(
      '/api/v1/reports/dashboard'
    );
    return response.data;
  },

  /**
   * Export a report in the specified format
   * @param request - Export request with report type, format, and filters
   * @returns Blob data for download
   */
  exportReport: async (request: ExportReportRequest): Promise<Blob> => {
    const response = await apiClient.post<Blob>(
      '/api/v1/reports/export',
      request,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
