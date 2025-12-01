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
    fn test_page_size_dimensions() {
        let (width, height) = PageSize::A4.dimensions_mm();
        assert_eq!(width, 210.0);
        assert_eq!(height, 297.0);
    }

    #[test]
    fn test_page_orientation_default() {
        assert_eq!(PageOrientation::default(), PageOrientation::Portrait);
    }

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
}
