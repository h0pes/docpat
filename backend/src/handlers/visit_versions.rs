/*!
 * Visit Version History HTTP Handlers
 *
 * Handles HTTP requests for visit version history operations.
 */

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    handlers::auth::AppState,
    handlers::visits::AuthUser,
    models::UserRole,
    services::VisitService,
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on visit_versions resource
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "visits", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} visit versions",
            action
        )));
    }

    Ok(())
}

/// Fallback for non-RBAC builds - only checks role
#[cfg(not(feature = "rbac"))]
async fn check_permission(
    _state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    // Simple role-based check without Casbin
    // Both ADMIN and DOCTOR can access visit versions
    if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
        return Err(AppError::Forbidden(format!(
            "Insufficient permissions to {} visit versions",
            action
        )));
    }
    Ok(())
}

/// Get all versions for a visit
///
/// GET /api/v1/visits/:visit_id/versions
///
/// **RBAC**: Requires 'read' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn list_visit_versions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(visit_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let versions = visit_service
        .get_visit_versions(visit_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get visit versions for {}: {}", visit_id, e);
            AppError::Internal(format!("Failed to get visit versions: {}", e))
        })?;

    Ok(Json(versions))
}

/// Get a specific version of a visit
///
/// GET /api/v1/visits/:visit_id/versions/:version_number
///
/// **RBAC**: Requires 'read' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_visit_version(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path((visit_id, version_number)): Path<(Uuid, i32)>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let version = visit_service
        .get_visit_version(visit_id, version_number)
        .await
        .map_err(|e| {
            tracing::error!(
                "Failed to get visit version {} for {}: {}",
                version_number,
                visit_id,
                e
            );
            AppError::Internal(format!("Failed to get visit version: {}", e))
        })?
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "Version {} not found for visit {}",
                version_number, visit_id
            ))
        })?;

    Ok(Json(version))
}

/// Restore a visit to a previous version
///
/// POST /api/v1/visits/:visit_id/versions/:version_number/restore
///
/// **RBAC**: Requires 'update' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn restore_visit_version(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path((visit_id, version_number)): Path<(Uuid, i32)>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Get visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let restored_visit = visit_service
        .restore_visit_version(visit_id, version_number, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!(
                "Failed to restore visit {} to version {}: {}",
                visit_id,
                version_number,
                e
            );
            if e.to_string().contains("Cannot restore") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to restore visit version: {}", e))
            }
        })?;

    Ok((StatusCode::OK, Json(restored_visit)))
}
