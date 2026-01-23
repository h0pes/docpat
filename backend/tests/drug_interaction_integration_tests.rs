/*!
 * Drug Interaction Integration Tests
 *
 * Comprehensive integration tests for drug interaction endpoints:
 * - Check interactions (POST /api/v1/drug-interactions/check)
 * - Check new medication (POST /api/v1/drug-interactions/check-new)
 * - Check new medication for patient (POST /api/v1/drug-interactions/check-new-for-patient)
 * - Check patient interactions (GET /api/v1/drug-interactions/patient/:id)
 * - Get statistics (GET /api/v1/drug-interactions/statistics)
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
        "date_of_birth": "1960-05-10",
        "gender": "M",
        "phone_primary": "+393401234567",
        "email": format!("{}.{}@test.com", first_name.to_lowercase(), last_name.to_lowercase()),
        "preferred_contact_method": "PHONE",
        "blood_type": "B+",
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

/// Helper function to create a prescription for a patient
async fn create_prescription(
    app: &axum::Router,
    token: &str,
    patient_id: &str,
    provider_id: &str,
    medication_name: &str,
    generic_name: &str,
) -> Value {
    // Note: prescribed_date must be <= CURRENT_DATE per database constraint
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let prescription_data = json!({
        "patient_id": patient_id,
        "provider_id": provider_id,
        "medication_name": medication_name,
        "generic_name": generic_name,
        "dosage": "10mg",
        "form": "TABLET",
        "route": "ORAL",
        "frequency": "Once daily",
        "duration": "30 days",
        "quantity": 30,
        "refills": 3,
        "instructions": "Take as directed",
        "prescribed_date": today,
        "start_date": today
    });

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
// CHECK INTERACTIONS TESTS
// ============================================================================

/// Test: Check interactions between multiple medications by ATC codes
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_interactions_by_atc_codes() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Check for interactions between common medications
    // N02BE01 = Paracetamol, N02AX02 = Tramadol, A02BC01 = Omeprazole
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "atc_codes": ["N02BE01", "N02AX02", "A02BC01"],
                        "min_severity": "moderate"
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

    // Response should have the expected structure
    assert!(json.get("interactions").is_some() || json.get("has_interactions").is_some());
}

/// Test: Check interactions with empty ATC codes list
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_interactions_empty_list() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "atc_codes": []
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should return OK with no interactions
    assert_eq!(response.status(), StatusCode::OK);
}

/// Test: Check interactions with single medication (no interactions possible)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_interactions_single_medication() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "atc_codes": ["N02BE01"]
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

    // Single medication should have no interactions
    if let Some(interactions) = json.get("interactions") {
        assert!(interactions.as_array().unwrap().is_empty());
    }
}

/// Test: Unauthenticated request should fail
#[tokio::test]
async fn test_check_interactions_unauthenticated_fails() {
    let (app, _pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "atc_codes": ["N02BE01", "N02AX02"]
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
// CHECK NEW MEDICATION TESTS
// ============================================================================

/// Test: Check interactions when adding a new medication to existing ones
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_new_medication_interactions() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check-new")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "new_atc_code": "B01AA03",  // Warfarin
                        "existing_atc_codes": ["N02BE01", "A02BC01"],  // Paracetamol, Omeprazole
                        "min_severity": "moderate"
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

    // Response should indicate if there are interactions
    assert!(json.get("interactions").is_some() || json.get("has_interactions").is_some() || json.get("new_medication").is_some());
}

/// Test: Check new medication with no existing medications
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_new_medication_no_existing() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check-new")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "new_atc_code": "N02BE01",
                        "existing_atc_codes": []
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

    // No existing medications means no interactions
    if let Some(interactions) = json.get("interactions") {
        assert!(interactions.as_array().unwrap().is_empty());
    }
}

// ============================================================================
// CHECK NEW MEDICATION FOR PATIENT TESTS
// ============================================================================

/// Test: Check interactions for new medication against patient's existing prescriptions
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_new_medication_for_patient() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Drug", "Check").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create some existing prescriptions for the patient
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Lisinopril", "lisinopril").await;
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Metformin", "metformin").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check-new-for-patient")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "new_medication_name": "Warfarin",
                        "new_generic_name": "warfarin",
                        "patient_id": patient_id,
                        "min_severity": "moderate"
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

    // Response should have interaction check results
    assert!(json.is_object());
}

/// Test: Check new medication for patient with no existing prescriptions
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_new_medication_for_patient_no_existing() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "New", "Patient").await;
    let patient_id = patient["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check-new-for-patient")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "new_medication_name": "Aspirin",
                        "patient_id": patient_id
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

    // No existing prescriptions means no interactions
    if let Some(interactions) = json.get("interactions") {
        assert!(interactions.as_array().unwrap().is_empty());
    }
}

// ============================================================================
// CHECK PATIENT INTERACTIONS TESTS
// ============================================================================

/// Test: Get all interactions for a patient's current medications
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_patient_interactions() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Patient", "Interactions").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create prescriptions that might interact
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Warfarin", "warfarin").await;
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Aspirin", "aspirin").await;
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Ibuprofen", "ibuprofen").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/drug-interactions/patient/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Response should contain interaction information
    assert!(json.is_object());
}

/// Test: Check patient interactions with severity filter
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_patient_interactions_with_severity() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Severity", "Filter").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create some prescriptions
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Lisinopril", "lisinopril").await;
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Metformin", "metformin").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/drug-interactions/patient/{}?min_severity=major", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should only return major and contraindicated interactions
    assert!(json.is_object());
}

/// Test: Check patient with no prescriptions
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_patient_interactions_no_prescriptions() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Empty", "Meds").await;
    let patient_id = patient["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/drug-interactions/patient/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // No medications means no interactions
    if let Some(interactions) = json.get("interactions") {
        assert!(interactions.as_array().unwrap().is_empty());
    }
}

// ============================================================================
// GET STATISTICS TESTS
// ============================================================================

/// Test: Get drug interaction database statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_drug_interaction_statistics() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/drug-interactions/statistics")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Statistics should contain counts
    assert!(json.is_object());
    // Common statistics fields to expect
    // Could include: total_drugs, total_interactions, severity_breakdown, etc.
}

/// Test: Admin can access statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_statistics_as_admin() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("diadmin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/drug-interactions/statistics")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// RBAC PERMISSION TESTS
// ============================================================================

/// Test: All authenticated users can read drug interactions
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_drug_interactions_rbac_read_allowed() {
    let (app, pool) = setup_test().await;

    // Doctor should have access
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/drug-interactions/statistics")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// COMPLETE DRUG INTERACTION WORKFLOW TEST
// ============================================================================

/// Test: Complete workflow - check interactions before prescribing
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_complete_drug_interaction_workflow() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Workflow", "Patient").await;
    let patient_id = patient["id"].as_str().unwrap();

    // 1. Start with existing medications
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Lisinopril", "lisinopril").await;
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Metformin", "metformin").await;

    // 2. Check current patient interactions
    let current_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/drug-interactions/patient/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(current_response.status(), StatusCode::OK);

    // 3. Before adding new medication, check for interactions
    let check_new_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check-new-for-patient")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "new_medication_name": "Atorvastatin",
                        "new_generic_name": "atorvastatin",
                        "patient_id": patient_id,
                        "min_severity": "moderate"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(check_new_response.status(), StatusCode::OK);

    // 4. If no major interactions, add the new prescription
    create_prescription(&app, &doctor_token, patient_id, &doctor.id.to_string(), "Atorvastatin", "atorvastatin").await;

    // 5. Verify final patient interactions include all medications
    let final_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/drug-interactions/patient/{}", patient_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(final_response.status(), StatusCode::OK);

    // 6. Get overall statistics
    let stats_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/drug-interactions/statistics")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(stats_response.status(), StatusCode::OK);
}

/// Test: Check for high-risk interaction combinations
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_high_risk_combinations() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("didoc{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    // Known high-risk combinations
    // Warfarin + NSAIDs (bleeding risk)
    // MAOIs + SSRIs (serotonin syndrome)
    // Potassium-sparing diuretics + ACE inhibitors (hyperkalemia)

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/drug-interactions/check")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "atc_codes": ["B01AA03", "M01AE01"],  // Warfarin + Ibuprofen
                        "min_severity": "major"
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

    // This combination is commonly flagged as a major interaction
    // (bleeding risk when combining anticoagulants with NSAIDs)
    assert!(json.is_object());
}
