/*!
 * System Health Model
 *
 * Data models for system health monitoring, status reporting, and operational metrics.
 * Used for ADMIN-only system monitoring endpoints.
 *
 * Key features:
 * - Comprehensive health status with component-level details
 * - System information (version, uptime, environment)
 * - Storage statistics (database, documents, disk)
 * - Backup status tracking
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ============================================================================
// Health Check Models
// ============================================================================

/// Overall health status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

impl std::fmt::Display for HealthStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Healthy => write!(f, "healthy"),
            Self::Degraded => write!(f, "degraded"),
            Self::Unhealthy => write!(f, "unhealthy"),
        }
    }
}

/// Component health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentHealth {
    pub name: String,
    pub status: HealthStatus,
    pub message: Option<String>,
    pub latency_ms: Option<i64>,
    pub details: Option<serde_json::Value>,
}

impl ComponentHealth {
    /// Create a healthy component status
    pub fn healthy(name: &str) -> Self {
        Self {
            name: name.to_string(),
            status: HealthStatus::Healthy,
            message: None,
            latency_ms: None,
            details: None,
        }
    }

    /// Create a healthy component status with latency
    pub fn healthy_with_latency(name: &str, latency_ms: i64) -> Self {
        Self {
            name: name.to_string(),
            status: HealthStatus::Healthy,
            message: None,
            latency_ms: Some(latency_ms),
            details: None,
        }
    }

    /// Create an unhealthy component status
    pub fn unhealthy(name: &str, message: &str) -> Self {
        Self {
            name: name.to_string(),
            status: HealthStatus::Unhealthy,
            message: Some(message.to_string()),
            latency_ms: None,
            details: None,
        }
    }

    /// Create a degraded component status
    pub fn degraded(name: &str, message: &str) -> Self {
        Self {
            name: name.to_string(),
            status: HealthStatus::Degraded,
            message: Some(message.to_string()),
            latency_ms: None,
            details: None,
        }
    }

    /// Add details to the component health
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}

/// Database pool metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabasePoolMetrics {
    pub size: u32,
    pub available: u32,
    pub in_use: u32,
    pub max_connections: u32,
}

/// Detailed health check response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedHealthResponse {
    pub status: HealthStatus,
    pub timestamp: DateTime<Utc>,
    pub uptime_seconds: u64,
    pub version: String,
    pub components: Vec<ComponentHealth>,
    pub database_pool: Option<DatabasePoolMetrics>,
    pub system_resources: Option<SystemResources>,
}

/// System resource metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResources {
    pub memory_used_mb: Option<u64>,
    pub memory_total_mb: Option<u64>,
    pub memory_percent: Option<f64>,
    pub cpu_usage_percent: Option<f64>,
    pub disk_used_gb: Option<f64>,
    pub disk_total_gb: Option<f64>,
    pub disk_percent: Option<f64>,
}

// ============================================================================
// System Information Models
// ============================================================================

/// System information response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfoResponse {
    pub application: ApplicationInfo,
    pub server: ServerInfo,
    pub database: DatabaseInfo,
    pub environment: EnvironmentInfo,
}

/// Application version information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationInfo {
    pub name: String,
    pub version: String,
    pub rust_version: String,
    pub build_timestamp: Option<String>,
    pub git_commit: Option<String>,
}

/// Server information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub hostname: String,
    pub os: String,
    pub arch: String,
    pub uptime_seconds: u64,
    pub started_at: DateTime<Utc>,
}

/// Database information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub version: String,
    pub database_name: String,
    pub connection_pool_size: u32,
    pub last_migration: Option<String>,
    pub total_tables: i64,
}

/// Environment information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentInfo {
    pub environment: String,
    pub debug_mode: bool,
    pub log_level: String,
    pub timezone: String,
}

// ============================================================================
// Storage Statistics Models
// ============================================================================

/// Storage statistics response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageStatsResponse {
    pub database: DatabaseStorageStats,
    pub file_system: FileSystemStats,
    pub breakdown: StorageBreakdown,
}

/// Database storage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStorageStats {
    pub total_size_mb: f64,
    pub tables_size_mb: f64,
    pub indexes_size_mb: f64,
    pub estimated_rows: i64,
}

/// File system storage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSystemStats {
    pub documents_size_mb: f64,
    pub uploads_size_mb: f64,
    pub logs_size_mb: f64,
    pub available_disk_gb: f64,
    pub total_disk_gb: f64,
    pub disk_usage_percent: f64,
}

/// Storage breakdown by table/category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageBreakdown {
    pub tables: Vec<TableStorageInfo>,
}

/// Individual table storage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableStorageInfo {
    pub table_name: String,
    pub size_mb: f64,
    pub row_count: i64,
}

// ============================================================================
// Backup Status Models
// ============================================================================

/// Backup status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupStatusResponse {
    pub enabled: bool,
    pub last_backup: Option<BackupInfo>,
    pub next_scheduled: Option<DateTime<Utc>>,
    pub backup_location: String,
    pub retention_days: i32,
}

/// Individual backup information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub timestamp: DateTime<Utc>,
    pub size_mb: f64,
    pub duration_seconds: i64,
    pub status: String,
    pub filename: String,
}

/// Backup status file structure (written by backup.sh)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupStatusFile {
    pub last_backup_timestamp: String,
    pub last_backup_size_bytes: i64,
    pub last_backup_duration_seconds: i64,
    pub last_backup_status: String,
    pub last_backup_filename: String,
    pub next_scheduled: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_status_display() {
        assert_eq!(HealthStatus::Healthy.to_string(), "healthy");
        assert_eq!(HealthStatus::Degraded.to_string(), "degraded");
        assert_eq!(HealthStatus::Unhealthy.to_string(), "unhealthy");
    }

    #[test]
    fn test_component_health_healthy() {
        let component = ComponentHealth::healthy("database");
        assert_eq!(component.status, HealthStatus::Healthy);
        assert!(component.message.is_none());
    }

    #[test]
    fn test_component_health_unhealthy() {
        let component = ComponentHealth::unhealthy("redis", "Connection refused");
        assert_eq!(component.status, HealthStatus::Unhealthy);
        assert_eq!(component.message, Some("Connection refused".to_string()));
    }

    #[test]
    fn test_component_health_with_details() {
        let component = ComponentHealth::healthy("database")
            .with_details(serde_json::json!({"pool_size": 10}));
        assert!(component.details.is_some());
    }

    #[test]
    fn test_health_status_serialization() {
        let status = HealthStatus::Healthy;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"healthy\"");

        let deserialized: HealthStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, HealthStatus::Healthy);
    }
}
