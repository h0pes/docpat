/*!
 * Comprehensive Seed Data Utility
 *
 * Creates comprehensive test data across all tables with proper encryption.
 * This binary seeds: patients, appointments, visits, diagnoses, prescriptions,
 * and generated documents for meaningful reporting and testing.
 *
 * Run with: cargo run --bin seed_comprehensive_data
 *
 * IMPORTANT: This disables RLS during seeding and re-enables it afterward.
 * All sensitive fields are properly encrypted using AES-256-GCM.
 */

use chrono::{DateTime, Duration, NaiveDate, NaiveTime, TimeZone, Utc};
use docpat_backend::models::patient::{ContactMethod, CreatePatientRequest, Gender, Medication as PatientMedication, Patient};
use docpat_backend::utils::encryption::EncryptionKey;
use rand::seq::SliceRandom;
use rand::thread_rng;
use rand::Rng;
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

/// Patient test data structure
struct TestPatient {
    first_name: &'static str,
    last_name: &'static str,
    gender: Gender,
    birth_year: i32,
    birth_month: u32,
    birth_day: u32,
    phone: &'static str,
    blood_type: &'static str,
    contact_method: ContactMethod,
    allergies: Option<&'static [&'static str]>,
    chronic_conditions: Option<&'static [&'static str]>,
    current_medications: Option<&'static [(&'static str, &'static str, &'static str)]>, // (name, dosage, frequency)
}

/// Common ICD-10 codes for elderly/geriatric care
struct ICD10Code {
    code: &'static str,
    description: &'static str,
}

/// Common medications for elderly patients
struct Medication {
    name: &'static str,
    generic_name: &'static str,
    dosage: &'static str,
    form: &'static str,
    route: &'static str,
    frequency: &'static str,
    instructions: &'static str,
}

const TEST_PATIENTS: &[TestPatient] = &[
    TestPatient {
        first_name: "John",
        last_name: "Doe",
        gender: Gender::M,
        birth_year: 1955,
        birth_month: 3,
        birth_day: 15,
        phone: "+39 333 1234567",
        blood_type: "A+",
        contact_method: ContactMethod::Email,
        allergies: Some(&["Penicillin"]),
        chronic_conditions: Some(&["Hypertension", "Type 2 Diabetes"]),
        current_medications: Some(&[("Metformin", "500mg", "Twice daily"), ("Lisinopril", "10mg", "Once daily")]),
    },
    TestPatient {
        first_name: "Maria",
        last_name: "Rossi",
        gender: Gender::F,
        birth_year: 1948,
        birth_month: 7,
        birth_day: 22,
        phone: "+39 333 2345678",
        blood_type: "O+",
        contact_method: ContactMethod::Phone,
        allergies: None,
        chronic_conditions: Some(&["Osteoarthritis", "Osteoporosis"]),
        current_medications: Some(&[("Calcium", "500mg", "Twice daily"), ("Vitamin D", "1000IU", "Once daily")]),
    },
    TestPatient {
        first_name: "Giuseppe",
        last_name: "Bianchi",
        gender: Gender::M,
        birth_year: 1960,
        birth_month: 11,
        birth_day: 8,
        phone: "+39 333 3456789",
        blood_type: "B+",
        contact_method: ContactMethod::Sms,
        allergies: Some(&["Sulfa drugs", "Aspirin"]),
        chronic_conditions: Some(&["COPD", "Atrial Fibrillation"]),
        current_medications: Some(&[("Warfarin", "5mg", "Once daily"), ("Albuterol", "2 puffs", "As needed")]),
    },
    TestPatient {
        first_name: "Anna",
        last_name: "Verdi",
        gender: Gender::F,
        birth_year: 1952,
        birth_month: 1,
        birth_day: 30,
        phone: "+39 333 4567890",
        blood_type: "AB+",
        contact_method: ContactMethod::Whatsapp,
        allergies: None,
        chronic_conditions: Some(&["Hypothyroidism", "Depression"]),
        current_medications: Some(&[("Levothyroxine", "50mcg", "Once daily"), ("Sertraline", "50mg", "Once daily")]),
    },
    TestPatient {
        first_name: "Francesco",
        last_name: "Russo",
        gender: Gender::M,
        birth_year: 1958,
        birth_month: 6,
        birth_day: 12,
        phone: "+39 333 5678901",
        blood_type: "O-",
        contact_method: ContactMethod::Email,
        allergies: Some(&["NSAIDs"]),
        chronic_conditions: Some(&["Chronic Kidney Disease Stage 3"]),
        current_medications: None,
    },
    TestPatient {
        first_name: "Lucia",
        last_name: "Ferrari",
        gender: Gender::F,
        birth_year: 1945,
        birth_month: 9,
        birth_day: 5,
        phone: "+39 333 6789012",
        blood_type: "A-",
        contact_method: ContactMethod::Phone,
        allergies: None,
        chronic_conditions: Some(&["Heart Failure", "Hypertension"]),
        current_medications: Some(&[("Furosemide", "40mg", "Once daily"), ("Enalapril", "5mg", "Once daily")]),
    },
    TestPatient {
        first_name: "Marco",
        last_name: "Romano",
        gender: Gender::M,
        birth_year: 1962,
        birth_month: 4,
        birth_day: 18,
        phone: "+39 333 7890123",
        blood_type: "B-",
        contact_method: ContactMethod::Sms,
        allergies: Some(&["Latex"]),
        chronic_conditions: Some(&["Type 1 Diabetes"]),
        current_medications: Some(&[("Insulin Glargine", "20 units", "Once at bedtime")]),
    },
    TestPatient {
        first_name: "Elena",
        last_name: "Colombo",
        gender: Gender::F,
        birth_year: 1950,
        birth_month: 12,
        birth_day: 25,
        phone: "+39 333 8901234",
        blood_type: "AB-",
        contact_method: ContactMethod::Email,
        allergies: Some(&["Codeine", "Morphine"]),
        chronic_conditions: Some(&["Rheumatoid Arthritis", "Fibromyalgia"]),
        current_medications: Some(&[("Methotrexate", "15mg", "Once weekly"), ("Prednisone", "5mg", "Once daily")]),
    },
    TestPatient {
        first_name: "Paolo",
        last_name: "Ricci",
        gender: Gender::M,
        birth_year: 1956,
        birth_month: 8,
        birth_day: 10,
        phone: "+39 333 9012345",
        blood_type: "O+",
        contact_method: ContactMethod::Whatsapp,
        allergies: None,
        chronic_conditions: Some(&["Parkinson's Disease"]),
        current_medications: Some(&[("Levodopa/Carbidopa", "25/100mg", "Three times daily")]),
    },
    TestPatient {
        first_name: "Carla",
        last_name: "Gallo",
        gender: Gender::F,
        birth_year: 1947,
        birth_month: 2,
        birth_day: 14,
        phone: "+39 333 0123456",
        blood_type: "A+",
        contact_method: ContactMethod::Phone,
        allergies: Some(&["Shellfish"]),
        chronic_conditions: Some(&["Alzheimer's Disease", "Hypertension"]),
        current_medications: Some(&[("Donepezil", "10mg", "Once daily"), ("Amlodipine", "5mg", "Once daily")]),
    },
    TestPatient {
        first_name: "Roberto",
        last_name: "Conti",
        gender: Gender::M,
        birth_year: 1965,
        birth_month: 5,
        birth_day: 20,
        phone: "+39 333 1111222",
        blood_type: "B+",
        contact_method: ContactMethod::Email,
        allergies: None,
        chronic_conditions: Some(&["Gout", "Hyperlipidemia"]),
        current_medications: Some(&[("Allopurinol", "300mg", "Once daily"), ("Atorvastatin", "20mg", "Once daily")]),
    },
    TestPatient {
        first_name: "Francesca",
        last_name: "Martini",
        gender: Gender::F,
        birth_year: 1953,
        birth_month: 10,
        birth_day: 3,
        phone: "+39 333 2222333",
        blood_type: "O-",
        contact_method: ContactMethod::Sms,
        allergies: Some(&["Iodine contrast"]),
        chronic_conditions: Some(&["Chronic Pain Syndrome", "Insomnia"]),
        current_medications: Some(&[("Gabapentin", "300mg", "Three times daily"), ("Trazodone", "50mg", "At bedtime")]),
    },
];

