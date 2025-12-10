/**
 * System Health Hooks
 *
 * React Query hooks for system health monitoring and status reporting.
 * Provides declarative data fetching with caching and auto-refresh capabilities.
 */

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { systemApi } from '@/services/api';
import type {
  DetailedHealthResponse,
  SystemInfoResponse,
  StorageStatsResponse,
  BackupStatusResponse,
} from '@/types/system';

/**
 * Query keys for system health-related data
 * Following React Query best practices for key structure
 */
export const systemHealthKeys = {
  all: ['system-health'] as const,
  health: () => [...systemHealthKeys.all, 'health'] as const,
  info: () => [...systemHealthKeys.all, 'info'] as const,
  storage: () => [...systemHealthKeys.all, 'storage'] as const,
  backup: () => [...systemHealthKeys.all, 'backup'] as const,
};

/**
 * Fetch detailed system health status
 *
 * Returns comprehensive health check with component-level details:
 * - Overall status (healthy/degraded/unhealthy)
 * - Database health with latency
 * - Connection pool metrics
 * - System resources (memory, CPU, disk)
 *
 * @param options - Additional React Query options
 * @returns Query result with detailed health data
 */
export function useDetailedHealth(
  options?: Omit<UseQueryOptions<DetailedHealthResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DetailedHealthResponse>({
    queryKey: systemHealthKeys.health(),
    queryFn: () => systemApi.getDetailedHealth(),
    staleTime: 30 * 1000, // 30 seconds - health data should be fresh
    refetchInterval: false, // Manual refresh by default
    ...options,
  });
}

/**
 * Fetch detailed system health with auto-refresh
 *
 * Same as useDetailedHealth but with automatic polling.
 *
 * @param intervalMs - Refresh interval in milliseconds (default: 30000)
 * @param options - Additional React Query options
 * @returns Query result with detailed health data
 */
export function useDetailedHealthWithRefresh(
  intervalMs: number = 30000,
  options?: Omit<UseQueryOptions<DetailedHealthResponse>, 'queryKey' | 'queryFn' | 'refetchInterval'>
) {
  return useQuery<DetailedHealthResponse>({
    queryKey: systemHealthKeys.health(),
    queryFn: () => systemApi.getDetailedHealth(),
    staleTime: intervalMs / 2,
    refetchInterval: intervalMs,
    ...options,
  });
}

/**
 * Fetch comprehensive system information
 *
 * Returns:
 * - Application info (name, version, rust version, build info)
 * - Server info (hostname, OS, architecture, uptime)
 * - Database info (version, database name, pool size, tables count)
 * - Environment info (environment, debug mode, log level, timezone)
 *
 * @param options - Additional React Query options
 * @returns Query result with system information
 */
export function useSystemInfo(
  options?: Omit<UseQueryOptions<SystemInfoResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SystemInfoResponse>({
    queryKey: systemHealthKeys.info(),
    queryFn: () => systemApi.getSystemInfo(),
    staleTime: 5 * 60 * 1000, // 5 minutes - system info rarely changes
    ...options,
  });
}

/**
 * Fetch storage statistics
 *
 * Returns:
 * - Database size breakdown (tables, indexes, total)
 * - File system stats (documents, uploads, logs)
 * - Disk usage (total, available, percentage)
 * - Table-by-table breakdown (top 20 by size)
 *
 * @param options - Additional React Query options
 * @returns Query result with storage statistics
 */
export function useStorageStats(
  options?: Omit<UseQueryOptions<StorageStatsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<StorageStatsResponse>({
    queryKey: systemHealthKeys.storage(),
    queryFn: () => systemApi.getStorageStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes - storage stats change slowly
    ...options,
  });
}

/**
 * Fetch backup status information
 *
 * Returns:
 * - Whether backups are enabled
 * - Last backup details (timestamp, size, duration, status)
 * - Next scheduled backup time
 * - Backup location
 * - Retention days setting
 *
 * @param options - Additional React Query options
 * @returns Query result with backup status
 */
export function useBackupStatus(
  options?: Omit<UseQueryOptions<BackupStatusResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<BackupStatusResponse>({
    queryKey: systemHealthKeys.backup(),
    queryFn: () => systemApi.getBackupStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes - backup status doesn't change often
    ...options,
  });
}

/**
 * Combined hook for fetching all system health data
 *
 * Useful for the system health dashboard page.
 *
 * @param autoRefresh - Whether to enable auto-refresh for health data
 * @param refreshInterval - Refresh interval in ms (default: 30000)
 * @returns Object containing all system health query results
 */
export function useAllSystemHealth(
  autoRefresh: boolean = false,
  refreshInterval: number = 30000
) {
  const health = useQuery<DetailedHealthResponse>({
    queryKey: systemHealthKeys.health(),
    queryFn: () => systemApi.getDetailedHealth(),
    staleTime: autoRefresh ? refreshInterval / 2 : 30 * 1000,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const info = useSystemInfo();
  const storage = useStorageStats();
  const backup = useBackupStatus();

  return {
    health,
    info,
    storage,
    backup,
    isLoading: health.isLoading || info.isLoading || storage.isLoading || backup.isLoading,
    isError: health.isError || info.isError || storage.isError || backup.isError,
    refetchAll: () => {
      health.refetch();
      info.refetch();
      storage.refetch();
      backup.refetch();
    },
  };
}
