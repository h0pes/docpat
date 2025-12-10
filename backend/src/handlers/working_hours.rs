/*!
 * Working Hours HTTP Handlers
 *
 * HTTP request handlers for working hours management.
 * All endpoints require authentication and most require ADMIN role.
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use uuid::Uuid;

use crate::handlers::auth::AppState;
use crate::models::working_hours::{
    CreateOverrideRequest, EffectiveHoursQuery, EffectiveHoursResponse, ListOverridesResponse,
    OverridesFilter, UpdateAllWorkingHoursRequest, UpdateDayWorkingHoursRequest,
    UpdateOverrideRequest, WeeklyScheduleResponse, WorkingHoursOverrideResponse,
};
use crate::models::UserRole;
use crate::services::WorkingHoursService;

#[cfg(feature = "rbac")]
use crate::utils::permissions::require_admin;

/// Error response structure
fn error_response(error: &str, message: &str) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "error": error,
        "message": message
    }))
}

// ============================================================================
// Default Working Hours Endpoints
// ============================================================================

/// Get the weekly working hours schedule
///
/// GET /api/v1/working-hours
///
/// Returns the default working hours for all 7 days of the week.
/// Accessible by all authenticated users.
pub async fn get_weekly_schedule(
    State(state): State<AppState>,
) -> Result<Json<WeeklyScheduleResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = WorkingHoursService::new(state.pool.clone());

    let result = service.get_weekly_schedule().await.map_err(|e| {
        tracing::error!("Failed to get weekly schedule: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error_response("INTERNAL_ERROR", "Failed to retrieve working hours"),
        )
    })?;

    Ok(Json(result))
}

/// Update a single day's working hours
///
/// PUT /api/v1/working-hours/:day
///
/// Path parameters:
/// - day: Day of week (1-7, Monday=1)
///
/// Body: UpdateDayWorkingHoursRequest
///
/// Returns: Updated DefaultWorkingHoursResponse
pub async fn update_day_working_hours(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Path(day): Path<i16>,
    Json(mut request): Json<UpdateDayWorkingHoursRequest>,
) -> Result<Json<crate::models::working_hours::DefaultWorkingHoursResponse>, (StatusCode, Json<serde_json::Value>)>
{
    // Only admins can update working hours
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Validate day of week
    if !(1..=7).contains(&day) {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("INVALID_DAY", "Day must be between 1 (Monday) and 7 (Sunday)"),
        ));
    }

    // Ensure the day in the request matches the path
    request.day_of_week = day;

    let service = WorkingHoursService::new(state.pool.clone());

    let result = service
        .update_day_working_hours(request, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update working hours for day {}: {}", day, e);
            if e.contains("time") {
                (StatusCode::BAD_REQUEST, error_response("INVALID_TIME", &e))
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to update working hours"),
                )
            }
        })?;

    Ok(Json(result))
}

/// Update all working hours (bulk update)
///
/// PUT /api/v1/working-hours
///
/// Body: UpdateAllWorkingHoursRequest with all 7 days
///
/// Returns: WeeklyScheduleResponse with updated schedule
pub async fn update_all_working_hours(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Json(request): Json<UpdateAllWorkingHoursRequest>,
) -> Result<Json<WeeklyScheduleResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can update working hours
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let service = WorkingHoursService::new(state.pool.clone());

    let result = service
        .update_all_working_hours(request, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to bulk update working hours: {}", e);
            if e.contains("time") {
                (StatusCode::BAD_REQUEST, error_response("INVALID_TIME", &e))
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to update working hours"),
                )
            }
        })?;

    Ok(Json(result))
}

// ============================================================================
// Working Hours Override Endpoints
// ============================================================================

/// List working hours overrides
///
/// GET /api/v1/working-hours/overrides
///
/// Query parameters:
/// - from_date: Start date for filter (YYYY-MM-DD)
/// - to_date: End date for filter (YYYY-MM-DD)
/// - override_type: Filter by type (CLOSED, CUSTOM_HOURS, EXTENDED_HOURS)
/// - future_only: Only show future overrides (true/false)
///
/// Returns: ListOverridesResponse
pub async fn list_overrides(
    State(state): State<AppState>,
    Query(filter): Query<OverridesFilter>,
) -> Result<Json<ListOverridesResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = WorkingHoursService::new(state.pool.clone());

    let result = service.list_overrides(filter).await.map_err(|e| {
        tracing::error!("Failed to list overrides: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error_response("INTERNAL_ERROR", "Failed to retrieve overrides"),
        )
    })?;

    Ok(Json(result))
}

/// Get a single override by ID
///
/// GET /api/v1/working-hours/overrides/:id
///
/// Path parameters:
/// - id: Override UUID
///
/// Returns: WorkingHoursOverrideResponse
pub async fn get_override(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkingHoursOverrideResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = WorkingHoursService::new(state.pool.clone());

    let result = service
        .get_override(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get override {}: {}", id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve override"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", &format!("Override not found: {}", id)),
            )
        })?;

    Ok(Json(result))
}

/// Create a new working hours override
///
/// POST /api/v1/working-hours/overrides
///
/// Body: CreateOverrideRequest
///
/// Returns: Created WorkingHoursOverrideResponse
pub async fn create_override(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Json(request): Json<CreateOverrideRequest>,
) -> Result<(StatusCode, Json<WorkingHoursOverrideResponse>), (StatusCode, Json<serde_json::Value>)>
{
    // Only admins can create overrides
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let service = WorkingHoursService::new(state.pool.clone());

    let result = service
        .create_override(request, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create override: {}", e);
            if e.contains("already exists") {
                (
                    StatusCode::CONFLICT,
                    error_response("DUPLICATE_DATE", &e),
                )
            } else if e.contains("must be today") || e.contains("time") {
                (StatusCode::BAD_REQUEST, error_response("INVALID_REQUEST", &e))
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to create override"),
                )
            }
        })?;

    Ok((StatusCode::CREATED, Json(result)))
}

/// Update an existing override
///
/// PUT /api/v1/working-hours/overrides/:id
///
/// Path parameters:
/// - id: Override UUID
///
/// Body: UpdateOverrideRequest
///
/// Returns: Updated WorkingHoursOverrideResponse
pub async fn update_override(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateOverrideRequest>,
) -> Result<Json<WorkingHoursOverrideResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can update overrides
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let service = WorkingHoursService::new(state.pool.clone());

    let result = service
        .update_override(id, request, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update override {}: {}", id, e);
            if e.contains("not found") {
                (
                    StatusCode::NOT_FOUND,
                    error_response("NOT_FOUND", &format!("Override not found: {}", id)),
                )
            } else if e.contains("past dates") || e.contains("time") {
                (StatusCode::BAD_REQUEST, error_response("INVALID_REQUEST", &e))
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to update override"),
                )
            }
        })?;

    Ok(Json(result))
}

/// Delete an override
///
/// DELETE /api/v1/working-hours/overrides/:id
///
/// Path parameters:
/// - id: Override UUID
///
/// Returns: 204 No Content on success
pub async fn delete_override(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can delete overrides
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let service = WorkingHoursService::new(state.pool.clone());

    service.delete_override(id).await.map_err(|e| {
        tracing::error!("Failed to delete override {}: {}", id, e);
        if e.contains("not found") {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", &format!("Override not found: {}", id)),
            )
        } else {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to delete override"),
            )
        }
    })?;

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================================
// Effective Working Hours Endpoints
// ============================================================================

/// Get effective working hours for a date range
///
/// GET /api/v1/working-hours/effective
///
/// Query parameters:
/// - from_date: Start date (YYYY-MM-DD, required)
/// - to_date: End date (YYYY-MM-DD, required)
///
/// Returns: EffectiveHoursResponse with combined default + override schedule
pub async fn get_effective_hours(
    State(state): State<AppState>,
    Query(query): Query<EffectiveHoursQuery>,
) -> Result<Json<EffectiveHoursResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Validate date range (max 90 days)
    let days_diff = (query.to_date - query.from_date).num_days();
    if days_diff < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("INVALID_DATE_RANGE", "to_date must be after from_date"),
        ));
    }
    if days_diff > 90 {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("RANGE_TOO_LARGE", "Date range cannot exceed 90 days"),
        ));
    }

    let service = WorkingHoursService::new(state.pool.clone());

    let result = service.get_effective_hours(query).await.map_err(|e| {
        tracing::error!("Failed to get effective hours: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error_response("INTERNAL_ERROR", "Failed to retrieve effective working hours"),
        )
    })?;

    Ok(Json(result))
}

/// Check if a specific date is a working day
///
/// GET /api/v1/working-hours/check/:date
///
/// Path parameters:
/// - date: Date to check (YYYY-MM-DD)
///
/// Returns: JSON with is_working_day boolean
pub async fn check_working_day(
    State(state): State<AppState>,
    Path(date_str): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Parse date
    let date = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            error_response("INVALID_DATE", "Date must be in YYYY-MM-DD format"),
        )
    })?;

    let service = WorkingHoursService::new(state.pool.clone());

    let is_working = service.is_working_day(date).await.map_err(|e| {
        tracing::error!("Failed to check working day {}: {}", date, e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error_response("INTERNAL_ERROR", "Failed to check working day"),
        )
    })?;

    Ok(Json(serde_json::json!({
        "date": date_str,
        "is_working_day": is_working
    })))
}
