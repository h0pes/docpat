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

    /// Set RLS context variables for database connection
    async fn set_rls_context(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        user_id: Uuid,
        role: &str,
    ) -> Result<()> {
        let user_id_query = format!("SET LOCAL app.current_user_id = '{}'", user_id);
        let role_query = format!("SET LOCAL app.current_user_role = '{}'", role);

        sqlx::query(&user_id_query)
            .execute(&mut **tx)
            .await
            .context("Failed to set RLS user context")?;

        sqlx::query(&role_query)
            .execute(&mut **tx)
            .await
            .context("Failed to set RLS role context")?;

        Ok(())
    }

    /// Create a new prescription
    pub async fn create_prescription(
        &self,
        data: CreatePrescriptionRequest,
        created_by: Uuid,
        role: &str,
    ) -> Result<PrescriptionResponse> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context variables
        Self::set_rls_context(&mut tx, created_by, role).await?;

        // Use visit_id directly (it's already Option<Uuid>)
        let visit_id = data.visit_id;

        // Get visit information if visit_id provided
        let (visit_date, patient_id_from_visit) = if let Some(vid) = visit_id {
            let visit = sqlx::query!(
                "SELECT patient_id, visit_date FROM visits WHERE id = $1",
                vid
            )
            .fetch_optional(&mut *tx)
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

        // Default prescribed_date to today if not provided (required by NOT NULL constraint)
        let prescribed_date = data
            .prescribed_date
            .unwrap_or_else(|| chrono::Local::now().date_naive());

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
            data.quantity, // Keep as Option - DB allows NULL
            data.refills.unwrap_or(0),
            encrypted_instructions,
            encrypted_pharmacy_notes,
            prescribed_date, // Now guaranteed non-null
            data.start_date,
            data.end_date,
            PrescriptionStatus::Active as PrescriptionStatus,
            data.refills.unwrap_or(0), // refills_remaining initially equals refills
            false, // has_interactions - will be updated after checking
            created_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to create prescription")?;

        // Use frontend-provided interaction warnings if available (user already confirmed these)
        // Otherwise, do server-side check as fallback
        let interactions = if let Some(ref warnings) = data.interaction_warnings {
            if !warnings.is_empty() {
                warnings.clone()
            } else {
                self.check_drug_interactions(patient_id, &data.medication_name).await?
            }
        } else {
            self.check_drug_interactions(patient_id, &data.medication_name).await?
        };

        if !interactions.is_empty() {
            // Update prescription with interaction warnings - use transaction
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
            .execute(&mut *tx)
            .await
            .context("Failed to update interaction warnings")?;
        }

        // Commit transaction before audit logging
        tx.commit().await.context("Failed to commit transaction")?;

        // Log audit entry (outside transaction - doesn't need RLS context)
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
    pub async fn get_prescription(
        &self,
        id: Uuid,
        user_id: Uuid,
        role: &str,
    ) -> Result<Option<PrescriptionResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id, role).await?;

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
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch prescription")?;

        tx.commit().await.context("Failed to commit transaction")?;

        match prescription {
            Some(p) => Ok(Some(self.prescription_to_response(p).await?)),
            None => Ok(None),
        }
    }

    /// List all prescriptions with optional filters
    ///
    /// # Arguments
    /// * `status` - Optional status filter
    /// * `patient_id` - Optional patient ID filter
    /// * `start_date` - Optional start date filter (inclusive)
    /// * `end_date` - Optional end date filter (inclusive)
    /// * `limit` - Maximum number of results (default 50)
    /// * `offset` - Pagination offset (default 0)
    /// * `user_id` - Current user ID for RLS context
    /// * `role` - Current user role for RLS context
    pub async fn list_prescriptions(
        &self,
        status: Option<PrescriptionStatus>,
        patient_id: Option<Uuid>,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
        limit: i64,
        offset: i64,
        user_id: Uuid,
        role: &str,
    ) -> Result<(Vec<PrescriptionResponse>, i64)> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id, role).await?;

        // Build dynamic WHERE clause
        let mut conditions: Vec<String> = Vec::new();
        let status_str = status.map(|s| format!("{:?}", s).to_uppercase());

        if status_str.is_some() {
            conditions.push("status = $1".to_string());
        }
        if patient_id.is_some() {
            let idx = conditions.len() + 1;
            conditions.push(format!("patient_id = ${}", idx));
        }
        if start_date.is_some() {
            let idx = conditions.len() + 1;
            conditions.push(format!("prescribed_date >= ${}", idx));
        }
        if end_date.is_some() {
            let idx = conditions.len() + 1;
            conditions.push(format!("prescribed_date <= ${}", idx));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Build the main query
        let query = format!(
            r#"
            SELECT
                id, visit_id, visit_date, patient_id, provider_id,
                medication_name, generic_name, dosage, form, route,
                frequency, duration, quantity, refills,
                instructions, pharmacy_notes,
                prescribed_date, start_date, end_date,
                status,
                discontinuation_reason, discontinued_at, discontinued_by,
                refills_remaining, last_refill_date,
                has_interactions, interaction_warnings,
                e_prescription_id, e_prescription_sent_at, e_prescription_status,
                created_at, updated_at, created_by, updated_by
            FROM prescriptions
            {}
            ORDER BY prescribed_date DESC
            LIMIT {} OFFSET {}
            "#,
            where_clause, limit, offset
        );

        let count_query = format!(
            "SELECT COUNT(*) FROM prescriptions {}",
            where_clause
        );

        // Build and execute query with dynamic parameters
        let mut query_builder = sqlx::query_as::<_, Prescription>(&query);
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);

        // Bind parameters in order
        if let Some(ref s) = status_str {
            query_builder = query_builder.bind(s);
            count_builder = count_builder.bind(s);
        }
        if let Some(pid) = patient_id {
            query_builder = query_builder.bind(pid);
            count_builder = count_builder.bind(pid);
        }
        if let Some(sd) = start_date {
            query_builder = query_builder.bind(sd);
            count_builder = count_builder.bind(sd);
        }
        if let Some(ed) = end_date {
            query_builder = query_builder.bind(ed);
            count_builder = count_builder.bind(ed);
        }

        let prescriptions = query_builder
            .fetch_all(&mut *tx)
            .await
            .context("Failed to fetch prescriptions")?;

        let total = count_builder
            .fetch_one(&mut *tx)
            .await
            .context("Failed to count prescriptions")?;

        tx.commit().await.context("Failed to commit transaction")?;

        let mut responses = Vec::new();
        for prescription in prescriptions {
            responses.push(self.prescription_to_response(prescription).await?);
        }

        Ok((responses, total))
    }

    /// Get all prescriptions for a patient
    pub async fn get_patient_prescriptions(
        &self,
        patient_id: Uuid,
        active_only: bool,
        user_id: Uuid,
        role: &str,
    ) -> Result<Vec<PrescriptionResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id, role).await?;

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
            .fetch_all(&mut *tx)
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
            .fetch_all(&mut *tx)
            .await
            .context("Failed to fetch patient prescriptions")?
        };

        tx.commit().await.context("Failed to commit transaction")?;

        let mut responses = Vec::new();
        for prescription in prescriptions {
            responses.push(self.prescription_to_response(prescription).await?);
        }

        Ok(responses)
    }

    /// Get all prescriptions for a visit
    pub async fn get_visit_prescriptions(
        &self,
        visit_id: Uuid,
        user_id: Uuid,
        role: &str,
    ) -> Result<Vec<PrescriptionResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id, role).await?;

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
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch visit prescriptions")?;

        tx.commit().await.context("Failed to commit transaction")?;

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
        role: &str,
    ) -> Result<PrescriptionResponse> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, updated_by, role).await?;

        // Get existing prescription
        let existing = sqlx::query!(
            "SELECT patient_id, status FROM prescriptions WHERE id = $1",
            id
        )
        .fetch_optional(&mut *tx)
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
        .fetch_one(&mut *tx)
        .await
        .context("Failed to update prescription")?;

        tx.commit().await.context("Failed to commit transaction")?;

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
        role: &str,
    ) -> Result<PrescriptionResponse> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, discontinued_by, role).await?;

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
        .fetch_optional(&mut *tx)
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
        .fetch_one(&mut *tx)
        .await
        .context("Failed to discontinue prescription")?;

        tx.commit().await.context("Failed to commit transaction")?;

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

    /// Cancel a prescription
    ///
    /// Changes status to CANCELLED. Only ACTIVE prescriptions can be cancelled.
    pub async fn cancel_prescription(
        &self,
        id: Uuid,
        reason: Option<String>,
        cancelled_by: Uuid,
        role: &str,
    ) -> Result<PrescriptionResponse> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, cancelled_by, role).await?;

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
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        // Check if can be cancelled (only ACTIVE)
        if existing.status != PrescriptionStatus::Active {
            return Err(anyhow::anyhow!(
                "Cannot cancel prescription with status {:?}. Only ACTIVE prescriptions can be cancelled.",
                existing.status
            ));
        }

        // Encrypt reason if provided
        let encrypted_reason = reason
            .as_ref()
            .map(|r| self.encryption_key.encrypt(r))
            .transpose()?;

        // Update prescription
        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            UPDATE prescriptions
            SET
                status = 'CANCELLED',
                discontinuation_reason = COALESCE($2, discontinuation_reason),
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
            cancelled_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to cancel prescription")?;

        tx.commit().await.context("Failed to commit transaction")?;

        self.log_audit(
            prescription.id,
            prescription.patient_id,
            AuditAction::Update,
            cancelled_by,
            Some(format!("Cancelled prescription: {:?}", reason)),
        )
        .await?;

        self.prescription_to_response(prescription).await
    }

    /// Put prescription on hold
    ///
    /// Changes status to ON_HOLD. Only ACTIVE prescriptions can be put on hold.
    pub async fn hold_prescription(
        &self,
        id: Uuid,
        reason: String,
        updated_by: Uuid,
        role: &str,
    ) -> Result<PrescriptionResponse> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, updated_by, role).await?;

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
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        if existing.status != PrescriptionStatus::Active {
            return Err(anyhow::anyhow!(
                "Cannot put prescription on hold with status {:?}. Only ACTIVE prescriptions can be put on hold.",
                existing.status
            ));
        }

        let encrypted_reason = self.encryption_key.encrypt(&reason)?;

        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            UPDATE prescriptions
            SET
                status = 'ON_HOLD',
                discontinuation_reason = $2,
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
            updated_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to put prescription on hold")?;

        tx.commit().await.context("Failed to commit transaction")?;

        self.log_audit(
            prescription.id,
            prescription.patient_id,
            AuditAction::Update,
            updated_by,
            Some(format!("Put prescription on hold: {}", reason)),
        )
        .await?;

        self.prescription_to_response(prescription).await
    }

    /// Resume prescription from hold
    ///
    /// Changes status from ON_HOLD back to ACTIVE.
    pub async fn resume_prescription(
        &self,
        id: Uuid,
        updated_by: Uuid,
        role: &str,
    ) -> Result<PrescriptionResponse> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, updated_by, role).await?;

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
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        if existing.status != PrescriptionStatus::OnHold {
            return Err(anyhow::anyhow!(
                "Cannot resume prescription with status {:?}. Only ON_HOLD prescriptions can be resumed.",
                existing.status
            ));
        }

        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            UPDATE prescriptions
            SET
                status = 'ACTIVE',
                discontinuation_reason = NULL,
                updated_at = NOW(),
                updated_by = $2
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
            updated_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to resume prescription")?;

        tx.commit().await.context("Failed to commit transaction")?;

        self.log_audit(
            prescription.id,
            prescription.patient_id,
            AuditAction::Update,
            updated_by,
            Some("Resumed prescription from hold".to_string()),
        )
        .await?;

        self.prescription_to_response(prescription).await
    }

    /// Mark prescription as completed
    ///
    /// Changes status to COMPLETED. Only ACTIVE or ON_HOLD prescriptions can be marked complete.
    pub async fn complete_prescription(
        &self,
        id: Uuid,
        updated_by: Uuid,
        role: &str,
    ) -> Result<PrescriptionResponse> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, updated_by, role).await?;

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
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        if !matches!(existing.status, PrescriptionStatus::Active | PrescriptionStatus::OnHold) {
            return Err(anyhow::anyhow!(
                "Cannot complete prescription with status {:?}. Only ACTIVE or ON_HOLD prescriptions can be completed.",
                existing.status
            ));
        }

        let prescription = sqlx::query_as!(
            Prescription,
            r#"
            UPDATE prescriptions
            SET
                status = 'COMPLETED',
                updated_at = NOW(),
                updated_by = $2
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
            updated_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to complete prescription")?;

        tx.commit().await.context("Failed to commit transaction")?;

        self.log_audit(
            prescription.id,
            prescription.patient_id,
            AuditAction::Update,
            updated_by,
            Some("Marked prescription as completed".to_string()),
        )
        .await?;

        self.prescription_to_response(prescription).await
    }

    /// Delete prescription
    pub async fn delete_prescription(
        &self,
        id: Uuid,
        deleted_by: Uuid,
        role: &str,
    ) -> Result<()> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, deleted_by, role).await?;

        // Get patient_id for audit logging
        let prescription = sqlx::query!(
            "SELECT patient_id FROM prescriptions WHERE id = $1",
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check prescription existence")?
        .ok_or_else(|| anyhow::anyhow!("Prescription not found"))?;

        // Delete prescription
        let result = sqlx::query!("DELETE FROM prescriptions WHERE id = $1", id)
            .execute(&mut *tx)
            .await
            .context("Failed to delete prescription")?;

        // Verify the prescription was actually deleted
        if result.rows_affected() == 0 {
            return Err(anyhow::anyhow!("Prescription could not be deleted - permission denied"));
        }

        tx.commit().await.context("Failed to commit transaction")?;

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

    /// Search medications from the database
    /// Searches both commercial names and generic names using fuzzy matching
    pub async fn search_medications(
        &self,
        query: &str,
        limit: i64,
    ) -> Result<Vec<MedicationSearchResult>> {
        // Use trigram similarity search for fuzzy matching
        let search_pattern = format!("%{}%", query.to_lowercase());

        let rows = sqlx::query!(
            r#"
            SELECT
                name,
                generic_name,
                form,
                common_dosages
            FROM medications
            WHERE is_active = true
              AND (
                  LOWER(name) LIKE $1
                  OR LOWER(generic_name) LIKE $1
                  OR name % $2
                  OR generic_name % $2
              )
            ORDER BY
                CASE
                    WHEN LOWER(name) = LOWER($2) THEN 0
                    WHEN LOWER(generic_name) = LOWER($2) THEN 1
                    WHEN LOWER(name) LIKE $1 THEN 2
                    WHEN LOWER(generic_name) LIKE $1 THEN 3
                    ELSE 4
                END,
                similarity(name, $2) DESC
            LIMIT $3
            "#,
            search_pattern,
            query,
            limit
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to search medications")?;

        let results = rows
            .into_iter()
            .map(|row| {
                // Parse common_dosages from JSONB
                let common_dosages: Vec<String> = row
                    .common_dosages
                    .and_then(|v| serde_json::from_value(v).ok())
                    .unwrap_or_default();

                // Convert form string to MedicationForm enum
                let form = row.form.and_then(|f| match f.to_lowercase().as_str() {
                    "tablet" => Some(MedicationForm::Tablet),
                    "capsule" => Some(MedicationForm::Capsule),
                    "liquid" | "solution" | "syrup" => Some(MedicationForm::Liquid),
                    "injection" => Some(MedicationForm::Injection),
                    "topical" | "cream" | "gel" | "ointment" => Some(MedicationForm::Topical),
                    "inhaler" => Some(MedicationForm::Inhaler),
                    "patch" | "transdermal" => Some(MedicationForm::Patch),
                    "suppository" => Some(MedicationForm::Suppository),
                    "drops" => Some(MedicationForm::Drops),
                    _ => None,
                });

                MedicationSearchResult {
                    name: row.name,
                    generic_name: row.generic_name,
                    form,
                    common_dosages,
                }
            })
            .collect();

        Ok(results)
    }

    /// Create a custom medication (added by doctor)
    pub async fn create_custom_medication(
        &self,
        name: String,
        generic_name: Option<String>,
        form: Option<String>,
        dosage_strength: Option<String>,
        route: Option<String>,
        common_dosages: Vec<String>,
        notes: Option<String>,
        created_by: Uuid,
        role: &str,
    ) -> Result<Uuid> {
        let common_dosages_json = serde_json::to_value(&common_dosages)?;

        // Start transaction and set RLS context
        let mut tx = self.pool.begin().await?;
        Self::set_rls_context(&mut tx, created_by, role).await?;

        // Generate a unique ID and pseudo-AIC code for custom medications
        // The unique_aic_code constraint has NULLS NOT DISTINCT, so we need a unique value
        let medication_id = Uuid::new_v4();
        let custom_aic = format!("CUST-{}", &medication_id.to_string()[..8]);

        let id = sqlx::query_scalar!(
            r#"
            INSERT INTO medications (
                id, aic_code, name, generic_name, form, dosage_strength, route,
                common_dosages, notes, source, is_custom, created_by, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CUSTOM', true, $10, true)
            ON CONFLICT (name, generic_name, form, dosage_strength, is_custom)
            DO UPDATE SET
                updated_at = NOW(),
                notes = COALESCE(EXCLUDED.notes, medications.notes)
            RETURNING id
            "#,
            medication_id,
            custom_aic,
            name,
            generic_name,
            form,
            dosage_strength,
            route,
            common_dosages_json,
            notes,
            created_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to create custom medication")?;

        tx.commit().await?;

        Ok(id)
    }

    /// Check for drug interactions (placeholder)
    /// In production, integrate with drug interaction database or API
    async fn check_drug_interactions(
        &self,
        _patient_id: Uuid,
        _medication_name: &str,
    ) -> Result<Vec<DrugInteractionWarning>> {
        // Placeholder: return empty list
        // In production, check against patient's current medications using:
        // - FDA drug interaction database
        // - Clinical decision support system
        // - Third-party API (e.g., Medscape, Epocrates)

        Ok(vec![])
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

    // Test disabled - EncryptionKey::from_base64() method doesn't exist
    // Use from_env() or create integration tests instead
    /*
    #[test]
    fn test_medication_search_filtering() {
        // Disabled - requires proper encryption key initialization
    }
    */
}
