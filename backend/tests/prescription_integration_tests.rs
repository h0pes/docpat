/*!
 * Prescription Management Integration Tests
 *
 * Comprehensive integration tests for prescription endpoints:
 * - Create prescription (POST /api/v1/prescriptions)
 * - Get prescription (GET /api/v1/prescriptions/:id)
 * - Update prescription (PUT /api/v1/prescriptions/:id)
 * - Delete prescription (DELETE /api/v1/prescriptions/:id)
 * - List prescriptions (GET /api/v1/prescriptions)
 * - Get patient prescriptions (GET /api/v1/patients/:id/prescriptions)
 * - Get visit prescriptions (GET /api/v1/visits/:id/prescriptions)
 * - Discontinue prescription (POST /api/v1/prescriptions/:id/discontinue)
 * - Cancel prescription (POST /api/v1/prescriptions/:id/cancel)
 * - Hold prescription (POST /api/v1/prescriptions/:id/hold)
 * - Resume prescription (POST /api/v1/prescriptions/:id/resume)
 * - Complete prescription (POST /api/v1/prescriptions/:id/complete)
 * - Search medications (GET /api/v1/prescriptions/medications/search)
 * - Create custom medication (POST /api/v1/prescriptions/medications/custom)
 * - RBAC permission enforcement
 */

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use chrono::Utc;
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
    format!("{}", timestamp % 1000000)
}

