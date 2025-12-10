/**
 * Audit Logs Hooks
 *
 * React Query hooks for audit log management.
 * Provides declarative data fetching with caching.
 */

import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { auditApi } from '@/services/api';
import type {
  AuditLog,
  AuditLogsFilter,
  ListAuditLogsResponse,
  AuditLogStatistics,
  UserActivitySummary,
  ExportAuditLogsRequest,
  AuditFilterOptions,
} from '@/types/audit';

/**
 * Query keys for audit log related data
 */
export const auditLogKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filter: AuditLogsFilter) => [...auditLogKeys.lists(), filter] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: number) => [...auditLogKeys.details(), id] as const,
  statistics: () => [...auditLogKeys.all, 'statistics'] as const,
  userActivity: (userId: string) =>
    [...auditLogKeys.all, 'userActivity', userId] as const,
  filterOptions: () => [...auditLogKeys.all, 'filterOptions'] as const,
};

/**
 * Fetch audit logs with filters and pagination
 *
 * @param filter - Filter and pagination parameters
 * @param options - Additional React Query options
 * @returns Query result with paginated audit logs
 */
export function useAuditLogs(
  filter?: AuditLogsFilter,
  options?: Omit<
    UseQueryOptions<ListAuditLogsResponse>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<ListAuditLogsResponse>({
    queryKey: auditLogKeys.list(filter || {}),
    queryFn: () => auditApi.listLogs(filter),
    staleTime: 30 * 1000, // 30 seconds - audit logs change frequently
    ...options,
  });
}

/**
 * Fetch a single audit log entry by ID
 *
 * @param id - Audit log entry ID
 * @param options - Additional React Query options
 * @returns Query result with single audit log
 */
export function useAuditLog(
  id: number,
  options?: Omit<UseQueryOptions<AuditLog>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AuditLog>({
    queryKey: auditLogKeys.detail(id),
    queryFn: () => auditApi.getLog(id),
    enabled: id > 0,
    ...options,
  });
}

/**
 * Fetch audit log statistics
 *
 * @param options - Additional React Query options
 * @returns Query result with statistics
 */
export function useAuditLogStatistics(
  options?: Omit<UseQueryOptions<AuditLogStatistics>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AuditLogStatistics>({
    queryKey: auditLogKeys.statistics(),
    queryFn: () => auditApi.getStatistics(),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch activity summary for a specific user
 *
 * @param userId - User UUID
 * @param options - Additional React Query options
 * @returns Query result with user activity summary
 */
export function useUserActivity(
  userId: string,
  options?: Omit<UseQueryOptions<UserActivitySummary>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UserActivitySummary>({
    queryKey: auditLogKeys.userActivity(userId),
    queryFn: () => auditApi.getUserActivity(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetch available filter options
 *
 * @param options - Additional React Query options
 * @returns Query result with filter options
 */
export function useAuditFilterOptions(
  options?: Omit<UseQueryOptions<AuditFilterOptions>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AuditFilterOptions>({
    queryKey: auditLogKeys.filterOptions(),
    queryFn: () => auditApi.getFilterOptions(),
    staleTime: 5 * 60 * 1000, // 5 minutes - these don't change often
    ...options,
  });
}

/**
 * Export audit logs mutation
 *
 * @returns Mutation for exporting audit logs
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (request: ExportAuditLogsRequest) => {
      const blob = await auditApi.exportLogs(request);
      auditApi.downloadExport(blob, request.format || 'csv');
      return blob;
    },
  });
}
