/**
 * useAuditLogs Hook Tests
 *
 * Tests for audit log management React Query hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useAuditLogs,
  useAuditLog,
  useAuditLogStatistics,
  useUserActivity,
  useAuditFilterOptions,
  useExportAuditLogs,
  auditLogKeys,
} from '../useAuditLogs';
import { auditApi } from '@/services/api';
import type {
  AuditLog,
  ListAuditLogsResponse,
  AuditLogStatistics,
  UserActivitySummary,
  AuditFilterOptions,
} from '@/types/audit';

// Mock the audit API
vi.mock('@/services/api', () => ({
  auditApi: {
    listLogs: vi.fn(),
    getLog: vi.fn(),
    getStatistics: vi.fn(),
    getUserActivity: vi.fn(),
    getFilterOptions: vi.fn(),
    exportLogs: vi.fn(),
    downloadExport: vi.fn(),
  },
}));

// Mock data
const mockAuditLog: AuditLog = {
  id: 1,
  user_id: 'user-1',
  username: 'testuser',
  action: 'CREATE',
  resource_type: 'patient',
  resource_id: 'patient-1',
  details: { name: 'John Doe' },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  timestamp: '2024-01-01T10:00:00Z',
};

const mockAuditLogsList: ListAuditLogsResponse = {
  logs: [mockAuditLog],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: AuditLogStatistics = {
  total_logs: 1000,
  by_action: { CREATE: 400, UPDATE: 350, DELETE: 150, READ: 100 },
  by_resource_type: { patient: 500, visit: 300, appointment: 200 },
  today_count: 50,
  this_week_count: 250,
};

const mockUserActivity: UserActivitySummary = {
  user_id: 'user-1',
  username: 'testuser',
  total_actions: 100,
  by_action: { CREATE: 40, UPDATE: 35, DELETE: 15, READ: 10 },
  last_activity: '2024-01-01T10:00:00Z',
  recent_logs: [mockAuditLog],
};

const mockFilterOptions: AuditFilterOptions = {
  actions: ['CREATE', 'UPDATE', 'DELETE', 'READ'],
  resource_types: ['patient', 'visit', 'appointment', 'user'],
  users: [{ id: 'user-1', username: 'testuser' }],
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

describe('auditLogKeys', () => {
  it('should generate correct keys', () => {
    expect(auditLogKeys.all).toEqual(['auditLogs']);
    expect(auditLogKeys.lists()).toEqual(['auditLogs', 'list']);
    expect(auditLogKeys.details()).toEqual(['auditLogs', 'detail']);
    expect(auditLogKeys.detail(1)).toEqual(['auditLogs', 'detail', 1]);
    expect(auditLogKeys.statistics()).toEqual(['auditLogs', 'statistics']);
    expect(auditLogKeys.userActivity('user-1')).toEqual(['auditLogs', 'userActivity', 'user-1']);
    expect(auditLogKeys.filterOptions()).toEqual(['auditLogs', 'filterOptions']);
  });

  it('should generate correct list key with filter', () => {
    const filter = { action: 'CREATE', resource_type: 'patient' };
    expect(auditLogKeys.list(filter)).toEqual(['auditLogs', 'list', filter]);
  });
});

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditApi.listLogs).mockResolvedValue(mockAuditLogsList);
  });

  it('should fetch audit logs successfully', async () => {
    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAuditLogsList);
    expect(auditApi.listLogs).toHaveBeenCalled();
  });

  it('should fetch audit logs with filters', async () => {
    const filter = { action: 'CREATE' as const, resource_type: 'patient' };

    const { result } = renderHook(() => useAuditLogs(filter), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(auditApi.listLogs).toHaveBeenCalledWith(filter);
  });

  it('should handle fetch error', async () => {
    vi.mocked(auditApi.listLogs).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditApi.getLog).mockResolvedValue(mockAuditLog);
  });

  it('should fetch audit log by id', async () => {
    const { result } = renderHook(() => useAuditLog(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAuditLog);
    expect(auditApi.getLog).toHaveBeenCalledWith(1);
  });

  it('should not fetch when id is 0 or negative', () => {
    const { result } = renderHook(() => useAuditLog(0), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(auditApi.getLog).not.toHaveBeenCalled();
  });
});

describe('useAuditLogStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditApi.getStatistics).mockResolvedValue(mockStatistics);
  });

  it('should fetch audit log statistics', async () => {
    const { result } = renderHook(() => useAuditLogStatistics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStatistics);
    expect(auditApi.getStatistics).toHaveBeenCalled();
  });
});

describe('useUserActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditApi.getUserActivity).mockResolvedValue(mockUserActivity);
  });

  it('should fetch user activity', async () => {
    const { result } = renderHook(() => useUserActivity('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUserActivity);
    expect(auditApi.getUserActivity).toHaveBeenCalledWith('user-1');
  });

  it('should not fetch when userId is empty', () => {
    const { result } = renderHook(() => useUserActivity(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(auditApi.getUserActivity).not.toHaveBeenCalled();
  });
});

describe('useAuditFilterOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditApi.getFilterOptions).mockResolvedValue(mockFilterOptions);
  });

  it('should fetch filter options', async () => {
    const { result } = renderHook(() => useAuditFilterOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFilterOptions);
    expect(auditApi.getFilterOptions).toHaveBeenCalled();
  });
});

describe('useExportAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditApi.exportLogs).mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
    vi.mocked(auditApi.downloadExport).mockImplementation(() => {});
  });

  it('should export audit logs successfully', async () => {
    const { result } = renderHook(() => useExportAuditLogs(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ format: 'csv' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(auditApi.exportLogs).toHaveBeenCalledWith({ format: 'csv' });
    expect(auditApi.downloadExport).toHaveBeenCalled();
  });

  it('should handle export error', async () => {
    vi.mocked(auditApi.exportLogs).mockRejectedValue(new Error('Export failed'));

    const { result } = renderHook(() => useExportAuditLogs(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ format: 'csv' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
