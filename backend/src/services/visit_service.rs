/*!
 * Visit Service Layer
 *
 * Business logic for clinical visit management including:
 * - CRUD operations with encryption
 * - Status workflow transitions (DRAFT → SIGNED → LOCKED)
 * - Digital signature generation
 * - Pagination and filtering
 * - Audit logging
 */

use crate::models::{
    AuditAction, AuditLog, CreateAuditLog, CreateVisitRequest, EntityType, RequestContext,
    UpdateVisitRequest, Visit, VisitResponse, VisitStatus, VisitType,
};
use crate::utils::encryption::EncryptionKey;
use anyhow::{Context, Result};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

/// Visit search/filter parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitSearchFilter {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub visit_type: Option<VisitType>,
    pub status: Option<VisitStatus>,
    pub date_from: Option<NaiveDate>,
    pub date_to: Option<NaiveDate>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

impl Default for VisitSearchFilter {
    fn default() -> Self {
        Self {
            patient_id: None,
            provider_id: None,
            visit_type: None,
            status: None,
            date_from: None,
            date_to: None,
            limit: Some(20),
            offset: Some(0),
        }
    }
}

/// Visit statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitStatistics {
    pub total_visits: i64,
    pub drafts: i64,
    pub signed: i64,
    pub locked: i64,
    pub by_type: Vec<VisitTypeCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitTypeCount {
    pub visit_type: VisitType,
    pub count: i64,
}

/// Request to sign a visit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignVisitRequest {
    pub signed_by: Uuid,
}

/// Request to lock a visit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockVisitRequest {
    pub locked_by: Uuid,
}

pub struct VisitService {
    pool: PgPool,
    encryption_key: EncryptionKey,
}

impl VisitService {
    /// Create a new visit service
    pub fn new(pool: PgPool, encryption_key: EncryptionKey) -> Self {
        Self {
            pool,
            encryption_key,
        }
    }

    /// Helper to set RLS context within a transaction
    async fn set_rls_context(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        user_id: Uuid,
    ) -> Result<()> {
        // Query the user's role from the database
        let role: String = sqlx::query_scalar(
            "SELECT role::TEXT FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_one(&mut **tx)
        .await
        .context("Failed to fetch user role for RLS context")?;

        // Set RLS context variables using set_config() for parameterized queries
        sqlx::query("SELECT set_config('app.current_user_id', $1, true)")
            .bind(user_id.to_string())
            .execute(&mut **tx)
            .await
            .context("Failed to set RLS user context")?;

        sqlx::query("SELECT set_config('app.current_user_role', $1, true)")
            .bind(&role)
            .execute(&mut **tx)
            .await
            .context("Failed to set RLS role context")?;

        Ok(())
    }

    /// Helper to decrypt a visit and enrich it with patient/provider names
    async fn decrypt_with_names(&self, visit: &Visit) -> Result<VisitResponse> {
        self.decrypt_with_names_using_pool(visit, &self.pool).await
    }

    /// Helper to decrypt a visit within a transaction context (for RLS)
    async fn decrypt_with_names_in_tx<'a>(
        &self,
        visit: &Visit,
        tx: &mut sqlx::Transaction<'a, sqlx::Postgres>,
    ) -> Result<VisitResponse> {
        // Fetch patient name (encrypted in patients table, need to decrypt)
        let patient_names_encrypted: Option<(String, String)> = sqlx::query_as(
            "SELECT first_name, last_name FROM patients WHERE id = $1"
        )
        .bind(visit.patient_id)
        .fetch_optional(&mut **tx)
        .await
        .context("Failed to fetch patient name")?;

        // Decrypt patient names using the encryption key
        let patient_names = match patient_names_encrypted {
            Some((enc_first, enc_last)) => {
                let first = self.encryption_key.decrypt(&enc_first)
                    .context("Failed to decrypt patient first name")?;
                let last = self.encryption_key.decrypt(&enc_last)
                    .context("Failed to decrypt patient last name")?;
                Some((first, last))
            }
            None => None,
        };

        // Fetch provider name (from users table - NOT encrypted)
        let provider_names: Option<(String, String)> = sqlx::query_as(
            "SELECT first_name, last_name FROM users WHERE id = $1"
        )
        .bind(visit.provider_id)
        .fetch_optional(&mut **tx)
        .await
        .context("Failed to fetch provider name")?;

        // Fetch signed_by name if visit is signed (from users table - NOT encrypted)
        let signed_by_name: Option<String> = if let Some(signed_by_id) = visit.signed_by {
            let names: Option<(String, String)> = sqlx::query_as(
                "SELECT first_name, last_name FROM users WHERE id = $1"
            )
            .bind(signed_by_id)
            .fetch_optional(&mut **tx)
            .await
            .context("Failed to fetch signed_by name")?;
            names.map(|(f, l)| format!("{} {}", f, l))
        } else {
            None
        };

        visit.decrypt(
            &self.encryption_key,
            patient_names.as_ref().map(|(f, _)| f.clone()),
            patient_names.as_ref().map(|(_, l)| l.clone()),
            provider_names.as_ref().map(|(f, _)| f.clone()),
            provider_names.as_ref().map(|(_, l)| l.clone()),
            signed_by_name,
        )
    }

