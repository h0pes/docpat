/*!
 * Generated Document Models
 *
 * Data models for tracking generated PDF documents with metadata,
 * file storage references, status tracking, and digital signatures.
 */

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

use super::document_template::DocumentType;

/// Status of a generated document
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentStatus {
    Generating,
    Generated,
    Delivered,
    Failed,
    Deleted,
}

impl DocumentStatus {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentStatus::Generating => "GENERATING",
            DocumentStatus::Generated => "GENERATED",
            DocumentStatus::Delivered => "DELIVERED",
            DocumentStatus::Failed => "FAILED",
            DocumentStatus::Deleted => "DELETED",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "GENERATING" => Some(DocumentStatus::Generating),
            "GENERATED" => Some(DocumentStatus::Generated),
            "DELIVERED" => Some(DocumentStatus::Delivered),
            "FAILED" => Some(DocumentStatus::Failed),
            "DELETED" => Some(DocumentStatus::Deleted),
            _ => None,
        }
    }

    /// Check if this status allows transition to another status
    pub fn can_transition_to(&self, new_status: DocumentStatus) -> bool {
        match self {
            DocumentStatus::Generating => matches!(
                new_status,
                DocumentStatus::Generated | DocumentStatus::Failed
            ),
            DocumentStatus::Generated => {
                matches!(new_status, DocumentStatus::Delivered | DocumentStatus::Deleted)
            }
            DocumentStatus::Delivered => matches!(new_status, DocumentStatus::Deleted),
            DocumentStatus::Failed | DocumentStatus::Deleted => false, // Terminal states
        }
    }

    /// Check if this is a terminal state (cannot be changed)
    pub fn is_terminal(&self) -> bool {
        matches!(self, DocumentStatus::Failed | DocumentStatus::Deleted)
    }
}

impl std::fmt::Display for DocumentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Generated document database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GeneratedDocument {
    pub id: Uuid,

    // References
    pub template_id: Uuid,
    pub patient_id: Uuid,
    pub visit_id: Option<Uuid>,
    pub visit_date: Option<NaiveDate>,
    pub provider_id: Uuid,

    // Document metadata
    pub document_type: String,
    pub document_title: String,
    pub document_filename: String,

    // File storage
    pub file_path: String,
    pub file_size_bytes: Option<i64>,
    pub file_hash: Option<String>,

    // Generation details
    pub template_version: Option<i32>,
    pub generation_data: Option<sqlx::types::JsonValue>,

    // Status
    pub status: String,
    pub generation_error: Option<String>,

    // Delivery tracking
    pub delivered_to: Option<String>,
    pub delivered_at: Option<DateTime<Utc>>,

    // Expiration/Retention
    pub expires_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,

    // Digital signature
    pub is_signed: Option<bool>,
    pub signature_hash: Option<String>,
    pub signed_at: Option<DateTime<Utc>>,
    pub signed_by: Option<Uuid>,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Generated document response for API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedDocumentResponse {
    pub id: Uuid,

    // References
    pub template_id: Uuid,
    pub patient_id: Uuid,
    pub visit_id: Option<Uuid>,
    pub visit_date: Option<NaiveDate>,
    pub provider_id: Uuid,

    // Document metadata
    pub document_type: DocumentType,
    pub document_title: String,
    pub document_filename: String,

    // File info (path excluded for security)
    pub file_size_bytes: Option<i64>,
    pub file_hash: Option<String>,

    // Generation details
    pub template_version: Option<i32>,

    // Status
    pub status: DocumentStatus,
    pub generation_error: Option<String>,

    // Delivery tracking
    pub delivered_to: Option<String>,
    pub delivered_at: Option<DateTime<Utc>>,

    // Expiration
    pub expires_at: Option<DateTime<Utc>>,

    // Digital signature
    pub is_signed: bool, // Converted from Option<bool> with default false
    pub signed_at: Option<DateTime<Utc>>,
    pub signed_by: Option<Uuid>,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

impl From<GeneratedDocument> for GeneratedDocumentResponse {
    fn from(doc: GeneratedDocument) -> Self {
        Self {
            id: doc.id,
            template_id: doc.template_id,
            patient_id: doc.patient_id,
            visit_id: doc.visit_id,
            visit_date: doc.visit_date,
            provider_id: doc.provider_id,
            document_type: DocumentType::from_str(&doc.document_type)
                .unwrap_or(DocumentType::Custom),
            document_title: doc.document_title,
            document_filename: doc.document_filename,
            file_size_bytes: doc.file_size_bytes,
            file_hash: doc.file_hash,
            template_version: doc.template_version,
            status: DocumentStatus::from_str(&doc.status).unwrap_or(DocumentStatus::Generated),
            generation_error: doc.generation_error,
            delivered_to: doc.delivered_to,
            delivered_at: doc.delivered_at,
            expires_at: doc.expires_at,
            is_signed: doc.is_signed.unwrap_or(false),
            signed_at: doc.signed_at,
            signed_by: doc.signed_by,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            created_by: doc.created_by,
        }
    }
}

/// Request to generate a new document
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct GenerateDocumentRequest {
    pub template_id: Uuid,
    pub patient_id: Uuid,

    #[validate(length(
        min = 1,
        max = 255,
        message = "Document title must be 1-255 characters"
    ))]
    pub document_title: String,

    /// Optional reference to a visit
    pub visit_id: Option<Uuid>,
    pub visit_date: Option<NaiveDate>,

    /// Additional data for variable substitution
    /// This will be merged with patient/visit data
    pub additional_data: Option<serde_json::Value>,

    /// Optional expiration date
    pub expires_at: Option<DateTime<Utc>>,
}

