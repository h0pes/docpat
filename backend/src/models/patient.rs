// Patient model with comprehensive medical and demographic information
// All PHI/PII fields are encrypted using AES-256-GCM before database storage

use crate::utils::{encryption::EncryptionKey, FiscalCodeValidator, PhoneValidator};
use anyhow::{Context, Result};
use chrono::{NaiveDate, DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, FromRow};
use uuid::Uuid;
use validator::Validate;

/// Patient status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PatientStatus {
    Active,
    Inactive,
    Deceased,
}

/// Gender enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
pub enum Gender {
    M,
    F,
    #[sqlx(rename = "OTHER")]
    Other,
    #[sqlx(rename = "UNKNOWN")]
    Unknown,
}

/// Preferred contact method
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ContactMethod {
    Phone,
    Email,
    Sms,
    Whatsapp,
}

/// Address structure (stored as encrypted JSONB)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct Address {
    pub street: String,
    pub city: String,
    pub state: String,
    pub zip: String,
    pub country: String,
}

/// Emergency contact structure (stored as encrypted JSONB)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct EmergencyContact {
    pub name: String,
    pub relationship: String,
    pub phone: String,
}

/// Medication structure (stored as encrypted JSONB array)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Medication {
    pub name: String,
    pub dosage: String,
    pub frequency: String,
    pub start_date: Option<NaiveDate>,
}

/// Patient model - database representation with ENCRYPTED fields
/// Fields are stored encrypted in database
#[derive(Debug, Clone, FromRow)]
pub struct Patient {
    pub id: Uuid,
    pub medical_record_number: String,

    // Demographics (encrypted in database)
    pub first_name: String,         // 🔒 Encrypted
    pub last_name: String,          // 🔒 Encrypted
    pub middle_name: Option<String>, // 🔒 Encrypted
    pub date_of_birth: String,      // 🔒 Encrypted (stored as string in DB)
    pub gender: Gender,
    pub fiscal_code: Option<String>, // 🔒 Encrypted

    // Contact Information (encrypted in database)
    pub phone_primary: Option<String>,   // 🔒 Encrypted
    pub phone_secondary: Option<String>, // 🔒 Encrypted
    pub email: Option<String>,           // 🔒 Encrypted
    pub preferred_contact_method: ContactMethod,

    // Address and Emergency Contact (encrypted JSONB)
    pub address: Option<sqlx::types::JsonValue>,           // 🔒 Encrypted
    pub emergency_contact: Option<sqlx::types::JsonValue>, // 🔒 Encrypted

    // Medical Information (encrypted)
    pub blood_type: Option<String>,
    pub allergies: Option<Vec<String>>,          // 🔒 Encrypted
    pub chronic_conditions: Option<Vec<String>>, // 🔒 Encrypted
    pub current_medications: Option<sqlx::types::JsonValue>, // 🔒 Encrypted

    // Health Card & Photo
    pub health_card_expire: Option<NaiveDate>,
    pub photo_url: Option<String>,

    // Status
    pub status: PatientStatus,
    pub deceased_date: Option<NaiveDate>,

