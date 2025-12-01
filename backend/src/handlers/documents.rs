/*!
 * Document HTTP Handlers
 *
 * Handles HTTP requests for document template and generated document operations,
 * including PDF generation, downloading, signing, and delivery.
 */

use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use serde::Deserialize;
use std::path::PathBuf;
use tokio_util::io::ReaderStream;
use uuid::Uuid;
use validator::Validate;

use crate::{
    handlers::auth::AppState,
    models::{
        AuthUser, CreateDocumentTemplateRequest, DeliverDocumentRequest,
        DocumentTemplateFilter, DocumentType, GenerateDocumentRequest, GeneratedDocumentFilter,
        TemplateLanguage, UpdateDocumentTemplateRequest, UserRole,
    },
    services::{generate_document_email_body, DocumentService},
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

// ==================== Permission Checking ====================

/// Check if user has permission to perform action on document_templates resource
#[cfg(feature = "rbac")]
async fn check_template_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "document_templates", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} document templates",
            action
        )));
    }

    Ok(())
}

#[cfg(not(feature = "rbac"))]
async fn check_template_permission(
    _state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    match action {
        "delete" => {
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete document templates".to_string(),
                ));
            }
        }
        _ => {
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden("Insufficient permissions".to_string()));
            }
        }
    }
    Ok(())
}

/// Check if user has permission to perform action on generated_documents resource
#[cfg(feature = "rbac")]
async fn check_document_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "generated_documents", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} documents",
            action
        )));
    }

    Ok(())
}

#[cfg(not(feature = "rbac"))]
async fn check_document_permission(
    _state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    match action {
        "delete" => {
            if !matches!(user_role, UserRole::Admin) {
                return Err(AppError::Forbidden(
                    "Only administrators can delete documents".to_string(),
                ));
            }
        }
        _ => {
            if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
                return Err(AppError::Forbidden("Insufficient permissions".to_string()));
            }
        }
    }
    Ok(())
}

// ==================== Query Parameters ====================

/// Query parameters for listing document templates
#[derive(Debug, Default, Deserialize)]
pub struct ListDocumentTemplatesQuery {
    pub document_type: Option<String>,
    pub language: Option<String>,
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Query parameters for listing generated documents
#[derive(Debug, Default, Deserialize)]
pub struct ListGeneratedDocumentsQuery {
    pub patient_id: Option<Uuid>,
    pub visit_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub document_type: Option<String>,
    pub status: Option<String>,
    pub is_signed: Option<bool>,
    pub from_date: Option<chrono::DateTime<chrono::Utc>>,
    pub to_date: Option<chrono::DateTime<chrono::Utc>>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// ==================== Document Template Handlers ====================

/// Create a new document template
///
/// POST /api/v1/document-templates
pub async fn create_document_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateDocumentTemplateRequest>,
) -> Result<impl IntoResponse> {
    check_template_permission(&state, &auth_user.role, "create").await?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let template = service
        .create_template(req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create document template: {}", e);
            AppError::Internal(format!("Failed to create document template: {}", e))
        })?;

    Ok((StatusCode::CREATED, Json(template)))
}

/// Get document template by ID
///
/// GET /api/v1/document-templates/:id
pub async fn get_document_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_template_permission(&state, &auth_user.role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let template = service
        .get_template(id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get document template {}: {}", id, e);
            AppError::Internal(format!("Failed to get document template: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Document template {} not found", id)))?;

    Ok(Json(template))
}

/// Get default template for document type and language
///
/// GET /api/v1/document-templates/default?document_type=...&language=...
pub async fn get_default_document_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListDocumentTemplatesQuery>,
) -> Result<impl IntoResponse> {
    check_template_permission(&state, &auth_user.role, "read").await?;

    let document_type = query
        .document_type
        .as_ref()
        .and_then(|dt| DocumentType::from_str(dt))
        .ok_or_else(|| AppError::BadRequest("document_type is required".to_string()))?;

    let language = query
        .language
        .as_ref()
        .map(|l| TemplateLanguage::from_str(l))
        .unwrap_or(TemplateLanguage::Italian);

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let template = service
        .get_default_template(document_type, language)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get default document template: {}", e);
            AppError::Internal(format!("Failed to get default template: {}", e))
        })?
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "No default template found for type {} and language {:?}",
                document_type.as_str(),
                language
            ))
        })?;

    Ok(Json(template))
}

/// List document templates
///
/// GET /api/v1/document-templates?document_type=...&language=...&is_active=true&limit=20&offset=0
pub async fn list_document_templates(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListDocumentTemplatesQuery>,
) -> Result<impl IntoResponse> {
    check_template_permission(&state, &auth_user.role, "read").await?;

    let filter = DocumentTemplateFilter {
        document_type: query.document_type.as_ref().and_then(|dt| DocumentType::from_str(dt)),
        language: query.language.as_ref().map(|l| TemplateLanguage::from_str(l)),
        is_active: query.is_active,
        is_default: query.is_default,
        search: query.search.clone(),
    };

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let result = service
        .list_templates(filter, query.limit.unwrap_or(20), query.offset.unwrap_or(0))
        .await
        .map_err(|e| {
            tracing::error!("Failed to list document templates: {}", e);
            AppError::Internal(format!("Failed to list document templates: {}", e))
        })?;

    Ok(Json(result))
}

