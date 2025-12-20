/**
 * Audit Log Types
 *
 * TypeScript type definitions for audit log management.
 * Aligned with backend models in backend/src/models/audit_log.rs
 */

/**
 * Actions that can be tracked in audit logs
 */
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SEARCH = 'SEARCH',
  EXPORT = 'EXPORT',
}

/**
 * Entity types that can be audited
 */
export enum AuditEntityType {
  PATIENT = 'PATIENT',
  PATIENT_INSURANCE = 'PATIENT_INSURANCE',
  VISIT = 'VISIT',
  PRESCRIPTION = 'PRESCRIPTION',
  APPOINTMENT = 'APPOINTMENT',
  USER = 'USER',
  DOCUMENT = 'DOCUMENT',
  HOLIDAY = 'HOLIDAY',
  WORKING_HOURS = 'WORKING_HOURS',
  SYSTEM_SETTING = 'SYSTEM_SETTING',
}

/**
 * A single audit log entry
 */
export interface AuditLog {
  /** Unique identifier (auto-increment) */
  id: number;
  /** User who performed the action (null for system actions) */
  user_id: string | null;
  /** Email of the user who performed the action */
  user_email: string | null;
  /** Type of action performed */
  action: AuditAction | string;
  /** Type of entity affected */
  entity_type: AuditEntityType | string;
  /** ID of the specific entity affected */
  entity_id: string | null;
  /** JSON diff of what changed (for UPDATE actions) */
  changes: Record<string, unknown> | null;
  /** IP address of the request origin */
  ip_address: string | null;
  /** Browser/client user agent */
  user_agent: string | null;
  /** Request correlation ID */
  request_id: string | null;
  /** When the action occurred */
  created_at: string;
}

/**
 * Sortable columns for audit logs
 */
export type AuditLogSortColumn = 'created_at' | 'action' | 'entity_type' | 'user_email';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Filter parameters for querying audit logs
 */
export interface AuditLogsFilter {
  /** Filter by user ID */
  user_id?: string;
  /** Filter by action type */
  action?: AuditAction | string;
  /** Filter by entity type */
  entity_type?: AuditEntityType | string;
  /** Filter by specific entity ID */
  entity_id?: string;
  /** Start date (inclusive, YYYY-MM-DD) */
  date_from?: string;
  /** End date (inclusive, YYYY-MM-DD) */
  date_to?: string;
  /** Partial match on IP address */
  ip_address?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (max 100) */
  page_size?: number;
  /** Column to sort by */
  sort_by?: AuditLogSortColumn;
  /** Sort order (asc or desc) */
  sort_order?: SortOrder;
}

/**
 * Paginated list response for audit logs
 */
export interface ListAuditLogsResponse {
  /** Array of audit log entries */
  logs: AuditLog[];
  /** Total number of matching records */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  page_size: number;
  /** Total number of pages */
  total_pages: number;
}

/**
 * Count of actions by type
 */
export interface ActionCount {
  /** Action type */
  action: string;
  /** Number of occurrences */
  count: number;
}

/**
 * Count of entities by type
 */
export interface EntityTypeCount {
  /** Entity type */
  entity_type: string;
  /** Number of occurrences */
  count: number;
}

/**
 * User activity count for statistics
 */
export interface UserActivityCount {
  /** User ID */
  user_id: string;
  /** User email (if available) */
  user_email: string | null;
  /** Number of actions */
  count: number;
}

/**
 * Overall audit log statistics
 */
export interface AuditLogStatistics {
  /** Total number of audit log entries */
  total_logs: number;
  /** Logs created today */
  logs_today: number;
  /** Logs created this week */
  logs_this_week: number;
  /** Logs created this month */
  logs_this_month: number;
  /** Breakdown by action type */
  actions_breakdown: ActionCount[];
  /** Breakdown by entity type */
  entity_types_breakdown: EntityTypeCount[];
  /** Top 10 most active users (last 30 days) */
  top_users: UserActivityCount[];
}

/**
 * Summary of a user's activity
 */
export interface UserActivitySummary {
  /** User ID */
  user_id: string;
  /** User email (if available) */
  user_email: string | null;
  /** Total number of actions by this user */
  total_actions: number;
  /** First recorded activity */
  first_activity: string | null;
  /** Most recent activity */
  last_activity: string | null;
  /** Breakdown of actions by type */
  actions_breakdown: ActionCount[];
  /** Last 20 audit log entries for this user */
  recent_logs: AuditLog[];
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Request parameters for exporting audit logs
 */
export interface ExportAuditLogsRequest extends AuditLogsFilter {
  /** Export format (csv or json) */
  format?: ExportFormat;
  /** Maximum number of records to export (default 10000, max 50000) */
  limit?: number;
}

/**
 * Available filter options for dropdowns
 */
export interface AuditFilterOptions {
  /** Available action types */
  actions: string[];
  /** Available entity types */
  entity_types: string[];
}

/**
 * Helper function to get display name for action
 */
export function getActionDisplayName(action: string): string {
  const displayNames: Record<string, string> = {
    CREATE: 'Create',
    READ: 'View',
    UPDATE: 'Update',
    DELETE: 'Delete',
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    SEARCH: 'Search',
    EXPORT: 'Export',
  };
  return displayNames[action] || action;
}

/**
 * Helper function to get display name for entity type
 */
export function getEntityTypeDisplayName(entityType: string): string {
  const displayNames: Record<string, string> = {
    PATIENT: 'Patient',
    PATIENT_INSURANCE: 'Patient Insurance',
    VISIT: 'Visit',
    PRESCRIPTION: 'Prescription',
    APPOINTMENT: 'Appointment',
    USER: 'User',
    DOCUMENT: 'Document',
    HOLIDAY: 'Holiday',
    WORKING_HOURS: 'Working Hours',
    SYSTEM_SETTING: 'System Setting',
  };
  return displayNames[entityType] || entityType;
}

/**
 * Helper function to get color for action type (for badges)
 */
export function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    READ: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    SEARCH: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    EXPORT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  };
  return colors[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}
