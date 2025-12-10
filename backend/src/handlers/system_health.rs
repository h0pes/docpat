/*!
 * System Health Handlers
 *
 * HTTP handlers for system health monitoring and status reporting.
 * All endpoints require ADMIN role (enforced via RBAC).
 *
 * Endpoints:
 * - GET /api/v1/system/health/detailed - Comprehensive health check
 * - GET /api/v1/system/info - System information
 * - GET /api/v1/system/storage - Storage statistics
 * - GET /api/v1/system/backup-status - Backup status
 */

use axum::{extract::State, http::StatusCode, Extension, Json};
use std::path::Path;

use crate::{
    handlers::auth::AppState,
    models::{
        BackupStatusResponse, DetailedHealthResponse, StorageStatsResponse, SystemInfoResponse,
        UserRole,
    },
    services::SystemHealthService,
};

#[cfg(feature = "rbac")]
use crate::utils::permissions::check_permission;

/// Get detailed system health status
///
/// GET /api/v1/system/health/detailed
///
/// Returns comprehensive health check with component-level details:
/// - Overall status (healthy/degraded/unhealthy)
/// - Database health with latency
/// - Connection pool metrics
/// - System resources (memory, CPU, disk)
/// - Server uptime
///
/// This endpoint requires ADMIN role.
pub async fn get_detailed_health(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
) -> Result<Json<DetailedHealthResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check RBAC permission
    #[cfg(feature = "rbac")]
    check_permission(&state.enforcer, &user_role, "system", "read").await?;

    let response = SystemHealthService::get_detailed_health(
        &state.pool,
        state.start_time,
    )
    .await;

    Ok(Json(response))
}

/// Get system information
///
/// GET /api/v1/system/info
///
/// Returns comprehensive system information:
/// - Application info (name, version, rust version, build info)
/// - Server info (hostname, OS, architecture, uptime)
/// - Database info (version, database name, pool size, tables count)
/// - Environment info (environment, debug mode, log level, timezone)
///
/// This endpoint requires ADMIN role.
pub async fn get_system_info(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
) -> Result<Json<SystemInfoResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check RBAC permission
    #[cfg(feature = "rbac")]
    check_permission(&state.enforcer, &user_role, "system", "read").await?;

    // Get log level from environment
    let log_level = std::env::var("RUST_LOG")
        .unwrap_or_else(|_| "info".to_string());

    match SystemHealthService::get_system_info(
        &state.pool,
        state.start_time,
        &state.environment,
        &log_level,
    )
    .await
    {
        Ok(info) => Ok(Json(info)),
        Err(e) => {
            tracing::error!("Failed to get system info: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to get system info",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Get storage statistics
///
/// GET /api/v1/system/storage
///
/// Returns storage statistics:
/// - Database size breakdown (tables, indexes, total)
/// - File system stats (documents, uploads, logs)
/// - Disk usage (total, available, percentage)
/// - Table-by-table breakdown (top 20 by size)
///
/// This endpoint requires ADMIN role.
pub async fn get_storage_stats(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
) -> Result<Json<StorageStatsResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check RBAC permission
    #[cfg(feature = "rbac")]
    check_permission(&state.enforcer, &user_role, "system", "read").await?;

    // Get data directory from environment or use default
    let data_dir = std::env::var("DATA_DIR")
        .map(|s| Some(std::path::PathBuf::from(s)))
        .unwrap_or(None);

    match SystemHealthService::get_storage_stats(
        &state.pool,
        data_dir.as_deref(),
    )
    .await
    {
        Ok(stats) => Ok(Json(stats)),
        Err(e) => {
            tracing::error!("Failed to get storage stats: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to get storage stats",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Get backup status
///
/// GET /api/v1/system/backup-status
///
/// Returns backup status information:
/// - Whether backups are enabled
/// - Last backup details (timestamp, size, duration, status)
/// - Next scheduled backup time
/// - Backup location
/// - Retention days setting
///
/// This endpoint requires ADMIN role.
pub async fn get_backup_status(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
) -> Result<Json<BackupStatusResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check RBAC permission
    #[cfg(feature = "rbac")]
    check_permission(&state.enforcer, &user_role, "system", "read").await?;

    // Get backup directory and status file paths from environment
    let backup_dir = std::env::var("BACKUP_DIR")
        .unwrap_or_else(|_| "/var/backups/docpat".to_string());
    let status_file = std::env::var("BACKUP_STATUS_FILE")
        .unwrap_or_else(|_| format!("{}/status.json", backup_dir));

    let response = SystemHealthService::get_backup_status(
        Path::new(&backup_dir),
        Path::new(&status_file),
    );

    Ok(Json(response))
}