/// Request to deliver a document (e.g., email)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct DeliverDocumentRequest {
    #[validate(length(
        min = 1,
        max = 255,
        message = "Delivery recipient must be specified"
    ))]
    pub delivered_to: String,

    /// Delivery method (email, print, etc.)
    pub delivery_method: Option<String>,
}

/// Request to sign a document digitally
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignDocumentRequest {
    /// Optional PIN or confirmation code
    pub confirmation_code: Option<String>,
}

/// Summary of a generated document (for listings)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedDocumentSummary {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub visit_id: Option<Uuid>,
    pub document_type: DocumentType,
    pub document_title: String,
    pub document_filename: String,
    pub status: DocumentStatus,
    pub is_signed: bool,
    pub file_size_bytes: Option<i64>,
    pub created_at: DateTime<Utc>,
}

impl From<GeneratedDocument> for GeneratedDocumentSummary {
    fn from(doc: GeneratedDocument) -> Self {
        Self {
            id: doc.id,
            patient_id: doc.patient_id,
            visit_id: doc.visit_id,
            document_type: DocumentType::from_str(&doc.document_type)
                .unwrap_or(DocumentType::Custom),
            document_title: doc.document_title,
            document_filename: doc.document_filename,
            status: DocumentStatus::from_str(&doc.status).unwrap_or(DocumentStatus::Generated),
            is_signed: doc.is_signed.unwrap_or(false),
            file_size_bytes: doc.file_size_bytes,
            created_at: doc.created_at,
        }
    }
}

/// Filter options for listing generated documents
#[derive(Debug, Clone, Default, Deserialize)]
pub struct GeneratedDocumentFilter {
    pub patient_id: Option<Uuid>,
    pub visit_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub document_type: Option<DocumentType>,
    pub status: Option<DocumentStatus>,
    pub is_signed: Option<bool>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
}

/// Pagination response for document list
#[derive(Debug, Clone, Serialize)]
pub struct ListGeneratedDocumentsResponse {
    pub documents: Vec<GeneratedDocumentSummary>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Statistics about generated documents
#[derive(Debug, Clone, Serialize)]
pub struct DocumentStatistics {
    pub total_documents: i64,
    pub by_type: Vec<DocumentTypeCount>,
    pub by_status: Vec<DocumentStatusCount>,
    pub signed_count: i64,
    pub delivered_count: i64,
    pub total_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocumentTypeCount {
    pub document_type: DocumentType,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocumentStatusCount {
    pub status: DocumentStatus,
    pub count: i64,
}

/// Request for bulk document generation
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct BulkGenerateRequest {
    pub template_id: Uuid,

    #[validate(length(min = 1, max = 100, message = "Must specify 1-100 patients"))]
    pub patient_ids: Vec<Uuid>,

    #[validate(length(
        min = 1,
        max = 255,
        message = "Document title prefix must be 1-255 characters"
    ))]
    pub title_prefix: String,

    /// Common additional data for all documents
    pub common_data: Option<serde_json::Value>,
}

/// Result of bulk document generation
#[derive(Debug, Clone, Serialize)]
pub struct BulkGenerateResult {
    pub successful: Vec<Uuid>,
    pub failed: Vec<BulkGenerateError>,
    pub total_requested: usize,
    pub total_successful: usize,
    pub total_failed: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct BulkGenerateError {
    pub patient_id: Uuid,
    pub error: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_status_transitions() {
        // From GENERATING
        assert!(DocumentStatus::Generating.can_transition_to(DocumentStatus::Generated));
        assert!(DocumentStatus::Generating.can_transition_to(DocumentStatus::Failed));
        assert!(!DocumentStatus::Generating.can_transition_to(DocumentStatus::Delivered));
        assert!(!DocumentStatus::Generating.can_transition_to(DocumentStatus::Deleted));

        // From GENERATED
        assert!(DocumentStatus::Generated.can_transition_to(DocumentStatus::Delivered));
        assert!(DocumentStatus::Generated.can_transition_to(DocumentStatus::Deleted));
        assert!(!DocumentStatus::Generated.can_transition_to(DocumentStatus::Failed));

        // From DELIVERED
        assert!(DocumentStatus::Delivered.can_transition_to(DocumentStatus::Deleted));
        assert!(!DocumentStatus::Delivered.can_transition_to(DocumentStatus::Generated));

        // Terminal states
        assert!(!DocumentStatus::Failed.can_transition_to(DocumentStatus::Generated));
        assert!(!DocumentStatus::Deleted.can_transition_to(DocumentStatus::Generated));
    }

    #[test]
    fn test_document_status_is_terminal() {
        assert!(!DocumentStatus::Generating.is_terminal());
        assert!(!DocumentStatus::Generated.is_terminal());
        assert!(!DocumentStatus::Delivered.is_terminal());
        assert!(DocumentStatus::Failed.is_terminal());
        assert!(DocumentStatus::Deleted.is_terminal());
    }

    #[test]
    fn test_document_status_conversion() {
        assert_eq!(DocumentStatus::Generating.as_str(), "GENERATING");
        assert_eq!(DocumentStatus::Generated.as_str(), "GENERATED");
        assert_eq!(
            DocumentStatus::from_str("GENERATED"),
            Some(DocumentStatus::Generated)
        );
        assert_eq!(DocumentStatus::from_str("INVALID"), None);
    }
}
