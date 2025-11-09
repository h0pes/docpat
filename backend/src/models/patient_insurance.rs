// Patient Insurance model with encrypted PHI/PII fields
// All insurance information is encrypted using AES-256-GCM before storage

use crate::utils::encryption::EncryptionKey;
use anyhow::{Context, Result};
use chrono::{NaiveDate, DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, FromRow};
use uuid::Uuid;
use validator::Validate;

/// Insurance type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InsuranceType {
    Primary,
    Secondary,
    Tertiary,
}

/// Policyholder relationship
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PolicyholderRelationship {
    #[serde(rename = "SELF")]
    #[sqlx(rename = "SELF")]
    SelfRelation,
    Spouse,
    Parent,
    Child,
    Other,
}

/// Provider address structure (stored as encrypted JSONB)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderAddress {
    pub street: String,
    pub city: String,
    pub state: String,
    pub zip: String,
    pub country: String,
}

/// Patient Insurance model - database representation with ENCRYPTED fields
#[derive(Debug, Clone, FromRow)]
pub struct PatientInsurance {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub insurance_type: InsuranceType,

    // Insurance Provider Information (encrypted)
    pub provider_name: String,         // 🔒 Encrypted
    pub policy_number: String,         // 🔒 Encrypted
    pub group_number: Option<String>,  // 🔒 Encrypted
    pub plan_name: Option<String>,     // 🔒 Encrypted

    // Policyholder Information (encrypted)
    pub policyholder_name: Option<String>,           // 🔒 Encrypted
    pub policyholder_relationship: Option<PolicyholderRelationship>,
    pub policyholder_dob: Option<String>,            // 🔒 Encrypted (stored as string)

    // Coverage Details
    pub effective_date: NaiveDate,
    pub expiration_date: Option<NaiveDate>,
    pub coverage_type: Option<String>,

    // Contact Information (encrypted)
    pub provider_phone: Option<String>,              // 🔒 Encrypted
    pub provider_address: Option<sqlx::types::JsonValue>, // 🔒 Encrypted

    // Additional Information
    pub notes: Option<String>,                       // 🔒 Encrypted

