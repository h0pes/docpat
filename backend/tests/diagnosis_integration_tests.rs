/*!
 * Visit Diagnosis Integration Tests
 *
 * Comprehensive integration tests for diagnosis endpoints:
 * - Create diagnosis (POST /api/v1/diagnoses)
 * - Get diagnosis (GET /api/v1/diagnoses/:id)
 * - Update diagnosis (PUT /api/v1/diagnoses/:id)
 * - Delete diagnosis (DELETE /api/v1/diagnoses/:id)
 * - Get visit diagnoses (GET /api/v1/visits/:id/diagnoses)
 * - Get patient diagnoses (GET /api/v1/patients/:id/diagnoses)
 * - Search ICD-10 codes (GET /api/v1/diagnoses/icd10/search)
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
        "date_of_birth": "1955-03-20",
        "gender": "F",
        "phone_primary": "+393401234567",
        "email": format!("{}.{}@test.com", first_name.to_lowercase(), last_name.to_lowercase()),
        "preferred_contact_method": "PHONE",
        "blood_type": "O+",
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
        "visit_type": "NEW_PATIENT",
        "chief_complaint": "Routine checkup with multiple concerns",
        "subjective": "Patient reports fatigue and increased thirst",
        "objective": "Vital signs: BP 145/92, HR 78, elevated glucose",
        "assessment": "Suspect hypertension and diabetes",
        "plan": "Order labs, schedule follow-up"
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

/// Helper function to create a test diagnosis
async fn create_test_diagnosis(
    app: &axum::Router,
    token: &str,
    visit_id: &str,
    icd10_code: &str,
    icd10_description: &str,
    is_primary: bool,
) -> Value {
    let diagnosis_data = json!({
        "visit_id": visit_id,
        "icd10_code": icd10_code,
        "icd10_description": icd10_description,
        "is_primary": is_primary,
        "diagnosis_type": "CONFIRMED",
        "clinical_notes": format!("Clinical notes for {}", icd10_code),
        "is_active": true
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/diagnoses")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(diagnosis_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;

    if !status.is_success() {
        eprintln!("ERROR: Create diagnosis failed with status {}", status);
        eprintln!("Response body: {}", String::from_utf8_lossy(&body));
        panic!("Failed to create diagnosis");
    }

    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// CREATE DIAGNOSIS TESTS
// ============================================================================

/// Test: Doctor can create a new diagnosis
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_diagnosis_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Dx", "Patient").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/diagnoses")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "visit_id": visit_id,
                        "icd10_code": "I10",
                        "icd10_description": "Essential (primary) hypertension",
                        "is_primary": true,
                        "diagnosis_type": "CONFIRMED",
                        "clinical_notes": "BP consistently elevated over 140/90",
                        "is_active": true
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
    assert_eq!(json["icd10_code"], "I10");
    assert_eq!(json["icd10_description"], "Essential (primary) hypertension");
    assert_eq!(json["is_primary"], true);
    assert_eq!(json["diagnosis_type"], "CONFIRMED");
    assert_eq!(json["is_active"], true);
}

/// Test: Create multiple diagnoses for a visit (primary and secondary)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_multiple_diagnoses_for_visit() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Multi", "Dx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Create primary diagnosis
    let primary_dx = create_test_diagnosis(
        &app,
        &doctor_token,
        visit_id,
        "E11.9",
        "Type 2 diabetes mellitus without complications",
        true,
    ).await;
    assert_eq!(primary_dx["is_primary"], true);

    // Create secondary diagnosis
    let secondary_dx = create_test_diagnosis(
        &app,
        &doctor_token,
        visit_id,
        "I10",
        "Essential (primary) hypertension",
        false,
    ).await;
    assert_eq!(secondary_dx["is_primary"], false);

    // Verify both diagnoses are created
    assert_ne!(primary_dx["id"], secondary_dx["id"]);
}

/// Test: Unauthenticated request should fail
#[tokio::test]
async fn test_create_diagnosis_unauthenticated_fails() {
    let (app, _pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/diagnoses")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "visit_id": "00000000-0000-0000-0000-000000000000",
                        "icd10_code": "I10",
                        "icd10_description": "Test"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

/// Test: Create diagnosis with different types (PROVISIONAL)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_diagnosis_provisional_type() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Type", "Prov").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Test PROVISIONAL diagnosis
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/diagnoses")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "visit_id": visit_id,
                        "icd10_code": "R51",
                        "icd10_description": "Headache",
                        "is_primary": true,
                        "diagnosis_type": "PROVISIONAL",
                        "is_active": true
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
    assert_eq!(json["diagnosis_type"], "PROVISIONAL");
}

/// Test: Create diagnosis with RULE_OUT type
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_diagnosis_rule_out_type() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Type", "RuleOut").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Test RULE_OUT diagnosis
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/diagnoses")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "visit_id": visit_id,
                        "icd10_code": "G43.9",
                        "icd10_description": "Migraine, unspecified",
                        "is_primary": true,
                        "diagnosis_type": "RULE_OUT",
                        "is_active": true
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
    assert_eq!(json["diagnosis_type"], "RULE_OUT");
}

// ============================================================================
// GET DIAGNOSIS TESTS
// ============================================================================

/// Test: Doctor can get diagnosis by ID
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_diagnosis_by_id_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Get", "Dx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let diagnosis = create_test_diagnosis(&app, &doctor_token, visit_id, "I10", "Essential (primary) hypertension", true).await;
    let diagnosis_id = diagnosis["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], diagnosis_id);
    assert_eq!(json["icd10_code"], "I10");
    // Clinical notes should be decrypted
    assert!(json["clinical_notes"].as_str().unwrap().contains("I10"));
}

/// Test: Getting non-existent diagnosis returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_diagnosis_returns_404() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/diagnoses/00000000-0000-0000-0000-000000000000")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// GET VISIT DIAGNOSES TESTS
// ============================================================================

/// Test: Get all diagnoses for a visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_visit_diagnoses_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Visit", "Dxs").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Create multiple diagnoses
    create_test_diagnosis(&app, &doctor_token, visit_id, "E11.9", "Type 2 diabetes mellitus", true).await;
    create_test_diagnosis(&app, &doctor_token, visit_id, "I10", "Essential hypertension", false).await;
    create_test_diagnosis(&app, &doctor_token, visit_id, "E78.5", "Hyperlipidemia", false).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/diagnoses", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json.as_array().unwrap().len(), 3);

    // Primary diagnosis should be first
    let first = &json[0];
    assert_eq!(first["is_primary"], true);
}

// ============================================================================
// GET PATIENT DIAGNOSES TESTS
// ============================================================================

/// Test: Get all diagnoses for a patient
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_diagnoses_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Patient", "History").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create first visit with diagnoses
    let visit1 = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit1_id = visit1["id"].as_str().unwrap();
    create_test_diagnosis(&app, &doctor_token, visit1_id, "E11.9", "Type 2 diabetes mellitus", true).await;

    // Create second visit with diagnoses
    let visit2 = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit2_id = visit2["id"].as_str().unwrap();
    create_test_diagnosis(&app, &doctor_token, visit2_id, "I10", "Essential hypertension", true).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/diagnoses", patient_id))
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

    // All diagnoses should belong to the same patient
    for dx in json.as_array().unwrap() {
        assert_eq!(dx["patient_id"], patient_id);
    }
}

/// Test: Filter patient diagnoses to active only
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_diagnoses_active_only() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Active", "Filter").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Create active diagnosis
    create_test_diagnosis(&app, &doctor_token, visit_id, "I10", "Essential hypertension", true).await;

    // Create and then resolve a diagnosis
    let dx_to_resolve = create_test_diagnosis(&app, &doctor_token, visit_id, "J06.9", "Acute URI", false).await;
    let dx_id = dx_to_resolve["id"].as_str().unwrap();

    // Update to inactive (resolved)
    // Note: resolved_date must be >= visit_date per database constraint
    let today = Utc::now().format("%Y-%m-%d").to_string();
    app.clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/diagnoses/{}", dx_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "is_active": false,
                        "resolved_date": today
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Get active only
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/diagnoses?active_only=true", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned diagnoses should be active
    for dx in json.as_array().unwrap() {
        assert_eq!(dx["is_active"], true);
    }
}

// ============================================================================
// UPDATE DIAGNOSIS TESTS
// ============================================================================

/// Test: Doctor can update diagnosis
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_diagnosis_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Update", "Dx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let diagnosis = create_test_diagnosis(&app, &doctor_token, visit_id, "R51", "Headache", true).await;
    let diagnosis_id = diagnosis["id"].as_str().unwrap();

    // Update diagnosis type from CONFIRMED to DIFFERENTIAL
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "diagnosis_type": "DIFFERENTIAL",
                        "clinical_notes": "Updated: Possible tension-type headache vs migraine"
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

    assert_eq!(json["diagnosis_type"], "DIFFERENTIAL");
    assert!(json["clinical_notes"].as_str().unwrap().contains("Updated"));
}

/// Test: Resolve a diagnosis
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_resolve_diagnosis() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Resolve", "Dx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let diagnosis = create_test_diagnosis(&app, &doctor_token, visit_id, "J06.9", "Acute upper respiratory infection", true).await;
    let diagnosis_id = diagnosis["id"].as_str().unwrap();

    // Note: resolved_date must be >= visit_date per database constraint
    let today = Utc::now().format("%Y-%m-%d").to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "is_active": false,
                        "resolved_date": &today,
                        "clinical_notes": "Infection resolved after 7-day course of antibiotics"
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

    assert_eq!(json["is_active"], false);
    assert_eq!(json["resolved_date"].as_str().unwrap(), today);
}

// ============================================================================
// DELETE DIAGNOSIS TESTS
// ============================================================================

/// Test: Admin can delete diagnosis
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_diagnosis_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("dxadmin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let patient = create_test_patient(&app, &admin_token, "Delete", "Dx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &admin_token, patient_id, &admin.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let diagnosis = create_test_diagnosis(&app, &admin_token, visit_id, "R51", "Headache", true).await;
    let diagnosis_id = diagnosis["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
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
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

/// Test: Doctor cannot delete diagnosis (admin only)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_diagnosis_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "NoDelete", "Dx").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    let diagnosis = create_test_diagnosis(&app, &doctor_token, visit_id, "R51", "Headache", true).await;
    let diagnosis_id = diagnosis["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ============================================================================
// ICD-10 SEARCH TESTS
// ============================================================================

/// Test: Search ICD-10 codes
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_search_icd10_codes() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/diagnoses/icd10/search?query=diabetes&limit=10")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should return results for diabetes-related codes
    assert!(json.as_array().unwrap().len() > 0);

    // Results should contain codes related to diabetes
    let has_diabetes = json.as_array().unwrap().iter().any(|item| {
        let desc = item["description"].as_str().unwrap_or("").to_lowercase();
        desc.contains("diabetes")
    });
    assert!(has_diabetes, "Search results should include diabetes codes");
}

/// Test: Search ICD-10 codes by code prefix
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_search_icd10_by_code() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/diagnoses/icd10/search?query=I10&limit=10")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should return results containing I10
    let results = json.as_array().unwrap();
    if !results.is_empty() {
        let has_i10 = results.iter().any(|item| {
            let code = item["code"].as_str().unwrap_or("");
            code.contains("I10") || code.contains("I11")
        });
        assert!(has_i10, "Search results should include hypertension codes");
    }
}

// ============================================================================
// COMPLETE DIAGNOSIS WORKFLOW TEST
// ============================================================================

/// Test: Complete diagnosis lifecycle
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_complete_diagnosis_workflow() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("dxdoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Workflow", "Complete").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // 1. Create provisional diagnosis
    let diagnosis_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/diagnoses")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "visit_id": visit_id,
                        "icd10_code": "R51",
                        "icd10_description": "Headache",
                        "is_primary": true,
                        "diagnosis_type": "PROVISIONAL",
                        "clinical_notes": "Initial presentation with recurring headache",
                        "is_active": true
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(diagnosis_response.status(), StatusCode::CREATED);
    let body = body_to_bytes(diagnosis_response.into_body()).await;
    let dx: Value = serde_json::from_slice(&body).unwrap();
    let diagnosis_id = dx["id"].as_str().unwrap();
    assert_eq!(dx["diagnosis_type"], "PROVISIONAL");

    // 2. Update to confirmed after tests
    let update_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/diagnoses/{}", diagnosis_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "icd10_description": "Migraine, unspecified",
                        "diagnosis_type": "CONFIRMED",
                        "clinical_notes": "MRI negative, pattern consistent with migraine"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(update_response.status(), StatusCode::OK);
    let body = body_to_bytes(update_response.into_body()).await;
    let updated_dx: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated_dx["diagnosis_type"], "CONFIRMED");

    // 3. Add secondary diagnosis
    let secondary = create_test_diagnosis(
        &app,
        &doctor_token,
        visit_id,
        "F32.9",
        "Major depressive disorder, single episode, unspecified",
        false,
    ).await;
    assert_eq!(secondary["is_primary"], false);

    // 4. Verify patient has all diagnoses
    let patient_dx_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/diagnoses", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(patient_dx_response.status(), StatusCode::OK);
    let body = body_to_bytes(patient_dx_response.into_body()).await;
    let all_dx: Value = serde_json::from_slice(&body).unwrap();
    assert!(all_dx.as_array().unwrap().len() >= 2);

    // 5. Resolve the secondary diagnosis
    // Note: resolved_date must be >= visit_date per database constraint
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let resolve_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/diagnoses/{}", secondary["id"].as_str().unwrap()))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "is_active": false,
                        "resolved_date": today,
                        "clinical_notes": "Symptoms resolved with medication"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resolve_response.status(), StatusCode::OK);

    // 6. Verify active only filter works
    let active_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/patients/{}/diagnoses?active_only=true", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(active_response.into_body()).await;
    let active_dx: Value = serde_json::from_slice(&body).unwrap();

    // Only the primary (migraine) should be active
    for dx in active_dx.as_array().unwrap() {
        assert_eq!(dx["is_active"], true);
    }
}