    // Notes
    pub notes: Option<String>, // 🔒 Encrypted

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Patient DTO for API (decrypted data)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct PatientDto {
    pub id: Uuid,
    pub medical_record_number: String,

    // Demographics (decrypted)
    #[validate(length(min = 1, max = 100))]
    pub first_name: String,
    #[validate(length(min = 1, max = 100))]
    pub last_name: String,
    #[validate(length(max = 100))]
    pub middle_name: Option<String>,
    pub date_of_birth: NaiveDate,
    pub gender: Gender,
    #[validate(length(equal = 16))]
    pub fiscal_code: Option<String>, // Italian tax code (16 chars)

    // Contact Information
    #[validate(length(max = 20))]
    pub phone_primary: Option<String>,
    #[validate(length(max = 20))]
    pub phone_secondary: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub preferred_contact_method: ContactMethod,

    // Address and Emergency Contact
    pub address: Option<Address>,
    pub emergency_contact: Option<EmergencyContact>,

    // Medical Information
    pub blood_type: Option<String>,
    pub allergies: Option<Vec<String>>,
    pub chronic_conditions: Option<Vec<String>>,
    pub current_medications: Option<Vec<Medication>>,

    // Health Card & Photo
    pub health_card_expire: Option<NaiveDate>,
    pub photo_url: Option<String>,

    // Status
    pub status: PatientStatus,
    pub deceased_date: Option<NaiveDate>,

    // Notes
    pub notes: Option<String>,

    // Audit fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Validate fiscal code format
fn validate_fiscal_code(fiscal_code: &str) -> Result<(), validator::ValidationError> {
    if !FiscalCodeValidator::validate(fiscal_code) {
        return Err(validator::ValidationError::new("invalid_fiscal_code"));
    }
    Ok(())
}

/// Validate phone number format
fn validate_phone(phone: &str) -> Result<(), validator::ValidationError> {
    if !PhoneValidator::validate(phone) {
        return Err(validator::ValidationError::new("invalid_phone"));
    }
    Ok(())
}

/// Validate blood type
fn validate_blood_type(blood_type: &str) -> Result<(), validator::ValidationError> {
    const VALID_BLOOD_TYPES: &[&str] = &[
        "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"
    ];

    if !VALID_BLOOD_TYPES.contains(&blood_type) {
        return Err(validator::ValidationError::new("invalid_blood_type"));
    }
    Ok(())
}

/// Validate URL format (for photo_url)
fn validate_url(url: &str) -> Result<(), validator::ValidationError> {
    // Basic URL validation - must start with http:// or https://
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(validator::ValidationError::new("invalid_url"));
    }

    // Check for valid URL structure
    if !url.contains("://") || url.len() < 12 {
        return Err(validator::ValidationError::new("invalid_url"));
    }

    Ok(())
}

/// Create patient request (for new patient registration)
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreatePatientRequest {
    #[validate(length(min = 1, max = 100))]
    pub first_name: String,
    #[validate(length(min = 1, max = 100))]
    pub last_name: String,
    #[validate(length(max = 100))]
    pub middle_name: Option<String>,
    pub date_of_birth: NaiveDate,
    pub gender: Gender,
    #[validate(length(equal = 16), custom(function = "validate_fiscal_code"))]
    pub fiscal_code: Option<String>,

    #[validate(custom(function = "validate_phone"))]
    pub phone_primary: Option<String>,
    #[validate(custom(function = "validate_phone"))]
    pub phone_secondary: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub preferred_contact_method: Option<ContactMethod>,

    pub address: Option<Address>,
    pub emergency_contact: Option<EmergencyContact>,

    #[validate(custom(function = "validate_blood_type"))]
    pub blood_type: Option<String>,
    pub allergies: Option<Vec<String>>,
    pub chronic_conditions: Option<Vec<String>>,
    pub current_medications: Option<Vec<Medication>>,

    pub health_card_expire: Option<NaiveDate>,
    #[validate(custom(function = "validate_url"))]
    pub photo_url: Option<String>,

    #[validate(length(max = 5000))]
    pub notes: Option<String>,
}

/// Update patient request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdatePatientRequest {
    #[validate(length(min = 1, max = 100))]
    pub first_name: Option<String>,
    #[validate(length(min = 1, max = 100))]
    pub last_name: Option<String>,
    #[validate(length(max = 100))]
    pub middle_name: Option<String>,
    pub date_of_birth: Option<NaiveDate>,
    pub gender: Option<Gender>,
    #[validate(length(equal = 16), custom(function = "validate_fiscal_code"))]
    pub fiscal_code: Option<String>,

    #[validate(custom(function = "validate_phone"))]
    pub phone_primary: Option<String>,
    #[validate(custom(function = "validate_phone"))]
    pub phone_secondary: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub preferred_contact_method: Option<ContactMethod>,

    pub address: Option<Address>,
    pub emergency_contact: Option<EmergencyContact>,

    #[validate(custom(function = "validate_blood_type"))]
    pub blood_type: Option<String>,
    pub allergies: Option<Vec<String>>,
    pub chronic_conditions: Option<Vec<String>>,
    pub current_medications: Option<Vec<Medication>>,

    pub health_card_expire: Option<NaiveDate>,
    #[validate(custom(function = "validate_url"))]
    pub photo_url: Option<String>,

    pub status: Option<PatientStatus>,
    pub deceased_date: Option<NaiveDate>,

    #[validate(length(max = 5000))]
    pub notes: Option<String>,
}

