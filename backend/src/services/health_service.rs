/*!
 * System Health Service
 *
 * Provides comprehensive system health monitoring, status reporting, and operational metrics.
 * Used for ADMIN-only system monitoring endpoints.
 *
 * Key features:
 * - Detailed health checks with component-level status
 * - System information (version, uptime, environment)
 * - Storage statistics (database, documents, disk)
 * - Backup status monitoring
 */

use crate::models::{
    ApplicationInfo, BackupInfo, BackupStatusFile, BackupStatusResponse, ComponentHealth,
    DatabaseInfo, DatabasePoolMetrics, DatabaseStorageStats, DetailedHealthResponse,
    EnvironmentInfo, FileSystemStats, HealthStatus, ServerInfo, StorageBreakdown,
    StorageStatsResponse, SystemInfoResponse, SystemResources, TableStorageInfo,
};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use std::path::Path;
use std::time::SystemTime;

/// Service for system health monitoring and status reporting
pub struct SystemHealthService;

impl SystemHealthService {
    /// Get detailed health status with component-level checks
    ///
    /// Checks:
    /// - Database connectivity and latency
    /// - Database pool status
    /// - System resources (memory, CPU, disk)
    ///
    /// # Arguments
    /// * `pool` - Database connection pool
    /// * `start_time` - Server start timestamp for uptime calculation
    ///
    /// # Returns
    /// * `DetailedHealthResponse` with overall status and component details
    pub async fn get_detailed_health(
        pool: &PgPool,
        start_time: SystemTime,
    ) -> DetailedHealthResponse {
        let mut components = Vec::new();
        let mut overall_status = HealthStatus::Healthy;

        // Check database health with latency measurement
        let db_health = Self::check_database_health(pool).await;
        if db_health.status == HealthStatus::Unhealthy {
            overall_status = HealthStatus::Unhealthy;
        } else if db_health.status == HealthStatus::Degraded && overall_status == HealthStatus::Healthy {
            overall_status = HealthStatus::Degraded;
        }
        components.push(db_health);

        // Get database pool metrics
        let pool_metrics = Self::get_pool_metrics(pool);

        // Check pool health based on available connections
        let pool_health = if pool_metrics.available == 0 && pool_metrics.size > 0 {
            ComponentHealth::degraded("connection_pool", "No available connections")
        } else {
            ComponentHealth::healthy("connection_pool").with_details(serde_json::json!({
                "size": pool_metrics.size,
                "available": pool_metrics.available,
                "in_use": pool_metrics.in_use
            }))
        };
        if pool_health.status == HealthStatus::Degraded && overall_status == HealthStatus::Healthy {
            overall_status = HealthStatus::Degraded;
        }
        components.push(pool_health);

        // Get system resources
        let system_resources = Self::get_system_resources();

        // Check disk usage health
        if let Some(ref resources) = system_resources {
            if let Some(disk_percent) = resources.disk_percent {
                let disk_health = if disk_percent > 95.0 {
                    overall_status = HealthStatus::Unhealthy;
                    ComponentHealth::unhealthy("disk", &format!("Disk usage critical: {:.1}%", disk_percent))
                } else if disk_percent > 85.0 {
                    if overall_status == HealthStatus::Healthy {
                        overall_status = HealthStatus::Degraded;
                    }
                    ComponentHealth::degraded("disk", &format!("Disk usage high: {:.1}%", disk_percent))
                } else {
                    ComponentHealth::healthy("disk").with_details(serde_json::json!({
                        "usage_percent": disk_percent
                    }))
                };
                components.push(disk_health);
            }
        }

        // Check memory usage health
        if let Some(ref resources) = system_resources {
            if let Some(memory_percent) = resources.memory_percent {
                let memory_health = if memory_percent > 95.0 {
                    if overall_status == HealthStatus::Healthy {
                        overall_status = HealthStatus::Degraded;
                    }
                    ComponentHealth::degraded("memory", &format!("Memory usage high: {:.1}%", memory_percent))
                } else {
                    ComponentHealth::healthy("memory").with_details(serde_json::json!({
                        "usage_percent": memory_percent
                    }))
                };
                components.push(memory_health);
            }
        }

        let uptime = start_time.elapsed().unwrap_or_default().as_secs();

        DetailedHealthResponse {
            status: overall_status,
            timestamp: Utc::now(),
            uptime_seconds: uptime,
            version: env!("CARGO_PKG_VERSION").to_string(),
            components,
            database_pool: Some(pool_metrics),
            system_resources,
        }
    }

