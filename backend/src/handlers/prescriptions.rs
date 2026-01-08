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
    models::{
        AuditAction, AuditLog, AuthUser, CreateAuditLog, CreatePrescriptionRequest,
        EntityType, RequestContext, UpdatePrescriptionRequest, UserRole,
    },
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

/// Request body for creating a custom medication
#[derive(Debug, Deserialize, Validate)]
pub struct CreateCustomMedicationRequest {
    #[validate(length(min = 2, message = "Medication name must be at least 2 characters"))]
    pub name: String,
    pub generic_name: Option<String>,
    pub form: Option<String>,
    pub dosage_strength: Option<String>,
    pub route: Option<String>,
    #[serde(default)]
    pub common_dosages: Vec<String>,
    pub notes: Option<String>,
}

/// Response for created custom medication
#[derive(Debug, serde::Serialize)]
pub struct CreateCustomMedicationResponse {
    pub id: Uuid,
    pub message: String,
}

/// Query parameters for listing prescriptions
#[derive(Debug, Deserialize)]
pub struct ListPrescriptionsQuery {
    /// Filter by prescription status
    pub status: Option<String>,
    /// Filter by patient ID
    pub patient_id: Option<Uuid>,
    /// Filter prescriptions from this date (inclusive, YYYY-MM-DD)
    pub start_date: Option<String>,
    /// Filter prescriptions until this date (inclusive, YYYY-MM-DD)
    pub end_date: Option<String>,
    /// Maximum number of results (default 50, max 100)
    pub limit: Option<i64>,
    /// Pagination offset (default 0)
    pub offset: Option<i64>,
}

/// Response structure for paginated prescription list
#[derive(Debug, serde::Serialize)]
pub struct PrescriptionListResponse {
    pub prescriptions: Vec<crate::models::PrescriptionResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
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

/// List prescriptions with optional filters
///
/// GET /api/v1/prescriptions?status=ACTIVE&patient_id=uuid&limit=50&offset=0
///
/// **RBAC**: Requires 'read' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn list_prescriptions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListPrescriptionsQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Parse status filter if provided
    let status = query
        .status
        .as_ref()
        .map(|s| {
            use crate::models::PrescriptionStatus;
            match s.to_uppercase().as_str() {
                "ACTIVE" => Ok(PrescriptionStatus::Active),
                "COMPLETED" => Ok(PrescriptionStatus::Completed),
                "CANCELLED" => Ok(PrescriptionStatus::Cancelled),
                "DISCONTINUED" => Ok(PrescriptionStatus::Discontinued),
                "ON_HOLD" => Ok(PrescriptionStatus::OnHold),
                _ => Err(AppError::BadRequest(format!("Invalid status: {}", s))),
            }
        })
        .transpose()?;

    // Parse date filters
    let start_date = query
        .start_date
        .as_ref()
        .map(|s| {
            chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                .map_err(|_| AppError::BadRequest(format!("Invalid start_date format: {}", s)))
        })
        .transpose()?;

    let end_date = query
        .end_date
        .as_ref()
        .map(|s| {
            chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                .map_err(|_| AppError::BadRequest(format!("Invalid end_date format: {}", s)))
        })
        .transpose()?;

    // Validate and set defaults for pagination
    let limit = query.limit.unwrap_or(50).min(100).max(1);
    let offset = query.offset.unwrap_or(0).max(0);

    // Get prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let (prescriptions, total) = prescription_service
        .list_prescriptions(
            status,
            query.patient_id,
            start_date,
            end_date,
            limit,
            offset,
            auth_user.user_id,
            &role_str,
        )
        .await
        .map_err(|e| {
            tracing::error!("Failed to list prescriptions: {}", e);
            AppError::Internal(format!("Failed to list prescriptions: {}", e))
        })?;

    Ok(Json(PrescriptionListResponse {
        prescriptions,
        total,
        limit,
        offset,
    }))
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
    Extension(request_ctx): Extension<RequestContext>,
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

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .create_prescription(req.clone(), auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create prescription: {:?}", e);
            tracing::error!("Request data: patient_id={}, medication={}, provider_id={}",
                req.patient_id, req.medication_name, req.provider_id);
            AppError::Internal(format!("Failed to create prescription: {:?}", e))
        })?;

    // Create audit log for prescription creation
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Prescription,
            entity_id: Some(prescription.id.to_string()),
            changes: Some(serde_json::json!({
                "patient_id": req.patient_id,
                "medication_name": req.medication_name,
                "dosage": req.dosage,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

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

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .get_prescription(id, auth_user.user_id, &role_str)
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

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescriptions = prescription_service
        .get_patient_prescriptions(patient_id, query.active_only.unwrap_or(false), auth_user.user_id, &role_str)
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

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescriptions = prescription_service
        .get_visit_prescriptions(visit_id, auth_user.user_id, &role_str)
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
    Extension(request_ctx): Extension<RequestContext>,
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

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .update_prescription(id, req.clone(), auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update prescription {}: {}", id, e);
            AppError::Internal(format!("Failed to update prescription: {}", e))
        })?;

    // Create audit log for prescription update
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::to_value(&req).unwrap_or_default()),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

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
    Extension(request_ctx): Extension<RequestContext>,
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

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .discontinue_prescription(id, req.reason.clone(), auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to discontinue prescription {}: {}", id, e);
            if e.to_string().contains("Cannot discontinue") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to discontinue prescription: {}", e))
            }
        })?;

    // Create audit log for prescription discontinuation
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "discontinue",
                "reason": req.reason,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(prescription))
}