/// Patient search filters
#[derive(Debug, Clone, Deserialize)]
pub struct PatientSearchFilter {
    pub query: Option<String>,              // Full-text search query
    pub status: Option<PatientStatus>,
    pub gender: Option<Gender>,
    pub min_age: Option<u32>,
    pub max_age: Option<u32>,
    pub has_allergies: Option<bool>,
    pub has_chronic_conditions: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

impl Patient {
    /// Decrypt patient data to DTO
    pub fn decrypt(&self, key: &EncryptionKey) -> Result<PatientDto> {
        Ok(PatientDto {
            id: self.id,
            medical_record_number: self.medical_record_number.clone(),

            // Decrypt demographics
            first_name: key.decrypt(&self.first_name)?,
            last_name: key.decrypt(&self.last_name)?,
            middle_name: key.decrypt_optional(&self.middle_name)?,
            date_of_birth: {
                let dob_str = key.decrypt(&self.date_of_birth)?;
                NaiveDate::parse_from_str(&dob_str, "%Y-%m-%d")
                    .context("Invalid date_of_birth format")?
            },
            gender: self.gender.clone(),
            fiscal_code: key.decrypt_optional(&self.fiscal_code)?,

            // Decrypt contact information
            phone_primary: key.decrypt_optional(&self.phone_primary)?,
            phone_secondary: key.decrypt_optional(&self.phone_secondary)?,
            email: key.decrypt_optional(&self.email)?,
            preferred_contact_method: self.preferred_contact_method.clone(),

            // Decrypt address
            address: match &self.address {
                Some(json) => {
                    let encrypted_str = match json {
                        sqlx::types::JsonValue::String(s) => s.as_str(),
                        _ => json.as_str().unwrap_or(""),
                    };
                    Some(key.decrypt_json(encrypted_str)?)
                }
                None => None,
            },

            // Decrypt emergency contact
            emergency_contact: match &self.emergency_contact {
                Some(json) => {
                    let encrypted_str = match json {
                        sqlx::types::JsonValue::String(s) => s.as_str(),
                        _ => json.as_str().unwrap_or(""),
                    };
                    Some(key.decrypt_json(encrypted_str)?)
                }
                None => None,
            },

            // Decrypt medical information
            blood_type: self.blood_type.clone(),
            allergies: match &self.allergies {
                Some(enc_allergies) => Some(key.decrypt_array(enc_allergies)?),
                None => None,
            },
            chronic_conditions: match &self.chronic_conditions {
                Some(enc_conditions) => Some(key.decrypt_array(enc_conditions)?),
                None => None,
            },
            current_medications: match &self.current_medications {
                Some(json) => {
                    let encrypted_str = match json {
                        sqlx::types::JsonValue::String(s) => s.as_str(),
                        _ => json.as_str().unwrap_or(""),
                    };
                    Some(key.decrypt_json(encrypted_str)?)
                }
                None => None,
            },

            // Decrypt notes
            notes: key.decrypt_optional(&self.notes)?,

            // Copy non-encrypted fields
            health_card_expire: self.health_card_expire,
            photo_url: self.photo_url.clone(),
            status: self.status.clone(),
            deceased_date: self.deceased_date,
            created_at: self.created_at,
            updated_at: self.updated_at,
            created_by: self.created_by,
            updated_by: self.updated_by,
        })
    }

    /// Create new patient in database (with encryption)
    pub async fn create<'e, E>(
        executor: E,
        data: CreatePatientRequest,
        created_by_id: Uuid,
        key: &EncryptionKey,
    ) -> Result<Self>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        // Encrypt PHI/PII fields
        let encrypted_first_name = key.encrypt(&data.first_name)?;
        let encrypted_last_name = key.encrypt(&data.last_name)?;
        let encrypted_middle_name = key.encrypt_optional(&data.middle_name)?;
        let encrypted_dob = key.encrypt(&data.date_of_birth.to_string())?;
        let encrypted_fiscal_code = key.encrypt_optional(&data.fiscal_code)?;

        let encrypted_phone_primary = key.encrypt_optional(&data.phone_primary)?;
        let encrypted_phone_secondary = key.encrypt_optional(&data.phone_secondary)?;
        let encrypted_email = key.encrypt_optional(&data.email)?;

        let encrypted_address = match &data.address {
            Some(addr) => Some(sqlx::types::JsonValue::String(key.encrypt_json(addr)?)),
            None => None,
        };

        let encrypted_emergency_contact = match &data.emergency_contact {
            Some(ec) => Some(sqlx::types::JsonValue::String(key.encrypt_json(ec)?)),
            None => None,
        };