    /// Check database health and measure query latency
    ///
    /// Executes a simple query and measures response time.
    /// Considers latency > 1000ms as degraded.
    async fn check_database_health(pool: &PgPool) -> ComponentHealth {
        let start = std::time::Instant::now();

        match sqlx::query("SELECT 1").execute(pool).await {
            Ok(_) => {
                let latency_ms = start.elapsed().as_millis() as i64;

                if latency_ms > 1000 {
                    ComponentHealth {
                        name: "database".to_string(),
                        status: HealthStatus::Degraded,
                        message: Some(format!("High latency: {}ms", latency_ms)),
                        latency_ms: Some(latency_ms),
                        details: None,
                    }
                } else {
                    ComponentHealth::healthy_with_latency("database", latency_ms)
                }
            }
            Err(e) => ComponentHealth::unhealthy("database", &format!("Connection failed: {}", e)),
        }
    }

    /// Get database connection pool metrics
    fn get_pool_metrics(pool: &PgPool) -> DatabasePoolMetrics {
        let size = pool.size();
        let idle = pool.num_idle();
        let max = pool.options().get_max_connections();

        DatabasePoolMetrics {
            size,
            available: idle as u32,
            in_use: size.saturating_sub(idle as u32),
            max_connections: max,
        }
    }

    /// Get system resource metrics (memory, CPU, disk)
    ///
    /// Uses /proc filesystem on Linux for memory info
    /// and statfs for disk space.
    fn get_system_resources() -> Option<SystemResources> {
        let mut resources = SystemResources {
            memory_used_mb: None,
            memory_total_mb: None,
            memory_percent: None,
            cpu_usage_percent: None,
            disk_used_gb: None,
            disk_total_gb: None,
            disk_percent: None,
        };

        // Get memory info from /proc/meminfo on Linux
        if let Ok(contents) = std::fs::read_to_string("/proc/meminfo") {
            let mut mem_total: Option<u64> = None;
            let mut mem_available: Option<u64> = None;

            for line in contents.lines() {
                if line.starts_with("MemTotal:") {
                    mem_total = line
                        .split_whitespace()
                        .nth(1)
                        .and_then(|v| v.parse::<u64>().ok());
                } else if line.starts_with("MemAvailable:") {
                    mem_available = line
                        .split_whitespace()
                        .nth(1)
                        .and_then(|v| v.parse::<u64>().ok());
                }
            }

            if let (Some(total), Some(available)) = (mem_total, mem_available) {
                // Values are in KB, convert to MB
                let total_mb = total / 1024;
                let used_mb = total_mb.saturating_sub(available / 1024);
                let percent = (used_mb as f64 / total_mb as f64) * 100.0;

                resources.memory_total_mb = Some(total_mb);
                resources.memory_used_mb = Some(used_mb);
                resources.memory_percent = Some(percent);
            }
        }

        // Get disk space using statvfs
        #[cfg(unix)]
        {
            use std::ffi::CString;
            use std::mem::MaybeUninit;

            let path = CString::new("/").unwrap();
            let mut stat = MaybeUninit::<libc::statvfs>::uninit();

            unsafe {
                if libc::statvfs(path.as_ptr(), stat.as_mut_ptr()) == 0 {
                    let stat = stat.assume_init();
                    let block_size = stat.f_frsize as u64;
                    let total_blocks = stat.f_blocks as u64;
                    let free_blocks = stat.f_bfree as u64;

                    let total_gb = (total_blocks * block_size) as f64 / (1024.0 * 1024.0 * 1024.0);
                    let free_gb = (free_blocks * block_size) as f64 / (1024.0 * 1024.0 * 1024.0);
                    let used_gb = total_gb - free_gb;
                    let percent = (used_gb / total_gb) * 100.0;

                    resources.disk_total_gb = Some(total_gb);
                    resources.disk_used_gb = Some(used_gb);
                    resources.disk_percent = Some(percent);
                }
            }
        }

        Some(resources)
    }

