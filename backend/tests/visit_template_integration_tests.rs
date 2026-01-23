/*!
 * Visit Template Integration Tests
 *
 * Tests for visit template CRUD operations (SOAP notes templates).
 * Run with: cargo test --test visit_template_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1
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

/// Create a test visit template
async fn create_test_template(app: &axum::Router, token: &str, name: &str) -> Value {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visit-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": name,
                        "description": "Test SOAP template for routine visits",
                        "subjective": "Patient presents with [chief complaint]. History of present illness includes...",
                        "objective": "Vital signs: BP [value], HR [value], Temp [value]. Physical exam...",
                        "assessment": "1. [Primary diagnosis]\n2. [Secondary diagnosis]",
                        "plan": "1. [Treatment plan]\n2. Follow-up in [time period]"
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
async fn test_create_visit_template_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_doc{}", suffix);
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
                .uri("/api/v1/visit-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": format!("Routine Checkup Template {}", suffix),
                        "description": "Standard template for routine health checkups",
                        "subjective": "Patient reports no new complaints...",
                        "objective": "General appearance: Well-appearing, alert, oriented x3",
                        "assessment": "Health maintenance visit",
                        "plan": "Continue current medications. Return in 6 months."
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
    assert!(json["template_name"].as_str().unwrap().contains("Routine Checkup"));
    assert!(json["is_active"].as_bool().unwrap());

    teardown(&pool).await;
}

#[tokio::test]
async fn test_create_visit_template_unauthenticated_fails() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visit-templates")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "template_name": "Test Template"
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
async fn test_create_visit_template_minimal_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_min{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Create template with only required field (template_name)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visit-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": format!("Minimal Template {}", suffix)
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    teardown(&pool).await;
}

// ============================================================================
// GET TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_get_visit_template_by_id_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_get{}", suffix);
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
                .uri(format!("/api/v1/visit-templates/{}", template_id))
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
    // Verify SOAP fields are present
    assert!(json["subjective"].as_str().is_some());
    assert!(json["objective"].as_str().is_some());
    assert!(json["assessment"].as_str().is_some());
    assert!(json["plan"].as_str().is_some());

    teardown(&pool).await;
}

#[tokio::test]
async fn test_get_nonexistent_visit_template_returns_404() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_404{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    let fake_id = Uuid::new_v4();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/visit-templates/{}", fake_id))
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
async fn test_list_visit_templates_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_list{}", suffix);
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
                .uri("/api/v1/visit-templates")
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

// ============================================================================
// UPDATE TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_update_visit_template_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_upd{}", suffix);
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
                .uri(format!("/api/v1/visit-templates/{}", template_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": format!("Updated Name {}", suffix),
                        "description": "Updated description",
                        "subjective": "Updated subjective section"
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
async fn test_update_visit_template_other_users_fails() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username1 = format!("vtu1_{}", suffix);
    let username2 = format!("vtu2_{}", suffix);
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
                .uri(format!("/api/v1/visit-templates/{}", template_id))
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

    // Should fail with Forbidden or Internal Server Error
    assert!(
        response.status() == StatusCode::FORBIDDEN || response.status() == StatusCode::INTERNAL_SERVER_ERROR
    );

    teardown(&pool).await;
}

// ============================================================================
// DELETE TEMPLATE TESTS
// ============================================================================

#[tokio::test]
async fn test_delete_visit_template_as_admin_success() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let doctor_username = format!("vtd_doc{}", suffix);
    let admin_username = format!("vtd_adm{}", suffix);
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
                .uri(format!("/api/v1/visit-templates/{}", template_id))
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
async fn test_delete_visit_template_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vtd_forb{}", suffix);
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
                .uri(format!("/api/v1/visit-templates/{}", template_id))
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
// VALIDATION TESTS
// ============================================================================

#[tokio::test]
async fn test_create_visit_template_name_too_long_fails() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();
    let username = format!("vt_long{}", suffix);
    let password = "TestPass123!";

    TestUser::create_active_user(&pool, &username, password, false).await;
    let token = login_and_get_token(&app, &username, password).await;

    // Try to create template with name > 255 chars
    let long_name = "A".repeat(300);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/visit-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "template_name": long_name
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
