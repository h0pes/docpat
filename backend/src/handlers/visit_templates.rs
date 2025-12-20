/*!
 * Visit Template HTTP Handlers
 *
 * Handles HTTP requests for visit template CRUD operations.
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
        AuditAction, AuditLog, AuthUser, CreateAuditLog, CreateVisitTemplateRequest,
        EntityType, RequestContext, UpdateVisitTemplateRequest, UserRole,
    },
    services::VisitTemplateService,
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on visit_templates resource
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "visit_templates", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} visit templates",
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
            // Only ADMIN can delete templates
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete visit templates".to_string(),
                ));
            }
        }
        _ => {
            // Both ADMIN and DOCTOR can read/write templates
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden("Insufficient permissions".to_string()));
            }
        }
    }
    Ok(())
}

/// Query parameters for listing templates
#[derive(Debug, Deserialize)]
pub struct ListTemplatesQuery {
    pub active_only: Option<bool>,
}

/// Create a new visit template
///
/// POST /api/v1/visit-templates
///
/// **RBAC**: Requires 'create' permission on 'visit_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<CreateVisitTemplateRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "create").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Create template service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let template_service = VisitTemplateService::new(state.pool.clone(), encryption_key.clone());
    let template = template_service
        .create_template(req.clone(), auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create visit template: {}", e);
            AppError::Internal(format!("Failed to create visit template: {}", e))
        })?;

    // Create audit log for template creation
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Create,
            entity_type: EntityType::Template,
            entity_id: Some(template.id.to_string()),
            changes: Some(serde_json::json!({
                "template_type": "visit",
                "name": req.template_name,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::CREATED, Json(template)))
}

/// Get visit template by ID
///
/// GET /api/v1/visit-templates/:id
///
/// **RBAC**: Requires 'read' permission on 'visit_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get template service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let template_service = VisitTemplateService::new(state.pool.clone(), encryption_key.clone());
    let template = template_service
        .get_template(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get visit template {}: {}", id, e);
            AppError::Internal(format!("Failed to get visit template: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Visit template {} not found", id)))?;

    Ok(Json(template))
}

/// List visit templates for current user
///
/// GET /api/v1/visit-templates?active_only=true
///
/// **RBAC**: Requires 'read' permission on 'visit_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn list_templates(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListTemplatesQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get template service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let template_service = VisitTemplateService::new(state.pool.clone(), encryption_key.clone());
    let templates = template_service
        .list_templates(auth_user.user_id, query.active_only.unwrap_or(true))
        .await
        .map_err(|e| {
            tracing::error!("Failed to list visit templates: {}", e);
            AppError::Internal(format!("Failed to list visit templates: {}", e))
        })?;

    Ok(Json(templates))
}

/// Update visit template
///
/// PUT /api/v1/visit-templates/:id
///
/// **RBAC**: Requires 'update' permission on 'visit_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn update_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateVisitTemplateRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Update template service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let template_service = VisitTemplateService::new(state.pool.clone(), encryption_key.clone());
    let template = template_service
        .update_template(id, req.clone(), auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update visit template {}: {}", id, e);
            if e.to_string().contains("Unauthorized") {
                AppError::Forbidden(e.to_string())
            } else {
                AppError::Internal(format!("Failed to update visit template: {}", e))
            }
        })?;

    // Create audit log for template update
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Update,
            entity_type: EntityType::Template,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "template_type": "visit",
                "changes": serde_json::to_value(&req).unwrap_or_default(),
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(template))
}

/// Delete visit template (soft delete)
///
/// DELETE /api/v1/visit-templates/:id
///
/// **RBAC**: Requires 'delete' permission on 'visit_templates' resource
/// **Roles**: ADMIN only
pub async fn delete_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions (ADMIN only)
    check_permission(&state, &auth_user.role, "delete").await?;

    // Delete template service
    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let template_service = VisitTemplateService::new(state.pool.clone(), encryption_key.clone());
    template_service
        .delete_template(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete visit template {}: {}", id, e);
            if e.to_string().contains("Unauthorized") {
                AppError::Forbidden(e.to_string())
            } else {
                AppError::Internal(format!("Failed to delete visit template: {}", e))
            }
        })?;

    // Create audit log for template deletion
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(auth_user.user_id),
            action: AuditAction::Delete,
            entity_type: EntityType::Template,
            entity_id: Some(id.to_string()),
            changes: Some(serde_json::json!({
                "template_type": "visit",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(StatusCode::NO_CONTENT)
}