/// Helper function to setup test environment with clean database
async fn setup_test() -> (axum::Router, sqlx::PgPool) {
    let (app, pool) = TestApp::new().await;
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
        "health_card_expire": "2027-12-31",
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

/// Helper function to create a test visit
async fn create_test_visit(
    app: &axum::Router,
    token: &str,
    patient_id: &str,
    provider_id: &str,
) -> Value {
    // Note: visit_date must be <= CURRENT_DATE per database constraint
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let visit_data = json!({
        "patient_id": patient_id,
        "provider_id": provider_id,
        "visit_date": today,
        "visit_type": "FOLLOW_UP",
        "subjective": "Patient reports chronic pain",
        "objective": "Vital signs stable",
        "assessment": "Chronic pain management needed",
        "plan": "Prescribe medication"
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

/// Helper function to create a test prescription
async fn create_test_prescription(
    app: &axum::Router,
    token: &str,
    patient_id: &str,
    provider_id: &str,
    visit_id: Option<&str>,
) -> Value {
    // Note: prescribed_date must be <= CURRENT_DATE per database constraint
    // start_date can be in the future
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let mut prescription_data = json!({
        "patient_id": patient_id,
        "provider_id": provider_id,
        "medication_name": "Lisinopril",
        "generic_name": "lisinopril",
        "dosage": "10mg",
        "form": "TABLET",
        "route": "ORAL",
        "frequency": "Once daily",
        "duration": "30 days",
        "quantity": 30,
        "refills": 3,
        "instructions": "Take in the morning with water",
        "prescribed_date": today,
        "start_date": today
    });

    if let Some(vid) = visit_id {
        prescription_data["visit_id"] = json!(vid);
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescriptions")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(prescription_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;

    if !status.is_success() {
        eprintln!("ERROR: Create prescription failed with status {}", status);
        eprintln!("Response body: {}", String::from_utf8_lossy(&body));
        panic!("Failed to create prescription");
    }

    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// CREATE PRESCRIPTION TESTS
// ============================================================================

/// Test: Doctor can create a new prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_prescription_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Rx", "Patient").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Note: prescribed_date must be <= CURRENT_DATE per database constraint
    let today = Utc::now().format("%Y-%m-%d").to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescriptions")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id,
                        "provider_id": doctor.id.to_string(),
                        "medication_name": "Metformin",
                        "generic_name": "metformin hydrochloride",
                        "dosage": "500mg",
                        "form": "TABLET",
                        "route": "ORAL",
                        "frequency": "Twice daily with meals",
                        "duration": "90 days",
                        "quantity": 180,
                        "refills": 5,
                        "instructions": "Take with food to reduce GI side effects",
                        "prescribed_date": today,
                        "start_date": today
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;
    if status != StatusCode::CREATED {
        eprintln!("Error response (status {}): {}", status, String::from_utf8_lossy(&body));
    }
    assert_eq!(status, StatusCode::CREATED);

    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["patient_id"], patient_id);
    assert_eq!(json["provider_id"], doctor.id.to_string());
    assert_eq!(json["medication_name"], "Metformin");
    assert_eq!(json["dosage"], "500mg");
    assert_eq!(json["status"], "ACTIVE");
    assert_eq!(json["refills"], 5);
}

/// Test: Prescription with visit association
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_prescription_with_visit() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Visit", "RxPatient").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), Some(visit_id)).await;

    assert_eq!(prescription["visit_id"], visit_id);
    assert_eq!(prescription["patient_id"], patient_id);
    assert_eq!(prescription["status"], "ACTIVE");
}

/// Test: Unauthenticated request should fail
#[tokio::test]
async fn test_create_prescription_unauthenticated_fails() {
    let (app, _pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescriptions")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "patient_id": "00000000-0000-0000-0000-000000000000",
                        "provider_id": "00000000-0000-0000-0000-000000000000",
                        "medication_name": "Test",
                        "dosage": "10mg",
                        "frequency": "Once daily"
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
// GET PRESCRIPTION TESTS
// ============================================================================

/// Test: Doctor can get prescription by ID
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_prescription_by_id_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Get", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], prescription_id);
    assert_eq!(json["medication_name"], "Lisinopril");
    assert_eq!(json["dosage"], "10mg");
}

/// Test: Getting non-existent prescription returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_prescription_returns_404() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/prescriptions/00000000-0000-0000-0000-000000000000")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// LIST PRESCRIPTIONS TESTS
// ============================================================================

/// Test: List prescriptions with pagination
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_prescriptions_with_pagination() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "List", "RxTest").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create multiple prescriptions
    for _ in 0..3 {
        create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/prescriptions?limit=10&offset=0")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["prescriptions"].as_array().unwrap().len() >= 3);
    assert!(json["total"].as_i64().unwrap() >= 3);
}

/// Test: Filter prescriptions by patient_id
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_prescriptions_filter_by_patient() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient1 = create_test_patient(&app, &doctor_token, "Filter", "One").await;
    let patient1_id = patient1["id"].as_str().unwrap();

    let patient2 = create_test_patient(&app, &doctor_token, "Filter", "Two").await;
    let patient2_id = patient2["id"].as_str().unwrap();

    // Create prescriptions for both patients
    create_test_prescription(&app, &doctor_token, patient1_id, &doctor.id.to_string(), None).await;
    create_test_prescription(&app, &doctor_token, patient1_id, &doctor.id.to_string(), None).await;
    create_test_prescription(&app, &doctor_token, patient2_id, &doctor.id.to_string(), None).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/prescriptions?patient_id={}", patient1_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["total"], 2);
}

// ============================================================================
// GET PATIENT PRESCRIPTIONS TESTS
// ============================================================================

/// Test: Get all prescriptions for a patient
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_prescriptions_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Patient", "Rxs").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create multiple prescriptions
    create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/prescriptions", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json.as_array().unwrap().len() >= 2);
}

/// Test: Filter patient prescriptions to active only
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_prescriptions_active_only() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Active", "Only").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    // Discontinue one prescription
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/discontinue", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({"reason": "Patient developed allergy"}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Create another active prescription
    create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/prescriptions?active_only=true", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should only return active prescriptions
    for rx in json.as_array().unwrap() {
        assert_eq!(rx["status"], "ACTIVE");
    }
}

// ============================================================================
// GET VISIT PRESCRIPTIONS TESTS
// ============================================================================

/// Test: Get all prescriptions for a visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_visit_prescriptions_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Visit", "Rxs").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Create prescriptions for the visit
    create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), Some(visit_id)).await;
    create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), Some(visit_id)).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/prescriptions", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json.as_array().unwrap().len() >= 2);
    for rx in json.as_array().unwrap() {
        assert_eq!(rx["visit_id"], visit_id);
    }
}