        let encrypted_allergies = match &data.allergies {
            Some(allergies) => Some(key.encrypt_array(allergies)?),
            None => None,
        };

        let encrypted_chronic_conditions = match &data.chronic_conditions {
            Some(conditions) => Some(key.encrypt_array(conditions)?),
            None => None,
        };

        let encrypted_current_medications = match &data.current_medications {
            Some(meds) => Some(sqlx::types::JsonValue::String(key.encrypt_json(meds)?)),
            None => None,
        };

        let encrypted_notes = key.encrypt_optional(&data.notes)?;

        let patient = sqlx::query_as::<_, Patient>(
            r#"
            INSERT INTO patients (
                first_name, last_name, middle_name, date_of_birth, gender, fiscal_code,
                phone_primary, phone_secondary, email, preferred_contact_method,
                address, emergency_contact,
                blood_type, allergies, chronic_conditions, current_medications,
                health_card_expire, photo_url,
                notes,
                created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
            "#,
        )
        .bind(encrypted_first_name)
        .bind(encrypted_last_name)
        .bind(encrypted_middle_name)
        .bind(encrypted_dob)
        .bind(data.gender)
        .bind(encrypted_fiscal_code)
        .bind(encrypted_phone_primary)
        .bind(encrypted_phone_secondary)
        .bind(encrypted_email)
        .bind(data.preferred_contact_method.unwrap_or(ContactMethod::Phone))
        .bind(encrypted_address)
        .bind(encrypted_emergency_contact)
        .bind(data.blood_type)
        .bind(encrypted_allergies)
        .bind(encrypted_chronic_conditions)
        .bind(encrypted_current_medications)
        .bind(data.health_card_expire)
        .bind(data.photo_url)
        .bind(encrypted_notes)
        .bind(created_by_id)
        .bind(created_by_id)
        .fetch_one(executor)
        .await
        .context("Failed to create patient")?;

        Ok(patient)
    }

    /// Find patient by ID
    pub async fn find_by_id<'e, E>(executor: E, id: Uuid) -> Result<Option<Self>>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let patient = sqlx::query_as::<_, Patient>(
            "SELECT * FROM patients WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(executor)
        .await
        .context("Failed to fetch patient by ID")?;

