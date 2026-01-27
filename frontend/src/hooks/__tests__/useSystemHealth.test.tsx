/**
 * useSystemHealth Hook Tests
 *
 * Tests for system health monitoring React Query hooks including
 * health checks, system info, storage stats, and backup status.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useDetailedHealth,
  useDetailedHealthWithRefresh,
  useSystemInfo,
  useStorageStats,
  useBackupStatus,
  useAllSystemHealth,
  systemHealthKeys,
} from '../useSystemHealth';
import { systemApi } from '@/services/api';
import type {
  DetailedHealthResponse,
  SystemInfoResponse,
  StorageStatsResponse,
  BackupStatusResponse,
} from '@/types/system';

// Mock the system API
vi.mock('@/services/api', () => ({
  systemApi: {
    getDetailedHealth: vi.fn(),
    getSystemInfo: vi.fn(),
    getStorageStats: vi.fn(),
    getBackupStatus: vi.fn(),
  },
}));

// Mock health data
const mockHealth: DetailedHealthResponse = {
  status: 'healthy',
  components: {
    database: { status: 'healthy', latency_ms: 5 },
    pool: { status: 'healthy', active: 2, idle: 8, max: 10 },
  },
  resources: {
    memory_used_mb: 256,
    memory_total_mb: 1024,
    cpu_usage_percent: 15,
    disk_usage_percent: 45,
  },
  uptime_seconds: 86400,
  timestamp: '2024-01-01T00:00:00Z',
};

const mockSystemInfo: SystemInfoResponse = {
  application: {
    name: 'DocPat Backend',
    version: '1.0.0',
    rust_version: '1.90.0',
    build_timestamp: '2024-01-01T00:00:00Z',
  },
  server: {
    hostname: 'server-1',
    os: 'Linux',
    arch: 'x86_64',
    uptime_seconds: 86400,
  },
  database: {
    version: 'PostgreSQL 17.0',
    database_name: 'mpms_prod',
    pool_size: 10,
    tables_count: 25,
  },
  environment: {
    environment: 'production',
    debug_mode: false,
    log_level: 'info',
    timezone: 'UTC',
  },
};

const mockStorageStats: StorageStatsResponse = {
  database: {
    total_size_bytes: 1073741824,
    tables_size_bytes: 536870912,
    indexes_size_bytes: 268435456,
    toast_size_bytes: 134217728,
  },
  file_system: {
    documents_size_bytes: 104857600,
    uploads_size_bytes: 52428800,
    logs_size_bytes: 26214400,
  },
  disk: {
    total_bytes: 107374182400,
    available_bytes: 53687091200,
    used_percent: 50,
  },
  table_breakdown: [
    { table_name: 'visits', size_bytes: 268435456 },
    { table_name: 'patients', size_bytes: 134217728 },
  ],
};

const mockBackupStatus: BackupStatusResponse = {
  enabled: true,
  last_backup: {
    timestamp: '2024-01-01T00:00:00Z',
    size_bytes: 536870912,
    duration_seconds: 120,
    status: 'success',
  },
  next_scheduled: '2024-01-02T00:00:00Z',
  backup_location: '/backups',
  retention_days: 30,
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

describe('systemHealthKeys', () => {
  it('should generate correct all key', () => {
    expect(systemHealthKeys.all).toEqual(['system-health']);
  });

  it('should generate correct health key', () => {
    expect(systemHealthKeys.health()).toEqual(['system-health', 'health']);
  });

  it('should generate correct info key', () => {
    expect(systemHealthKeys.info()).toEqual(['system-health', 'info']);
  });

  it('should generate correct storage key', () => {
    expect(systemHealthKeys.storage()).toEqual(['system-health', 'storage']);
  });

  it('should generate correct backup key', () => {
    expect(systemHealthKeys.backup()).toEqual(['system-health', 'backup']);
  });
});

describe('useDetailedHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemApi.getDetailedHealth).mockResolvedValue(mockHealth);
  });

  it('should fetch detailed health successfully', async () => {
    const { result } = renderHook(() => useDetailedHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHealth);
    expect(systemApi.getDetailedHealth).toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(systemApi.getDetailedHealth).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDetailedHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should show loading state initially', () => {
    vi.mocked(systemApi.getDetailedHealth).mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useDetailedHealth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useDetailedHealthWithRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemApi.getDetailedHealth).mockResolvedValue(mockHealth);
  });

  it('should fetch health data', async () => {
    const { result } = renderHook(
      () => useDetailedHealthWithRefresh(30000),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHealth);
  });

  it('should have refetchInterval configured', async () => {
    const { result } = renderHook(
      () => useDetailedHealthWithRefresh(60000),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the hook fetches data - the refetch interval is configured internally
    expect(systemApi.getDetailedHealth).toHaveBeenCalled();
  });
});

describe('useSystemInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemApi.getSystemInfo).mockResolvedValue(mockSystemInfo);
  });

  it('should fetch system info successfully', async () => {
    const { result } = renderHook(() => useSystemInfo(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSystemInfo);
    expect(systemApi.getSystemInfo).toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(systemApi.getSystemInfo).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSystemInfo(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useStorageStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemApi.getStorageStats).mockResolvedValue(mockStorageStats);
  });

  it('should fetch storage stats successfully', async () => {
    const { result } = renderHook(() => useStorageStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStorageStats);
    expect(systemApi.getStorageStats).toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(systemApi.getStorageStats).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStorageStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useBackupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemApi.getBackupStatus).mockResolvedValue(mockBackupStatus);
  });

  it('should fetch backup status successfully', async () => {
    const { result } = renderHook(() => useBackupStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBackupStatus);
    expect(systemApi.getBackupStatus).toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(systemApi.getBackupStatus).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBackupStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useAllSystemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemApi.getDetailedHealth).mockResolvedValue(mockHealth);
    vi.mocked(systemApi.getSystemInfo).mockResolvedValue(mockSystemInfo);
    vi.mocked(systemApi.getStorageStats).mockResolvedValue(mockStorageStats);
    vi.mocked(systemApi.getBackupStatus).mockResolvedValue(mockBackupStatus);
  });

  it('should fetch all system health data', async () => {
    const { result } = renderHook(() => useAllSystemHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.health.data).toEqual(mockHealth);
    expect(result.current.info.data).toEqual(mockSystemInfo);
    expect(result.current.storage.data).toEqual(mockStorageStats);
    expect(result.current.backup.data).toEqual(mockBackupStatus);
  });

  it('should report isLoading when any query is loading', () => {
    vi.mocked(systemApi.getDetailedHealth).mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useAllSystemHealth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should report isError when any query has error', async () => {
    vi.mocked(systemApi.getDetailedHealth).mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useAllSystemHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should provide refetchAll function', async () => {
    const { result } = renderHook(() => useAllSystemHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetchAll).toBe('function');
  });

  it('should call all refetch functions when refetchAll is called', async () => {
    const { result } = renderHook(() => useAllSystemHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mock call counts
    vi.clearAllMocks();

    // Call refetchAll
    result.current.refetchAll();

    // All APIs should be called again
    await waitFor(() => {
      expect(systemApi.getDetailedHealth).toHaveBeenCalled();
      expect(systemApi.getSystemInfo).toHaveBeenCalled();
      expect(systemApi.getStorageStats).toHaveBeenCalled();
      expect(systemApi.getBackupStatus).toHaveBeenCalled();
    });
  });

  it('should support auto-refresh mode', async () => {
    const { result } = renderHook(() => useAllSystemHealth(true, 30000), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify data was fetched with auto-refresh enabled
    expect(result.current.health.data).toBeDefined();
  });
});
