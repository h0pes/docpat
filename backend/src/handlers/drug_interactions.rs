/*!
 * Drug Interaction HTTP Handlers
 *
 * Handles HTTP requests for drug-drug interaction checking.
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
    models::{AuthUser, UserRole},
    services::{
        CheckInteractionsRequest, CheckInteractionsResponse, CheckNewMedicationRequest,
        CheckNewMedicationForPatientRequest, DrugInteractionService, InteractionStatistics,
    },
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to access drug interactions
#[cfg(feature = "rbac")]
async fn check_permission(state: &AppState, user_role: &UserRole, action: &str) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "drug_interactions", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} drug interactions",
            action
        )));
    }

    Ok(())
}

/// Fallback for non-RBAC builds - any authenticated user can read
#[cfg(not(feature = "rbac"))]
async fn check_permission(
    _state: &AppState,
    user_role: &UserRole,
    _action: &str,
) -> Result<()> {
    // All authenticated users can read drug interactions
    // This is reference data needed for prescription safety
    if !matches!(user_role, UserRole::Admin | UserRole::Doctor | UserRole::Nurse | UserRole::Staff) {
        return Err(AppError::Forbidden(
            "Insufficient permissions".to_string(),
        ));
    }
    Ok(())
}

/// Check interactions between multiple medications
///
/// POST /api/v1/drug-interactions/check
///
/// Request body:
/// ```json
/// {
///   "atc_codes": ["N02BE01", "N02AX02", "A02BC01"],
///   "min_severity": "moderate"  // optional: "contraindicated", "major", "moderate", "minor"
/// }
/// ```
pub async fn check_interactions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CheckInteractionsRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "read").await?;

    let response = DrugInteractionService::check_interactions(&state.pool, &request)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to check interactions: {}", e)))?;

    Ok((StatusCode::OK, Json(response)))
}

/// Check interactions when adding a new medication
///
/// POST /api/v1/drug-interactions/check-new
///
/// Request body:
/// ```json
/// {
///   "new_atc_code": "N02BE01",
///   "existing_atc_codes": ["N02AX02", "A02BC01"],
///   "min_severity": "moderate"  // optional
/// }
/// ```
pub async fn check_new_medication(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CheckNewMedicationRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "read").await?;

    let response = DrugInteractionService::check_new_medication(&state.pool, &request)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to check new medication: {}", e)))?;

    Ok((StatusCode::OK, Json(response)))
}

/// Check interactions when adding a new medication for a specific patient
///
/// POST /api/v1/drug-interactions/check-new-for-patient
///
/// This endpoint uses medication names with fuzzy matching to check for
/// interactions between a NEW medication and a patient's existing prescriptions.
///
/// Request body:
/// ```json
/// {
///   "new_medication_name": "COUMADIN",
///   "new_generic_name": "Warfarin",  // optional but improves matching
///   "patient_id": "uuid",
///   "min_severity": "moderate"  // optional
/// }
/// ```
pub async fn check_new_medication_for_patient(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CheckNewMedicationForPatientRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "read").await?;

    // Get role string for RLS context
    let role_str = match auth_user.role {
        UserRole::Admin => "ADMIN",
        UserRole::Doctor => "DOCTOR",
    };

    let response = DrugInteractionService::check_new_medication_for_patient(
        &state.pool,
        &request,
        state.encryption_key.as_ref(),
        auth_user.user_id,
        role_str,
    )
    .await
    .map_err(|e| AppError::Internal(format!("Failed to check new medication for patient: {}", e)))?;

    Ok((StatusCode::OK, Json(response)))
}

/// Check interactions for a patient's active prescriptions
///
/// GET /api/v1/drug-interactions/patient/{patient_id}?min_severity=moderate
///
/// This endpoint decrypts prescription medication names and uses fuzzy matching
/// to find interactions between the patient's active medications in the DDInter database.
pub async fn check_patient_interactions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(patient_id): Path<Uuid>,
    axum::extract::Query(params): axum::extract::Query<PatientInteractionsQuery>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "read").await?;

    // Get role string for RLS context
    let role_str = match auth_user.role {
        UserRole::Admin => "ADMIN",
        UserRole::Doctor => "DOCTOR",
    };

    let response = DrugInteractionService::check_patient_interactions(
        &state.pool,
        patient_id,
        params.min_severity,
        state.encryption_key.as_ref(),
        auth_user.user_id,
        role_str,
    )
    .await
    .map_err(|e| AppError::Internal(format!("Failed to check patient interactions: {}", e)))?;

    Ok((StatusCode::OK, Json(response)))
}

/// Get statistics about the drug interaction database
///
/// GET /api/v1/drug-interactions/statistics
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &auth_user.role, "read").await?;

    let stats = DrugInteractionService::get_statistics(&state.pool)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to get statistics: {}", e)))?;

    Ok((StatusCode::OK, Json(stats)))
}

/// Query parameters for patient interactions
#[derive(Debug, serde::Deserialize)]
pub struct PatientInteractionsQuery {
    pub min_severity: Option<String>,
}
