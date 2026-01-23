/*!
 * Patient Management Integration Tests
 *
 * Comprehensive integration tests for patient management endpoints:
 * - Create patient (POST /api/v1/patients)
 * - Get patient (GET /api/v1/patients/:id)
 * - Update patient (PUT /api/v1/patients/:id)
 * - Delete patient (DELETE /api/v1/patients/:id)
 * - List patients (GET /api/v1/patients)
 * - Search patients (GET /api/v1/patients/search)
 * - Get statistics (GET /api/v1/patients/statistics)
 * - Duplicate detection (fiscal code, name+DOB)
 * - Data encryption/decryption round-trip
 * - RBAC permission enforcement
 */

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

mod test_utils;
use test_utils::{teardown_test_db, TestApp, TestUser};

/// Generate a unique username suffix to avoid conflicts between tests
fn unique_suffix() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    format!("{}", timestamp % 1000000) // Last 6 digits for brevity
}

/// Helper function to setup test environment with clean database
async fn setup_test() -> (axum::Router, sqlx::PgPool) {
    let (app, pool) = TestApp::new().await;
    // Clean database before each test
    teardown_test_db(&pool).await;
    (app, pool)
}

/// Helper function to read response body as bytes
async fn body_to_bytes(body: axum::body::Body) -> bytes::Bytes {
    body.collect().await.unwrap().to_bytes()
}

/// Helper function to login and get access token
async fn login_and_get_token(app: &axum::Router, username: &str, password: &str) -> String {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": username,
                        "password": password
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    json["tokens"]["access_token"].as_str().unwrap().to_string()
}

/// Helper function to create a test patient
async fn create_test_patient(
    app: &axum::Router,
    token: &str,
    first_name: &str,
    last_name: &str,
    fiscal_code: Option<&str>,
) -> Value {
    let mut patient_data = json!({
        "first_name": first_name,
        "last_name": last_name,
        "date_of_birth": "1980-01-15",
        "gender": "M",
        "phone_primary": "+393401234567",
        "email": format!("{}.{}@test.com", first_name.to_lowercase(), last_name.to_lowercase()),
        "preferred_contact_method": "PHONE",
        "blood_type": "A+",
        "health_card_expire": "2027-12-31",
    });

    if let Some(fc) = fiscal_code {
        patient_data["fiscal_code"] = json!(fc);
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(patient_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(response.into_body()).await;
    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// CREATE PATIENT TESTS
// ============================================================================

/// Test: Doctor can create a new patient with valid data
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Mario",
                        "last_name": "Rossi",
                        "date_of_birth": "1950-05-15",
                        "gender": "M",
                        "fiscal_code": "RSSMRA50E15H501Z",
                        "phone_primary": "+393401234567",
                        "email": "mario.rossi@test.com",
                        "preferred_contact_method": "PHONE",
                        "address": {
                            "street": "Via Roma 123",
                            "city": "Rome",
                            "state": "RM",
                            "zip": "00100",
                            "country": "IT"
                        },
                        "emergency_contact": {
                            "name": "Giulia Rossi",
                            "relationship": "Daughter",
                            "phone": "+393401234568"
                        },
                        "blood_type": "A+",
                        "allergies": ["Penicillin", "Peanuts"],
                        "chronic_conditions": ["Hypertension", "Diabetes Type 2"],
                        "health_card_expire": "2027-12-31",
                        "notes": "Regular patient, visits monthly for checkup"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;

    // Debug output if test fails
    if status != StatusCode::CREATED {
        eprintln!("Status: {}", status);
        eprintln!("Body: {}", String::from_utf8_lossy(&body));
    }

    assert_eq!(status, StatusCode::CREATED);

    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["first_name"], "Mario");
    assert_eq!(json["last_name"], "Rossi");
    assert_eq!(json["fiscal_code"], "RSSMRA50E15H501Z");
    assert_eq!(json["email"], "mario.rossi@test.com");
    assert_eq!(json["blood_type"], "A+");
    assert!(json["allergies"].is_array());
    assert_eq!(json["allergies"][0], "Penicillin");
    assert!(json["id"].is_string());
    assert!(json["medical_record_number"].is_string());

    teardown_test_db(&pool).await;
}

/// Test: Admin can create a new patient
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "first_name": "Giulia",
                        "last_name": "Bianchi",
                        "date_of_birth": "1960-03-20",
                        "gender": "F",
                        "phone_primary": "+393401234569",
                        "email": "giulia.bianchi@test.com",
                        "preferred_contact_method": "EMAIL",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["first_name"], "Giulia");
    assert_eq!(json["last_name"], "Bianchi");
    assert_eq!(json["gender"], "F");

    teardown_test_db(&pool).await;
}

