/*!
 * Audit Logs Handlers
 *
 * HTTP handlers for querying and exporting audit logs.
 * All endpoints require ADMIN role (enforced via RBAC).
 *
 * Endpoints:
 * - GET /api/v1/audit-logs - List logs with pagination and filters
 * - GET /api/v1/audit-logs/:id - Get single log entry
 * - GET /api/v1/audit-logs/statistics - Summary statistics
 * - GET /api/v1/audit-logs/user/:user_id/activity - User activity summary
 * - GET /api/v1/audit-logs/export - Export logs to CSV/JSON
 */

use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::{
    handlers::auth::AppState,
    models::audit_log::{
        AuditAction, AuditLogResponse, AuditLogStatistics, AuditLogsFilter,
        EntityType, ExportAuditLogsRequest, ExportFormat, ListAuditLogsResponse,
        UserActivitySummary,
    },
    services::AuditLogService,
};

/// List audit logs with pagination and filters
///
/// GET /api/v1/audit-logs
///
/// Query parameters:
/// - user_id: Filter by user ID (UUID)
/// - action: Filter by action type (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, SEARCH, EXPORT)
/// - entity_type: Filter by entity type (PATIENT, VISIT, PRESCRIPTION, etc.)
/// - entity_id: Filter by specific entity ID
/// - date_from: Filter logs from this date (YYYY-MM-DD)
/// - date_to: Filter logs until this date (YYYY-MM-DD)
/// - ip_address: Filter by IP address (partial match)
/// - page: Page number (default: 1)
/// - page_size: Items per page (default: 50, max: 100)
///
/// Returns: ListAuditLogsResponse with paginated logs
pub async fn list_audit_logs(
    State(state): State<AppState>,
    Query(filter): Query<AuditLogsFilter>,
) -> Result<Json<ListAuditLogsResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = AuditLogService::new(state.pool.clone());

    match service.list_logs(filter).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Failed to list audit logs: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to list audit logs",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Get a single audit log entry by ID
///
/// GET /api/v1/audit-logs/:id
///
/// Returns: AuditLogResponse or 404 if not found
pub async fn get_audit_log(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<AuditLogResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = AuditLogService::new(state.pool.clone());

    match service.get_log(id).await {
        Ok(Some(log)) => Ok(Json(log)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Not found",
                "message": format!("Audit log with id {} not found", id)
            })),
        )),
        Err(e) => {
            tracing::error!("Failed to get audit log {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to get audit log",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Get audit log statistics
///
/// GET /api/v1/audit-logs/statistics
///
/// Returns summary statistics including:
/// - Total log count
/// - Logs today/this week/this month
/// - Actions breakdown
/// - Entity types breakdown
/// - Top active users (last 30 days)
pub async fn get_statistics(
    State(state): State<AppState>,
) -> Result<Json<AuditLogStatistics>, (StatusCode, Json<serde_json::Value>)> {
    let service = AuditLogService::new(state.pool.clone());

    match service.get_statistics().await {
        Ok(stats) => Ok(Json(stats)),
        Err(e) => {
            tracing::error!("Failed to get audit log statistics: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to get statistics",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Get user activity summary
///
/// GET /api/v1/audit-logs/user/:user_id/activity
///
/// Returns activity summary for a specific user including:
/// - Total actions count
/// - First/last activity timestamps
/// - Actions breakdown
/// - Recent activity logs (last 20)
pub async fn get_user_activity(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserActivitySummary>, (StatusCode, Json<serde_json::Value>)> {
    let service = AuditLogService::new(state.pool.clone());

    match service.get_user_activity(user_id).await {
        Ok(Some(summary)) => Ok(Json(summary)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Not found",
                "message": format!("No activity found for user {}", user_id)
            })),
        )),
        Err(e) => {
            tracing::error!("Failed to get user activity for {}: {}", user_id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to get user activity",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Export audit logs to CSV or JSON
///
/// GET /api/v1/audit-logs/export
///
/// Query parameters:
/// - All filter parameters from list endpoint
/// - format: Export format (csv or json, default: csv)
/// - limit: Maximum records to export (default: 10000, max: 50000)
///
/// Returns: File download (CSV or JSON format)
pub async fn export_audit_logs(
    State(state): State<AppState>,
    Query(request): Query<ExportAuditLogsRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let service = AuditLogService::new(state.pool.clone());

    let format = request.format.clone();

    match service.export_logs(request).await {
        Ok(logs) => {
            match format {
                ExportFormat::Csv => {
                    let csv_content = AuditLogService::generate_csv(&logs);
                    let filename = format!(
                        "audit_logs_export_{}.csv",
                        chrono::Utc::now().format("%Y%m%d_%H%M%S")
                    );

                    Ok((
                        [
                            (header::CONTENT_TYPE, "text/csv; charset=utf-8"),
                            (
                                header::CONTENT_DISPOSITION,
                                &format!("attachment; filename=\"{}\"", filename),
                            ),
                        ],
                        csv_content,
                    )
                        .into_response())
                }
                ExportFormat::Json => {
                    let json_content = serde_json::to_string_pretty(&logs).unwrap_or_default();
                    let filename = format!(
                        "audit_logs_export_{}.json",
                        chrono::Utc::now().format("%Y%m%d_%H%M%S")
                    );

                    Ok((
                        [
                            (header::CONTENT_TYPE, "application/json; charset=utf-8"),
                            (
                                header::CONTENT_DISPOSITION,
                                &format!("attachment; filename=\"{}\"", filename),
                            ),
                        ],
                        json_content,
                    )
                        .into_response())
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to export audit logs: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to export audit logs",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

/// Get available filter options (action types and entity types)
///
/// GET /api/v1/audit-logs/filter-options
///
/// Returns available action types and entity types for filtering
pub async fn get_filter_options() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "actions": AuditAction::all(),
        "entity_types": EntityType::all()
    }))
}