    /// Get comprehensive system information
    ///
    /// Returns application, server, database, and environment details.
    ///
    /// # Arguments
    /// * `pool` - Database connection pool
    /// * `start_time` - Server start timestamp
    /// * `environment` - Current environment (development/production)
    /// * `log_level` - Current log level setting
    pub async fn get_system_info(
        pool: &PgPool,
        start_time: SystemTime,
        environment: &str,
        log_level: &str,
    ) -> Result<SystemInfoResponse, sqlx::Error> {
        // Get database info
        let db_info = Self::get_database_info(pool).await?;

        // Get server info
        let uptime = start_time.elapsed().unwrap_or_default().as_secs();
        let started_at = DateTime::<Utc>::from(start_time);

        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let os = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH.to_string();

        // Get timezone
        let timezone = std::env::var("TZ").unwrap_or_else(|_| "UTC".to_string());

        // Check debug mode
        let debug_mode = cfg!(debug_assertions);

        Ok(SystemInfoResponse {
            application: ApplicationInfo {
                name: env!("CARGO_PKG_NAME").to_string(),
                version: env!("CARGO_PKG_VERSION").to_string(),
                rust_version: env!("CARGO_PKG_RUST_VERSION").to_string(),
                build_timestamp: option_env!("BUILD_TIMESTAMP").map(|s| s.to_string()),
                git_commit: option_env!("GIT_COMMIT").map(|s| s.to_string()),
            },
            server: ServerInfo {
                hostname,
                os,
                arch,
                uptime_seconds: uptime,
                started_at,
            },
            database: db_info,
            environment: EnvironmentInfo {
                environment: environment.to_string(),
                debug_mode,
                log_level: log_level.to_string(),
                timezone,
            },
        })
    }

    /// Get database information including version, name, and table count
    async fn get_database_info(pool: &PgPool) -> Result<DatabaseInfo, sqlx::Error> {
        // Get PostgreSQL version
        let version_row: (String,) = sqlx::query_as("SELECT version()")
            .fetch_one(pool)
            .await?;

        // Extract just the version number (e.g., "PostgreSQL 17.0" from full string)
        let version = version_row.0
            .split_whitespace()
            .take(2)
            .collect::<Vec<_>>()
            .join(" ");

        // Get current database name
        let db_name_row: (String,) = sqlx::query_as("SELECT current_database()")
            .fetch_one(pool)
            .await?;

        // Get total table count
        let table_count_row: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            "#
        )
        .fetch_one(pool)
        .await?;

        // Get last migration (if using SQLx migrations)
        let last_migration: Option<String> = sqlx::query_scalar(
            r#"
            SELECT description
            FROM _sqlx_migrations
            ORDER BY installed_on DESC
            LIMIT 1
            "#
        )
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

        // Get pool size
        let pool_size = pool.options().get_max_connections();