/// Test: Create patient without authentication fails
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_unauthorized() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Patient",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

/// Test: Create patient with invalid fiscal code fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_invalid_fiscal_code() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Invalid",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                        "fiscal_code": "INVALID123",  // Invalid format (must be 16 chars)
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json["message"].as_str().unwrap().to_lowercase().contains("fiscal"));

    teardown_test_db(&pool).await;
}

/// Test: Create patient with invalid email fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_invalid_email() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Invalid",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                        "email": "not-an-email",  // Invalid email format
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

/// Test: Create patient with invalid phone fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_invalid_phone() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Invalid",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                        "phone_primary": "12345",  // Invalid phone (not E.164 format)
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

/// Test: Create patient with invalid blood type fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_invalid_blood_type() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Invalid",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                        "blood_type": "Z+",  // Invalid blood type
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

// ============================================================================
// DUPLICATE DETECTION TESTS
// ============================================================================

/// Test: Create patient with duplicate fiscal code fails (high confidence)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_duplicate_fiscal_code() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create first patient with fiscal code
    let _first_patient = create_test_patient(
        &app,
        &doctor_token,
        "Mario",
        "Rossi",
        Some("RSSMRA50E15H501Z"),
    )
    .await;

    // Try to create second patient with same fiscal code
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Giovanni",
                        "last_name": "Verdi",
                        "date_of_birth": "1955-08-20",
                        "gender": "M",
                        "fiscal_code": "RSSMRA50E15H501Z",  // Same fiscal code
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;

    // Debug output
    if status != StatusCode::CONFLICT {
        eprintln!("Expected CONFLICT but got: {}", status);
        eprintln!("Body: {}", String::from_utf8_lossy(&body));
    }

    assert_eq!(status, StatusCode::CONFLICT);

    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json["message"]
        .as_str()
        .unwrap()
        .to_lowercase()
        .contains("fiscal code"));

    teardown_test_db(&pool).await;
}

/// Test: Create patient with same name and DOB (medium confidence) - should succeed with warning
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_patient_duplicate_name_dob() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create first patient
    let _first_patient = create_test_patient(
        &app,
        &doctor_token,
        "Mario",
        "Rossi",
        None, // No fiscal code
    )
    .await;

    // Create second patient with same name and DOB but different fiscal code
    // This should succeed but log a warning
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Mario",
                        "last_name": "Rossi",
                        "date_of_birth": "1980-01-15",  // Same as test patient
                        "gender": "M",
                        "fiscal_code": "RSSMRA80A15H501X",  // Different fiscal code
                        "phone_primary": "+393401234590",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should succeed even with potential duplicate (medium confidence)
    assert_eq!(response.status(), StatusCode::CREATED);

    teardown_test_db(&pool).await;
}

// ============================================================================
// GET PATIENT TESTS
// ============================================================================

/// Test: Doctor can get patient by ID
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create a test patient
    let created_patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Get the patient
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], patient_id);
    assert_eq!(json["first_name"], "Mario");
    assert_eq!(json["last_name"], "Rossi");

    teardown_test_db(&pool).await;
}

/// Test: Admin can get patient by ID
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Doctor creates a patient
    let created_patient = create_test_patient(&app, &doctor_token, "Giulia", "Bianchi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Admin gets the patient
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}

/// Test: Get non-existent patient returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_patient() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let fake_id = uuid::Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}", fake_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

/// Test: Get patient without authentication fails
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_unauthorized() {
    let (app, pool) = setup_test().await;

    let fake_id = uuid::Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}", fake_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

// ============================================================================
// UPDATE PATIENT TESTS
// ============================================================================

/// Test: Doctor can update patient information
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_patient_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create a test patient
    let created_patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Update the patient
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "email": "mario.rossi.updated@test.com",
                        "phone_primary": "+393401234999",
                        "notes": "Updated notes for patient"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["email"], "mario.rossi.updated@test.com");
    assert_eq!(json["phone_primary"], "+393401234999");
    assert_eq!(json["notes"], "Updated notes for patient");

    teardown_test_db(&pool).await;
}

/// Test: Admin can update patient information
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_patient_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Doctor creates a patient
    let created_patient = create_test_patient(&app, &doctor_token, "Giulia", "Bianchi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Admin updates the patient
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "first_name": "Giulia Maria"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}

