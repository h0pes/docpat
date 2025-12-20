/*!
 * File Upload HTTP Handlers
 *
 * HTTP request handlers for file upload management.
 * Implements OWASP File Upload security best practices.
 * All endpoints require authentication, most require ADMIN role.
 */

use axum::{
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{header, StatusCode, HeaderMap, HeaderValue},
    response::{IntoResponse, Response},
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::handlers::auth::AppState;
use crate::models::uploaded_file::{
    FilePurpose, FilesFilter, ListFilesResponse, LogoResponse, UpdateFileRequest,
    UploadedFileResponse, MAX_FILE_SIZE,
};
use crate::models::{AuditAction, AuditLog, CreateAuditLog, EntityType, RequestContext, UserRole};
use crate::services::FileUploadService;

#[cfg(feature = "rbac")]
use crate::utils::permissions::{check_permission, require_admin};

/// Query parameters for listing files
#[derive(Debug, Deserialize, Default)]
pub struct ListFilesQuery {
    /// Filter by purpose
    pub purpose: Option<String>,
    /// Filter by creator
    pub created_by: Option<Uuid>,
    /// Search in filename/description
    pub search: Option<String>,
    /// Page number (1-based)
    pub page: Option<i32>,
    /// Page size (default 20, max 100)
    pub page_size: Option<i32>,
}

/// Error response helper
fn error_response(error: &str, message: &str) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "error": error,
        "message": message
    }))
}

/// Upload a file
///
/// POST /api/v1/files/upload
///
/// Accepts multipart form data with:
/// - file: The file to upload (required)
/// - purpose: File purpose - LOGO, ATTACHMENT, DOCUMENT (optional, defaults to ATTACHMENT)
/// - alt_text: Alt text for accessibility (optional)
/// - description: File description (optional)
///
/// Returns: UploadedFileResponse with file metadata
pub async fn upload_file(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    mut multipart: Multipart,
) -> Result<Json<UploadedFileResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can upload files
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let mut file_content: Option<Vec<u8>> = None;
    let mut original_filename: Option<String> = None;
    let mut purpose = FilePurpose::Attachment;
    let mut alt_text: Option<String> = None;
    let mut description: Option<String> = None;

    // Parse multipart form
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::error!("Failed to parse multipart field: {}", e);
        (
            StatusCode::BAD_REQUEST,
            error_response("INVALID_MULTIPART", "Failed to parse multipart form"),
        )
    })? {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "file" => {
                // Get original filename
                original_filename = field.file_name().map(|s| s.to_string());

                // Read file content with size limit
                let content = field.bytes().await.map_err(|e| {
                    tracing::error!("Failed to read file content: {}", e);
                    (
                        StatusCode::BAD_REQUEST,
                        error_response("READ_ERROR", "Failed to read file content"),
                    )
                })?;

                if content.len() > MAX_FILE_SIZE {
                    return Err((
                        StatusCode::PAYLOAD_TOO_LARGE,
                        error_response(
                            "FILE_TOO_LARGE",
                            &format!(
                                "File size {} bytes exceeds maximum {} bytes",
                                content.len(),
                                MAX_FILE_SIZE
                            ),
                        ),
                    ));
                }

                file_content = Some(content.to_vec());
            }
            "purpose" => {
                let value = field.text().await.map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        error_response("INVALID_FIELD", "Failed to read purpose field"),
                    )
                })?;
                purpose = FilePurpose::from_str(&value).unwrap_or(FilePurpose::Attachment);
            }
            "alt_text" => {
                alt_text = Some(field.text().await.map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        error_response("INVALID_FIELD", "Failed to read alt_text field"),
                    )
                })?);
            }
            "description" => {
                description = Some(field.text().await.map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        error_response("INVALID_FIELD", "Failed to read description field"),
                    )
                })?);
            }
            _ => {
                // Ignore unknown fields
            }
        }
    }

    // Validate required fields
    let content = file_content.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            error_response("MISSING_FILE", "No file was provided in the upload"),
        )
    })?;

    let filename = original_filename.unwrap_or_else(|| "unnamed".to_string());

    // Upload file
    let file = FileUploadService::upload_file(
        &state.pool,
        &content,
        &filename,
        purpose.clone(),
        alt_text.clone(),
        description.clone(),
        user_id,
    )
    .await
    .map_err(|e| {
        let error_msg = e.to_string();
        tracing::error!("File upload failed: {}", error_msg);

        if error_msg.contains("validation failed") || error_msg.contains("not allowed") {
            (
                StatusCode::BAD_REQUEST,
                error_response("VALIDATION_FAILED", &error_msg),
            )
        } else if error_msg.contains("security") || error_msg.contains("SVG") {
            (
                StatusCode::BAD_REQUEST,
                error_response("SECURITY_VIOLATION", &error_msg),
            )
        } else {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("UPLOAD_FAILED", "Failed to upload file"),
            )
        }
    })?;

    // Create audit log for file upload
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Create,
            entity_type: EntityType::File,
            entity_id: Some(file.id.to_string()),
            changes: Some(serde_json::json!({
                "original_filename": file.original_filename,
                "mime_type": file.mime_type,
                "purpose": format!("{:?}", purpose),
                "size_bytes": file.file_size_bytes,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(UploadedFileResponse::from(file)))
}

/// Get file metadata by ID
///
/// GET /api/v1/files/:id
///
/// Returns: UploadedFileResponse with file metadata
pub async fn get_file_metadata(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> Result<Json<UploadedFileResponse>, (StatusCode, Json<serde_json::Value>)> {
    let file = FileUploadService::get_file(&state.pool, file_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get file {}: {}", file_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve file"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "File not found"),
            )
        })?;

    Ok(Json(UploadedFileResponse::from(file)))
}

