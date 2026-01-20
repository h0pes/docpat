//! DDInter Drug Interactions Import Tool
//!
//! This binary imports drug-drug interaction data from DDInter 2.0 CSV files
//! into the drug_interactions database table.
//!
//! Prerequisites:
//!   1. Download DDInter CSV files from https://ddinter2.scbdd.com/download/
//!   2. Download WHO ATC English CSV from https://github.com/fabkury/atcd
//!   3. Place files in backend/data/ddinter/ and backend/data/ respectively
//!
//! Usage:
//!   cargo run --bin import-drug-interactions
//!
//! The tool:
//!   - Loads WHO ATC English names for drug-to-ATC code mapping
//!   - Processes all DDInter CSV files in data/ddinter/
//!   - Matches drug names to ATC codes
//!   - Imports interactions into drug_interactions table
//!
//! Note: Run this for both dev and test databases:
//!   DATABASE_URL=<dev_url> cargo run --bin import-drug-interactions
//!   DATABASE_URL=<test_url> cargo run --bin import-drug-interactions

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::Path;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// WHO ATC record with English drug name
#[derive(Debug, Clone)]
struct WhoAtcRecord {
    atc_code: String,
    atc_name: String,
}

/// DDInter interaction record
#[derive(Debug, Clone)]
struct DDInterRecord {
    ddinter_id_a: String,
    drug_a: String,
    ddinter_id_b: String,
    drug_b: String,
    severity: String,
}

/// Load WHO ATC English CSV and build name-to-code mapping
///
/// Returns a HashMap where keys are lowercase drug names and values are ATC codes
fn load_who_atc_mapping(path: &Path) -> Result<HashMap<String, String>> {
    let file = File::open(path).context(format!("Failed to open WHO ATC file: {:?}", path))?;
    let reader = BufReader::new(file);
    let mut mapping = HashMap::new();

    for (line_num, line_result) in reader.lines().enumerate() {
        // Skip header
        if line_num == 0 {
            continue;
        }

        let line = line_result?;
        if line.trim().is_empty() {
            continue;
        }

        // Format: atc_code,atc_name,ddd,uom,adm_r,note
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() < 2 {
            continue;
        }

        let atc_code = fields[0].trim().to_string();
        let atc_name = fields[1].trim().to_lowercase();

        // Only include level 5 ATC codes (7 characters, e.g., A01AA01)
        // These are the most specific codes representing individual substances
        if atc_code.len() == 7 && !atc_name.is_empty() {
            mapping.insert(atc_name, atc_code);
        }
    }

    Ok(mapping)
}

/// Normalize DDInter severity to our database schema
///
/// DDInter uses: Major, Moderate, Minor, Unknown
/// We use: contraindicated, major, moderate, minor, unknown
fn normalize_severity(raw: &str) -> &'static str {
    let lower = raw.trim().to_lowercase();
    match lower.as_str() {
        "major" => "major",
        "moderate" => "moderate",
        "minor" => "minor",
        "unknown" => "unknown",
        _ => "unknown",
    }
}

