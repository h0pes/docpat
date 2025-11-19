/*!
 * Prescription HTTP Handlers
 *
 * Handles HTTP requests for prescription CRUD operations, medication search, and discontinuation.
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
    handlers::visits::AuthUser,
    models::{CreatePrescriptionRequest, UpdatePrescriptionRequest, UserRole},
    services::{MedicationSearchResult, PrescriptionService},
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on prescriptions resource
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "prescriptions", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} prescriptions",
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
            // Only ADMIN can delete prescriptions
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete prescriptions".to_string(),
                ));
            }
        }
        _ => {
            // Both ADMIN and DOCTOR can read/write prescriptions
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden(
                    "Insufficient permissions".to_string(),
                ));
            }
        }
    }
    Ok(())
}

/// Query parameters for medication search
#[derive(Debug, Deserialize)]
pub struct MedicationSearchQuery {
    pub query: String,
    pub limit: Option<i64>,
}

/// Query parameters for patient prescriptions
#[derive(Debug, Deserialize)]
pub struct PatientPrescriptionsQuery {
    pub active_only: Option<bool>,
}

/// Request body for discontinuing a prescription
#[derive(Debug, Deserialize, Validate)]
pub struct DiscontinuePrescriptionRequest {
    #[validate(length(min = 1, max = 500, message = "Reason must be 1-500 characters"))]
    pub reason: String,
}

/// Create a new prescription
///
/// POST /api/v1/prescriptions
///
/// **RBAC**: Requires 'create' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreatePrescriptionRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "create").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Create prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .create_prescription(req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create prescription: {}", e);
            AppError::Internal(format!("Failed to create prescription: {}", e))
        })?;

    Ok((StatusCode::CREATED, Json(prescription)))
}

/// Get prescription by ID
///
/// GET /api/v1/prescriptions/:id
///
/// **RBAC**: Requires 'read' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .get_prescription(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get prescription {}: {}", id, e);
            AppError::Internal(format!("Failed to get prescription: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Prescription {} not found", id)))?;

    Ok(Json(prescription))
}

/// Get all prescriptions for a patient
///
/// GET /api/v1/patients/:patient_id/prescriptions?active_only=true
///
/// **RBAC**: Requires 'read' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_patient_prescriptions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(patient_id): Path<Uuid>,
    Query(query): Query<PatientPrescriptionsQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescriptions = prescription_service
        .get_patient_prescriptions(patient_id, query.active_only.unwrap_or(false))
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patient {} prescriptions: {}", patient_id, e);
            AppError::Internal(format!("Failed to get patient prescriptions: {}", e))
        })?;

    Ok(Json(prescriptions))
}

/// Get all prescriptions for a visit
///
/// GET /api/v1/visits/:visit_id/prescriptions
///
/// **RBAC**: Requires 'read' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_visit_prescriptions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(visit_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescriptions = prescription_service
        .get_visit_prescriptions(visit_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get visit {} prescriptions: {}", visit_id, e);
            AppError::Internal(format!("Failed to get visit prescriptions: {}", e))
        })?;

    Ok(Json(prescriptions))
}

/// Update prescription
///
/// PUT /api/v1/prescriptions/:id
///
/// **RBAC**: Requires 'update' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn update_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePrescriptionRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Update prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .update_prescription(id, req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update prescription {}: {}", id, e);
            AppError::Internal(format!("Failed to update prescription: {}", e))
        })?;

    Ok(Json(prescription))
}

/// Discontinue prescription
///
/// POST /api/v1/prescriptions/:id/discontinue
///
/// **RBAC**: Requires 'update' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn discontinue_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<DiscontinuePrescriptionRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Discontinue prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .discontinue_prescription(id, req.reason, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to discontinue prescription {}: {}", id, e);
            if e.to_string().contains("Cannot discontinue") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to discontinue prescription: {}", e))
            }
        })?;

    Ok(Json(prescription))
}

/// Delete prescription
///
/// DELETE /api/v1/prescriptions/:id
///
/// **RBAC**: Requires 'delete' permission on 'prescriptions' resource
/// **Roles**: ADMIN only
pub async fn delete_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions (ADMIN only)
    check_permission(&state, &auth_user.role, "delete").await?;

    // Delete prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    prescription_service
        .delete_prescription(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete prescription {}: {}", id, e);
            AppError::Internal(format!("Failed to delete prescription: {}", e))
        })?;

    Ok(StatusCode::NO_CONTENT)
}

/// Search medications
///
/// GET /api/v1/prescriptions/medications/search?query=lisinopril&limit=10
///
/// **RBAC**: Requires 'read' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn search_medications(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<MedicationSearchQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Search medications service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let results = prescription_service
        .search_medications(&query.query, query.limit.unwrap_or(20))
        .await
        .map_err(|e| {
            tracing::error!("Failed to search medications: {}", e);
            AppError::Internal(format!("Failed to search medications: {}", e))
        })?;

    Ok(Json(results))
}