/// Update document template
///
/// PUT /api/v1/document-templates/:id
pub async fn update_document_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDocumentTemplateRequest>,
) -> Result<impl IntoResponse> {
    check_template_permission(&state, &auth_user.role, "update").await?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let template = service
        .update_template(id, req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update document template {}: {}", id, e);
            AppError::Internal(format!("Failed to update document template: {}", e))
        })?;

    Ok(Json(template))
}

/// Delete document template (soft delete)
///
/// DELETE /api/v1/document-templates/:id
pub async fn delete_document_template(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_template_permission(&state, &auth_user.role, "delete").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    service
        .delete_template(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete document template {}: {}", id, e);
            AppError::Internal(format!("Failed to delete document template: {}", e))
        })?;

    Ok(StatusCode::NO_CONTENT)
}

// ==================== Generated Document Handlers ====================

/// Generate a new document from a template
///
/// POST /api/v1/documents/generate
pub async fn generate_document(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<GenerateDocumentRequest>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "create").await?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let document = service
        .generate_document(req, auth_user.user_id)
        .await
        .map_err(|e| {
            // Log the full error chain for debugging
            tracing::error!("Failed to generate document: {:?}", e);
            // Return detailed error message
            AppError::Internal(format!("Failed to generate document: {:#}", e))
        })?;

    Ok((StatusCode::CREATED, Json(document)))
}

/// Get generated document by ID
///
/// GET /api/v1/documents/:id
pub async fn get_generated_document(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let document = service
        .get_document(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get document {}: {}", id, e);
            AppError::Internal(format!("Failed to get document: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Document {} not found", id)))?;

    Ok(Json(document))
}

/// Download generated document PDF
///
/// GET /api/v1/documents/:id/download
pub async fn download_document(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);

    // Get document to verify it exists and get filename
    let document = service
        .get_document(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get document {}: {}", id, e);
            AppError::Internal(format!("Failed to get document: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Document {} not found", id)))?;

    // Get file path
    let file_path = service
        .get_document_file_path(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get document file path {}: {}", id, e);
            AppError::Internal(format!("Failed to get document file: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound("Document file not found".to_string()))?;

    // Open file
    let file = tokio::fs::File::open(&file_path)
        .await
        .map_err(|e| {
            tracing::error!("Failed to open document file {}: {}", file_path, e);
            AppError::Internal("Failed to open document file".to_string())
        })?;

    // Stream file as response
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let headers = [
        (header::CONTENT_TYPE, "application/pdf".to_string()),
        (
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", document.document_filename),
        ),
    ];

    Ok((headers, body))
}

/// List generated documents
///
/// GET /api/v1/documents?patient_id=...&limit=20&offset=0
pub async fn list_generated_documents(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListGeneratedDocumentsQuery>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "read").await?;

    let filter = GeneratedDocumentFilter {
        patient_id: query.patient_id,
        visit_id: query.visit_id,
        provider_id: query.provider_id,
        document_type: query
            .document_type
            .as_ref()
            .and_then(|dt| DocumentType::from_str(dt)),
        status: query
            .status
            .as_ref()
            .and_then(|s| crate::models::DocumentStatus::from_str(s)),
        is_signed: query.is_signed,
        from_date: query.from_date,
        to_date: query.to_date,
    };

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let result = service
        .list_documents(filter, query.limit.unwrap_or(20), query.offset.unwrap_or(0), auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to list documents: {}", e);
            AppError::Internal(format!("Failed to list documents: {}", e))
        })?;

    Ok(Json(result))
}

