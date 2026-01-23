/*!
 * Document Template Models
 *
 * Data models for document generation templates with HTML/variable substitution.
 * Used for creating medical certificates, referral letters, lab requests,
 * visit summaries, and prescriptions.
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Document types that can be generated
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentType {
    MedicalCertificate,
    ReferralLetter,
    LabRequest,
    VisitSummary,
    Prescription,
    Custom,
}

impl DocumentType {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentType::MedicalCertificate => "MEDICAL_CERTIFICATE",
            DocumentType::ReferralLetter => "REFERRAL_LETTER",
            DocumentType::LabRequest => "LAB_REQUEST",
            DocumentType::VisitSummary => "VISIT_SUMMARY",
            DocumentType::Prescription => "PRESCRIPTION",
            DocumentType::Custom => "CUSTOM",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "MEDICAL_CERTIFICATE" => Some(DocumentType::MedicalCertificate),
            "REFERRAL_LETTER" => Some(DocumentType::ReferralLetter),
            "LAB_REQUEST" => Some(DocumentType::LabRequest),
            "VISIT_SUMMARY" => Some(DocumentType::VisitSummary),
            "PRESCRIPTION" => Some(DocumentType::Prescription),
            "CUSTOM" => Some(DocumentType::Custom),
            _ => None,
        }
    }

    /// Get human-readable display name
    pub fn display_name(&self) -> &'static str {
        match self {
            DocumentType::MedicalCertificate => "Medical Certificate",
            DocumentType::ReferralLetter => "Referral Letter",
            DocumentType::LabRequest => "Lab Request",
            DocumentType::VisitSummary => "Visit Summary",
            DocumentType::Prescription => "Prescription",
            DocumentType::Custom => "Custom Document",
        }
    }
}

impl std::fmt::Display for DocumentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Page size options for PDF generation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PageSize {
    #[default]
    A4,
    Letter,
    Legal,
}

impl PageSize {
    /// Convert to string for database storage
    pub fn as_str(&self) -> &'static str {
        match self {
            PageSize::A4 => "A4",
            PageSize::Letter => "Letter",
            PageSize::Legal => "Legal",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Self {
        match s {
            "A4" => PageSize::A4,
            "Letter" => PageSize::Letter,
            "Legal" => PageSize::Legal,
            _ => PageSize::A4,
        }
    }

    /// Get dimensions in millimeters (width, height)
    pub fn dimensions_mm(&self) -> (f64, f64) {
        match self {
            PageSize::A4 => (210.0, 297.0),
            PageSize::Letter => (215.9, 279.4),
            PageSize::Legal => (215.9, 355.6),
        }
    }
}

/// Page orientation options
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PageOrientation {
    #[default]
    Portrait,
    Landscape,
}

impl PageOrientation {
    /// Convert to string for database storage
    pub fn as_str(&self) -> &'static str {
        match self {
            PageOrientation::Portrait => "PORTRAIT",
            PageOrientation::Landscape => "LANDSCAPE",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Self {
        match s {
            "LANDSCAPE" => PageOrientation::Landscape,
            _ => PageOrientation::Portrait,
        }
    }
}

/// Supported template languages
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TemplateLanguage {
    #[default]
    Italian,
    English,
}

impl TemplateLanguage {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            TemplateLanguage::Italian => "it",
            TemplateLanguage::English => "en",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Self {
        match s {
            "en" => TemplateLanguage::English,
            _ => TemplateLanguage::Italian,
        }
    }
}

/// Document template database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DocumentTemplate {
    pub id: Uuid,
    pub template_key: String,
    pub template_name: String,
    pub description: Option<String>,
    pub document_type: String,
    pub template_html: String,
    pub template_variables: Option<sqlx::types::JsonValue>,
    pub header_html: Option<String>,
    pub footer_html: Option<String>,
    pub css_styles: Option<String>,
    pub page_size: Option<String>,
    pub page_orientation: Option<String>,
    pub margin_top_mm: Option<i32>,
    pub margin_bottom_mm: Option<i32>,
    pub margin_left_mm: Option<i32>,
    pub margin_right_mm: Option<i32>,
    pub is_active: bool,
    pub is_default: bool,
    pub language: Option<String>,
    pub version: i32,
    pub previous_version_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Document template response for API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentTemplateResponse {
    pub id: Uuid,
    pub template_key: String,
    pub template_name: String,
    pub description: Option<String>,
    pub document_type: DocumentType,
    pub template_html: String,
    pub template_variables: Option<serde_json::Value>,
    pub header_html: Option<String>,
    pub footer_html: Option<String>,
    pub css_styles: Option<String>,
    pub page_size: PageSize,
    pub page_orientation: PageOrientation,
    pub margin_top_mm: i32,
    pub margin_bottom_mm: i32,
    pub margin_left_mm: i32,
    pub margin_right_mm: i32,
    pub is_active: bool,
    pub is_default: bool,
    pub language: TemplateLanguage,
    pub version: i32,
    pub previous_version_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

impl From<DocumentTemplate> for DocumentTemplateResponse {
    fn from(template: DocumentTemplate) -> Self {
        Self {
            id: template.id,
            template_key: template.template_key,
            template_name: template.template_name,
            description: template.description,
            document_type: DocumentType::from_str(&template.document_type)
                .unwrap_or(DocumentType::Custom),
            template_html: template.template_html,
            template_variables: template.template_variables.map(|v| {
                serde_json::from_value(v.clone()).unwrap_or(serde_json::Value::Null)
            }),
            header_html: template.header_html,
            footer_html: template.footer_html,
            css_styles: template.css_styles,
            page_size: template
                .page_size
                .as_ref()
                .map(|s| PageSize::from_str(s))
                .unwrap_or_default(),
            page_orientation: template
                .page_orientation
                .as_ref()
                .map(|s| PageOrientation::from_str(s))
                .unwrap_or_default(),
            margin_top_mm: template.margin_top_mm.unwrap_or(20),
            margin_bottom_mm: template.margin_bottom_mm.unwrap_or(20),
            margin_left_mm: template.margin_left_mm.unwrap_or(20),
            margin_right_mm: template.margin_right_mm.unwrap_or(20),
            is_active: template.is_active,
            is_default: template.is_default,
            language: template
                .language
                .as_ref()
                .map(|s| TemplateLanguage::from_str(s))
                .unwrap_or_default(),
            version: template.version,
            previous_version_id: template.previous_version_id,
            created_at: template.created_at,
            updated_at: template.updated_at,
            created_by: template.created_by,
            updated_by: template.updated_by,
        }
    }
}

/// Request to create a new document template
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateDocumentTemplateRequest {
    #[validate(length(
        min = 1,
        max = 100,
        message = "Template key must be 1-100 characters"
    ))]
    #[validate(custom(function = "validate_template_key"))]
    pub template_key: String,

    #[validate(length(
        min = 1,
        max = 255,
        message = "Template name must be 1-255 characters"
    ))]
    pub template_name: String,

    #[validate(length(max = 2000, message = "Description too long (max 2000 chars)"))]
    pub description: Option<String>,

    pub document_type: DocumentType,

    #[validate(length(min = 1, message = "Template HTML is required"))]
    pub template_html: String,

    pub template_variables: Option<serde_json::Value>,

    #[validate(length(max = 10000, message = "Header HTML too long (max 10000 chars)"))]
    pub header_html: Option<String>,

    #[validate(length(max = 10000, message = "Footer HTML too long (max 10000 chars)"))]
    pub footer_html: Option<String>,

    #[validate(length(max = 50000, message = "CSS styles too long (max 50000 chars)"))]
    pub css_styles: Option<String>,

    #[serde(default)]
    pub page_size: PageSize,

    #[serde(default)]
    pub page_orientation: PageOrientation,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_top_mm: Option<i32>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_bottom_mm: Option<i32>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_left_mm: Option<i32>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_right_mm: Option<i32>,

    #[serde(default = "default_true")]
    pub is_active: bool,

    #[serde(default)]
    pub is_default: bool,

    #[serde(default)]
    pub language: TemplateLanguage,
}

fn default_true() -> bool {
    true
}

/// Request to update an existing document template
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateDocumentTemplateRequest {
    #[validate(length(
        min = 1,
        max = 255,
        message = "Template name must be 1-255 characters"
    ))]
    pub template_name: Option<String>,

    #[validate(length(max = 2000, message = "Description too long (max 2000 chars)"))]
    pub description: Option<String>,

    pub template_html: Option<String>,
    pub template_variables: Option<serde_json::Value>,

    #[validate(length(max = 10000, message = "Header HTML too long (max 10000 chars)"))]
    pub header_html: Option<String>,

    #[validate(length(max = 10000, message = "Footer HTML too long (max 10000 chars)"))]
    pub footer_html: Option<String>,

    #[validate(length(max = 50000, message = "CSS styles too long (max 50000 chars)"))]
    pub css_styles: Option<String>,

    pub page_size: Option<PageSize>,
    pub page_orientation: Option<PageOrientation>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_top_mm: Option<i32>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_bottom_mm: Option<i32>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_left_mm: Option<i32>,

    #[validate(range(min = 0, max = 100, message = "Margin must be 0-100mm"))]
    pub margin_right_mm: Option<i32>,

    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
    pub language: Option<TemplateLanguage>,
}

/// Summary of a document template (for listings)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentTemplateSummary {
    pub id: Uuid,
    pub template_key: String,
    pub template_name: String,
    pub description: Option<String>,
    pub document_type: DocumentType,
    pub is_active: bool,
    pub is_default: bool,
    pub language: TemplateLanguage,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<DocumentTemplate> for DocumentTemplateSummary {
    fn from(template: DocumentTemplate) -> Self {
        Self {
            id: template.id,
            template_key: template.template_key,
            template_name: template.template_name,
            description: template.description,
            document_type: DocumentType::from_str(&template.document_type)
                .unwrap_or(DocumentType::Custom),
            is_active: template.is_active,
            is_default: template.is_default,
            language: template
                .language
                .as_ref()
                .map(|s| TemplateLanguage::from_str(s))
                .unwrap_or_default(),
            version: template.version,
            created_at: template.created_at,
            updated_at: template.updated_at,
        }
    }
}

/// Filter options for listing document templates
#[derive(Debug, Clone, Default, Deserialize)]
pub struct DocumentTemplateFilter {
    pub document_type: Option<DocumentType>,
    pub language: Option<TemplateLanguage>,
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
    pub search: Option<String>,
}

/// Pagination response for template list
#[derive(Debug, Clone, Serialize)]
pub struct ListDocumentTemplatesResponse {
    pub templates: Vec<DocumentTemplateSummary>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Validate template key format (lowercase letters, numbers, underscores, starts with letter)
fn validate_template_key(key: &str) -> Result<(), validator::ValidationError> {
    if key.is_empty() {
        return Err(validator::ValidationError::new("template_key_empty"));
    }

    let first_char = key.chars().next().unwrap();
    if !first_char.is_ascii_lowercase() {
        return Err(validator::ValidationError::new("template_key_must_start_with_letter"));
    }

    for c in key.chars() {
        if !c.is_ascii_lowercase() && !c.is_ascii_digit() && c != '_' {
            return Err(validator::ValidationError::new("template_key_invalid_chars"));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== DocumentType Tests ====================

    #[test]
    fn test_document_type_conversion() {
        assert_eq!(
            DocumentType::MedicalCertificate.as_str(),
            "MEDICAL_CERTIFICATE"
        );
        assert_eq!(
            DocumentType::from_str("MEDICAL_CERTIFICATE"),
            Some(DocumentType::MedicalCertificate)
        );
        assert_eq!(DocumentType::from_str("INVALID"), None);
    }

    #[test]
    fn test_document_type_referral_letter() {
        assert_eq!(DocumentType::ReferralLetter.as_str(), "REFERRAL_LETTER");
        assert_eq!(
            DocumentType::from_str("REFERRAL_LETTER"),
            Some(DocumentType::ReferralLetter)
        );
    }

    #[test]
    fn test_document_type_lab_request() {
        assert_eq!(DocumentType::LabRequest.as_str(), "LAB_REQUEST");
        assert_eq!(
            DocumentType::from_str("LAB_REQUEST"),
            Some(DocumentType::LabRequest)
        );
    }

    #[test]
    fn test_document_type_visit_summary() {
        assert_eq!(DocumentType::VisitSummary.as_str(), "VISIT_SUMMARY");
        assert_eq!(
            DocumentType::from_str("VISIT_SUMMARY"),
            Some(DocumentType::VisitSummary)
        );
    }

    #[test]
    fn test_document_type_prescription() {
        assert_eq!(DocumentType::Prescription.as_str(), "PRESCRIPTION");
        assert_eq!(
            DocumentType::from_str("PRESCRIPTION"),
            Some(DocumentType::Prescription)
        );
    }

    #[test]
    fn test_document_type_custom() {
        assert_eq!(DocumentType::Custom.as_str(), "CUSTOM");
        assert_eq!(DocumentType::from_str("CUSTOM"), Some(DocumentType::Custom));
    }

    #[test]
    fn test_document_type_display_name_certificate() {
        assert_eq!(
            DocumentType::MedicalCertificate.display_name(),
            "Medical Certificate"
        );
    }

    #[test]
    fn test_document_type_display_name_referral() {
        assert_eq!(DocumentType::ReferralLetter.display_name(), "Referral Letter");
    }

    #[test]
    fn test_document_type_display_name_lab() {
        assert_eq!(DocumentType::LabRequest.display_name(), "Lab Request");
    }

    #[test]
    fn test_document_type_display_name_visit() {
        assert_eq!(DocumentType::VisitSummary.display_name(), "Visit Summary");
    }

    #[test]
    fn test_document_type_display_name_prescription() {
        assert_eq!(DocumentType::Prescription.display_name(), "Prescription");
    }

    #[test]
    fn test_document_type_display_name_custom() {
        assert_eq!(DocumentType::Custom.display_name(), "Custom Document");
    }

    #[test]
    fn test_document_type_display_format() {
        assert_eq!(
            format!("{}", DocumentType::MedicalCertificate),
            "MEDICAL_CERTIFICATE"
        );
    }

    // ==================== PageSize Tests ====================

    #[test]
    fn test_page_size_dimensions() {
        let (width, height) = PageSize::A4.dimensions_mm();
        assert_eq!(width, 210.0);
        assert_eq!(height, 297.0);
    }

    #[test]
    fn test_page_size_letter_dimensions() {
        let (width, height) = PageSize::Letter.dimensions_mm();
        assert_eq!(width, 215.9);
        assert_eq!(height, 279.4);
    }

    #[test]
    fn test_page_size_legal_dimensions() {
        let (width, height) = PageSize::Legal.dimensions_mm();
        assert_eq!(width, 215.9);
        assert_eq!(height, 355.6);
    }

    #[test]
    fn test_page_size_as_str() {
        assert_eq!(PageSize::A4.as_str(), "A4");
        assert_eq!(PageSize::Letter.as_str(), "Letter");
        assert_eq!(PageSize::Legal.as_str(), "Legal");
    }

    #[test]
    fn test_page_size_from_str() {
        assert_eq!(PageSize::from_str("A4"), PageSize::A4);
        assert_eq!(PageSize::from_str("Letter"), PageSize::Letter);
        assert_eq!(PageSize::from_str("Legal"), PageSize::Legal);
    }

    #[test]
    fn test_page_size_from_str_invalid() {
        // Defaults to A4 for invalid input
        assert_eq!(PageSize::from_str("invalid"), PageSize::A4);
        assert_eq!(PageSize::from_str(""), PageSize::A4);
    }

    #[test]
    fn test_page_size_default() {
        assert_eq!(PageSize::default(), PageSize::A4);
    }

    // ==================== PageOrientation Tests ====================

    #[test]
    fn test_page_orientation_default() {
        assert_eq!(PageOrientation::default(), PageOrientation::Portrait);
    }

    #[test]
    fn test_page_orientation_as_str() {
        assert_eq!(PageOrientation::Portrait.as_str(), "PORTRAIT");
        assert_eq!(PageOrientation::Landscape.as_str(), "LANDSCAPE");
    }

    #[test]
    fn test_page_orientation_from_str() {
        assert_eq!(
            PageOrientation::from_str("PORTRAIT"),
            PageOrientation::Portrait
        );
        assert_eq!(
            PageOrientation::from_str("LANDSCAPE"),
            PageOrientation::Landscape
        );
    }

    #[test]
    fn test_page_orientation_from_str_invalid() {
        // Defaults to Portrait for invalid input
        assert_eq!(
            PageOrientation::from_str("invalid"),
            PageOrientation::Portrait
        );
        assert_eq!(PageOrientation::from_str(""), PageOrientation::Portrait);
    }

    // ==================== TemplateLanguage Tests ====================

    #[test]
    fn test_template_language_conversion() {
        assert_eq!(TemplateLanguage::Italian.as_str(), "it");
        assert_eq!(TemplateLanguage::English.as_str(), "en");
        assert_eq!(TemplateLanguage::from_str("en"), TemplateLanguage::English);
        assert_eq!(TemplateLanguage::from_str("it"), TemplateLanguage::Italian);
        assert_eq!(
            TemplateLanguage::from_str("invalid"),
            TemplateLanguage::Italian
        ); // Default to Italian
    }

    #[test]
    fn test_template_language_default() {
        assert_eq!(TemplateLanguage::default(), TemplateLanguage::Italian);
    }

    // ==================== Template Key Validation Tests ====================

    #[test]
    fn test_validate_template_key_valid() {
        assert!(validate_template_key("medical_certificate").is_ok());
        assert!(validate_template_key("referral_letter_v1").is_ok());
        assert!(validate_template_key("custom123").is_ok());
        assert!(validate_template_key("a").is_ok());
    }

    #[test]
    fn test_validate_template_key_empty() {
        assert!(validate_template_key("").is_err());
    }

    #[test]
    fn test_validate_template_key_starts_with_number() {
        assert!(validate_template_key("1template").is_err());
    }

    #[test]
    fn test_validate_template_key_starts_with_underscore() {
        assert!(validate_template_key("_template").is_err());
    }

    #[test]
    fn test_validate_template_key_uppercase() {
        assert!(validate_template_key("Template").is_err());
        assert!(validate_template_key("TEMPLATE").is_err());
    }

    #[test]
    fn test_validate_template_key_special_chars() {
        assert!(validate_template_key("template-name").is_err());
        assert!(validate_template_key("template.name").is_err());
        assert!(validate_template_key("template name").is_err());
    }

    // ==================== Serialization Tests ====================

    #[test]
    fn test_document_type_serialization() {
        let doc_type = DocumentType::MedicalCertificate;
        let json = serde_json::to_string(&doc_type).unwrap();
        assert_eq!(json, "\"MEDICAL_CERTIFICATE\"");
    }

    #[test]
    fn test_document_type_deserialization() {
        let json = "\"REFERRAL_LETTER\"";
        let doc_type: DocumentType = serde_json::from_str(json).unwrap();
        assert_eq!(doc_type, DocumentType::ReferralLetter);
    }

    #[test]
    fn test_page_size_serialization() {
        let size = PageSize::A4;
        let json = serde_json::to_string(&size).unwrap();
        assert_eq!(json, "\"A4\"");
    }

    #[test]
    fn test_page_size_deserialization() {
        let json = "\"LETTER\"";
        let size: PageSize = serde_json::from_str(json).unwrap();
        assert_eq!(size, PageSize::Letter);
    }

    #[test]
    fn test_page_orientation_serialization() {
        let orientation = PageOrientation::Landscape;
        let json = serde_json::to_string(&orientation).unwrap();
        assert_eq!(json, "\"LANDSCAPE\"");
    }

    #[test]
    fn test_template_language_serialization() {
        let lang = TemplateLanguage::English;
        let json = serde_json::to_string(&lang).unwrap();
        assert_eq!(json, "\"english\"");
    }

    #[test]
    fn test_template_language_deserialization() {
        let json = "\"italian\"";
        let lang: TemplateLanguage = serde_json::from_str(json).unwrap();
        assert_eq!(lang, TemplateLanguage::Italian);
    }

    // ==================== Structure Tests ====================

    #[test]
    fn test_document_template_filter_default() {
        let filter = DocumentTemplateFilter::default();
        assert!(filter.document_type.is_none());
        assert!(filter.language.is_none());
        assert!(filter.is_active.is_none());
        assert!(filter.is_default.is_none());
        assert!(filter.search.is_none());
    }

    #[test]
    fn test_document_template_filter_with_values() {
        let filter = DocumentTemplateFilter {
            document_type: Some(DocumentType::MedicalCertificate),
            language: Some(TemplateLanguage::Italian),
            is_active: Some(true),
            is_default: Some(false),
            search: Some("test".to_string()),
        };
        assert_eq!(filter.document_type, Some(DocumentType::MedicalCertificate));
        assert_eq!(filter.language, Some(TemplateLanguage::Italian));
        assert_eq!(filter.is_active, Some(true));
    }

    #[test]
    fn test_list_templates_response_structure() {
        let response = ListDocumentTemplatesResponse {
            templates: vec![],
            total: 10,
            limit: 20,
            offset: 0,
        };
        assert_eq!(response.total, 10);
        assert_eq!(response.limit, 20);
        assert!(response.templates.is_empty());
    }

    // ==================== Edge Cases ====================

    #[test]
    fn test_document_type_equality() {
        assert_eq!(DocumentType::Custom, DocumentType::Custom);
        assert_ne!(DocumentType::Custom, DocumentType::Prescription);
    }

    #[test]
    fn test_page_size_equality() {
        assert_eq!(PageSize::A4, PageSize::A4);
        assert_ne!(PageSize::A4, PageSize::Letter);
    }

    #[test]
    fn test_page_orientation_equality() {
        assert_eq!(PageOrientation::Portrait, PageOrientation::Portrait);
        assert_ne!(PageOrientation::Portrait, PageOrientation::Landscape);
    }

    #[test]
    fn test_template_language_equality() {
        assert_eq!(TemplateLanguage::Italian, TemplateLanguage::Italian);
        assert_ne!(TemplateLanguage::Italian, TemplateLanguage::English);
    }

    #[test]
    fn test_document_type_clone() {
        let original = DocumentType::LabRequest;
        let cloned = original;
        assert_eq!(original, cloned);
    }

    #[test]
    fn test_page_size_copy() {
        let original = PageSize::Legal;
        let copied = original;
        assert_eq!(original, copied);
    }
}
