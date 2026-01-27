/**
 * useReports Hook Tests
 *
 * Tests for reporting and analytics React Query hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useAppointmentReport,
  usePatientReport,
  useDiagnosisReport,
  useProductivityReport,
  useRevenueReport,
  useDashboardReport,
  useExportReport,
  reportKeys,
} from '../useReports';
import { reportsApi } from '@/services/api';
import type {
  AppointmentUtilizationReport,
  PatientStatisticsReport,
  DiagnosisTrendsReport,
  ProviderProductivityReport,
  RevenueReport,
  DashboardReport,
} from '@/types/report';

// Mock the reports API
vi.mock('@/services/api', () => ({
  reportsApi: {
    getAppointmentReport: vi.fn(),
    getPatientReport: vi.fn(),
    getDiagnosisReport: vi.fn(),
    getProductivityReport: vi.fn(),
    getRevenueReport: vi.fn(),
    getDashboardReport: vi.fn(),
    exportReport: vi.fn(),
  },
}));

// Mock report data
const mockAppointmentReport: AppointmentUtilizationReport = {
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  total_appointments: 100,
  completed: 85,
  cancelled: 10,
  no_shows: 5,
  utilization_rate: 0.85,
  by_provider: [],
  by_day_of_week: [],
};

const mockPatientReport: PatientStatisticsReport = {
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  total_patients: 500,
  new_patients: 50,
  active_patients: 300,
  by_age_group: [],
  by_gender: [],
};

const mockDiagnosisReport: DiagnosisTrendsReport = {
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  total_diagnoses: 200,
  top_diagnoses: [],
  by_category: [],
};

const mockProductivityReport: ProviderProductivityReport = {
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  providers: [],
  summary: {
    total_visits: 150,
    total_hours: 160,
    avg_visits_per_day: 7.5,
  },
};

const mockRevenueReport: RevenueReport = {
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  total_revenue: 50000,
  by_service_type: [],
  by_provider: [],
  trend: [],
};

const mockDashboardReport: DashboardReport = {
  appointments_today: 20,
  patients_total: 500,
  visits_this_month: 100,
  pending_tasks: 5,
  recent_activity: [],
};

/**
 * Create a test query client
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for tests
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('reportKeys', () => {
  it('should generate correct keys', () => {
    expect(reportKeys.all).toEqual(['reports']);
    expect(reportKeys.appointments()).toEqual(['reports', 'appointments']);
    expect(reportKeys.patients()).toEqual(['reports', 'patients']);
    expect(reportKeys.diagnoses()).toEqual(['reports', 'diagnoses']);
    expect(reportKeys.productivity()).toEqual(['reports', 'productivity']);
    expect(reportKeys.revenue()).toEqual(['reports', 'revenue']);
    expect(reportKeys.dashboard()).toEqual(['reports', 'dashboard']);
  });

  it('should generate correct keys with filters', () => {
    const filter = { start_date: '2024-01-01', end_date: '2024-01-31' };
    expect(reportKeys.appointmentsWithFilter(filter)).toEqual([
      'reports',
      'appointments',
      filter,
    ]);
  });
});

describe('useAppointmentReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getAppointmentReport).mockResolvedValue(mockAppointmentReport);
  });

  it('should fetch appointment report successfully', async () => {
    const { result } = renderHook(() => useAppointmentReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAppointmentReport);
    expect(reportsApi.getAppointmentReport).toHaveBeenCalled();
  });

  it('should fetch with filter parameters', async () => {
    const filter = { start_date: '2024-01-01', end_date: '2024-01-31' };

    const { result } = renderHook(() => useAppointmentReport(filter), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(reportsApi.getAppointmentReport).toHaveBeenCalledWith(filter);
  });

  it('should handle fetch error', async () => {
    vi.mocked(reportsApi.getAppointmentReport).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAppointmentReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('usePatientReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getPatientReport).mockResolvedValue(mockPatientReport);
  });

  it('should fetch patient report successfully', async () => {
    const { result } = renderHook(() => usePatientReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPatientReport);
    expect(reportsApi.getPatientReport).toHaveBeenCalled();
  });
});

describe('useDiagnosisReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getDiagnosisReport).mockResolvedValue(mockDiagnosisReport);
  });

  it('should fetch diagnosis report successfully', async () => {
    const { result } = renderHook(() => useDiagnosisReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDiagnosisReport);
    expect(reportsApi.getDiagnosisReport).toHaveBeenCalled();
  });
});

describe('useProductivityReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getProductivityReport).mockResolvedValue(mockProductivityReport);
  });

  it('should fetch productivity report successfully', async () => {
    const { result } = renderHook(() => useProductivityReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProductivityReport);
    expect(reportsApi.getProductivityReport).toHaveBeenCalled();
  });
});

describe('useRevenueReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getRevenueReport).mockResolvedValue(mockRevenueReport);
  });

  it('should fetch revenue report successfully', async () => {
    const { result } = renderHook(() => useRevenueReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRevenueReport);
    expect(reportsApi.getRevenueReport).toHaveBeenCalled();
  });
});

describe('useDashboardReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getDashboardReport).mockResolvedValue(mockDashboardReport);
  });

  it('should fetch dashboard report successfully', async () => {
    const { result } = renderHook(() => useDashboardReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDashboardReport);
    expect(reportsApi.getDashboardReport).toHaveBeenCalled();
  });
});

describe('useExportReport', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.exportReport).mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));

    // Mock URL methods
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should export report successfully', async () => {
    const { result } = renderHook(() => useExportReport(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      report_type: 'appointments',
      format: 'csv',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(reportsApi.exportReport).toHaveBeenCalledWith({
      report_type: 'appointments',
      format: 'csv',
    });
  });
});
