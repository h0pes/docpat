/*!
 * Appointment Management HTTP Handlers
 *
 * Handles HTTP requests for appointment CRUD operations, scheduling, and availability.
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::{
    handlers::auth::AppState,
    models::{
        AppointmentDto, AppointmentSearchFilter, AppointmentStatus,
        AppointmentType, AvailabilityResponse, CancelAppointmentRequest,
        CreateAppointmentRequest, Patient, RequestContext, UpdateAppointmentRequest, UserRole,
    },
    services::{AppointmentService, NotificationService},
    utils::{AppError, Result},
};

/// Helper function to set RLS context in a transaction
async fn set_rls_in_transaction(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &Uuid,
    user_role: &UserRole,
) -> Result<()> {
    let role_str = match user_role {
        UserRole::Admin => "ADMIN",
        UserRole::Doctor => "DOCTOR",
    };

    // Use set_config() which supports parameterized queries for security
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

/// Check if user has permission for appointments
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    use tracing::warn;

    let has_permission = state
        .enforcer
        .enforce(user_role, "appointments", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} appointments",
            action
        )));
    }

    Ok(())
}

#[cfg(not(feature = "rbac"))]
async fn check_permission(
    _state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    // Simple role-based check without Casbin
    match action {
        "delete" => {
            // Only ADMIN can delete
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete appointments".to_string(),
                ));
            }
        }
        _ => {
            // ADMIN and DOCTOR can perform other actions
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden(
                    "Insufficient permissions".to_string(),
                ));
            }
        }
    }
    Ok(())
}

/// Query parameters for availability check
#[derive(Debug, Deserialize, Validate)]
pub struct AvailabilityQuery {
    #[validate(custom(function = "crate::utils::validate_uuid"))]
    pub provider_id: String,
    pub date: DateTime<Utc>,
    #[validate(range(min = 15, max = 480))]
    pub duration_minutes: i32,
}

/// POST /api/v1/appointments/availability
///
/// Check appointment availability for a provider
pub async fn check_availability(
    State(state): State<AppState>,
    Extension(_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<AvailabilityQuery>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    query.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let provider_id = Uuid::parse_str(&query.provider_id)
        .map_err(|_| AppError::BadRequest("Invalid provider ID".to_string()))?;

    let service = AppointmentService::new(state.pool.clone());

    let slots = service
        .check_availability(provider_id, query.date, query.duration_minutes)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let response = AvailabilityResponse {
        date: query.date,
        provider_id,
        slots,
    };

    Ok((StatusCode::OK, Json(response)))
}

/// POST /api/v1/appointments
///
/// Create a new appointment
pub async fn create_appointment(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<CreateAppointmentRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "create").await?;

    req.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    // Extract notification flag before moving req
    let send_notification = req.send_notification.unwrap_or(false);
    let patient_id_str = req.patient_id.clone();
    let provider_id_str = req.provider_id.clone();
    let scheduled_start = req.scheduled_start;
    let appointment_type = req.appointment_type.clone();

    let service = AppointmentService::new(state.pool.clone());

    let appointment = service
        .create_appointment(req, user_id, Some(&request_ctx))
        .await
        .map_err(|e| {
            let error_str = e.to_string();
            let error_lower = error_str.to_lowercase();
            if error_lower.contains("conflict") {
                AppError::Conflict(error_str)
            } else if error_lower.contains("foreign key") || error_lower.contains("patient") {
                // Return the actual error message for better debugging
                AppError::BadRequest(error_str)
            } else {
                AppError::Internal(error_str)
            }
        })?;

    // Send confirmation notification if requested and email service is available
    if send_notification {
        if let Some(ref email_service) = state.email_service {
            let notification_service = NotificationService::new(state.pool.clone(), email_service.clone());

            // Get patient details for email - use encryption key if available
            let encryption_key = match &state.encryption_key {
                Some(key) => key.clone(),
                None => {
                    tracing::warn!("Cannot send notification: encryption key not configured");
                    return Ok((StatusCode::CREATED, Json(appointment)));
                }
            };

            if let Ok(patient_id) = Uuid::parse_str(&patient_id_str) {
                // CRITICAL: Check patient's email notification preference (backend enforcement)
                // This is the authoritative check - even if frontend sends send_notification=true,
                // we must respect the patient's preference
                if !notification_service.can_patient_receive_email(patient_id, user_id).await {
                    tracing::info!(
                        "Skipping booking notification for appointment {} - patient {} has email notifications disabled",
                        appointment.id, patient_id
                    );
                    return Ok((StatusCode::CREATED, Json(appointment)));
                }

                let provider_id = Uuid::parse_str(&provider_id_str).ok();

                // Lookup patient and provider with RLS context set
                let lookup_result = async {
                    let mut tx = state.pool.begin().await?;
                    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

                    let patient = sqlx::query_as::<_, Patient>(
                        "SELECT * FROM patients WHERE id = $1"
                    )
                    .bind(patient_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to fetch patient: {}", e)))?;

                    // Fetch provider name from users table
                    let provider_name: Option<String> = if let Some(pid) = provider_id {
                        sqlx::query_scalar::<_, String>(
                            "SELECT first_name || ' ' || last_name FROM users WHERE id = $1"
                        )
                        .bind(pid)
                        .fetch_optional(&mut *tx)
                        .await
                        .map_err(|e| AppError::Internal(format!("Failed to fetch provider: {}", e)))?
                    } else {
                        None
                    };

                    tx.commit().await.map_err(|e| AppError::Internal(format!("Failed to commit: {}", e)))?;
                    Ok::<(Option<Patient>, Option<String>), AppError>((patient, provider_name))
                }.await;

                if let Ok((Some(patient), provider_name)) = lookup_result {
                    // Decrypt patient data
                    if let Ok(decrypted_patient) = patient.decrypt(&encryption_key) {
                        if let Some(email) = decrypted_patient.email {
                            let patient_name = format!("{} {}", decrypted_patient.first_name, decrypted_patient.last_name);
                            let appointment_type_str = format!("{:?}", appointment_type);
                            let doctor_name = provider_name.unwrap_or_else(|| "Dr.".to_string());

                            // Queue the booking notification (don't fail the request if notification fails)
                            if let Err(e) = notification_service.queue_appointment_booked(
                                patient_id,
                                appointment.id,
                                &email,
                                &patient_name,
                                scheduled_start,
                                &doctor_name,
                                &appointment_type_str,
                                user_id,
                            ).await {
                                tracing::warn!("Failed to queue booking notification: {}", e);
                            } else {
                                tracing::info!("Queued booking notification for appointment {}", appointment.id);
                            }
                        } else {
                            tracing::debug!("Patient {} has no email address, skipping notification", patient_id);
                        }
                    } else {
                        tracing::warn!("Failed to decrypt patient {} data for notification", patient_id);
                    }
                } else {
                    tracing::warn!("Failed to fetch patient {} for notification (RLS may have blocked)", patient_id);
                }
            }
        }
    }

    Ok((StatusCode::CREATED, Json(appointment)))
}

/// GET /api/v1/appointments/:id
///
/// Get an appointment by ID
pub async fn get_appointment(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    let service = AppointmentService::new(state.pool.clone());

    let appointment = service
        .get_appointment(id, Some(user_id), Some(&request_ctx))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Appointment not found".to_string()))?;

    Ok((StatusCode::OK, Json(appointment)))
}

/// PUT /api/v1/appointments/:id
///
/// Update an appointment
pub async fn update_appointment(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAppointmentRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "update").await?;

    req.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    // Extract notification flag and check if this is a confirmation
    let send_notification = req.send_notification.unwrap_or(false);
    let is_confirming = req.status == Some(AppointmentStatus::Confirmed);

    let service = AppointmentService::new(state.pool.clone());

    // Get appointment details before update for notification (if confirming)
    let existing_appointment = if send_notification && is_confirming {
        service.get_appointment(id, Some(user_id), Some(&request_ctx)).await.ok().flatten()
    } else {
        None
    };

    let appointment = service
        .update_appointment(id, req, user_id, Some(&request_ctx))
        .await
        .map_err(|e| {
            if e.to_string().contains("conflict") {
                AppError::Conflict(e.to_string())
            } else if e.to_string().contains("not found") {
                AppError::NotFound(e.to_string())
            } else {
                AppError::Internal(e.to_string())
            }
        })?;

    // Send confirmation notification if requested and status is CONFIRMED
    if send_notification && is_confirming {
        if let Some(ref email_service) = state.email_service {
            if let Some(existing) = existing_appointment {
                let notification_service = NotificationService::new(state.pool.clone(), email_service.clone());

                // CRITICAL: Check patient's email notification preference (backend enforcement)
                // This is the authoritative check - even if frontend sends send_notification=true,
                // we must respect the patient's preference
                if !notification_service.can_patient_receive_email(existing.patient_id, user_id).await {
                    tracing::info!(
                        "Skipping confirmation notification for appointment {} - patient {} has email notifications disabled",
                        id, existing.patient_id
                    );
                    return Ok((StatusCode::OK, Json(appointment)));
                }

                // Get encryption key for patient data decryption
                let encryption_key = match &state.encryption_key {
                    Some(key) => key.clone(),
                    None => {
                        tracing::warn!("Cannot send confirmation notification: encryption key not configured");
                        return Ok((StatusCode::OK, Json(appointment)));
                    }
                };

                // Lookup patient and provider with RLS context set
                let lookup_result = async {
                    let mut tx = state.pool.begin().await?;
                    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

                    let patient = sqlx::query_as::<_, Patient>(
                        "SELECT * FROM patients WHERE id = $1"
                    )
                    .bind(existing.patient_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to fetch patient: {}", e)))?;

                    // Fetch provider name from users table
                    let provider_name: Option<String> = sqlx::query_scalar::<_, String>(
                        "SELECT first_name || ' ' || last_name FROM users WHERE id = $1"
                    )
                    .bind(existing.provider_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to fetch provider: {}", e)))?;

                    tx.commit().await.map_err(|e| AppError::Internal(format!("Failed to commit: {}", e)))?;
                    Ok::<(Option<Patient>, Option<String>), AppError>((patient, provider_name))
                }.await;

                if let Ok((Some(patient), provider_name)) = lookup_result {
                    // Decrypt patient data
                    if let Ok(decrypted_patient) = patient.decrypt(&encryption_key) {
                        if let Some(email) = decrypted_patient.email {
                            let patient_name = format!("{} {}", decrypted_patient.first_name, decrypted_patient.last_name);
                            let appointment_type_str = format!("{:?}", existing.appointment_type);
                            let doctor_name = provider_name.unwrap_or_else(|| "Dr.".to_string());

                            // Queue the notification (don't fail the request if notification fails)
                            if let Err(e) = notification_service.queue_appointment_confirmation(
                                existing.patient_id,
                                id,
                                &email,
                                &patient_name,
                                existing.scheduled_start,
                                &doctor_name,
                                &appointment_type_str,
                                user_id,
                            ).await {
                                tracing::warn!("Failed to queue confirmation notification: {}", e);
                            } else {
                                tracing::info!("Queued confirmation notification for appointment {}", id);
                            }
                        } else {
                            tracing::debug!("Patient {} has no email address, skipping confirmation notification", existing.patient_id);
                        }
                    } else {
                        tracing::warn!("Failed to decrypt patient {} data for confirmation notification", existing.patient_id);
                    }
                } else {
                    tracing::warn!("Failed to fetch patient for confirmation notification");
                }
            }
        }
    }

    Ok((StatusCode::OK, Json(appointment)))
}

/// DELETE /api/v1/appointments/:id
///
/// Cancel an appointment
pub async fn cancel_appointment(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(req): Json<CancelAppointmentRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "delete").await?;

    req.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    // Extract notification flag and cancellation reason
    let send_notification = req.send_notification.unwrap_or(false);
    let cancellation_reason = req.cancellation_reason.clone();

    let service = AppointmentService::new(state.pool.clone());

    // Get appointment details before cancellation for notification
    let existing_appointment = if send_notification {
        service.get_appointment(id, Some(user_id), Some(&request_ctx)).await.ok().flatten()
    } else {
        None
    };

    let appointment = service
        .cancel_appointment(id, req.cancellation_reason, user_id, Some(&request_ctx))
        .await
        .map_err(|e| {
            if e.to_string().contains("not found") {
                AppError::NotFound(e.to_string())
            } else {
                AppError::Internal(e.to_string())
            }
        })?;

    // Send cancellation notification if requested and email service is available
    if send_notification {
        if let Some(ref email_service) = state.email_service {
            if let Some(existing) = existing_appointment {
                let notification_service = NotificationService::new(state.pool.clone(), email_service.clone());

                // CRITICAL: Check patient's email notification preference (backend enforcement)
                // This is the authoritative check - even if frontend sends send_notification=true,
                // we must respect the patient's preference
                if !notification_service.can_patient_receive_email(existing.patient_id, user_id).await {
                    tracing::info!(
                        "Skipping cancellation notification for appointment {} - patient {} has email notifications disabled",
                        id, existing.patient_id
                    );
                    return Ok((StatusCode::OK, Json(appointment)));
                }

                // Get encryption key for patient data decryption
                let encryption_key = match &state.encryption_key {
                    Some(key) => key.clone(),
                    None => {
                        tracing::warn!("Cannot send cancellation notification: encryption key not configured");
                        return Ok((StatusCode::OK, Json(appointment)));
                    }
                };

                // Lookup patient and provider with RLS context set
                let lookup_result = async {
                    let mut tx = state.pool.begin().await?;
                    set_rls_in_transaction(&mut tx, &user_id, &user_role).await?;

                    let patient = sqlx::query_as::<_, Patient>(
                        "SELECT * FROM patients WHERE id = $1"
                    )
                    .bind(existing.patient_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to fetch patient: {}", e)))?;

                    // Fetch provider name from users table
                    let provider_name: Option<String> = sqlx::query_scalar::<_, String>(
                        "SELECT first_name || ' ' || last_name FROM users WHERE id = $1"
                    )
                    .bind(existing.provider_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to fetch provider: {}", e)))?;

                    tx.commit().await.map_err(|e| AppError::Internal(format!("Failed to commit: {}", e)))?;
                    Ok::<(Option<Patient>, Option<String>), AppError>((patient, provider_name))
                }.await;

                if let Ok((Some(patient), provider_name)) = lookup_result {
                    // Decrypt patient data
                    if let Ok(decrypted_patient) = patient.decrypt(&encryption_key) {
                        if let Some(email) = decrypted_patient.email {
                            let patient_name = format!("{} {}", decrypted_patient.first_name, decrypted_patient.last_name);
                            let appointment_type_str = format!("{:?}", existing.appointment_type);
                            let doctor_name = provider_name.unwrap_or_else(|| "Dr.".to_string());

                            // Queue the notification (don't fail the request if notification fails)
                            if let Err(e) = notification_service.queue_appointment_cancellation(
                                existing.patient_id,
                                id,
                                &email,
                                &patient_name,
                                existing.scheduled_start,
                                &doctor_name,
                                &appointment_type_str,
                                Some(&cancellation_reason),
                                user_id,
                            ).await {
                                tracing::warn!("Failed to queue cancellation notification: {}", e);
                            } else {
                                tracing::info!("Queued cancellation notification for appointment {}", id);
                            }
                        } else {
                            tracing::debug!("Patient {} has no email address, skipping cancellation notification", existing.patient_id);
                        }
                    } else {
                        tracing::warn!("Failed to decrypt patient {} data for cancellation notification", existing.patient_id);
                    }
                } else {
                    tracing::warn!("Failed to fetch patient {} for cancellation notification (RLS may have blocked)", existing.patient_id);
                }
            }
        }
    }

    Ok((StatusCode::OK, Json(appointment)))
}

/// Query parameters for listing appointments
#[derive(Debug, Deserialize, Validate)]
pub struct ListAppointmentsQuery {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub status: Option<AppointmentStatus>,
    #[serde(rename = "type")]
    pub appointment_type: Option<AppointmentType>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    #[validate(range(min = 1, max = 1000))]
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Response for listing appointments
#[derive(Debug, Serialize)]
pub struct ListAppointmentsResponse {
    pub appointments: Vec<AppointmentDto>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// GET /api/v1/appointments
///
/// List appointments with filtering
pub async fn list_appointments(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Query(query): Query<ListAppointmentsQuery>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    query.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let filter = AppointmentSearchFilter {
        patient_id: query.patient_id,
        provider_id: query.provider_id,
        status: query.status,
        appointment_type: query.appointment_type,
        start_date: query.start_date,
        end_date: query.end_date,
        limit: query.limit,
        offset: query.offset,
    };

    let service = AppointmentService::new(state.pool.clone());

    let (appointments, total) = service
        .list_appointments(filter, Some(user_id), Some(&request_ctx))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let response = ListAppointmentsResponse {
        appointments,
        total,
        limit: query.limit.unwrap_or(50),
        offset: query.offset.unwrap_or(0),
    };

    Ok((StatusCode::OK, Json(response)))
}

/// Query parameters for schedule views
#[derive(Debug, Deserialize, Validate)]
pub struct ScheduleQuery {
    #[validate(custom(function = "crate::utils::validate_uuid"))]
    pub provider_id: String,
    pub date: DateTime<Utc>,
}

/// GET /api/v1/appointments/schedule/daily
///
/// Get daily schedule for a provider
pub async fn get_daily_schedule(
    State(state): State<AppState>,
    Extension(_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ScheduleQuery>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    query.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let provider_id = Uuid::parse_str(&query.provider_id)
        .map_err(|_| AppError::BadRequest("Invalid provider ID".to_string()))?;

    let service = AppointmentService::new(state.pool.clone());

    let appointments = service
        .get_daily_schedule(provider_id, query.date)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((StatusCode::OK, Json(appointments)))
}

/// GET /api/v1/appointments/schedule/weekly
///
/// Get weekly schedule for a provider
pub async fn get_weekly_schedule(
    State(state): State<AppState>,
    Extension(_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ScheduleQuery>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    query.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let provider_id = Uuid::parse_str(&query.provider_id)
        .map_err(|_| AppError::BadRequest("Invalid provider ID".to_string()))?;

    let service = AppointmentService::new(state.pool.clone());

    let appointments = service
        .get_weekly_schedule(provider_id, query.date)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((StatusCode::OK, Json(appointments)))
}

/// GET /api/v1/appointments/schedule/monthly
///
/// Get monthly schedule for a provider
pub async fn get_monthly_schedule(
    State(state): State<AppState>,
    Extension(_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ScheduleQuery>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    query.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let provider_id = Uuid::parse_str(&query.provider_id)
        .map_err(|_| AppError::BadRequest("Invalid provider ID".to_string()))?;

    let service = AppointmentService::new(state.pool.clone());

    let appointments = service
        .get_monthly_schedule(provider_id, query.date)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((StatusCode::OK, Json(appointments)))
}

/// GET /api/v1/appointments/statistics
///
/// Get appointment statistics
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    let service = AppointmentService::new(state.pool.clone());

    let stats = service
        .get_statistics()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((StatusCode::OK, Json(stats)))
}
