/**
 * System API Service Tests
 *
 * Tests for system health monitoring and status API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { systemApi } from '../system';
import { apiClient } from '../axios-instance';
import type {
  DetailedHealthResponse,
  SystemInfoResponse,
  StorageStatsResponse,
  BackupStatusResponse,
} from '@/types/system';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock data
const mockDetailedHealth: DetailedHealthResponse = {
  status: 'healthy',
  timestamp: '2024-01-15T10:00:00Z',
  components: {
    database: {
      status: 'healthy',
      latency_ms: 5,
      details: {
        connection_pool_size: 10,
        active_connections: 3,
      },
    },
    memory: {
      status: 'healthy',
      used_mb: 512,
      total_mb: 2048,
      percentage: 25,
    },
    cpu: {
      status: 'healthy',
      usage_percentage: 15,
    },
    disk: {
      status: 'healthy',
      used_gb: 50,
      total_gb: 200,
      percentage: 25,
    },
  },
};

const mockSystemInfo: SystemInfoResponse = {
  application: {
    name: 'DocPat',
    version: '1.0.0',
    rust_version: '1.75.0',
    build_time: '2024-01-15T00:00:00Z',
    git_hash: 'abc123',
  },
  server: {
    hostname: 'docpat-server',
    os: 'Linux',
    architecture: 'x86_64',
    uptime_seconds: 86400,
  },
  database: {
    version: 'PostgreSQL 15.0',
    database_name: 'docpat',
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
    tables_size_mb: 150,
    indexes_size_mb: 50,
    total_size_mb: 200,
  },
  filesystem: {
    documents_mb: 500,
    uploads_mb: 100,
    logs_mb: 50,
  },
  disk: {
    total_gb: 200,
    available_gb: 150,
    used_percentage: 25,
  },
  tables: [
    { name: 'patients', size_mb: 50 },
    { name: 'appointments', size_mb: 30 },
    { name: 'visits', size_mb: 25 },
  ],
};

const mockBackupStatus: BackupStatusResponse = {
  enabled: true,
  last_backup: {
    timestamp: '2024-01-15T02:00:00Z',
    size_mb: 150,
    duration_seconds: 120,
    status: 'success',
  },
  next_scheduled: '2024-01-16T02:00:00Z',
  location: '/backups/docpat',
  retention_days: 30,
};

describe('systemApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDetailedHealth', () => {
    it('should fetch detailed health status', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDetailedHealth });

      const result = await systemApi.getDetailedHealth();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system/health/detailed');
      expect(result).toEqual(mockDetailedHealth);
      expect(result.status).toBe('healthy');
    });

    it('should return degraded status when components have issues', async () => {
      const degradedHealth = {
        ...mockDetailedHealth,
        status: 'degraded',
        components: {
          ...mockDetailedHealth.components,
          database: {
            ...mockDetailedHealth.components.database,
            status: 'degraded',
            latency_ms: 500,
          },
        },
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: degradedHealth });

      const result = await systemApi.getDetailedHealth();

      expect(result.status).toBe('degraded');
      expect(result.components.database.status).toBe('degraded');
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(systemApi.getDetailedHealth()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getSystemInfo', () => {
    it('should fetch system information', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSystemInfo });

      const result = await systemApi.getSystemInfo();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system/info');
      expect(result).toEqual(mockSystemInfo);
      expect(result.application.name).toBe('DocPat');
    });

    it('should include all required sections', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSystemInfo });

      const result = await systemApi.getSystemInfo();

      expect(result.application).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.database).toBeDefined();
      expect(result.environment).toBeDefined();
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Internal server error'));

      await expect(systemApi.getSystemInfo()).rejects.toThrow('Internal server error');
    });
  });

  describe('getStorageStats', () => {
    it('should fetch storage statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStorageStats });

      const result = await systemApi.getStorageStats();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system/storage');
      expect(result).toEqual(mockStorageStats);
    });

    it('should include database size breakdown', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStorageStats });

      const result = await systemApi.getStorageStats();

      expect(result.database.tables_size_mb).toBeDefined();
      expect(result.database.indexes_size_mb).toBeDefined();
      expect(result.database.total_size_mb).toBeDefined();
    });

    it('should include table-by-table breakdown', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStorageStats });

      const result = await systemApi.getStorageStats();

      expect(result.tables).toBeInstanceOf(Array);
      expect(result.tables.length).toBeGreaterThan(0);
      expect(result.tables[0]).toHaveProperty('name');
      expect(result.tables[0]).toHaveProperty('size_mb');
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(systemApi.getStorageStats()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getBackupStatus', () => {
    it('should fetch backup status', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBackupStatus });

      const result = await systemApi.getBackupStatus();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system/backup-status');
      expect(result).toEqual(mockBackupStatus);
      expect(result.enabled).toBe(true);
    });

    it('should return disabled backup status', async () => {
      const disabledBackup = {
        enabled: false,
        last_backup: null,
        next_scheduled: null,
        location: null,
        retention_days: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: disabledBackup });

      const result = await systemApi.getBackupStatus();

      expect(result.enabled).toBe(false);
      expect(result.last_backup).toBeNull();
    });

    it('should include last backup details when available', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBackupStatus });

      const result = await systemApi.getBackupStatus();

      expect(result.last_backup).toBeDefined();
      expect(result.last_backup?.status).toBe('success');
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(systemApi.getBackupStatus()).rejects.toThrow('Unauthorized');
    });
  });
});
