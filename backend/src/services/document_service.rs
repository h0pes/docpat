/*!
 * Document Service
 *
 * Handles business logic for document generation including:
 * - Document template CRUD operations
 * - Generated document CRUD operations
 * - PDF generation with variable substitution
 * - Document signing and delivery tracking
 */

use crate::{
    models::{
        CreateDocumentTemplateRequest, DeliverDocumentRequest, DocumentStatistics,
        DocumentStatus, DocumentStatusCount, DocumentTemplate, DocumentTemplateFilter,
        DocumentTemplateResponse, DocumentTemplateSummary, DocumentType, DocumentTypeCount,
        GenerateDocumentRequest, GeneratedDocument, GeneratedDocumentFilter,
        GeneratedDocumentResponse, GeneratedDocumentSummary, ListDocumentTemplatesResponse,
        ListGeneratedDocumentsResponse, PageOrientation, PageSize, TemplateLanguage,
        UpdateDocumentTemplateRequest,
    },
    services::FileUploadService,
    utils::encryption::EncryptionKey,
};
use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::path::PathBuf;
use uuid::Uuid;

/// Document Service for managing templates and generated documents
pub struct DocumentService {
    pool: PgPool,
    encryption_key: EncryptionKey,
    storage_path: PathBuf,
}

impl DocumentService {
    /// Create new document service
    pub fn new(pool: PgPool, encryption_key: EncryptionKey, storage_path: PathBuf) -> Self {
        Self {
            pool,
            encryption_key,
            storage_path,
        }
    }

