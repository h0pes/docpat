//! AIFA Medications Data Import Tool
//!
//! This binary imports medication data from AIFA (Italian Medicines Agency) CSV files
//! into the medications database table.
//!
//! Usage:
//!   cargo run --bin import-medications -- --file data/aifa_class_a.csv
//!   cargo run --bin import-medications -- --download
//!
//! The tool supports:
//! - Importing Class A medications (SSN-reimbursed)
//! - Importing ATC codes for classification
//! - Updating existing records on re-import

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::env;
use std::fs::File;
use std::io::{BufRead, BufReader};
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

/// Medication record parsed from AIFA Class A CSV
#[derive(Debug, Clone)]
struct AifaMedication {
    /// Active ingredient (Principio Attivo)
    active_ingredient: String,
    /// Group description (Descrizione Gruppo)
    group_description: String,
    /// Commercial name and package (Denominazione e Confezione)
    name_and_package: String,
    /// Commercial name only (extracted)
    commercial_name: String,
    /// Package description (extracted)
    package_description: String,
    /// Public price
    price: Option<f64>,
    /// AIC holder company
    manufacturer: String,
    /// AIC code (authorization number)
    aic_code: String,
    /// Equivalence group code
    equivalence_group: Option<String>,
    /// Is generic (based on equivalence group)
    is_generic: bool,
}

/// ATC code record
#[derive(Debug, Clone)]
struct AtcCode {
    code: String,
    description: String,
}

/// Parse the AIFA Class A CSV file
fn parse_aifa_class_a_csv(path: &str) -> Result<Vec<AifaMedication>> {
    let file = File::open(path).context(format!("Failed to open file: {}", path))?;
    let reader = BufReader::new(file);
    let mut medications = Vec::new();

    for (line_num, line_result) in reader.lines().enumerate() {
        let line = line_result.context(format!("Failed to read line {}", line_num))?;

        // Skip header line
        if line_num == 0 {
            continue;
        }

        // Skip empty lines
        if line.trim().is_empty() {
            continue;
        }

        // Parse semicolon-separated values
        // Format: Principio Attivo;Descrizione Gruppo;Denominazione e Confezione;Prezzo;Titolare AIC;AIC;Codice Gruppo Equivalenza;...
        let fields: Vec<&str> = line.split(';').collect();

        if fields.len() < 7 {
            warn!("Line {} has insufficient fields: {}", line_num, line);
            continue;
        }

        let active_ingredient = fields[0].trim().to_string();
        let group_description = fields[1].trim().to_string();
        let name_and_package = fields[2].trim().to_string();
        let price_str = fields[3].trim().replace(',', ".");
        let manufacturer = fields[4].trim().to_string();
        let aic_code = fields[5].trim().to_string();
        let equivalence_group = if fields[6].trim().is_empty() {
            None
        } else {
            Some(fields[6].trim().to_string())
        };

        // Parse commercial name (before the *) and package (after the *)
        let (commercial_name, package_description) = if name_and_package.contains('*') {
            let parts: Vec<&str> = name_and_package.splitn(2, '*').collect();
            (parts[0].trim().to_string(), parts.get(1).map(|s| s.trim().to_string()).unwrap_or_default())
        } else {
            (name_and_package.clone(), String::new())
        };

        // Parse price
        let price = price_str.parse::<f64>().ok();

        // Determine if generic based on equivalence group marking
        let is_generic = fields.get(7).map(|s| s.trim() == "X").unwrap_or(false);

        medications.push(AifaMedication {
            active_ingredient,
            group_description,
            name_and_package,
            commercial_name,
            package_description,
            price,
            manufacturer,
            aic_code,
            equivalence_group,
            is_generic,
        });
    }

    Ok(medications)
}

/// Parse the ATC codes CSV file
fn parse_atc_csv(path: &str) -> Result<Vec<AtcCode>> {
    let file = File::open(path).context(format!("Failed to open file: {}", path))?;
    let reader = BufReader::new(file);
    let mut codes = Vec::new();

    for (line_num, line_result) in reader.lines().enumerate() {
        let line = line_result.context(format!("Failed to read line {}", line_num))?;

        // Skip header line
        if line_num == 0 {
            continue;
        }

        // Skip empty lines
        if line.trim().is_empty() {
            continue;
        }

        // Parse semicolon-separated values: codice_atc;descrizione
        let fields: Vec<&str> = line.split(';').collect();

        if fields.len() < 2 {
            continue;
        }

        codes.push(AtcCode {
            code: fields[0].trim().to_string(),
            description: fields[1].trim().to_string(),
        });
    }

    Ok(codes)
}

