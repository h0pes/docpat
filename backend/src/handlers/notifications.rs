/*!
 * Notification HTTP Handlers
 *
 * Handles HTTP requests for notification management including:
 * - Listing and viewing notifications
 * - Retrying failed notifications
 * - Cancelling pending notifications
 * - Managing patient notification preferences
 * - Sending test emails
 */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::{
    handlers::auth::AppState,
    models::{
        AuditAction, AuditLog, AuthUser, CreateAuditLog, CreateNotificationRequest, EntityType,
        NotificationFilter, RequestContext, SendTestEmailRequest, UpdateNotificationPreferencesRequest,
        UserRole,
    },
    services::NotificationService,
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on notifications resource
#[cfg(feature = "rbac")]
async fn check_permission(state: &AppState, user_role: &UserRole, action: &str) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "notifications", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} notifications",
            action
        )));
    }

    Ok(())
}

/// Fallback for non-RBAC builds - only checks role
#[cfg(not(feature = "rbac"))]
async fn check_permission(_state: &AppState, user_role: &UserRole, action: &str) -> Result<()> {
    // Simple role-based check without Casbin
    match action {
        "delete" => {
            // Only ADMIN can delete notifications
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete notifications".to_string(),
                ));
            }
        }
        _ => {
            // Both ADMIN and DOCTOR can read/write notifications
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden("Insufficient permissions".to_string()));
            }
        }
    }
    Ok(())
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

/// List notifications with filtering
///
/// GET /api/v1/notifications
///
/// **RBAC**: Requires 'read' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
///
/// Query parameters:
/// - `patient_id`: Filter by patient UUID
/// - `appointment_id`: Filter by appointment UUID
/// - `notification_type`: Filter by type (APPOINTMENT_REMINDER, etc.)
/// - `status`: Filter by status (PENDING, SENT, FAILED, CANCELLED)
/// - `from_date`: Filter from date (ISO 8601)
/// - `to_date`: Filter to date (ISO 8601)
/// - `offset`: Pagination offset (default 0)
/// - `limit`: Pagination limit (default 50, max 100)
pub async fn list_notifications(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(filter): Query<NotificationFilter>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get email service and create notification service
    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let result = notification_service.list_notifications(filter, auth_user.user_id).await.map_err(|e| {
        tracing::error!("Failed to list notifications: {}", e);
        AppError::Internal(format!("Failed to list notifications: {}", e))
    })?;

    Ok(Json(result))
}

/// Get notification by ID
///
/// GET /api/v1/notifications/:id
///
/// **RBAC**: Requires 'read' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_notification(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let notification = notification_service
        .get_notification(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get notification {}: {}", id, e);
            AppError::Internal(format!("Failed to get notification: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Notification {} not found", id)))?;

    Ok(Json(notification))
}

/// Create a new notification
///
/// POST /api/v1/notifications
///
/// **RBAC**: Requires 'create' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_notification(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<CreateNotificationRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "create").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let notification = notification_service
        .create_notification(req.clone(), auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create notification: {}", e);
            AppError::Internal(format!("Failed to create notification: {}", e))
        })?;

    // Create audit log
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Notification,
            entity_id: Some(notification.id.to_string()),
            changes: Some(serde_json::json!({
                "notification_type": req.notification_type,
                "delivery_method": req.delivery_method,
                "recipient_email": req.recipient_email,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::CREATED, Json(notification)))
}

/// Retry a failed notification
///
/// POST /api/v1/notifications/:id/retry
///
/// **RBAC**: Requires 'update' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn retry_notification(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let notification = notification_service.retry_notification(id, auth_user.user_id).await.map_err(|e| {
        tracing::error!("Failed to retry notification {}: {}", id, e);
        AppError::BadRequest(format!("Failed to retry notification: {}", e))
    })?;

    // Create audit log
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Notification,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "retry",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(notification))
}

/// Cancel a pending notification
///
/// DELETE /api/v1/notifications/:id
///
/// **RBAC**: Requires 'update' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR (cancelling is an update, not delete)
pub async fn cancel_notification(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions - cancelling is treated as an update
    check_permission(&state, &auth_user.role, "update").await?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let notification = notification_service.cancel_notification(id, auth_user.user_id).await.map_err(|e| {
        tracing::error!("Failed to cancel notification {}: {}", id, e);
        AppError::BadRequest(format!("Failed to cancel notification: {}", e))
    })?;

    // Create audit log
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Notification,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "action": "cancel",
                "new_status": "CANCELLED",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(notification))
}