/// Download file content by ID
///
/// GET /api/v1/files/:id/download
///
/// Returns: File content with appropriate Content-Type header
pub async fn download_file(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let (file, content) = FileUploadService::get_file_with_content(&state.pool, file_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get file {}: {}", file_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve file"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "File not found"),
            )
        })?;

    // Build response with proper headers
    let mut headers = HeaderMap::new();

    // Content-Type from stored MIME type
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&file.mime_type).unwrap_or(HeaderValue::from_static("application/octet-stream")),
    );

    // Content-Length
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&content.len().to_string()).unwrap(),
    );

    // Content-Disposition for download
    let disposition = format!(
        "attachment; filename=\"{}\"",
        file.original_filename.replace('"', "\\\"")
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&disposition).unwrap_or(HeaderValue::from_static("attachment")),
    );

    // Cache control - private, short cache for dynamic content
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, max-age=300"),
    );

    // Security headers
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );

    Ok((StatusCode::OK, headers, Body::from(content)).into_response())
}

/// Serve file inline (for images/logos)
///
/// GET /api/v1/files/:id/serve
///
/// Returns: File content for inline display (no download prompt)
pub async fn serve_file(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let (file, content) = FileUploadService::get_file_with_content(&state.pool, file_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get file {}: {}", file_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve file"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "File not found"),
            )
        })?;

    let mut headers = HeaderMap::new();

    // Content-Type
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&file.mime_type).unwrap_or(HeaderValue::from_static("application/octet-stream")),
    );

    // Content-Length
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&content.len().to_string()).unwrap(),
    );

    // Inline disposition (display in browser)
    let disposition = format!(
        "inline; filename=\"{}\"",
        file.original_filename.replace('"', "\\\"")
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&disposition).unwrap_or(HeaderValue::from_static("inline")),
    );

    // Cache control - longer cache for images
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=3600"),
    );

    // Security headers
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );

    Ok((StatusCode::OK, headers, Body::from(content)).into_response())
}