        Ok(patient)
    }

    /// Find patient by medical record number
    pub async fn find_by_mrn<'e, E>(executor: E, mrn: &str) -> Result<Option<Self>>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let patient = sqlx::query_as::<_, Patient>(
            "SELECT * FROM patients WHERE medical_record_number = $1"
        )
        .bind(mrn)
        .fetch_optional(executor)
        .await
        .context("Failed to fetch patient by MRN")?;

        Ok(patient)
    }

    /// Update patient with existing patient data
    pub async fn update_with_existing<'e, E>(
        executor: E,
        id: Uuid,
        existing: Patient,
        data: UpdatePatientRequest,
        updated_by_id: Uuid,
        key: &EncryptionKey,
    ) -> Result<Self>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {

        // Apply updates to existing patient (only update provided fields)
        let updated_first_name = if let Some(ref fn_val) = data.first_name {
            key.encrypt(fn_val)?
        } else {
            existing.first_name
        };

        let updated_last_name = if let Some(ref ln_val) = data.last_name {
            key.encrypt(ln_val)?
        } else {
            existing.last_name
        };

        let updated_middle_name = if data.middle_name.is_some() {
            key.encrypt_optional(&data.middle_name)?
        } else {
            existing.middle_name
        };

        let updated_date_of_birth = if let Some(ref dob) = data.date_of_birth {
            key.encrypt(&dob.to_string())?
        } else {
            existing.date_of_birth
        };

        let updated_fiscal_code = if data.fiscal_code.is_some() {
            key.encrypt_optional(&data.fiscal_code)?
        } else {
            existing.fiscal_code
        };

        let updated_phone_primary = if data.phone_primary.is_some() {
            key.encrypt_optional(&data.phone_primary)?
        } else {
            existing.phone_primary
        };

        let updated_phone_secondary = if data.phone_secondary.is_some() {
            key.encrypt_optional(&data.phone_secondary)?
        } else {
            existing.phone_secondary
        };

        let updated_email = if data.email.is_some() {
            key.encrypt_optional(&data.email)?
        } else {
            existing.email
        };

        let updated_notes = if data.notes.is_some() {
            key.encrypt_optional(&data.notes)?
        } else {
            existing.notes
        };

        let updated_gender = data.gender.unwrap_or(existing.gender);
        let updated_preferred_contact = data.preferred_contact_method.or(Some(existing.preferred_contact_method));
        let updated_blood_type = data.blood_type.or(existing.blood_type);
        let updated_health_card_expire = data.health_card_expire.or(existing.health_card_expire);
        let updated_photo_url = data.photo_url.or(existing.photo_url);

        // Encrypt complex fields if provided
        let updated_address = if let Some(ref addr) = data.address {
            Some(sqlx::types::JsonValue::String(key.encrypt_json(addr)?))
        } else {
            existing.address
        };

        let updated_emergency_contact = if let Some(ref ec) = data.emergency_contact {
            Some(sqlx::types::JsonValue::String(key.encrypt_json(ec)?))
        } else {
            existing.emergency_contact
        };

        let updated_allergies = if let Some(ref allergies) = data.allergies {
            Some(key.encrypt_array(allergies)?)
        } else {
            existing.allergies
        };

        let updated_chronic_conditions = if let Some(ref conditions) = data.chronic_conditions {
            Some(key.encrypt_array(conditions)?)
        } else {
            existing.chronic_conditions
        };

        let updated_current_medications = if let Some(ref meds) = data.current_medications {
            Some(sqlx::types::JsonValue::String(key.encrypt_json(meds)?))
        } else {
            existing.current_medications
        };

        // Execute update query with all fields
        let patient = sqlx::query_as::<_, Patient>(
            r#"
            UPDATE patients SET
                first_name = $1, last_name = $2, middle_name = $3,
                date_of_birth = $4, gender = $5, fiscal_code = $6,
                phone_primary = $7, phone_secondary = $8, email = $9,
                preferred_contact_method = $10, address = $11, emergency_contact = $12,
                blood_type = $13, allergies = $14, chronic_conditions = $15,
                current_medications = $16, health_card_expire = $17, photo_url = $18,
                notes = $19, updated_by = $20, updated_at = NOW()
            WHERE id = $21
            RETURNING *
            "#,
        )
        .bind(updated_first_name)
        .bind(updated_last_name)
        .bind(updated_middle_name)
        .bind(updated_date_of_birth)
        .bind(updated_gender)
        .bind(updated_fiscal_code)
        .bind(updated_phone_primary)
        .bind(updated_phone_secondary)
        .bind(updated_email)
        .bind(updated_preferred_contact)
        .bind(updated_address)
        .bind(updated_emergency_contact)
        .bind(updated_blood_type)
        .bind(updated_allergies)
        .bind(updated_chronic_conditions)
        .bind(updated_current_medications)
        .bind(updated_health_card_expire)
        .bind(updated_photo_url)
        .bind(updated_notes)
        .bind(updated_by_id)
        .bind(id)
        .fetch_one(executor)
        .await
        .context("Failed to update patient")?;

        Ok(patient)
    }

    /// Delete patient (soft delete by setting status to INACTIVE)
    pub async fn soft_delete<'e, E>(executor: E, id: Uuid) -> Result<()>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        sqlx::query("UPDATE patients SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(executor)
            .await
            .context("Failed to soft delete patient")?;

        Ok(())
    }

    /// List patients with pagination
    pub async fn list<'e, E>(
        executor: E,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Self>>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let patients = sqlx::query_as::<_, Patient>(
            "SELECT * FROM patients ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(executor)
        .await
        .context("Failed to list patients")?;

        Ok(patients)
    }

    /// Count total patients
    pub async fn count<'e, E>(executor: E) -> Result<i64>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM patients"
        )
        .fetch_one(executor)
        .await
        .context("Failed to count patients")?;

        Ok(count.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_patient_status_serialization() {
        let status = PatientStatus::Active;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"ACTIVE\"");

        let deserialized: PatientStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, PatientStatus::Active);
    }

    #[test]
    fn test_contact_method_serialization() {
        let method = ContactMethod::Email;
        let json = serde_json::to_string(&method).unwrap();
        assert_eq!(json, "\"EMAIL\"");
    }

    #[test]
    fn test_create_patient_validation() {
        let request = CreatePatientRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            middle_name: None,
            date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
            gender: Gender::M,
            fiscal_code: None,
            phone_primary: Some("+1234567890".to_string()),
            phone_secondary: None,
            email: Some("john.doe@example.com".to_string()),
            preferred_contact_method: Some(ContactMethod::Email),
            address: None,
            emergency_contact: None,
            blood_type: Some("A+".to_string()),
            allergies: None,
            chronic_conditions: None,
            current_medications: None,
            health_card_expire: None,
            photo_url: None,
            notes: None,
        };

        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_validate_blood_type() {
        // Valid blood types
        assert!(validate_blood_type("A+").is_ok());
        assert!(validate_blood_type("A-").is_ok());
        assert!(validate_blood_type("B+").is_ok());
        assert!(validate_blood_type("B-").is_ok());
        assert!(validate_blood_type("AB+").is_ok());
        assert!(validate_blood_type("AB-").is_ok());
        assert!(validate_blood_type("O+").is_ok());
        assert!(validate_blood_type("O-").is_ok());
        assert!(validate_blood_type("UNKNOWN").is_ok());

        // Invalid blood types
        assert!(validate_blood_type("C+").is_err());
        assert!(validate_blood_type("A").is_err());
        assert!(validate_blood_type("a+").is_err()); // lowercase
        assert!(validate_blood_type("").is_err());
        assert!(validate_blood_type("XYZ").is_err());
    }

    #[test]
    fn test_validate_url() {
        // Valid URLs
        assert!(validate_url("https://example.com/photo.jpg").is_ok());
        assert!(validate_url("http://example.com/photo.jpg").is_ok());
        assert!(validate_url("https://cdn.example.com/users/photos/123.png").is_ok());

        // Invalid URLs
        assert!(validate_url("ftp://example.com/photo.jpg").is_err()); // Wrong protocol
        assert!(validate_url("example.com/photo.jpg").is_err()); // Missing protocol
        assert!(validate_url("//example.com/photo.jpg").is_err()); // Missing http/https
        assert!(validate_url("https://").is_err()); // Too short
        assert!(validate_url("").is_err()); // Empty
    }

    #[test]
    fn test_create_patient_validation_blood_type() {
        // Valid blood type
        let mut request = CreatePatientRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            middle_name: None,
            date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
            gender: Gender::M,
            fiscal_code: None,
            phone_primary: None,
            phone_secondary: None,
            email: Some("john@example.com".to_string()),
            preferred_contact_method: Some(ContactMethod::Email),
            address: None,
            emergency_contact: None,
            blood_type: Some("A+".to_string()),
            allergies: None,
            chronic_conditions: None,
            current_medications: None,
            health_card_expire: None,
            photo_url: None,
            notes: None,
        };
        assert!(request.validate().is_ok());

        // Invalid blood type
        request.blood_type = Some("C+".to_string());
        assert!(request.validate().is_err());
    }

    #[test]
    fn test_create_patient_validation_photo_url() {
        let mut request = CreatePatientRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            middle_name: None,
            date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
            gender: Gender::M,
            fiscal_code: None,
            phone_primary: None,
            phone_secondary: None,
            email: Some("john@example.com".to_string()),
            preferred_contact_method: Some(ContactMethod::Email),
            address: None,
            emergency_contact: None,
            blood_type: None,
            allergies: None,
            chronic_conditions: None,
            current_medications: None,
            health_card_expire: None,
            photo_url: Some("https://example.com/photo.jpg".to_string()),
            notes: None,
        };
        assert!(request.validate().is_ok());

        // Invalid photo URL
        request.photo_url = Some("not-a-valid-url".to_string());
        assert!(request.validate().is_err());
    }

    #[test]
    fn test_create_patient_validation_notes_length() {
        let mut request = CreatePatientRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            middle_name: None,
            date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
            gender: Gender::M,
            fiscal_code: None,
            phone_primary: None,
            phone_secondary: None,
            email: Some("john@example.com".to_string()),
            preferred_contact_method: Some(ContactMethod::Email),
            address: None,
            emergency_contact: None,
            blood_type: None,
            allergies: None,
            chronic_conditions: None,
            current_medications: None,
            health_card_expire: None,
            photo_url: None,
            notes: Some("Valid notes within 5000 chars".to_string()),
        };
        assert!(request.validate().is_ok());

        // Notes too long (>5000 chars)
        request.notes = Some("x".repeat(5001));
        assert!(request.validate().is_err());
    }
}