    /// Helper to decrypt using pool (for cases where RLS context is already handled)
    async fn decrypt_with_names_using_pool<'e, E>(&self, visit: &Visit, _executor: E) -> Result<VisitResponse>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        // Fetch patient name (encrypted in patients table, need to decrypt)
        let patient_names_encrypted: Option<(String, String)> = sqlx::query_as(
            "SELECT first_name, last_name FROM patients WHERE id = $1"
        )
        .bind(visit.patient_id)
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch patient name")?;

        // Decrypt patient names using the encryption key
        let patient_names = match patient_names_encrypted {
            Some((enc_first, enc_last)) => {
                let first = self.encryption_key.decrypt(&enc_first)
                    .context("Failed to decrypt patient first name")?;
                let last = self.encryption_key.decrypt(&enc_last)
                    .context("Failed to decrypt patient last name")?;
                Some((first, last))
            }
            None => None,
        };

        // Fetch provider name (from users table - NOT encrypted)
        let provider_names: Option<(String, String)> = sqlx::query_as(
            "SELECT first_name, last_name FROM users WHERE id = $1"
        )
        .bind(visit.provider_id)
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch provider name")?;

        // Fetch signed_by name if visit is signed (from users table - NOT encrypted)
        let signed_by_name: Option<String> = if let Some(signed_by_id) = visit.signed_by {
            let names: Option<(String, String)> = sqlx::query_as(
                "SELECT first_name, last_name FROM users WHERE id = $1"
            )
            .bind(signed_by_id)
            .fetch_optional(&self.pool)
            .await
            .context("Failed to fetch signed_by name")?;
            names.map(|(f, l)| format!("{} {}", f, l))
        } else {
            None
        };