/// Extract dosage strength from group description
/// e.g., "ACARBOSIO 100MG 40 UNITA' USO ORALE" -> "100MG"
fn extract_dosage_strength(group_description: &str) -> Option<String> {
    // Common patterns: "100MG", "500MG/5ML", "2,5MG", "10MCG"
    let re = regex::Regex::new(r"(\d+[,.]?\d*\s*(MG|MCG|G|ML|UI|UNITA)[^A-Z]*(?:/\d+[,.]?\d*\s*(MG|MCG|G|ML))?)").ok()?;
    re.find(group_description).map(|m| m.as_str().to_string())
}

/// Extract pharmaceutical form from package description
fn extract_form(package_description: &str) -> Option<String> {
    let desc_lower = package_description.to_lowercase();

    if desc_lower.contains("cpr") || desc_lower.contains("compresse") {
        Some("Tablet".to_string())
    } else if desc_lower.contains("cps") || desc_lower.contains("capsule") {
        Some("Capsule".to_string())
    } else if desc_lower.contains("fl") || desc_lower.contains("fiala") || desc_lower.contains("fiale") {
        Some("Injection".to_string())
    } else if desc_lower.contains("supp") {
        Some("Suppository".to_string())
    } else if desc_lower.contains("crema") || desc_lower.contains("unguento") || desc_lower.contains("gel") {
        Some("Topical".to_string())
    } else if desc_lower.contains("sciroppo") || desc_lower.contains("soluzione") || desc_lower.contains("sospensione") {
        Some("Liquid".to_string())
    } else if desc_lower.contains("gocce") {
        Some("Drops".to_string())
    } else if desc_lower.contains("inhaler") || desc_lower.contains("spray") || desc_lower.contains("aerosol") {
        Some("Inhaler".to_string())
    } else if desc_lower.contains("cerotto") || desc_lower.contains("patch") {
        Some("Patch".to_string())
    } else if desc_lower.contains("penna") || desc_lower.contains("siringa") {
        Some("Injection".to_string())
    } else {
        None
    }
}

