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
        AppointmentDto, AppointmentSearchFilter, AppointmentStatistics, AppointmentStatus,
        AppointmentType, AvailabilityResponse, CancelAppointmentRequest,
        CreateAppointmentRequest, TimeSlot, UpdateAppointmentRequest, UserRole,
    },
    services::AppointmentService,
    utils::{AppError, Result},
};

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
    Extension(user_id): Extension<Uuid>,
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
    Json(req): Json<CreateAppointmentRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "create").await?;

    req.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let service = AppointmentService::new(state.pool.clone());

    let appointment = service
        .create_appointment(req, user_id)
        .await
        .map_err(|e| {
            let error_str = e.to_string();
            if error_str.contains("conflict") {
                AppError::Conflict(error_str)
            } else if error_str.contains("foreign key") || error_str.contains("patient") {
                AppError::BadRequest("Patient not found or invalid provider".to_string())
            } else {
                AppError::Internal(error_str)
            }
        })?;

    Ok((StatusCode::CREATED, Json(appointment)))
}

/// GET /api/v1/appointments/:id
///
/// Get an appointment by ID
pub async fn get_appointment(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "read").await?;

    let service = AppointmentService::new(state.pool.clone());

    let appointment = service
        .get_appointment(id, Some(user_id))
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
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAppointmentRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "update").await?;

    req.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let service = AppointmentService::new(state.pool.clone());

    let appointment = service
        .update_appointment(id, req, user_id)
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

    Ok((StatusCode::OK, Json(appointment)))
}

/// DELETE /api/v1/appointments/:id
///
/// Cancel an appointment
pub async fn cancel_appointment(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
    Json(req): Json<CancelAppointmentRequest>,
) -> Result<impl IntoResponse> {
    check_permission(&state, &user_role, "delete").await?;

    req.validate().map_err(|e| {
        AppError::BadRequest(format!("Validation error: {}", e))
    })?;

    let service = AppointmentService::new(state.pool.clone());

    let appointment = service
        .cancel_appointment(id, req.cancellation_reason, user_id)
        .await
        .map_err(|e| {
            if e.to_string().contains("not found") {
                AppError::NotFound(e.to_string())
            } else {
                AppError::Internal(e.to_string())
            }
        })?;

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
        .list_appointments(filter, Some(user_id))
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
    Extension(user_id): Extension<Uuid>,
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
    Extension(user_id): Extension<Uuid>,
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
    Extension(user_id): Extension<Uuid>,
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
