/*!
 * Visit Model
 *
 * Represents a clinical visit with SOAP notes (Subjective, Objective, Assessment, Plan).
 * All clinical data fields are encrypted using AES-256-GCM before database storage.
 *
 * Status Workflow:
 * - DRAFT → SIGNED → LOCKED
 * - DRAFT can be edited freely
 * - SIGNED visits cannot be edited (can only be locked)
 * - LOCKED visits are immutable and permanently archived
 *
 * The visits table is partitioned by year (visit_date) for performance and retention management.
 */

use crate::utils::encryption::EncryptionKey;
use anyhow::{Context, Result};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, Type};
use uuid::Uuid;
use validator::Validate;

/// Visit status enum representing the lifecycle of a visit note
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VisitStatus {
    /// Visit note is in draft state (can be edited)
    Draft,
    /// Visit note has been digitally signed (cannot be edited, can be locked)
    Signed,
    /// Visit note is permanently locked (immutable)
    Locked,
}

impl VisitStatus {
    /// Check if transition from current status to new status is valid
    pub fn can_transition_to(&self, new_status: &VisitStatus) -> bool {
        match self {
            VisitStatus::Draft => matches!(new_status, VisitStatus::Draft | VisitStatus::Signed),
            VisitStatus::Signed => matches!(new_status, VisitStatus::Signed | VisitStatus::Locked),
            VisitStatus::Locked => *self == *new_status, // LOCKED is final
        }
    }

    /// Check if this is a final state (cannot be changed)
    pub fn is_final(&self) -> bool {
        matches!(self, VisitStatus::Locked)
    }

    /// Check if visit can be edited in this status
    pub fn is_editable(&self) -> bool {
        matches!(self, VisitStatus::Draft)
    }
}

/// Visit type enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VisitType {
    /// New patient initial consultation
    NewPatient,
    /// Follow-up visit
    FollowUp,
    /// Urgent visit
    Urgent,
    /// General consultation
    Consultation,
    /// Routine checkup
    RoutineCheckup,
    /// Acupuncture session
    Acupuncture,
}

/// Diagnosis type for visit diagnoses
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

/// Vital signs structure (stored as encrypted JSONB in database)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct VitalSigns {
    /// Systolic blood pressure (mmHg) - range 70-250
    #[validate(range(min = 70.0, max = 250.0))]
    pub blood_pressure_systolic: Option<f32>,

    /// Diastolic blood pressure (mmHg) - range 40-150
    #[validate(range(min = 40.0, max = 150.0))]
    pub blood_pressure_diastolic: Option<f32>,

    /// Heart rate (bpm) - range 30-250
    #[validate(range(min = 30.0, max = 250.0))]
    pub heart_rate: Option<f32>,

    /// Respiratory rate (breaths per minute) - range 8-60
    #[validate(range(min = 8.0, max = 60.0))]
    pub respiratory_rate: Option<f32>,

    /// Body temperature (°C) - range 35-42
    #[validate(range(min = 35.0, max = 42.0))]
    pub temperature_celsius: Option<f32>,

    /// Weight (kg) - range 0.5-500
    #[validate(range(min = 0.5, max = 500.0))]
    pub weight_kg: Option<f32>,

    /// Height (cm) - range 20-300
    #[validate(range(min = 20.0, max = 300.0))]
    pub height_cm: Option<f32>,

    /// Body Mass Index (automatically calculated)
    pub bmi: Option<f32>,

    /// Oxygen saturation (%) - range 70-100
    #[validate(range(min = 70.0, max = 100.0))]
    pub oxygen_saturation: Option<f32>,
}

impl VitalSigns {
    /// Calculate BMI from weight and height
    pub fn calculate_bmi(&mut self) {
        if let (Some(weight), Some(height)) = (self.weight_kg, self.height_cm) {
            let height_m = height / 100.0;
            self.bmi = Some(weight / (height_m * height_m));
        }
    }

    /// Validate vital signs and calculate BMI
    pub fn validate_and_calculate(&mut self) -> Result<()> {
        self.calculate_bmi();
        self.validate()
            .context("Vital signs validation failed")?;
        Ok(())
    }
}

/// Review of Systems structure (stored as encrypted JSONB)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewOfSystems {
    pub constitutional: Option<String>,
    pub cardiovascular: Option<String>,
    pub respiratory: Option<String>,
    pub gastrointestinal: Option<String>,
    pub genitourinary: Option<String>,
    pub musculoskeletal: Option<String>,
    pub integumentary: Option<String>,
    pub neurological: Option<String>,
    pub psychiatric: Option<String>,
    pub endocrine: Option<String>,
    pub hematologic: Option<String>,
    pub allergic_immunologic: Option<String>,
}

