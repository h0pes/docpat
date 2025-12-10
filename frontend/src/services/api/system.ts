/**
 * System Health API Service
 *
 * API methods for system health monitoring and status reporting.
 * All endpoints require ADMIN role authentication.
 */

import { apiClient } from './axios-instance';
import type {
  DetailedHealthResponse,
  SystemInfoResponse,
  StorageStatsResponse,
  BackupStatusResponse,
} from '../../types/system';

/**
 * System Health API endpoints
 * Base path: /api/v1/system
 */
export const systemApi = {
  /**
   * Get detailed health status with component-level checks
   *
   * Returns comprehensive health check including:
   * - Overall status (healthy/degraded/unhealthy)
   * - Database health with latency
   * - Connection pool metrics
   * - System resources (memory, CPU, disk)
   *
   * @returns Detailed health response
   */
  getDetailedHealth: async (): Promise<DetailedHealthResponse> => {
    const response = await apiClient.get<DetailedHealthResponse>(
      '/api/v1/system/health/detailed'
    );
    return response.data;
  },

  /**
   * Get comprehensive system information
   *
   * Returns:
   * - Application info (name, version, rust version, build info)
   * - Server info (hostname, OS, architecture, uptime)
   * - Database info (version, database name, pool size, tables count)
   * - Environment info (environment, debug mode, log level, timezone)
   *
   * @returns System information response
   */
  getSystemInfo: async (): Promise<SystemInfoResponse> => {
    const response = await apiClient.get<SystemInfoResponse>(
      '/api/v1/system/info'
    );
    return response.data;
  },

  /**
   * Get storage statistics
   *
   * Returns:
   * - Database size breakdown (tables, indexes, total)
   * - File system stats (documents, uploads, logs)
   * - Disk usage (total, available, percentage)
   * - Table-by-table breakdown (top 20 by size)
   *
   * @returns Storage statistics response
   */
  getStorageStats: async (): Promise<StorageStatsResponse> => {
    const response = await apiClient.get<StorageStatsResponse>(
      '/api/v1/system/storage'
    );
    return response.data;
  },

  /**
   * Get backup status information
   *
   * Returns:
   * - Whether backups are enabled
   * - Last backup details (timestamp, size, duration, status)
   * - Next scheduled backup time
   * - Backup location
   * - Retention days setting
   *
   * @returns Backup status response
   */
  getBackupStatus: async (): Promise<BackupStatusResponse> => {
    const response = await apiClient.get<BackupStatusResponse>(
      '/api/v1/system/backup-status'
    );
    return response.data;
  },
};
