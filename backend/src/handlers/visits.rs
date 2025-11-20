/*!
 * Visit Management HTTP Handlers
 *
 * Handles HTTP requests for clinical visit documentation CRUD operations,
 * status workflow transitions (sign/lock), and patient visit history.
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::{
    handlers::auth::AppState,
    models::{CreateVisitRequest, UpdateVisitRequest, UserRole, VisitResponse, VisitStatus, VisitType},
    services::{VisitSearchFilter, VisitService},
    utils::{AppError, Result},
};
use serde::Serialize;

#[cfg(feature = "rbac")]
use tracing::warn;

/// Response structure for paginated visit lists
#[derive(Debug, Serialize)]
pub struct ListVisitsResponse {
    pub visits: Vec<VisitResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Check if user has permission to perform action on visits resource
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
            "User does not have permission to {} visits",
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
    match action {
        "delete" => {
            // Only ADMIN can delete visits
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete visits".to_string(),
                ));
            }
        }
        _ => {
            // Both ADMIN and DOCTOR can read/write visits
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden(
                    "Insufficient permissions".to_string(),
                ));
            }
        }
    }
    Ok(())
}

/// Query parameters for listing visits
#[derive(Debug, Deserialize)]
pub struct ListVisitsQuery {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub visit_type: Option<VisitType>,
    pub status: Option<VisitStatus>,
    pub date_from: Option<String>, // ISO date string
    pub date_to: Option<String>,   // ISO date string
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Query parameters for patient visits
#[derive(Debug, Deserialize)]
pub struct PatientVisitsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// User information from auth middleware (kept for compatibility with other handlers)
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub role: UserRole,
}

/// Create a new visit
///
/// POST /api/v1/visits
///
/// **RBAC**: Requires 'create' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_visit(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Json(req): Json<CreateVisitRequest>,
) -> Result<impl IntoResponse> {
    tracing::info!("Creating visit by user: {} (role: {:?})", user_id, user_role);

    // Check permissions
    check_permission(&state, &user_role, "create").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Create visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());

    // Create visit (service handles transaction and RLS internally)
    let visit = visit_service
        .create_visit(req, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create visit: {}", e);
            AppError::Internal(format!("Failed to create visit: {}", e))
        })?;

    tracing::info!("Visit created: {}", visit.id);

    Ok((StatusCode::CREATED, Json(visit)))
}

/// Get visit by ID
///
/// GET /api/v1/visits/:id
///
/// **RBAC**: Requires 'read' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_visit(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"read").await?;

    // Get visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let visit = visit_service
        .get_visit(id, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get visit {}: {}", id, e);
            AppError::Internal(format!("Failed to get visit: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Visit {} not found", id)))?;

    Ok(Json(visit))
}

/// Update visit (only DRAFT visits can be updated)
///
/// PUT /api/v1/visits/:id
///
/// **RBAC**: Requires 'update' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
/// **Business Rule**: Only DRAFT visits can be edited
pub async fn update_visit(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateVisitRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Update visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let visit = visit_service
        .update_visit(id, req, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update visit {}: {}", id, e);
            // Check if error is about locked/signed status
            if e.to_string().contains("Cannot edit visit") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to update visit: {}", e))
            }
        })?;

    Ok(Json(visit))
}

/// Delete visit (only DRAFT visits can be deleted)
///
/// DELETE /api/v1/visits/:id
///
/// **RBAC**: Requires 'delete' permission on 'visits' resource
/// **Roles**: ADMIN only
/// **Business Rule**: Only DRAFT visits can be deleted
pub async fn delete_visit(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions (ADMIN only)
    check_permission(&state, &user_role,"delete").await?;

    // Delete visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    visit_service
        .delete_visit(id, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete visit {}: {}", id, e);
            if e.to_string().contains("cannot be deleted") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to delete visit: {}", e))
            }
        })?;

    Ok(StatusCode::NO_CONTENT)
}

/// List visits with filtering and pagination
///
/// GET /api/v1/visits?patient_id=...&status=...&limit=20&offset=0
///
/// **RBAC**: Requires 'read' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn list_visits(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ListVisitsQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"read").await?;

    // Parse date strings if provided
    let date_from = query
        .date_from
        .as_ref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    let date_to = query
        .date_to
        .as_ref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Build filter
    let filter = VisitSearchFilter {
        patient_id: query.patient_id,
        provider_id: query.provider_id,
        visit_type: query.visit_type,
        status: query.status,
        date_from,
        date_to,
        limit: query.limit,
        offset: query.offset,
    };

    // List visits service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());

    // Get visits and total count
    let visits = visit_service
        .list_visits(filter.clone(), user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to list visits: {}", e);
            AppError::Internal(format!("Failed to list visits: {}", e))
        })?;

    let total = visit_service
        .count_visits(filter.clone(), user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count visits: {}", e);
            AppError::Internal(format!("Failed to count visits: {}", e))
        })?;

    // Extract limit and offset
    let limit = filter.limit.unwrap_or(20).min(100);
    let offset = filter.offset.unwrap_or(0);

    // Return paginated response
    let response = ListVisitsResponse {
        visits,
        total,
        limit,
        offset,
    };

    Ok(Json(response))
}

/// Get all visits for a specific patient
///
/// GET /api/v1/patients/:patient_id/visits?limit=50&offset=0
///
/// **RBAC**: Requires 'read' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_patient_visits(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(patient_id): Path<Uuid>,
    Query(query): Query<PatientVisitsQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"read").await?;

    // Get patient visits service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());

    // Get visits and count
    let visits = visit_service
        .get_patient_visits(patient_id, user_id, query.limit, query.offset)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patient {} visits: {}", patient_id, e);
            AppError::Internal(format!("Failed to get patient visits: {}", e))
        })?;

    // Count visits for this patient
    let filter = VisitSearchFilter {
        patient_id: Some(patient_id),
        provider_id: None,
        visit_type: None,
        status: None,
        date_from: None,
        date_to: None,
        limit: None,
        offset: None,
    };

    let total = visit_service
        .count_visits(filter, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count patient {} visits: {}", patient_id, e);
            AppError::Internal(format!("Failed to count patient visits: {}", e))
        })?;

    // Extract limit and offset
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    // Return paginated response
    let response = ListVisitsResponse {
        visits,
        total,
        limit,
        offset,
    };

    Ok(Json(response))
}

/// Sign a visit (transition DRAFT → SIGNED)
///
/// POST /api/v1/visits/:id/sign
///
/// **RBAC**: Requires 'update' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR (must be the provider or have override permission)
/// **Business Rule**: Only DRAFT visits can be signed
pub async fn sign_visit(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"update").await?;

    // Sign visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let visit = visit_service
        .sign_visit(id, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to sign visit {}: {}", id, e);
            if e.to_string().contains("Cannot sign visit") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to sign visit: {}", e))
            }
        })?;

    Ok(Json(visit))
}

/// Lock a visit (transition SIGNED → LOCKED)
///
/// POST /api/v1/visits/:id/lock
///
/// **RBAC**: Requires 'update' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
/// **Business Rule**: Only SIGNED visits can be locked
pub async fn lock_visit(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"update").await?;

    // Lock visit service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let visit = visit_service
        .lock_visit(id, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to lock visit {}: {}", id, e);
            if e.to_string().contains("Cannot lock visit") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to lock visit: {}", e))
            }
        })?;

    Ok(Json(visit))
}

/// Get visit statistics
///
/// GET /api/v1/visits/statistics
///
/// **RBAC**: Requires 'read' permission on 'visits' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_visit_statistics(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &user_role,"read").await?;

    // Get statistics service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let visit_service = VisitService::new(state.pool.clone(), encryption_key.clone());
    let stats = visit_service.get_visit_statistics(user_id).await.map_err(|e| {
        tracing::error!("Failed to get visit statistics: {}", e);
        AppError::Internal(format!("Failed to get visit statistics: {}", e))
    })?;

    Ok(Json(stats))
}
