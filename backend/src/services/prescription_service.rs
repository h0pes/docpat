/*!
 * Prescription Service
 *
 * Handles business logic for prescription management including:
 * - CRUD operations for prescriptions
 * - Medication search
 * - Refill tracking
 * - Drug interaction checking (placeholder)
 * - Encryption/decryption of medication data
 * - Audit logging for all operations
 */

use crate::{
    models::{
        AuditAction, CreatePrescriptionRequest, DrugInteractionWarning, MedicationForm,
        Prescription, PrescriptionResponse, PrescriptionStatus, RouteOfAdministration,
        UpdatePrescriptionRequest,
    },
    utils::encryption::EncryptionKey,
};
use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

/// Medication search result
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MedicationSearchResult {
    pub name: String,
    pub generic_name: Option<String>,
    pub form: Option<MedicationForm>,
    pub common_dosages: Vec<String>,
}

/// Prescription Service
pub struct PrescriptionService {
    pool: PgPool,
    encryption_key: EncryptionKey,
}

impl PrescriptionService {
    /// Create new prescription service
    pub fn new(pool: PgPool, encryption_key: EncryptionKey) -> Self {
        Self {
            pool,
            encryption_key,
        }
    }

    /// Create a new prescription
    pub async fn create_prescription(
        &self,
        data: CreatePrescriptionRequest,
        created_by: Uuid,
    ) -> Result<PrescriptionResponse> {
        // Use visit_id directly (it's already Option<Uuid>)
        let visit_id = data.visit_id;

        // Get visit information if visit_id provided
        let (visit_date, patient_id_from_visit) = if let Some(vid) = visit_id {
            let visit = sqlx::query!(
                "SELECT patient_id, visit_date FROM visits WHERE id = $1",
                vid
            )
            .fetch_optional(&self.pool)
            .await
            .context("Failed to check visit existence")?
            .ok_or_else(|| anyhow::anyhow!("Visit not found"))?;
            (Some(visit.visit_date), Some(visit.patient_id))
        } else {
            (None, None)
        };

        // Use patient_id from request or visit
        let patient_id = Uuid::parse_str(&data.patient_id)
            .context("Invalid patient_id format")?;

        // Validate patient_id matches visit if both provided
        if let Some(visit_patient_id) = patient_id_from_visit {
            if visit_patient_id != patient_id {
                return Err(anyhow::anyhow!("Patient ID mismatch with visit"));
            }
        }

        // Encrypt medication fields
        let encrypted_medication_name = self.encryption_key.encrypt(&data.medication_name)?;
        let encrypted_generic_name = data
            .generic_name
            .as_ref()
            .map(|n| self.encryption_key.encrypt(n))
            .transpose()?;
        let encrypted_dosage = self.encryption_key.encrypt(&data.dosage)?;
        let encrypted_frequency = self.encryption_key.encrypt(&data.frequency)?;
        let encrypted_duration = data
            .duration
            .as_ref()
            .map(|d| self.encryption_key.encrypt(d))
            .transpose()?;
        let encrypted_instructions = data
            .instructions
            .as_ref()
            .map(|i| self.encryption_key.encrypt(i))
            .transpose()?;
        let encrypted_pharmacy_notes = data
            .pharmacy_notes
            .as_ref()
            .map(|n| self.encryption_key.encrypt(n))
            .transpose()?;

        // Convert enums to strings for database
        let form_str = data.form.map(|f| format!("{:?}", f).to_uppercase());
        let route_str = data.route.map(|r| format!("{:?}", r).to_uppercase());

        // Insert prescription
        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            INSERT INTO prescriptions (
                visit_id,
                visit_date,
                patient_id,
                provider_id,
                medication_name,
                generic_name,
                dosage,
                form,
                route,
                frequency,
                duration,
                quantity,
                refills,
                instructions,
                pharmacy_notes,
                prescribed_date,
                start_date,
                end_date,
                status,
                refills_remaining,
                has_interactions,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING
                id,
                visit_id,
                visit_date,
                patient_id,
                provider_id,
                medication_name,
                generic_name,
                dosage,
                form,
                route,
                frequency,
                duration,
                quantity,
                refills AS "refills!",
                instructions,
                pharmacy_notes,
                prescribed_date,
                start_date,
                end_date,
                status AS "status: PrescriptionStatus",
                discontinuation_reason,
                discontinued_at,
                discontinued_by,
                refills_remaining,
                last_refill_date,
                has_interactions AS "has_interactions!",
                interaction_warnings,
                e_prescription_id,
                e_prescription_sent_at,
                e_prescription_status,
                created_at,
                updated_at,
                created_by,
                updated_by
            "#,
            visit_id,
            visit_date,
            patient_id,
            created_by, // provider_id
            encrypted_medication_name,
            encrypted_generic_name,
            encrypted_dosage,
            form_str,
            route_str,
            encrypted_frequency,
            encrypted_duration,
            data.quantity.unwrap_or(0),
            data.refills.unwrap_or(0),
            encrypted_instructions,
            encrypted_pharmacy_notes,
            data.prescribed_date,
            data.start_date,
            data.end_date,
            PrescriptionStatus::Active as PrescriptionStatus,
            data.refills.unwrap_or(0), // refills_remaining initially equals refills
            false, // has_interactions - will be updated after checking
            created_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to create prescription")?;

        // Check for drug interactions (placeholder)
        let interactions = self.check_drug_interactions(patient_id, &data.medication_name).await?;
        if !interactions.is_empty() {
            // Update prescription with interaction warnings
            sqlx::query!(
                r#"
                UPDATE prescriptions
                SET
                    has_interactions = true,
                    interaction_warnings = $2
                WHERE id = $1
                "#,
                prescription.id,
                serde_json::to_value(&interactions)?
            )
            .execute(&self.pool)
            .await
            .context("Failed to update interaction warnings")?;
        }

        // Log audit entry
        self.log_audit(
            prescription.id,
            patient_id,
            AuditAction::Create,
            created_by,
            Some(format!("Created prescription: {}", data.medication_name)),
        )
        .await?;

        // Convert to response
        self.prescription_to_response(prescription).await
    }

    /// Get prescription by ID
    pub async fn get_prescription(&self, id: Uuid) -> Result<Option<PrescriptionResponse>> {
        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            SELECT
                id,
                visit_id,
                visit_date,
                patient_id,
                provider_id,
                medication_name,
                generic_name,
                dosage,
                form,
                route,
                frequency,
                duration,
                quantity,
                refills AS "refills!",
                instructions,
                pharmacy_notes,
                prescribed_date,
                start_date,
                end_date,
                status AS "status: PrescriptionStatus",
                discontinuation_reason,
                discontinued_at,
                discontinued_by,
                refills_remaining,
                last_refill_date,
                has_interactions AS "has_interactions!",
                interaction_warnings,
                e_prescription_id,
                e_prescription_sent_at,
                e_prescription_status,
                created_at,
                updated_at,
                created_by,
                updated_by
            FROM prescriptions
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch prescription")?;

        match prescription {
            Some(p) => Ok(Some(self.prescription_to_response(p).await?)),
            None => Ok(None),
        }
    }

    /// Get all prescriptions for a patient
    pub async fn get_patient_prescriptions(
        &self,
        patient_id: Uuid,
        active_only: bool,
    ) -> Result<Vec<PrescriptionResponse>> {
        let prescriptions = if active_only {
            sqlx::query_as!(
                Prescription,
                r#"
                SELECT
                    id, visit_id, visit_date, patient_id, provider_id,
                    medication_name, generic_name, dosage, form, route,
                    frequency, duration, quantity, refills AS "refills!",
                    instructions, pharmacy_notes,
                    prescribed_date, start_date, end_date,
                    status AS "status: PrescriptionStatus",
                    discontinuation_reason, discontinued_at, discontinued_by,
                    refills_remaining, last_refill_date,
                    has_interactions AS "has_interactions!", interaction_warnings,
                    e_prescription_id, e_prescription_sent_at, e_prescription_status,
                    created_at, updated_at, created_by, updated_by
                FROM prescriptions
                WHERE patient_id = $1 AND status = 'ACTIVE'
                ORDER BY prescribed_date DESC
                "#,
                patient_id
            )
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch patient prescriptions")?
        } else {
            sqlx::query_as!(
                Prescription,
                r#"
                SELECT
                    id, visit_id, visit_date, patient_id, provider_id,
                    medication_name, generic_name, dosage, form, route,
                    frequency, duration, quantity, refills AS "refills!",
                    instructions, pharmacy_notes,
                    prescribed_date, start_date, end_date,
                    status AS "status: PrescriptionStatus",
                    discontinuation_reason, discontinued_at, discontinued_by,
                    refills_remaining, last_refill_date,
                    has_interactions AS "has_interactions!", interaction_warnings,
                    e_prescription_id, e_prescription_sent_at, e_prescription_status,
                    created_at, updated_at, created_by, updated_by
                FROM prescriptions
                WHERE patient_id = $1
                ORDER BY prescribed_date DESC
                "#,
                patient_id
            )
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch patient prescriptions")?
        };

        let mut responses = Vec::new();
        for prescription in prescriptions {
            responses.push(self.prescription_to_response(prescription).await?);
        }

        Ok(responses)
    }

    /// Get all prescriptions for a visit
    pub async fn get_visit_prescriptions(&self, visit_id: Uuid) -> Result<Vec<PrescriptionResponse>> {
        let prescriptions = sqlx::query_as!(
            Prescription,
            r#"
            SELECT
                id, visit_id, visit_date, patient_id, provider_id,
                medication_name, generic_name, dosage, form, route,
                frequency, duration, quantity, refills AS "refills!",
                instructions, pharmacy_notes,
                prescribed_date, start_date, end_date,
                status AS "status: PrescriptionStatus",
                discontinuation_reason, discontinued_at, discontinued_by,
                refills_remaining, last_refill_date,
                has_interactions AS "has_interactions!", interaction_warnings,
                e_prescription_id, e_prescription_sent_at, e_prescription_status,
                created_at, updated_at, created_by, updated_by
            FROM prescriptions
            WHERE visit_id = $1
            ORDER BY created_at ASC
            "#,
            visit_id
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch visit prescriptions")?;

        let mut responses = Vec::new();
        for prescription in prescriptions {
            responses.push(self.prescription_to_response(prescription).await?);
        }

        Ok(responses)
    }

    /// Update prescription
    pub async fn update_prescription(
        &self,
        id: Uuid,
        data: UpdatePrescriptionRequest,
        updated_by: Uuid,
    ) -> Result<PrescriptionResponse> {
        // Get existing prescription
        let existing = sqlx::query!(
            "SELECT patient_id, status FROM prescriptions WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        // Encrypt fields if provided
        let encrypted_dosage = data
            .dosage
            .as_ref()
            .map(|d| self.encryption_key.encrypt(d))
            .transpose()?;
        let encrypted_frequency = data
            .frequency
            .as_ref()
            .map(|f| self.encryption_key.encrypt(f))
            .transpose()?;
        let encrypted_duration = data
            .duration
            .as_ref()
            .map(|d| self.encryption_key.encrypt(d))
            .transpose()?;
        let encrypted_instructions = data
            .instructions
            .as_ref()
            .map(|i| self.encryption_key.encrypt(i))
            .transpose()?;
        let encrypted_pharmacy_notes = data
            .pharmacy_notes
            .as_ref()
            .map(|n| self.encryption_key.encrypt(n))
            .transpose()?;

        // Convert enums to strings
        let form_str = data.form.map(|f| format!("{:?}", f).to_uppercase());
        let route_str = data.route.map(|r| format!("{:?}", r).to_uppercase());
        let status_str = data.status.map(|s| format!("{:?}", s).to_uppercase());

        // Update prescription
        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            UPDATE prescriptions
            SET
                dosage = COALESCE($2, dosage),
                form = COALESCE($3, form),
                route = COALESCE($4, route),
                frequency = COALESCE($5, frequency),
                duration = COALESCE($6, duration),
                quantity = COALESCE($7, quantity),
                instructions = COALESCE($8, instructions),
                pharmacy_notes = COALESCE($9, pharmacy_notes),
                start_date = COALESCE($10, start_date),
                end_date = COALESCE($11, end_date),
                status = COALESCE($12, status),
                updated_at = NOW(),
                updated_by = $13
            WHERE id = $1
            RETURNING
                id, visit_id, visit_date, patient_id, provider_id,
                medication_name, generic_name, dosage, form, route,
                frequency, duration, quantity, refills AS "refills!",
                instructions, pharmacy_notes,
                prescribed_date, start_date, end_date,
                status AS "status: PrescriptionStatus",
                discontinuation_reason, discontinued_at, discontinued_by,
                refills_remaining, last_refill_date,
                has_interactions AS "has_interactions!", interaction_warnings,
                e_prescription_id, e_prescription_sent_at, e_prescription_status,
                created_at, updated_at, created_by, updated_by
            "#,
            id,
            encrypted_dosage,
            form_str,
            route_str,
            encrypted_frequency,
            encrypted_duration,
            data.quantity,
            encrypted_instructions,
            encrypted_pharmacy_notes,
            data.start_date,
            data.end_date,
            status_str,
            updated_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to update prescription")?;

        // Log audit entry
        self.log_audit(
            prescription.id,
            existing.patient_id,
            AuditAction::Update,
            updated_by,
            Some("Updated prescription".to_string()),
        )
        .await?;

        // Convert to response
        self.prescription_to_response(prescription).await
    }

    /// Discontinue prescription
    pub async fn discontinue_prescription(
        &self,
        id: Uuid,
        reason: String,
        discontinued_by: Uuid,
    ) -> Result<PrescriptionResponse> {
        // Get existing prescription
        let existing = sqlx::query_as!(
            Prescription,
            r#"
            SELECT
                id, visit_id, visit_date, patient_id, provider_id,
                medication_name, generic_name, dosage, form, route,
                frequency, duration, quantity, refills AS "refills!",
                instructions, pharmacy_notes,
                prescribed_date, start_date, end_date,
                status AS "status: PrescriptionStatus",
                discontinuation_reason, discontinued_at, discontinued_by,
                refills_remaining, last_refill_date,
                has_interactions AS "has_interactions!", interaction_warnings,
                e_prescription_id, e_prescription_sent_at, e_prescription_status,
                created_at, updated_at, created_by, updated_by
            FROM prescriptions
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        // Check if can be discontinued
        if !existing.status.can_discontinue() {
            return Err(anyhow::anyhow!(
                "Cannot discontinue prescription with status {:?}",
                existing.status
            ));
        }

        // Encrypt reason
        let encrypted_reason = self.encryption_key.encrypt(&reason)?;

        // Update prescription
        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            UPDATE prescriptions
            SET
                status = 'DISCONTINUED',
                discontinuation_reason = $2,
                discontinued_at = NOW(),
                discontinued_by = $3,
                updated_at = NOW(),
                updated_by = $3
            WHERE id = $1
            RETURNING
                id, visit_id, visit_date, patient_id, provider_id,
                medication_name, generic_name, dosage, form, route,
                frequency, duration, quantity, refills AS "refills!",
                instructions, pharmacy_notes,
                prescribed_date, start_date, end_date,
                status AS "status: PrescriptionStatus",
                discontinuation_reason, discontinued_at, discontinued_by,
                refills_remaining, last_refill_date,
                has_interactions AS "has_interactions!", interaction_warnings,
                e_prescription_id, e_prescription_sent_at, e_prescription_status,
                created_at, updated_at, created_by, updated_by
            "#,
            id,
            encrypted_reason,
            discontinued_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to discontinue prescription")?;

        // Log audit entry
        self.log_audit(
            prescription.id,
            prescription.patient_id,
            AuditAction::Update,
            discontinued_by,
            Some(format!("Discontinued prescription: {}", reason)),
        )
        .await?;

        // Convert to response
        self.prescription_to_response(prescription).await
    }

    /// Delete prescription
    pub async fn delete_prescription(&self, id: Uuid, deleted_by: Uuid) -> Result<()> {
        // Get patient_id for audit logging
        let prescription = sqlx::query!(
            "SELECT patient_id FROM prescriptions WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        // Delete prescription
        sqlx::query!("DELETE FROM prescriptions WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .context("Failed to delete prescription")?;

        // Log audit entry
        self.log_audit(
            id,
            prescription.patient_id,
            AuditAction::Delete,
            deleted_by,
            Some("Deleted prescription".to_string()),
        )
        .await?;

        Ok(())
    }

    /// Search medications
    /// Note: This is a placeholder. In production, use a proper medication database or API
    pub async fn search_medications(
        &self,
        query: &str,
        limit: i64,
    ) -> Result<Vec<MedicationSearchResult>> {
        // This is a simplified search using hardcoded common medications
        // In production, integrate with proper medication database or API (e.g., RxNorm, FDA database)
        let results = self
            .get_common_medications()
            .into_iter()
            .filter(|med| {
                let query_lower = query.to_lowercase();
                med.name.to_lowercase().contains(&query_lower)
                    || med
                        .generic_name
                        .as_ref()
                        .map(|g| g.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
            })
            .take(limit as usize)
            .collect();

        Ok(results)
    }

    /// Check for drug interactions (placeholder)
    /// In production, integrate with drug interaction database or API
    async fn check_drug_interactions(
        &self,
        patient_id: Uuid,
        medication_name: &str,
    ) -> Result<Vec<DrugInteractionWarning>> {
        // Placeholder: return empty list
        // In production, check against patient's current medications using:
        // - FDA drug interaction database
        // - Clinical decision support system
        // - Third-party API (e.g., Medscape, Epocrates)

        Ok(vec![])
    }

    /// Get common medications (placeholder - in production use proper database)
    fn get_common_medications(&self) -> Vec<MedicationSearchResult> {
        vec![
            // Blood pressure medications
            MedicationSearchResult {
                name: "Lisinopril".to_string(),
                generic_name: Some("Lisinopril".to_string()),
                form: Some(MedicationForm::Tablet),
                common_dosages: vec!["5 mg".to_string(), "10 mg".to_string(), "20 mg".to_string()],
            },
            MedicationSearchResult {
                name: "Amlodipine".to_string(),
                generic_name: Some("Amlodipine besylate".to_string()),
                form: Some(MedicationForm::Tablet),
                common_dosages: vec!["2.5 mg".to_string(), "5 mg".to_string(), "10 mg".to_string()],
            },
            // Diabetes medications
            MedicationSearchResult {
                name: "Metformin".to_string(),
                generic_name: Some("Metformin hydrochloride".to_string()),
                form: Some(MedicationForm::Tablet),
                common_dosages: vec!["500 mg".to_string(), "850 mg".to_string(), "1000 mg".to_string()],
            },
            // Pain relief
            MedicationSearchResult {
                name: "Ibuprofen".to_string(),
                generic_name: Some("Ibuprofen".to_string()),
                form: Some(MedicationForm::Tablet),
                common_dosages: vec!["200 mg".to_string(), "400 mg".to_string(), "600 mg".to_string()],
            },
            MedicationSearchResult {
                name: "Acetaminophen".to_string(),
                generic_name: Some("Paracetamol".to_string()),
                form: Some(MedicationForm::Tablet),
                common_dosages: vec!["325 mg".to_string(), "500 mg".to_string(), "650 mg".to_string()],
            },
            // Antibiotics
            MedicationSearchResult {
                name: "Amoxicillin".to_string(),
                generic_name: Some("Amoxicillin trihydrate".to_string()),
                form: Some(MedicationForm::Capsule),
                common_dosages: vec!["250 mg".to_string(), "500 mg".to_string()],
            },
            // Respiratory
            MedicationSearchResult {
                name: "Albuterol".to_string(),
                generic_name: Some("Albuterol sulfate".to_string()),
                form: Some(MedicationForm::Inhaler),
                common_dosages: vec!["90 mcg/actuation".to_string()],
            },
        ]
    }

    /// Convert prescription model to response (decrypting fields)
    async fn prescription_to_response(&self, prescription: Prescription) -> Result<PrescriptionResponse> {
        // Decrypt medication fields
        let decrypted_medication_name = self.encryption_key.decrypt(&prescription.medication_name)?;
        let decrypted_generic_name = prescription
            .generic_name
            .as_ref()
            .map(|n| self.encryption_key.decrypt(n))
            .transpose()?;
        let decrypted_dosage = self.encryption_key.decrypt(&prescription.dosage)?;
        let decrypted_frequency = self.encryption_key.decrypt(&prescription.frequency)?;
        let decrypted_duration = prescription
            .duration
            .as_ref()
            .map(|d| self.encryption_key.decrypt(d))
            .transpose()?;
        let decrypted_instructions = prescription
            .instructions
            .as_ref()
            .map(|i| self.encryption_key.decrypt(i))
            .transpose()?;
        let decrypted_pharmacy_notes = prescription
            .pharmacy_notes
            .as_ref()
            .map(|n| self.encryption_key.decrypt(n))
            .transpose()?;
        let decrypted_discontinuation_reason = prescription
            .discontinuation_reason
            .as_ref()
            .map(|r| self.encryption_key.decrypt(r))
            .transpose()?;

        // Deserialize interaction warnings from JSONB
        let interaction_warnings = prescription
            .interaction_warnings
            .as_ref()
            .map(|json| serde_json::from_value(json.clone()))
            .transpose()
            .context("Failed to deserialize interaction warnings")?;

        Ok(PrescriptionResponse {
            id: prescription.id,
            visit_id: prescription.visit_id,
            visit_date: prescription.visit_date,
            patient_id: prescription.patient_id,
            provider_id: prescription.provider_id,
            medication_name: decrypted_medication_name,
            generic_name: decrypted_generic_name,
            dosage: decrypted_dosage,
            form: prescription.form,
            route: prescription.route,
            frequency: decrypted_frequency,
            duration: decrypted_duration,
            quantity: prescription.quantity,
            refills: prescription.refills,
            instructions: decrypted_instructions,
            pharmacy_notes: decrypted_pharmacy_notes,
            prescribed_date: prescription.prescribed_date,
            start_date: prescription.start_date,
            end_date: prescription.end_date,
            status: prescription.status,
            discontinuation_reason: decrypted_discontinuation_reason,
            discontinued_at: prescription.discontinued_at,
            discontinued_by: prescription.discontinued_by,
            refills_remaining: prescription.refills_remaining,
            last_refill_date: prescription.last_refill_date,
            has_interactions: prescription.has_interactions,
            interaction_warnings,
            e_prescription_id: prescription.e_prescription_id,
            e_prescription_sent_at: prescription.e_prescription_sent_at,
            e_prescription_status: prescription.e_prescription_status,
            created_at: prescription.created_at,
            updated_at: prescription.updated_at,
            created_by: prescription.created_by,
            updated_by: prescription.updated_by,
        })
    }

    /// Log audit entry for prescription operations
    async fn log_audit(
        &self,
        prescription_id: Uuid,
        patient_id: Uuid,
        action: AuditAction,
        user_id: Uuid,
        details: Option<String>,
    ) -> Result<()> {
        let changes = details.map(|d| serde_json::json!({"message": d}));

        sqlx::query!(
            r#"
            INSERT INTO audit_logs (
                user_id,
                action,
                entity_type,
                entity_id,
                changes,
                ip_address,
                user_agent
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            Some(user_id),
            format!("{}", action),
            "PRESCRIPTION",
            Some(prescription_id.to_string()),
            changes,
            None::<ipnetwork::IpNetwork>, // ip_address
            None::<&str>  // user_agent
        )
        .execute(&self.pool)
        .await
        .context("Failed to log audit entry")?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_medication_search_filtering() {
        let service = PrescriptionService {
            pool: PgPool::connect_lazy("postgresql://test").unwrap(),
            encryption_key: EncryptionKey::from_base64("dGVzdF9lbmNyeXB0aW9uX2tleV8zMl9ieXRlcw==").unwrap(),
        };

        let meds = service.get_common_medications();
        assert!(!meds.is_empty());
        assert!(meds.iter().any(|m| m.name == "Lisinopril"));
        assert!(meds.iter().any(|m| m.name == "Metformin"));
    }
}