/// Test: Update patient with invalid data fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_patient_invalid_email() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create a test patient
    let created_patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Try to update with invalid email
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "email": "not-an-email"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

/// Test: Update non-existent patient returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_nonexistent_patient() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let fake_id = uuid::Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/patients/{}", fake_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "email": "test@test.com"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// DELETE PATIENT TESTS
// ============================================================================

/// Test: Admin can delete (deactivate) patient
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_patient_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Doctor creates a patient
    let created_patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Admin deletes the patient
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify patient status is INACTIVE
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(get_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "INACTIVE");

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot delete patient (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_patient_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Doctor creates a patient
    let created_patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let patient_id = created_patient["id"].as_str().unwrap();

    // Doctor tries to delete the patient
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

/// Test: Delete non-existent patient returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_nonexistent_patient() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let fake_id = uuid::Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/patients/{}", fake_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// LIST PATIENTS TESTS
// ============================================================================

/// Test: Doctor can list patients
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_patients_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create multiple test patients
    let _patient1 = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let _patient2 = create_test_patient(&app, &doctor_token, "Giulia", "Bianchi", None).await;
    let _patient3 = create_test_patient(&app, &doctor_token, "Luigi", "Verdi", None).await;

    // List patients
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["patients"].is_array());
    assert!(json["patients"].as_array().unwrap().len() >= 3);
    assert!(json["total"].is_number());
    assert!(json["total"].as_i64().unwrap() >= 3);

    teardown_test_db(&pool).await;
}

/// Test: List patients with pagination
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_patients_with_pagination() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create 5 test patients
    for i in 1..=5 {
        create_test_patient(&app, &doctor_token, &format!("Patient{}", i), "Test", None).await;
    }

    // List with pagination (limit=2, offset=0)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients?limit=2&offset=0")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["limit"], 2);
    assert_eq!(json["offset"], 0);
    assert_eq!(json["patients"].as_array().unwrap().len(), 2);
    assert!(json["total"].as_i64().unwrap() >= 5);

    teardown_test_db(&pool).await;
}

/// Test: Admin can list patients
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_patients_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Doctor creates patients
    let _patient1 = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let _patient2 = create_test_patient(&app, &doctor_token, "Giulia", "Bianchi", None).await;

    // Admin lists patients
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}

// ============================================================================
// SEARCH PATIENTS TESTS
// ============================================================================

/// Test: Search patients by name
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_search_patients_by_name() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create test patients
    let _patient1 = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let _patient2 = create_test_patient(&app, &doctor_token, "Maria", "Bianchi", None).await;
    let _patient3 = create_test_patient(&app, &doctor_token, "Luigi", "Verdi", None).await;

    // Search for "Mario"
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients/search?query=Mario")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["patients"].is_array());
    let patients = json["patients"].as_array().unwrap();
    assert!(patients.len() >= 1);

    // Verify at least one result contains "Mario"
    let has_mario = patients
        .iter()
        .any(|p| p["first_name"].as_str().unwrap().contains("Mario"));
    assert!(has_mario);

    teardown_test_db(&pool).await;
}

/// Test: Search patients by gender filter
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_search_patients_by_gender() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create test patients with different genders
    let _patient1 = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;

    // Create a female patient
    let response_f = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Giulia",
                        "last_name": "Bianchi",
                        "date_of_birth": "1985-03-20",
                        "gender": "F",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response_f.status(), StatusCode::CREATED);

    // Search for female patients
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients/search?gender=F")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All results should be female
    let patients = json["patients"].as_array().unwrap();
    for patient in patients {
        assert_eq!(patient["gender"], "F");
    }

    teardown_test_db(&pool).await;
}

/// Test: Search patients by status filter
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_search_patients_by_status() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create active patient
    let patient1 = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let patient_id = patient1["id"].as_str().unwrap();

    // Admin deactivates the patient
    let _delete_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Create another active patient
    let _patient2 = create_test_patient(&app, &doctor_token, "Giulia", "Bianchi", None).await;

    // Search for inactive patients
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients/search?status=INACTIVE")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All results should be inactive
    let patients = json["patients"].as_array().unwrap();
    for patient in patients {
        assert_eq!(patient["status"], "INACTIVE");
    }

    teardown_test_db(&pool).await;
}

// ============================================================================
// GET STATISTICS TESTS
// ============================================================================