const ICD10_CODES: &[ICD10Code] = &[
    ICD10Code {
        code: "I10",
        description: "Essential (primary) hypertension",
    },
    ICD10Code {
        code: "E11.9",
        description: "Type 2 diabetes mellitus without complications",
    },
    ICD10Code {
        code: "E11.65",
        description: "Type 2 diabetes mellitus with hyperglycemia",
    },
    ICD10Code {
        code: "M17.11",
        description: "Primary osteoarthritis, right knee",
    },
    ICD10Code {
        code: "M17.12",
        description: "Primary osteoarthritis, left knee",
    },
    ICD10Code {
        code: "M81.0",
        description: "Age-related osteoporosis without current pathological fracture",
    },
    ICD10Code {
        code: "J44.1",
        description: "Chronic obstructive pulmonary disease with acute exacerbation",
    },
    ICD10Code {
        code: "I48.91",
        description: "Unspecified atrial fibrillation",
    },
    ICD10Code {
        code: "E03.9",
        description: "Hypothyroidism, unspecified",
    },
    ICD10Code {
        code: "F32.9",
        description: "Major depressive disorder, single episode, unspecified",
    },
    ICD10Code {
        code: "N18.3",
        description: "Chronic kidney disease, stage 3 (moderate)",
    },
    ICD10Code {
        code: "I50.9",
        description: "Heart failure, unspecified",
    },
    ICD10Code {
        code: "G20",
        description: "Parkinson's disease",
    },
    ICD10Code {
        code: "G30.9",
        description: "Alzheimer's disease, unspecified",
    },
    ICD10Code {
        code: "M10.9",
        description: "Gout, unspecified",
    },
    ICD10Code {
        code: "E78.0",
        description: "Pure hypercholesterolemia",
    },
    ICD10Code {
        code: "M79.7",
        description: "Fibromyalgia",
    },
    ICD10Code {
        code: "R52",
        description: "Pain, unspecified",
    },
    ICD10Code {
        code: "G47.00",
        description: "Insomnia, unspecified",
    },
    ICD10Code {
        code: "M06.9",
        description: "Rheumatoid arthritis, unspecified",
    },
    ICD10Code {
        code: "Z23",
        description: "Encounter for immunization",
    },
    ICD10Code {
        code: "Z00.00",
        description: "Encounter for general adult medical examination without abnormal findings",
    },
];