/// Request body for cancelling a prescription
#[derive(Debug, Deserialize, Validate)]
pub struct CancelPrescriptionRequest {
    #[validate(length(max = 500, message = "Reason must be at most 500 characters"))]
    pub reason: Option<String>,
}

/// Request body for putting a prescription on hold
#[derive(Debug, Deserialize, Validate)]
pub struct HoldPrescriptionRequest {
    #[validate(length(min = 1, max = 500, message = "Reason must be 1-500 characters"))]
    pub reason: String,
}

/// Cancel prescription
///
/// POST /api/v1/prescriptions/:id/cancel
///
/// Changes status to CANCELLED. Used when prescription was never started/filled.
///
/// **RBAC**: Requires 'update' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn cancel_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(req): Json<CancelPrescriptionRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "update").await?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .cancel_prescription(id, req.reason.clone(), auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to cancel prescription {}: {}", id, e);
            if e.to_string().contains("Cannot cancel") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to cancel prescription: {}", e))
            }
        })?;

    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "cancel",
                "reason": req.reason,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(prescription))
}

/// Put prescription on hold
///
/// POST /api/v1/prescriptions/:id/hold
///
/// Changes status to ON_HOLD. Temporarily pauses the prescription.
///
/// **RBAC**: Requires 'update' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn hold_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(req): Json<HoldPrescriptionRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "update").await?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .hold_prescription(id, req.reason.clone(), auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to put prescription {} on hold: {}", id, e);
            if e.to_string().contains("Cannot put") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to put prescription on hold: {}", e))
            }
        })?;

    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "hold",
                "reason": req.reason,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(prescription))
}

/// Resume prescription from hold
///
/// POST /api/v1/prescriptions/:id/resume
///
/// Changes status from ON_HOLD back to ACTIVE.
///
/// **RBAC**: Requires 'update' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn resume_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "update").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .resume_prescription(id, auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to resume prescription {}: {}", id, e);
            if e.to_string().contains("Cannot resume") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to resume prescription: {}", e))
            }
        })?;

    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "resume",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(prescription))
}

/// Mark prescription as completed
///
/// POST /api/v1/prescriptions/:id/complete
///
/// Changes status to COMPLETED. Used when prescription course is finished.
///
/// **RBAC**: Requires 'update' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn complete_prescription(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "update").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let prescription = prescription_service
        .complete_prescription(id, auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to complete prescription {}: {}", id, e);
            if e.to_string().contains("Cannot complete") {
                AppError::BadRequest(e.to_string())
            } else {
                AppError::Internal(format!("Failed to complete prescription: {}", e))
            }
        })?;

    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "complete",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

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
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions (ADMIN only)
    check_permission(&state, &auth_user.role, "delete").await?;

    // Delete prescription service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Convert role to string for RLS context
    let role_str = format!("{:?}", auth_user.role).to_uppercase();

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    prescription_service
        .delete_prescription(id, auth_user.user_id, &role_str)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete prescription {}: {}", id, e);
            AppError::Internal(format!("Failed to delete prescription: {}", e))
        })?;

    // Create audit log for prescription deletion
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Delete,
            entity_type: EntityType::Prescription,
            entity_id: Some(id.to_string()),
            changes: None,
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

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

/// Create a custom medication
///
/// POST /api/v1/prescriptions/medications/custom
///
/// Creates a custom medication that can be used in future prescriptions.
/// Custom medications are associated with the creating user and appear in
/// medication search results alongside AIFA database medications.
///
/// **RBAC**: Requires 'create' permission on 'prescriptions' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_custom_medication(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(payload): Json<CreateCustomMedicationRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "create").await?;

    // Validate input
    payload.validate().map_err(|e| {
        AppError::Validation(format!("Invalid medication data: {}", e))
    })?;

    // Create custom medication
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let prescription_service = PrescriptionService::new(state.pool.clone(), encryption_key.clone());
    let role_str = format!("{:?}", auth_user.role).to_uppercase();
    let medication_id = prescription_service
        .create_custom_medication(
            payload.name.clone(),
            payload.generic_name,
            payload.form,
            payload.dosage_strength,
            payload.route,
            payload.common_dosages,
            payload.notes,
            auth_user.user_id,
            &role_str,
        )
        .await
        .map_err(|e| {
            tracing::error!("Failed to create custom medication: {:?}", e);
            AppError::Internal(format!("Failed to create custom medication: {}", e))
        })?;

    // Log audit entry
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Prescription,
            entity_id: Some(medication_id.to_string()),
            changes: Some(serde_json::json!({
                "type": "custom_medication",
                "name": payload.name,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((
        StatusCode::CREATED,
        Json(CreateCustomMedicationResponse {
            id: medication_id,
            message: "Custom medication created successfully".to_string(),
        }),
    ))
}
