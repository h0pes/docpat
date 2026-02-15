/*!
 * Drug Interaction Service
 *
 * Provides drug-drug interaction checking functionality using data from DDInter 2.0.
 * Interactions are matched using ATC codes and fuzzy drug name matching.
 *
 * Key features:
 * - ATC code matching for precise identification
 * - Fuzzy name matching for cross-language drug name differences (IT/EN)
 * - Encryption support for HIPAA-compliant prescription data
 */

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use strsim::normalized_damerau_levenshtein;
use uuid::Uuid;

use crate::utils::encryption::EncryptionKey;

/// Severity levels for drug interactions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InteractionSeverity {
    /// Avoid use completely
    Contraindicated,
    /// Serious interaction requiring clinical intervention
    Major,
    /// Caution advised, may require monitoring
    Moderate,
    /// Low risk but may be clinically relevant
    Minor,
    /// Severity not determined
    Unknown,
}

impl From<&str> for InteractionSeverity {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "contraindicated" => InteractionSeverity::Contraindicated,
            "major" => InteractionSeverity::Major,
            "moderate" => InteractionSeverity::Moderate,
            "minor" => InteractionSeverity::Minor,
            _ => InteractionSeverity::Unknown,
        }
    }
}

impl InteractionSeverity {
    /// Get display name for the severity level
    pub fn display_name(&self) -> &'static str {
        match self {
            InteractionSeverity::Contraindicated => "Contraindicated",
            InteractionSeverity::Major => "Major",
            InteractionSeverity::Moderate => "Moderate",
            InteractionSeverity::Minor => "Minor",
            InteractionSeverity::Unknown => "Unknown",
        }
    }

    /// Get severity priority (higher = more severe)
    pub fn priority(&self) -> u8 {
        match self {
            InteractionSeverity::Contraindicated => 5,
            InteractionSeverity::Major => 4,
            InteractionSeverity::Moderate => 3,
            InteractionSeverity::Minor => 2,
            InteractionSeverity::Unknown => 1,
        }
    }
}

/// A single drug interaction warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugInteraction {
    /// ID of the interaction record
    pub id: Uuid,
    /// ATC code of the first drug
    pub drug_a_atc_code: String,
    /// Name of the first drug
    pub drug_a_name: Option<String>,
    /// ATC code of the second drug
    pub drug_b_atc_code: String,
    /// Name of the second drug
    pub drug_b_name: Option<String>,
    /// Severity level
    pub severity: InteractionSeverity,
    /// Clinical effect description (if available)
    pub effect: Option<String>,
    /// Mechanism of interaction (if available)
    pub mechanism: Option<String>,
    /// Management recommendations (if available)
    pub management: Option<String>,
    /// Data source (e.g., "DDINTER")
    pub source: String,
}

/// Drug interaction check request
#[derive(Debug, Clone, Deserialize)]
pub struct CheckInteractionsRequest {
    /// List of ATC codes to check for interactions
    pub atc_codes: Vec<String>,
    /// Minimum severity to include (optional)
    pub min_severity: Option<String>,
    /// Include interactions marked as inactive (default: false)
    #[serde(default)]
    pub include_inactive: bool,
}

/// Drug interaction check response
#[derive(Debug, Clone, Serialize)]
pub struct CheckInteractionsResponse {
    /// List of found interactions
    pub interactions: Vec<DrugInteraction>,
    /// Total number of interactions found
    pub total: i64,
    /// Number of major/contraindicated interactions
    pub major_count: i64,
    /// Number of moderate interactions
    pub moderate_count: i64,
    /// Number of minor interactions
    pub minor_count: i64,
    /// Highest severity found
    pub highest_severity: Option<InteractionSeverity>,
}

/// Request to check interactions when adding a new medication
#[derive(Debug, Clone, Deserialize)]
pub struct CheckNewMedicationRequest {
    /// ATC code of the new medication to add
    pub new_atc_code: String,
    /// ATC codes of existing medications the patient is taking
    pub existing_atc_codes: Vec<String>,
    /// Minimum severity to include (optional)
    pub min_severity: Option<String>,
}

/// Request to check interactions when adding a new medication for a patient
/// Uses medication name with fuzzy matching instead of ATC codes
#[derive(Debug, Clone, Deserialize)]
pub struct CheckNewMedicationForPatientRequest {
    /// Name of the new medication to add (from AIFA database)
    pub new_medication_name: String,
    /// Generic name of the new medication (optional, improves matching)
    pub new_generic_name: Option<String>,
    /// Patient ID to check existing prescriptions against
    pub patient_id: Uuid,
    /// Minimum severity to include (optional)
    pub min_severity: Option<String>,
}

/// Internal struct to hold decrypted patient medication info
struct PatientMedication {
    medication_name: String,
    generic_name: String,
    atc_code: Option<String>,
}

/// Drug Interaction Service
pub struct DrugInteractionService;