const MEDICATIONS: &[Medication] = &[
    Medication {
        name: "Lisinopril",
        generic_name: "Lisinopril",
        dosage: "10mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily",
        instructions: "Take in the morning with or without food",
    },
    Medication {
        name: "Metformin",
        generic_name: "Metformin Hydrochloride",
        dosage: "500mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Twice daily",
        instructions: "Take with meals to reduce stomach upset",
    },
    Medication {
        name: "Atorvastatin",
        generic_name: "Atorvastatin Calcium",
        dosage: "20mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily at bedtime",
        instructions: "Take at the same time each evening",
    },
    Medication {
        name: "Amlodipine",
        generic_name: "Amlodipine Besylate",
        dosage: "5mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily",
        instructions: "May cause swelling of ankles, report if severe",
    },
    Medication {
        name: "Omeprazole",
        generic_name: "Omeprazole",
        dosage: "20mg",
        form: "CAPSULE",
        route: "ORAL",
        frequency: "Once daily before breakfast",
        instructions: "Take 30 minutes before first meal of the day",
    },
    Medication {
        name: "Levothyroxine",
        generic_name: "Levothyroxine Sodium",
        dosage: "50mcg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily",
        instructions: "Take on empty stomach, 30-60 min before breakfast",
    },
    Medication {
        name: "Gabapentin",
        generic_name: "Gabapentin",
        dosage: "300mg",
        form: "CAPSULE",
        route: "ORAL",
        frequency: "Three times daily",
        instructions: "May cause drowsiness, avoid driving until you know how it affects you",
    },
    Medication {
        name: "Furosemide",
        generic_name: "Furosemide",
        dosage: "40mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily in the morning",
        instructions: "Take in the morning to avoid nighttime urination",
    },
    Medication {
        name: "Warfarin",
        generic_name: "Warfarin Sodium",
        dosage: "5mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily",
        instructions: "Take at the same time each day. Avoid vitamin K rich foods",
    },
    Medication {
        name: "Sertraline",
        generic_name: "Sertraline Hydrochloride",
        dosage: "50mg",
        form: "TABLET",
        route: "ORAL",
        frequency: "Once daily",
        instructions: "May take 2-4 weeks to feel full effect",
    },
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment
    dotenvy::dotenv().ok();

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    println!("🔧 Seeding comprehensive test data...\n");
    println!("═══════════════════════════════════════════════════════════════");

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
    let testdoctor_id: Uuid =
        sqlx::query_scalar("SELECT id FROM users WHERE username = 'testdoctor'")
            .fetch_one(&pool)
            .await
            .expect("testdoctor user not found. Please create it first.");

    let testadmin_id: Uuid =
        sqlx::query_scalar("SELECT id FROM users WHERE username = 'testadmin'")
            .fetch_one(&pool)
            .await
            .expect("testadmin user not found. Please create it first.");

    println!("✅ Found test users");
    println!("   testdoctor ID: {}", testdoctor_id);
    println!("   testadmin ID:  {}", testadmin_id);

    // Get a document template for generated documents
    let template_result: Option<(Uuid, i32)> = sqlx::query_as(
        "SELECT id, version FROM document_templates WHERE template_key = 'visit_summary' AND is_active = true LIMIT 1",
    )
    .fetch_optional(&pool)
    .await?;

    let (template_id, template_version) = template_result.unwrap_or_else(|| {
        println!("⚠️  No active visit_summary template found, will skip document generation");
        (Uuid::nil(), 1)
    });

    // Temporarily disable RLS for seeding
    println!("\n🔓 Disabling RLS for seeding...");
    let tables = [
        "patients",
        "appointments",
        "visits",
        "visit_diagnoses",
        "prescriptions",
        "generated_documents",
    ];
    for table in tables.iter() {
        sqlx::query(&format!("ALTER TABLE {} DISABLE ROW LEVEL SECURITY", table))
            .execute(&pool)
            .await?;
    }

    // Delete existing test data (cascade through foreign keys)
    // Note: We delete ALL data for testdoctor provider to avoid appointment conflicts
    // This is safe because this is test data seeding for a development/test environment
    println!("🗑️  Deleting existing test data for testdoctor provider...");

    // First identify patients to delete (those created by testdoctor)
    let patient_ids: Vec<Uuid> = sqlx::query_scalar("SELECT id FROM patients WHERE created_by = $1")
        .bind(testdoctor_id)
        .fetch_all(&pool)
        .await?;

    // Delete documents for those patients (need to do this first due to FK constraints)
    for patient_id in &patient_ids {
        sqlx::query("DELETE FROM generated_documents WHERE patient_id = $1")
            .bind(patient_id)
            .execute(&pool)
            .await?;
    }

    // Delete documents by provider
    sqlx::query("DELETE FROM generated_documents WHERE provider_id = $1")
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;

    // Delete prescriptions for testdoctor patients and provider
    for patient_id in &patient_ids {
        sqlx::query("DELETE FROM prescriptions WHERE patient_id = $1")
            .bind(patient_id)
            .execute(&pool)
            .await?;
    }
    sqlx::query("DELETE FROM prescriptions WHERE provider_id = $1")
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;

    // Delete visit diagnoses and visits
    sqlx::query("DELETE FROM visit_diagnoses WHERE visit_id IN (SELECT id FROM visits WHERE provider_id = $1)")
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM visits WHERE provider_id = $1")
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;

    // Delete appointments
    sqlx::query("DELETE FROM appointments WHERE provider_id = $1")
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;

    // Finally delete patients
    sqlx::query("DELETE FROM patients WHERE created_by = $1")
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;

    println!("\n📝 Creating test patients...\n");

    let mut rng = thread_rng();
    let mut created_patients: Vec<(Uuid, String, String)> = Vec::new();

    for (idx, patient_data) in TEST_PATIENTS.iter().enumerate() {
        let email = format!(
            "{}.{}@test.docpat",
            patient_data.first_name.to_lowercase(),
            patient_data.last_name.to_lowercase()
        );

        let patient_req = CreatePatientRequest {
            first_name: patient_data.first_name.to_string(),
            last_name: patient_data.last_name.to_string(),
            middle_name: None,
            date_of_birth: NaiveDate::from_ymd_opt(
                patient_data.birth_year,
                patient_data.birth_month,
                patient_data.birth_day,
            )
            .unwrap(),
            gender: patient_data.gender.clone(),
            fiscal_code: None,
            phone_primary: Some(patient_data.phone.to_string()),
            phone_secondary: None,
            email: Some(email),
            preferred_contact_method: Some(patient_data.contact_method.clone()),
            address: None,
            emergency_contact: None,
            blood_type: Some(patient_data.blood_type.to_string()),
            allergies: patient_data.allergies.map(|arr| arr.iter().map(|s| s.to_string()).collect()),
            chronic_conditions: patient_data.chronic_conditions.map(|arr| arr.iter().map(|s| s.to_string()).collect()),
            current_medications: patient_data.current_medications.map(|arr| {
                arr.iter().map(|(name, dosage, frequency)| PatientMedication {
                    name: name.to_string(),
                    dosage: dosage.to_string(),
                    frequency: frequency.to_string(),
                    start_date: None,
                }).collect()
            }),
            health_card_expire: Some(
                NaiveDate::from_ymd_opt(2027, (idx as u32 % 12) + 1, 15).unwrap(),
            ),
            photo_url: None,
            notes: Some(format!(
                "Test patient {} - {} care",
                idx + 1,
                if idx % 2 == 0 {
                    "geriatric"
                } else {
                    "general"
                }
            )),
        };

        let patient = Patient::create(&pool, patient_req, testdoctor_id, &encryption_key).await?;
        created_patients.push((
            patient.id,
            patient_data.first_name.to_string(),
            patient_data.last_name.to_string(),
        ));
        println!(
            "✅ Created patient: {} {} (MRN: {})",
            patient_data.first_name, patient_data.last_name, patient.medical_record_number
        );
    }

    println!("\n📅 Creating appointments...\n");

    let today = Utc::now().date_naive();
    let appointment_types = ["FOLLOW_UP", "CONSULTATION", "NEW_PATIENT", "ROUTINE_CHECKUP", "ACUPUNCTURE"];
    let appointment_statuses = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    let mut created_appointments: Vec<(Uuid, Uuid, NaiveDate, String)> = Vec::new();

    // Track used time slots to avoid overlaps - (date, hour) ensures no overlap
    let mut used_slots: std::collections::HashSet<(NaiveDate, u32)> = std::collections::HashSet::new();

    // Create appointments spanning the last 6 months and next 2 weeks
    for (patient_id, first_name, last_name) in created_patients.iter() {
        // Past appointments (completed, cancelled, no-shows)
        let num_past_appointments = rng.gen_range(3..=6);
        for i in 0..num_past_appointments {
            let days_ago = rng.gen_range(7..180);
            let appt_date = today - Duration::days(days_ago);

            // Find an available hour slot
            let mut hour;
            let mut attempts = 0;
            loop {
                hour = rng.gen_range(9..17);
                if !used_slots.contains(&(appt_date, hour)) || attempts > 20 {
                    break;
                }
                attempts += 1;
            }
            if attempts >= 20 {
                continue; // Skip if we can't find an available slot
            }
            used_slots.insert((appt_date, hour));

            let minute = 0; // Always start on the hour
            let duration = [30, 45].choose(&mut rng).unwrap(); // Max 45 min to avoid overlap

            let start_dt = appt_date
                .and_time(NaiveTime::from_hms_opt(hour, minute, 0).unwrap());
            let start = Utc.from_utc_datetime(&start_dt);
            let end = start + Duration::minutes(*duration as i64);

            // Weighted status for past appointments
            let status = if i == 0 {
                "COMPLETED" // First past appointment is always completed
            } else {
                let roll: f64 = rng.gen();
                if roll < 0.65 {
                    "COMPLETED"
                } else if roll < 0.85 {
                    "CANCELLED"
                } else {
                    "NO_SHOW"
                }
            };

            let appt_type = appointment_types.choose(&mut rng).unwrap();

            let appt_id = Uuid::new_v4();

            if status == "COMPLETED" {
                let confirmed_at = start - Duration::days(1);
                let checked_in = start + Duration::minutes(rng.gen_range(-5..10));
                let checked_out = checked_in + Duration::minutes(*duration as i64 + rng.gen_range(-5..15));

                sqlx::query(
                    r#"
                    INSERT INTO appointments (
                        id, patient_id, provider_id,
                        scheduled_start, scheduled_end, duration_minutes,
                        type, status, reason, confirmed_at, checked_in_at, checked_out_at,
                        created_by, updated_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    "#,
                )
                .bind(appt_id)
                .bind(patient_id)
                .bind(testdoctor_id)
                .bind(start)
                .bind(end)
                .bind(*duration as i32)
                .bind(*appt_type)
                .bind(status)
                .bind(format!("{} visit", appt_type.to_lowercase().replace('_', " ")))
                .bind(confirmed_at)
                .bind(checked_in)
                .bind(checked_out)
                .bind(testdoctor_id)
                .bind(testdoctor_id)
                .execute(&pool)
                .await?;

                created_appointments.push((appt_id, *patient_id, appt_date, status.to_string()));
            } else if status == "CANCELLED" {
                let cancelled_at = start - Duration::days(rng.gen_range(1..5));
                sqlx::query(
                    r#"
                    INSERT INTO appointments (
                        id, patient_id, provider_id,
                        scheduled_start, scheduled_end, duration_minutes,
                        type, status, reason, cancellation_reason, cancelled_by, cancelled_at,
                        created_by, updated_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    "#,
                )
                .bind(appt_id)
                .bind(patient_id)
                .bind(testdoctor_id)
                .bind(start)
                .bind(end)
                .bind(*duration as i32)
                .bind(*appt_type)
                .bind(status)
                .bind(format!("{} visit", appt_type.to_lowercase().replace('_', " ")))
                .bind("Patient requested reschedule")
                .bind(testdoctor_id)
                .bind(cancelled_at)
                .bind(testdoctor_id)
                .bind(testdoctor_id)
                .execute(&pool)
                .await?;
            } else {
                // NO_SHOW
                sqlx::query(
                    r#"
                    INSERT INTO appointments (
                        id, patient_id, provider_id,
                        scheduled_start, scheduled_end, duration_minutes,
                        type, status, reason,
                        created_by, updated_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    "#,
                )
                .bind(appt_id)
                .bind(patient_id)
                .bind(testdoctor_id)
                .bind(start)
                .bind(end)
                .bind(*duration as i32)
                .bind(*appt_type)
                .bind(status)
                .bind(format!("{} visit", appt_type.to_lowercase().replace('_', " ")))
                .bind(testdoctor_id)
                .bind(testdoctor_id)
                .execute(&pool)
                .await?;
            }
        }

        // Future appointments (scheduled, confirmed)
        let num_future_appointments = rng.gen_range(0..=2);
        for _ in 0..num_future_appointments {
            let days_ahead = rng.gen_range(1..14);
            let appt_date = today + Duration::days(days_ahead);

            // Find an available hour slot
            let mut hour;
            let mut attempts = 0;
            loop {
                hour = rng.gen_range(9..17);
                if !used_slots.contains(&(appt_date, hour)) || attempts > 20 {
                    break;
                }
                attempts += 1;
            }
            if attempts >= 20 {
                continue; // Skip if we can't find an available slot
            }
            used_slots.insert((appt_date, hour));

            let minute = 0; // Always start on the hour
            let duration = [30, 45].choose(&mut rng).unwrap();

            let start_dt = appt_date
                .and_time(NaiveTime::from_hms_opt(hour, minute, 0).unwrap());
            let start = Utc.from_utc_datetime(&start_dt);
            let end = start + Duration::minutes(*duration as i64);

            let status = if rng.gen_bool(0.6) {
                "CONFIRMED"
            } else {
                "SCHEDULED"
            };
            let appt_type = appointment_types.choose(&mut rng).unwrap();

            let appt_id = Uuid::new_v4();

            if status == "CONFIRMED" {
                sqlx::query(
                    r#"
                    INSERT INTO appointments (
                        id, patient_id, provider_id,
                        scheduled_start, scheduled_end, duration_minutes,
                        type, status, reason, confirmed_at, reminder_sent_email,
                        created_by, updated_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    "#,
                )
                .bind(appt_id)
                .bind(patient_id)
                .bind(testdoctor_id)
                .bind(start)
                .bind(end)
                .bind(*duration as i32)
                .bind(*appt_type)
                .bind(status)
                .bind(format!("{} visit", appt_type.to_lowercase().replace('_', " ")))
                .bind(Utc::now())
                .bind(true)
                .bind(testdoctor_id)
                .bind(testdoctor_id)
                .execute(&pool)
                .await?;
            } else {
                sqlx::query(
                    r#"
                    INSERT INTO appointments (
                        id, patient_id, provider_id,
                        scheduled_start, scheduled_end, duration_minutes,
                        type, status, reason,
                        created_by, updated_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    "#,
                )
                .bind(appt_id)
                .bind(patient_id)
                .bind(testdoctor_id)
                .bind(start)
                .bind(end)
                .bind(*duration as i32)
                .bind(*appt_type)
                .bind(status)
                .bind(format!("{} visit", appt_type.to_lowercase().replace('_', " ")))
                .bind(testdoctor_id)
                .bind(testdoctor_id)
                .execute(&pool)
                .await?;
            }
        }

        println!("✅ Created appointments for {} {}", first_name, last_name);
    }

    println!("\n🏥 Creating visits for completed appointments...\n");

    let visit_types = ["FOLLOW_UP", "CONSULTATION", "ROUTINE_CHECKUP", "NEW_PATIENT", "ACUPUNCTURE"];
    let mut created_visits: Vec<(Uuid, Uuid, NaiveDate)> = Vec::new();

    // Filter to only completed appointments
    let completed_appointments: Vec<_> = created_appointments
        .iter()
        .filter(|(_, _, _, status)| status == "COMPLETED")
        .collect();

    for (appt_id, patient_id, visit_date, _) in completed_appointments.iter() {
        let visit_id = Uuid::new_v4();
        let visit_type = visit_types.choose(&mut rng).unwrap();

        // Generate vital signs
        let vitals = json!({
            "blood_pressure_systolic": rng.gen_range(110.0..160.0) as f32,
            "blood_pressure_diastolic": rng.gen_range(65.0..100.0) as f32,
            "heart_rate": rng.gen_range(60.0..100.0) as f32,
            "respiratory_rate": rng.gen_range(12.0..20.0) as f32,
            "temperature_celsius": rng.gen_range(36.2..37.5) as f32,
            "weight_kg": rng.gen_range(55.0..95.0) as f32,
            "height_cm": rng.gen_range(155.0..185.0) as f32,
            "oxygen_saturation": rng.gen_range(95.0..100.0) as f32
        });
        let encrypted_vitals = encryption_key.encrypt(&serde_json::to_string(&vitals)?)?;

        // Generate SOAP notes
        let subjective = format!(
            "Patient presents for {} visit. Reports {}. {}",
            visit_type.to_lowercase().replace('_', " "),
            ["feeling well", "mild fatigue", "some joint pain", "occasional dizziness", "good energy levels"]
                .choose(&mut rng)
                .unwrap(),
            ["Sleep has been good.", "Appetite is normal.", "No new complaints.", "Medications well tolerated."]
                .choose(&mut rng)
                .unwrap()
        );
        let encrypted_subjective = encryption_key.encrypt(&subjective)?;

        let objective = format!(
            "Alert and oriented. {}. {}. {}",
            ["No acute distress", "Appears comfortable", "Well-groomed and cooperative"]
                .choose(&mut rng)
                .unwrap(),
            ["Heart sounds regular", "Lungs clear to auscultation", "Abdomen soft, non-tender"]
                .choose(&mut rng)
                .unwrap(),
            ["Extremities without edema", "Good peripheral pulses", "Full range of motion"]
                .choose(&mut rng)
                .unwrap()
        );
        let encrypted_objective = encryption_key.encrypt(&objective)?;

        let assessment = format!(
            "{}. {}",
            ["Stable chronic conditions", "Well-controlled hypertension", "Diabetes under good control",
             "Improving mobility", "Stable cardiac status"]
                .choose(&mut rng)
                .unwrap(),
            ["Continue current management.", "Condition is stable.", "No acute concerns."]
                .choose(&mut rng)
                .unwrap()
        );
        let encrypted_assessment = encryption_key.encrypt(&assessment)?;

        let plan = format!(
            "1. {} 2. {} 3. {}",
            ["Continue current medications.", "Adjust medication as needed.", "Renew prescriptions."]
                .choose(&mut rng)
                .unwrap(),
            ["Follow up in 3 months.", "Schedule lab work.", "Return as needed."]
                .choose(&mut rng)
                .unwrap(),
            ["Diet and exercise counseling provided.", "Patient education completed.", "Screening discussed."]
                .choose(&mut rng)
                .unwrap()
        );
        let encrypted_plan = encryption_key.encrypt(&plan)?;

        let chief_complaint = format!(
            "{}",
            ["Routine follow-up", "Medication refill", "General checkup", "Blood pressure check", "Wellness visit"]
                .choose(&mut rng)
                .unwrap()
        );
        let encrypted_chief_complaint = encryption_key.encrypt(&chief_complaint)?;

        // Determine visit status (most are SIGNED or LOCKED for past visits)
        let (status, signed_at, signed_by, locked_at) = {
            let roll: f64 = rng.gen();
            if roll < 0.5 {
                let signed = Utc.from_utc_datetime(
                    &visit_date.and_time(NaiveTime::from_hms_opt(17, 0, 0).unwrap()),
                );
                let locked = signed + Duration::days(1);
                ("LOCKED", Some(signed), Some(testdoctor_id), Some(locked))
            } else if roll < 0.9 {
                let signed = Utc.from_utc_datetime(
                    &visit_date.and_time(NaiveTime::from_hms_opt(17, 0, 0).unwrap()),
                );
                ("SIGNED", Some(signed), Some(testdoctor_id), None)
            } else {
                ("DRAFT", None, None, None)
            }
        };

        let visit_time = Utc.from_utc_datetime(
            &visit_date.and_time(NaiveTime::from_hms_opt(10, 0, 0).unwrap()),
        );

        // Handle follow_up_required with appropriate follow_up_date
        // The check constraint requires: (follow_up_required = true AND follow_up_date IS NOT NULL) OR follow_up_required = false
        let follow_up_required = rng.gen_bool(0.3);
        let follow_up_date: Option<NaiveDate> = if follow_up_required {
            Some(*visit_date + Duration::days(rng.gen_range(30..90)))
        } else {
            None
        };

        sqlx::query(
            r#"
            INSERT INTO visits (
                id, appointment_id, patient_id, provider_id,
                visit_date, visit_time, visit_type,
                vitals, subjective, objective, assessment, plan,
                chief_complaint, status, version,
                signed_at, signed_by, locked_at,
                follow_up_required, follow_up_date, has_attachments,
                created_by, updated_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            )
            "#,
        )
        .bind(visit_id)
        .bind(appt_id)
        .bind(patient_id)
        .bind(testdoctor_id)
        .bind(visit_date)
        .bind(visit_time)
        .bind(*visit_type)
        .bind(encrypted_vitals)
        .bind(encrypted_subjective)
        .bind(encrypted_objective)
        .bind(encrypted_assessment)
        .bind(encrypted_plan)
        .bind(encrypted_chief_complaint)
        .bind(status)
        .bind(1_i32) // version
        .bind(signed_at)
        .bind(signed_by)
        .bind(locked_at)
        .bind(follow_up_required)
        .bind(follow_up_date)
        .bind(false) // has_attachments
        .bind(testdoctor_id)
        .bind(testdoctor_id)
        .execute(&pool)
        .await?;

        created_visits.push((visit_id, *patient_id, *visit_date));
    }

    println!("✅ Created {} visits", created_visits.len());

    println!("\n🔬 Creating diagnoses...\n");

    let mut diagnosis_count = 0;
    for (visit_id, patient_id, visit_date) in created_visits.iter() {
        // 1-3 diagnoses per visit
        let num_diagnoses = rng.gen_range(1..=3);
        let selected_codes: Vec<_> = ICD10_CODES
            .choose_multiple(&mut rng, num_diagnoses)
            .collect();

        for (idx, icd_code) in selected_codes.iter().enumerate() {
            let diagnosis_id = Uuid::new_v4();
            let is_primary = idx == 0;
            let diagnosis_type = ["CONFIRMED", "PROVISIONAL", "DIFFERENTIAL"]
                .choose(&mut rng)
                .unwrap();

            let clinical_notes = format!(
                "{}. {}",
                ["Patient has history of this condition", "Newly diagnosed", "Stable condition", "Requires monitoring"]
                    .choose(&mut rng)
                    .unwrap(),
                ["Continue current treatment.", "Adjust management as needed.", "Follow guidelines."]
                    .choose(&mut rng)
                    .unwrap()
            );
            let encrypted_notes = encryption_key.encrypt(&clinical_notes)?;

            sqlx::query(
                r#"
                INSERT INTO visit_diagnoses (
                    id, visit_id, visit_date, patient_id,
                    icd10_code, icd10_description,
                    is_primary, diagnosis_type, clinical_notes,
                    is_active,
                    created_by, updated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                "#,
            )
            .bind(diagnosis_id)
            .bind(visit_id)
            .bind(visit_date)
            .bind(patient_id)
            .bind(icd_code.code)
            .bind(icd_code.description)
            .bind(is_primary)
            .bind(*diagnosis_type)
            .bind(encrypted_notes)
            .bind(true) // is_active
            .bind(testdoctor_id)
            .bind(testdoctor_id)
            .execute(&pool)
            .await?;

            diagnosis_count += 1;
        }
    }

    println!("✅ Created {} diagnoses", diagnosis_count);

    println!("\n💊 Creating prescriptions...\n");

    let mut prescription_count = 0;
    for (visit_id, patient_id, visit_date) in created_visits.iter() {
        // 0-3 prescriptions per visit
        let num_prescriptions = rng.gen_range(0..=3);
        if num_prescriptions == 0 {
            continue;
        }

        let selected_meds: Vec<_> = MEDICATIONS
            .choose_multiple(&mut rng, num_prescriptions)
            .collect();

        for med in selected_meds {
            let prescription_id = Uuid::new_v4();

            // Encrypt medication data
            let encrypted_name = encryption_key.encrypt(med.name)?;
            let encrypted_generic = encryption_key.encrypt(med.generic_name)?;
            let encrypted_dosage = encryption_key.encrypt(med.dosage)?;
            let encrypted_frequency = encryption_key.encrypt(med.frequency)?;
            let encrypted_instructions = encryption_key.encrypt(med.instructions)?;
            let encrypted_duration = encryption_key.encrypt("30 days")?;

            // Determine status based on date
            let days_since = (today - *visit_date).num_days();
            let (status, discontinuation_reason, discontinued_at): (&str, Option<String>, Option<DateTime<Utc>>) = if days_since > 90 {
                ("COMPLETED", None, None)
            } else if rng.gen_bool(0.1) {
                // DISCONTINUED requires discontinuation_reason and discontinued_at
                let reasons = [
                    "Patient experienced side effects",
                    "No longer needed",
                    "Switched to alternative medication",
                    "Patient request",
                    "Therapy completed",
                ];
                let reason = reasons.choose(&mut rng).unwrap().to_string();
                let disc_at = Utc.from_utc_datetime(
                    &(*visit_date + Duration::days(rng.gen_range(7..30)))
                        .and_time(NaiveTime::from_hms_opt(14, 0, 0).unwrap())
                );
                ("DISCONTINUED", Some(reason), Some(disc_at))
            } else {
                ("ACTIVE", None, None)
            };

            let refills = rng.gen_range(0..=3_i32);
            let refills_remaining = if status == "ACTIVE" {
                Some(refills)
            } else if status == "COMPLETED" {
                Some(0)
            } else {
                Some(refills)
            };

            sqlx::query(
                r#"
                INSERT INTO prescriptions (
                    id, visit_id, visit_date, patient_id, provider_id,
                    medication_name, generic_name, dosage, form, route,
                    frequency, duration, quantity, refills,
                    instructions,
                    prescribed_date, start_date,
                    status, refills_remaining,
                    discontinuation_reason, discontinued_at,
                    has_interactions,
                    created_by, updated_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
                )
                "#,
            )
            .bind(prescription_id)
            .bind(visit_id)
            .bind(visit_date)
            .bind(patient_id)
            .bind(testdoctor_id)
            .bind(encrypted_name)
            .bind(encrypted_generic)
            .bind(encrypted_dosage)
            .bind(med.form)
            .bind(med.route)
            .bind(encrypted_frequency)
            .bind(encrypted_duration)
            .bind(rng.gen_range(30..=90_i32)) // quantity
            .bind(refills)
            .bind(encrypted_instructions)
            .bind(visit_date)
            .bind(visit_date)
            .bind(status)
            .bind(refills_remaining)
            .bind(discontinuation_reason)
            .bind(discontinued_at)
            .bind(false) // has_interactions
            .bind(testdoctor_id)
            .bind(testdoctor_id)
            .execute(&pool)
            .await?;

            prescription_count += 1;
        }
    }

    println!("✅ Created {} prescriptions", prescription_count);

    // Only create generated documents if we have a valid template
    if template_id != Uuid::nil() {
        println!("\n📄 Creating generated documents...\n");

        let mut document_count = 0;
        // Create documents for some visits
        let visits_with_docs: Vec<_> = created_visits
            .choose_multiple(&mut rng, created_visits.len() / 2)
            .collect();

        for (visit_id, patient_id, visit_date) in visits_with_docs {
            let doc_id = Uuid::new_v4();
            let doc_title = format!("Visit Summary - {}", visit_date.format("%Y-%m-%d"));
            let doc_filename = format!("visit_summary_{}_{}.pdf", patient_id, visit_date.format("%Y%m%d"));

            let status = ["GENERATED", "DELIVERED"].choose(&mut rng).unwrap();
            let is_signed = rng.gen_bool(0.7);

            let signed_at = if is_signed {
                Some(Utc.from_utc_datetime(
                    &visit_date.and_time(NaiveTime::from_hms_opt(18, 0, 0).unwrap()),
                ))
            } else {
                None
            };

            let delivered_at = if *status == "DELIVERED" {
                Some(Utc.from_utc_datetime(
                    &visit_date.and_time(NaiveTime::from_hms_opt(19, 0, 0).unwrap()),
                ))
            } else {
                None
            };

            sqlx::query(
                r#"
                INSERT INTO generated_documents (
                    id, template_id, patient_id, visit_id, visit_date, provider_id,
                    document_type, document_title, document_filename,
                    file_path, file_size_bytes,
                    template_version, status,
                    delivered_to, delivered_at,
                    is_signed, signed_at, signed_by,
                    created_by, updated_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
                )
                "#,
            )
            .bind(doc_id)
            .bind(template_id)
            .bind(patient_id)
            .bind(visit_id)
            .bind(visit_date)
            .bind(testdoctor_id)
            .bind("VISIT_SUMMARY")
            .bind(&doc_title)
            .bind(&doc_filename)
            .bind(format!("/documents/{}/{}", patient_id, doc_filename))
            .bind(rng.gen_range(50000..200000_i64))
            .bind(template_version)
            .bind(*status)
            .bind(if *status == "DELIVERED" { Some("patient@email.com") } else { None })
            .bind(delivered_at)
            .bind(is_signed)
            .bind(signed_at)
            .bind(if is_signed { Some(testdoctor_id) } else { None })
            .bind(testdoctor_id)
            .bind(testdoctor_id)
            .execute(&pool)
            .await?;

            document_count += 1;
        }

        println!("✅ Created {} generated documents", document_count);
    }

    // Re-enable RLS
    println!("\n🔒 Re-enabling RLS...");
    for table in tables.iter() {
        sqlx::query(&format!("ALTER TABLE {} ENABLE ROW LEVEL SECURITY", table))
            .execute(&pool)
            .await?;
    }

    // Print summary
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("✅ Comprehensive test data seeded successfully!\n");
    println!("Summary:");
    println!("  Patients:      {}", created_patients.len());

    // Count appointments
    let appt_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM appointments WHERE patient_id IN (SELECT id FROM patients WHERE email LIKE '%@test.docpat')"
    ).fetch_one(&pool).await?;
    println!("  Appointments:  {}", appt_count.0);

    println!("  Visits:        {}", created_visits.len());
    println!("  Diagnoses:     {}", diagnosis_count);
    println!("  Prescriptions: {}", prescription_count);

    if template_id != Uuid::nil() {
        let doc_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM generated_documents WHERE patient_id IN (SELECT id FROM patients WHERE email LIKE '%@test.docpat')"
        ).fetch_one(&pool).await?;
        println!("  Documents:     {}", doc_count.0);
    }

    println!("\n═══════════════════════════════════════════════════════════════\n");

    Ok(())
}
