/*!
 * Visit Management Integration Tests
 *
 * Comprehensive integration tests for clinical visit documentation endpoints:
 * - Create visit (POST /api/v1/visits)
 * - Get visit (GET /api/v1/visits/:id)
 * - Update visit (PUT /api/v1/visits/:id)
 * - Delete visit (DELETE /api/v1/visits/:id)
 * - List visits (GET /api/v1/visits)
 * - Get patient visits (GET /api/v1/patients/:id/visits)
 * - Sign visit (POST /api/v1/visits/:id/sign)
 * - Lock visit (POST /api/v1/visits/:id/lock)
 * - Get statistics (GET /api/v1/visits/statistics)
 * - SOAP note workflow (DRAFT → SIGNED → LOCKED)
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
) -> Value {
    let patient_data = json!({
        "first_name": first_name,
        "last_name": last_name,
        "date_of_birth": "1950-01-15",
        "gender": "M",
        "phone_primary": "+393401234567",
        "email": format!("{}.{}@test.com", first_name.to_lowercase(), last_name.to_lowercase()),
        "preferred_contact_method": "PHONE",
        "blood_type": "A+",
        "health_card_expire": "2025-12-31",
    });

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

/// Helper function to create a test visit with minimal data
async fn create_test_visit(
    app: &axum::Router,
    token: &str,
    patient_id: &str,
    provider_id: &str,
) -> Value {
    let visit_data = json!({
        "patient_id": patient_id,
        "provider_id": provider_id,
        "visit_date": "2025-11-19",
        "visit_type": "FOLLOW_UP",
        "subjective": "Patient reports feeling better",
        "objective": "Vital signs stable, no fever",
        "assessment": "Condition improving",
        "plan": "Continue current medications"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visits")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(visit_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(response.into_body()).await;
    serde_json::from_slice(&body).unwrap()
}

/// Helper function to create a comprehensive test visit with all fields
async fn create_comprehensive_visit(
    app: &axum::Router,
    token: &str,
    patient_id: &str,
    provider_id: &str,
) -> Value {
    let visit_data = json!({
        "patient_id": patient_id,
        "provider_id": provider_id,
        "visit_date": "2025-11-19",
        "visit_type": "NEW_PATIENT",
        "chief_complaint": "Chronic back pain",
        "history_present_illness": "Patient reports lower back pain for 3 months",
        "review_of_systems": {
            "constitutional": "Denies fever, weight loss",
            "cardiovascular": "No chest pain or palpitations",
            "musculoskeletal": "Back pain as described"
        },
        "physical_exam": "Tenderness in L4-L5 region, normal gait",
        "vitals": {
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "heart_rate": 72,
            "respiratory_rate": 16,
            "temperature_celsius": 36.6,
            "weight_kg": 75.5,
            "height_cm": 175,
            "oxygen_saturation": 98
        },
        "subjective": "Patient reports constant dull pain in lower back",
        "objective": "BP 120/80, HR 72, RR 16, Temp 36.6°C. Tenderness on palpation L4-L5",
        "assessment": "Chronic mechanical low back pain, likely muscular strain",
        "plan": "Physical therapy referral, NSAIDs as needed, follow-up in 2 weeks",
        "clinical_notes": "Patient very cooperative, motivated for treatment",
        "follow_up_required": true,
        "follow_up_date": "2025-12-03",
        "follow_up_notes": "Re-evaluate pain levels and PT progress"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visits")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(visit_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;

    if !status.is_success() {
        eprintln!("ERROR: Create comprehensive visit failed with status {}", status);
        eprintln!("Response body: {}", String::from_utf8_lossy(&body));
        panic!("Failed to create comprehensive visit");
    }

    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// CREATE VISIT TESTS
// ============================================================================

/// Test: Doctor can create a new visit with minimal data
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_visit_minimal_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Create a patient first
    let patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi").await;
    let patient_id = patient["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visits")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id,
                        "provider_id": doctor.id.to_string(),
                        "visit_date": "2025-11-19",
                        "visit_type": "FOLLOW_UP",
                        "subjective": "Patient reports feeling better",
                        "objective": "Vital signs stable",
                        "assessment": "Condition improving",
                        "plan": "Continue current treatment"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;
    let body_str = String::from_utf8_lossy(&body);
    if status != StatusCode::CREATED {
        eprintln!("Error response (status {}): {}", status, body_str);
    }
    assert_eq!(status, StatusCode::CREATED);
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["patient_id"], patient_id);
    assert_eq!(json["provider_id"], doctor.id.to_string());
    assert_eq!(json["visit_type"], "FOLLOW_UP");
    assert_eq!(json["status"], "DRAFT");
    assert_eq!(json["version"], 1);

    // SOAP notes should be present and decrypted
    assert_eq!(json["subjective"], "Patient reports feeling better");
    assert_eq!(json["objective"], "Vital signs stable");
    assert_eq!(json["assessment"], "Condition improving");
    assert_eq!(json["plan"], "Continue current treatment");
}

/// Test: Doctor can create a visit with all fields including vitals
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_visit_comprehensive_with_vitals() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Luigi", "Bianchi").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_comprehensive_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;

    assert_eq!(visit["status"], "DRAFT");

    // Verify vitals are present and correct
    let vitals = &visit["vitals"];
    assert_eq!(vitals["blood_pressure_systolic"].as_f64().unwrap() as i32, 120);
    assert_eq!(vitals["blood_pressure_diastolic"].as_f64().unwrap() as i32, 80);
    assert_eq!(vitals["heart_rate"].as_f64().unwrap() as i32, 72);
    assert!((vitals["temperature_celsius"].as_f64().unwrap() - 36.6).abs() < 0.01);
    assert!((vitals["weight_kg"].as_f64().unwrap() - 75.5).abs() < 0.01);
    assert_eq!(vitals["height_cm"].as_f64().unwrap() as i32, 175);
    assert!((vitals["bmi"].as_f64().unwrap() - 24.65).abs() < 0.01); // Calculated: 75.5 / (1.75^2) ≈ 24.65

    // Verify all SOAP notes present
    assert!(visit["subjective"].as_str().unwrap().contains("lower back"));
    assert!(visit["objective"].as_str().unwrap().contains("120/80"));
    assert!(visit["assessment"].as_str().unwrap().contains("mechanical"));
    assert!(visit["plan"].as_str().unwrap().contains("Physical therapy"));
}

/// Test: Creating visit with invalid vitals should fail validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_visit_invalid_vitals_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Test", "Patient").await;
    let patient_id = patient["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visits")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id,
                        "provider_id": doctor.id.to_string(),
                        "visit_date": "2025-11-19",
                        "visit_type": "FOLLOW_UP",
                        "vitals": {
                            "blood_pressure_systolic": 300, // Invalid - too high
                            "blood_pressure_diastolic": 80,
                            "heart_rate": 72
                        },
                        "subjective": "Test",
                        "objective": "Test",
                        "assessment": "Test",
                        "plan": "Test"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

/// Test: Unauthenticated request should fail
#[tokio::test]
async fn test_create_visit_unauthenticated_fails() {
    let (app, _pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visits")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "patient_id": "00000000-0000-0000-0000-000000000000",
                        "provider_id": "00000000-0000-0000-0000-000000000000",
                        "visit_date": "2025-11-19",
                        "visit_type": "FOLLOW_UP",
                        "subjective": "Test",
                        "objective": "Test",
                        "assessment": "Test",
                        "plan": "Test"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ============================================================================
// GET VISIT TESTS
// ============================================================================

/// Test: Doctor can get a visit by ID
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_visit_by_id_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Get", "Visit").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create a visit
    let created_visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = created_visit["id"].as_str().unwrap();

    // Get the visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], visit_id);
    assert_eq!(json["patient_id"], patient_id);
    // Verify data encryption round-trip: data should be decrypted
    assert_eq!(json["subjective"], "Patient reports feeling better");
}

/// Test: Getting non-existent visit should return 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_visit_returns_404() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/visits/00000000-0000-0000-0000-000000000000")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// UPDATE VISIT TESTS
// ============================================================================

/// Test: Doctor can update a DRAFT visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_draft_visit_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Update", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Update the visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "subjective": "Updated: Patient reports significant improvement",
                        "objective": "Updated: All vitals normal",
                        "assessment": "Updated: Condition resolved",
                        "plan": "Updated: Discharge, no follow-up needed"
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

    assert_eq!(json["id"], visit_id);
    assert_eq!(json["subjective"], "Updated: Patient reports significant improvement");
    assert_eq!(json["version"], 2); // Version should increment
}

/// Test: Updating a SIGNED visit should fail
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_signed_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Signed", "Visit").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign the visit
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Attempt to update the signed visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "subjective": "Trying to update signed visit"
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

    // Get the detailed error message (not the error type)
    let error_msg = json["message"].as_str().unwrap_or("no error message");
    assert!(
        error_msg.to_lowercase().contains("cannot edit") || error_msg.to_lowercase().contains("signed") || error_msg.to_lowercase().contains("locked"),
        "Error message '{}' should indicate visit cannot be edited",
        error_msg
    );
}

// ============================================================================
// DELETE VISIT TESTS
// ============================================================================

/// Test: Doctor can delete a DRAFT visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_draft_visit_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Delete", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Delete the visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify visit is deleted
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

/// Test: Deleting a SIGNED visit should fail
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_signed_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Signed", "Delete").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign the visit
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Attempt to delete the signed visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// LIST VISITS TESTS
// ============================================================================

/// Test: Doctor can list all visits with pagination
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_visits_with_pagination() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "List", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create multiple visits
    for _ in 0..3 {
        create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    }

    // List visits
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/visits?limit=10&offset=0")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have at least the 3 visits we created
    let visits_count = json["visits"].as_array().unwrap().len();
    assert!(visits_count >= 3, "Expected at least 3 visits, got {}", visits_count);
    assert!(json["total"].as_i64().unwrap() >= 3, "Expected total >= 3, got {}", json["total"]);
    assert_eq!(json["limit"], 10);
    assert_eq!(json["offset"], 0);
}

/// Test: Filter visits by patient_id
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_visits_filter_by_patient() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient1 = create_test_patient(&app, &doctor_token, "Patient", "One").await;
    let patient1_id = patient1["id"].as_str().unwrap();

    let patient2 = create_test_patient(&app, &doctor_token, "Patient", "Two").await;
    let patient2_id = patient2["id"].as_str().unwrap();

    // Create visits for both patients
    create_test_visit(&app, &doctor_token, patient1_id, &doctor.id.to_string()).await;
    create_test_visit(&app, &doctor_token, patient1_id, &doctor.id.to_string()).await;
    create_test_visit(&app, &doctor_token, patient2_id, &doctor.id.to_string()).await;

    // Filter by patient1
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits?patient_id={}", patient1_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;
    if status != StatusCode::OK {
        eprintln!("ERROR: Status {}, Body: {}", status, String::from_utf8_lossy(&body));
    }
    assert_eq!(status, StatusCode::OK);
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["total"], 2);
    assert_eq!(json["visits"].as_array().unwrap().len(), 2);
}

// ============================================================================
// GET PATIENT VISITS TESTS
// ============================================================================

/// Test: Get all visits for a specific patient
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_visits_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Patient", "History").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create multiple visits
    for _ in 0..3 {
        create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    }

    // Get patient visits
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/visits", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["visits"].as_array().unwrap().len(), 3);
    assert_eq!(json["total"], 3);

    // All visits should be for the same patient
    for visit in json["visits"].as_array().unwrap() {
        assert_eq!(visit["patient_id"], patient_id);
    }
}

// ============================================================================
// SIGN VISIT TESTS (Status Workflow)
// ============================================================================

/// Test: Doctor can sign a DRAFT visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_sign_draft_visit_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Sign", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign the visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "SIGNED");
    assert!(json["signed_at"].is_string());
    assert_eq!(json["signed_by"], doctor.id.to_string());
    assert!(json["signature_hash"].is_string()); // Signature should be present
}

/// Test: Signing an already SIGNED visit should fail
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_sign_already_signed_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Double", "Sign").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign the visit first time
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Try to sign again
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// LOCK VISIT TESTS (Status Workflow)
// ============================================================================

/// Test: Doctor can lock a SIGNED visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_lock_signed_visit_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Lock", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign first
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Lock the visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/lock", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "LOCKED");
    assert!(json["locked_at"].is_string());
}

/// Test: Cannot lock a DRAFT visit (must be SIGNED first)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_lock_draft_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Lock", "Draft").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Try to lock without signing
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/lock", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

/// Test: Cannot update a LOCKED visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_locked_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Locked", "Update").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign and lock
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/lock", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Try to update locked visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "subjective": "Trying to update locked visit"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

/// Test: Cannot delete a LOCKED visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_locked_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Locked", "Delete").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Sign and lock
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/lock", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Try to delete locked visit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// VISIT STATISTICS TESTS
// ============================================================================

/// Test: Get visit statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_visit_statistics() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Stats", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create visits in different states
    let visit1 = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit2 = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit3 = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;

    // Sign one visit
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit1["id"].as_str().unwrap()))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Sign and lock another visit
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit2["id"].as_str().unwrap()))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/lock", visit2["id"].as_str().unwrap()))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Get statistics
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/visits/statistics")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have at least the visits we created (may have more from previous tests)
    assert!(json["statistics"]["total_visits"].as_i64().unwrap() >= 3, "Expected at least 3 total visits");
    assert!(json["statistics"]["drafts"].as_i64().unwrap() >= 1, "Expected at least 1 draft visit");
    assert!(json["statistics"]["signed"].as_i64().unwrap() >= 1, "Expected at least 1 signed visit");
    assert!(json["statistics"]["locked"].as_i64().unwrap() >= 1, "Expected at least 1 locked visit");
}

// ============================================================================
// DATA ENCRYPTION ROUND-TRIP TEST
// ============================================================================

/// Test: Verify clinical data is encrypted in database and decrypted on retrieval
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_data_encryption_round_trip() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Encryption", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create visit with sensitive data
    let sensitive_data = "Patient has history of diabetes and hypertension";
    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Update with sensitive data
    app.clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "history_present_illness": sensitive_data
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Verify data is encrypted in database (need RLS context for direct query)
    let visit_uuid = uuid::Uuid::parse_str(visit_id).unwrap();

    // Start transaction and set RLS context to query the database directly
    let mut tx = pool.begin().await.unwrap();
    sqlx::query(&format!("SET LOCAL app.current_user_id = '{}'", doctor.id))
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("SET LOCAL app.current_user_role = 'DOCTOR'")
        .execute(&mut *tx)
        .await
        .unwrap();

    let encrypted_record: (Option<String>,) = sqlx::query_as(
        "SELECT history_present_illness FROM visits WHERE id = $1"
    )
    .bind(visit_uuid)
    .fetch_one(&mut *tx)
    .await
    .unwrap();

    tx.commit().await.unwrap();

    // Encrypted data should not match the original plaintext
    assert_ne!(encrypted_record.0.as_deref().unwrap_or(""), sensitive_data);

    // Retrieve via API - should be decrypted
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Decrypted data should match original
    assert_eq!(json["history_present_illness"], sensitive_data);
}

// ============================================================================
// COMPLETE SOAP NOTE WORKFLOW TEST
// ============================================================================

/// Test: Complete SOAP note workflow from creation to locking
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_complete_soap_note_workflow() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "SOAP", "Workflow").await;
    let patient_id = patient["id"].as_str().unwrap();

    // 1. Create visit in DRAFT state
    let visit = create_comprehensive_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();
    assert_eq!(visit["status"], "DRAFT");

    // 2. Update SOAP notes (simulating doctor documenting during visit)
    let update_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "plan": "Updated: Physical therapy referral submitted, NSAIDs prescribed, follow-up in 2 weeks"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(update_response.status(), StatusCode::OK);
    let body = body_to_bytes(update_response.into_body()).await;
    let updated_visit: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated_visit["version"], 2); // Version incremented

    // 3. Sign the visit (doctor completed documentation)
    let sign_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/sign", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(sign_response.status(), StatusCode::OK);
    let body = body_to_bytes(sign_response.into_body()).await;
    let signed_visit: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(signed_visit["status"], "SIGNED");
    assert!(signed_visit["signature_hash"].is_string());

    // 4. Attempt to update signed visit should fail
    let failed_update = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "plan": "This should fail"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(failed_update.status(), StatusCode::BAD_REQUEST);

    // 5. Lock the visit (archiving for long-term storage)
    let lock_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/lock", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(lock_response.status(), StatusCode::OK);
    let body = body_to_bytes(lock_response.into_body()).await;
    let locked_visit: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(locked_visit["status"], "LOCKED");

    // 6. Verify final state - should be immutable
    let final_visit = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(final_visit.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "LOCKED");
    assert_eq!(json["version"], 2);
    assert!(json["signature_hash"].is_string());
    assert!(json["signed_at"].is_string());
    assert!(json["locked_at"].is_string());

    // All SOAP notes should be intact and decrypted
    assert!(json["subjective"].as_str().unwrap().contains("lower back"));
    assert!(json["objective"].as_str().unwrap().contains("120/80"));
    assert!(json["assessment"].as_str().unwrap().contains("mechanical"));
    assert!(json["plan"].as_str().unwrap().contains("Updated: Physical therapy"));
}
