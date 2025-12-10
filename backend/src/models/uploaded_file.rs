/*!
 * Uploaded File Model
 *
 * Data models and DTOs for file upload functionality.
 * Implements OWASP File Upload security best practices.
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::fmt;
use uuid::Uuid;

// ==================== Enums ====================

/// File purpose/category enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "file_purpose", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FilePurpose {
    /// Practice logo image
    Logo,
    /// Generic attachment
    Attachment,
    /// Document file
    Document,
    /// User avatar (future)
    Avatar,
}

impl fmt::Display for FilePurpose {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FilePurpose::Logo => write!(f, "LOGO"),
            FilePurpose::Attachment => write!(f, "ATTACHMENT"),
            FilePurpose::Document => write!(f, "DOCUMENT"),
            FilePurpose::Avatar => write!(f, "AVATAR"),
        }
    }
}

impl FilePurpose {
    /// Parse from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "LOGO" => Some(FilePurpose::Logo),
            "ATTACHMENT" => Some(FilePurpose::Attachment),
            "DOCUMENT" => Some(FilePurpose::Document),
            "AVATAR" => Some(FilePurpose::Avatar),
            _ => None,
        }
    }

    /// Get the subdirectory for this purpose
    pub fn subdirectory(&self) -> &'static str {
        match self {
            FilePurpose::Logo => "logos",
            FilePurpose::Attachment => "attachments",
            FilePurpose::Document => "documents",
            FilePurpose::Avatar => "avatars",
        }
    }
}

// ==================== Database Model ====================

/// Uploaded file database model
#[derive(Debug, Clone, FromRow)]
pub struct UploadedFile {
    pub id: Uuid,
    pub original_filename: String,
    pub stored_filename: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub purpose: FilePurpose,
    pub storage_path: String,
    pub content_hash: String,
    pub alt_text: Option<String>,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

// ==================== Response DTOs ====================

/// File response DTO (safe for API responses)
#[derive(Debug, Clone, Serialize)]
pub struct UploadedFileResponse {
    pub id: Uuid,
    pub original_filename: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub purpose: FilePurpose,
    pub alt_text: Option<String>,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// URL path to access the file
    pub url: String,
}

impl From<UploadedFile> for UploadedFileResponse {
    fn from(file: UploadedFile) -> Self {
        Self {
            url: format!("/api/v1/files/{}", file.id),
            id: file.id,
            original_filename: file.original_filename,
            mime_type: file.mime_type,
            file_size_bytes: file.file_size_bytes,
            purpose: file.purpose,
            alt_text: file.alt_text,
            description: file.description,
            created_by: file.created_by,
            created_at: file.created_at,
            updated_at: file.updated_at,
        }
    }
}

/// List files response
#[derive(Debug, Clone, Serialize)]
pub struct ListFilesResponse {
    pub files: Vec<UploadedFileResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

// ==================== Request DTOs ====================

/// Upload file request (metadata, file comes via multipart)
#[derive(Debug, Clone, Deserialize)]
pub struct UploadFileRequest {
    /// Optional alt text for accessibility
    pub alt_text: Option<String>,
    /// Optional description
    pub description: Option<String>,
    /// File purpose (defaults to ATTACHMENT)
    pub purpose: Option<FilePurpose>,
}

/// Update file metadata request
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateFileRequest {
    pub alt_text: Option<String>,
    pub description: Option<String>,
}

/// Files filter for listing
#[derive(Debug, Clone, Default, Deserialize)]
pub struct FilesFilter {
    /// Filter by purpose
    pub purpose: Option<FilePurpose>,
    /// Filter by creator
    pub created_by: Option<Uuid>,
    /// Search in filename/description
    pub search: Option<String>,
    /// Page number (1-based)
    pub page: Option<i32>,
    /// Page size (default 20, max 100)
    pub page_size: Option<i32>,
}

// ==================== Validation Constants ====================

/// Maximum file size in bytes (10 MB)
pub const MAX_FILE_SIZE: usize = 10 * 1024 * 1024;

/// Maximum filename length
pub const MAX_FILENAME_LENGTH: usize = 255;

/// Allowed MIME types for images
pub const ALLOWED_IMAGE_MIME_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
];

/// Allowed MIME types for logos specifically
pub const ALLOWED_LOGO_MIME_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/svg+xml",
];

/// Allowed MIME types for documents
pub const ALLOWED_DOCUMENT_MIME_TYPES: &[&str] = &[
    "application/pdf",
    "image/jpeg",
    "image/png",
];

/// Magic bytes signatures for common file types
pub mod magic_bytes {
    /// JPEG signature (0xFF 0xD8 0xFF)
    pub const JPEG: &[u8] = &[0xFF, 0xD8, 0xFF];
    /// PNG signature
    pub const PNG: &[u8] = &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    /// GIF87a signature
    pub const GIF87A: &[u8] = b"GIF87a";
    /// GIF89a signature
    pub const GIF89A: &[u8] = b"GIF89a";
    /// WebP signature (RIFF....WEBP)
    pub const WEBP_RIFF: &[u8] = b"RIFF";
    pub const WEBP_MARKER: &[u8] = b"WEBP";
    /// PDF signature
    pub const PDF: &[u8] = b"%PDF";
    /// SVG detection (starts with XML or <svg)
    pub const SVG_XML: &[u8] = b"<?xml";
    pub const SVG_TAG: &[u8] = b"<svg";
}

/// File validation result
#[derive(Debug)]
pub struct FileValidationResult {
    pub is_valid: bool,
    pub detected_mime_type: Option<String>,
    pub error_message: Option<String>,
}

impl FileValidationResult {
    /// Create a valid result
    pub fn valid(mime_type: String) -> Self {
        Self {
            is_valid: true,
            detected_mime_type: Some(mime_type),
            error_message: None,
        }
    }

    /// Create an invalid result
    pub fn invalid(message: impl Into<String>) -> Self {
        Self {
            is_valid: false,
            detected_mime_type: None,
            error_message: Some(message.into()),
        }
    }
}

// ==================== Logo-specific DTOs ====================

/// Logo upload response (specialized for settings)
#[derive(Debug, Clone, Serialize)]
pub struct LogoResponse {
    pub id: Uuid,
    pub url: String,
    pub mime_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size_bytes: i64,
    pub uploaded_at: DateTime<Utc>,
}

impl From<UploadedFile> for LogoResponse {
    fn from(file: UploadedFile) -> Self {
        Self {
            id: file.id,
            url: format!("/api/v1/files/{}", file.id),
            mime_type: file.mime_type,
            width: None, // Could be parsed from metadata
            height: None,
            file_size_bytes: file.file_size_bytes,
            uploaded_at: file.created_at,
        }
    }
}

// ==================== Unit Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_purpose_display() {
        assert_eq!(FilePurpose::Logo.to_string(), "LOGO");
        assert_eq!(FilePurpose::Attachment.to_string(), "ATTACHMENT");
        assert_eq!(FilePurpose::Document.to_string(), "DOCUMENT");
        assert_eq!(FilePurpose::Avatar.to_string(), "AVATAR");
    }

    #[test]
    fn test_file_purpose_from_str() {
        assert_eq!(FilePurpose::from_str("LOGO"), Some(FilePurpose::Logo));
        assert_eq!(FilePurpose::from_str("logo"), Some(FilePurpose::Logo));
        assert_eq!(FilePurpose::from_str("Logo"), Some(FilePurpose::Logo));
        assert_eq!(FilePurpose::from_str("attachment"), Some(FilePurpose::Attachment));
        assert_eq!(FilePurpose::from_str("INVALID"), None);
    }

    #[test]
    fn test_file_purpose_subdirectory() {
        assert_eq!(FilePurpose::Logo.subdirectory(), "logos");
        assert_eq!(FilePurpose::Attachment.subdirectory(), "attachments");
        assert_eq!(FilePurpose::Document.subdirectory(), "documents");
        assert_eq!(FilePurpose::Avatar.subdirectory(), "avatars");
    }

    #[test]
    fn test_file_validation_result_valid() {
        let result = FileValidationResult::valid("image/png".to_string());
        assert!(result.is_valid);
        assert_eq!(result.detected_mime_type, Some("image/png".to_string()));
        assert!(result.error_message.is_none());
    }

    #[test]
    fn test_file_validation_result_invalid() {
        let result = FileValidationResult::invalid("File type not allowed");
        assert!(!result.is_valid);
        assert!(result.detected_mime_type.is_none());
        assert_eq!(result.error_message, Some("File type not allowed".to_string()));
    }
}
