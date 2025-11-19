/*!
 * Prescription Template Service
 *
 * Handles business logic for prescription template management including:
 * - CRUD operations for prescription templates
 * - Medication regimen templates
 * - User-specific template filtering
 */

use crate::{
    models::{
        CreatePrescriptionTemplateRequest, PrescriptionTemplate, PrescriptionTemplateResponse,
        TemplateMedication, UpdatePrescriptionTemplateRequest,
    },
};
use anyhow::{Context, Result};
use sqlx::PgPool;
use uuid::Uuid;

/// Prescription Template Service
pub struct PrescriptionTemplateService {
    pool: PgPool,
}

impl PrescriptionTemplateService {
    /// Create new prescription template service
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new prescription template
    pub async fn create_template(
        &self,
        data: CreatePrescriptionTemplateRequest,
        created_by: Uuid,
    ) -> Result<PrescriptionTemplateResponse> {
        // Serialize medications to JSONB
        let medications_json = serde_json::to_value(&data.medications)
            .context("Failed to serialize medications")?;

        // Insert template
        let template = sqlx::query_as!(
            PrescriptionTemplate,
            r#"
            INSERT INTO prescription_templates (
                template_name, description, medications,
                is_active, created_by
            )
            VALUES ($1, $2, $3, true, $4)
            RETURNING
                id, template_name, description, medications,
                is_active, created_by, updated_by,
                created_at, updated_at
            "#,
            data.template_name,
            data.description,
            medications_json,
            created_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to create prescription template")?;

        // Convert to response
        self.template_to_response(template)
    }

    /// Get prescription template by ID
    pub async fn get_template(&self, id: Uuid) -> Result<Option<PrescriptionTemplateResponse>> {
        let template = sqlx::query_as!(
            PrescriptionTemplate,
            r#"
            SELECT
                id, template_name, description, medications,
                is_active, created_by, updated_by,
                created_at, updated_at
            FROM prescription_templates
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch prescription template")?;

        match template {
            Some(t) => Ok(Some(self.template_to_response(t)?)),
            None => Ok(None),
        }
    }

    /// List prescription templates for a user (optionally filter by active status)
    pub async fn list_templates(
        &self,
        user_id: Uuid,
        active_only: bool,
    ) -> Result<Vec<PrescriptionTemplateResponse>> {
        let templates = if active_only {
            sqlx::query_as!(
                PrescriptionTemplate,
                r#"
                SELECT
                    id, template_name, description, medications,
                    is_active, created_by, updated_by,
                    created_at, updated_at
                FROM prescription_templates
                WHERE created_by = $1 AND is_active = true
                ORDER BY template_name ASC
                "#,
                user_id
            )
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch active prescription templates")?
        } else {
            sqlx::query_as!(
                PrescriptionTemplate,
                r#"
                SELECT
                    id, template_name, description, medications,
                    is_active, created_by, updated_by,
                    created_at, updated_at
                FROM prescription_templates
                WHERE created_by = $1
                ORDER BY is_active DESC, template_name ASC
                "#,
                user_id
            )
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch prescription templates")?
        };

        templates
            .into_iter()
            .map(|t| self.template_to_response(t))
            .collect()
    }

    /// Update prescription template
    pub async fn update_template(
        &self,
        id: Uuid,
        data: UpdatePrescriptionTemplateRequest,
        updated_by: Uuid,
    ) -> Result<PrescriptionTemplateResponse> {
        // Check template exists and user owns it
        let existing = sqlx::query!(
            "SELECT created_by FROM prescription_templates WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to check template existence")?
        .ok_or_else(|| anyhow::anyhow!("Template not found"))?;

        // Verify ownership
        if existing.created_by != updated_by {
            return Err(anyhow::anyhow!("Unauthorized: not template owner"));
        }

        // Serialize medications if provided
        let medications_json = data
            .medications
            .as_ref()
            .map(|m| serde_json::to_value(m))
            .transpose()
            .context("Failed to serialize medications")?;

        // Update template
        let template = sqlx::query_as!(
            PrescriptionTemplate,
            r#"
            UPDATE prescription_templates
            SET
                template_name = COALESCE($2, template_name),
                description = COALESCE($3, description),
                medications = COALESCE($4, medications),
                is_active = COALESCE($5, is_active),
                updated_by = $6,
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id, template_name, description, medications,
                is_active, created_by, updated_by,
                created_at, updated_at
            "#,
            id,
            data.template_name,
            data.description,
            medications_json,
            data.is_active,
            Some(updated_by)
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to update prescription template")?;

        // Convert to response
        self.template_to_response(template)
    }

    /// Delete prescription template (soft delete by setting is_active = false)
    pub async fn delete_template(&self, id: Uuid, user_id: Uuid) -> Result<()> {
        // Check template exists and user owns it
        let existing = sqlx::query!(
            "SELECT created_by FROM prescription_templates WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to check template existence")?
        .ok_or_else(|| anyhow::anyhow!("Template not found"))?;

        // Verify ownership
        if existing.created_by != user_id {
            return Err(anyhow::anyhow!("Unauthorized: not template owner"));
        }

        // Soft delete
        sqlx::query!(
            r#"
            UPDATE prescription_templates
            SET is_active = false, updated_at = NOW(), updated_by = $2
            WHERE id = $1
            "#,
            id,
            user_id
        )
        .execute(&self.pool)
        .await
        .context("Failed to delete prescription template")?;

        Ok(())
    }

    /// Convert database model to response
    fn template_to_response(
        &self,
        template: PrescriptionTemplate,
    ) -> Result<PrescriptionTemplateResponse> {
        // Deserialize medications from JSONB
        let medications: Vec<TemplateMedication> = serde_json::from_value(template.medications)
            .context("Failed to deserialize medications")?;

        Ok(PrescriptionTemplateResponse {
            id: template.id,
            template_name: template.template_name,
            description: template.description,
            medications,
            is_active: template.is_active,
            created_by: template.created_by,
            updated_by: template.updated_by,
            created_at: template.created_at,
            updated_at: template.updated_at,
        })
    }
}