/// Extract route of administration
fn extract_route(group_description: &str) -> Option<String> {
    let desc_lower = group_description.to_lowercase();

    if desc_lower.contains("uso orale") || desc_lower.contains("per os") {
        Some("ORAL".to_string())
    } else if desc_lower.contains("uso parenterale") || desc_lower.contains("iniettabile")
           || desc_lower.contains("sottocutaneo") || desc_lower.contains("intramuscolo") {
        Some("INJECTION".to_string())
    } else if desc_lower.contains("uso topico") || desc_lower.contains("uso cutaneo") {
        Some("TOPICAL".to_string())
    } else if desc_lower.contains("uso inalatorio") || desc_lower.contains("inalazione") {
        Some("INHALATION".to_string())
    } else if desc_lower.contains("uso rettale") {
        Some("RECTAL".to_string())
    } else if desc_lower.contains("uso nasale") {
        Some("NASAL".to_string())
    } else if desc_lower.contains("uso oftalmico") || desc_lower.contains("collirio") {
        Some("OPHTHALMIC".to_string())
    } else if desc_lower.contains("transdermico") {
        Some("TRANSDERMAL".to_string())
    } else if desc_lower.contains("sublinguale") {
        Some("SUBLINGUAL".to_string())
    } else {
        None
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env()
            .add_directive("import_medications=info".parse().unwrap()))
        .init();

    // Load environment variables
    dotenv::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .context("DATABASE_URL environment variable not set")?;

    info!("Connecting to database...");

    // Create database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .context("Failed to connect to database")?;

    info!("Connected to database successfully");

    // Parse command line arguments
    let args: Vec<String> = env::args().collect();

    // Get the directory where the binary is located (backend directory)
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let data_dir = manifest_dir.join("data");
    let class_a_file = data_dir.join("aifa_class_a.csv");
    let atc_file = data_dir.join("aifa_atc.csv");

    // Import ATC codes first (if file exists)
    if atc_file.exists() {
        info!("Importing ATC codes from {:?}...", atc_file);
        let atc_codes = parse_atc_csv(atc_file.to_str().unwrap())?;
        info!("Parsed {} ATC codes", atc_codes.len());

        let mut imported_atc = 0;
        for code in &atc_codes {
            // Determine level based on code length
            let level = match code.code.len() {
                1 => 1,      // A
                3 => 2,      // A01
                4 => 3,      // A01A
                5 => 4,      // A01AA
                7 => 5,      // A01AA01
                _ => 5,
            };

            // Extract parent code
            let parent_code: Option<String> = match level {
                1 => None,
                2 => Some(code.code[..1].to_string()),
                3 => Some(code.code[..3].to_string()),
                4 => Some(code.code[..4].to_string()),
                5 => Some(code.code[..5].to_string()),
                _ => None,
            };

            let result = sqlx::query(
                r#"
                INSERT INTO atc_codes (code, description, level, parent_code)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (code) DO UPDATE SET
                    description = EXCLUDED.description
                "#
            )
            .bind(&code.code)
            .bind(&code.description)
            .bind(level)
            .bind(&parent_code)
            .execute(&pool)
            .await;

            match result {
                Ok(_) => imported_atc += 1,
                Err(e) => warn!("Failed to import ATC code {}: {}", code.code, e),
            }
        }
        info!("Imported {} ATC codes", imported_atc);
    }

    // Import Class A medications
    if !class_a_file.exists() {
        error!("Class A file not found: {:?}", class_a_file);
        error!("Please download the file first:");
        error!("  curl -o data/aifa_class_a.csv 'https://www.aifa.gov.it/documents/20142/3174333/Classe_A_per_principio_attivo_30-06-2025.csv'");
        return Ok(());
    }

    info!("Importing Class A medications from {:?}...", class_a_file);
    let medications = parse_aifa_class_a_csv(class_a_file.to_str().unwrap())?;
    info!("Parsed {} medication records", medications.len());

    // Group medications by commercial name to avoid duplicates
    // Each commercial name might have multiple packages/dosages
    let mut by_name: HashMap<String, Vec<AifaMedication>> = HashMap::new();
    for med in &medications {
        by_name.entry(med.commercial_name.clone()).or_default().push(med.clone());
    }

    info!("Found {} unique commercial names", by_name.len());

    let mut imported = 0;
    let mut skipped = 0;
    let now = chrono::Utc::now();

    for (commercial_name, entries) in &by_name {
        // Use the first entry as representative
        let med = &entries[0];

        // Extract common dosages from all entries
        let common_dosages: Vec<String> = entries
            .iter()
            .filter_map(|m| extract_dosage_strength(&m.group_description))
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .take(5) // Limit to 5 dosages
            .collect();

        let dosage_strength = extract_dosage_strength(&med.group_description);
        let form = extract_form(&med.package_description);
        let route = extract_route(&med.group_description);

        // Build common dosages JSON
        let common_dosages_json = serde_json::to_value(&common_dosages)
            .unwrap_or(serde_json::json!([]));

        let result = sqlx::query(
            r#"
            INSERT INTO medications (
                id, aic_code, name, generic_name, form, dosage_strength, route,
                package_description, manufacturer, drug_class, is_generic,
                is_prescription_required, common_dosages, source, source_updated_at,
                is_custom, is_active, created_at, updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
            )
            ON CONFLICT (aic_code) DO UPDATE SET
                name = EXCLUDED.name,
                generic_name = EXCLUDED.generic_name,
                form = EXCLUDED.form,
                dosage_strength = EXCLUDED.dosage_strength,
                route = EXCLUDED.route,
                package_description = EXCLUDED.package_description,
                manufacturer = EXCLUDED.manufacturer,
                common_dosages = EXCLUDED.common_dosages,
                source_updated_at = EXCLUDED.source_updated_at,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(Uuid::new_v4())
        .bind(&med.aic_code)
        .bind(commercial_name)
        .bind(&med.active_ingredient)
        .bind(&form)
        .bind(&dosage_strength)
        .bind(&route)
        .bind(&med.package_description)
        .bind(&med.manufacturer)
        .bind("A") // Class A
        .bind(med.is_generic)
        .bind(true) // Prescription required
        .bind(&common_dosages_json)
        .bind("AIFA")
        .bind(&now)
        .bind(false) // Not custom
        .bind(true)  // Active
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await;

        match result {
            Ok(_) => imported += 1,
            Err(e) => {
                // Handle unique constraint violation differently
                if e.to_string().contains("unique_custom_medication") {
                    skipped += 1;
                } else {
                    warn!("Failed to import {}: {}", commercial_name, e);
                    skipped += 1;
                }
            }
        }

        // Progress logging
        if imported % 500 == 0 && imported > 0 {
            info!("Progress: {} medications imported...", imported);
        }
    }

    info!("Import completed!");
    info!("  - Imported: {} medications", imported);
    info!("  - Skipped: {} (duplicates or errors)", skipped);

    // Show summary statistics
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM medications WHERE source = 'AIFA'")
        .fetch_one(&pool)
        .await?;

    info!("Total AIFA medications in database: {}", count.0);

    Ok(())
}
