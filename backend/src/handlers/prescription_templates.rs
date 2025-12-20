/*!
 * Prescription Template HTTP Handlers
 *
 * Handles HTTP requests for prescription template CRUD operations.
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
        AuditAction, AuditLog, AuthUser, CreateAuditLog, CreatePrescriptionTemplateRequest,
        EntityType, RequestContext, UpdatePrescriptionTemplateRequest, UserRole,
    },
    services::PrescriptionTemplateService,
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to perform action on prescription_templates resource
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "prescription_templates", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} prescription templates",
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
                    "Only administrators can delete prescription templates".to_string(),
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

/// Create a new prescription template
///
/// POST /api/v1/prescription-templates
///
/// **RBAC**: Requires 'create' permission on 'prescription_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn create_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<CreatePrescriptionTemplateRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "create").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Create template service
    let template_service = PrescriptionTemplateService::new(state.pool.clone());
    let template = template_service
        .create_template(req.clone(), auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create prescription template: {}", e);
            AppError::Internal(format!("Failed to create prescription template: {}", e))
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
                "template_type": "prescription",
                "name": req.template_name,
                "medication_count": req.medications.len(),
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::CREATED, Json(template)))
}

/// Get prescription template by ID
///
/// GET /api/v1/prescription-templates/:id
///
/// **RBAC**: Requires 'read' permission on 'prescription_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get template service
    let template_service = PrescriptionTemplateService::new(state.pool.clone());
    let template = template_service
        .get_template(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get prescription template {}: {}", id, e);
            AppError::Internal(format!("Failed to get prescription template: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Prescription template {} not found", id)))?;

    Ok(Json(template))
}

/// List prescription templates for current user
///
/// GET /api/v1/prescription-templates?active_only=true
///
/// **RBAC**: Requires 'read' permission on 'prescription_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn list_templates(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListTemplatesQuery>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "read").await?;

    // Get template service
    let template_service = PrescriptionTemplateService::new(state.pool.clone());
    let templates = template_service
        .list_templates(auth_user.user_id, query.active_only.unwrap_or(true))
        .await
        .map_err(|e| {
            tracing::error!("Failed to list prescription templates: {}", e);
            AppError::Internal(format!("Failed to list prescription templates: {}", e))
        })?;

    Ok(Json(templates))
}

/// Update prescription template
///
/// PUT /api/v1/prescription-templates/:id
///
/// **RBAC**: Requires 'update' permission on 'prescription_templates' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn update_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePrescriptionTemplateRequest>,
) -> Result<impl IntoResponse> {
    // Check permissions
    check_permission(&state, &auth_user.role, "update").await?;

    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Update template service
    let template_service = PrescriptionTemplateService::new(state.pool.clone());
    let template = template_service
        .update_template(id, req.clone(), auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update prescription template {}: {}", id, e);
            if e.to_string().contains("Unauthorized") {
                AppError::Forbidden(e.to_string())
            } else {
                AppError::Internal(format!("Failed to update prescription template: {}", e))
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
                "template_type": "prescription",
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

/// Delete prescription template (soft delete)
///
/// DELETE /api/v1/prescription-templates/:id
///
/// **RBAC**: Requires 'delete' permission on 'prescription_templates' resource
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
    let template_service = PrescriptionTemplateService::new(state.pool.clone());
    template_service
        .delete_template(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete prescription template {}: {}", id, e);
            if e.to_string().contains("Unauthorized") {
                AppError::Forbidden(e.to_string())
            } else {
                AppError::Internal(format!("Failed to delete prescription template: {}", e))
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
                "template_type": "prescription",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(StatusCode::NO_CONTENT)
}