/// List files with filtering
///
/// GET /api/v1/files
///
/// Query parameters:
/// - purpose: Filter by purpose (LOGO, ATTACHMENT, DOCUMENT, AVATAR)
/// - created_by: Filter by creator UUID
/// - search: Search in filename/description
/// - page: Page number (1-based)
/// - page_size: Items per page (default 20, max 100)
///
/// Returns: ListFilesResponse with paginated results
pub async fn list_files(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ListFilesQuery>,
) -> Result<Json<ListFilesResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check RBAC permission - both admin and doctor can read files
    #[cfg(feature = "rbac")]
    check_permission(&state.enforcer, &user_role, "files", "read").await?;

    let filter = FilesFilter {
        purpose: query.purpose.as_ref().and_then(|p| FilePurpose::from_str(p)),
        created_by: query.created_by,
        search: query.search,
        page: query.page,
        page_size: query.page_size,
    };

    let result = FileUploadService::list_files(&state.pool, filter)
        .await
        .map_err(|e| {
            tracing::error!("Failed to list files: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to list files"),
            )
        })?;

    Ok(Json(result))
}

/// Update file metadata
///
/// PUT /api/v1/files/:id
///
/// Body: UpdateFileRequest with alt_text and/or description
///
/// Returns: Updated UploadedFileResponse
pub async fn update_file(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(file_id): Path<Uuid>,
    Json(request): Json<UpdateFileRequest>,
) -> Result<Json<UploadedFileResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can update files
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let file = FileUploadService::update_file(
        &state.pool,
        file_id,
        request.alt_text.clone(),
        request.description.clone(),
        user_id,
    )
    .await
    .map_err(|e| {
        let error_msg = e.to_string();
        if error_msg.contains("not found") {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "File not found"),
            )
        } else {
            tracing::error!("Failed to update file {}: {}", file_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to update file"),
            )
        }
    })?;

    // Create audit log for file update
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Update,
            entity_type: EntityType::File,
            entity_id: Some(file_id.to_string()),
            changes: Some(serde_json::json!({
                "alt_text": request.alt_text,
                "description": request.description,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(UploadedFileResponse::from(file)))
}

/// Delete a file
///
/// DELETE /api/v1/files/:id
///
/// Returns: 204 No Content on success
pub async fn delete_file(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    Path(file_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can delete files
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    FileUploadService::delete_file_record(&state.pool, file_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("not found") {
                (
                    StatusCode::NOT_FOUND,
                    error_response("NOT_FOUND", "File not found"),
                )
            } else {
                tracing::error!("Failed to delete file {}: {}", file_id, e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("INTERNAL_ERROR", "Failed to delete file"),
                )
            }
        })?;

    // Create audit log for file deletion
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Delete,
            entity_type: EntityType::File,
            entity_id: Some(file_id.to_string()),
            changes: None,
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(StatusCode::NO_CONTENT)
}

// ==================== Logo-specific Endpoints ====================

/// Upload practice logo
///
/// POST /api/v1/settings/logo
///
/// Accepts multipart form data with:
/// - file: The logo image (required)
///
/// Replaces any existing logo.
/// Returns: LogoResponse with logo details
pub async fn upload_logo(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
    mut multipart: Multipart,
) -> Result<Json<LogoResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can upload logo
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let mut file_content: Option<Vec<u8>> = None;
    let mut original_filename: Option<String> = None;

    // Parse multipart form
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::error!("Failed to parse multipart field: {}", e);
        (
            StatusCode::BAD_REQUEST,
            error_response("INVALID_MULTIPART", "Failed to parse multipart form"),
        )
    })? {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" {
            original_filename = field.file_name().map(|s| s.to_string());

            let content = field.bytes().await.map_err(|e| {
                tracing::error!("Failed to read logo content: {}", e);
                (
                    StatusCode::BAD_REQUEST,
                    error_response("READ_ERROR", "Failed to read logo content"),
                )
            })?;

            if content.len() > MAX_FILE_SIZE {
                return Err((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    error_response("FILE_TOO_LARGE", "Logo file is too large"),
                ));
            }

            file_content = Some(content.to_vec());
        }
    }

    let content = file_content.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            error_response("MISSING_FILE", "No logo file was provided"),
        )
    })?;

    let filename = original_filename.unwrap_or_else(|| "logo".to_string());

    // Upload logo (replaces existing)
    let logo = FileUploadService::upload_logo(&state.pool, &content, &filename, user_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            tracing::error!("Logo upload failed: {}", error_msg);

            if error_msg.contains("validation failed") || error_msg.contains("not allowed") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("VALIDATION_FAILED", &error_msg),
                )
            } else if error_msg.contains("security") || error_msg.contains("SVG") {
                (
                    StatusCode::BAD_REQUEST,
                    error_response("SECURITY_VIOLATION", &error_msg),
                )
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    error_response("UPLOAD_FAILED", "Failed to upload logo"),
                )
            }
        })?;

    // Create audit log for logo upload
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Create,
            entity_type: EntityType::File,
            entity_id: Some(logo.id.to_string()),
            changes: Some(serde_json::json!({
                "original_filename": logo.original_filename,
                "mime_type": logo.mime_type,
                "purpose": "LOGO",
                "size_bytes": logo.file_size_bytes,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(LogoResponse::from(logo)))
}

/// Get current practice logo
///
/// GET /api/v1/settings/logo
///
/// Returns: LogoResponse or 404 if no logo is set
pub async fn get_logo(
    State(state): State<AppState>,
) -> Result<Json<LogoResponse>, (StatusCode, Json<serde_json::Value>)> {
    let logo = FileUploadService::get_logo(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get logo: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve logo"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "No logo has been set"),
            )
        })?;

    Ok(Json(LogoResponse::from(logo)))
}

