/*!
 * Visit Template Models
 *
 * Data models for reusable visit note templates with pre-filled SOAP sections.
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Visit template database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VisitTemplate {
    pub id: Uuid,
    pub template_name: String,
    pub description: Option<String>,

    // SOAP sections (encrypted in database)
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,

    // Default vitals (JSONB, not encrypted)
    pub default_vitals: Option<sqlx::types::JsonValue>,

    pub is_active: bool,
    pub created_by: Uuid,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Response model for visit templates (with decrypted SOAP sections)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitTemplateResponse {
    pub id: Uuid,
    pub template_name: String,
    pub description: Option<String>,
    pub subjective: Option<String>,  // Decrypted
    pub objective: Option<String>,   // Decrypted
    pub assessment: Option<String>,  // Decrypted
    pub plan: Option<String>,        // Decrypted
    pub default_vitals: Option<serde_json::Value>,
    pub is_active: bool,
    pub created_by: Uuid,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create visit template request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateVisitTemplateRequest {
    #[validate(length(min = 1, max = 255, message = "Template name must be 1-255 characters"))]
    pub template_name: String,

    #[validate(length(max = 1000, message = "Description too long (max 1000 chars)"))]
    pub description: Option<String>,

    #[validate(length(max = 10000, message = "Subjective section too long (max 10000 chars)"))]
    pub subjective: Option<String>,

    #[validate(length(max = 10000, message = "Objective section too long (max 10000 chars)"))]
    pub objective: Option<String>,

    #[validate(length(max = 10000, message = "Assessment section too long (max 10000 chars)"))]
    pub assessment: Option<String>,

    #[validate(length(max = 10000, message = "Plan section too long (max 10000 chars)"))]
    pub plan: Option<String>,

    pub default_vitals: Option<serde_json::Value>,
}

/// Update visit template request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateVisitTemplateRequest {
    #[validate(length(min = 1, max = 255, message = "Template name must be 1-255 characters"))]
    pub template_name: Option<String>,

    #[validate(length(max = 1000, message = "Description too long (max 1000 chars)"))]
    pub description: Option<String>,

    #[validate(length(max = 10000, message = "Subjective section too long (max 10000 chars)"))]
    pub subjective: Option<String>,

    #[validate(length(max = 10000, message = "Objective section too long (max 10000 chars)"))]
    pub objective: Option<String>,

    #[validate(length(max = 10000, message = "Assessment section too long (max 10000 chars)"))]
    pub assessment: Option<String>,

    #[validate(length(max = 10000, message = "Plan section too long (max 10000 chars)"))]
    pub plan: Option<String>,

    pub default_vitals: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}
