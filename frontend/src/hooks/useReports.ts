/**
 * Reports Hooks
 *
 * React Query hooks for reporting and analytics.
 * Provides declarative data fetching for all report types with caching.
 */

import { useQuery, useMutation, type UseQueryOptions } from '@tanstack/react-query';
import { reportsApi } from '@/services/api';
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
} from '@/types/report';

/**
 * Query keys for report-related data
 * Following React Query best practices for key structure
 */
export const reportKeys = {
  all: ['reports'] as const,
  appointments: () => [...reportKeys.all, 'appointments'] as const,
  appointmentsWithFilter: (filter?: AppointmentReportFilter) =>
    [...reportKeys.appointments(), filter] as const,
  patients: () => [...reportKeys.all, 'patients'] as const,
  patientsWithFilter: (filter?: PatientReportFilter) =>
    [...reportKeys.patients(), filter] as const,
  diagnoses: () => [...reportKeys.all, 'diagnoses'] as const,
  diagnosesWithFilter: (filter?: DiagnosisReportFilter) =>
    [...reportKeys.diagnoses(), filter] as const,
  productivity: () => [...reportKeys.all, 'productivity'] as const,
  productivityWithFilter: (filter?: ProductivityReportFilter) =>
    [...reportKeys.productivity(), filter] as const,
  revenue: () => [...reportKeys.all, 'revenue'] as const,
  revenueWithFilter: (filter?: RevenueReportFilter) =>
    [...reportKeys.revenue(), filter] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
};

/**
 * Fetch appointment utilization report
 * @param filter - Optional date range and provider filters
 * @param options - React Query options
 */
export function useAppointmentReport(
  filter?: AppointmentReportFilter,
  options?: Omit<UseQueryOptions<AppointmentUtilizationReport>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AppointmentUtilizationReport>({
    queryKey: reportKeys.appointmentsWithFilter(filter),
    queryFn: () => reportsApi.getAppointmentReport(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes - reports don't change frequently
    ...options,
  });
}

/**
 * Fetch patient statistics report
 * @param filter - Optional date range filter
 * @param options - React Query options
 */
export function usePatientReport(
  filter?: PatientReportFilter,
  options?: Omit<UseQueryOptions<PatientStatisticsReport>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PatientStatisticsReport>({
    queryKey: reportKeys.patientsWithFilter(filter),
    queryFn: () => reportsApi.getPatientReport(filter),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch diagnosis trends report
 * @param filter - Optional date range, provider, and limit filters
 * @param options - React Query options
 */
export function useDiagnosisReport(
  filter?: DiagnosisReportFilter,
  options?: Omit<UseQueryOptions<DiagnosisTrendsReport>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DiagnosisTrendsReport>({
    queryKey: reportKeys.diagnosesWithFilter(filter),
    queryFn: () => reportsApi.getDiagnosisReport(filter),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch provider productivity report
 * @param filter - Optional date range and provider filters
 * @param options - React Query options
 */
export function useProductivityReport(
  filter?: ProductivityReportFilter,
  options?: Omit<UseQueryOptions<ProviderProductivityReport>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProviderProductivityReport>({
    queryKey: reportKeys.productivityWithFilter(filter),
    queryFn: () => reportsApi.getProductivityReport(filter),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch revenue report
 * @param filter - Optional date range and provider filters
 * @param options - React Query options
 */
export function useRevenueReport(
  filter?: RevenueReportFilter,
  options?: Omit<UseQueryOptions<RevenueReport>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RevenueReport>({
    queryKey: reportKeys.revenueWithFilter(filter),
    queryFn: () => reportsApi.getRevenueReport(filter),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch dashboard overview report
 * @param options - React Query options
 */
export function useDashboardReport(
  options?: Omit<UseQueryOptions<DashboardReport>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DashboardReport>({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportsApi.getDashboardReport(),
    staleTime: 60 * 1000, // 1 minute - dashboard is more real-time
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    ...options,
  });
}

/**
 * Map export format to file extension
 * Excel format uses .xlsx extension
 */
const formatToExtension: Record<string, string> = {
  json: 'json',
  csv: 'csv',
  pdf: 'pdf',
  excel: 'xlsx',
};

/**
 * Export a report mutation
 * Downloads the report file in the specified format
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async (request: ExportReportRequest) => {
      const blob = await reportsApi.exportReport(request);
      return { blob, request };
    },
    onSuccess: ({ blob, request }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename based on report type and format
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = formatToExtension[request.format] || request.format;
      const filename = `${request.report_type}_${timestamp}.${extension}`;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