/// Parse a single DDInter CSV file
fn parse_ddinter_csv(path: &Path) -> Result<Vec<DDInterRecord>> {
    let file = File::open(path).context(format!("Failed to open DDInter file: {:?}", path))?;
    let reader = BufReader::new(file);
    let mut records = Vec::new();

    for (line_num, line_result) in reader.lines().enumerate() {
        // Skip header: DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level
        if line_num == 0 {
            continue;
        }

        let line = line_result?;
        if line.trim().is_empty() {
            continue;
        }

        // Parse CSV (simple split, no quote handling needed for this data)
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() < 5 {
            continue;
        }

        // Handle potential extra commas in drug names by taking the right fields
        let ddinter_id_a = fields[0].trim().to_string();
        let drug_a = fields[1].trim().to_string();
        let ddinter_id_b = fields[2].trim().to_string();
        let drug_b = fields[3].trim().to_string();
        let severity = fields[4].trim().to_string();

        // Skip invalid records
        if drug_a.is_empty() || drug_b.is_empty() {
            continue;
        }

        records.push(DDInterRecord {
            ddinter_id_a,
            drug_a,
            ddinter_id_b,
            drug_b,
            severity,
        });
    }

    Ok(records)
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("import_drug_interactions=info".parse().unwrap()),
        )
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    let database_url =
        env::var("DATABASE_URL").context("DATABASE_URL environment variable not set")?;

    info!("Connecting to database...");

    // Create database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .context("Failed to connect to database")?;

    info!("Connected to database successfully");

    // Get data directory path
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let data_dir = manifest_dir.join("data");
    let ddinter_dir = data_dir.join("ddinter");
    let who_atc_file = data_dir.join("who_atc_english.csv");

    // Step 1: Load WHO ATC mapping
    if !who_atc_file.exists() {
        anyhow::bail!(
            "WHO ATC English file not found: {:?}\n\
             Please download it first:\n\
             curl -sL 'https://raw.githubusercontent.com/fabkury/atcd/master/WHO%20ATC-DDD%202021-12-03.csv' \
             -o data/who_atc_english.csv",
            who_atc_file
        );
    }

    info!("Loading WHO ATC mapping from {:?}...", who_atc_file);
    let atc_mapping = load_who_atc_mapping(&who_atc_file)?;
    info!("Loaded {} drug name to ATC code mappings", atc_mapping.len());

    // Step 2: Find all DDInter CSV files
    if !ddinter_dir.exists() {
        anyhow::bail!(
            "DDInter directory not found: {:?}\n\
             Please download DDInter CSV files from https://ddinter2.scbdd.com/download/\n\
             and place them in data/ddinter/",
            ddinter_dir
        );
    }

    let csv_files: Vec<_> = fs::read_dir(&ddinter_dir)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry
                .path()
                .extension()
                .map(|ext| ext == "csv")
                .unwrap_or(false)
        })
        .map(|entry| entry.path())
        .collect();

    if csv_files.is_empty() {
        anyhow::bail!("No CSV files found in {:?}", ddinter_dir);
    }

    info!("Found {} DDInter CSV files to process", csv_files.len());

    // Statistics
    let mut total_records = 0;
    let mut imported = 0;
    let mut skipped_no_atc = 0;
    let mut skipped_duplicate = 0;

    // Track seen pairs to avoid duplicates within this import
    let mut seen_pairs: HashSet<(String, String)> = HashSet::new();

    // Step 3: Process each CSV file
    for csv_path in &csv_files {
        info!("Processing {:?}...", csv_path.file_name().unwrap());

        let records = parse_ddinter_csv(csv_path)?;
        total_records += records.len();

        for record in records {
            // Look up ATC codes for both drugs
            let drug_a_lower = record.drug_a.to_lowercase();
            let drug_b_lower = record.drug_b.to_lowercase();

            let atc_a = atc_mapping.get(&drug_a_lower);
            let atc_b = atc_mapping.get(&drug_b_lower);

            // Skip if either drug doesn't have an ATC code
            if atc_a.is_none() || atc_b.is_none() {
                skipped_no_atc += 1;
                continue;
            }

            let atc_a = atc_a.unwrap();
            let atc_b = atc_b.unwrap();

            // Normalize order: drug_a_atc < drug_b_atc (alphabetically)
            let (final_atc_a, final_atc_b, final_name_a, final_name_b) = if atc_a < atc_b {
                (atc_a, atc_b, &record.drug_a, &record.drug_b)
            } else {
                (atc_b, atc_a, &record.drug_b, &record.drug_a)
            };

            // Check for duplicates
            let pair_key = (final_atc_a.clone(), final_atc_b.clone());
            if seen_pairs.contains(&pair_key) {
                skipped_duplicate += 1;
                continue;
            }
            seen_pairs.insert(pair_key);

            // Normalize severity
            let severity = normalize_severity(&record.severity);

            // Create source_id from DDInter IDs
            let source_id = format!("{}-{}", record.ddinter_id_a, record.ddinter_id_b);

            // Insert into database
            let result = sqlx::query(
                r#"
                INSERT INTO drug_interactions (
                    drug_a_atc_code, drug_a_name,
                    drug_b_atc_code, drug_b_name,
                    severity, source, source_id, source_updated_at
                ) VALUES ($1, $2, $3, $4, $5, 'DDINTER', $6, NOW())
                ON CONFLICT (drug_a_atc_code, drug_b_atc_code, source)
                DO UPDATE SET
                    severity = EXCLUDED.severity,
                    drug_a_name = EXCLUDED.drug_a_name,
                    drug_b_name = EXCLUDED.drug_b_name,
                    source_id = EXCLUDED.source_id,
                    updated_at = NOW()
                "#,
            )
            .bind(final_atc_a)
            .bind(final_name_a)
            .bind(final_atc_b)
            .bind(final_name_b)
            .bind(severity)
            .bind(&source_id)
            .execute(&pool)
            .await;

            match result {
                Ok(_) => imported += 1,
                Err(e) => {
                    warn!(
                        "Failed to import interaction {} <-> {}: {}",
                        record.drug_a, record.drug_b, e
                    );
                }
            }

            // Progress logging
            if imported % 10000 == 0 && imported > 0 {
                info!("Progress: {} interactions imported...", imported);
            }
        }
    }

    info!("Import completed!");
    info!("  - Total records processed: {}", total_records);
    info!("  - Imported: {}", imported);
    info!(
        "  - Skipped (no ATC code): {} ({:.1}%)",
        skipped_no_atc,
        (skipped_no_atc as f64 / total_records as f64) * 100.0
    );
    info!(
        "  - Skipped (duplicate): {} ({:.1}%)",
        skipped_duplicate,
        (skipped_duplicate as f64 / total_records as f64) * 100.0
    );

    // Show summary statistics from database
    let stats: (i64, i64, i64, i64, i64) = sqlx::query_as(
        r#"
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE severity = 'major') as major,
            COUNT(*) FILTER (WHERE severity = 'moderate') as moderate,
            COUNT(*) FILTER (WHERE severity = 'minor') as minor,
            COUNT(*) FILTER (WHERE severity = 'unknown') as unknown
        FROM drug_interactions
        WHERE source = 'DDINTER'
        "#,
    )
    .fetch_one(&pool)
    .await?;

    info!("");
    info!("Database statistics:");
    info!("  - Total interactions: {}", stats.0);
    info!("  - Major: {}", stats.1);
    info!("  - Moderate: {}", stats.2);
    info!("  - Minor: {}", stats.3);
    info!("  - Unknown: {}", stats.4);

    Ok(())
}
