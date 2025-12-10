/*!
 * Settings HTTP Handlers
 *
 * HTTP request handlers for system settings management.
 * All endpoints require authentication and most require ADMIN role.
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::handlers::auth::AppState;
use crate::models::system_setting::{
    BulkUpdateSettingsRequest, ListSettingGroupsResponse, ListSettingsResponse, SettingsFilter,
    SystemSettingResponse, UpdateSettingRequest,
};
use crate::models::UserRole;

#[cfg(feature = "rbac")]
use crate::utils::permissions::require_admin;

/// Query parameters for listing settings
#[derive(Debug, Deserialize, Default)]
pub struct ListSettingsQuery {
    /// Filter by setting group
    pub group: Option<String>,
    /// Only return public settings
    pub public_only: Option<bool>,
    /// Search term for key or name
    pub search: Option<String>,
}

/// Error response structure
#[derive(Debug, serde::Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
}

/// Create error response helper
fn error_response(error: &str, message: &str) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "error": error,
        "message": message
    }))
}

/// List all settings with optional filters
///
/// GET /api/v1/settings
///
/// Query parameters:
/// - group: Filter by setting group (clinic, appointment, security, etc.)
/// - public_only: Only return public settings
/// - search: Search term for key or name
///
/// Returns: ListSettingsResponse with all matching settings
pub async fn list_settings(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ListSettingsQuery>,
) -> Result<Json<ListSettingsResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if user is requesting public settings only
    let public_only = query.public_only.unwrap_or(false);

    // Non-admin users can only see public settings
    #[cfg(feature = "rbac")]
    let public_only = if user_role != UserRole::Admin {
        true
    } else {
        public_only
    };

    let filter = SettingsFilter {
        group: query.group,
        public_only: Some(public_only),
        search: query.search,
    };

    let result = state
        .settings_service
        .list_settings(filter)
        .await
        .map_err(|e| {
            tracing::error!("Failed to list settings: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve settings"),
            )
        })?;

    Ok(Json(result))
}

/// Get a single setting by key
///
/// GET /api/v1/settings/:key
///
/// Path parameters:
/// - key: The setting key (e.g., "clinic.name")
///
/// Returns: SystemSettingResponse for the requested setting
pub async fn get_setting(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Path(key): Path<String>,
) -> Result<Json<SystemSettingResponse>, (StatusCode, Json<serde_json::Value>)> {
    let setting = state
        .settings_service
        .get_setting(&key)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get setting {}: {}", key, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve setting"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", &format!("Setting not found: {}", key)),
            )
        })?;

    // Non-admin users can only see public settings
    #[cfg(feature = "rbac")]
    if user_role != UserRole::Admin && !setting.is_public {
        return Err((
            StatusCode::FORBIDDEN,
            error_response("FORBIDDEN", "Access denied to this setting"),
        ));
    }

    Ok(Json(setting))
}

/// Update a setting value
///
/// PUT /api/v1/settings/:key
///
/// Path parameters:
/// - key: The setting key to update
///
/// Body: UpdateSettingRequest with the new value
///
/// Returns: Updated SystemSettingResponse
pub async fn update_setting(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Path(key): Path<String>,
    Json(request): Json<UpdateSettingRequest>,
) -> Result<Json<SystemSettingResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can update settings
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let result = state
        .settings_service
        .update_setting(&key, request, user_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("not found") {
                (
                    StatusCode::NOT_FOUND,
                    error_response("NOT_FOUND", &format!("Setting not found: {}", key)),
                )
            } else if error_msg.contains("readonly") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("READONLY_SETTING", &error_msg),
                )
            } else if error_msg.contains("does not match") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("INVALID_VALUE_TYPE", &error_msg),
                )
            } else {
                tracing::error!("Failed to update setting {}: {}", key, e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to update setting"),
                )
            }
        })?;

    Ok(Json(result))
}

/// Bulk update multiple settings
///
/// POST /api/v1/settings/bulk
///
/// Body: BulkUpdateSettingsRequest with list of settings to update
///
/// Returns: List of updated SystemSettingResponse
pub async fn bulk_update_settings(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Json(request): Json<BulkUpdateSettingsRequest>,
) -> Result<Json<Vec<SystemSettingResponse>>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can update settings
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    if request.settings.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            error_response("INVALID_REQUEST", "At least one setting is required"),
        ));
    }

    let results = state
        .settings_service
        .bulk_update_settings(request, user_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("failed to update") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("BULK_UPDATE_FAILED", &error_msg),
                )
            } else {
                tracing::error!("Failed to bulk update settings: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to update settings"),
                )
            }
        })?;

    Ok(Json(results))
}

/// Reset a setting to its default value
///
/// POST /api/v1/settings/reset/:key
///
/// Path parameters:
/// - key: The setting key to reset
///
/// Returns: Reset SystemSettingResponse
pub async fn reset_setting(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Path(key): Path<String>,
) -> Result<Json<SystemSettingResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can reset settings
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let result = state
        .settings_service
        .reset_setting(&key, user_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("not found") {
                (
                    StatusCode::NOT_FOUND,
                    error_response("NOT_FOUND", &format!("Setting not found: {}", key)),
                )
            } else if error_msg.contains("readonly") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("READONLY_SETTING", &error_msg),
                )
            } else if error_msg.contains("no default value") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("NO_DEFAULT_VALUE", &error_msg),
                )
            } else {
                tracing::error!("Failed to reset setting {}: {}", key, e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to reset setting"),
                )
            }
        })?;

    Ok(Json(result))
}

/// List all setting groups with counts
///
/// GET /api/v1/settings/groups
///
/// Returns: ListSettingGroupsResponse with all groups and their setting counts
pub async fn list_groups(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
) -> Result<Json<ListSettingGroupsResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can see all groups
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let result = state
        .settings_service
        .list_groups()
        .await
        .map_err(|e| {
            tracing::error!("Failed to list setting groups: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve setting groups"),
            )
        })?;

    Ok(Json(result))
}

/// Get settings by group
///
/// GET /api/v1/settings/group/:group
///
/// Path parameters:
/// - group: The setting group (clinic, appointment, security, etc.)
///
/// Returns: ListSettingsResponse with settings in the specified group
pub async fn get_settings_by_group(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Path(group): Path<String>,
) -> Result<Json<ListSettingsResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can see all settings in a group
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let result = state
        .settings_service
        .get_settings_by_group(&group)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get settings for group {}: {}", group, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve settings"),
            )
        })?;

    Ok(Json(result))
}