impl DrugInteractionService {
    /// Check for interactions between a list of medications (by ATC code)
    ///
    /// This checks all pairwise combinations of the provided ATC codes.
    pub async fn check_interactions(
        pool: &PgPool,
        request: &CheckInteractionsRequest,
    ) -> Result<CheckInteractionsResponse> {
        if request.atc_codes.is_empty() {
            return Ok(CheckInteractionsResponse {
                interactions: vec![],
                total: 0,
                major_count: 0,
                moderate_count: 0,
                minor_count: 0,
                highest_severity: None,
            });
        }

        // Build severity filter
        let severity_filter = request.min_severity.as_ref().map(|s| {
            let sev = InteractionSeverity::from(s.as_str());
            sev.priority()
        });

        // Query for interactions where both drugs are in the provided list
        // Drugs are stored alphabetically, so we need to check both orderings
        let interactions = sqlx::query_as!(
            DrugInteractionRow,
            r#"
            SELECT
                id,
                drug_a_atc_code,
                drug_a_name,
                drug_b_atc_code,
                drug_b_name,
                severity,
                effect,
                mechanism,
                management,
                source
            FROM drug_interactions
            WHERE is_active = true
              AND (
                (drug_a_atc_code = ANY($1) AND drug_b_atc_code = ANY($1))
              )
            ORDER BY
                CASE severity
                    WHEN 'contraindicated' THEN 1
                    WHEN 'major' THEN 2
                    WHEN 'moderate' THEN 3
                    WHEN 'minor' THEN 4
                    ELSE 5
                END,
                drug_a_name, drug_b_name
            "#,
            &request.atc_codes
        )
        .fetch_all(pool)
        .await
        .context("Failed to query drug interactions")?;

        // Convert to response type and apply severity filter
        let result_interactions: Vec<DrugInteraction> = interactions
            .into_iter()
            .map(|row| DrugInteraction {
                id: row.id,
                drug_a_atc_code: row.drug_a_atc_code,
                drug_a_name: row.drug_a_name,
                drug_b_atc_code: row.drug_b_atc_code,
                drug_b_name: row.drug_b_name,
                severity: InteractionSeverity::from(row.severity.as_str()),
                effect: row.effect,
                mechanism: row.mechanism,
                management: row.management,
                source: row.source,
            })
            .filter(|i| {
                if let Some(min_priority) = severity_filter {
                    i.severity.priority() >= min_priority
                } else {
                    true
                }
            })
            .collect();

        // Calculate statistics
        let total = result_interactions.len() as i64;
        let major_count = result_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Contraindicated | InteractionSeverity::Major))
            .count() as i64;
        let moderate_count = result_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Moderate))
            .count() as i64;
        let minor_count = result_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Minor))
            .count() as i64;

        let highest_severity = result_interactions
            .iter()
            .max_by_key(|i| i.severity.priority())
            .map(|i| i.severity);

        Ok(CheckInteractionsResponse {
            interactions: result_interactions,
            total,
            major_count,
            moderate_count,
            minor_count,
            highest_severity,
        })
    }

    /// Check interactions when adding a new medication to a patient's existing regimen
    ///
    /// This is optimized for the common use case of checking one new medication
    /// against a list of existing medications.
    pub async fn check_new_medication(
        pool: &PgPool,
        request: &CheckNewMedicationRequest,
    ) -> Result<CheckInteractionsResponse> {
        if request.existing_atc_codes.is_empty() {
            return Ok(CheckInteractionsResponse {
                interactions: vec![],
                total: 0,
                major_count: 0,
                moderate_count: 0,
                minor_count: 0,
                highest_severity: None,
            });
        }

        // Build severity filter
        let severity_filter = request.min_severity.as_ref().map(|s| {
            let sev = InteractionSeverity::from(s.as_str());
            sev.priority()
        });

        // Query for interactions between the new drug and any existing drug
        // Check both orderings since drugs are stored alphabetically
        let interactions = sqlx::query_as!(
            DrugInteractionRow,
            r#"
            SELECT
                id,
                drug_a_atc_code,
                drug_a_name,
                drug_b_atc_code,
                drug_b_name,
                severity,
                effect,
                mechanism,
                management,
                source
            FROM drug_interactions
            WHERE is_active = true
              AND (
                (drug_a_atc_code = $1 AND drug_b_atc_code = ANY($2))
                OR (drug_a_atc_code = ANY($2) AND drug_b_atc_code = $1)
              )
            ORDER BY
                CASE severity
                    WHEN 'contraindicated' THEN 1
                    WHEN 'major' THEN 2
                    WHEN 'moderate' THEN 3
                    WHEN 'minor' THEN 4
                    ELSE 5
                END,
                drug_a_name, drug_b_name
            "#,
            &request.new_atc_code,
            &request.existing_atc_codes
        )
        .fetch_all(pool)
        .await
        .context("Failed to query drug interactions")?;

        // Convert to response type and apply severity filter
        let result_interactions: Vec<DrugInteraction> = interactions
            .into_iter()
            .map(|row| DrugInteraction {
                id: row.id,
                drug_a_atc_code: row.drug_a_atc_code,
                drug_a_name: row.drug_a_name,
                drug_b_atc_code: row.drug_b_atc_code,
                drug_b_name: row.drug_b_name,
                severity: InteractionSeverity::from(row.severity.as_str()),
                effect: row.effect,
                mechanism: row.mechanism,
                management: row.management,
                source: row.source,
            })
            .filter(|i| {
                if let Some(min_priority) = severity_filter {
                    i.severity.priority() >= min_priority
                } else {
                    true
                }
            })
            .collect();

        // Calculate statistics
        let total = result_interactions.len() as i64;
        let major_count = result_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Contraindicated | InteractionSeverity::Major))
            .count() as i64;
        let moderate_count = result_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Moderate))
            .count() as i64;
        let minor_count = result_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Minor))
            .count() as i64;

        let highest_severity = result_interactions
            .iter()
            .max_by_key(|i| i.severity.priority())
            .map(|i| i.severity);

        Ok(CheckInteractionsResponse {
            interactions: result_interactions,
            total,
            major_count,
            moderate_count,
            minor_count,
            highest_severity,
        })
    }

    /// Get interactions for a patient based on their active prescriptions
    ///
    /// This looks up all active medications for a patient and checks for interactions
    /// using a hybrid approach:
    /// 1. ATC code matching (when codes align between AIFA and DDInter)
    /// 2. Drug name matching with fuzzy similarity (for cross-language matching)
    ///
    /// The fuzzy matching handles Italian-English drug name differences:
    /// - "Ibuprofene" (IT) → "Ibuprofen" (EN)
    /// - "Ketoprofene" (IT) → "Ketoprofen" (EN)
    /// - "Acido acetilsalicilico" (IT) → "Acetylsalicylic acid" (EN)
    ///
    /// # Arguments
    /// * `pool` - Database connection pool
    /// * `patient_id` - UUID of the patient
    /// * `min_severity` - Minimum severity filter (optional)
    /// * `encryption_key` - Encryption key for decrypting medication names (optional)
    /// * `user_id` - User ID for RLS context
    /// * `role` - User role for RLS context
    pub async fn check_patient_interactions(
        pool: &PgPool,
        patient_id: Uuid,
        min_severity: Option<String>,
        encryption_key: Option<&EncryptionKey>,
        user_id: Uuid,
        role: &str,
    ) -> Result<CheckInteractionsResponse> {
        // Build severity filter priority
        let severity_filter = min_severity.as_ref().map(|s| {
            let sev = InteractionSeverity::from(s.as_str());
            sev.priority()
        });

        // Start transaction for RLS context
        let mut tx = pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context using set_config() for parameterized queries
        sqlx::query("SELECT set_config('app.current_user_id', $1, true)")
            .bind(user_id.to_string())
            .execute(&mut *tx)
            .await?;
        sqlx::query("SELECT set_config('app.current_user_role', $1, true)")
            .bind(role)
            .execute(&mut *tx)
            .await?;

        // Step 1: Fetch patient's active prescriptions with encrypted data
        let prescriptions = sqlx::query!(
            r#"
            SELECT
                p.medication_name,
                p.generic_name,
                m.atc_code
            FROM prescriptions p
            LEFT JOIN medications m ON LOWER(m.name) = LOWER(p.medication_name)
                OR LOWER(m.generic_name) = LOWER(p.medication_name)
            WHERE p.patient_id = $1
              AND p.status = 'ACTIVE'
            "#,
            patient_id
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch patient prescriptions")?;

        // Commit the transaction (we only needed it for RLS context on SELECT)
        tx.commit().await?;

        // Step 2: Decrypt medication names if encryption key is provided
        let mut patient_meds: Vec<PatientMedication> = Vec::new();

        for p in prescriptions {
            let medication_name = if let Some(key) = encryption_key {
                // Decrypt medication name
                key.decrypt(&p.medication_name)
                    .unwrap_or_else(|_| p.medication_name.clone())
            } else {
                p.medication_name.clone()
            };

            let generic_name = match (&p.generic_name, encryption_key) {
                (Some(gn), Some(key)) => Some(key.decrypt(gn).unwrap_or_else(|_| gn.clone())),
                (Some(gn), None) => Some(gn.clone()),
                (None, _) => None,
            };

            patient_meds.push(PatientMedication {
                medication_name: medication_name.clone(),
                generic_name: generic_name.unwrap_or(medication_name),
                atc_code: p.atc_code,
            });
        }

        // If no medications found, return empty response
        if patient_meds.is_empty() {
            return Ok(CheckInteractionsResponse {
                interactions: vec![],
                total: 0,
                major_count: 0,
                moderate_count: 0,
                minor_count: 0,
                highest_severity: None,
            });
        }

        // Step 3: Fetch candidate drug interactions from DDInter
        // Pre-filter in SQL using the first 4 characters of drug names as prefixes
        // This dramatically reduces the result set from 170k to a few hundred/thousand
        let prefixes: Vec<String> = patient_meds
            .iter()
            .filter_map(|med| {
                let name = med.generic_name.to_lowercase();
                if name.len() >= 4 {
                    Some(format!("{}%", &name[..4]))
                } else if name.len() >= 2 {
                    Some(format!("{}%", &name))
                } else {
                    None
                }
            })
            .collect();

        // Also collect ATC codes for direct matching
        let atc_codes: Vec<String> = patient_meds
            .iter()
            .filter_map(|med| med.atc_code.clone())
            .collect();

        // Query with pre-filtering: match by ATC code OR drug name prefix
        let all_interactions = sqlx::query_as!(
            DrugInteractionRow,
            r#"
            SELECT
                id,
                drug_a_atc_code,
                drug_a_name,
                drug_b_atc_code,
                drug_b_name,
                severity,
                effect,
                mechanism,
                management,
                source
            FROM drug_interactions
            WHERE is_active = true
              AND (
                -- Match by ATC codes (if available)
                drug_a_atc_code = ANY($1) OR drug_b_atc_code = ANY($1)
                -- OR match by drug name prefixes (for fuzzy matching candidates)
                OR EXISTS (
                    SELECT 1 FROM unnest($2::text[]) AS prefix
                    WHERE LOWER(drug_a_name) LIKE prefix OR LOWER(drug_b_name) LIKE prefix
                )
              )
            "#,
            &atc_codes,
            &prefixes
        )
        .fetch_all(pool)
        .await
        .context("Failed to fetch drug interactions")?;

        // Step 4: Match interactions using fuzzy name matching in Rust
        // This handles the AIFA-DDInter ATC code mismatch by matching drug names
        let mut matched_interactions: Vec<DrugInteraction> = Vec::new();
        let mut seen_ids: std::collections::HashSet<Uuid> = std::collections::HashSet::new();

        for interaction in &all_interactions {
            // Check if both drugs in the interaction match patient's medications
            let drug_a_matches = patient_meds.iter().any(|med| {
                Self::drugs_match(
                    &med.generic_name,
                    med.atc_code.as_deref(),
                    interaction.drug_a_name.as_deref(),
                    &interaction.drug_a_atc_code,
                )
            });

            let drug_b_matches = patient_meds.iter().any(|med| {
                Self::drugs_match(
                    &med.generic_name,
                    med.atc_code.as_deref(),
                    interaction.drug_b_name.as_deref(),
                    &interaction.drug_b_atc_code,
                )
            });

            // Both drugs must match different medications in patient's list
            if drug_a_matches && drug_b_matches && !seen_ids.contains(&interaction.id) {
                // Verify they match different medications (not the same drug)
                let drug_a_med = patient_meds.iter().find(|med| {
                    Self::drugs_match(
                        &med.generic_name,
                        med.atc_code.as_deref(),
                        interaction.drug_a_name.as_deref(),
                        &interaction.drug_a_atc_code,
                    )
                });

                let drug_b_med = patient_meds.iter().find(|med| {
                    Self::drugs_match(
                        &med.generic_name,
                        med.atc_code.as_deref(),
                        interaction.drug_b_name.as_deref(),
                        &interaction.drug_b_atc_code,
                    )
                });

                // Only include if they're different medications
                if let (Some(med_a), Some(med_b)) = (drug_a_med, drug_b_med) {
                    if med_a.generic_name.to_lowercase() != med_b.generic_name.to_lowercase() {
                        let severity = InteractionSeverity::from(interaction.severity.as_str());

                        // Apply severity filter
                        if let Some(min_priority) = severity_filter {
                            if severity.priority() < min_priority {
                                continue;
                            }
                        }

                        seen_ids.insert(interaction.id);
                        matched_interactions.push(DrugInteraction {
                            id: interaction.id,
                            drug_a_atc_code: interaction.drug_a_atc_code.clone(),
                            drug_a_name: interaction.drug_a_name.clone(),
                            drug_b_atc_code: interaction.drug_b_atc_code.clone(),
                            drug_b_name: interaction.drug_b_name.clone(),
                            severity,
                            effect: interaction.effect.clone(),
                            mechanism: interaction.mechanism.clone(),
                            management: interaction.management.clone(),
                            source: interaction.source.clone(),
                        });
                    }
                }
            }
        }

        // Sort by severity (most severe first)
        matched_interactions.sort_by(|a, b| {
            b.severity.priority().cmp(&a.severity.priority())
        });

        // Calculate statistics
        let total = matched_interactions.len() as i64;
        let major_count = matched_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Contraindicated | InteractionSeverity::Major))
            .count() as i64;
        let moderate_count = matched_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Moderate))
            .count() as i64;
        let minor_count = matched_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Minor))
            .count() as i64;

        let highest_severity = matched_interactions
            .iter()
            .max_by_key(|i| i.severity.priority())
            .map(|i| i.severity);

        Ok(CheckInteractionsResponse {
            interactions: matched_interactions,
            total,
            major_count,
            moderate_count,
            minor_count,
            highest_severity,
        })
    }

    /// Check interactions when adding a NEW medication for a specific patient
    ///
    /// Unlike `check_patient_interactions` which finds all existing interactions,
    /// this method finds ONLY the NEW interactions that would be created by
    /// adding the new medication to the patient's current regimen.
    ///
    /// This is used in the prescription form confirmation dialog to show
    /// only the warnings relevant to the medication being added.
    ///
    /// # Arguments
    /// * `pool` - Database connection pool
    /// * `request` - Request containing new medication name and patient ID
    /// * `encryption_key` - Encryption key for decrypting existing prescriptions
    /// * `user_id` - User ID for RLS context
    /// * `role` - User role for RLS context
    pub async fn check_new_medication_for_patient(
        pool: &PgPool,
        request: &CheckNewMedicationForPatientRequest,
        encryption_key: Option<&EncryptionKey>,
        user_id: Uuid,
        role: &str,
    ) -> Result<CheckInteractionsResponse> {
        // Build severity filter priority
        let severity_filter = request.min_severity.as_ref().map(|s| {
            let sev = InteractionSeverity::from(s.as_str());
            sev.priority()
        });

        // Start transaction for RLS context
        let mut tx = pool.begin().await.context("Failed to begin transaction")?;

        // Set RLS context using set_config() for parameterized queries
        sqlx::query("SELECT set_config('app.current_user_id', $1, true)")
            .bind(user_id.to_string())
            .execute(&mut *tx)
            .await?;
        sqlx::query("SELECT set_config('app.current_user_role', $1, true)")
            .bind(role)
            .execute(&mut *tx)
            .await?;

        // Fetch patient's active prescriptions
        let prescriptions = sqlx::query!(
            r#"
            SELECT
                p.medication_name,
                p.generic_name,
                m.atc_code
            FROM prescriptions p
            LEFT JOIN medications m ON LOWER(m.name) = LOWER(p.medication_name)
                OR LOWER(m.generic_name) = LOWER(p.medication_name)
            WHERE p.patient_id = $1
              AND p.status = 'ACTIVE'
            "#,
            request.patient_id
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch patient prescriptions")?;

        tx.commit().await?;

        // Decrypt existing medication names
        let mut existing_meds: Vec<PatientMedication> = Vec::new();
        for p in prescriptions {
            let medication_name = if let Some(key) = encryption_key {
                key.decrypt(&p.medication_name)
                    .unwrap_or_else(|_| p.medication_name.clone())
            } else {
                p.medication_name.clone()
            };

            let generic_name = match (&p.generic_name, encryption_key) {
                (Some(gn), Some(key)) => Some(key.decrypt(gn).unwrap_or_else(|_| gn.clone())),
                (Some(gn), None) => Some(gn.clone()),
                (None, _) => None,
            };

            existing_meds.push(PatientMedication {
                medication_name: medication_name.clone(),
                generic_name: generic_name.unwrap_or(medication_name),
                atc_code: p.atc_code,
            });
        }

        // If no existing medications, no interactions possible
        if existing_meds.is_empty() {
            return Ok(CheckInteractionsResponse {
                interactions: vec![],
                total: 0,
                major_count: 0,
                moderate_count: 0,
                minor_count: 0,
                highest_severity: None,
            });
        }

        // Use generic name for matching (more reliable for interaction lookup)
        let new_drug_name = request
            .new_generic_name
            .as_ref()
            .unwrap_or(&request.new_medication_name);

        // Build prefix for SQL pre-filtering
        let new_drug_lower = new_drug_name.to_lowercase();
        let new_drug_prefix = if new_drug_lower.len() >= 4 {
            format!("{}%", &new_drug_lower[..4])
        } else if new_drug_lower.len() >= 2 {
            format!("{}%", &new_drug_lower)
        } else {
            format!("{}%", &new_drug_lower)
        };

        // Also get prefixes for existing medications
        let existing_prefixes: Vec<String> = existing_meds
            .iter()
            .filter_map(|med| {
                let name = med.generic_name.to_lowercase();
                if name.len() >= 4 {
                    Some(format!("{}%", &name[..4]))
                } else if name.len() >= 2 {
                    Some(format!("{}%", &name))
                } else {
                    None
                }
            })
            .collect();

        // Query interactions where the NEW drug interacts with EXISTING drugs
        // Pre-filter by name prefix for performance
        let candidate_interactions = sqlx::query_as!(
            DrugInteractionRow,
            r#"
            SELECT
                id,
                drug_a_atc_code,
                drug_a_name,
                drug_b_atc_code,
                drug_b_name,
                severity,
                effect,
                mechanism,
                management,
                source
            FROM drug_interactions
            WHERE is_active = true
              AND (
                -- New drug matches drug_a, existing matches drug_b
                (LOWER(drug_a_name) LIKE $1 AND EXISTS (
                    SELECT 1 FROM unnest($2::text[]) AS prefix
                    WHERE LOWER(drug_b_name) LIKE prefix
                ))
                -- Or new drug matches drug_b, existing matches drug_a
                OR (LOWER(drug_b_name) LIKE $1 AND EXISTS (
                    SELECT 1 FROM unnest($2::text[]) AS prefix
                    WHERE LOWER(drug_a_name) LIKE prefix
                ))
              )
            "#,
            &new_drug_prefix,
            &existing_prefixes
        )
        .fetch_all(pool)
        .await
        .context("Failed to fetch candidate drug interactions")?;

        // Apply fuzzy matching in Rust
        let mut matched_interactions: Vec<DrugInteraction> = Vec::new();
        let mut seen_ids: std::collections::HashSet<Uuid> = std::collections::HashSet::new();

        for interaction in &candidate_interactions {
            // Check if new drug matches drug_a AND an existing drug matches drug_b
            let new_matches_a = Self::drugs_match(
                &new_drug_lower,
                None, // New drug doesn't have ATC code from AIFA
                interaction.drug_a_name.as_deref(),
                &interaction.drug_a_atc_code,
            );

            let new_matches_b = Self::drugs_match(
                &new_drug_lower,
                None,
                interaction.drug_b_name.as_deref(),
                &interaction.drug_b_atc_code,
            );

            // Find if any existing medication matches the OTHER drug in the interaction
            let existing_matches_b = existing_meds.iter().any(|med| {
                Self::drugs_match(
                    &med.generic_name,
                    med.atc_code.as_deref(),
                    interaction.drug_b_name.as_deref(),
                    &interaction.drug_b_atc_code,
                )
            });

            let existing_matches_a = existing_meds.iter().any(|med| {
                Self::drugs_match(
                    &med.generic_name,
                    med.atc_code.as_deref(),
                    interaction.drug_a_name.as_deref(),
                    &interaction.drug_a_atc_code,
                )
            });

            // Valid interaction: new drug matches one side, existing matches the other
            let is_valid_interaction =
                (new_matches_a && existing_matches_b) || (new_matches_b && existing_matches_a);

            if is_valid_interaction && !seen_ids.contains(&interaction.id) {
                let severity = InteractionSeverity::from(interaction.severity.as_str());

                // Apply severity filter
                if let Some(min_priority) = severity_filter {
                    if severity.priority() < min_priority {
                        continue;
                    }
                }

                seen_ids.insert(interaction.id);
                matched_interactions.push(DrugInteraction {
                    id: interaction.id,
                    drug_a_atc_code: interaction.drug_a_atc_code.clone(),
                    drug_a_name: interaction.drug_a_name.clone(),
                    drug_b_atc_code: interaction.drug_b_atc_code.clone(),
                    drug_b_name: interaction.drug_b_name.clone(),
                    severity,
                    effect: interaction.effect.clone(),
                    mechanism: interaction.mechanism.clone(),
                    management: interaction.management.clone(),
                    source: interaction.source.clone(),
                });
            }
        }

        // Sort by severity (most severe first)
        matched_interactions.sort_by(|a, b| b.severity.priority().cmp(&a.severity.priority()));

        // Calculate statistics
        let total = matched_interactions.len() as i64;
        let major_count = matched_interactions
            .iter()
            .filter(|i| {
                matches!(
                    i.severity,
                    InteractionSeverity::Contraindicated | InteractionSeverity::Major
                )
            })
            .count() as i64;
        let moderate_count = matched_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Moderate))
            .count() as i64;
        let minor_count = matched_interactions
            .iter()
            .filter(|i| matches!(i.severity, InteractionSeverity::Minor))
            .count() as i64;

        let highest_severity = matched_interactions
            .iter()
            .max_by_key(|i| i.severity.priority())
            .map(|i| i.severity);

        Ok(CheckInteractionsResponse {
            interactions: matched_interactions,
            total,
            major_count,
            moderate_count,
            minor_count,
            highest_severity,
        })
    }

    /// Check if a patient's medication matches a DDInter drug
    ///
    /// Matching is done by:
    /// 1. ATC code exact match (if both have ATC codes)
    /// 2. Fuzzy name matching using Damerau-Levenshtein similarity (>= 0.7)
    ///
    /// This handles Italian-English drug name differences:
    /// - "Ibuprofene" → "Ibuprofen" (similarity ~0.9)
    /// - "Ketoprofene" → "Ketoprofen" (similarity ~0.9)
    fn drugs_match(
        patient_drug_name: &str,
        patient_atc: Option<&str>,
        ddinter_drug_name: Option<&str>,
        ddinter_atc: &str,
    ) -> bool {
        // Try ATC code match first (if patient drug has ATC code)
        if let Some(pat_atc) = patient_atc {
            if pat_atc.eq_ignore_ascii_case(ddinter_atc) {
                return true;
            }
        }

        // Try fuzzy name matching
        if let Some(ddinter_name) = ddinter_drug_name {
            let patient_lower = patient_drug_name.to_lowercase();
            let ddinter_lower = ddinter_name.to_lowercase();

            // Use normalized Damerau-Levenshtein for similarity
            let similarity = normalized_damerau_levenshtein(&patient_lower, &ddinter_lower);

            // Threshold of 0.8 catches:
            // - Ibuprofene/Ibuprofen (~0.9)
            // - Ketoprofene/Ketoprofen (~0.9)
            // - While rejecting false positives like Ketoprofene/Fenoprofen (~0.7)
            if similarity >= 0.8 {
                return true;
            }
        }

        false
    }

    /// Get interaction statistics for the database
    pub async fn get_statistics(pool: &PgPool) -> Result<InteractionStatistics> {
        let stats = sqlx::query_as!(
            InteractionStatsRow,
            r#"
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE severity = 'contraindicated') as contraindicated,
                COUNT(*) FILTER (WHERE severity = 'major') as major,
                COUNT(*) FILTER (WHERE severity = 'moderate') as moderate,
                COUNT(*) FILTER (WHERE severity = 'minor') as minor,
                COUNT(*) FILTER (WHERE severity = 'unknown') as unknown,
                COUNT(DISTINCT source) as sources
            FROM drug_interactions
            WHERE is_active = true
            "#
        )
        .fetch_one(pool)
        .await
        .context("Failed to get interaction statistics")?;

        Ok(InteractionStatistics {
            total: stats.total.unwrap_or(0),
            contraindicated: stats.contraindicated.unwrap_or(0),
            major: stats.major.unwrap_or(0),
            moderate: stats.moderate.unwrap_or(0),
            minor: stats.minor.unwrap_or(0),
            unknown: stats.unknown.unwrap_or(0),
            sources: stats.sources.unwrap_or(0),
        })
    }
}