/// Serve logo image (no auth required for public logo)
///
/// GET /api/v1/settings/logo/image
///
/// Returns: Logo image content or 404
pub async fn serve_logo(
    State(state): State<AppState>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let logo = FileUploadService::get_logo(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get logo: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve logo"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "No logo has been set"),
            )
        })?;

    // Get file content
    let content = FileUploadService::read_file(&logo.storage_path)
        .await
        .map_err(|e| {
            tracing::error!("Failed to read logo file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to read logo file"),
            )
        })?;

    let mut headers = HeaderMap::new();

    // Content-Type
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&logo.mime_type).unwrap_or(HeaderValue::from_static("image/png")),
    );

    // Content-Length
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&content.len().to_string()).unwrap(),
    );

    // Inline disposition
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("inline"),
    );

    // Cache control - logos can be cached longer
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=86400"),
    );

    // Security headers
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );

    Ok((StatusCode::OK, headers, Body::from(content)).into_response())
}

/// Delete practice logo
///
/// DELETE /api/v1/settings/logo
///
/// Returns: 204 No Content on success
pub async fn delete_logo(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Extension(user_id): Extension<Uuid>,
    Extension(request_ctx): Extension<RequestContext>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    // Only admins can delete logo
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let logo = FileUploadService::get_logo(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get logo: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to retrieve logo"),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                error_response("NOT_FOUND", "No logo has been set"),
            )
        })?;

    let logo_id = logo.id;
    FileUploadService::delete_file_record(&state.pool, logo_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete logo: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("INTERNAL_ERROR", "Failed to delete logo"),
            )
        })?;

    // Create audit log for logo deletion
    let _ = AuditLog::create(
        &state.pool,
        CreateAuditLog {
            user_id: Some(user_id),
            action: AuditAction::Delete,
            entity_type: EntityType::File,
            entity_id: Some(logo_id.to_string()),
            changes: Some(serde_json::json!({
                "purpose": "LOGO",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(StatusCode::NO_CONTENT)
}