    /// Helper to set RLS context within a transaction
    async fn set_rls_context(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        user_id: Uuid,
    ) -> Result<()> {
        // Query the user's role from the database
        let role: String = sqlx::query_scalar("SELECT role::TEXT FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&mut **tx)
            .await
            .context("Failed to fetch user role for RLS context")?;

        // Set RLS context variables
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

    // ==================== Document Template Operations ====================

    /// Create a new document template
    pub async fn create_template(
        &self,
        data: CreateDocumentTemplateRequest,
        created_by: Uuid,
    ) -> Result<DocumentTemplateResponse> {
        // Convert enums to strings for storage
        let document_type_str = data.document_type.as_str();
        let page_size_str = data.page_size.as_str();
        let page_orientation_str = data.page_orientation.as_str();
        let language_str = data.language.as_str();

        // Convert template_variables to JSONB
        let template_vars_json = data
            .template_variables
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .context("Failed to serialize template variables")?;

        let template = sqlx::query_as!(
            DocumentTemplate,
            r#"
            INSERT INTO document_templates (
                template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING
                id, template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                version, previous_version_id,
                created_at, updated_at, created_by, updated_by
            "#,
            data.template_key,
            data.template_name,
            data.description,
            document_type_str,
            data.template_html,
            template_vars_json,
            data.header_html,
            data.footer_html,
            data.css_styles,
            page_size_str,
            page_orientation_str,
            data.margin_top_mm.unwrap_or(20),
            data.margin_bottom_mm.unwrap_or(20),
            data.margin_left_mm.unwrap_or(20),
            data.margin_right_mm.unwrap_or(20),
            data.is_active,
            data.is_default,
            language_str,
            created_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to create document template")?;

        Ok(DocumentTemplateResponse::from(template))
    }

    /// Get document template by ID
    pub async fn get_template(&self, id: Uuid) -> Result<Option<DocumentTemplateResponse>> {
        let template = sqlx::query_as!(
            DocumentTemplate,
            r#"
            SELECT
                id, template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                version, previous_version_id,
                created_at, updated_at, created_by, updated_by
            FROM document_templates
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch document template")?;

        Ok(template.map(DocumentTemplateResponse::from))
    }

    /// Get document template by key
    pub async fn get_template_by_key(&self, key: &str) -> Result<Option<DocumentTemplateResponse>> {
        let template = sqlx::query_as!(
            DocumentTemplate,
            r#"
            SELECT
                id, template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                version, previous_version_id,
                created_at, updated_at, created_by, updated_by
            FROM document_templates
            WHERE template_key = $1
            "#,
            key
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch document template by key")?;

        Ok(template.map(DocumentTemplateResponse::from))
    }

    /// Get default template for a document type and language
    pub async fn get_default_template(
        &self,
        document_type: DocumentType,
        language: TemplateLanguage,
    ) -> Result<Option<DocumentTemplateResponse>> {
        let template = sqlx::query_as!(
            DocumentTemplate,
            r#"
            SELECT
                id, template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                version, previous_version_id,
                created_at, updated_at, created_by, updated_by
            FROM document_templates
            WHERE document_type = $1 AND language = $2 AND is_default = true AND is_active = true
            "#,
            document_type.as_str(),
            language.as_str()
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch default template")?;

        Ok(template.map(DocumentTemplateResponse::from))
    }

    /// List document templates with filtering
    pub async fn list_templates(
        &self,
        filter: DocumentTemplateFilter,
        limit: i64,
        offset: i64,
    ) -> Result<ListDocumentTemplatesResponse> {
        let doc_type_str = filter.document_type.map(|dt| dt.as_str().to_string());
        let lang_str = filter.language.map(|l| l.as_str().to_string());
        let search_pattern = filter.search.as_ref().map(|s| format!("%{}%", s));

        let templates = sqlx::query_as!(
            DocumentTemplate,
            r#"
            SELECT
                id, template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                version, previous_version_id,
                created_at, updated_at, created_by, updated_by
            FROM document_templates
            WHERE
                ($1::VARCHAR IS NULL OR document_type = $1)
                AND ($2::VARCHAR IS NULL OR language = $2)
                AND ($3::BOOLEAN IS NULL OR is_active = $3)
                AND ($4::BOOLEAN IS NULL OR is_default = $4)
                AND ($5::VARCHAR IS NULL OR template_name ILIKE $5 OR template_key ILIKE $5)
            ORDER BY template_name ASC
            LIMIT $6 OFFSET $7
            "#,
            doc_type_str,
            lang_str,
            filter.is_active,
            filter.is_default,
            search_pattern,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to list document templates")?;

        // Get total count with same search pattern
        let search_pattern_count = filter.search.map(|s| format!("%{}%", s));
        let doc_type_str_count = filter.document_type.map(|dt| dt.as_str().to_string());
        let lang_str_count = filter.language.map(|l| l.as_str().to_string());

        let total = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM document_templates
            WHERE
                ($1::VARCHAR IS NULL OR document_type = $1)
                AND ($2::VARCHAR IS NULL OR language = $2)
                AND ($3::BOOLEAN IS NULL OR is_active = $3)
                AND ($4::BOOLEAN IS NULL OR is_default = $4)
                AND ($5::VARCHAR IS NULL OR template_name ILIKE $5 OR template_key ILIKE $5)
            "#,
            doc_type_str_count,
            lang_str_count,
            filter.is_active,
            filter.is_default,
            search_pattern_count
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to count document templates")?;

        Ok(ListDocumentTemplatesResponse {
            templates: templates
                .into_iter()
                .map(DocumentTemplateSummary::from)
                .collect(),
            total,
            limit,
            offset,
        })
    }

    /// Update document template
    pub async fn update_template(
        &self,
        id: Uuid,
        data: UpdateDocumentTemplateRequest,
        updated_by: Uuid,
    ) -> Result<DocumentTemplateResponse> {
        // Convert optional enums to strings
        let page_size_str = data.page_size.map(|ps| ps.as_str().to_string());
        let page_orientation_str = data.page_orientation.map(|po| po.as_str().to_string());
        let language_str = data.language.map(|l| l.as_str().to_string());

        // Convert template_variables to JSONB
        let template_vars_json = data
            .template_variables
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .context("Failed to serialize template variables")?;

        let template = sqlx::query_as!(
            DocumentTemplate,
            r#"
            UPDATE document_templates
            SET
                template_name = COALESCE($2, template_name),
                description = COALESCE($3, description),
                template_html = COALESCE($4, template_html),
                template_variables = COALESCE($5, template_variables),
                header_html = COALESCE($6, header_html),
                footer_html = COALESCE($7, footer_html),
                css_styles = COALESCE($8, css_styles),
                page_size = COALESCE($9, page_size),
                page_orientation = COALESCE($10, page_orientation),
                margin_top_mm = COALESCE($11, margin_top_mm),
                margin_bottom_mm = COALESCE($12, margin_bottom_mm),
                margin_left_mm = COALESCE($13, margin_left_mm),
                margin_right_mm = COALESCE($14, margin_right_mm),
                is_active = COALESCE($15, is_active),
                is_default = COALESCE($16, is_default),
                language = COALESCE($17, language),
                updated_by = $18,
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id, template_key, template_name, description, document_type,
                template_html, template_variables, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
                is_active, is_default, language,
                version, previous_version_id,
                created_at, updated_at, created_by, updated_by
            "#,
            id,
            data.template_name,
            data.description,
            data.template_html,
            template_vars_json,
            data.header_html,
            data.footer_html,
            data.css_styles,
            page_size_str,
            page_orientation_str,
            data.margin_top_mm,
            data.margin_bottom_mm,
            data.margin_left_mm,
            data.margin_right_mm,
            data.is_active,
            data.is_default,
            language_str,
            updated_by
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to update document template")?;

        Ok(DocumentTemplateResponse::from(template))
    }

    /// Delete document template (soft delete)
    pub async fn delete_template(&self, id: Uuid, deleted_by: Uuid) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE document_templates
            SET is_active = false, updated_by = $2, updated_at = NOW()
            WHERE id = $1
            "#,
            id,
            deleted_by
        )
        .execute(&self.pool)
        .await
        .context("Failed to delete document template")?;

        Ok(())
    }

    // ==================== Generated Document Operations ====================

    /// Generate a new document from a template
    pub async fn generate_document(
        &self,
        data: GenerateDocumentRequest,
        provider_id: Uuid,
    ) -> Result<GeneratedDocumentResponse> {
        tracing::debug!("Starting document generation for template_id={}, provider_id={}", data.template_id, provider_id);

        // Get template
        let template = self
            .get_template(data.template_id)
            .await
            .context("Failed to fetch template")?
            .ok_or_else(|| anyhow::anyhow!("Template not found"))?;

        tracing::debug!("Template retrieved: {}", template.template_name);

        // Start transaction for RLS context to fetch patient data
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        tracing::debug!("Transaction started, setting RLS context for provider_id={}", provider_id);

        // Set RLS context
        Self::set_rls_context(&mut tx, provider_id).await
            .context("Failed to set RLS context")?;

        tracing::debug!("RLS context set successfully");

        // Fetch patient data from database within RLS context (data is encrypted)
        let patient_encrypted = sqlx::query!(
            r#"
            SELECT id, first_name, last_name, middle_name, date_of_birth,
                   gender, fiscal_code, email, phone_primary
            FROM patients
            WHERE id = $1
            "#,
            data.patient_id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to fetch patient for document generation")?;

        // Decrypt patient data
        let patient_first_name = self.encryption_key.decrypt(&patient_encrypted.first_name)
            .context("Failed to decrypt patient first_name")?;
        let patient_last_name = self.encryption_key.decrypt(&patient_encrypted.last_name)
            .context("Failed to decrypt patient last_name")?;
        let patient_middle_name = patient_encrypted.middle_name
            .as_ref()
            .map(|m| self.encryption_key.decrypt(m))
            .transpose()
            .context("Failed to decrypt patient middle_name")?;
        let patient_date_of_birth = self.encryption_key.decrypt(&patient_encrypted.date_of_birth)
            .context("Failed to decrypt patient date_of_birth")?;
        let patient_fiscal_code = patient_encrypted.fiscal_code
            .as_ref()
            .map(|f| self.encryption_key.decrypt(f))
            .transpose()
            .context("Failed to decrypt patient fiscal_code")?;
        let patient_email = patient_encrypted.email
            .as_ref()
            .map(|e| self.encryption_key.decrypt(e))
            .transpose()
            .context("Failed to decrypt patient email")?;
        let patient_phone = patient_encrypted.phone_primary
            .as_ref()
            .map(|p| self.encryption_key.decrypt(p))
            .transpose()
            .context("Failed to decrypt patient phone")?;

        // Fetch provider (user) data for template
        let provider = sqlx::query!(
            r#"
            SELECT id, first_name, last_name, email
            FROM users
            WHERE id = $1
            "#,
            provider_id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to fetch provider for document generation")?;

        // Fetch clinic settings from system_settings table
        let clinic_settings = sqlx::query!(
            r#"
            SELECT setting_key, setting_value
            FROM system_settings
            WHERE setting_group = 'clinic'
            "#
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch clinic settings")?;

        // Commit transaction after fetching data
        tx.commit().await.context("Failed to commit data fetch transaction")?;

        tracing::debug!("Patient and provider data fetched successfully");

        // Fetch practice logo (outside transaction)
        let logo_data = match FileUploadService::get_logo(&self.pool).await {
            Ok(Some(logo)) => {
                // Read logo file and convert to base64 data URI
                match FileUploadService::read_file(&logo.storage_path).await {
                    Ok(bytes) => {
                        let base64_data = BASE64.encode(&bytes);
                        let data_uri = format!("data:{};base64,{}", logo.mime_type, base64_data);
                        tracing::debug!("Logo loaded successfully, size: {} bytes", bytes.len());
                        Some(data_uri)
                    }
                    Err(e) => {
                        tracing::warn!("Failed to read logo file: {}", e);
                        None
                    }
                }
            }
            Ok(None) => {
                tracing::debug!("No practice logo configured");
                None
            }
            Err(e) => {
                tracing::warn!("Failed to fetch logo: {}", e);
                None
            }
        };

        // Build patient data for template (using decrypted values)
        let patient_full_name = if let Some(ref middle) = patient_middle_name {
            format!("{} {} {}", patient_first_name, middle, patient_last_name)
        } else {
            format!("{} {}", patient_first_name, patient_last_name)
        };

        let patient_data = serde_json::json!({
            "id": patient_encrypted.id.to_string(),
            "first_name": patient_first_name,
            "last_name": patient_last_name,
            "middle_name": patient_middle_name,
            "full_name": patient_full_name,
            "date_of_birth": patient_date_of_birth,
            "gender": patient_encrypted.gender,
            "fiscal_code": patient_fiscal_code.unwrap_or_else(|| "none".to_string()),
            "email": patient_email,
            "phone": patient_phone,
        });

        // Build provider data for template
        let provider_full_name = format!("{} {}", provider.first_name, provider.last_name);
        let provider_data = serde_json::json!({
            "id": provider.id.to_string(),
            "first_name": provider.first_name,
            "last_name": provider.last_name,
            "full_name": provider_full_name,
            "email": provider.email,
            // Default values for fields that may not exist in users table
            "specialization": "Medico Chirurgo",
            "license_number": "N/D",
        });

        // Build clinic data from system_settings
        let mut clinic_name = "Studio Medico".to_string();
        let mut clinic_address = String::new();
        let mut clinic_phone = String::new();
        let mut clinic_email = String::new();
        let mut clinic_vat = String::new();
        let mut clinic_website = String::new();
        let mut clinic_fax = String::new();

        for setting in &clinic_settings {
            // Extract string value from JSON (removing quotes if present)
            let value = match &setting.setting_value {
                serde_json::Value::String(s) => s.clone(),
                v => v.to_string().trim_matches('"').to_string(),
            };
            match setting.setting_key.as_str() {
                "clinic.name" => clinic_name = value,
                "clinic.address" => clinic_address = value,
                "clinic.phone" => clinic_phone = value,
                "clinic.email" => clinic_email = value,
                "clinic.vat_number" => clinic_vat = value,
                "clinic.website" => clinic_website = value,
                "clinic.fax" => clinic_fax = value,
                _ => {}
            }
        }

        // Parse address into components if possible (format: "street, city, province")
        let address_parts: Vec<&str> = clinic_address.split(',').map(|s| s.trim()).collect();
        let (street, city, province) = match address_parts.as_slice() {
            [street, city, province, ..] => (street.to_string(), city.to_string(), province.to_string()),
            [street, city] => (street.to_string(), city.to_string(), String::new()),
            [street] => (street.to_string(), String::new(), String::new()),
            [] => (String::new(), String::new(), String::new()),
        };

        let clinic_data = serde_json::json!({
            "name": clinic_name,
            "address": street,
            "full_address": clinic_address,
            "city": city,
            "province": province,
            "phone": clinic_phone,
            "fax": clinic_fax,
            "email": clinic_email,
            "website": clinic_website,
            "vat_number": clinic_vat,
            "logo": logo_data,
        });

        // Build document metadata
        let document_data = serde_json::json!({
            "date": Utc::now().format("%d/%m/%Y").to_string(),
        });

        // Merge all data with additional_data
        let mut variables = data.additional_data.clone().unwrap_or(serde_json::json!({}));
        if let serde_json::Value::Object(ref mut map) = variables {
            map.insert("patient".to_string(), patient_data);
            map.insert("provider".to_string(), provider_data);
            // Only add clinic/document if not already provided
            if !map.contains_key("clinic") {
                map.insert("clinic".to_string(), clinic_data);
            }
            if !map.contains_key("document") {
                map.insert("document".to_string(), document_data);
            }
            // Add empty default objects for document-type-specific variables
            // This prevents template errors when conditionals check these objects
            if !map.contains_key("certificate") {
                map.insert("certificate".to_string(), serde_json::json!({
                    "content": "",
                    "prognosis_days": null,
                    "start_date": "",
                    "end_date": "",
                }));
            }
            if !map.contains_key("referral") {
                map.insert("referral".to_string(), serde_json::json!({
                    "specialty": "",
                    "urgency": "",
                    "reason": "",
                    "clinical_info": "",
                    "request": "",
                }));
            }
            if !map.contains_key("lab") {
                map.insert("lab".to_string(), serde_json::json!({
                    "tests": [],
                    "clinical_info": "",
                    "urgency": "",
                    "fasting": false,
                }));
            }
            if !map.contains_key("visit") {
                map.insert("visit".to_string(), serde_json::json!({
                    "date": "",
                    "chief_complaint": "",
                    "subjective": "",
                    "objective": "",
                    "assessment": "",
                    "plan": "",
                    "vitals": {},
                    "diagnoses": [],
                }));
            }
            if !map.contains_key("prescription") {
                map.insert("prescription".to_string(), serde_json::json!({
                    "medications": [],
                    "notes": "",
                }));
            }
        } else {
            // If variables is not an object, create one with all data
            variables = serde_json::json!({
                "patient": patient_data,
                "provider": provider_data,
                "clinic": clinic_data,
                "document": document_data,
                "certificate": {
                    "content": "",
                    "prognosis_days": null,
                    "start_date": "",
                    "end_date": "",
                },
                "referral": {
                    "specialty": "",
                    "urgency": "",
                    "reason": "",
                    "clinical_info": "",
                    "request": "",
                },
                "lab": {
                    "tests": [],
                    "clinical_info": "",
                    "urgency": "",
                    "fasting": false,
                },
                "visit": {
                    "date": "",
                    "chief_complaint": "",
                    "subjective": "",
                    "objective": "",
                    "assessment": "",
                    "plan": "",
                    "vitals": {},
                    "diagnoses": [],
                },
                "prescription": {
                    "medications": [],
                    "notes": "",
                },
            });
        }

        tracing::debug!("Merged patient, provider, clinic data with template variables");

        // Perform variable substitution on main template
        let rendered_html = self.substitute_variables(&template.template_html, &variables)
            .context("Failed to substitute template variables")?;

        // Also substitute variables in header and footer
        let rendered_header = template.header_html
            .as_ref()
            .map(|h| self.substitute_variables(h, &variables))
            .transpose()
            .context("Failed to substitute header variables")?;
        let rendered_footer = template.footer_html
            .as_ref()
            .map(|f| self.substitute_variables(f, &variables))
            .transpose()
            .context("Failed to substitute footer variables")?;

        tracing::debug!("Template variables substituted successfully");

        // Generate PDF
        let pdf_bytes = self.render_pdf_from_html(
            &rendered_html,
            rendered_header.as_deref(),
            rendered_footer.as_deref(),
            template.css_styles.as_deref(),
            template.page_size,
            template.page_orientation,
            template.margin_top_mm,
            template.margin_bottom_mm,
            template.margin_left_mm,
            template.margin_right_mm,
        ).context("Failed to render PDF from HTML")?;

        tracing::debug!("PDF generated successfully, size: {} bytes", pdf_bytes.len());

        // Calculate file hash
        let file_hash = self.calculate_hash(&pdf_bytes);

        // Generate filename
        let filename = format!(
            "{}_{}.pdf",
            template.document_type.as_str().to_lowercase(),
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        // Store file
        let file_path = self.store_file(&filename, &pdf_bytes).await
            .context("Failed to store PDF file")?;

        tracing::debug!("PDF stored at: {}", file_path);

        // Encrypt generation data (contains PHI)
        let encrypted_variables = self.encryption_key.encrypt_json(&variables)
            .context("Failed to encrypt generation data")?;
        let generation_data_json = serde_json::json!({"encrypted": encrypted_variables});

        // Start another transaction for inserting the document
        let mut tx = self.pool.begin().await.context("Failed to begin document insert transaction")?;

        tracing::debug!("Insert transaction started, setting RLS context for provider_id={}", provider_id);

        // Set RLS context again for the new transaction
        Self::set_rls_context(&mut tx, provider_id).await
            .context("Failed to set RLS context for document insert")?;

        tracing::debug!("RLS context set for document insert");

        // Create database record
        let document = sqlx::query_as!(
            GeneratedDocument,
            r#"
            INSERT INTO generated_documents (
                template_id, patient_id, visit_id, visit_date, provider_id,
                document_type, document_title, document_filename,
                file_path, file_size_bytes, file_hash,
                template_version, generation_data,
                status, expires_at,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING
                id, template_id, patient_id, visit_id, visit_date, provider_id,
                document_type, document_title, document_filename,
                file_path, file_size_bytes, file_hash,
                template_version, generation_data,
                status, generation_error,
                delivered_to, delivered_at,
                expires_at, deleted_at,
                is_signed, signature_hash, signed_at, signed_by,
                created_at, updated_at, created_by, updated_by
            "#,
            data.template_id,
            data.patient_id,
            data.visit_id,
            data.visit_date,
            provider_id,
            template.document_type.as_str(),
            data.document_title,
            filename,
            file_path,
            pdf_bytes.len() as i64,
            file_hash,
            template.version,
            generation_data_json,
            DocumentStatus::Generated.as_str(),
            data.expires_at,
            provider_id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to create document record")?;

        // Commit transaction
        tx.commit().await.context("Failed to commit transaction")?;

        Ok(GeneratedDocumentResponse::from(document))
    }

    /// Get generated document by ID
    pub async fn get_document(&self, id: Uuid, user_id: Uuid) -> Result<Option<GeneratedDocumentResponse>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let document = sqlx::query_as!(
            GeneratedDocument,
            r#"
            SELECT
                id, template_id, patient_id, visit_id, visit_date, provider_id,
                document_type, document_title, document_filename,
                file_path, file_size_bytes, file_hash,
                template_version, generation_data,
                status, generation_error,
                delivered_to, delivered_at,
                expires_at, deleted_at,
                is_signed, signature_hash, signed_at, signed_by,
                created_at, updated_at, created_by, updated_by
            FROM generated_documents
            WHERE id = $1 AND status != 'DELETED'
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch generated document")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(document.map(GeneratedDocumentResponse::from))
    }

    /// Get document file path for download
    pub async fn get_document_file_path(&self, id: Uuid, user_id: Uuid) -> Result<Option<String>> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let result = sqlx::query!(
            r#"
            SELECT file_path FROM generated_documents
            WHERE id = $1 AND status != 'DELETED'
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch document file path")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(result.map(|r| r.file_path))
    }

    /// List generated documents with filtering
    pub async fn list_documents(
        &self,
        filter: GeneratedDocumentFilter,
        limit: i64,
        offset: i64,
        user_id: Uuid,
    ) -> Result<ListGeneratedDocumentsResponse> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, user_id).await?;

        let doc_type_str = filter.document_type.map(|dt| dt.as_str().to_string());
        let status_str = filter.status.map(|s| s.as_str().to_string());

        let documents = sqlx::query_as!(
            GeneratedDocument,
            r#"
            SELECT
                id, template_id, patient_id, visit_id, visit_date, provider_id,
                document_type, document_title, document_filename,
                file_path, file_size_bytes, file_hash,
                template_version, generation_data,
                status, generation_error,
                delivered_to, delivered_at,
                expires_at, deleted_at,
                is_signed, signature_hash, signed_at, signed_by,
                created_at, updated_at, created_by, updated_by
            FROM generated_documents
            WHERE
                status != 'DELETED'
                AND ($1::UUID IS NULL OR patient_id = $1)
                AND ($2::UUID IS NULL OR visit_id = $2)
                AND ($3::UUID IS NULL OR provider_id = $3)
                AND ($4::VARCHAR IS NULL OR document_type = $4)
                AND ($5::VARCHAR IS NULL OR status = $5)
                AND (($6::BOOLEAN IS NULL) OR (is_signed = $6))
                AND ($7::TIMESTAMPTZ IS NULL OR created_at >= $7)
                AND ($8::TIMESTAMPTZ IS NULL OR created_at <= $8)
            ORDER BY created_at DESC
            LIMIT $9 OFFSET $10
            "#,
            filter.patient_id,
            filter.visit_id,
            filter.provider_id,
            doc_type_str,
            status_str,
            filter.is_signed as Option<bool>,
            filter.from_date,
            filter.to_date,
            limit,
            offset
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to list generated documents")?;

        // Get count with same filter
        let doc_type_str_count = filter.document_type.map(|dt| dt.as_str().to_string());
        let status_str_count = filter.status.map(|s| s.as_str().to_string());

        let total = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM generated_documents
            WHERE
                status != 'DELETED'
                AND ($1::UUID IS NULL OR patient_id = $1)
                AND ($2::UUID IS NULL OR visit_id = $2)
                AND ($3::UUID IS NULL OR provider_id = $3)
                AND ($4::VARCHAR IS NULL OR document_type = $4)
                AND ($5::VARCHAR IS NULL OR status = $5)
                AND (($6::BOOLEAN IS NULL) OR (is_signed = $6))
                AND ($7::TIMESTAMPTZ IS NULL OR created_at >= $7)
                AND ($8::TIMESTAMPTZ IS NULL OR created_at <= $8)
            "#,
            filter.patient_id,
            filter.visit_id,
            filter.provider_id,
            doc_type_str_count,
            status_str_count,
            filter.is_signed as Option<bool>,
            filter.from_date,
            filter.to_date
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to count documents")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(ListGeneratedDocumentsResponse {
            documents: documents
                .into_iter()
                .map(GeneratedDocumentSummary::from)
                .collect(),
            total,
            limit,
            offset,
        })
    }

    /// Mark document as delivered
    pub async fn deliver_document(
        &self,
        id: Uuid,
        data: DeliverDocumentRequest,
        delivered_by: Uuid,
    ) -> Result<GeneratedDocumentResponse> {
        // Start transaction for RLS context and update
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, delivered_by).await?;

        let document = sqlx::query_as!(
            GeneratedDocument,
            r#"
            UPDATE generated_documents
            SET
                status = 'DELIVERED',
                delivered_to = $2,
                delivered_at = NOW(),
                updated_by = $3,
                updated_at = NOW()
            WHERE id = $1 AND status = 'GENERATED'
            RETURNING
                id, template_id, patient_id, visit_id, visit_date, provider_id,
                document_type, document_title, document_filename,
                file_path, file_size_bytes, file_hash,
                template_version, generation_data,
                status, generation_error,
                delivered_to, delivered_at,
                expires_at, deleted_at,
                is_signed, signature_hash, signed_at, signed_by,
                created_at, updated_at, created_by, updated_by
            "#,
            id,
            data.delivered_to,
            delivered_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to mark document as delivered")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(GeneratedDocumentResponse::from(document))
    }

    /// Sign document digitally with visible signature block
    pub async fn sign_document(
        &self,
        id: Uuid,
        signed_by: Uuid,
    ) -> Result<GeneratedDocumentResponse> {
        // Start transaction for RLS context and update
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, signed_by).await?;

        // Get current document
        let doc = sqlx::query!(
            r#"
            SELECT
                file_hash, document_title, patient_id, created_at,
                is_signed, template_id, generation_data, file_path
            FROM generated_documents
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to fetch document for signing")?;

        // Get template info
        let template = sqlx::query!(
            r#"
            SELECT
                template_html, header_html, footer_html, css_styles,
                page_size, page_orientation,
                margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm
            FROM document_templates
            WHERE id = $1
            "#,
            doc.template_id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch template for signing")?;

        // Prevent double-signing
        if doc.is_signed.unwrap_or(false) {
            anyhow::bail!("Document is already signed");
        }

        // Fetch signer information
        let signer = sqlx::query!(
            r#"
            SELECT first_name, last_name, role, email
            FROM users WHERE id = $1
            "#,
            signed_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to fetch signer information")?;

        let signer_name = format!("{} {}", signer.first_name, signer.last_name);
        let signed_at = Utc::now();

        // Create signature hash (SHA-256 of file_hash + signer + timestamp)
        let signature_content = format!(
            "{}:{}:{}:{}",
            doc.file_hash.clone().unwrap_or_default(),
            signed_by,
            doc.patient_id,
            signed_at.timestamp()
        );
        let signature_hash = self.calculate_hash(signature_content.as_bytes());

        // Regenerate PDF with signature block
        let new_pdf_bytes = if let Some(ref tpl) = template {
            // Decrypt generation data to get original variables
            let variables: serde_json::Value = if let Some(ref gen_data) = doc.generation_data {
                if let Some(encrypted) = gen_data.get("encrypted").and_then(|v: &serde_json::Value| v.as_str()) {
                    self.encryption_key.decrypt_json(encrypted)
                        .unwrap_or_else(|_| serde_json::json!({}))
                } else {
                    serde_json::json!({})
                }
            } else {
                serde_json::json!({})
            };

            // Render the original content with variables
            let rendered_html = self.substitute_variables(&tpl.template_html, &variables)
                .context("Failed to substitute template variables")?;

            // Create signature block HTML
            let signature_block = format!(
                r#"
                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <strong>═══════════════════════════════════════════════════════════</strong>
                    </div>
                    <div style="text-align: center; margin-bottom: 15px;">
                        <strong>DIGITALLY SIGNED DOCUMENT</strong>
                    </div>
                    <div style="margin: 10px 0;">
                        <strong>Signed by:</strong> Dr. {}
                    </div>
                    <div style="margin: 10px 0;">
                        <strong>Role:</strong> {}
                    </div>
                    <div style="margin: 10px 0;">
                        <strong>Date and Time:</strong> {}
                    </div>
                    <div style="margin: 10px 0;">
                        <strong>Digital Signature Hash:</strong>
                    </div>
                    <div style="font-family: monospace; font-size: 10px; word-break: break-all; margin: 5px 0;">
                        {}
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <strong>═══════════════════════════════════════════════════════════</strong>
                    </div>
                    <div style="text-align: center; font-size: 10px; margin-top: 10px; color: #666;">
                        This document has been digitally signed and any modifications will invalidate the signature.
                    </div>
                </div>
                "#,
                signer_name,
                signer.role,
                signed_at.format("%Y-%m-%d %H:%M:%S UTC"),
                signature_hash
            );

            // Combine original content with signature block
            let signed_content = format!("{}\n{}", rendered_html, signature_block);

            // Render header/footer with variables
            let rendered_header = tpl.header_html
                .as_ref()
                .map(|h| self.substitute_variables(h, &variables))
                .transpose()
                .context("Failed to substitute header variables")?;
            let rendered_footer = tpl.footer_html
                .as_ref()
                .map(|f| self.substitute_variables(f, &variables))
                .transpose()
                .context("Failed to substitute footer variables")?;

            // Parse page size and orientation
            let page_size = tpl.page_size
                .as_deref()
                .map(PageSize::from_str)
                .unwrap_or(PageSize::A4);
            let orientation = tpl.page_orientation
                .as_deref()
                .map(PageOrientation::from_str)
                .unwrap_or(PageOrientation::Portrait);

            // Generate new PDF with signature
            self.render_pdf_from_html(
                &signed_content,
                rendered_header.as_deref(),
                rendered_footer.as_deref(),
                tpl.css_styles.as_deref(),
                page_size,
                orientation,
                tpl.margin_top_mm.unwrap_or(20),
                tpl.margin_bottom_mm.unwrap_or(20),
                tpl.margin_left_mm.unwrap_or(20),
                tpl.margin_right_mm.unwrap_or(20),
            ).context("Failed to render signed PDF")?
        } else {
            // No template body available, keep original file
            tokio::fs::read(&doc.file_path).await
                .context("Failed to read original PDF file")?
        };

        // Calculate new file hash
        let new_file_hash = self.calculate_hash(&new_pdf_bytes);
        let new_file_size = new_pdf_bytes.len() as i64;

        // Update the stored file
        tokio::fs::write(&doc.file_path, &new_pdf_bytes).await
            .context("Failed to update signed PDF file")?;

        // Update database with signature info and new file hash
        let document = sqlx::query_as!(
            GeneratedDocument,
            r#"
            UPDATE generated_documents
            SET
                is_signed = true,
                signature_hash = $2,
                signed_at = $3,
                signed_by = $4,
                file_hash = $5,
                file_size_bytes = $6,
                updated_by = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id, template_id, patient_id, visit_id, visit_date, provider_id,
                document_type, document_title, document_filename,
                file_path, file_size_bytes, file_hash,
                template_version, generation_data,
                status, generation_error,
                delivered_to, delivered_at,
                expires_at, deleted_at,
                is_signed, signature_hash, signed_at, signed_by,
                created_at, updated_at, created_by, updated_by
            "#,
            id,
            signature_hash,
            signed_at,
            signed_by,
            new_file_hash,
            new_file_size
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to sign document")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(GeneratedDocumentResponse::from(document))
    }

    /// Delete document (soft delete)
    pub async fn delete_document(&self, id: Uuid, deleted_by: Uuid) -> Result<()> {
        // Start transaction for RLS context and update
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context
        Self::set_rls_context(&mut tx, deleted_by).await?;

        // Check if document is signed - signed documents cannot be deleted
        let is_signed = sqlx::query_scalar!(
            r#"SELECT is_signed FROM generated_documents WHERE id = $1"#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check document signing status")?;

        if let Some(signed) = is_signed {
            if signed.unwrap_or(false) {
                anyhow::bail!("Signed documents cannot be deleted");
            }
        }

        sqlx::query!(
            r#"
            UPDATE generated_documents
            SET status = 'DELETED', deleted_at = NOW(), updated_by = $2, updated_at = NOW()
            WHERE id = $1 AND status NOT IN ('FAILED', 'DELETED')
            "#,
            id,
            deleted_by
        )
        .execute(&mut *tx)
        .await
        .context("Failed to delete document")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(())
    }

    /// Get document statistics
    pub async fn get_statistics(&self) -> Result<DocumentStatistics> {
        let total = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!" FROM generated_documents WHERE status != 'DELETED'"#
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to count documents")?;

        let signed = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!" FROM generated_documents WHERE is_signed = true AND status != 'DELETED'"#
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to count signed documents")?;

        let delivered = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!" FROM generated_documents WHERE status = 'DELIVERED'"#
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to count delivered documents")?;

        let total_size = sqlx::query_scalar!(
            r#"SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT as "sum!" FROM generated_documents WHERE status != 'DELETED'"#
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to sum file sizes")?;

        // Get counts by type
        let type_counts = sqlx::query!(
            r#"
            SELECT document_type, COUNT(*) as "count!"
            FROM generated_documents
            WHERE status != 'DELETED'
            GROUP BY document_type
            "#
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to get type counts")?;

        let by_type: Vec<DocumentTypeCount> = type_counts
            .into_iter()
            .filter_map(|r| {
                DocumentType::from_str(&r.document_type).map(|dt| DocumentTypeCount {
                    document_type: dt,
                    count: r.count,
                })
            })
            .collect();

        // Get counts by status
        let status_counts = sqlx::query!(
            r#"
            SELECT status, COUNT(*) as "count!"
            FROM generated_documents
            GROUP BY status
            "#
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to get status counts")?;

        let by_status: Vec<DocumentStatusCount> = status_counts
            .into_iter()
            .filter_map(|r| {
                DocumentStatus::from_str(&r.status).map(|s| DocumentStatusCount {
                    status: s,
                    count: r.count,
                })
            })
            .collect();

        Ok(DocumentStatistics {
            total_documents: total,
            by_type,
            by_status,
            signed_count: signed,
            delivered_count: delivered,
            total_size_bytes: total_size,
        })
    }

    // ==================== Helper Methods ====================

    /// Substitute variables in template HTML using minijinja
    fn substitute_variables(
        &self,
        template: &str,
        variables: &serde_json::Value,
    ) -> Result<String> {
        #[cfg(feature = "pdf-export")]
        {
            use minijinja::{Environment, UndefinedBehavior};

            let mut env = Environment::new();
            // Use lenient undefined behavior - undefined values render as empty string
            env.set_undefined_behavior(UndefinedBehavior::Lenient);
            env.add_template("document", template)
                .context("Failed to parse template")?;

            let tmpl = env.get_template("document").unwrap();
            let result = tmpl
                .render(variables)
                .context("Failed to render template")?;

            Ok(result)
        }

        #[cfg(not(feature = "pdf-export"))]
        {
            // Simple fallback: just return template as-is
            let _ = variables;
            Ok(template.to_string())
        }
    }

    /// Render PDF from HTML content
    #[allow(clippy::too_many_arguments)]
    fn render_pdf_from_html(
        &self,
        content: &str,
        header: Option<&str>,
        footer: Option<&str>,
        _css: Option<&str>,
        page_size: PageSize,
        orientation: PageOrientation,
        _margin_top: i32,
        _margin_bottom: i32,
        _margin_left: i32,
        _margin_right: i32,
    ) -> Result<Vec<u8>> {
        #[cfg(feature = "pdf-export")]
        {
            use genpdf::{elements::Paragraph, fonts, Document, SimplePageDecorator};

            // Get page dimensions
            let (width, height) = page_size.dimensions_mm();
            let (page_width, page_height) = match orientation {
                PageOrientation::Portrait => (width, height),
                PageOrientation::Landscape => (height, width),
            };

            // Try to load fonts from various locations
            let font_family = fonts::from_files("./fonts", "LiberationSans", None)
                .or_else(|_| {
                    fonts::from_files("/usr/share/fonts/liberation", "LiberationSans", None)
                })
                .or_else(|_| {
                    fonts::from_files(
                        "/usr/share/fonts/truetype/liberation",
                        "LiberationSans",
                        None,
                    )
                })
                .or_else(|_| {
                    fonts::from_files("/usr/share/fonts/truetype/dejavu", "DejaVuSans", None)
                })
                .context("Could not load any fonts for PDF generation")?;

            // Create document
            let mut doc = Document::new(font_family);

            // Set page size (genpdf uses different API)
            doc.set_paper_size(genpdf::PaperSize::A4); // Default to A4 for now

            // Add simple page decorator
            doc.set_page_decorator(SimplePageDecorator::new());

            // Add header if provided
            if let Some(header_text) = header {
                doc.push(Paragraph::new(html_to_text(header_text)));
            }

            // Add main content (HTML to plain text)
            let plain_text = html_to_text(content);
            for line in plain_text.lines() {
                if !line.trim().is_empty() {
                    doc.push(Paragraph::new(line));
                }
            }

            // Add footer if provided
            if let Some(footer_text) = footer {
                doc.push(Paragraph::new(html_to_text(footer_text)));
            }

            // Render to bytes
            let mut buffer = Vec::new();
            doc.render(&mut buffer)
                .context("Failed to render PDF")?;

            let _ = (page_width, page_height); // Suppress unused variable warning
            Ok(buffer)
        }

        #[cfg(not(feature = "pdf-export"))]
        {
            // Return placeholder PDF content when feature is disabled
            let _ = (content, header, footer, page_size, orientation);
            Ok(b"%PDF-1.4\nDocument generation feature not enabled".to_vec())
        }
    }

    /// Calculate SHA-256 hash of data
    fn calculate_hash(&self, data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    /// Store file to disk
    async fn store_file(&self, filename: &str, data: &[u8]) -> Result<String> {
        // Ensure storage directory exists
        tokio::fs::create_dir_all(&self.storage_path)
            .await
            .context("Failed to create storage directory")?;

        // Create subdirectory by date for organization
        let date_dir = self
            .storage_path
            .join(Utc::now().format("%Y/%m").to_string());
        tokio::fs::create_dir_all(&date_dir)
            .await
            .context("Failed to create date directory")?;

        // Write file
        let file_path = date_dir.join(filename);
        tokio::fs::write(&file_path, data)
            .await
            .context("Failed to write file")?;

        Ok(file_path.to_string_lossy().to_string())
    }
}

/// Simple HTML to text converter (strips tags)
#[cfg(feature = "pdf-export")]
fn html_to_text(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;

    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(c),
            _ => {}
        }
    }

    // Clean up whitespace
    result
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}