/// Internal row type for database queries
#[derive(Debug)]
struct DrugInteractionRow {
    id: Uuid,
    drug_a_atc_code: String,
    drug_a_name: Option<String>,
    drug_b_atc_code: String,
    drug_b_name: Option<String>,
    severity: String,
    effect: Option<String>,
    mechanism: Option<String>,
    management: Option<String>,
    source: String,
}

/// Internal row type for statistics
#[derive(Debug)]
struct InteractionStatsRow {
    total: Option<i64>,
    contraindicated: Option<i64>,
    major: Option<i64>,
    moderate: Option<i64>,
    minor: Option<i64>,
    unknown: Option<i64>,
    sources: Option<i64>,
}

/// Statistics about the drug interaction database
#[derive(Debug, Clone, Serialize)]
pub struct InteractionStatistics {
    pub total: i64,
    pub contraindicated: i64,
    pub major: i64,
    pub moderate: i64,
    pub minor: i64,
    pub unknown: i64,
    pub sources: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== InteractionSeverity Tests ====================

    #[test]
    fn test_severity_from_string() {
        assert_eq!(InteractionSeverity::from("contraindicated"), InteractionSeverity::Contraindicated);
        assert_eq!(InteractionSeverity::from("MAJOR"), InteractionSeverity::Major);
        assert_eq!(InteractionSeverity::from("moderate"), InteractionSeverity::Moderate);
        assert_eq!(InteractionSeverity::from("Minor"), InteractionSeverity::Minor);
        assert_eq!(InteractionSeverity::from("unknown"), InteractionSeverity::Unknown);
        assert_eq!(InteractionSeverity::from("invalid"), InteractionSeverity::Unknown);
    }