/// Visit model - database representation with ENCRYPTED fields
/// Fields marked with 🔒 are encrypted in the database
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Visit {
    pub id: Uuid,

    // References
    pub appointment_id: Option<Uuid>,
    pub patient_id: Uuid,
    pub provider_id: Uuid,

    // Visit metadata
    pub visit_date: NaiveDate,
    pub visit_time: DateTime<Utc>,
    pub visit_type: VisitType,

    // Vitals (🔒 Encrypted JSONB)
    pub vitals: Option<String>, // Encrypted JSON string

    // SOAP Notes (🔒 All encrypted)
    pub subjective: Option<String>,      // 🔒 Encrypted
    pub objective: Option<String>,       // 🔒 Encrypted
    pub assessment: Option<String>,      // 🔒 Encrypted
    pub plan: Option<String>,            // 🔒 Encrypted

    // Additional clinical documentation (🔒 Encrypted)
    pub chief_complaint: Option<String>,         // 🔒 Encrypted
    pub history_present_illness: Option<String>, // 🔒 Encrypted
    pub review_of_systems: Option<String>,       // 🔒 Encrypted JSON
    pub physical_exam: Option<String>,           // 🔒 Encrypted
    pub clinical_notes: Option<String>,          // 🔒 Encrypted

    // Status workflow
    pub status: VisitStatus,

    // Digital signature
    pub signed_at: Option<DateTime<Utc>>,
    pub signed_by: Option<Uuid>,
    pub signature_hash: Option<String>,

    // Lock timestamp
    pub locked_at: Option<DateTime<Utc>>,

    // Version control
    pub version: i32,
    pub previous_version_id: Option<Uuid>,

    // Auto-save tracking
    pub last_autosave_at: Option<DateTime<Utc>>,

    // Follow-up
    pub follow_up_required: bool,
    pub follow_up_date: Option<NaiveDate>,
    pub follow_up_notes: Option<String>, // 🔒 Encrypted

    // Attachments
    pub has_attachments: bool,
    pub attachment_urls: Option<Vec<String>>,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Visit creation request (API input with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateVisitRequest {
    pub appointment_id: Option<Uuid>,

    #[validate(length(min = 36, max = 36, message = "patient_id must be a valid UUID"))]
    pub patient_id: String,

    #[validate(length(min = 36, max = 36, message = "provider_id must be a valid UUID"))]
    pub provider_id: String,

    pub visit_date: NaiveDate,
    pub visit_type: VisitType,

    // Vitals (will be encrypted)
    #[validate(nested)]
    pub vitals: Option<VitalSigns>,

    // SOAP Notes (will be encrypted)
    #[validate(length(max = 10000, message = "Subjective note too long (max 10000 chars)"))]
    pub subjective: Option<String>,

    #[validate(length(max = 10000, message = "Objective note too long (max 10000 chars)"))]
    pub objective: Option<String>,

    #[validate(length(max = 10000, message = "Assessment too long (max 10000 chars)"))]
    pub assessment: Option<String>,

    #[validate(length(max = 10000, message = "Plan too long (max 10000 chars)"))]
    pub plan: Option<String>,

    // Additional fields (will be encrypted)
    #[validate(length(max = 1000, message = "Chief complaint too long (max 1000 chars)"))]
    pub chief_complaint: Option<String>,

    #[validate(length(max = 5000, message = "History of present illness too long (max 5000 chars)"))]
    pub history_present_illness: Option<String>,

    pub review_of_systems: Option<ReviewOfSystems>,

    #[validate(length(max = 5000, message = "Physical exam note too long (max 5000 chars)"))]
    pub physical_exam: Option<String>,

    #[validate(length(max = 5000, message = "Clinical notes too long (max 5000 chars)"))]
    pub clinical_notes: Option<String>,

    // Follow-up
    pub follow_up_required: Option<bool>,
    pub follow_up_date: Option<NaiveDate>,

    #[validate(length(max = 1000, message = "Follow-up notes too long (max 1000 chars)"))]
    pub follow_up_notes: Option<String>,

    // Attachments
    pub attachment_urls: Option<Vec<String>>,
}

/// Visit update request (API input with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateVisitRequest {
    pub visit_type: Option<VisitType>,

    // Vitals (will be encrypted)
    #[validate(nested)]
    pub vitals: Option<VitalSigns>,

    // SOAP Notes (will be encrypted)
    #[validate(length(max = 10000, message = "Subjective note too long (max 10000 chars)"))]
    pub subjective: Option<String>,

    #[validate(length(max = 10000, message = "Objective note too long (max 10000 chars)"))]
    pub objective: Option<String>,

    #[validate(length(max = 10000, message = "Assessment too long (max 10000 chars)"))]
    pub assessment: Option<String>,

    #[validate(length(max = 10000, message = "Plan too long (max 10000 chars)"))]
    pub plan: Option<String>,

    // Additional fields (will be encrypted)
    #[validate(length(max = 1000, message = "Chief complaint too long (max 1000 chars)"))]
    pub chief_complaint: Option<String>,

    #[validate(length(max = 5000, message = "History of present illness too long (max 5000 chars)"))]
    pub history_present_illness: Option<String>,

    pub review_of_systems: Option<ReviewOfSystems>,

    #[validate(length(max = 5000, message = "Physical exam note too long (max 5000 chars)"))]
    pub physical_exam: Option<String>,

    #[validate(length(max = 5000, message = "Clinical notes too long (max 5000 chars)"))]
    pub clinical_notes: Option<String>,

    // Follow-up
    pub follow_up_required: Option<bool>,
    pub follow_up_date: Option<NaiveDate>,

    #[validate(length(max = 1000, message = "Follow-up notes too long (max 1000 chars)"))]
    pub follow_up_notes: Option<String>,

    // Attachments
    pub attachment_urls: Option<Vec<String>>,
}

/// Visit response (API output with decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitResponse {
    pub id: Uuid,
    pub appointment_id: Option<Uuid>,
    pub patient_id: Uuid,
    pub provider_id: Uuid,

    pub visit_date: NaiveDate,
    pub visit_time: DateTime<Utc>,
    pub visit_type: VisitType,

    // Decrypted vitals
    pub vitals: Option<VitalSigns>,

    // Decrypted SOAP notes
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,

    // Decrypted additional fields
    pub chief_complaint: Option<String>,
    pub history_present_illness: Option<String>,
    pub review_of_systems: Option<ReviewOfSystems>,
    pub physical_exam: Option<String>,
    pub clinical_notes: Option<String>,

    // Status
    pub status: VisitStatus,
    pub signed_at: Option<DateTime<Utc>>,
    pub signed_by: Option<Uuid>,
    pub signature_hash: Option<String>,
    pub locked_at: Option<DateTime<Utc>>,

    // Version
    pub version: i32,
    pub last_autosave_at: Option<DateTime<Utc>>,

    // Follow-up
    pub follow_up_required: bool,
    pub follow_up_date: Option<NaiveDate>,
    pub follow_up_notes: Option<String>,

    // Attachments
    pub has_attachments: bool,
    pub attachment_urls: Option<Vec<String>>,

    // Audit
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

impl Visit {
    /// Decrypt all encrypted fields and convert to response
    pub fn decrypt(&self, encryption_key: &EncryptionKey) -> Result<VisitResponse> {
        // Decrypt vitals if present
        let vitals = if let Some(ref encrypted) = self.vitals {
            let decrypted = encryption_key
                .decrypt(encrypted)
                .context("Failed to decrypt vitals")?;
            Some(
                serde_json::from_str(&decrypted)
                    .context("Failed to parse decrypted vitals JSON")?,
            )
        } else {
            None
        };

        // Decrypt SOAP notes
        let subjective = self
            .subjective
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt subjective")?;

        let objective = self
            .objective
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt objective")?;

        let assessment = self
            .assessment
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt assessment")?;

        let plan = self
            .plan
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt plan")?;

        // Decrypt additional fields
        let chief_complaint = self
            .chief_complaint
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt chief_complaint")?;

        let history_present_illness = self
            .history_present_illness
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt history_present_illness")?;

        let review_of_systems = if let Some(ref encrypted) = self.review_of_systems {
            let decrypted = encryption_key
                .decrypt(encrypted)
                .context("Failed to decrypt review_of_systems")?;
            Some(
                serde_json::from_str(&decrypted)
                    .context("Failed to parse decrypted review_of_systems JSON")?,
            )
        } else {
            None
        };

        let physical_exam = self
            .physical_exam
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt physical_exam")?;

        let clinical_notes = self
            .clinical_notes
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt clinical_notes")?;

        let follow_up_notes = self
            .follow_up_notes
            .as_ref()
            .map(|enc| encryption_key.decrypt(enc))
            .transpose()
            .context("Failed to decrypt follow_up_notes")?;

        Ok(VisitResponse {
            id: self.id,
            appointment_id: self.appointment_id,
            patient_id: self.patient_id,
            provider_id: self.provider_id,
            visit_date: self.visit_date,
            visit_time: self.visit_time,
            visit_type: self.visit_type,
            vitals,
            subjective,
            objective,
            assessment,
            plan,
            chief_complaint,
            history_present_illness,
            review_of_systems,
            physical_exam,
            clinical_notes,
            status: self.status,
            signed_at: self.signed_at,
            signed_by: self.signed_by,
            signature_hash: self.signature_hash.clone(),
            locked_at: self.locked_at,
            version: self.version,
            last_autosave_at: self.last_autosave_at,
            follow_up_required: self.follow_up_required,
            follow_up_date: self.follow_up_date,
            follow_up_notes,
            has_attachments: self.has_attachments,
            attachment_urls: self.attachment_urls.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
            created_by: self.created_by,
            updated_by: self.updated_by,
        })
    }

    /// Check if visit can be edited
    pub fn can_edit(&self) -> bool {
        self.status.is_editable()
    }

    /// Check if visit can be signed
    pub fn can_sign(&self) -> bool {
        self.status == VisitStatus::Draft
    }

    /// Check if visit can be locked
    pub fn can_lock(&self) -> bool {
        self.status == VisitStatus::Signed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_visit_status_transitions() {
        // DRAFT can go to SIGNED
        assert!(VisitStatus::Draft.can_transition_to(&VisitStatus::Signed));
        assert!(VisitStatus::Draft.can_transition_to(&VisitStatus::Draft));
        assert!(!VisitStatus::Draft.can_transition_to(&VisitStatus::Locked));

        // SIGNED can go to LOCKED
        assert!(VisitStatus::Signed.can_transition_to(&VisitStatus::Locked));
        assert!(VisitStatus::Signed.can_transition_to(&VisitStatus::Signed));
        assert!(!VisitStatus::Signed.can_transition_to(&VisitStatus::Draft));

        // LOCKED is final
        assert!(VisitStatus::Locked.can_transition_to(&VisitStatus::Locked));
        assert!(!VisitStatus::Locked.can_transition_to(&VisitStatus::Draft));
        assert!(!VisitStatus::Locked.can_transition_to(&VisitStatus::Signed));
    }

    #[test]
    fn test_visit_status_editable() {
        assert!(VisitStatus::Draft.is_editable());
        assert!(!VisitStatus::Signed.is_editable());
        assert!(!VisitStatus::Locked.is_editable());
    }

    #[test]
    fn test_vital_signs_bmi_calculation() {
        let mut vitals = VitalSigns {
            blood_pressure_systolic: Some(120.0),
            blood_pressure_diastolic: Some(80.0),
            heart_rate: Some(72.0),
            respiratory_rate: Some(16.0),
            temperature_celsius: Some(36.6),
            weight_kg: Some(75.0),
            height_cm: Some(175.0),
            bmi: None,
            oxygen_saturation: Some(98.0),
        };

        vitals.calculate_bmi();
        assert!(vitals.bmi.is_some());
        let bmi = vitals.bmi.unwrap();
        assert!((bmi - 24.49).abs() < 0.1); // BMI should be ~24.49
    }

    #[test]
    fn test_vital_signs_validation() {
        let mut valid_vitals = VitalSigns {
            blood_pressure_systolic: Some(120.0),
            blood_pressure_diastolic: Some(80.0),
            heart_rate: Some(72.0),
            respiratory_rate: Some(16.0),
            temperature_celsius: Some(36.6),
            weight_kg: Some(75.0),
            height_cm: Some(175.0),
            bmi: None,
            oxygen_saturation: Some(98.0),
        };

        assert!(valid_vitals.validate_and_calculate().is_ok());

        // Test invalid BP
        let mut invalid_vitals = valid_vitals.clone();
        invalid_vitals.blood_pressure_systolic = Some(300.0); // Too high
        assert!(invalid_vitals.validate().is_err());

        // Test invalid temperature
        let mut invalid_vitals = valid_vitals.clone();
        invalid_vitals.temperature_celsius = Some(50.0); // Too high
        assert!(invalid_vitals.validate().is_err());
    }
}