// ============================================================================
// UPDATE PRESCRIPTION TESTS
// ============================================================================

/// Test: Doctor can update prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_prescription_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Update", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "dosage": "20mg",
                        "frequency": "Twice daily",
                        "instructions": "Updated: Take morning and evening"
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

    assert_eq!(json["dosage"], "20mg");
    assert_eq!(json["frequency"], "Twice daily");
    assert!(json["instructions"].as_str().unwrap().contains("Updated"));
}

// ============================================================================
// DELETE PRESCRIPTION TESTS
// ============================================================================

/// Test: Admin can delete prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_prescription_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("rxadmin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let patient = create_test_patient(&app, &admin_token, "Delete", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &admin_token, patient_id, &admin.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify it's deleted
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

/// Test: Doctor cannot delete prescription (admin only)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_prescription_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "NoDelete", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ============================================================================
// PRESCRIPTION STATUS WORKFLOW TESTS
// ============================================================================

/// Test: Discontinue prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_discontinue_prescription_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Discontinue", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/discontinue", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "reason": "Patient developed adverse reaction"
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

    assert_eq!(json["status"], "DISCONTINUED");
    assert!(json["discontinuation_reason"].as_str().unwrap().contains("adverse reaction"));
}

/// Test: Cancel prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_cancel_prescription_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Cancel", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/cancel", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "reason": "Prescription was never filled"
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

    assert_eq!(json["status"], "CANCELLED");
}

/// Test: Hold and resume prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_hold_and_resume_prescription() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Hold", "Resume").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    // Hold the prescription
    let hold_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/hold", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "reason": "Pending lab results"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(hold_response.status(), StatusCode::OK);
    let body = body_to_bytes(hold_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ON_HOLD");

    // Resume the prescription
    let resume_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/resume", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resume_response.status(), StatusCode::OK);
    let body = body_to_bytes(resume_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ACTIVE");
}

/// Test: Complete prescription
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_complete_prescription_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Complete", "Rx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), None).await;
    let prescription_id = prescription["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/complete", prescription_id))
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

    assert_eq!(json["status"], "COMPLETED");
}

// ============================================================================
// MEDICATION SEARCH TESTS
// ============================================================================

/// Test: Search medications
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_search_medications() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/prescriptions/medications/search?query=lisinopril&limit=10")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should return OK even if no results (empty list is valid)
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// CUSTOM MEDICATION TESTS
// ============================================================================

/// Test: Create custom medication
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_custom_medication() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescriptions/medications/custom")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "name": "Custom Compound Cream",
                        "generic_name": "custom compound",
                        "form": "CREAM",
                        "dosage_strength": "2%",
                        "route": "TOPICAL",
                        "common_dosages": ["Apply twice daily", "Apply as needed"],
                        "notes": "Compounded medication for specific patient needs"
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

    assert!(json["id"].is_string());
    assert!(json["message"].as_str().unwrap().contains("successfully"));
}

// ============================================================================
// COMPLETE PRESCRIPTION WORKFLOW TEST
// ============================================================================

/// Test: Complete prescription lifecycle from creation to completion
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_complete_prescription_workflow() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("rxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Workflow", "Test").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // 1. Create prescription
    let prescription = create_test_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), Some(visit_id)).await;
    let prescription_id = prescription["id"].as_str().unwrap();
    assert_eq!(prescription["status"], "ACTIVE");

    // 2. Update prescription
    let update_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "instructions": "Take with food, avoid grapefruit"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(update_response.status(), StatusCode::OK);

    // 3. Put on hold
    let hold_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/hold", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({"reason": "Waiting for insurance approval"}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(hold_response.status(), StatusCode::OK);

    // 4. Resume
    let resume_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/resume", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resume_response.status(), StatusCode::OK);

    // 5. Complete
    let complete_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/prescriptions/{}/complete", prescription_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(complete_response.status(), StatusCode::OK);

    // 6. Verify final state
    let final_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/prescriptions/{}", prescription_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(final_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "COMPLETED");
    assert_eq!(json["visit_id"], visit_id);
    assert!(json["instructions"].as_str().unwrap().contains("grapefruit"));
}
