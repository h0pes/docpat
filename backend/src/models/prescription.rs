/*!
 * Prescription Model
 *
 * Represents a medication prescription for a patient.
 * All medication data fields are encrypted using AES-256-GCM before database storage.
 * Supports refill tracking, status management, and drug interaction warnings.
 */

use crate::utils::encryption::EncryptionKey;
use anyhow::{Context, Result};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, Type};
use uuid::Uuid;
use validator::Validate;

/// Prescription status enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PrescriptionStatus {
    /// Prescription is active
    Active,
    /// Prescription has been completed (all refills used)
    Completed,
    /// Prescription was cancelled
    Cancelled,
    /// Prescription has been discontinued by provider
    Discontinued,
    /// Prescription is temporarily on hold
    OnHold,
}

impl PrescriptionStatus {
    /// Check if prescription can be refilled
    pub fn can_refill(&self) -> bool {
        matches!(self, PrescriptionStatus::Active)
    }

    /// Check if prescription can be discontinued
    pub fn can_discontinue(&self) -> bool {
        matches!(self, PrescriptionStatus::Active | PrescriptionStatus::OnHold)
    }
}

/// Medication form enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MedicationForm {
    Tablet,
    Capsule,
    Liquid,
    Syrup,
    Suspension,
    Injection,
    Topical,
    Cream,
    Ointment,
    Gel,
    Patch,
    Inhaler,
    Drops,
    Suppository,
    Other,
}

/// Route of administration enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RouteOfAdministration {
    Oral,
    Topical,
    Intravenous,
    Intramuscular,
    Subcutaneous,
    Sublingual,
    Rectal,
    Inhalation,
    Ophthalmic,
    Otic,
    Nasal,
    Transdermal,
    Other,
}

/// Drug interaction warning structure (stored as JSONB)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugInteractionWarning {
    pub medication_name: String,
    pub severity: String, // "minor", "moderate", "major"
    pub description: String,
}

/// Prescription model - database representation with ENCRYPTED fields
/// Fields marked with 🔒 are encrypted in the database
#[derive(Debug, Clone, FromRow)]
pub struct Prescription {
    pub id: Uuid,

    // References
    pub visit_id: Option<Uuid>,
    pub visit_date: Option<NaiveDate>,
    pub patient_id: Uuid,
    pub provider_id: Uuid,

    // Medication Information (🔒 Encrypted)
    pub medication_name: String,  // 🔒 Encrypted
    pub generic_name: Option<String>, // 🔒 Encrypted
    pub dosage: String,           // 🔒 Encrypted
    pub form: Option<String>,
    pub route: Option<String>,

    // Dosing Instructions (🔒 Encrypted)
    pub frequency: String,        // 🔒 Encrypted
    pub duration: Option<String>, // 🔒 Encrypted
    pub quantity: Option<i32>,
    pub refills: i32,

    // Patient Instructions (🔒 Encrypted)
    pub instructions: Option<String>,    // 🔒 Encrypted
    pub pharmacy_notes: Option<String>,  // 🔒 Encrypted

    // Prescription Metadata
    pub prescribed_date: NaiveDate,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,

    // Status
    pub status: PrescriptionStatus,
    pub discontinuation_reason: Option<String>, // 🔒 Encrypted
    pub discontinued_at: Option<DateTime<Utc>>,
    pub discontinued_by: Option<Uuid>,

    // Refill Tracking
    pub refills_remaining: Option<i32>,
    pub last_refill_date: Option<NaiveDate>,

    // Drug Interaction Warnings (future enhancement)
    pub has_interactions: bool,
    pub interaction_warnings: Option<sqlx::types::JsonValue>,