/// Get notification statistics
///
/// GET /api/v1/notifications/statistics
///
/// **RBAC**: Requires 'read' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_notification_statistics(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let statistics = notification_service.get_statistics(auth_user.user_id).await.map_err(|e| {
        tracing::error!("Failed to get notification statistics: {}", e);
        AppError::Internal(format!("Failed to get statistics: {}", e))
    })?;

    Ok(Json(statistics))
}

// ============================================================================
// PATIENT PREFERENCES HANDLERS
// ============================================================================

/// Get patient notification preferences
///
/// GET /api/v1/patients/:patient_id/notification-preferences
///
/// **RBAC**: Requires 'read' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_patient_preferences(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(patient_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let preferences = notification_service
        .get_patient_preferences(patient_id, auth_user.user_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("Patient not found") {
                tracing::warn!("Patient {} not found for preferences request", patient_id);
                AppError::NotFound(format!("Patient {} not found", patient_id))
            } else {
                tracing::error!("Failed to get patient {} preferences: {}", patient_id, e);
                AppError::Internal(format!("Failed to get preferences: {}", e))
            }
        })?;

    Ok(Json(preferences))
}

/// Update patient notification preferences
///
/// PUT /api/v1/patients/:patient_id/notification-preferences
///
/// **RBAC**: Requires 'update' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn update_patient_preferences(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(patient_id): Path<Uuid>,
    Json(req): Json<UpdateNotificationPreferencesRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::Internal("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let preferences = notification_service
        .update_patient_preferences(patient_id, req.clone(), auth_user.user_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("Patient not found") {
                tracing::warn!("Patient {} not found for preferences update", patient_id);
                AppError::NotFound(format!("Patient {} not found", patient_id))
            } else {
                tracing::error!("Failed to update patient {} preferences: {}", patient_id, e);
                AppError::Internal(format!("Failed to update preferences: {}", e))
            }
        })?;

    // Create audit log
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Patient,
            entity_id: Some(patient_id.to_string()),
            changes: Some(serde_json::json!({
                "field": "notification_preferences",
                "email_enabled": req.email_enabled,
                "reminder_enabled": req.reminder_enabled,
                "reminder_days_before": req.reminder_days_before,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(preferences))
}

// ============================================================================
// TEST EMAIL HANDLER
// ============================================================================

/// Send a test email to verify SMTP configuration
///
/// POST /api/v1/notifications/send-test
///
/// **RBAC**: Requires 'create' permission on 'notifications' resource
/// **Roles**: ADMIN only (sensitive operation)
pub async fn send_test_email(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<SendTestEmailRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions - restrict to admin
    check_permission(&state, &auth_user.role, "create").await?;

    // Additional admin check for this sensitive operation
    if !matches!(auth_user.role, UserRole::Admin) {
        return Err(AppError::Forbidden(
            "Only administrators can send test emails".to_string(),
        ));
    }

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let email_service = state
        .email_service
        .clone()
        .ok_or_else(|| AppError::BadRequest("Email service not configured".to_string()))?;

    let notification_service = NotificationService::new(state.pool.clone(), email_service);
    let to_name = req.to_name.as_deref().unwrap_or("Test Recipient");

    let result = notification_service
        .send_test_email(&req.to_email, to_name)
        .await
        .map_err(|e| {
            tracing::error!("Failed to send test email to {}: {}", req.to_email, e);
            AppError::Internal(format!("Failed to send test email: {}", e))
        })?;

    // Create audit log
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Notification,
            entity_id: None,
            changes: Some(serde_json::json!({
                "action": "send_test_email",
                "to_email": req.to_email,
                "success": result.success,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    let response = crate::models::SendTestEmailResponse {
        success: result.success,
        message: result.message,
    };

    if result.success {
        Ok((StatusCode::OK, Json(response)))
    } else {
        Ok((StatusCode::BAD_REQUEST, Json(response)))
    }
}

// ============================================================================
// EMAIL STATUS HANDLER
// ============================================================================

/// Get email service status
///
/// GET /api/v1/notifications/email-status
///
/// **RBAC**: Requires 'read' permission on 'notifications' resource
/// **Roles**: ADMIN, DOCTOR
///
/// Returns whether email service is enabled and configured
#[derive(serde::Serialize)]
pub struct EmailStatusResponse {
    pub enabled: bool,
    pub configured: bool,
}

pub async fn get_email_status(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    let response = match &state.email_service {
        Some(service) => EmailStatusResponse {
            enabled: service.is_enabled(),
            configured: true,
        },
        None => EmailStatusResponse {
            enabled: false,
            configured: false,
        },
    };

    Ok(Json(response))
}