/// Mark document as delivered
///
/// POST /api/v1/documents/:id/deliver
///
/// If delivery_method is "email" and email service is configured,
/// this will send the document as a PDF attachment to the delivered_to address.
pub async fn deliver_document(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<DeliverDocumentRequest>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "update").await?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path.clone());

    // Check if this is an email delivery
    let is_email_delivery = req.delivery_method.as_ref()
        .map(|m| m.eq_ignore_ascii_case("email"))
        .unwrap_or(false);

    // If email delivery requested, try to send the email first
    if is_email_delivery {
        // Check if email service is available
        let email_service = state.email_service.as_ref()
            .ok_or_else(|| AppError::BadRequest(
                "Email service is not configured. Please configure SMTP settings to enable email delivery.".to_string()
            ))?;

        // Get document details for the email
        let document = service
            .get_document(id, auth_user.user_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get document {} for email: {}", id, e);
                AppError::Internal(format!("Failed to get document: {}", e))
            })?
            .ok_or_else(|| AppError::NotFound(format!("Document {} not found", id)))?;

        // Get the file path for attachment
        let file_path = service
            .get_document_file_path(id, auth_user.user_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get document file path {}: {}", id, e);
                AppError::Internal(format!("Failed to get document file: {}", e))
            })?
            .ok_or_else(|| AppError::NotFound("Document file not found".to_string()))?;

        // Get patient name from database
        let patient_name = sqlx::query_scalar!(
            r#"SELECT first_name || ' ' || last_name as name FROM patients WHERE id = $1"#,
            document.patient_id
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patient name: {}", e);
            AppError::Internal("Failed to get patient information".to_string())
        })?
        .flatten()
        .unwrap_or_else(|| "Patient".to_string());

        // Get doctor name from database
        let doctor_name = sqlx::query_scalar!(
            r#"SELECT first_name || ' ' || last_name as name FROM users WHERE id = $1"#,
            auth_user.user_id
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get doctor name: {}", e);
            AppError::Internal("Failed to get doctor information".to_string())
        })?
        .flatten()
        .map(|name| format!("Dr. {}", name))
        .unwrap_or_else(|| "Dr.".to_string());

        let practice_name = std::env::var("SMTP_FROM_NAME")
            .unwrap_or_else(|_| "DocPat Medical Practice".to_string());

        // Generate email body
        let (plain_text, html) = generate_document_email_body(
            &patient_name,
            &document.document_title,
            &doctor_name,
            &practice_name,
        );

        // Send the email
        let email_result = email_service
            .send_document(
                &req.delivered_to,
                &patient_name,
                &format!("Medical Document: {}", document.document_title),
                &plain_text,
                Some(&html),
                &std::path::Path::new(&file_path),
                &document.document_filename,
            )
            .await
            .map_err(|e| {
                tracing::error!("Failed to send email for document {}: {}", id, e);
                AppError::Internal(format!("Failed to send email: {}", e))
            })?;

        if !email_result.success {
            return Err(AppError::Internal(format!(
                "Email delivery failed: {}",
                email_result.message
            )));
        }

        tracing::info!(
            "Successfully sent document {} to {} via email",
            id,
            req.delivered_to
        );
    }

    // Update the document's delivery status in the database
    let document = service
        .deliver_document(id, req, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update document delivery status {}: {}", id, e);
            AppError::Internal(format!("Failed to deliver document: {}", e))
        })?;

    Ok(Json(document))
}

/// Sign document digitally
///
/// POST /api/v1/documents/:id/sign
pub async fn sign_document(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "update").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let document = service
        .sign_document(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to sign document {}: {}", id, e);
            AppError::Internal(format!("Failed to sign document: {}", e))
        })?;

    Ok(Json(document))
}

/// Delete document (soft delete)
///
/// DELETE /api/v1/documents/:id
///
/// Business rules:
/// - Admin can delete any document
/// - Doctor can only delete unsigned documents they created
/// - Signed documents cannot be deleted by non-admin users (audit trail protection)
pub async fn delete_generated_document(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // First check basic delete permission (Doctor or Admin can attempt delete)
    check_document_permission(&state, &auth_user.role, "delete").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);

    // For non-admin users, check if document is signed before allowing deletion
    if !matches!(auth_user.role, UserRole::Admin) {
        // Get the document to check its signed status
        let document = service
            .get_document(id, auth_user.user_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get document {} for delete check: {}", id, e);
                AppError::Internal(format!("Failed to get document: {}", e))
            })?
            .ok_or_else(|| AppError::NotFound(format!("Document {} not found", id)))?;

        // Doctors cannot delete signed documents
        if document.is_signed {
            return Err(AppError::Forbidden(
                "Signed documents cannot be deleted. Contact an administrator if deletion is required.".to_string(),
            ));
        }
    }

    service
        .delete_document(id, auth_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete document {}: {}", id, e);
            AppError::Internal(format!("Failed to delete document: {}", e))
        })?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get document statistics
///
/// GET /api/v1/documents/statistics
pub async fn get_document_statistics(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse> {
    check_document_permission(&state, &auth_user.role, "read").await?;

    let encryption_key = state
        .encryption_key
        .as_ref()
        .ok_or_else(|| AppError::Internal("Encryption key not configured".to_string()))?;

    let storage_path = PathBuf::from(
        std::env::var("DOCUMENT_STORAGE_PATH").unwrap_or_else(|_| "./documents".to_string()),
    );

    let service = DocumentService::new(state.pool.clone(), encryption_key.clone(), storage_path);
    let stats = service.get_statistics().await.map_err(|e| {
        tracing::error!("Failed to get document statistics: {}", e);
        AppError::Internal(format!("Failed to get statistics: {}", e))
    })?;

    Ok(Json(stats))
}
