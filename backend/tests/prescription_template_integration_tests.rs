/*!
 * Prescription Template Integration Tests
 *
 * Tests for prescription template CRUD operations.
 * Run with: cargo test --test prescription_template_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1
 */

mod test_utils;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use uuid::Uuid;

use test_utils::{teardown_test_db, TestApp, TestUser};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Generate unique suffix for test data
fn unique_suffix() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();
    format!("{}", nanos % 1_000_000)
}

/// Helper function to setup test environment with clean database
async fn setup_test() -> (axum::Router, sqlx::PgPool) {
    let (app, pool) = TestApp::new().await;
    teardown_test_db(&pool).await;
    (app, pool)
}

/// Helper function for teardown
async fn teardown(pool: &sqlx::PgPool) {
    teardown_test_db(pool).await;
}

/// Convert body to bytes helper
async fn body_to_bytes(body: Body) -> bytes::Bytes {
    body.collect().await.unwrap().to_bytes()
}

/// Login and get access token
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

/// Create a test prescription template
async fn create_test_template(app: &axum::Router, token: &str, name: &str) -> Value {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescription-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": name,
                        "description": "Test template description",
                        "medications": [
                            {
                                "medication_name": "Ibuprofen",
                                "generic_name": "Ibuprofen",
                                "dosage": "400mg",
                                "form": "TABLET",
                                "route": "ORAL",
                                "frequency": "3 times daily",
                                "duration": "7 days",
                                "quantity": 21,
                                "refills": 0,
                                "instructions": "Take with food"
                            }
                        ]
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
        panic!(
            "Failed to create template: {} - {}",
            status,
            String::from_utf8_lossy(&body)
        );
    }
    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// CREATE TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_create_template_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("templ_doc{}", suffix);
    let password = "TestPass123!";

    // Create doctor user
    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create template
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescription-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": format!("Test Template {}", suffix),
                        "description": "A test prescription template",
                        "medications": [
                            {
                                "medication_name": "Amoxicillin",
                                "generic_name": "Amoxicillin",
                                "dosage": "500mg",
                                "form": "CAPSULE",
                                "route": "ORAL",
                                "frequency": "3 times daily",
                                "duration": "10 days",
                                "quantity": 30,
                                "refills": 1,
                                "instructions": "Take with or without food"
                            }
                        ]
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

    assert!(json["id"].as_str().is_some());
    assert!(json["template_name"].as_str().unwrap().contains("Test Template"));
    assert_eq!(json["medications"].as_array().unwrap().len(), 1);
    assert!(json["is_active"].as_bool().unwrap());

    teardown(&pool).await;
}

#[tokio::test]
async fn test_create_template_unauthenticated_fails() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescription-templates")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "template_name": "Test Template",
                        "medications": [{"medication_name": "Test", "dosage": "100mg", "frequency": "daily"}]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown(&pool).await;
}

#[tokio::test]
async fn test_create_template_empty_medications_fails() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("templ_empty{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescription-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": "Empty Template",
                        "medications": []
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown(&pool).await;
}

// ============================================================================
// GET TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_get_template_by_id_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("get_templ{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create a template first
    let template = create_test_template(&app, &token, &format!("Get Test Template {}", suffix)).await;
    let template_id = template["id"].as_str().unwrap();

    // Get template by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/prescription-templates/{}", template_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"].as_str().unwrap(), template_id);

    teardown(&pool).await;
}

#[tokio::test]
async fn test_get_nonexistent_template_returns_404() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("get_404{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    let fake_id = Uuid::new_v4();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/prescription-templates/{}", fake_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown(&pool).await;
}

// ============================================================================
// LIST TEMPLATES TESTS
// ============================================================================

#[tokio::test]
async fn test_list_templates_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("list_templ{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create two templates
    create_test_template(&app, &token, &format!("List Template 1 {}", suffix)).await;
    create_test_template(&app, &token, &format!("List Template 2 {}", suffix)).await;

    // List templates
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/prescription-templates")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have at least the 2 templates we created
    assert!(json.as_array().unwrap().len() >= 2);

    teardown(&pool).await;
}