        Ok(DatabaseInfo {
            version,
            database_name: db_name_row.0,
            connection_pool_size: pool_size,
            last_migration,
            total_tables: table_count_row.0,
        })
    }

    /// Get storage statistics for database and file system
    ///
    /// Includes database size breakdown and disk usage.
    ///
    /// # Arguments
    /// * `pool` - Database connection pool
    /// * `data_dir` - Optional path to data directory for document storage stats
    pub async fn get_storage_stats(
        pool: &PgPool,
        data_dir: Option<&Path>,
    ) -> Result<StorageStatsResponse, sqlx::Error> {
        // Get database storage stats
        let db_stats = Self::get_database_storage_stats(pool).await?;

        // Get file system stats
        let fs_stats = Self::get_file_system_stats(data_dir);

        // Get table breakdown
        let breakdown = Self::get_storage_breakdown(pool).await?;

        Ok(StorageStatsResponse {
            database: db_stats,
            file_system: fs_stats,
            breakdown,
        })
    }

    /// Get database storage statistics
    async fn get_database_storage_stats(pool: &PgPool) -> Result<DatabaseStorageStats, sqlx::Error> {
        // Get total database size
        let db_size_row: (i64,) = sqlx::query_as(
            r#"
            SELECT pg_database_size(current_database())::bigint
            "#
        )
        .fetch_one(pool)
        .await?;

        // Get tables size (excluding indexes)
        let tables_size_row: (i64,) = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(pg_table_size(quote_ident(tablename)::regclass)), 0)::bigint
            FROM pg_tables
            WHERE schemaname = 'public'
            "#
        )
        .fetch_one(pool)
        .await?;

        // Get indexes size
        let indexes_size_row: (i64,) = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(pg_indexes_size(quote_ident(tablename)::regclass)), 0)::bigint
            FROM pg_tables
            WHERE schemaname = 'public'
            "#
        )
        .fetch_one(pool)
        .await?;

        // Get estimated total rows across all tables
        let estimated_rows_row: (i64,) = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(reltuples::bigint), 0)::bigint
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
            "#
        )
        .fetch_one(pool)
        .await?;

        let bytes_to_mb = |bytes: i64| bytes as f64 / (1024.0 * 1024.0);

        Ok(DatabaseStorageStats {
            total_size_mb: bytes_to_mb(db_size_row.0),
            tables_size_mb: bytes_to_mb(tables_size_row.0),
            indexes_size_mb: bytes_to_mb(indexes_size_row.0),
            estimated_rows: estimated_rows_row.0,
        })
    }

    /// Get file system statistics including disk usage
    fn get_file_system_stats(data_dir: Option<&Path>) -> FileSystemStats {
        let mut stats = FileSystemStats {
            documents_size_mb: 0.0,
            uploads_size_mb: 0.0,
            logs_size_mb: 0.0,
            available_disk_gb: 0.0,
            total_disk_gb: 0.0,
            disk_usage_percent: 0.0,
        };

        // Calculate directory sizes if data_dir is provided
        if let Some(base_path) = data_dir {
            stats.documents_size_mb = Self::get_dir_size_mb(&base_path.join("documents"));
            stats.uploads_size_mb = Self::get_dir_size_mb(&base_path.join("uploads"));
            stats.logs_size_mb = Self::get_dir_size_mb(&base_path.join("logs"));
        }

        // Get disk space
        #[cfg(unix)]
        {
            use std::ffi::CString;
            use std::mem::MaybeUninit;

            let path = CString::new("/").unwrap();
            let mut stat = MaybeUninit::<libc::statvfs>::uninit();

            unsafe {
                if libc::statvfs(path.as_ptr(), stat.as_mut_ptr()) == 0 {
                    let stat = stat.assume_init();
                    let block_size = stat.f_frsize as u64;
                    let total_blocks = stat.f_blocks as u64;
                    let available_blocks = stat.f_bavail as u64;

                    stats.total_disk_gb = (total_blocks * block_size) as f64 / (1024.0 * 1024.0 * 1024.0);
                    stats.available_disk_gb = (available_blocks * block_size) as f64 / (1024.0 * 1024.0 * 1024.0);
                    let used_gb = stats.total_disk_gb - stats.available_disk_gb;
                    stats.disk_usage_percent = (used_gb / stats.total_disk_gb) * 100.0;
                }
            }
        }

        stats
    }

    /// Calculate total size of a directory in MB
    fn get_dir_size_mb(path: &Path) -> f64 {
        if !path.exists() {
            return 0.0;
        }

        let mut total_size: u64 = 0;

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        total_size += metadata.len();
                    } else if metadata.is_dir() {
                        // Recursively calculate subdirectory size
                        total_size += (Self::get_dir_size_mb(&entry.path()) * 1024.0 * 1024.0) as u64;
                    }
                }
            }
        }

        total_size as f64 / (1024.0 * 1024.0)
    }

    /// Get storage breakdown by table
    async fn get_storage_breakdown(pool: &PgPool) -> Result<StorageBreakdown, sqlx::Error> {
        let rows: Vec<(String, i64, i64)> = sqlx::query_as(
            r#"
            SELECT
                c.relname::text as table_name,
                pg_total_relation_size(c.oid)::bigint as total_size,
                COALESCE(c.reltuples::bigint, 0)::bigint as row_count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
            ORDER BY pg_total_relation_size(c.oid) DESC
            LIMIT 20
            "#
        )
        .fetch_all(pool)
        .await?;

        let tables = rows
            .into_iter()
            .map(|(name, size, rows)| TableStorageInfo {
                table_name: name,
                size_mb: size as f64 / (1024.0 * 1024.0),
                row_count: rows,
            })
            .collect();

        Ok(StorageBreakdown { tables })
    }

    /// Get backup status from status file
    ///
    /// Reads the backup status marker file written by backup.sh script.
    ///
    /// # Arguments
    /// * `backup_dir` - Path to backup directory
    /// * `status_file_path` - Path to backup status JSON file
    pub fn get_backup_status(
        backup_dir: &Path,
        status_file_path: &Path,
    ) -> BackupStatusResponse {
        // Check if backups are enabled (status file exists or backup dir exists)
        let enabled = backup_dir.exists();

        let mut response = BackupStatusResponse {
            enabled,
            last_backup: None,
            next_scheduled: None,
            backup_location: backup_dir.to_string_lossy().to_string(),
            retention_days: 30, // Default value
        };

        // Try to read status file
        if status_file_path.exists() {
            if let Ok(contents) = std::fs::read_to_string(status_file_path) {
                if let Ok(status_file) = serde_json::from_str::<BackupStatusFile>(&contents) {
                    // Parse last backup info
                    if let Ok(timestamp) = DateTime::parse_from_rfc3339(&status_file.last_backup_timestamp) {
                        response.last_backup = Some(BackupInfo {
                            timestamp: timestamp.with_timezone(&Utc),
                            size_mb: status_file.last_backup_size_bytes as f64 / (1024.0 * 1024.0),
                            duration_seconds: status_file.last_backup_duration_seconds,
                            status: status_file.last_backup_status,
                            filename: status_file.last_backup_filename,
                        });
                    }

                    // Parse next scheduled time
                    if let Some(ref next_str) = status_file.next_scheduled {
                        if let Ok(next) = DateTime::parse_from_rfc3339(next_str) {
                            response.next_scheduled = Some(next.with_timezone(&Utc));
                        }
                    }
                }
            }
        }

        response
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_dir_size_empty() {
        let path = Path::new("/nonexistent/path");
        let size = SystemHealthService::get_dir_size_mb(path);
        assert_eq!(size, 0.0);
    }

    #[test]
    fn test_backup_status_disabled() {
        let backup_dir = Path::new("/nonexistent/backup");
        let status_file = Path::new("/nonexistent/status.json");

        let status = SystemHealthService::get_backup_status(backup_dir, status_file);

        assert!(!status.enabled);
        assert!(status.last_backup.is_none());
        assert!(status.next_scheduled.is_none());
    }

    #[test]
    fn test_health_status_enum() {
        assert_eq!(HealthStatus::Healthy.to_string(), "healthy");
        assert_eq!(HealthStatus::Degraded.to_string(), "degraded");
        assert_eq!(HealthStatus::Unhealthy.to_string(), "unhealthy");
    }
}
