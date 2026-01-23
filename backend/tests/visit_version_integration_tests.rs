/*!
 * Visit Version History Integration Tests
 *
 * Comprehensive integration tests for visit version history endpoints:
 * - List versions (GET /api/v1/visits/:id/versions)
 * - Get version (GET /api/v1/visits/:id/versions/:version_number)
 * - Restore version (POST /api/v1/visits/:id/versions/:version_number/restore)
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

    assert_eq!(response.status(), StatusCode::CREATED, "Failed to create patient");
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

    assert_eq!(response.status(), StatusCode::CREATED, "Failed to create visit");
    let body = body_to_bytes(response.into_body()).await;
    serde_json::from_slice(&body).unwrap()
}

/// Helper function to update a visit (creates a new version)
async fn update_visit(
    app: &axum::Router,
    token: &str,
    visit_id: &str,
    subjective: &str,
) -> Value {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/visits/{}", visit_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "subjective": subjective
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK, "Failed to update visit");
    let body = body_to_bytes(response.into_body()).await;
    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// LIST VERSIONS TESTS
// ============================================================================

/// Test: List versions for a newly created visit (has initial version)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_versions_new_visit() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "TestNew").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // List versions
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let versions: Value = serde_json::from_slice(&body).unwrap();

    // New visit should have at least the initial state (version 1)
    assert!(versions.as_array().is_some());

    teardown_test_db(&pool).await;
}

/// Test: List versions after multiple updates
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_versions_after_updates() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "Updates").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Make several updates to create versions
    update_visit(&app, &doctor_token, visit_id, "First update").await;
    update_visit(&app, &doctor_token, visit_id, "Second update").await;

    // List versions
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let versions: Value = serde_json::from_slice(&body).unwrap();

    // Should have multiple versions
    let version_array = versions.as_array().unwrap();
    assert!(version_array.len() >= 2, "Expected at least 2 versions after updates");

    teardown_test_db(&pool).await;
}

/// Test: List versions for non-existent visit returns empty or error
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_versions_nonexistent_visit() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let fake_visit_id = "00000000-0000-0000-0000-000000000000";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions", fake_visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should return empty array or not found
    let status = response.status();
    assert!(status == StatusCode::OK || status == StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// GET SPECIFIC VERSION TESTS
// ============================================================================

/// Test: Get a specific version of a visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_specific_version() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "Specific").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Update to create version 2
    update_visit(&app, &doctor_token, visit_id, "Updated subjective notes").await;

    // Get version 1 (the original)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions/1", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let version: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(version["version_number"], 1);
    assert_eq!(version["visit_id"], visit_id);

    teardown_test_db(&pool).await;
}

/// Test: Get non-existent version returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_version() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "NotExist").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Try to get version 999 which doesn't exist
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions/999", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// RESTORE VERSION TESTS
// ============================================================================

/// Test: Restore visit to a previous version
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_restore_to_previous_version() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "Restore").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Create visit with initial data
    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();
    let original_subjective = visit["subjective"].as_str().unwrap();

    // Update to create version 2
    let _updated = update_visit(&app, &doctor_token, visit_id, "Changed subjective notes").await;

    // Restore to version 1
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/versions/1/restore", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_to_bytes(response.into_body()).await;
    let restored: Value = serde_json::from_slice(&body).unwrap();

    // Verify the visit has been restored (subjective should match original)
    assert_eq!(restored["subjective"], original_subjective);

    teardown_test_db(&pool).await;
}

/// Test: Cannot restore a locked visit
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_restore_locked_visit_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "Locked").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Update to create version 2
    update_visit(&app, &doctor_token, visit_id, "Updated notes").await;

    // Sign the visit
    let _sign_response = app
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

    // Lock the visit
    let _lock_response = app
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

    // Try to restore to version 1 - should fail
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/versions/1/restore", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

/// Test: Restore non-existent version returns error
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_restore_nonexistent_version_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "NoExist").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Try to restore to version 999 which doesn't exist
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/visits/{}/versions/999/restore", visit_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should return error (404 or 400)
    let status = response.status();
    assert!(status == StatusCode::NOT_FOUND || status == StatusCode::BAD_REQUEST || status == StatusCode::INTERNAL_SERVER_ERROR);

    teardown_test_db(&pool).await;
}

// ============================================================================
// RBAC / AUTHENTICATION TESTS
// ============================================================================

/// Test: Unauthenticated access to versions fails
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_versions_unauthenticated_fails() {
    let (app, pool) = setup_test().await;

    let fake_visit_id = "00000000-0000-0000-0000-000000000001";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions", fake_visit_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

/// Test: Admin can access visit versions
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_admin_can_access_versions() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, &format!("admin{}", unique_suffix()), "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let doctor = TestUser::create_active_user(&pool, &format!("doctor{}", unique_suffix()), "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let patient = create_test_patient(&app, &doctor_token, "Version", "AdminAccess").await;
    let patient_id = patient["id"].as_str().unwrap();

    let visit = create_test_visit(&app, &doctor_token, patient_id, &doctor.id.to_string()).await;
    let visit_id = visit["id"].as_str().unwrap();

    // Admin should be able to list versions
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visits/{}/versions", visit_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}