    #[test]
    fn test_severity_from_string_case_insensitive() {
        assert_eq!(InteractionSeverity::from("CONTRAINDICATED"), InteractionSeverity::Contraindicated);
        assert_eq!(InteractionSeverity::from("Contraindicated"), InteractionSeverity::Contraindicated);
        assert_eq!(InteractionSeverity::from("MODERATE"), InteractionSeverity::Moderate);
    }

    #[test]
    fn test_severity_from_empty_string() {
        assert_eq!(InteractionSeverity::from(""), InteractionSeverity::Unknown);
    }

    #[test]
    fn test_severity_from_whitespace() {
        assert_eq!(InteractionSeverity::from("  "), InteractionSeverity::Unknown);
    }

    #[test]
    fn test_severity_priority() {
        assert!(InteractionSeverity::Contraindicated.priority() > InteractionSeverity::Major.priority());
        assert!(InteractionSeverity::Major.priority() > InteractionSeverity::Moderate.priority());
        assert!(InteractionSeverity::Moderate.priority() > InteractionSeverity::Minor.priority());
        assert!(InteractionSeverity::Minor.priority() > InteractionSeverity::Unknown.priority());
    }

    #[test]
    fn test_severity_priority_values() {
        assert_eq!(InteractionSeverity::Contraindicated.priority(), 5);
        assert_eq!(InteractionSeverity::Major.priority(), 4);
        assert_eq!(InteractionSeverity::Moderate.priority(), 3);
        assert_eq!(InteractionSeverity::Minor.priority(), 2);
        assert_eq!(InteractionSeverity::Unknown.priority(), 1);
    }

