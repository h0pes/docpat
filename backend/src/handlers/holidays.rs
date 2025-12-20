/*!
 * Holiday HTTP Handlers
 *
 * HTTP request handlers for holiday and vacation calendar management.
 * All endpoints require authentication and most require ADMIN role.
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::handlers::auth::AppState;
use crate::models::holiday::{
    CheckHolidayResponse, CreateHolidayRequest, HolidayResponse, HolidaysFilter,
    ImportHolidaysResponse, ImportNationalHolidaysRequest, ListHolidaysResponse,
    UpdateHolidayRequest,
};
use crate::models::{AuditAction, AuditLog, CreateAuditLog, EntityType, RequestContext, UserRole};
use crate::services::HolidayService;

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
// Holiday CRUD Endpoints
// ============================================================================

/// List holidays with filters
///
/// GET /api/v1/holidays
///
/// Query parameters:
/// - from_date: Start date for filter (YYYY-MM-DD)
/// - to_date: End date for filter (YYYY-MM-DD)
/// - holiday_type: Filter by type (NATIONAL, PRACTICE_CLOSED, VACATION)
/// - year: Filter by year (e.g., 2025)
/// - include_recurring: Include recurring holidays in range (true/false)
///
/// Returns: ListHolidaysResponse
pub async fn list_holidays(
    State(state): State<AppState>,
    Query(filter): Query<HolidaysFilter>,
) -> Result<Json<ListHolidaysResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = HolidayService::new(state.pool.clone());

    let result = service.list_holidays(filter).await.map_err(|e| {
        tracing::error!("Failed to list holidays: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error_response("INTERNAL_ERROR", "Failed to retrieve holidays"),
        )
    })?;

    Ok(Json(result))
}

/// Get a single holiday by ID
///
/// GET /api/v1/holidays/:id
///
/// Path parameters:
/// - id: Holiday UUID
///
/// Returns: HolidayResponse
pub async fn get_holiday(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<HolidayResponse>, (StatusCode, Json<serde_json::Value>)> {
    let service = HolidayService::new(state.pool.clone());

    let result = service
        .get_holiday(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get holiday {}: {}", id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve holiday"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", &format!("Holiday not found: {}", id)),
            )
        })?;

    Ok(Json(result))
}

/// Create a new holiday
///
/// POST /api/v1/holidays
///
/// Body: CreateHolidayRequest
///
/// Returns: Created HolidayResponse
pub async fn create_holiday(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(request): Json<CreateHolidayRequest>,
) -> Result<(StatusCode, Json<HolidayResponse>), (StatusCode, Json<serde_json::Value>)> {
    // Only admins can create holidays
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Validate the request
    use validator::Validate;
    request.validate().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            error_response("VALIDATION_ERROR", &e.to_string()),
        )
    })?;

    // Validate that holiday date is not in the past
    let today = Utc::now().date_naive();
    if request.holiday_date < today {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response(
                "PAST_DATE",
                "Holiday date cannot be in the past. Please select today or a future date.",
            ),
        ));
    }

    let service = HolidayService::new(state.pool.clone());

    let result = service
        .create_holiday(request.clone(), user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create holiday: {}", e);
            if e.contains("already exists") {
                (
                    StatusCode::CONFLICT,
                    error_response("DUPLICATE_DATE", &e),
                )
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to create holiday"),
                )
            }
        })?;

    // Create audit log for holiday creation
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Holiday,
            entity_id: Some(result.id.to_string()),
            changes: Some(serde_json::json!({
                "name": request.name,
                "holiday_date": request.holiday_date.to_string(),
                "holiday_type": format!("{:?}", request.holiday_type),
                "is_recurring": request.is_recurring,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::CREATED, Json(result)))
}

/// Update an existing holiday
///
/// PUT /api/v1/holidays/:id
///
/// Path parameters:
/// - id: Holiday UUID
///
/// Body: UpdateHolidayRequest
///
/// Returns: Updated HolidayResponse
pub async fn update_holiday(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateHolidayRequest>,
) -> Result<Json<HolidayResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can update holidays
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Validate the request
    use validator::Validate;
    request.validate().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            error_response("VALIDATION_ERROR", &e.to_string()),
        )
    })?;

    // Validate that new holiday date (if provided) is not in the past
    if let Some(new_date) = request.holiday_date {
        let today = Utc::now().date_naive();
        if new_date < today {
            return Err((
                StatusCode::BAD_REQUEST,
                error_response(
                    "PAST_DATE",
                    "Holiday date cannot be in the past. Please select today or a future date.",
                ),
            ));
        }
    }

    let service = HolidayService::new(state.pool.clone());

    let result = service
        .update_holiday(id, request.clone(), user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update holiday {}: {}", id, e);
            if e.contains("not found") {
                (
                    StatusCode::NOT_FOUND,
                    error_response("NOT_FOUND", &format!("Holiday not found: {}", id)),
                )
            } else if e.contains("already exists") {
                (
                    StatusCode::CONFLICT,
                    error_response("DUPLICATE_DATE", &e),
                )
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to update holiday"),
                )
            }
        })?;

    // Create audit log for holiday update
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Holiday,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::to_value(&request).unwrap_or_default()),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(result))
}

/// Delete a holiday
///
/// DELETE /api/v1/holidays/:id
///
/// Path parameters:
/// - id: Holiday UUID
///
/// Returns: 204 No Content on success
pub async fn delete_holiday(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can delete holidays
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let service = HolidayService::new(state.pool.clone());

    service.delete_holiday(id).await.map_err(|e| {
        tracing::error!("Failed to delete holiday {}: {}", id, e);
        if e.contains("not found") {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", &format!("Holiday not found: {}", id)),
            )
        } else {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to delete holiday"),
            )
        }
    })?;

    // Create audit log for holiday deletion
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Delete,
            entity_type: EntityType::Holiday,
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

// ============================================================================
// Holiday Check Endpoint
// ============================================================================

/// Check if a specific date is a holiday
///
/// GET /api/v1/holidays/check/:date
///
/// Path parameters:
/// - date: Date to check (YYYY-MM-DD)
///
/// Returns: CheckHolidayResponse with is_holiday boolean and optional holiday details
pub async fn check_holiday(
    State(state): State<AppState>,
    Path(date_str): Path<String>,
) -> Result<Json<CheckHolidayResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Parse date
    let date = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            error_response("INVALID_DATE", "Date must be in YYYY-MM-DD format"),
        )
    })?;

    let service = HolidayService::new(state.pool.clone());

    let result = service.check_holiday(date).await.map_err(|e| {
        tracing::error!("Failed to check holiday {}: {}", date, e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error_response("INTERNAL_ERROR", "Failed to check holiday"),
        )
    })?;

    Ok(Json(result))
}

// ============================================================================
// Import National Holidays Endpoint
// ============================================================================

/// Import Italian national holidays for a specific year
///
/// POST /api/v1/holidays/import-national
///
/// Body: ImportNationalHolidaysRequest
/// - year: Year to import holidays for (e.g., 2025)
/// - override_existing: Whether to override existing holidays (default: false)
///
/// Returns: ImportHolidaysResponse with count of imported/skipped holidays
pub async fn import_national_holidays(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(request): Json<ImportNationalHolidaysRequest>,
) -> Result<(StatusCode, Json<ImportHolidaysResponse>), (StatusCode, Json<serde_json::Value>)> {
    // Only admins can import holidays
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Validate year range
    if request.year < 2020 || request.year > 2100 {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("INVALID_YEAR", "Year must be between 2020 and 2100"),
        ));
    }

    let service = HolidayService::new(state.pool.clone());

    let result = service
        .import_national_holidays(request.clone(), user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to import national holidays: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to import national holidays"),
            )
        })?;

    // Create audit log for holiday import
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Holiday,
            entity_id: None,
            changes: Some(serde_json::json!({
                "action": "import_national_holidays",
                "year": request.year,
                "override_existing": request.override_existing,
                "imported_count": result.imported_count,
                "skipped_count": result.skipped_count,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::CREATED, Json(result)))
}

// ============================================================================
// Holidays Range Endpoint (for calendar display)
// ============================================================================

/// Get holidays for a date range (useful for calendar display)
///
/// GET /api/v1/holidays/range
///
/// Query parameters:
/// - from_date: Start date (YYYY-MM-DD, required)
/// - to_date: End date (YYYY-MM-DD, required)
///
/// Returns: List of holidays including resolved recurring holidays
#[derive(Debug, serde::Deserialize)]
pub struct HolidayRangeQuery {
    pub from_date: chrono::NaiveDate,
    pub to_date: chrono::NaiveDate,
}

pub async fn get_holidays_range(
    State(state): State<AppState>,
    Query(query): Query<HolidayRangeQuery>,
) -> Result<Json<Vec<HolidayResponse>>, (StatusCode, Json<serde_json::Value>)> {
    // Validate date range (max 1 year)
    let days_diff = (query.to_date - query.from_date).num_days();
    if days_diff < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("INVALID_DATE_RANGE", "to_date must be after from_date"),
        ));
    }
    if days_diff > 366 {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("RANGE_TOO_LARGE", "Date range cannot exceed 1 year"),
        ));
    }

    let service = HolidayService::new(state.pool.clone());

    let result = service
        .get_holidays_for_range(query.from_date, query.to_date)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get holidays for range: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve holidays"),
            )
        })?;

    Ok(Json(result))
}
