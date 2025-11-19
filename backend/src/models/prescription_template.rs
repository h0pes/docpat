/*!
 * Prescription Template Models
 *
 * Data models for reusable prescription templates with common medication regimens.
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Medication within a prescription template
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct TemplateMedication {
    #[validate(length(min = 1, max = 255, message = "Medication name required (max 255 chars)"))]
    pub medication_name: String,

    #[validate(length(max = 255, message = "Generic name too long (max 255 chars)"))]
    pub generic_name: Option<String>,

    #[validate(length(max = 100, message = "Dosage too long (max 100 chars)"))]
    pub dosage: String,

    pub form: Option<String>,  // TABLET, CAPSULE, etc.
    pub route: Option<String>, // ORAL, IV, etc.

    #[validate(length(max = 100, message = "Frequency too long (max 100 chars)"))]
    pub frequency: String,

    #[validate(length(max = 100, message = "Duration too long (max 100 chars)"))]
    pub duration: Option<String>,

    #[validate(range(min = 1, max = 1000, message = "Quantity must be 1-1000"))]
    pub quantity: Option<i32>,

    #[validate(range(min = 0, max = 12, message = "Refills must be 0-12"))]
    pub refills: Option<i32>,

    #[validate(length(max = 500, message = "Instructions too long (max 500 chars)"))]
    pub instructions: Option<String>,
}

/// Prescription template database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PrescriptionTemplate {
    pub id: Uuid,
    pub template_name: String,
    pub description: Option<String>,

    // Medications as JSONB array
    pub medications: sqlx::types::JsonValue,

    pub is_active: bool,
    pub created_by: Uuid,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Response model for prescription templates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrescriptionTemplateResponse {
    pub id: Uuid,
    pub template_name: String,
    pub description: Option<String>,
    pub medications: Vec<TemplateMedication>,
    pub is_active: bool,
    pub created_by: Uuid,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create prescription template request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreatePrescriptionTemplateRequest {
    #[validate(length(min = 1, max = 255, message = "Template name must be 1-255 characters"))]
    pub template_name: String,

    #[validate(length(max = 1000, message = "Description too long (max 1000 chars)"))]
    pub description: Option<String>,

    #[validate(nested, custom(function = "validate_medications_not_empty"))]
    pub medications: Vec<TemplateMedication>,
}

/// Validates that medications vector is not empty
fn validate_medications_not_empty(medications: &[TemplateMedication]) -> Result<(), validator::ValidationError> {
    if medications.is_empty() {
        return Err(validator::ValidationError::new("At least one medication required"));
    }
    Ok(())
}

/// Update prescription template request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdatePrescriptionTemplateRequest {
    #[validate(length(min = 1, max = 255, message = "Template name must be 1-255 characters"))]
    pub template_name: Option<String>,

    #[validate(length(max = 1000, message = "Description too long (max 1000 chars)"))]
    pub description: Option<String>,

    #[validate(nested)]
    pub medications: Option<Vec<TemplateMedication>>,

    pub is_active: Option<bool>,
}
