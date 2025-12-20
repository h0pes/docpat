// Patient Service Layer
// Business logic for patient management, duplicate detection, and search

use crate::models::{
    AuditAction, AuditLog, CreateAuditLog, CreatePatientRequest, EntityType, Patient, PatientDto,
    PatientSearchFilter, PatientStatus, RequestContext, UpdatePatientRequest,
};
use crate::utils::encryption::EncryptionKey;
use anyhow::{Context, Result};
use chrono::{NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

/// Possible duplicate patient match
#[derive(Debug, Clone)]
pub struct PotentialDuplicate {
    pub patient_id: Uuid,
    pub medical_record_number: String,
    pub match_reason: String,
    pub confidence: DuplicateConfidence,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DuplicateConfidence {
    High,   // Exact fiscal code match
    Medium, // Same name + DOB
    Low,    // Similar name
}

pub struct PatientService {
    pool: PgPool,
    encryption_key: EncryptionKey,
}

impl PatientService {
    /// Create a new patient service
    pub fn new(pool: PgPool, encryption_key: EncryptionKey) -> Self {
        Self {
            pool,
            encryption_key,
        }
    }

    /// Create a new patient with duplicate detection
    ///
    /// NOTE: This method is deprecated. Use the handler's inline implementation which properly
    /// handles RLS context within transactions. This method cannot work correctly with RLS
    /// enabled because it uses the pool directly without setting session variables.
    #[deprecated(note = "Use handler's inline implementation with RLS transaction support")]
    #[allow(dead_code)]
    pub async fn create_patient(
        &self,
        _data: CreatePatientRequest,
        _created_by_id: Uuid,
    ) -> Result<PatientDto> {
        anyhow::bail!("This method is deprecated. Use the handler's inline implementation with RLS support.")
    }

    /// Find patient by ID (decrypted)
    pub async fn get_patient(
        &self,
        id: Uuid,
        user_id: Option<Uuid>,
        request_ctx: Option<&RequestContext>,
    ) -> Result<Option<PatientDto>> {
        let patient = Patient::find_by_id(&self.pool, id).await?;

        if let Some(ref p) = patient {
            // Audit log for READ operation
            let _ = AuditLog::create(
                &self.pool,
                CreateAuditLog {
                    user_id,
                    action: AuditAction::Read,
                    entity_type: EntityType::Patient,
                    entity_id: Some(p.id.to_string()),
                    changes: None,
                    ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                    user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                    request_id: request_ctx.map(|c| c.request_id),
                },
            )
            .await;
        }

        match patient {
            Some(p) => Ok(Some(p.decrypt(&self.encryption_key)?)),
            None => Ok(None),
        }
    }

    /// Find patient by medical record number (decrypted)
    pub async fn get_patient_by_mrn(&self, mrn: &str) -> Result<Option<PatientDto>> {
        let patient = Patient::find_by_mrn(&self.pool, mrn).await?;

        match patient {
            Some(p) => Ok(Some(p.decrypt(&self.encryption_key)?)),
            None => Ok(None),
        }
    }

    /// Update patient
    pub async fn update_patient(
        &self,
        id: Uuid,
        data: UpdatePatientRequest,
        updated_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<PatientDto> {
        // Validate input
        data.validate()
            .context("Invalid patient update data")?;

        // Check if patient exists and fetch it
        let existing = Patient::find_by_id(&self.pool, id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Patient not found"))?;

        // Update patient
        let patient = Patient::update_with_existing(&self.pool, id, existing, data, updated_by_id, &self.encryption_key)
            .await
            .context("Failed to update patient")?;

        // Audit log for UPDATE operation
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(updated_by_id),
                action: AuditAction::Update,
                entity_type: EntityType::Patient,
                entity_id: Some(patient.id.to_string()),
                changes: None, // Could store before/after values in future
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        // Decrypt and return
        patient.decrypt(&self.encryption_key)
            .context("Failed to decrypt patient data")
    }

    /// Delete patient (soft delete)
    pub async fn delete_patient(
        &self,
        id: Uuid,
        user_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<()> {
        Patient::soft_delete(&self.pool, id)
            .await
            .context("Failed to delete patient")?;

        // Audit log for DELETE operation
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(user_id),
                action: AuditAction::Delete,
                entity_type: EntityType::Patient,
                entity_id: Some(id.to_string()),
                changes: None,
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        Ok(())
    }

    /// List patients with pagination (decrypted)
    pub async fn list_patients(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<PatientDto>> {
        let patients = Patient::list(&self.pool, limit, offset).await?;

        patients
            .into_iter()
            .map(|p| p.decrypt(&self.encryption_key))
            .collect()
    }

    /// Get total patient count
    pub async fn count_patients(&self) -> Result<i64> {
        Patient::count(&self.pool).await
    }

    /// Search patients with filters and full-text search
    pub async fn search_patients<'e, E>(
        &self,
        executor: E,
        filter: PatientSearchFilter,
        user_id: Option<Uuid>,
        request_ctx: Option<&RequestContext>,
    ) -> Result<Vec<PatientDto>>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let mut conditions = Vec::new();
        let mut param_index = 1;

        // Build WHERE clause based on filters
        if let Some(status) = &filter.status {
            conditions.push(format!("status = ${}", param_index));
            param_index += 1;
        }

        if let Some(gender) = &filter.gender {
            conditions.push(format!("gender = ${}", param_index));
            param_index += 1;
        }

        // Age filters (calculated from date_of_birth)
        if filter.min_age.is_some() || filter.max_age.is_some() {
            // Note: Since date_of_birth is encrypted, we need to decrypt first
            // For now, we'll fetch all and filter in-memory
            // In production, consider using deterministic encryption or separate searchable fields
        }

        // Allergies filter
        if let Some(has_allergies) = filter.has_allergies {
            if has_allergies {
                conditions.push("allergies IS NOT NULL AND array_length(allergies, 1) > 0".to_string());
            } else {
                conditions.push("(allergies IS NULL OR array_length(allergies, 1) = 0)".to_string());
            }
        }

        // Chronic conditions filter
        if let Some(has_conditions) = filter.has_chronic_conditions {
            if has_conditions {
                conditions.push("chronic_conditions IS NOT NULL AND array_length(chronic_conditions, 1) > 0".to_string());
            } else {
                conditions.push("(chronic_conditions IS NULL OR array_length(chronic_conditions, 1) = 0)".to_string());
            }
        }

        // Note: Full-text search on encrypted fields requires fetching all records
        // and filtering in-memory after decryption. For production, consider:
        // 1. Storing searchable hashes alongside encrypted data
        // 2. Using deterministic encryption for search fields (with security tradeoffs)
        // 3. Using specialized searchable encryption schemes

        // Build complete query
        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // When there's a text query, we need to fetch ALL records first because
        // the text search happens in-memory (names are encrypted).
        // We'll apply limit AFTER the in-memory filtering.
        let has_text_query = filter.query.is_some();
        let requested_limit = filter.limit.unwrap_or(50);
        let offset = filter.offset.unwrap_or(0);

        let query_str = if has_text_query {
            // Fetch all matching records for in-memory text search
            format!(
                "SELECT * FROM patients {} ORDER BY last_name ASC, first_name ASC",
                where_clause
            )
        } else {
            // No text search - apply limit at DB level
            format!(
                "SELECT * FROM patients {} ORDER BY last_name ASC, first_name ASC LIMIT {} OFFSET {}",
                where_clause, requested_limit, offset
            )
        };

        // Execute query with parameters
        let mut query = sqlx::query_as::<_, Patient>(&query_str);

        if let Some(status) = &filter.status {
            query = query.bind(status);
        }

        if let Some(gender) = &filter.gender {
            query = query.bind(gender);
        }

        let patients = query
            .fetch_all(executor)
            .await
            .context("Failed to search patients")?;

        // Audit log for SEARCH operation
        if !patients.is_empty() {
            let _ = AuditLog::create(
                &self.pool,
                CreateAuditLog {
                    user_id,
                    action: AuditAction::Search,
                    entity_type: EntityType::Patient,
                    entity_id: None, // Search affects multiple patients
                    changes: filter.query.as_ref().map(|q| {
                        serde_json::json!({
                            "search_query": q,
                            "results_count": patients.len()
                        })
                    }),
                    ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                    user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                    request_id: request_ctx.map(|c| c.request_id),
                },
            )
            .await;
        }

        // Decrypt results
        let mut decrypted: Vec<PatientDto> = patients
            .into_iter()
            .map(|p| p.decrypt(&self.encryption_key))
            .collect::<Result<Vec<_>>>()?;

        // Apply text search filter (in-memory since names are encrypted)
        if let Some(ref search_query) = filter.query {
            let query_lower = search_query.to_lowercase();
            decrypted.retain(|p| {
                let first_name_match = p.first_name.to_lowercase().contains(&query_lower);
                let last_name_match = p.last_name.to_lowercase().contains(&query_lower);
                first_name_match || last_name_match
            });
        }

        // Apply age filters (in-memory since DOB is encrypted)
        if let Some(min_age) = filter.min_age {
            let max_dob = Utc::now().date_naive() - chrono::Duration::days(min_age as i64 * 365);
            decrypted.retain(|p| p.date_of_birth <= max_dob);
        }

        if let Some(max_age) = filter.max_age {
            let min_dob = Utc::now().date_naive() - chrono::Duration::days((max_age as i64 + 1) * 365);
            decrypted.retain(|p| p.date_of_birth >= min_dob);
        }

        // Apply limit AFTER in-memory filtering (for text search queries)
        if has_text_query && decrypted.len() > requested_limit as usize {
            decrypted.truncate(requested_limit as usize);
        }

        Ok(decrypted)
    }

    /// Find potential duplicate patients
    /// Note: Due to non-deterministic AES-GCM encryption, we must fetch and decrypt
    /// all patients to check for duplicates. This is the correct approach for security
    /// but may be slower for large datasets. Consider using indexed hash columns for production.
    ///
    /// IMPORTANT: This method requires RLS context to be set if RLS is enabled on the patients table.
    /// Pass a connection with RLS context (e.g., from within a transaction with SET LOCAL).
    pub async fn find_duplicates(
        &self,
        conn: &mut sqlx::PgConnection,
        data: &CreatePatientRequest,
    ) -> Result<Vec<PotentialDuplicate>> {
        let mut duplicates = Vec::new();

        // Check for exact fiscal code match (highest confidence)
        // Fetch all patients with fiscal codes and decrypt to compare
        if let Some(ref fiscal_code) = data.fiscal_code {
            tracing::debug!("Checking for duplicate fiscal code: {}", fiscal_code);

            let all_patients = sqlx::query_as::<_, Patient>(
                "SELECT * FROM patients WHERE fiscal_code IS NOT NULL"
            )
            .fetch_all(&mut *conn)
            .await?;

            tracing::debug!("Found {} patients with fiscal codes to check", all_patients.len());

            for patient in all_patients {
                // Decrypt and compare fiscal code
                if let Some(ref encrypted_fc) = patient.fiscal_code {
                    if let Ok(decrypted_fc) = self.encryption_key.decrypt(encrypted_fc) {
                        tracing::debug!("Comparing '{}' with '{}'", decrypted_fc, fiscal_code);
                        if &decrypted_fc == fiscal_code {
                            tracing::warn!("Found duplicate fiscal code for patient {}", patient.medical_record_number);
                            duplicates.push(PotentialDuplicate {
                                patient_id: patient.id,
                                medical_record_number: patient.medical_record_number.clone(),
                                match_reason: "Exact fiscal code match".to_string(),
                                confidence: DuplicateConfidence::High,
                            });
                        }
                    }
                }
            }
        }

        // Check for same first name, last name, and date of birth (medium confidence)
        let all_patients = sqlx::query_as::<_, Patient>(
            "SELECT * FROM patients"
        )
        .fetch_all(&mut *conn)
        .await?;

        for patient in all_patients {
            // Skip if already added as high confidence duplicate
            if duplicates.iter().any(|d| d.patient_id == patient.id) {
                continue;
            }

            // Decrypt and compare name + DOB
            if let (Ok(first_name), Ok(last_name), Ok(dob_str)) = (
                self.encryption_key.decrypt(&patient.first_name),
                self.encryption_key.decrypt(&patient.last_name),
                self.encryption_key.decrypt(&patient.date_of_birth),
            ) {
                // Compare names and date of birth
                if first_name == data.first_name
                    && last_name == data.last_name
                    && dob_str == data.date_of_birth.to_string()
                {
                    duplicates.push(PotentialDuplicate {
                        patient_id: patient.id,
                        medical_record_number: patient.medical_record_number.clone(),
                        match_reason: "Same name and date of birth".to_string(),
                        confidence: DuplicateConfidence::Medium,
                    });
                }
            }
        }

        Ok(duplicates)
    }

    /// Get patient statistics
    pub async fn get_statistics<'c>(
        &self,
        conn: &mut sqlx::PgConnection,
    ) -> Result<PatientStatistics> {
        let total_patients: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM patients"
        )
        .fetch_one(&mut *conn)
        .await?;

        let active_patients: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM patients WHERE status = 'ACTIVE'"
        )
        .fetch_one(&mut *conn)
        .await?;

        let inactive_patients: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM patients WHERE status = 'INACTIVE'"
        )
        .fetch_one(&mut *conn)
        .await?;

        let deceased_patients: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM patients WHERE status = 'DECEASED'"
        )
        .fetch_one(&mut *conn)
        .await?;

        let patients_with_insurance: (i64,) = sqlx::query_as(
            "SELECT COUNT(DISTINCT patient_id) FROM patient_insurance WHERE is_active = true"
        )
        .fetch_one(&mut *conn)
        .await?;

        Ok(PatientStatistics {
            total_patients: total_patients.0,
            by_status: StatusBreakdown {
                active: active_patients.0,
                inactive: inactive_patients.0,
                deceased: deceased_patients.0,
            },
            patients_with_insurance: patients_with_insurance.0,
        })
    }
}

/// Patient statistics response
#[derive(Debug, Clone, serde::Serialize)]
pub struct PatientStatistics {
    pub total_patients: i64,
    pub by_status: StatusBreakdown,
    pub patients_with_insurance: i64,
}

/// Breakdown of patients by status
#[derive(Debug, Clone, serde::Serialize)]
pub struct StatusBreakdown {
    pub active: i64,
    pub inactive: i64,
    pub deceased: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_duplicate_confidence_ordering() {
        assert_eq!(DuplicateConfidence::High, DuplicateConfidence::High);
        assert_ne!(DuplicateConfidence::High, DuplicateConfidence::Medium);
    }
}