#[tokio::test]
async fn test_list_templates_active_only_filter() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("list_active{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create a template
    create_test_template(&app, &token, &format!("Active Template {}", suffix)).await;

    // List with active_only=true (default)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/prescription-templates?active_only=true")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned templates should be active
    for template in json.as_array().unwrap() {
        assert!(template["is_active"].as_bool().unwrap());
    }

    teardown(&pool).await;
}

// ============================================================================
// UPDATE TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_update_template_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("upd_templ{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create a template
    let template = create_test_template(&app, &token, &format!("Original Name {}", suffix)).await;
    let template_id = template["id"].as_str().unwrap();

    // Update template
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/prescription-templates/{}", template_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": format!("Updated Name {}", suffix),
                        "description": "Updated description"
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

    assert!(json["template_name"].as_str().unwrap().contains("Updated Name"));

    teardown(&pool).await;
}

#[tokio::test]
async fn test_update_template_other_users_template_fails() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username1 = format!("user1_{}", suffix);
    let username2 = format!("user2_{}", suffix);
    let password = "TestPass123!";

    // Create two doctors
    TestUser::create_active_user(&pool, &username1, password, false).await;
    TestUser::create_active_user(&pool, &username2, password, false).await;

    let token1 = login_and_get_token(&app, &username1, password).await;
    let token2 = login_and_get_token(&app, &username2, password).await;

    // User1 creates a template
    let template = create_test_template(&app, &token1, &format!("User1 Template {}", suffix)).await;
    let template_id = template["id"].as_str().unwrap();

    // User2 tries to update User1's template
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/prescription-templates/{}", template_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token2))
                .body(Body::from(
                    json!({
                        "template_name": "Hijacked Template"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should fail with Forbidden
    assert!(
        response.status() == StatusCode::FORBIDDEN || response.status() == StatusCode::INTERNAL_SERVER_ERROR
    );

    teardown(&pool).await;
}

// ============================================================================
// DELETE TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_delete_template_as_admin_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let doctor_username = format!("del_doc{}", suffix);
    let admin_username = format!("del_admin{}", suffix);
    let password = "TestPass123!";

    // Create doctor and admin
    TestUser::create_active_user(&pool, &doctor_username, password, false).await;
    TestUser::create_admin_user(&pool, &admin_username, password).await;

    let doctor_token = login_and_get_token(&app, &doctor_username, password).await;
    let admin_token = login_and_get_token(&app, &admin_username, password).await;

    // Doctor creates a template
    let template = create_test_template(&app, &doctor_token, &format!("To Delete {}", suffix)).await;
    let template_id = template["id"].as_str().unwrap();

    // Admin deletes the template
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/prescription-templates/{}", template_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    teardown(&pool).await;
}

#[tokio::test]
async fn test_delete_template_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("del_forb{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create a template
    let template = create_test_template(&app, &token, &format!("Cannot Delete {}", suffix)).await;
    let template_id = template["id"].as_str().unwrap();

    // Try to delete as doctor (should fail)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/prescription-templates/{}", template_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown(&pool).await;
}

// ============================================================================
// EDGE CASES AND VALIDATION
// ============================================================================

#[tokio::test]
async fn test_create_template_with_multiple_medications() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("multi_med{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/prescription-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": format!("Multi Medication Template {}", suffix),
                        "description": "Template with multiple medications",
                        "medications": [
                            {
                                "medication_name": "Lisinopril",
                                "dosage": "10mg",
                                "frequency": "once daily",
                                "instructions": "Take in the morning"
                            },
                            {
                                "medication_name": "Metformin",
                                "dosage": "500mg",
                                "frequency": "twice daily",
                                "instructions": "Take with meals"
                            },
                            {
                                "medication_name": "Atorvastatin",
                                "dosage": "20mg",
                                "frequency": "once daily at bedtime",
                                "instructions": "Take at night"
                            }
                        ]
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

    assert_eq!(json["medications"].as_array().unwrap().len(), 3);

    teardown(&pool).await;
}
