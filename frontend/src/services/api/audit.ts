/**
 * Audit Logs API Service
 *
 * API methods for querying and exporting audit logs.
 * All endpoints require ADMIN role authentication.
 */

import { apiClient } from './axios-instance';
import type {
  AuditLog,
  AuditLogsFilter,
  ListAuditLogsResponse,
  AuditLogStatistics,
  UserActivitySummary,
  ExportAuditLogsRequest,
  AuditFilterOptions,
} from '../../types/audit';

/**
 * Audit Logs API endpoints
 * Base path: /api/v1/audit-logs
 */
export const auditApi = {
  /**
   * List audit logs with filters and pagination
   *
   * @param filter - Filter and pagination parameters
   * @returns Paginated list of audit logs
   */
  listLogs: async (filter?: AuditLogsFilter): Promise<ListAuditLogsResponse> => {
    const response = await apiClient.get<ListAuditLogsResponse>(
      '/api/v1/audit-logs',
      {
        params: {
          user_id: filter?.user_id,
          action: filter?.action,
          entity_type: filter?.entity_type,
          entity_id: filter?.entity_id,
          date_from: filter?.date_from,
          date_to: filter?.date_to,
          ip_address: filter?.ip_address,
          page: filter?.page,
          page_size: filter?.page_size,
        },
      }
    );
    return response.data;
  },

  /**
   * Get a single audit log entry by ID
   *
   * @param id - Audit log entry ID
   * @returns Single audit log entry
   */
  getLog: async (id: number): Promise<AuditLog> => {
    const response = await apiClient.get<AuditLog>(`/api/v1/audit-logs/${id}`);
    return response.data;
  },

  /**
   * Get audit log statistics
   *
   * @returns Statistics including totals, breakdowns, and top users
   */
  getStatistics: async (): Promise<AuditLogStatistics> => {
    const response = await apiClient.get<AuditLogStatistics>(
      '/api/v1/audit-logs/statistics'
    );
    return response.data;
  },

  /**
   * Get activity summary for a specific user
   *
   * @param userId - User UUID
   * @returns User activity summary with recent logs
   */
  getUserActivity: async (userId: string): Promise<UserActivitySummary> => {
    const response = await apiClient.get<UserActivitySummary>(
      `/api/v1/audit-logs/user/${userId}/activity`
    );
    return response.data;
  },

  /**
   * Get available filter options (actions and entity types)
   *
   * @returns Available action and entity type values
   */
  getFilterOptions: async (): Promise<AuditFilterOptions> => {
    const response = await apiClient.get<AuditFilterOptions>(
      '/api/v1/audit-logs/filter-options'
    );
    return response.data;
  },

  /**
   * Export audit logs to CSV or JSON file
   *
   * @param request - Export parameters including format and filters
   * @returns Blob of the exported file
   */
  exportLogs: async (request: ExportAuditLogsRequest): Promise<Blob> => {
    const response = await apiClient.get('/api/v1/audit-logs/export', {
      params: {
        format: request.format || 'csv',
        limit: request.limit,
        user_id: request.user_id,
        action: request.action,
        entity_type: request.entity_type,
        entity_id: request.entity_id,
        date_from: request.date_from,
        date_to: request.date_to,
        ip_address: request.ip_address,
      },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Helper to trigger download of exported file
   *
   * @param blob - File blob
   * @param format - Export format (csv or json)
   */
  downloadExport: (blob: Blob, format: 'csv' | 'json' = 'csv'): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `audit_logs_export_${timestamp}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
