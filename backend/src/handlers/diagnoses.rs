/*!
 * Visit Diagnosis HTTP Handlers
 *
 * Handles HTTP requests for visit diagnosis CRUD operations and ICD-10 search.
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
    models::{AuthUser, CreateVisitDiagnosisRequest, UpdateVisitDiagnosisRequest, UserRole},
    services::{ICD10SearchResult, VisitDiagnosisService},
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on diagnoses resource
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "diagnoses", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} diagnoses",
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
            // Only ADMIN can delete diagnoses
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete diagnoses".to_string(),
                ));
            }
        }
        _ => {
            // Both ADMIN and DOCTOR can read/write diagnoses
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden(
                    "Insufficient permissions".to_string(),
                ));
            }
        }
    }
    Ok(())
}

/// Query parameters for ICD-10 search
#[derive(Debug, Deserialize)]
pub struct ICD10SearchQuery {
    pub query: String,
    pub limit: Option<i64>,
}

/// Query parameters for patient diagnoses
#[derive(Debug, Deserialize)]
pub struct PatientDiagnosesQuery {
    pub active_only: Option<bool>,
}

/// Create a new diagnosis
///
/// POST /api/v1/diagnoses
///
/// **RBAC**: Requires 'create' permission on 'diagnoses' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_diagnosis(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateVisitDiagnosisRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "create").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Create diagnosis service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    let diagnosis = diagnosis_service
        .create_diagnosis(req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create diagnosis: {}", e);
            AppError::Internal(format!("Failed to create diagnosis: {}", e))
        })?;

    Ok((StatusCode::CREATED, Json(diagnosis)))
}

/// Get diagnosis by ID
///
/// GET /api/v1/diagnoses/:id
///
/// **RBAC**: Requires 'read' permission on 'diagnoses' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_diagnosis(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get diagnosis service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    let diagnosis = diagnosis_service
        .get_diagnosis(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get diagnosis {}: {}", id, e);
            AppError::Internal(format!("Failed to get diagnosis: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Diagnosis {} not found", id)))?;

    Ok(Json(diagnosis))
}

/// Get all diagnoses for a visit
///
/// GET /api/v1/visits/:visit_id/diagnoses
///
/// **RBAC**: Requires 'read' permission on 'diagnoses' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_visit_diagnoses(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(visit_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get diagnosis service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    let diagnoses = diagnosis_service
        .get_visit_diagnoses(visit_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get visit {} diagnoses: {}", visit_id, e);
            AppError::Internal(format!("Failed to get visit diagnoses: {}", e))
        })?;

    Ok(Json(diagnoses))
}

/// Get all diagnoses for a patient
///
/// GET /api/v1/patients/:patient_id/diagnoses?active_only=true
///
/// **RBAC**: Requires 'read' permission on 'diagnoses' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_patient_diagnoses(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(patient_id): Path<Uuid>,
    Query(query): Query<PatientDiagnosesQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get diagnosis service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    let diagnoses = diagnosis_service
        .get_patient_diagnoses(patient_id, query.active_only.unwrap_or(false))
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patient {} diagnoses: {}", patient_id, e);
            AppError::Internal(format!("Failed to get patient diagnoses: {}", e))
        })?;

    Ok(Json(diagnoses))
}

/// Update diagnosis
///
/// PUT /api/v1/diagnoses/:id
///
/// **RBAC**: Requires 'update' permission on 'diagnoses' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn update_diagnosis(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateVisitDiagnosisRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Update diagnosis service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    let diagnosis = diagnosis_service
        .update_diagnosis(id, req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update diagnosis {}: {}", id, e);
            AppError::Internal(format!("Failed to update diagnosis: {}", e))
        })?;

    Ok(Json(diagnosis))
}

/// Delete diagnosis
///
/// DELETE /api/v1/diagnoses/:id
///
/// **RBAC**: Requires 'delete' permission on 'diagnoses' resource
/// **Roles**: ADMIN only
pub async fn delete_diagnosis(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions (ADMIN only)
    check_permission(&state, &auth_user.role, "delete").await?;

    // Delete diagnosis service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    diagnosis_service
        .delete_diagnosis(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete diagnosis {}: {}", id, e);
            AppError::Internal(format!("Failed to delete diagnosis: {}", e))
        })?;

    Ok(StatusCode::NO_CONTENT)
}

/// Search ICD-10 codes
///
/// GET /api/v1/diagnoses/icd10/search?query=diabetes&limit=10
///
/// **RBAC**: Requires 'read' permission on 'diagnoses' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn search_icd10(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ICD10SearchQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Search ICD-10 codes service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let diagnosis_service = VisitDiagnosisService::new(state.pool.clone(), encryption_key.clone());
    let results = diagnosis_service
        .search_icd10(&query.query, query.limit.unwrap_or(20))
        .await
        .map_err(|e| {
            tracing::error!("Failed to search ICD-10: {}", e);
            AppError::Internal(format!("Failed to search ICD-10: {}", e))
        })?;

    Ok(Json(results))
}
