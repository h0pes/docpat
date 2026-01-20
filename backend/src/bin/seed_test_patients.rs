/**
 * Seed Test Patients and Appointments Utility
 *
 * Creates test patients and appointments with properly encrypted PII data.
 * Run with: cargo run --bin seed_test_patients
 */

use chrono::{NaiveDate, Utc};
use docpat_backend::models::patient::{ContactMethod, CreatePatientRequest, Gender, Patient};
use docpat_backend::utils::encryption::EncryptionKey;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment
    dotenvy::dotenv().ok();

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    println!("🔧 Seeding test patients and appointments...\n");

    // Connect to database
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("✅ Connected to database");

    // Load encryption key
    let encryption_key = EncryptionKey::from_env()?;

    println!("✅ Encryption key loaded");

    // Get test user IDs
    let testdoctor_id: Uuid = sqlx::query_scalar("SELECT id FROM users WHERE username = 'testdoctor'")
        .fetch_one(&pool)
        .await
        .expect("testdoctor user not found. Please create it first.");

    let testadmin_id: Uuid = sqlx::query_scalar("SELECT id FROM users WHERE username = 'testadmin'")
        .fetch_one(&pool)
        .await
        .expect("testadmin user not found. Please create it first.");

    println!("✅ Found test users");
    println!("   testdoctor ID: {}", testdoctor_id);
    println!("   testadmin ID:  {}", testadmin_id);

    // Temporarily disable RLS for seeding
    println!("\n🔓 Disabling RLS for seeding...");
    sqlx::query("ALTER TABLE patients DISABLE ROW LEVEL SECURITY")
        .execute(&pool)
        .await?;
    sqlx::query("ALTER TABLE appointments DISABLE ROW LEVEL SECURITY")
        .execute(&pool)
        .await?;

    // Delete existing test data
    println!("🗑️  Deleting existing test data...");
    sqlx::query("DELETE FROM appointments WHERE patient_id IN (SELECT id FROM patients WHERE email LIKE '%@test.docpat')")
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM patients WHERE email LIKE '%@test.docpat'")
        .execute(&pool)
        .await?;

    println!("\n📝 Creating test patients...\n");

    // Patient 1: John Doe
    let patient1_req = CreatePatientRequest {
        first_name: "John".to_string(),
        last_name: "Doe".to_string(),
        middle_name: None,
        date_of_birth: NaiveDate::from_ymd_opt(1985, 3, 15).unwrap(),
        gender: Gender::M,
        fiscal_code: None,
        phone_primary: Some("+39 333 1234567".to_string()),
        phone_secondary: None,
        email: Some("john.doe@test.docpat".to_string()),
        preferred_contact_method: Some(ContactMethod::Email),
        address: None,
        emergency_contact: None,
        blood_type: Some("A+".to_string()),
        allergies: None,
        chronic_conditions: None,
        current_medications: None,
        health_card_expire: None,
        photo_url: None,
        notes: Some("Test patient for E2E testing".to_string()),
    };

    let patient1 = Patient::create(&pool, patient1_req, testdoctor_id, &encryption_key).await?;
    println!("✅ Created patient: John Doe (MRN: {})", patient1.medical_record_number);

    // Patient 2: Jane Smith
    let patient2_req = CreatePatientRequest {
        first_name: "Jane".to_string(),
        last_name: "Smith".to_string(),
        middle_name: None,
        date_of_birth: NaiveDate::from_ymd_opt(1990, 7, 22).unwrap(),
        gender: Gender::F,
        fiscal_code: None,
        phone_primary: Some("+39 333 2345678".to_string()),
        phone_secondary: None,
        email: Some("jane.smith@test.docpat".to_string()),
        preferred_contact_method: Some(ContactMethod::Phone),
        address: None,
        emergency_contact: None,
        blood_type: Some("B+".to_string()),
        allergies: None,
        chronic_conditions: None,
        current_medications: None,
        health_card_expire: None,
        photo_url: None,
        notes: Some("Test patient for E2E testing".to_string()),
    };

    let patient2 = Patient::create(&pool, patient2_req, testdoctor_id, &encryption_key).await?;
    println!("✅ Created patient: Jane Smith (MRN: {})", patient2.medical_record_number);

    // Patient 3: Robert Johnson
    let patient3_req = CreatePatientRequest {
        first_name: "Robert".to_string(),
        last_name: "Johnson".to_string(),
        middle_name: None,
        date_of_birth: NaiveDate::from_ymd_opt(1978, 11, 8).unwrap(),
        gender: Gender::M,
        fiscal_code: None,
        phone_primary: Some("+39 333 3456789".to_string()),
        phone_secondary: None,
        email: Some("robert.johnson@test.docpat".to_string()),
        preferred_contact_method: Some(ContactMethod::Sms),
        address: None,
        emergency_contact: None,
        blood_type: Some("O+".to_string()),
        allergies: None,
        chronic_conditions: None,
        current_medications: None,
        health_card_expire: None,
        photo_url: None,
        notes: Some("Test patient for E2E testing".to_string()),
    };

    let patient3 = Patient::create(&pool, patient3_req, testdoctor_id, &encryption_key).await?;
    println!("✅ Created patient: Robert Johnson (MRN: {})", patient3.medical_record_number);

    // Patient 4: Maria Garcia
    let patient4_req = CreatePatientRequest {
        first_name: "Maria".to_string(),
        last_name: "Garcia".to_string(),
        middle_name: None,
        date_of_birth: NaiveDate::from_ymd_opt(1995, 1, 30).unwrap(),
        gender: Gender::F,
        fiscal_code: None,
        phone_primary: Some("+39 333 4567890".to_string()),
        phone_secondary: None,
        email: Some("maria.garcia@test.docpat".to_string()),
        preferred_contact_method: Some(ContactMethod::Whatsapp),
        address: None,
        emergency_contact: None,
        blood_type: Some("AB+".to_string()),
        allergies: None,
        chronic_conditions: None,
        current_medications: None,
        health_card_expire: None,
        photo_url: None,
        notes: Some("Test patient for E2E testing".to_string()),
    };

    let patient4 = Patient::create(&pool, patient4_req, testdoctor_id, &encryption_key).await?;
    println!("✅ Created patient: Maria Garcia (MRN: {})", patient4.medical_record_number);

    // Patient 5: William Brown
    let patient5_req = CreatePatientRequest {
        first_name: "William".to_string(),
        last_name: "Brown".to_string(),
        middle_name: None,
        date_of_birth: NaiveDate::from_ymd_opt(1982, 6, 12).unwrap(),
        gender: Gender::M,
        fiscal_code: None,
        phone_primary: Some("+39 333 5678901".to_string()),
        phone_secondary: None,
        email: Some("william.brown@test.docpat".to_string()),
        preferred_contact_method: Some(ContactMethod::Email),
        address: None,
        emergency_contact: None,
        blood_type: Some("O-".to_string()),
        allergies: None,
        chronic_conditions: None,
        current_medications: None,
        health_card_expire: None,
        photo_url: None,
        notes: Some("Test patient for E2E testing".to_string()),
    };

    let patient5 = Patient::create(&pool, patient5_req, testdoctor_id, &encryption_key).await?;
    println!("✅ Created patient: William Brown (MRN: {})", patient5.medical_record_number);

    println!("\n📅 Creating test appointments...\n");

    // Appointment 1: John Doe - Future appointment
    let start1 = chrono::NaiveDateTime::parse_from_str("2025-12-15 10:00:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let end1 = chrono::NaiveDateTime::parse_from_str("2025-12-15 10:30:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();

    sqlx::query(
        r#"
        INSERT INTO appointments (
            patient_id, provider_id,
            scheduled_start, scheduled_end, duration_minutes,
            type, status, reason,
            created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(patient1.id)
    .bind(testdoctor_id)
    .bind(start1)
    .bind(end1)
    .bind(30_i32)
    .bind("FOLLOW_UP")
    .bind("SCHEDULED")
    .bind("Regular checkup")
    .bind(testdoctor_id)
    .bind(testdoctor_id)
    .execute(&pool)
    .await?;
    println!("✅ Created appointment for John Doe");

    // Appointment 2: Jane Smith - Future appointment
    let start2 = chrono::NaiveDateTime::parse_from_str("2025-12-15 14:00:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let end2 = chrono::NaiveDateTime::parse_from_str("2025-12-15 14:45:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();

    sqlx::query(
        r#"
        INSERT INTO appointments (
            patient_id, provider_id,
            scheduled_start, scheduled_end, duration_minutes,
            type, status, reason,
            created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(patient2.id)
    .bind(testdoctor_id)
    .bind(start2)
    .bind(end2)
    .bind(45_i32)
    .bind("CONSULTATION")
    .bind("SCHEDULED")
    .bind("Initial consultation")
    .bind(testdoctor_id)
    .bind(testdoctor_id)
    .execute(&pool)
    .await?;
    println!("✅ Created appointment for Jane Smith");

    // Appointment 3: Robert Johnson - Past appointment (completed)
    let start3 = chrono::NaiveDateTime::parse_from_str("2025-11-10 09:00:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let end3 = chrono::NaiveDateTime::parse_from_str("2025-11-10 09:30:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let confirmed3 = chrono::NaiveDateTime::parse_from_str("2025-11-09 10:00:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let checked_in3 = chrono::NaiveDateTime::parse_from_str("2025-11-10 09:05:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let checked_out3 = chrono::NaiveDateTime::parse_from_str("2025-11-10 09:35:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();

    sqlx::query(
        r#"
        INSERT INTO appointments (
            patient_id, provider_id,
            scheduled_start, scheduled_end, duration_minutes,
            type, status, reason, confirmed_at, checked_in_at, checked_out_at,
            created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(patient3.id)
    .bind(testdoctor_id)
    .bind(start3)
    .bind(end3)
    .bind(30_i32)
    .bind("FOLLOW_UP")
    .bind("COMPLETED")
    .bind("Follow-up visit")
    .bind(confirmed3)
    .bind(checked_in3)
    .bind(checked_out3)
    .bind(testdoctor_id)
    .bind(testdoctor_id)
    .execute(&pool)
    .await?;
    println!("✅ Created appointment for Robert Johnson");

    // Appointment 4: Maria Garcia - Cancelled appointment
    let start4 = chrono::NaiveDateTime::parse_from_str("2025-12-20 11:00:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let end4 = chrono::NaiveDateTime::parse_from_str("2025-12-20 11:30:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let cancelled4 = chrono::NaiveDateTime::parse_from_str("2025-11-15 14:30:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();

    sqlx::query(
        r#"
        INSERT INTO appointments (
            patient_id, provider_id,
            scheduled_start, scheduled_end, duration_minutes,
            type, status, reason, cancellation_reason, cancelled_by, cancelled_at,
            created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(patient4.id)
    .bind(testdoctor_id)
    .bind(start4)
    .bind(end4)
    .bind(30_i32)
    .bind("CONSULTATION")
    .bind("CANCELLED")
    .bind("New patient consultation")
    .bind("Patient requested reschedule")
    .bind(testdoctor_id)
    .bind(cancelled4)
    .bind(testdoctor_id)
    .bind(testdoctor_id)
    .execute(&pool)
    .await?;
    println!("✅ Created appointment for Maria Garcia");

    // Appointment 5: William Brown - Confirmed appointment
    let start5 = chrono::NaiveDateTime::parse_from_str("2025-12-18 15:30:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();
    let end5 = chrono::NaiveDateTime::parse_from_str("2025-12-18 16:00:00", "%Y-%m-%d %H:%M:%S")
        .unwrap()
        .and_utc();

    sqlx::query(
        r#"
        INSERT INTO appointments (
            patient_id, provider_id,
            scheduled_start, scheduled_end, duration_minutes,
            type, status, reason, confirmed_at, reminder_sent_email,
            created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#,
    )
    .bind(patient5.id)
    .bind(testdoctor_id)
    .bind(start5)
    .bind(end5)
    .bind(30_i32)
    .bind("FOLLOW_UP")
    .bind("CONFIRMED")
    .bind("Follow-up checkup")
    .bind(Utc::now())
    .bind(true)
    .bind(testdoctor_id)
    .bind(testdoctor_id)
    .execute(&pool)
    .await?;
    println!("✅ Created appointment for William Brown");

    // Re-enable RLS
    println!("\n🔒 Re-enabling RLS...");
    sqlx::query("ALTER TABLE patients ENABLE ROW LEVEL SECURITY")
        .execute(&pool)
        .await?;
    sqlx::query("ALTER TABLE appointments ENABLE ROW LEVEL SECURITY")
        .execute(&pool)
        .await?;

    println!("\n✅ Test data seeded successfully!\n");
    println!("═══════════════════════════════════════");
    println!("Test Data Summary:");
    println!("  Patients: 5 (all with encrypted PII)");
    println!("    - John Doe");
    println!("    - Jane Smith");
    println!("    - Robert Johnson");
    println!("    - Maria Garcia");
    println!("    - William Brown");
    println!("  Appointments: 5");
    println!("    - 2 Scheduled (John, Jane)");
    println!("    - 1 Completed (Robert)");
    println!("    - 1 Cancelled (Maria)");
    println!("    - 1 Confirmed (William)");
    println!("═══════════════════════════════════════\n");

    Ok(())
}