    // E-Prescription (future enhancement)
    pub e_prescription_id: Option<String>,
    pub e_prescription_sent_at: Option<DateTime<Utc>>,
    pub e_prescription_status: Option<String>,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Prescription creation request (API input with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreatePrescriptionRequest {
    pub visit_id: Option<Uuid>,

    #[validate(length(min = 36, max = 36, message = "patient_id must be a valid UUID"))]
    pub patient_id: String,

    #[validate(length(min = 36, max = 36, message = "provider_id must be a valid UUID"))]
    pub provider_id: String,

    // Medication Information
    #[validate(length(min = 1, max = 255, message = "Medication name must be 1-255 characters"))]
    pub medication_name: String,

    #[validate(length(max = 255, message = "Generic name too long (max 255 chars)"))]
    pub generic_name: Option<String>,

    #[validate(length(min = 1, max = 100, message = "Dosage must be 1-100 characters"))]
    pub dosage: String,

    pub form: Option<MedicationForm>,
    pub route: Option<RouteOfAdministration>,

    // Dosing Instructions
    #[validate(length(min = 1, max = 100, message = "Frequency must be 1-100 characters"))]
    pub frequency: String,

    #[validate(length(max = 100, message = "Duration too long (max 100 chars)"))]
    pub duration: Option<String>,

    #[validate(range(min = 1, max = 10000, message = "Quantity must be 1-10000"))]
    pub quantity: Option<i32>,

    #[validate(range(min = 0, max = 12, message = "Refills must be 0-12"))]
    pub refills: Option<i32>,

    // Patient Instructions
    #[validate(length(max = 5000, message = "Instructions too long (max 5000 chars)"))]
    pub instructions: Option<String>,

    #[validate(length(max = 5000, message = "Pharmacy notes too long (max 5000 chars)"))]
    pub pharmacy_notes: Option<String>,

    // Dates
    pub prescribed_date: Option<NaiveDate>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,

    // Drug interaction warnings detected at creation time
    pub interaction_warnings: Option<Vec<DrugInteractionWarning>>,
}

/// Prescription update request (API input with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdatePrescriptionRequest {
    #[validate(length(max = 255, message = "Generic name too long (max 255 chars)"))]
    pub generic_name: Option<String>,

    #[validate(length(max = 100, message = "Dosage too long (max 100 chars)"))]
    pub dosage: Option<String>,

    pub form: Option<MedicationForm>,
    pub route: Option<RouteOfAdministration>,

    #[validate(length(max = 100, message = "Frequency too long (max 100 chars)"))]
    pub frequency: Option<String>,

    #[validate(length(max = 100, message = "Duration too long (max 100 chars)"))]
    pub duration: Option<String>,

    #[validate(range(min = 1, max = 10000, message = "Quantity must be 1-10000"))]
    pub quantity: Option<i32>,

    #[validate(range(min = 0, max = 12, message = "Refills must be 0-12"))]
    pub refills: Option<i32>,

    #[validate(length(max = 5000, message = "Instructions too long (max 5000 chars)"))]
    pub instructions: Option<String>,

    #[validate(length(max = 5000, message = "Pharmacy notes too long (max 5000 chars)"))]
    pub pharmacy_notes: Option<String>,

    pub status: Option<PrescriptionStatus>,

    #[validate(length(max = 1000, message = "Discontinuation reason too long (max 1000 chars)"))]
    pub discontinuation_reason: Option<String>,

    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

/// Prescription response (API output with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrescriptionResponse {
    pub id: Uuid,
    pub visit_id: Option<Uuid>,
    pub visit_date: Option<NaiveDate>,
    pub patient_id: Uuid,
    pub provider_id: Uuid,

    // Decrypted medication information
    pub medication_name: String,
    pub generic_name: Option<String>,
    pub dosage: String,
    pub form: Option<String>,
    pub route: Option<String>,

    // Decrypted dosing instructions
    pub frequency: String,
    pub duration: Option<String>,
    pub quantity: Option<i32>,
    pub refills: i32,

    // Decrypted patient instructions
    pub instructions: Option<String>,
    pub pharmacy_notes: Option<String>,

    // Dates
    pub prescribed_date: NaiveDate,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,

    // Status
    pub status: PrescriptionStatus,
    pub discontinuation_reason: Option<String>,
    pub discontinued_at: Option<DateTime<Utc>>,
    pub discontinued_by: Option<Uuid>,

    // Refill tracking
    pub refills_remaining: Option<i32>,
    pub last_refill_date: Option<NaiveDate>,

    // Warnings
    pub has_interactions: bool,
    pub interaction_warnings: Option<Vec<DrugInteractionWarning>>,

    // E-Prescription
    pub e_prescription_id: Option<String>,
    pub e_prescription_sent_at: Option<DateTime<Utc>>,
    pub e_prescription_status: Option<String>,

    // Audit
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Medication search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MedicationSearchResult {
    pub name: String,
    pub generic_name: Option<String>,
    pub common_dosages: Vec<String>,
    pub forms: Vec<String>,
}

impl Prescription {
    /// Decrypt all encrypted fields and convert to response
    pub fn decrypt(&self, encryption_key: &EncryptionKey) -> Result<PrescriptionResponse> {
        // Decrypt medication information
        let medication_name = encryption_key
            .decrypt(&self.medication_name)
            .context("Failed to decrypt medication_name")?;

        let generic_name = self
            .generic_name
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt generic_name")?;

        let dosage = encryption_key
            .decrypt(&self.dosage)
            .context("Failed to decrypt dosage")?;

        // Decrypt dosing instructions
        let frequency = encryption_key
            .decrypt(&self.frequency)
            .context("Failed to decrypt frequency")?;

        let duration = self
            .duration
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt duration")?;

        // Decrypt patient instructions
        let instructions = self
            .instructions
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt instructions")?;

        let pharmacy_notes = self
            .pharmacy_notes
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt pharmacy_notes")?;

        let discontinuation_reason = self
            .discontinuation_reason
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt discontinuation_reason")?;

        // Parse interaction warnings if present
        let interaction_warnings = if let Some(ref warnings) = self.interaction_warnings {
            Some(
                serde_json::from_value(warnings.clone())
                    .context("Failed to parse interaction warnings")?,
            )
        } else {
            None
        };

        Ok(PrescriptionResponse {
            id: self.id,
            visit_id: self.visit_id,
            visit_date: self.visit_date,
            patient_id: self.patient_id,
            provider_id: self.provider_id,
            medication_name,
            generic_name,
            dosage,
            form: self.form.clone(),
            route: self.route.clone(),
            frequency,
            duration,
            quantity: self.quantity,
            refills: self.refills,
            instructions,
            pharmacy_notes,
            prescribed_date: self.prescribed_date,
            start_date: self.start_date,
            end_date: self.end_date,
            status: self.status,
            discontinuation_reason,
            discontinued_at: self.discontinued_at,
            discontinued_by: self.discontinued_by,
            refills_remaining: self.refills_remaining,
            last_refill_date: self.last_refill_date,
            has_interactions: self.has_interactions,
            interaction_warnings,
            e_prescription_id: self.e_prescription_id.clone(),
            e_prescription_sent_at: self.e_prescription_sent_at,
            e_prescription_status: self.e_prescription_status.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
            created_by: self.created_by,
            updated_by: self.updated_by,
        })
    }

    /// Check if prescription can be refilled
    pub fn can_refill(&self) -> bool {
        self.status.can_refill()
            && self.refills_remaining.map(|r| r > 0).unwrap_or(false)
    }

    /// Check if prescription can be discontinued
    pub fn can_discontinue(&self) -> bool {
        self.status.can_discontinue()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prescription_status_can_refill() {
        assert!(PrescriptionStatus::Active.can_refill());
        assert!(!PrescriptionStatus::Completed.can_refill());
        assert!(!PrescriptionStatus::Cancelled.can_refill());
        assert!(!PrescriptionStatus::Discontinued.can_refill());
        assert!(!PrescriptionStatus::OnHold.can_refill());
    }

    #[test]
    fn test_prescription_status_can_discontinue() {
        assert!(PrescriptionStatus::Active.can_discontinue());
        assert!(!PrescriptionStatus::Completed.can_discontinue());
        assert!(!PrescriptionStatus::Cancelled.can_discontinue());
        assert!(!PrescriptionStatus::Discontinued.can_discontinue());
        assert!(PrescriptionStatus::OnHold.can_discontinue());
    }

    #[test]
    fn test_medication_form() {
        let form = MedicationForm::Tablet;
        assert_eq!(form, MedicationForm::Tablet);

        let form2 = MedicationForm::Injection;
        assert_eq!(form2, MedicationForm::Injection);
    }

    #[test]
    fn test_route_of_administration() {
        let route = RouteOfAdministration::Oral;
        assert_eq!(route, RouteOfAdministration::Oral);

        let route2 = RouteOfAdministration::Intravenous;
        assert_eq!(route2, RouteOfAdministration::Intravenous);
    }
}
