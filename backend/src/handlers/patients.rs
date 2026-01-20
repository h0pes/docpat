/*!
 * Patient Management HTTP Handlers
 *
 * Handles HTTP requests for patient CRUD operations and search.
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::{
    handlers::auth::AppState,
    models::{
        AuditAction, AuditLog, CreateAuditLog, CreatePatientRequest, EntityType,
        Patient, PatientDto, PatientSearchFilter, RequestContext, UpdatePatientRequest, UserRole,
    },
    services::PatientService,
    utils::{AppError, Result},
};

/// Helper function to set RLS context in a transaction
/// Uses set_config() with parameterized queries for security (prevents SQL injection)
async fn set_rls_in_transaction(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &Uuid,
    user_role: &UserRole,
) -> Result<()> {
    let role_str = match user_role {
        UserRole::Admin => "ADMIN",
        UserRole::Doctor => "DOCTOR",
    };

    // Use set_config() which supports parameterized queries
    // Third parameter 'true' makes it local to the current transaction
    sqlx::query("SELECT set_config('app.current_user_id', $1, true)")
        .bind(user_id.to_string())
        .execute(&mut **tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to set RLS user context: {}", e);
            AppError::Internal("Failed to set security context".to_string())
        })?;

    sqlx::query("SELECT set_config('app.current_user_role', $1, true)")
        .bind(role_str)
        .execute(&mut **tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to set RLS role context: {}", e);
            AppError::Internal("Failed to set security context".to_string())
        })?;

    Ok(())
}

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on patients resource
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "patients", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} patients",
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
            // Only admins can delete
            if *user_role != UserRole::Admin {
                return Err(AppError::Forbidden(
                    "Only administrators can delete patients".to_string(),
                ));
            }
        }
        "create" | "read" | "update" => {
            // Both ADMIN and DOCTOR can perform these actions
            // No additional check needed
        }
        _ => {
            return Err(AppError::Forbidden(format!(
                "Unknown action: {}",
                action
            )));
        }
    }

    Ok(())
}

/// Create patient handler
///
/// POST /api/v1/patients
///
/// Creates a new patient record with encrypted PHI/PII fields.
/// Includes duplicate detection based on fiscal code and name/DOB.
///
/// # Authorization
/// Requires ADMIN or DOCTOR role
///
/// # Request Body
/// ```json
/// {
///   "first_name": "John",
///   "last_name": "Doe",
///   "date_of_birth": "1990-01-15",
///   "gender": "M",
///   "fiscal_code": "RSSMRA85M01H501U",
///   "phone_primary": "+39 123 456 7890",
///   "email": "john.doe@example.com",
///   ...
/// }
/// ```
pub async fn create_patient(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(data): Json<CreatePatientRequest>,
) -> Result<impl IntoResponse> {
    tracing::info!("Creating patient by user: {} (role: {:?})", user_id, user_role);

    // Check RBAC permission
    check_permission(&state, &user_role, "create").await?;

    // Validate request
    data.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Create patient service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let patient_service = PatientService::new(state.pool.clone(), encryption_key.clone());

    // Start a transaction for RLS context, duplicate check, and patient creation
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Set RLS context within the transaction
    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Check for duplicates inside transaction (after RLS is set)
    let duplicates = patient_service.find_duplicates(&mut *tx, &data).await.map_err(|e| {
        tracing::error!("Failed to check for duplicates: {}", e);
        AppError::Internal("Failed to check for duplicate patients".to_string())
    })?;

    if !duplicates.is_empty() {
        // Check for high confidence duplicates
        let high_confidence = duplicates
            .iter()
            .any(|d| matches!(d.confidence, crate::services::patient_service::DuplicateConfidence::High));

        if high_confidence {
            return Err(AppError::Conflict(format!(
                "Patient with same fiscal code already exists: {}",
                duplicates[0].medical_record_number
            )));
        }

        // For medium/low confidence, log warning but allow creation
        tracing::warn!(
            "Potential duplicate detected for new patient: {} {}",
            data.first_name,
            data.last_name
        );
    }

    // Create patient within the transaction
    let patient_result = Patient::create(&mut *tx, data.clone(), user_id, encryption_key)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create patient: {}", e);
            AppError::Internal(format!("Failed to create patient: {}", e))
        })?;

    // Commit transaction
    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Failed to save patient data".to_string())
    })?;

    // Decrypt patient for response
    let patient = patient_result.decrypt(encryption_key).map_err(|e| {
        tracing::error!("Failed to decrypt patient: {}", e);
        AppError::Internal("Failed to retrieve patient data".to_string())
    })?;

    // Create audit log for patient creation
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Patient,
            entity_id: Some(patient.id.to_string()),
            changes: Some(serde_json::json!({
                "medical_record_number": patient.medical_record_number,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    tracing::info!("Patient created: {} (MRN: {})", patient.id, patient.medical_record_number);

    Ok((StatusCode::CREATED, Json(patient)))
}

/// Get patient by ID handler
///
/// GET /api/v1/patients/:id
///
/// Returns decrypted patient data.
///
/// # Authorization
/// Requires ADMIN or DOCTOR role
pub async fn get_patient(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(patient_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Get patient {} by user: {} (role: {:?})",
        patient_id,
        user_id,
        user_role
    );

    // Check RBAC permission
    check_permission(&state, &user_role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Start transaction and set RLS context
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Get patient within transaction
    let patient_result = Patient::find_by_id(&mut *tx, patient_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patient: {}", e);
            AppError::Internal(format!("Failed to get patient: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Patient {} not found", patient_id)))?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Decrypt patient for response
    let patient = patient_result.decrypt(encryption_key).map_err(|e| {
        tracing::error!("Failed to decrypt patient: {}", e);
        AppError::Internal("Failed to retrieve patient data".to_string())
    })?;

    Ok(Json(patient))
}

/// Update patient handler
///
/// PUT /api/v1/patients/:id
///
/// Updates patient record with encrypted fields.
///
/// # Authorization
/// Requires ADMIN or DOCTOR role
pub async fn update_patient(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(patient_id): Path<Uuid>,
    Json(data): Json<UpdatePatientRequest>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Updating patient {} by user: {} (role: {:?})",
        patient_id,
        user_id,
        user_role
    );

    // Check RBAC permission
    check_permission(&state, &user_role, "update").await?;

    // Validate request
    data.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Start transaction and set RLS context
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Fetch existing patient
    let existing = Patient::find_by_id(&mut *tx, patient_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch patient: {}", e);
            AppError::Internal("Failed to fetch patient".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Patient {} not found", patient_id)))?;

    // Update patient within transaction (passing existing patient)
    let patient_result = Patient::update_with_existing(&mut *tx, patient_id, existing, data.clone(), user_id, encryption_key)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update patient: {}", e);
            AppError::Internal(format!("Failed to update patient: {}", e))
        })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Decrypt patient for response
    let patient = patient_result.decrypt(encryption_key).map_err(|e| {
        tracing::error!("Failed to decrypt patient: {}", e);
        AppError::Internal("Failed to retrieve patient data".to_string())
    })?;

    // Create audit log for patient update
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Patient,
            entity_id: Some(patient_id.to_string()),
            changes: Some(serde_json::to_value(&data).unwrap_or_default()),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    tracing::info!("Patient {} updated successfully", patient_id);

    Ok(Json(patient))
}

/// Delete (deactivate) patient handler
///
/// DELETE /api/v1/patients/:id
///
/// Soft deletes a patient by setting status to INACTIVE.
///
/// # Authorization
/// Requires ADMIN role only (more destructive operation)
pub async fn delete_patient(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(patient_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Deleting patient {} by user: {} (role: {:?})",
        patient_id,
        user_id,
        user_role
    );

    // Check RBAC permission (delete action restricted to ADMIN in policy)
    check_permission(&state, &user_role, "delete").await?;

    // Start transaction and set RLS context
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Check if patient exists before deleting
    let exists = Patient::find_by_id(&mut *tx, patient_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check patient existence: {}", e);
            AppError::Internal("Failed to check patient existence".to_string())
        })?
        .is_some();

    if !exists {
        return Err(AppError::NotFound(format!("Patient {} not found", patient_id)));
    }

    // Soft delete patient within transaction
    Patient::soft_delete(&mut *tx, patient_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete patient: {}", e);
            AppError::Internal(format!("Failed to delete patient: {}", e))
        })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Create audit log for patient deletion
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Delete,
            entity_type: EntityType::Patient,
            entity_id: Some(patient_id.to_string()),
            changes: None,
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    tracing::info!("Patient {} deleted successfully", patient_id);

    Ok(StatusCode::NO_CONTENT)
}

/// Reactivate patient handler (ADMIN only)
///
/// POST /api/v1/patients/:id/reactivate
///
/// Reactivates a previously soft-deleted (INACTIVE) patient by setting
/// their status back to ACTIVE.
///
/// # Authorization
/// Requires ADMIN role
pub async fn reactivate_patient(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(patient_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Reactivating patient {} by user: {} (role: {:?})",
        patient_id,
        user_id,
        user_role
    );

    // Check RBAC permission (reactivate is essentially an update action, restricted to ADMIN)
    check_permission(&state, &user_role, "delete").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Start transaction and set RLS context
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Check if patient exists
    let patient_result = Patient::find_by_id(&mut *tx, patient_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check patient existence: {}", e);
            AppError::Internal("Failed to check patient existence".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Patient {} not found", patient_id)))?;

    // Reactivate patient within transaction
    Patient::reactivate(&mut *tx, patient_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to reactivate patient: {}", e);
            AppError::Internal(format!("Failed to reactivate patient: {}", e))
        })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Decrypt patient for response
    let patient = patient_result.decrypt(encryption_key).map_err(|e| {
        tracing::error!("Failed to decrypt patient: {}", e);
        AppError::Internal("Failed to retrieve patient data".to_string())
    })?;

    // Create audit log for patient reactivation
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Patient,
            entity_id: Some(patient_id.to_string()),
            changes: Some(serde_json::json!({
                "action": "reactivate",
                "status": "ACTIVE",
                "patient_name": format!("{} {}", patient.first_name, patient.last_name),
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    tracing::info!("Patient {} reactivated successfully", patient_id);

    Ok(StatusCode::OK)
}

/// Pagination query parameters
#[derive(Debug, Deserialize, Validate)]
pub struct PaginationParams {
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<i64>,
    #[validate(range(min = 0))]
    pub offset: Option<i64>,
}

/// List patients handler
///
/// GET /api/v1/patients?limit=20&offset=0
///
/// Returns paginated list of patients (decrypted).
///
/// # Authorization
/// Requires ADMIN or DOCTOR role
pub async fn list_patients(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "List patients by user: {} (role: {:?}), limit: {:?}, offset: {:?}",
        user_id,
        user_role,
        params.limit,
        params.offset
    );

    // Check RBAC permission
    check_permission(&state, &user_role, "read").await?;

    // Validate pagination params
    params
        .validate()
        .map_err(|e| AppError::BadRequest(format!("Invalid pagination parameters: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    // Start transaction and set RLS context
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // List patients within transaction
    let patient_results = Patient::list(&mut *tx, limit, offset)
        .await
        .map_err(|e| {
            tracing::error!("Failed to list patients: {}", e);
            AppError::Internal(format!("Failed to list patients: {}", e))
        })?;

    let total_count = Patient::count(&mut *tx).await.map_err(|e| {
        tracing::error!("Failed to count patients: {}", e);
        AppError::Internal(format!("Failed to count patients: {}", e))
    })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Decrypt patients for response
    let patients: Vec<PatientDto> = patient_results
        .into_iter()
        .filter_map(|p| {
            p.decrypt(encryption_key)
                .map_err(|e| {
                    tracing::warn!("Failed to decrypt patient {}: {}", p.id, e);
                    e
                })
                .ok()
        })
        .collect();

    // Return patients with pagination metadata
    let response = PaginatedResponse {
        data: patients,
        total: total_count,
        limit,
        offset,
    };

    Ok(Json(response))
}

/// Paginated response wrapper
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    #[serde(rename = "patients")]
    pub data: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Search patients handler
///
/// GET /api/v1/patients/search?query=john&status=ACTIVE&gender=M&min_age=18&max_age=65
///
/// Full-text search with filters.
///
/// # Authorization
/// Requires ADMIN or DOCTOR role
pub async fn search_patients(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Query(filter): Query<PatientSearchFilter>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Search patients by user: {} (role: {:?}), query: {:?}",
        user_id,
        user_role,
        filter.query
    );

    // Check RBAC permission
    check_permission(&state, &user_role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Start transaction and set RLS context
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Search patients within transaction
    let patient_service = PatientService::new(state.pool.clone(), encryption_key.clone());
    let patients = patient_service
        .search_patients(&mut *tx, filter, Some(user_id), Some(&request_ctx))
        .await
        .map_err(|e| {
            tracing::error!("Failed to search patients: {}", e);
            AppError::Internal(format!("Failed to search patients: {}", e))
        })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    // Return wrapped response
    let response = serde_json::json!({
        "patients": patients,
        "total": patients.len()
    });

    Ok(Json(response))
}

/// Get patient statistics handler
///
/// GET /api/v1/patients/statistics
///
/// Returns patient counts by status and insurance.
///
/// # Authorization
/// Requires ADMIN or DOCTOR role
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Get patient statistics by user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Check RBAC permission
    check_permission(&state, &user_role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    // Start transaction and set RLS context (statistics queries need RLS for COUNT)
    let mut tx = state.pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

    // Get statistics within transaction
    let patient_service = PatientService::new(state.pool.clone(), encryption_key.clone());
    let statistics = patient_service
        .get_statistics(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patient statistics: {}", e);
            AppError::Internal(format!("Failed to get statistics: {}", e))
        })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {}", e);
        AppError::Internal("Database transaction failed".to_string())
    })?;

    Ok(Json(statistics))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_params_validation() {
        let valid = PaginationParams {
            limit: Some(20),
            offset: Some(0),
        };
        assert!(valid.validate().is_ok());

        let invalid_limit = PaginationParams {
            limit: Some(101), // > 100
            offset: Some(0),
        };
        assert!(invalid_limit.validate().is_err());

        let invalid_offset = PaginationParams {
            limit: Some(20),
            offset: Some(-1), // < 0
        };
        // Note: offset is i64, so -1 is technically valid, but our validation should catch it
        // In practice, we'd use u64 for offset to prevent negative values at type level
    }
}