/// Test: Get patient statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_statistics_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create test patients
    let _patient1 = create_test_patient(&app, &doctor_token, "Mario", "Rossi", None).await;
    let _patient2 = create_test_patient(&app, &doctor_token, "Giulia", "Bianchi", None).await;
    let _patient3 = create_test_patient(&app, &doctor_token, "Luigi", "Verdi", None).await;

    // Get statistics
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients/statistics")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["total_patients"].is_number());
    assert!(json["total_patients"].as_i64().unwrap() >= 3);
    assert!(json["by_status"].is_object());

    teardown_test_db(&pool).await;
}

/// Test: Admin can get patient statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_statistics_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    // Get statistics
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/patients/statistics")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}

// ============================================================================
// DATA ENCRYPTION TESTS
// ============================================================================

/// Test: Verify patient data is encrypted and decrypted correctly
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_patient_encryption_decryption() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create patient with sensitive data
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "TestEncryption",
                        "last_name": "Patient",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                        "fiscal_code": "TSTENC70A01H501Z",
                        "phone_primary": "+393401234567",
                        "email": "encryption.test@test.com",
                        "notes": "Sensitive medical information that should be encrypted",
                        "allergies": ["Drug A", "Drug B"],
                        "chronic_conditions": ["Condition X", "Condition Y"],
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let create_body = body_to_bytes(response.into_body()).await;
    let created: Value = serde_json::from_slice(&create_body).unwrap();
    let patient_id = created["id"].as_str().unwrap();

    // Get patient to verify data can be decrypted
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::OK);

    let get_body = body_to_bytes(get_response.into_body()).await;
    let retrieved: Value = serde_json::from_slice(&get_body).unwrap();

    // Verify all data matches (was encrypted and decrypted correctly)
    assert_eq!(retrieved["first_name"], "TestEncryption");
    assert_eq!(retrieved["last_name"], "Patient");
    assert_eq!(retrieved["fiscal_code"], "TSTENC70A01H501Z");
    assert_eq!(retrieved["phone_primary"], "+393401234567");
    assert_eq!(retrieved["email"], "encryption.test@test.com");
    assert_eq!(retrieved["notes"], "Sensitive medical information that should be encrypted");
    assert_eq!(retrieved["allergies"][0], "Drug A");
    assert_eq!(retrieved["chronic_conditions"][0], "Condition X");

    teardown_test_db(&pool).await;
}

/// Test: Verify data is actually encrypted in database
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_patient_data_encrypted_in_database() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create patient with sensitive data
    let sensitive_name = "SecretPatientName";
    let sensitive_fiscal_code = "SCRTPT70A01H501Z";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": sensitive_name,
                        "last_name": "Test",
                        "date_of_birth": "1970-01-01",
                        "gender": "M",
                        "fiscal_code": sensitive_fiscal_code,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = body_to_bytes(response.into_body()).await;
    let created: Value = serde_json::from_slice(&body).unwrap();
    let patient_id = created["id"].as_str().unwrap();

    // Query database directly to verify data is encrypted
    // Need to set RLS context for direct database query
    let mut tx = pool.begin().await.unwrap();
    sqlx::query("SELECT set_config('app.current_user_id', $1, true)")
        .bind(doctor.id.to_string())
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("SELECT set_config('app.current_user_role', 'DOCTOR', true)")
        .execute(&mut *tx)
        .await
        .unwrap();

    let db_row: (String, Option<String>) = sqlx::query_as(
        "SELECT first_name, fiscal_code FROM patients WHERE id = $1"
    )
    .bind(uuid::Uuid::parse_str(patient_id).unwrap())
    .fetch_one(&mut *tx)
    .await
    .unwrap();

    tx.commit().await.unwrap();

    // The data in the database should NOT match the plaintext
    // (it should be encrypted)
    assert_ne!(db_row.0, sensitive_name);
    if let Some(fc) = db_row.1 {
        assert_ne!(fc, sensitive_fiscal_code);
    }

    teardown_test_db(&pool).await;
}

// ============================================================================
// MINIMAL TEST FOR DEBUGGING
// ============================================================================

/// Test: Minimal patient creation with only required fields
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_minimal_patient_creation() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor_minimal_{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Patient",
                        "date_of_birth": "1980-01-01",
                        "gender": "M"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;
    
    eprintln!("Status: {}", status);
    eprintln!("Body: {}", String::from_utf8_lossy(&body));
    
    assert_eq!(status, StatusCode::CREATED);
    teardown_test_db(&pool).await;
}