    #[test]
    fn test_severity_display_name_contraindicated() {
        assert_eq!(InteractionSeverity::Contraindicated.display_name(), "Contraindicated");
    }

    #[test]
    fn test_severity_display_name_major() {
        assert_eq!(InteractionSeverity::Major.display_name(), "Major");
    }

    #[test]
    fn test_severity_display_name_moderate() {
        assert_eq!(InteractionSeverity::Moderate.display_name(), "Moderate");
    }

    #[test]
    fn test_severity_display_name_minor() {
        assert_eq!(InteractionSeverity::Minor.display_name(), "Minor");
    }

    #[test]
    fn test_severity_display_name_unknown() {
        assert_eq!(InteractionSeverity::Unknown.display_name(), "Unknown");
    }

    // ==================== Fuzzy Matching Tests (drugs_match) ====================

    #[test]
    fn test_drugs_match_exact_name() {
        // Exact match should always work
        assert!(DrugInteractionService::drugs_match(
            "ibuprofen",
            None,
            Some("ibuprofen"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_case_insensitive() {
        assert!(DrugInteractionService::drugs_match(
            "IBUPROFEN",
            None,
            Some("ibuprofen"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_italian_to_english_ibuprofen() {
        // Ibuprofene (IT) → Ibuprofen (EN) should match
        assert!(DrugInteractionService::drugs_match(
            "ibuprofene",
            None,
            Some("ibuprofen"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_italian_to_english_ketoprofen() {
        // Ketoprofene (IT) → Ketoprofen (EN) should match
        assert!(DrugInteractionService::drugs_match(
            "ketoprofene",
            None,
            Some("ketoprofen"),
            "M01AE03"
        ));
    }

    #[test]
    fn test_drugs_match_atc_code_exact() {
        // ATC code match should work even if names don't match
        assert!(DrugInteractionService::drugs_match(
            "completely different name",
            Some("M01AE01"),
            Some("ibuprofen"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_atc_code_case_insensitive() {
        assert!(DrugInteractionService::drugs_match(
            "any name",
            Some("m01ae01"),
            Some("ibuprofen"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_no_match_different_drugs() {
        // Completely different drugs should not match
        assert!(!DrugInteractionService::drugs_match(
            "aspirin",
            None,
            Some("metformin"),
            "A10BA02"
        ));
    }

    #[test]
    fn test_drugs_match_similar_but_different() {
        // Similar names but different drugs (below threshold)
        // ketoprofene vs fenoprofen similarity is ~0.7
        assert!(!DrugInteractionService::drugs_match(
            "ketoprofene",
            None,
            Some("fenoprofen"),
            "M01AE04"
        ));
    }

    #[test]
    fn test_drugs_match_none_ddinter_name() {
        // No DDInter name should not match without ATC
        assert!(!DrugInteractionService::drugs_match(
            "ibuprofen",
            None,
            None,
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_with_atc_no_ddinter_name() {
        // Should match via ATC even without DDInter name
        assert!(DrugInteractionService::drugs_match(
            "ibuprofen",
            Some("M01AE01"),
            None,
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_paracetamol_acetaminophen() {
        // Paracetamol (UK/IT) vs Acetaminophen (US) - names too different
        // This tests that very different names don't false-match
        assert!(!DrugInteractionService::drugs_match(
            "paracetamolo",
            None,
            Some("acetaminophen"),
            "N02BE01"
        ));
    }

    #[test]
    fn test_drugs_match_minor_spelling_variation() {
        // Minor spelling variations should match
        assert!(DrugInteractionService::drugs_match(
            "amoxicillina",
            None,
            Some("amoxicillin"),
            "J01CA04"
        ));
    }

    #[test]
    fn test_drugs_match_omeprazolo_omeprazole() {
        // Italian omeprazolo vs English omeprazole
        assert!(DrugInteractionService::drugs_match(
            "omeprazolo",
            None,
            Some("omeprazole"),
            "A02BC01"
        ));
    }

    #[test]
    fn test_drugs_match_metformina_metformin() {
        // Italian metformina vs English metformin
        assert!(DrugInteractionService::drugs_match(
            "metformina",
            None,
            Some("metformin"),
            "A10BA02"
        ));
    }

    #[test]
    fn test_drugs_match_atorvastatina_atorvastatin() {
        // Italian atorvastatina vs English atorvastatin
        assert!(DrugInteractionService::drugs_match(
            "atorvastatina",
            None,
            Some("atorvastatin"),
            "C10AA05"
        ));
    }

    #[test]
    fn test_drugs_match_short_names() {
        // Very short names might not have enough characters for similarity
        assert!(DrugInteractionService::drugs_match(
            "ace",
            None,
            Some("ace"),
            "X00XX00"
        ));
    }

    // ==================== Structure Tests ====================

    #[test]
    fn test_check_interactions_request_default() {
        let request = CheckInteractionsRequest {
            atc_codes: vec!["M01AE01".to_string()],
            min_severity: None,
            include_inactive: false,
        };
        assert_eq!(request.atc_codes.len(), 1);
        assert!(!request.include_inactive);
    }

    #[test]
    fn test_check_interactions_request_multiple_codes() {
        let request = CheckInteractionsRequest {
            atc_codes: vec![
                "M01AE01".to_string(),
                "N02BE01".to_string(),
                "C10AA05".to_string(),
            ],
            min_severity: Some("moderate".to_string()),
            include_inactive: false,
        };
        assert_eq!(request.atc_codes.len(), 3);
        assert_eq!(request.min_severity, Some("moderate".to_string()));
    }

    #[test]
    fn test_check_interactions_response_empty() {
        let response = CheckInteractionsResponse {
            interactions: vec![],
            total: 0,
            major_count: 0,
            moderate_count: 0,
            minor_count: 0,
            highest_severity: None,
        };
        assert_eq!(response.total, 0);
        assert!(response.highest_severity.is_none());
    }

    #[test]
    fn test_check_interactions_response_with_interactions() {
        let response = CheckInteractionsResponse {
            interactions: vec![],
            total: 5,
            major_count: 2,
            moderate_count: 2,
            minor_count: 1,
            highest_severity: Some(InteractionSeverity::Major),
        };
        assert_eq!(response.total, 5);
        assert_eq!(response.major_count, 2);
        assert_eq!(response.highest_severity, Some(InteractionSeverity::Major));
    }

    #[test]
    fn test_check_new_medication_request() {
        let request = CheckNewMedicationRequest {
            new_atc_code: "M01AE01".to_string(),
            existing_atc_codes: vec!["N02BE01".to_string(), "C10AA05".to_string()],
            min_severity: None,
        };
        assert_eq!(request.new_atc_code, "M01AE01");
        assert_eq!(request.existing_atc_codes.len(), 2);
    }

    #[test]
    fn test_check_new_medication_for_patient_request() {
        let request = CheckNewMedicationForPatientRequest {
            new_medication_name: "Ibuprofene 400mg".to_string(),
            new_generic_name: Some("ibuprofene".to_string()),
            patient_id: Uuid::new_v4(),
            min_severity: Some("moderate".to_string()),
        };
        assert!(!request.new_medication_name.is_empty());
        assert!(request.new_generic_name.is_some());
    }

    #[test]
    fn test_interaction_statistics_structure() {
        let stats = InteractionStatistics {
            total: 170000,
            contraindicated: 500,
            major: 15000,
            moderate: 80000,
            minor: 70000,
            unknown: 4500,
            sources: 3,
        };
        assert_eq!(stats.total, 170000);
        assert_eq!(stats.contraindicated, 500);
        assert_eq!(stats.sources, 3);
    }

    #[test]
    fn test_interaction_statistics_zero() {
        let stats = InteractionStatistics {
            total: 0,
            contraindicated: 0,
            major: 0,
            moderate: 0,
            minor: 0,
            unknown: 0,
            sources: 0,
        };
        assert_eq!(stats.total, 0);
    }

    #[test]
    fn test_drug_interaction_structure() {
        let interaction = DrugInteraction {
            id: Uuid::new_v4(),
            drug_a_atc_code: "M01AE01".to_string(),
            drug_a_name: Some("Ibuprofen".to_string()),
            drug_b_atc_code: "N02BE01".to_string(),
            drug_b_name: Some("Paracetamol".to_string()),
            severity: InteractionSeverity::Moderate,
            effect: Some("Increased risk of GI bleeding".to_string()),
            mechanism: Some("Both drugs affect COX enzymes".to_string()),
            management: Some("Use with caution".to_string()),
            source: "DDINTER".to_string(),
        };
        assert_eq!(interaction.drug_a_atc_code, "M01AE01");
        assert_eq!(interaction.severity, InteractionSeverity::Moderate);
    }

    // ==================== Serialization Tests ====================

    #[test]
    fn test_severity_serialization() {
        let severity = InteractionSeverity::Major;
        let json = serde_json::to_string(&severity).unwrap();
        assert_eq!(json, "\"major\"");
    }

    #[test]
    fn test_severity_deserialization() {
        let json = "\"moderate\"";
        let severity: InteractionSeverity = serde_json::from_str(json).unwrap();
        assert_eq!(severity, InteractionSeverity::Moderate);
    }

    #[test]
    fn test_severity_serialization_contraindicated() {
        let severity = InteractionSeverity::Contraindicated;
        let json = serde_json::to_string(&severity).unwrap();
        assert_eq!(json, "\"contraindicated\"");
    }

    #[test]
    fn test_interaction_statistics_serialization() {
        let stats = InteractionStatistics {
            total: 100,
            contraindicated: 5,
            major: 20,
            moderate: 50,
            minor: 20,
            unknown: 5,
            sources: 2,
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"total\":100"));
        assert!(json.contains("\"contraindicated\":5"));
    }

    #[test]
    fn test_check_interactions_response_serialization() {
        let response = CheckInteractionsResponse {
            interactions: vec![],
            total: 3,
            major_count: 1,
            moderate_count: 2,
            minor_count: 0,
            highest_severity: Some(InteractionSeverity::Major),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":3"));
        assert!(json.contains("\"highest_severity\":\"major\""));
    }

    // ==================== Edge Cases ====================

    #[test]
    fn test_drugs_match_empty_patient_name() {
        assert!(!DrugInteractionService::drugs_match(
            "",
            None,
            Some("ibuprofen"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_empty_ddinter_name() {
        assert!(!DrugInteractionService::drugs_match(
            "ibuprofen",
            None,
            Some(""),
            "M01AE01"
        ));
    }

    #[test]
    fn test_drugs_match_unicode_names() {
        // Test with accented characters
        assert!(DrugInteractionService::drugs_match(
            "ibuprofène",
            None,
            Some("ibuprofene"),
            "M01AE01"
        ));
    }

    #[test]
    fn test_severity_ordering() {
        let mut severities = vec![
            InteractionSeverity::Minor,
            InteractionSeverity::Contraindicated,
            InteractionSeverity::Moderate,
            InteractionSeverity::Major,
            InteractionSeverity::Unknown,
        ];

        // Sort by priority descending
        severities.sort_by(|a, b| b.priority().cmp(&a.priority()));

        assert_eq!(severities[0], InteractionSeverity::Contraindicated);
        assert_eq!(severities[1], InteractionSeverity::Major);
        assert_eq!(severities[2], InteractionSeverity::Moderate);
        assert_eq!(severities[3], InteractionSeverity::Minor);
        assert_eq!(severities[4], InteractionSeverity::Unknown);
    }
}
