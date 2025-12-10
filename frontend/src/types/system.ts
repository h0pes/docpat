/**
 * System Health Types
 *
 * TypeScript type definitions for system health monitoring and status reporting.
 * Aligned with backend models in backend/src/models/system_health.rs
 */

// ============================================================================
// Health Status Types
// ============================================================================

/**
 * Overall health status of a component or system
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health status of an individual component
 */
export interface ComponentHealth {
  /** Component name (e.g., "database", "redis") */
  name: string;
  /** Current health status */
  status: HealthStatus;
  /** Optional message describing status */
  message: string | null;
  /** Response latency in milliseconds */
  latency_ms: number | null;
  /** Additional component-specific details */
  details: Record<string, unknown> | null;
}

/**
 * Database connection pool metrics
 */
export interface DatabasePoolMetrics {
  /** Current pool size */
  size: number;
  /** Available connections */
  available: number;
  /** Connections currently in use */
  in_use: number;
  /** Maximum connections allowed */
  max_connections: number;
}

/**
 * System resource metrics (memory, CPU, disk)
 */
export interface SystemResources {
  /** Memory used in megabytes */
  memory_used_mb: number | null;
  /** Total memory in megabytes */
  memory_total_mb: number | null;
  /** Memory usage percentage (0-100) */
  memory_percent: number | null;
  /** CPU usage percentage (0-100) */
  cpu_usage_percent: number | null;
  /** Disk space used in gigabytes */
  disk_used_gb: number | null;
  /** Total disk space in gigabytes */
  disk_total_gb: number | null;
  /** Disk usage percentage (0-100) */
  disk_percent: number | null;
}

/**
 * Detailed health check response from /api/v1/system/health/detailed
 */
export interface DetailedHealthResponse {
  /** Overall system status */
  status: HealthStatus;
  /** Timestamp of the health check */
  timestamp: string;
  /** Server uptime in seconds */
  uptime_seconds: number;
  /** Application version */
  version: string;
  /** Health status of individual components */
  components: ComponentHealth[];
  /** Database connection pool metrics */
  database_pool: DatabasePoolMetrics | null;
  /** System resource metrics */
  system_resources: SystemResources | null;
}

// ============================================================================
// System Information Types
// ============================================================================

/**
 * Application version and build information
 */
export interface ApplicationInfo {
  /** Application name */
  name: string;
  /** Application version */
  version: string;
  /** Rust compiler version */
  rust_version: string;
  /** Build timestamp (ISO 8601) */
  build_timestamp: string | null;
  /** Git commit hash */
  git_commit: string | null;
}

/**
 * Server information
 */
export interface ServerInfo {
  /** Server hostname */
  hostname: string;
  /** Operating system */
  os: string;
  /** Architecture (x86_64, aarch64, etc.) */
  arch: string;
  /** Uptime in seconds */
  uptime_seconds: number;
  /** Server start time (ISO 8601) */
  started_at: string;
}

/**
 * Database information
 */
export interface DatabaseInfo {
  /** PostgreSQL version */
  version: string;
  /** Database name */
  database_name: string;
  /** Connection pool size */
  connection_pool_size: number;
  /** Last applied migration */
  last_migration: string | null;
  /** Total number of tables */
  total_tables: number;
}

/**
 * Environment configuration
 */
export interface EnvironmentInfo {
  /** Environment name (development, staging, production) */
  environment: string;
  /** Whether debug mode is enabled */
  debug_mode: boolean;
  /** Current log level */
  log_level: string;
  /** Server timezone */
  timezone: string;
}

/**
 * System information response from /api/v1/system/info
 */
export interface SystemInfoResponse {
  /** Application info */
  application: ApplicationInfo;
  /** Server info */
  server: ServerInfo;
  /** Database info */
  database: DatabaseInfo;
  /** Environment info */
  environment: EnvironmentInfo;
}

// ============================================================================
// Storage Statistics Types
// ============================================================================

/**
 * Database storage statistics
 */
export interface DatabaseStorageStats {
  /** Total database size in megabytes */
  total_size_mb: number;
  /** Size of tables in megabytes */
  tables_size_mb: number;
  /** Size of indexes in megabytes */
  indexes_size_mb: number;
  /** Estimated total row count across all tables */
  estimated_rows: number;
}

/**
 * File system storage statistics
 */
export interface FileSystemStats {
  /** Size of generated documents in megabytes */
  documents_size_mb: number;
  /** Size of uploaded files in megabytes */
  uploads_size_mb: number;
  /** Size of log files in megabytes */
  logs_size_mb: number;
  /** Available disk space in gigabytes */
  available_disk_gb: number;
  /** Total disk space in gigabytes */
  total_disk_gb: number;
  /** Disk usage percentage (0-100) */
  disk_usage_percent: number;
}

/**
 * Storage information for a single database table
 */
export interface TableStorageInfo {
  /** Table name */
  table_name: string;
  /** Table size in megabytes */
  size_mb: number;
  /** Estimated row count */
  row_count: number;
}

/**
 * Breakdown of storage by table
 */
export interface StorageBreakdown {
  /** Top tables by size */
  tables: TableStorageInfo[];
}

/**
 * Storage statistics response from /api/v1/system/storage
 */
export interface StorageStatsResponse {
  /** Database storage stats */
  database: DatabaseStorageStats;
  /** File system stats */
  file_system: FileSystemStats;
  /** Table-by-table breakdown */
  breakdown: StorageBreakdown;
}

// ============================================================================
// Backup Status Types
// ============================================================================

/**
 * Information about a single backup
 */
export interface BackupInfo {
  /** Backup timestamp (ISO 8601) */
  timestamp: string;
  /** Backup size in megabytes */
  size_mb: number;
  /** Backup duration in seconds */
  duration_seconds: number;
  /** Backup status (success, failed, etc.) */
  status: string;
  /** Backup filename */
  filename: string;
}

/**
 * Backup status response from /api/v1/system/backup-status
 */
export interface BackupStatusResponse {
  /** Whether backups are enabled */
  enabled: boolean;
  /** Information about the last backup */
  last_backup: BackupInfo | null;
  /** Next scheduled backup time (ISO 8601) */
  next_scheduled: string | null;
  /** Backup storage location */
  backup_location: string;
  /** Number of days to retain backups */
  retention_days: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display text for health status
 */
export function getHealthStatusText(status: HealthStatus): string {
  const texts: Record<HealthStatus, string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    unhealthy: 'Unhealthy',
  };
  return texts[status] || status;
}

/**
 * Get color class for health status badges
 */
export function getHealthStatusColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

/**
 * Get icon name for health status
 */
export function getHealthStatusIcon(status: HealthStatus): string {
  const icons: Record<HealthStatus, string> = {
    healthy: 'CheckCircle',
    degraded: 'AlertTriangle',
    unhealthy: 'XCircle',
  };
  return icons[status] || 'HelpCircle';
}

/**
 * Format uptime seconds into human-readable string
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

/**
 * Format megabytes into human-readable size
 */
export function formatSize(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
}

/**
 * Get progress bar color based on usage percentage
 */
export function getUsageColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 75) return 'bg-yellow-500';
  if (percent >= 50) return 'bg-blue-500';
  return 'bg-green-500';
}

/**
 * Get text color class based on usage percentage
 */
export function getUsageTextColor(percent: number): string {
  if (percent >= 90) return 'text-red-600 dark:text-red-400';
  if (percent >= 75) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-muted-foreground';
}
