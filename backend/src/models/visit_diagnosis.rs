/*!
 * Visit Diagnosis Model
 *
 * Represents a diagnosis associated with a visit, linked to ICD-10 codes.
 * Supports multiple diagnoses per visit with primary diagnosis designation.
 * Clinical notes field is encrypted using AES-256-GCM.
 */

use crate::utils::encryption::EncryptionKey;
use anyhow::{Context, Result};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;
use validator::Validate;

/// Diagnosis type enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DiagnosisType {
    /// Provisional diagnosis (suspected)
    Provisional,
    /// Confirmed diagnosis
    Confirmed,
    /// Differential diagnosis (one of several possibilities)
    Differential,
    /// Diagnosis to rule out
    RuleOut,
}

/// Visit Diagnosis model - database representation with ENCRYPTED fields
#[derive(Debug, Clone, FromRow)]
pub struct VisitDiagnosis {
    pub id: Uuid,

    // References
    pub visit_id: Uuid,
    pub visit_date: NaiveDate, // Required for partitioned foreign key
    pub patient_id: Uuid,

    // ICD-10 Diagnosis
    pub icd10_code: String,        // e.g., "I10", "E11.9"
    pub icd10_description: String, // e.g., "Essential (primary) hypertension"

    // Diagnosis details
    pub is_primary: bool,
    pub diagnosis_type: Option<DiagnosisType>,

    // Clinical notes (🔒 Encrypted)
    pub clinical_notes: Option<String>, // 🔒 Encrypted

    // Status
    pub is_active: bool,
    pub resolved_date: Option<NaiveDate>,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Visit Diagnosis creation request (API input with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateVisitDiagnosisRequest {
    #[validate(length(min = 36, max = 36, message = "visit_id must be a valid UUID"))]
    pub visit_id: String,

    #[validate(length(min = 1, max = 10, message = "ICD-10 code must be 1-10 characters"))]
    pub icd10_code: String,

    #[validate(length(min = 1, max = 500, message = "ICD-10 description must be 1-500 characters"))]
    pub icd10_description: String,

    pub is_primary: Option<bool>,
    pub diagnosis_type: Option<DiagnosisType>,

    #[validate(length(max = 5000, message = "Clinical notes too long (max 5000 chars)"))]
    pub clinical_notes: Option<String>,

    pub is_active: Option<bool>,
    pub resolved_date: Option<NaiveDate>,
}

/// Visit Diagnosis update request (API input with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateVisitDiagnosisRequest {
    #[validate(length(max = 500, message = "ICD-10 description must be max 500 characters"))]
    pub icd10_description: Option<String>,

    pub is_primary: Option<bool>,
    pub diagnosis_type: Option<DiagnosisType>,

    #[validate(length(max = 5000, message = "Clinical notes too long (max 5000 chars)"))]
    pub clinical_notes: Option<String>,

    pub is_active: Option<bool>,
    pub resolved_date: Option<NaiveDate>,
}

/// Visit Diagnosis response (API output with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitDiagnosisResponse {
    pub id: Uuid,
    pub visit_id: Uuid,
    pub visit_date: NaiveDate,
    pub patient_id: Uuid,

    pub icd10_code: String,
    pub icd10_description: String,

    pub is_primary: bool,
    pub diagnosis_type: Option<DiagnosisType>,

    // Decrypted clinical notes
    pub clinical_notes: Option<String>,

    pub is_active: bool,
    pub resolved_date: Option<NaiveDate>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// ICD-10 code search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ICD10SearchResult {
    pub code: String,
    pub description: String,
    pub category: Option<String>,
}

impl VisitDiagnosis {
    /// Decrypt all encrypted fields and convert to response
    pub fn decrypt(&self, encryption_key: &EncryptionKey) -> Result<VisitDiagnosisResponse> {
        let clinical_notes = self
            .clinical_notes
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt clinical_notes")?;

        Ok(VisitDiagnosisResponse {
            id: self.id,
            visit_id: self.visit_id,
            visit_date: self.visit_date,
            patient_id: self.patient_id,
            icd10_code: self.icd10_code.clone(),
            icd10_description: self.icd10_description.clone(),
            is_primary: self.is_primary,
            diagnosis_type: self.diagnosis_type,
            clinical_notes,
            is_active: self.is_active,
            resolved_date: self.resolved_date,
            created_at: self.created_at,
            updated_at: self.updated_at,
            created_by: self.created_by,
            updated_by: self.updated_by,
        })
    }
}

/// Validate ICD-10 code format (basic validation)
/// Full ICD-10 format: Letter followed by 2 digits, optionally followed by decimal and up to 4 characters
/// Examples: I10, E11.9, S72.001A
pub fn validate_icd10_code(code: &str) -> Result<()> {
    if code.is_empty() {
        anyhow::bail!("ICD-10 code cannot be empty");
    }

    if code.len() > 10 {
        anyhow::bail!("ICD-10 code too long (max 10 characters)");
    }

    // First character must be a letter (excluding U)
    let first_char = code.chars().next().unwrap();
    if !first_char.is_ascii_alphabetic() || first_char == 'U' {
        anyhow::bail!("ICD-10 code must start with a letter (A-T, V-Z)");
    }

    // Basic format validation: Letter + digits (+ optional decimal + chars)
    let parts: Vec<&str> = code.split('.').collect();
    if parts.len() > 2 {
        anyhow::bail!("ICD-10 code can have at most one decimal point");
    }

    // Validate main part (before decimal): Letter + 2 digits
    let main_part = parts[0];
    if main_part.len() < 3 {
        anyhow::bail!("ICD-10 code must be at least 3 characters (e.g., I10)");
    }

    let digits_part = &main_part[1..];
    if !digits_part.chars().all(|c| c.is_ascii_digit()) {
        anyhow::bail!("ICD-10 code must have digits after the first letter");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_icd10_code() {
        // Valid codes
        assert!(validate_icd10_code("I10").is_ok());
        assert!(validate_icd10_code("E11.9").is_ok());
        assert!(validate_icd10_code("S72.001A").is_ok());
        assert!(validate_icd10_code("Z23").is_ok());
        assert!(validate_icd10_code("A00.0").is_ok());

        // Invalid codes
        assert!(validate_icd10_code("").is_err()); // Empty
        assert!(validate_icd10_code("U10").is_err()); // U is reserved
        assert!(validate_icd10_code("10").is_err()); // No letter
        assert!(validate_icd10_code("I").is_err()); // Too short
        assert!(validate_icd10_code("IA0").is_err()); // Letter in digits
        assert!(validate_icd10_code("I10.9.1").is_err()); // Multiple decimals
    }

    #[test]
    fn test_diagnosis_type() {
        let provisional = DiagnosisType::Provisional;
        assert_eq!(provisional, DiagnosisType::Provisional);

        let confirmed = DiagnosisType::Confirmed;
        assert_eq!(confirmed, DiagnosisType::Confirmed);
    }
}