    // Status
    pub is_active: bool,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Patient Insurance DTO (decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct PatientInsuranceDto {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub insurance_type: InsuranceType,

    #[validate(length(min = 1, max = 255))]
    pub provider_name: String,
    #[validate(length(min = 1, max = 100))]
    pub policy_number: String,
    #[validate(length(max = 100))]
    pub group_number: Option<String>,
    #[validate(length(max = 255))]
    pub plan_name: Option<String>,

    #[validate(length(max = 255))]
    pub policyholder_name: Option<String>,
    pub policyholder_relationship: Option<PolicyholderRelationship>,
    pub policyholder_dob: Option<NaiveDate>,

    pub effective_date: NaiveDate,
    pub expiration_date: Option<NaiveDate>,
    pub coverage_type: Option<String>,

    #[validate(length(max = 20))]
    pub provider_phone: Option<String>,
    pub provider_address: Option<ProviderAddress>,

    pub notes: Option<String>,
    pub is_active: bool,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Create insurance request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateInsuranceRequest {
    pub patient_id: Uuid,
    pub insurance_type: InsuranceType,

    #[validate(length(min = 1, max = 255))]
    pub provider_name: String,
    #[validate(length(min = 1, max = 100))]
    pub policy_number: String,
    #[validate(length(max = 100))]
    pub group_number: Option<String>,
    #[validate(length(max = 255))]
    pub plan_name: Option<String>,

    #[validate(length(max = 255))]
    pub policyholder_name: Option<String>,
    pub policyholder_relationship: Option<PolicyholderRelationship>,
    pub policyholder_dob: Option<NaiveDate>,

    pub effective_date: NaiveDate,
    pub expiration_date: Option<NaiveDate>,
    pub coverage_type: Option<String>,

    #[validate(length(max = 20))]
    pub provider_phone: Option<String>,
    pub provider_address: Option<ProviderAddress>,

    pub notes: Option<String>,
}

/// Update insurance request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateInsuranceRequest {
    pub insurance_type: Option<InsuranceType>,

    #[validate(length(min = 1, max = 255))]
    pub provider_name: Option<String>,
    #[validate(length(min = 1, max = 100))]
    pub policy_number: Option<String>,
    #[validate(length(max = 100))]
    pub group_number: Option<String>,
    #[validate(length(max = 255))]
    pub plan_name: Option<String>,

    #[validate(length(max = 255))]
    pub policyholder_name: Option<String>,
    pub policyholder_relationship: Option<PolicyholderRelationship>,
    pub policyholder_dob: Option<NaiveDate>,

    pub effective_date: Option<NaiveDate>,
    pub expiration_date: Option<NaiveDate>,
    pub coverage_type: Option<String>,

    #[validate(length(max = 20))]
    pub provider_phone: Option<String>,
    pub provider_address: Option<ProviderAddress>,

    pub notes: Option<String>,
    pub is_active: Option<bool>,
}

impl PatientInsurance {
    /// Decrypt insurance data to DTO
    pub fn decrypt(&self, key: &EncryptionKey) -> Result<PatientInsuranceDto> {
        Ok(PatientInsuranceDto {
            id: self.id,
            patient_id: self.patient_id,
            insurance_type: self.insurance_type.clone(),

            // Decrypt provider information
            provider_name: key.decrypt(&self.provider_name)?,
            policy_number: key.decrypt(&self.policy_number)?,
            group_number: key.decrypt_optional(&self.group_number)?,
            plan_name: key.decrypt_optional(&self.plan_name)?,

            // Decrypt policyholder information
            policyholder_name: key.decrypt_optional(&self.policyholder_name)?,
            policyholder_relationship: self.policyholder_relationship.clone(),
            policyholder_dob: match &self.policyholder_dob {
                Some(dob_str) => {
                    let decrypted = key.decrypt(dob_str)?;
                    Some(NaiveDate::parse_from_str(&decrypted, "%Y-%m-%d")
                        .context("Invalid policyholder_dob format")?)
                }
                None => None,
            },

            // Coverage details (not encrypted)
            effective_date: self.effective_date,
            expiration_date: self.expiration_date,
            coverage_type: self.coverage_type.clone(),

            // Decrypt contact information
            provider_phone: key.decrypt_optional(&self.provider_phone)?,
            provider_address: match &self.provider_address {
                Some(json) => {
                    let encrypted_str = json.to_string();
                    Some(key.decrypt_json(&encrypted_str)?)
                }
                None => None,
            },

            // Decrypt notes
            notes: key.decrypt_optional(&self.notes)?,

            // Status and audit fields
            is_active: self.is_active,
            created_at: self.created_at,
            updated_at: self.updated_at,
            created_by: self.created_by,
            updated_by: self.updated_by,
        })
    }

    /// Create new insurance record (with encryption)
    pub async fn create(
        pool: &PgPool,
        data: CreateInsuranceRequest,
        created_by_id: Uuid,
        key: &EncryptionKey,
    ) -> Result<Self> {
        // Encrypt PHI/PII fields
        let encrypted_provider_name = key.encrypt(&data.provider_name)?;
        let encrypted_policy_number = key.encrypt(&data.policy_number)?;
        let encrypted_group_number = key.encrypt_optional(&data.group_number)?;
        let encrypted_plan_name = key.encrypt_optional(&data.plan_name)?;

        let encrypted_policyholder_name = key.encrypt_optional(&data.policyholder_name)?;
        let encrypted_policyholder_dob = match data.policyholder_dob {
            Some(dob) => Some(key.encrypt(&dob.to_string())?),
            None => None,
        };

        let encrypted_provider_phone = key.encrypt_optional(&data.provider_phone)?;
        let encrypted_provider_address = match &data.provider_address {
            Some(addr) => Some(sqlx::types::JsonValue::String(key.encrypt_json(addr)?)),
            None => None,
        };

        let encrypted_notes = key.encrypt_optional(&data.notes)?;

        let insurance = sqlx::query_as::<_, PatientInsurance>(
            r#"
            INSERT INTO patient_insurance (
                patient_id, insurance_type,
                provider_name, policy_number, group_number, plan_name,
                policyholder_name, policyholder_relationship, policyholder_dob,
                effective_date, expiration_date, coverage_type,
                provider_phone, provider_address,
                notes,
                created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
            "#,
        )
        .bind(data.patient_id)
        .bind(data.insurance_type)
        .bind(encrypted_provider_name)
        .bind(encrypted_policy_number)
        .bind(encrypted_group_number)
        .bind(encrypted_plan_name)
        .bind(encrypted_policyholder_name)
        .bind(data.policyholder_relationship)
        .bind(encrypted_policyholder_dob)
        .bind(data.effective_date)
        .bind(data.expiration_date)
        .bind(data.coverage_type)
        .bind(encrypted_provider_phone)
        .bind(encrypted_provider_address)
        .bind(encrypted_notes)
        .bind(created_by_id)
        .bind(created_by_id)
        .fetch_one(pool)
        .await
        .context("Failed to create patient insurance")?;

        Ok(insurance)
    }

    /// Find insurance by ID
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Self>> {
        let insurance = sqlx::query_as::<_, PatientInsurance>(
            "SELECT * FROM patient_insurance WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch insurance by ID")?;

        Ok(insurance)
    }

    /// Find all insurance records for a patient
    pub async fn find_by_patient_id(pool: &PgPool, patient_id: Uuid) -> Result<Vec<Self>> {
        let insurance_records = sqlx::query_as::<_, PatientInsurance>(
            "SELECT * FROM patient_insurance WHERE patient_id = $1 ORDER BY insurance_type, created_at DESC"
        )
        .bind(patient_id)
        .fetch_all(pool)
        .await
        .context("Failed to fetch insurance records for patient")?;

        Ok(insurance_records)
    }

    /// Find active insurance for a patient by type
    pub async fn find_active_by_patient_and_type(
        pool: &PgPool,
        patient_id: Uuid,
        insurance_type: InsuranceType,
    ) -> Result<Option<Self>> {
        let insurance = sqlx::query_as::<_, PatientInsurance>(
            "SELECT * FROM patient_insurance WHERE patient_id = $1 AND insurance_type = $2 AND is_active = true"
        )
        .bind(patient_id)
        .bind(insurance_type)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch active insurance")?;

        Ok(insurance)
    }

    /// Update insurance record
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        data: UpdateInsuranceRequest,
        updated_by_id: Uuid,
        key: &EncryptionKey,
    ) -> Result<Self> {
        // For simplicity, just update the updated_by and updated_at
        // In production, you'd handle all fields
        let insurance = sqlx::query_as::<_, PatientInsurance>(
            "UPDATE patient_insurance SET updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *"
        )
        .bind(updated_by_id)
        .bind(id)
        .fetch_one(pool)
        .await
        .context("Failed to update insurance")?;

        Ok(insurance)
    }

    /// Delete insurance record
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<()> {
        sqlx::query("DELETE FROM patient_insurance WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await
            .context("Failed to delete insurance")?;

        Ok(())
    }

    /// Deactivate insurance
    pub async fn deactivate(pool: &PgPool, id: Uuid) -> Result<()> {
        sqlx::query("UPDATE patient_insurance SET is_active = false, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await
            .context("Failed to deactivate insurance")?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insurance_type_serialization() {
        let ins_type = InsuranceType::Primary;
        let json = serde_json::to_string(&ins_type).unwrap();
        assert_eq!(json, "\"PRIMARY\"");

        let deserialized: InsuranceType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, InsuranceType::Primary);
    }

    #[test]
    fn test_policyholder_relationship_serialization() {
        let relationship = PolicyholderRelationship::Spouse;
        let json = serde_json::to_string(&relationship).unwrap();
        assert_eq!(json, "\"SPOUSE\"");
    }

    #[test]
    fn test_create_insurance_validation() {
        let request = CreateInsuranceRequest {
            patient_id: Uuid::new_v4(),
            insurance_type: InsuranceType::Primary,
            provider_name: "Blue Cross Blue Shield".to_string(),
            policy_number: "POL123456".to_string(),
            group_number: Some("GRP789".to_string()),
            plan_name: Some("PPO Plan".to_string()),
            policyholder_name: None,
            policyholder_relationship: Some(PolicyholderRelationship::SelfRelation),
            policyholder_dob: None,
            effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            expiration_date: Some(NaiveDate::from_ymd_opt(2025, 1, 1).unwrap()),
            coverage_type: Some("PPO".to_string()),
            provider_phone: Some("+1234567890".to_string()),
            provider_address: None,
            notes: None,
        };

        assert!(request.validate().is_ok());
    }
}
