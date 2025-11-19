/*!
 * Visit Template Service
 *
 * Handles business logic for visit template management including:
 * - CRUD operations for visit templates
 * - Encryption/decryption of SOAP sections
 * - Template application to create new visits
 * - User-specific template filtering
 */

use crate::{
    models::{
        CreateVisitTemplateRequest, UpdateVisitTemplateRequest, VisitTemplate,
        VisitTemplateResponse,
    },
    utils::encryption::EncryptionKey,
};
use anyhow::{Context, Result};
use sqlx::PgPool;
use uuid::Uuid;

/// Visit Template Service
pub struct VisitTemplateService {
    pool: PgPool,
    encryption_key: EncryptionKey,
}

impl VisitTemplateService {
    /// Create new visit template service
    pub fn new(pool: PgPool, encryption_key: EncryptionKey) -> Self {
        Self {
            pool,
            encryption_key,
        }
    }

    /// Create a new visit template
    pub async fn create_template(
        &self,
        data: CreateVisitTemplateRequest,
        created_by: Uuid,
    ) -> Result<VisitTemplateResponse> {
        // Encrypt SOAP sections if provided
        let encrypted_subjective = data
            .subjective
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_objective = data
            .objective
            .as_ref()
            .map(|o| self.encryption_key.encrypt(o))
            .transpose()?;

        let encrypted_assessment = data
            .assessment
            .as_ref()
            .map(|a| self.encryption_key.encrypt(a))
            .transpose()?;

        let encrypted_plan = data
            .plan
            .as_ref()
            .map(|p| self.encryption_key.encrypt(p))
            .transpose()?;

        // Convert default_vitals to JSONB
        let default_vitals_json = data
            .default_vitals
            .as_ref()
            .map(|v| serde_json::to_value(v))
            .transpose()
            .context("Failed to serialize default vitals")?;

        // Insert template
        let template = sqlx::query_as!(
            VisitTemplate,
            r#"
            INSERT INTO visit_templates (
                template_name, description,
                subjective, objective, assessment, plan,
                default_vitals,
                is_active, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
            RETURNING
                id, template_name, description,
                subjective, objective, assessment, plan,
                default_vitals,
                is_active, created_by, updated_by,
                created_at, updated_at
            "#,
            data.template_name,
            data.description,
            encrypted_subjective,
            encrypted_objective,
            encrypted_assessment,
            encrypted_plan,
            default_vitals_json,
            created_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to create visit template")?;

        // Convert to response
        self.template_to_response(template).await
    }

    /// Get visit template by ID
    pub async fn get_template(&self, id: Uuid) -> Result<Option<VisitTemplateResponse>> {
        let template = sqlx::query_as!(
            VisitTemplate,
            r#"
            SELECT
                id, template_name, description,
                subjective, objective, assessment, plan,
                default_vitals,
                is_active, created_by, updated_by,
                created_at, updated_at
            FROM visit_templates
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch visit template")?;

        match template {
            Some(t) => Ok(Some(self.template_to_response(t).await?)),
            None => Ok(None),
        }
    }

    /// List visit templates for a user (optionally filter by active status)
    pub async fn list_templates(
        &self,
        user_id: Uuid,
        active_only: bool,
    ) -> Result<Vec<VisitTemplateResponse>> {
        let templates = if active_only {
            sqlx::query_as!(
                VisitTemplate,
                r#"
                SELECT
                    id, template_name, description,
                    subjective, objective, assessment, plan,
                    default_vitals,
                    is_active, created_by, updated_by,
                    created_at, updated_at
                FROM visit_templates
                WHERE created_by = $1 AND is_active = true
                ORDER BY template_name ASC
                "#,
                user_id
            )
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch active visit templates")?
        } else {
            sqlx::query_as!(
                VisitTemplate,
                r#"
                SELECT
                    id, template_name, description,
                    subjective, objective, assessment, plan,
                    default_vitals,
                    is_active, created_by, updated_by,
                    created_at, updated_at
                FROM visit_templates
                WHERE created_by = $1
                ORDER BY is_active DESC, template_name ASC
                "#,
                user_id
            )
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch visit templates")?
        };

        let mut responses = Vec::new();
        for template in templates {
            responses.push(self.template_to_response(template).await?);
        }

        Ok(responses)
    }

    /// Update visit template
    pub async fn update_template(
        &self,
        id: Uuid,
        data: UpdateVisitTemplateRequest,
        updated_by: Uuid,
    ) -> Result<VisitTemplateResponse> {
        // Check template exists and user owns it
        let existing = sqlx::query!(
            "SELECT created_by FROM visit_templates WHERE id = $1",
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

        // Encrypt SOAP sections if provided
        let encrypted_subjective = data
            .subjective
            .as_ref()
            .map(|s| self.encryption_key.encrypt(s))
            .transpose()?;

        let encrypted_objective = data
            .objective
            .as_ref()
            .map(|o| self.encryption_key.encrypt(o))
            .transpose()?;

        let encrypted_assessment = data
            .assessment
            .as_ref()
            .map(|a| self.encryption_key.encrypt(a))
            .transpose()?;

        let encrypted_plan = data
            .plan
            .as_ref()
            .map(|p| self.encryption_key.encrypt(p))
            .transpose()?;

        // Convert default_vitals to JSONB
        let default_vitals_json = data
            .default_vitals
            .as_ref()
            .map(|v| serde_json::to_value(v))
            .transpose()
            .context("Failed to serialize default vitals")?;

        // Update template
        let template = sqlx::query_as!(
            VisitTemplate,
            r#"
            UPDATE visit_templates
            SET
                template_name = COALESCE($2, template_name),
                description = COALESCE($3, description),
                subjective = COALESCE($4, subjective),
                objective = COALESCE($5, objective),
                assessment = COALESCE($6, assessment),
                plan = COALESCE($7, plan),
                default_vitals = COALESCE($8, default_vitals),
                is_active = COALESCE($9, is_active),
                updated_by = $10,
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id, template_name, description,
                subjective, objective, assessment, plan,
                default_vitals,
                is_active, created_by, updated_by,
                created_at, updated_at
            "#,
            id,
            data.template_name,
            data.description,
            encrypted_subjective,
            encrypted_objective,
            encrypted_assessment,
            encrypted_plan,
            default_vitals_json,
            data.is_active,
            Some(updated_by)
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to update visit template")?;

        // Convert to response
        self.template_to_response(template).await
    }

    /// Delete visit template (soft delete by setting is_active = false)
    pub async fn delete_template(&self, id: Uuid, user_id: Uuid) -> Result<()> {
        // Check template exists and user owns it
        let existing = sqlx::query!(
            "SELECT created_by FROM visit_templates WHERE id = $1",
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
            UPDATE visit_templates
            SET is_active = false, updated_at = NOW(), updated_by = $2
            WHERE id = $1
            "#,
            id,
            user_id
        )
        .execute(&self.pool)
        .await
        .context("Failed to delete visit template")?;

        Ok(())
    }

    /// Convert database model to response (decrypt SOAP sections)
    async fn template_to_response(&self, template: VisitTemplate) -> Result<VisitTemplateResponse> {
        // Decrypt SOAP sections
        let decrypted_subjective = template
            .subjective
            .as_ref()
            .map(|s| self.encryption_key.decrypt(s))
            .transpose()?;

        let decrypted_objective = template
            .objective
            .as_ref()
            .map(|o| self.encryption_key.decrypt(o))
            .transpose()?;

        let decrypted_assessment = template
            .assessment
            .as_ref()
            .map(|a| self.encryption_key.decrypt(a))
            .transpose()?;

        let decrypted_plan = template
            .plan
            .as_ref()
            .map(|p| self.encryption_key.decrypt(p))
            .transpose()?;

        // Convert JSONB to serde_json::Value
        let default_vitals = template
            .default_vitals
            .as_ref()
            .map(|v| serde_json::from_value(v.clone()))
            .transpose()
            .context("Failed to deserialize default vitals")?;

        Ok(VisitTemplateResponse {
            id: template.id,
            template_name: template.template_name,
            description: template.description,
            subjective: decrypted_subjective,
            objective: decrypted_objective,
            assessment: decrypted_assessment,
            plan: decrypted_plan,
            default_vitals,
            is_active: template.is_active,
            created_by: template.created_by,
            updated_by: template.updated_by,
            created_at: template.created_at,
            updated_at: template.updated_at,
        })
    }
}