        visit.decrypt(
            &self.encryption_key,
            patient_names.as_ref().map(|(f, _)| f.clone()),
            patient_names.as_ref().map(|(_, l)| l.clone()),
            provider_names.as_ref().map(|(f, _)| f.clone()),
            provider_names.as_ref().map(|(_, l)| l.clone()),
            signed_by_name,
        )
    }

    /// Create a new visit with encrypted clinical data
    pub async fn create_visit(
        &self,
        data: CreateVisitRequest,
        created_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<VisitResponse> {
        // Validate input
        data.validate()
            .context("Invalid visit creation data")?;

        // Parse UUIDs
        let patient_id = Uuid::parse_str(&data.patient_id)
            .context("Invalid patient_id format")?;
        let provider_id = Uuid::parse_str(&data.provider_id)
            .context("Invalid provider_id format")?;

        // Start transaction for RLS context and insert
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, created_by_id).await?;

        // Encrypt vitals if present
        let encrypted_vitals = if let Some(mut vitals) = data.vitals {
            vitals.validate_and_calculate()
                .context("Invalid vital signs")?;
            let vitals_json = serde_json::to_string(&vitals)
                .context("Failed to serialize vitals")?;
            Some(self.encryption_key.encrypt(&vitals_json)?)
        } else {
            None
        };

        // Encrypt SOAP notes
        let encrypted_subjective = data.subjective
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_objective = data.objective
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_assessment = data.assessment
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_plan = data.plan
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        // Encrypt additional fields
        let encrypted_chief_complaint = data.chief_complaint
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_hpi = data.history_present_illness
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_ros = if let Some(ros) = data.review_of_systems {
            let ros_json = serde_json::to_string(&ros)
                .context("Failed to serialize review of systems")?;
            Some(self.encryption_key.encrypt(&ros_json)?)
        } else {
            None
        };

        let encrypted_physical_exam = data.physical_exam
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_clinical_notes = data.clinical_notes
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_follow_up_notes = data.follow_up_notes
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        // Insert visit into database
        let visit = sqlx::query_as::<_, Visit>(
            r#"
            INSERT INTO visits (
                appointment_id, patient_id, provider_id,
                visit_date, visit_time, visit_type,
                vitals,
                subjective, objective, assessment, plan,
                chief_complaint, history_present_illness, review_of_systems,
                physical_exam, clinical_notes,
                status, version,
                follow_up_required, follow_up_date, follow_up_notes,
                has_attachments, attachment_urls,
                created_by, updated_by
            ) VALUES (
                $1, $2, $3,
                $4, NOW(), $5,
                $6,
                $7, $8, $9, $10,
                $11, $12, $13,
                $14, $15,
                'DRAFT', 1,
                $16, $17, $18,
                $19, $20,
                $21, $21
            )
            RETURNING *
            "#,
        )
        .bind(data.appointment_id)
        .bind(patient_id)
        .bind(provider_id)
        .bind(data.visit_date)
        .bind(data.visit_type)
        .bind(encrypted_vitals)
        .bind(encrypted_subjective)
        .bind(encrypted_objective)
        .bind(encrypted_assessment)
        .bind(encrypted_plan)
        .bind(encrypted_chief_complaint)
        .bind(encrypted_hpi)
        .bind(encrypted_ros)
        .bind(encrypted_physical_exam)
        .bind(encrypted_clinical_notes)
        .bind(data.follow_up_required.unwrap_or(false))
        .bind(data.follow_up_date)
        .bind(encrypted_follow_up_notes)
        .bind(data.attachment_urls.as_ref().map(|urls| !urls.is_empty()).unwrap_or(false))
        .bind(data.attachment_urls)
        .bind(created_by_id)
        .fetch_one(&mut *tx)
        .await
        .context("Failed to create visit")?;

        // Audit log
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(created_by_id),
                action: AuditAction::Create,
                entity_type: EntityType::Visit,
                entity_id: Some(visit.id.to_string()),
                changes: None,
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        // Decrypt and return with names
        self.decrypt_with_names(&visit).await
    }

    /// Get visit by ID (decrypted)
    pub async fn get_visit(
        &self,
        id: Uuid,
        user_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<Option<VisitResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let visit = sqlx::query_as::<_, Visit>(
            r#"
            SELECT * FROM visits
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch visit")?;

        // Decrypt with names BEFORE committing (to maintain RLS context)
        let result = match &visit {
            Some(v) => {
                // Audit log for READ
                let _ = AuditLog::create(
                    &self.pool,
                    CreateAuditLog {
                        user_id: Some(user_id),
                        action: AuditAction::Read,
                        entity_type: EntityType::Visit,
                        entity_id: Some(v.id.to_string()),
                        changes: None,
                        ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                        user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                        request_id: request_ctx.map(|c| c.request_id),
                    },
                )
                .await;

                // Decrypt within transaction to maintain RLS context for patient name lookup
                Some(self.decrypt_with_names_in_tx(v, &mut tx).await?)
            }
            None => None,
        };

        // Commit transaction after decryption
        tx.commit().await.context("Failed to commit transaction")?;

        Ok(result)
    }

    /// Update visit (only allowed for DRAFT status)
    pub async fn update_visit(
        &self,
        id: Uuid,
        data: UpdateVisitRequest,
        updated_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<VisitResponse> {
        // Validate input
        data.validate()
            .context("Invalid visit update data")?;

        // Start transaction for RLS context and update
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, updated_by_id).await?;

        // Check if visit exists and is editable
        let existing = sqlx::query_as::<_, Visit>(
            "SELECT * FROM visits WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch visit")?
        .ok_or_else(|| anyhow::anyhow!("Visit not found"))?;

        if !existing.can_edit() {
            anyhow::bail!(
                "Cannot edit visit with status {:?}. Only DRAFT visits can be edited.",
                existing.status
            );
        }

        // Create version snapshot before updating
        self.create_version_snapshot(&existing, updated_by_id, None)
            .await?;

        // Build update query dynamically based on provided fields
        let mut updates = Vec::new();
        let mut param_count = 1;

        // Encrypt and prepare vitals
        let encrypted_vitals = if let Some(mut vitals) = data.vitals {
            vitals.validate_and_calculate()
                .context("Invalid vital signs")?;
            let vitals_json = serde_json::to_string(&vitals)
                .context("Failed to serialize vitals")?;
            Some(self.encryption_key.encrypt(&vitals_json)?)
        } else {
            None
        };

        if encrypted_vitals.is_some() {
            param_count += 1;
            updates.push(format!("vitals = ${}", param_count));
        }

        // Encrypt SOAP notes
        let encrypted_subjective = data.subjective
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;
        if encrypted_subjective.is_some() {
            param_count += 1;
            updates.push(format!("subjective = ${}", param_count));
        }

        let encrypted_objective = data.objective
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;
        if encrypted_objective.is_some() {
            param_count += 1;
            updates.push(format!("objective = ${}", param_count));
        }

        let encrypted_assessment = data.assessment
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;
        if encrypted_assessment.is_some() {
            param_count += 1;
            updates.push(format!("assessment = ${}", param_count));
        }

        let encrypted_plan = data.plan
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;
        if encrypted_plan.is_some() {
            param_count += 1;
            updates.push(format!("plan = ${}", param_count));
        }

        // Encrypt additional fields
        let encrypted_chief_complaint = data.chief_complaint
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_history_present_illness = data.history_present_illness
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_physical_exam = data.physical_exam
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_clinical_notes = data.clinical_notes
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        // For simplicity, let's use a simpler approach with all fields
        // This is a basic implementation - can be optimized later
        let visit = sqlx::query_as::<_, Visit>(
            r#"
            UPDATE visits SET
                visit_type = COALESCE($2, visit_type),
                vitals = COALESCE($3, vitals),
                subjective = COALESCE($4, subjective),
                objective = COALESCE($5, objective),
                assessment = COALESCE($6, assessment),
                plan = COALESCE($7, plan),
                chief_complaint = COALESCE($8, chief_complaint),
                history_present_illness = COALESCE($9, history_present_illness),
                physical_exam = COALESCE($10, physical_exam),
                clinical_notes = COALESCE($11, clinical_notes),
                updated_by = $12,
                updated_at = NOW()
            WHERE id = $1 AND status = 'DRAFT'
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(data.visit_type)
        .bind(encrypted_vitals)
        .bind(encrypted_subjective)
        .bind(encrypted_objective)
        .bind(encrypted_assessment)
        .bind(encrypted_plan)
        .bind(encrypted_chief_complaint)
        .bind(encrypted_history_present_illness)
        .bind(encrypted_physical_exam)
        .bind(encrypted_clinical_notes)
        .bind(updated_by_id)
        .fetch_one(&mut *tx)
        .await
        .context("Failed to update visit")?;

        // Audit log
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(updated_by_id),
                action: AuditAction::Update,
                entity_type: EntityType::Visit,
                entity_id: Some(visit.id.to_string()),
                changes: None,
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        self.decrypt_with_names(&visit).await
    }

    /// Delete visit (only DRAFT visits can be deleted)
    pub async fn delete_visit(
        &self,
        id: Uuid,
        user_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<()> {
        // Start transaction for RLS context and delete
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let result = sqlx::query(
            "DELETE FROM visits WHERE id = $1 AND status = 'DRAFT'"
        )
        .bind(id)
        .execute(&mut *tx)
        .await
        .context("Failed to delete visit")?;

        if result.rows_affected() == 0 {
            anyhow::bail!("Visit not found or cannot be deleted (only DRAFT visits can be deleted)");
        }

        // Audit log
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(user_id),
                action: AuditAction::Delete,
                entity_type: EntityType::Visit,
                entity_id: Some(id.to_string()),
                changes: None,
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        Ok(())
    }

    /// List visits with filtering and pagination
    pub async fn list_visits(
        &self,
        filter: VisitSearchFilter,
        user_id: Uuid,
    ) -> Result<Vec<VisitResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let limit = filter.limit.unwrap_or(20).min(100);
        let offset = filter.offset.unwrap_or(0);

        // Build query with proper parameter binding using sqlx query builder
        let mut query_builder = sqlx::QueryBuilder::new("SELECT * FROM visits WHERE 1=1");

        if let Some(patient_id) = filter.patient_id {
            query_builder.push(" AND patient_id = ");
            query_builder.push_bind(patient_id);
        }
        if let Some(provider_id) = filter.provider_id {
            query_builder.push(" AND provider_id = ");
            query_builder.push_bind(provider_id);
        }
        if let Some(status) = filter.status {
            query_builder.push(" AND status = ");
            query_builder.push_bind(status);
        }
        if let Some(date_from) = filter.date_from {
            query_builder.push(" AND visit_date >= ");
            query_builder.push_bind(date_from);
        }
        if let Some(date_to) = filter.date_to {
            query_builder.push(" AND visit_date <= ");
            query_builder.push_bind(date_to);
        }

        query_builder.push(" ORDER BY visit_date DESC, visit_time DESC LIMIT ");
        query_builder.push_bind(limit);
        query_builder.push(" OFFSET ");
        query_builder.push_bind(offset);

        let visits = query_builder
            .build_query_as::<Visit>()
            .fetch_all(&mut *tx)
            .await
            .context("Failed to list visits")?;

        // Decrypt all visits with names WITHIN the transaction (for RLS)
        let mut results = Vec::with_capacity(visits.len());
        for visit in visits {
            results.push(self.decrypt_with_names_in_tx(&visit, &mut tx).await?);
        }

        // Commit transaction after decryption
        tx.commit().await.context("Failed to commit transaction")?;

        Ok(results)
    }

    /// Count visits matching the filter
    pub async fn count_visits(
        &self,
        filter: VisitSearchFilter,
        user_id: Uuid,
    ) -> Result<i64> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        // Build a simple count query with RLS - the RLS policies will filter automatically
        let count: (i64,) = if let Some(patient_id) = filter.patient_id {
            sqlx::query_as("SELECT COUNT(*) FROM visits WHERE patient_id = $1")
                .bind(patient_id)
                .fetch_one(&mut *tx)
                .await
                .context("Failed to count visits for patient")?
        } else if let Some(provider_id) = filter.provider_id {
            sqlx::query_as("SELECT COUNT(*) FROM visits WHERE provider_id = $1")
                .bind(provider_id)
                .fetch_one(&mut *tx)
                .await
                .context("Failed to count visits for provider")?
        } else if let Some(status) = filter.status {
            sqlx::query_as("SELECT COUNT(*) FROM visits WHERE status = $1")
                .bind(status)
                .fetch_one(&mut *tx)
                .await
                .context("Failed to count visits by status")?
        } else {
            // No filter - count all visits visible via RLS
            sqlx::query_as("SELECT COUNT(*) FROM visits")
                .fetch_one(&mut *tx)
                .await
                .context("Failed to count all visits")?
        };

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        Ok(count.0)
    }

    /// Get visit statistics (counts by status)
    pub async fn get_visit_statistics(
        &self,
        user_id: Uuid,
    ) -> Result<serde_json::Value> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        // Count total visits
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM visits")
            .fetch_one(&mut *tx)
            .await
            .context("Failed to count total visits")?;

        // Count by status
        let drafts: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM visits WHERE status = 'DRAFT'")
            .fetch_one(&mut *tx)
            .await
            .context("Failed to count draft visits")?;

        let signed: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM visits WHERE status = 'SIGNED'")
            .fetch_one(&mut *tx)
            .await
            .context("Failed to count signed visits")?;

        let locked: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM visits WHERE status = 'LOCKED'")
            .fetch_one(&mut *tx)
            .await
            .context("Failed to count locked visits")?;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        // Build response
        Ok(serde_json::json!({
            "statistics": {
                "total_visits": total.0,
                "drafts": drafts.0,
                "signed": signed.0,
                "locked": locked.0
            }
        }))
    }

    /// Get all visits for a specific patient
    pub async fn get_patient_visits(
        &self,
        patient_id: Uuid,
        user_id: Uuid,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<VisitResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let limit = limit.unwrap_or(50).min(100);
        let offset = offset.unwrap_or(0);

        let visits = sqlx::query_as::<_, Visit>(
            r#"
            SELECT * FROM visits
            WHERE patient_id = $1
            ORDER BY visit_date DESC, visit_time DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(patient_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch patient visits")?;

        // Decrypt all visits with names WITHIN the transaction (for RLS)
        let mut results = Vec::with_capacity(visits.len());
        for visit in visits {
            results.push(self.decrypt_with_names_in_tx(&visit, &mut tx).await?);
        }

        // Commit transaction after decryption
        tx.commit().await.context("Failed to commit transaction")?;

        Ok(results)
    }

    /// Sign a visit (DRAFT → SIGNED)
    pub async fn sign_visit(
        &self,
        id: Uuid,
        signed_by: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<VisitResponse> {
        // Start transaction for RLS context and sign operation
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, signed_by).await?;

        // Fetch the visit
        let visit = sqlx::query_as::<_, Visit>(
            "SELECT * FROM visits WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch visit")?
        .ok_or_else(|| anyhow::anyhow!("Visit not found"))?;

        // Defense-in-depth: verify the signing user owns this visit
        if visit.provider_id != signed_by {
            anyhow::bail!("Cannot sign another provider's visit");
        }

        // Check if it can be signed
        if !visit.can_sign() {
            anyhow::bail!(
                "Cannot sign visit with status {:?}. Only DRAFT visits can be signed.",
                visit.status
            );
        }

        // Generate signature hash from SOAP notes
        let signature_hash = self.generate_signature_hash(&visit)?;

        // Update visit to SIGNED status
        // The database trigger will auto-set signed_at, signed_by, and signature_hash
        let signed_visit = sqlx::query_as::<_, Visit>(
            r#"
            UPDATE visits SET
                status = 'SIGNED',
                signed_by = $2,
                signed_at = NOW(),
                signature_hash = $3,
                updated_by = $2,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(signed_by)
        .bind(signature_hash)
        .fetch_one(&mut *tx)
        .await
        .context("Failed to sign visit")?;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        // Audit log (after transaction commit)
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(signed_by),
                action: AuditAction::Update,
                entity_type: EntityType::Visit,
                entity_id: Some(id.to_string()),
                changes: Some(serde_json::json!({
                    "action": "signed",
                    "status_change": "DRAFT -> SIGNED"
                })),
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        self.decrypt_with_names(&signed_visit).await
    }

    /// Lock a visit (SIGNED → LOCKED)
    pub async fn lock_visit(
        &self,
        id: Uuid,
        locked_by: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<VisitResponse> {
        // Start transaction for RLS context and lock operation
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, locked_by).await?;

        // Fetch the visit
        let visit = sqlx::query_as::<_, Visit>(
            "SELECT * FROM visits WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch visit")?
        .ok_or_else(|| anyhow::anyhow!("Visit not found"))?;

        // Defense-in-depth: verify the locking user owns this visit
        if visit.provider_id != locked_by {
            anyhow::bail!("Cannot lock another provider's visit");
        }

        // Check if it can be locked
        if !visit.can_lock() {
            anyhow::bail!(
                "Cannot lock visit with status {:?}. Only SIGNED visits can be locked.",
                visit.status
            );
        }

        // Update visit to LOCKED status
        let locked_visit = sqlx::query_as::<_, Visit>(
            r#"
            UPDATE visits SET
                status = 'LOCKED',
                locked_at = NOW(),
                updated_by = $2,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(locked_by)
        .fetch_one(&mut *tx)
        .await
        .context("Failed to lock visit")?;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        // Audit log (after transaction commit)
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(locked_by),
                action: AuditAction::Update,
                entity_type: EntityType::Visit,
                entity_id: Some(id.to_string()),
                changes: Some(serde_json::json!({
                    "action": "locked",
                    "status_change": "SIGNED -> LOCKED"
                })),
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        self.decrypt_with_names(&locked_visit).await
    }

    /// Generate signature hash from encrypted SOAP notes
    /// Uses SHA-256 hash of concatenated SOAP notes (encrypted content)
    fn generate_signature_hash(&self, visit: &Visit) -> Result<String> {
        use sha2::{Sha256, Digest};

        let content = format!(
            "{}{}{}{}",
            visit.subjective.as_deref().unwrap_or(""),
            visit.objective.as_deref().unwrap_or(""),
            visit.assessment.as_deref().unwrap_or(""),
            visit.plan.as_deref().unwrap_or("")
        );

        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let result = hasher.finalize();

        // Convert to hex string
        let hash = format!("{:x}", result);
        Ok(hash)
    }

    /// Get visit statistics
    pub async fn get_statistics(&self) -> Result<VisitStatistics> {
        // Count by status
        let status_counts = sqlx::query_as::<_, (String, i64)>(
            r#"
            SELECT
                status::TEXT,
                COUNT(*) as count
            FROM visits
            GROUP BY status
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch status counts")?;

        let mut total = 0i64;
        let mut drafts = 0i64;
        let mut signed = 0i64;
        let mut locked = 0i64;

        for (status, count) in status_counts {
            total += count;
            match status.as_str() {
                "DRAFT" => drafts = count,
                "SIGNED" => signed = count,
                "LOCKED" => locked = count,
                _ => {}
            }
        }

        // Count by type
        let type_counts = sqlx::query_as::<_, (String, i64)>(
            r#"
            SELECT
                visit_type::TEXT,
                COUNT(*) as count
            FROM visits
            GROUP BY visit_type
            ORDER BY count DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch type counts")?;

        let by_type = type_counts
            .into_iter()
            .filter_map(|(vtype, count)| {
                serde_json::from_str::<VisitType>(&format!("\"{}\"", vtype))
                    .ok()
                    .map(|visit_type| VisitTypeCount { visit_type, count })
            })
            .collect();

        Ok(VisitStatistics {
            total_visits: total,
            drafts,
            signed,
            locked,
            by_type,
        })
    }

    // ========== Version History Methods ==========

    /// Create a version snapshot before updating a visit
    async fn create_version_snapshot(
        &self,
        visit: &Visit,
        changed_by: Uuid,
        change_reason: Option<String>,
    ) -> Result<()> {
        // Get next version number
        let next_version: i32 = sqlx::query_scalar!(
            "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM visit_versions WHERE visit_id = $1",
            visit.id
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to get next version number")?
        .unwrap_or(1);

        // Serialize visit to JSONB
        let visit_data = serde_json::to_value(visit)
            .context("Failed to serialize visit for versioning")?;

        // Insert version
        sqlx::query!(
            r#"
            INSERT INTO visit_versions (visit_id, version_number, visit_data, changed_by, change_reason)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            visit.id,
            next_version,
            visit_data,
            changed_by,
            change_reason
        )
        .execute(&self.pool)
        .await
        .context("Failed to create version snapshot")?;

        Ok(())
    }

    /// Get all versions for a visit
    pub async fn get_visit_versions(
        &self,
        visit_id: Uuid,
    ) -> Result<Vec<crate::models::VisitVersionSummary>> {
        let versions = sqlx::query!(
            r#"
            SELECT id, visit_id, version_number, changed_by, change_reason, created_at
            FROM visit_versions
            WHERE visit_id = $1
            ORDER BY version_number DESC
            "#,
            visit_id
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch visit versions")?;

        Ok(versions
            .into_iter()
            .map(|v| crate::models::VisitVersionSummary {
                id: v.id,
                visit_id: v.visit_id,
                version_number: v.version_number,
                changed_by: v.changed_by,
                change_reason: v.change_reason,
                created_at: v.created_at,
            })
            .collect())
    }

    /// Get a specific version of a visit
    pub async fn get_visit_version(
        &self,
        visit_id: Uuid,
        version_number: i32,
    ) -> Result<Option<crate::models::VisitVersionResponse>> {
        let version = sqlx::query!(
            r#"
            SELECT id, visit_id, version_number, visit_data, changed_by, change_reason, created_at
            FROM visit_versions
            WHERE visit_id = $1 AND version_number = $2
            "#,
            visit_id,
            version_number
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch visit version")?;

        match version {
            Some(v) => Ok(Some(crate::models::VisitVersionResponse {
                id: v.id,
                visit_id: v.visit_id,
                version_number: v.version_number,
                visit_data: v.visit_data,
                changed_by: v.changed_by,
                change_reason: v.change_reason,
                created_at: v.created_at,
            })),
            None => Ok(None),
        }
    }

    /// Restore a visit to a previous version
    pub async fn restore_visit_version(
        &self,
        visit_id: Uuid,
        version_number: i32,
        restored_by: Uuid,
    ) -> Result<VisitResponse> {
        // Get the version snapshot
        let version = self
            .get_visit_version(visit_id, version_number)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Version not found"))?;

        // Deserialize visit data
        let historical_visit: Visit = serde_json::from_value(version.visit_data)
            .context("Failed to deserialize historical visit data")?;

        // Check current visit can be edited
        let current = sqlx::query_as::<_, Visit>("SELECT * FROM visits WHERE id = $1")
            .bind(visit_id)
            .fetch_optional(&self.pool)
            .await
            .context("Failed to fetch current visit")?
            .ok_or_else(|| anyhow::anyhow!("Visit not found"))?;

        if !current.can_edit() {
            anyhow::bail!(
                "Cannot restore visit with status {:?}. Only DRAFT visits can be restored.",
                current.status
            );
        }

        // Create snapshot of current state before restore
        self.create_version_snapshot(
            &current,
            restored_by,
            Some(format!("Before restore to version {}", version_number)),
        )
        .await?;

        // Restore visit fields from historical version
        let restored = sqlx::query_as::<_, Visit>(
            r#"
            UPDATE visits SET
                visit_type = $2,
                vitals = $3,
                subjective = $4,
                objective = $5,
                assessment = $6,
                plan = $7,
                chief_complaint = $8,
                history_present_illness = $9,
                review_of_systems = $10,
                physical_exam = $11,
                clinical_notes = $12,
                updated_by = $13,
                updated_at = NOW()
            WHERE id = $1 AND status = 'DRAFT'
            RETURNING *
            "#,
        )
        .bind(visit_id)
        .bind(historical_visit.visit_type)
        .bind(&historical_visit.vitals)
        .bind(&historical_visit.subjective)
        .bind(&historical_visit.objective)
        .bind(&historical_visit.assessment)
        .bind(&historical_visit.plan)
        .bind(&historical_visit.chief_complaint)
        .bind(&historical_visit.history_present_illness)
        .bind(&historical_visit.review_of_systems)
        .bind(&historical_visit.physical_exam)
        .bind(&historical_visit.clinical_notes)
        .bind(Some(restored_by))
        .fetch_one(&self.pool)
        .await
        .context("Failed to restore visit")?;

        // Decrypt and convert to response with names
        self.decrypt_with_names(&restored).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // VisitSearchFilter Tests
    // ============================================================================

    #[test]
    fn test_visit_search_filter_default() {
        let filter = VisitSearchFilter::default();
        assert_eq!(filter.limit, Some(20));
        assert_eq!(filter.offset, Some(0));
        assert!(filter.patient_id.is_none());
        assert!(filter.provider_id.is_none());
        assert!(filter.visit_type.is_none());
        assert!(filter.status.is_none());
        assert!(filter.date_from.is_none());
        assert!(filter.date_to.is_none());
    }

    #[test]
    fn test_visit_search_filter_with_patient_id() {
        let patient_id = Uuid::new_v4();
        let filter = VisitSearchFilter {
            patient_id: Some(patient_id),
            ..Default::default()
        };
        assert_eq!(filter.patient_id, Some(patient_id));
        assert_eq!(filter.limit, Some(20)); // Default preserved
    }

    #[test]
    fn test_visit_search_filter_with_date_range() {
        let date_from = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
        let date_to = NaiveDate::from_ymd_opt(2026, 1, 31).unwrap();

        let filter = VisitSearchFilter {
            date_from: Some(date_from),
            date_to: Some(date_to),
            ..Default::default()
        };

        assert_eq!(filter.date_from, Some(date_from));
        assert_eq!(filter.date_to, Some(date_to));
    }

    #[test]
    fn test_visit_search_filter_with_status() {
        let filter = VisitSearchFilter {
            status: Some(VisitStatus::Draft),
            ..Default::default()
        };
        assert_eq!(filter.status, Some(VisitStatus::Draft));

        let filter_signed = VisitSearchFilter {
            status: Some(VisitStatus::Signed),
            ..Default::default()
        };
        assert_eq!(filter_signed.status, Some(VisitStatus::Signed));
    }

    #[test]
    fn test_visit_search_filter_serialization() {
        let filter = VisitSearchFilter::default();
        let json = serde_json::to_string(&filter).expect("Should serialize");
        assert!(json.contains("\"limit\":20"));
        assert!(json.contains("\"offset\":0"));

        let deserialized: VisitSearchFilter =
            serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(deserialized.limit, Some(20));
    }

    #[test]
    fn test_visit_search_filter_custom_pagination() {
        let filter = VisitSearchFilter {
            limit: Some(50),
            offset: Some(100),
            ..Default::default()
        };
        assert_eq!(filter.limit, Some(50));
        assert_eq!(filter.offset, Some(100));
    }

    // ============================================================================
    // VisitStatistics Tests
    // ============================================================================

    #[test]
    fn test_visit_statistics_structure() {
        let stats = VisitStatistics {
            total_visits: 100,
            drafts: 30,
            signed: 50,
            locked: 20,
            by_type: vec![],
        };

        assert_eq!(stats.total_visits, 100);
        assert_eq!(stats.drafts, 30);
        assert_eq!(stats.signed, 50);
        assert_eq!(stats.locked, 20);
        // Verify counts add up
        assert_eq!(stats.drafts + stats.signed + stats.locked, stats.total_visits);
    }

    #[test]
    fn test_visit_statistics_serialization() {
        let stats = VisitStatistics {
            total_visits: 50,
            drafts: 10,
            signed: 25,
            locked: 15,
            by_type: vec![
                VisitTypeCount {
                    visit_type: VisitType::Consultation,
                    count: 30,
                },
                VisitTypeCount {
                    visit_type: VisitType::FollowUp,
                    count: 20,
                },
            ],
        };

        let json = serde_json::to_string(&stats).expect("Should serialize");
        assert!(json.contains("\"total_visits\":50"));
        assert!(json.contains("\"drafts\":10"));

        let deserialized: VisitStatistics =
            serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(deserialized.total_visits, 50);
        assert_eq!(deserialized.by_type.len(), 2);
    }

    // ============================================================================
    // VisitTypeCount Tests
    // ============================================================================

    #[test]
    fn test_visit_type_count_structure() {
        let type_count = VisitTypeCount {
            visit_type: VisitType::Consultation,
            count: 42,
        };

        assert_eq!(type_count.visit_type, VisitType::Consultation);
        assert_eq!(type_count.count, 42);
    }

    #[test]
    fn test_visit_type_count_serialization() {
        let type_count = VisitTypeCount {
            visit_type: VisitType::FollowUp,
            count: 15,
        };

        let json = serde_json::to_string(&type_count).expect("Should serialize");
        assert!(json.contains("15"));

        let deserialized: VisitTypeCount =
            serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(deserialized.count, 15);
    }

    // ============================================================================
    // SignVisitRequest / LockVisitRequest Tests
    // ============================================================================

    #[test]
    fn test_sign_visit_request_structure() {
        let user_id = Uuid::new_v4();
        let request = SignVisitRequest {
            signed_by: user_id,
        };
        assert_eq!(request.signed_by, user_id);
    }

    #[test]
    fn test_sign_visit_request_serialization() {
        let user_id = Uuid::new_v4();
        let request = SignVisitRequest {
            signed_by: user_id,
        };

        let json = serde_json::to_string(&request).expect("Should serialize");
        assert!(json.contains(&user_id.to_string()));

        let deserialized: SignVisitRequest =
            serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(deserialized.signed_by, user_id);
    }

    #[test]
    fn test_lock_visit_request_structure() {
        let user_id = Uuid::new_v4();
        let request = LockVisitRequest {
            locked_by: user_id,
        };
        assert_eq!(request.locked_by, user_id);
    }

    #[test]
    fn test_lock_visit_request_serialization() {
        let user_id = Uuid::new_v4();
        let request = LockVisitRequest {
            locked_by: user_id,
        };

        let json = serde_json::to_string(&request).expect("Should serialize");
        assert!(json.contains(&user_id.to_string()));

        let deserialized: LockVisitRequest =
            serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(deserialized.locked_by, user_id);
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_visit_search_filter_all_fields_set() {
        let patient_id = Uuid::new_v4();
        let provider_id = Uuid::new_v4();

        let filter = VisitSearchFilter {
            patient_id: Some(patient_id),
            provider_id: Some(provider_id),
            visit_type: Some(VisitType::Consultation),
            status: Some(VisitStatus::Signed),
            date_from: Some(NaiveDate::from_ymd_opt(2026, 1, 1).unwrap()),
            date_to: Some(NaiveDate::from_ymd_opt(2026, 12, 31).unwrap()),
            limit: Some(100),
            offset: Some(50),
        };

        assert!(filter.patient_id.is_some());
        assert!(filter.provider_id.is_some());
        assert!(filter.visit_type.is_some());
        assert!(filter.status.is_some());
        assert!(filter.date_from.is_some());
        assert!(filter.date_to.is_some());
        assert_eq!(filter.limit, Some(100));
        assert_eq!(filter.offset, Some(50));
    }

    #[test]
    fn test_visit_statistics_empty() {
        let stats = VisitStatistics {
            total_visits: 0,
            drafts: 0,
            signed: 0,
            locked: 0,
            by_type: vec![],
        };

        assert_eq!(stats.total_visits, 0);
        assert!(stats.by_type.is_empty());
    }
}
