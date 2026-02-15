/*!
 * Holidays Integration Tests
 *
 * Comprehensive integration tests for holiday calendar endpoints:
 * - List holidays (GET /api/v1/holidays)
 * - Get holiday (GET /api/v1/holidays/:id)
 * - Create holiday (POST /api/v1/holidays)
 * - Update holiday (PUT /api/v1/holidays/:id)
 * - Delete holiday (DELETE /api/v1/holidays/:id)
 * - Check holiday (GET /api/v1/holidays/check/:date)
 * - Get holidays range (GET /api/v1/holidays/range)
 * - Import national holidays (POST /api/v1/holidays/import-national)
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
    // Clean database before each test
    teardown_test_db(&pool).await;

    // Clear holidays table
    sqlx::query("DELETE FROM holidays")
        .execute(&pool)
        .await
        .expect("Failed to clear holidays");

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

/// Get a future date for testing (unique per call using counter)
fn future_date() -> String {
    use chrono::{Duration, Local};
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let offset = COUNTER.fetch_add(1, Ordering::SeqCst) + 30;
    (Local::now() + Duration::days(offset as i64)).format("%Y-%m-%d").to_string()
}

// ============================================================================
// Test: List Holidays
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_holidays() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create user (any role can view holidays)
    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    // List holidays (should be empty after cleanup)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["holidays"].is_array());
    assert!(json["total"].is_i64());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_holidays_with_year_filter() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create a holiday for 2027
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": "2027-12-25",
                        "name": "Christmas",
                        "holiday_type": "NATIONAL",
                        "is_recurring": true
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // List holidays for 2027
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays?year=2027")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["total"].as_i64().unwrap() >= 1);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_holidays_unauthenticated() {
    let (app, _pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ============================================================================
// Test: Create Holiday
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_holiday_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "Staff Training Day",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false,
                        "notes": "Annual training session"
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

    assert_eq!(json["holiday_date"].as_str().unwrap(), holiday_date);
    assert_eq!(json["name"].as_str().unwrap(), "Staff Training Day");
    assert_eq!(json["holiday_type"].as_str().unwrap(), "PRACTICE_CLOSED");
    assert!(!json["is_recurring"].as_bool().unwrap());
    assert_eq!(json["notes"].as_str().unwrap(), "Annual training session");
    assert!(json["id"].is_string());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_holiday_national() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": "2027-01-01",
                        "name": "Capodanno",
                        "holiday_type": "NATIONAL",
                        "is_recurring": true
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

    assert_eq!(json["holiday_type"].as_str().unwrap(), "NATIONAL");
    assert!(json["is_recurring"].as_bool().unwrap());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_holiday_vacation() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let vacation_date = future_date();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": vacation_date,
                        "name": "Dr. Smith Vacation",
                        "holiday_type": "VACATION",
                        "is_recurring": false,
                        "notes": "Family vacation"
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

    assert_eq!(json["holiday_type"].as_str().unwrap(), "VACATION");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_holiday_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": "2027-12-25",
                        "name": "Christmas",
                        "holiday_type": "NATIONAL",
                        "is_recurring": true
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_holiday_duplicate_date() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    // Create first holiday
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "First Holiday",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Try to create duplicate
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "Duplicate Holiday",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CONFLICT);
}

// ============================================================================
// Test: Get Single Holiday
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_holiday() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    // Create a holiday
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "Test Holiday",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let holiday_id = create_json["id"].as_str().unwrap();

    // Get the holiday
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/holidays/{}", holiday_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"].as_str().unwrap(), holiday_id);
    assert_eq!(json["holiday_date"].as_str().unwrap(), holiday_date);
    assert_eq!(json["name"].as_str().unwrap(), "Test Holiday");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_holiday_not_found() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let fake_id = "00000000-0000-0000-0000-000000000000";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/holidays/{}", fake_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Update Holiday
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_holiday() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    // Create a holiday
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "Original Name",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let holiday_id = create_json["id"].as_str().unwrap();

    // Update the holiday
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/holidays/{}", holiday_id))
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "name": "Updated Name",
                        "holiday_type": "VACATION",
                        "notes": "Updated notes"
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

    assert_eq!(json["name"].as_str().unwrap(), "Updated Name");
    assert_eq!(json["holiday_type"].as_str().unwrap(), "VACATION");
    assert_eq!(json["notes"].as_str().unwrap(), "Updated notes");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_holiday_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create as admin
    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", admin_token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "Test Holiday",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let holiday_id = create_json["id"].as_str().unwrap();

    // Try to update as doctor
    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/holidays/{}", holiday_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "name": "Attempted Update"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ============================================================================
// Test: Delete Holiday
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_holiday() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    // Create a holiday
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "To be deleted",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let holiday_id = create_json["id"].as_str().unwrap();

    // Delete the holiday
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/holidays/{}", holiday_id))
                .header("authorization", format!("Bearer {}", token.clone()))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify it's gone
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/holidays/{}", holiday_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_holiday_not_found() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let fake_id = "00000000-0000-0000-0000-000000000000";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/holidays/{}", fake_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Check Holiday
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_holiday_is_holiday() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let holiday_date = future_date();

    // Create a holiday
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": holiday_date,
                        "name": "Test Holiday",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Check if it's a holiday
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/holidays/check/{}", holiday_date))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["date"].as_str().unwrap(), holiday_date);
    assert!(json["is_holiday"].as_bool().unwrap());
    assert!(json["holiday"].is_object());
    assert_eq!(json["holiday"]["name"].as_str().unwrap(), "Test Holiday");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_holiday_is_not_holiday() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    // Check a random future date that isn't a holiday
    let random_date = "2099-07-15";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/holidays/check/{}", random_date))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["date"].as_str().unwrap(), random_date);
    assert!(!json["is_holiday"].as_bool().unwrap());
    assert!(json["holiday"].is_null());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_holiday_invalid_date() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays/check/invalid-date")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// Test: Get Holidays Range
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_holidays_range() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create a holiday in range
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": "2027-06-15",
                        "name": "Mid-Year Holiday",
                        "holiday_type": "PRACTICE_CLOSED",
                        "is_recurring": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Get holidays range
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays/range?from_date=2027-06-01&to_date=2027-06-30")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json.is_array());
    let holidays = json.as_array().unwrap();
    assert!(holidays.len() >= 1);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_holidays_range_too_large() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    // Try to get more than 1 year range
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays/range?from_date=2025-01-01&to_date=2027-01-01")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// Test: Import National Holidays
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_import_national_holidays() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Import holidays for 2027 (a year unlikely to have conflicts)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays/import-national")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "year": 2027,
                        "override_existing": false
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

    assert_eq!(json["year"].as_i64().unwrap(), 2027);
    assert!(json["imported_count"].as_i64().unwrap() > 0);
    assert!(json["holidays"].is_array());

    // Should include Easter (varies by year) and fixed holidays
    let holidays = json["holidays"].as_array().unwrap();
    assert!(holidays.len() >= 10); // At least 10 fixed holidays + Easter
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_import_national_holidays_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_hol_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays/import-national")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "year": 2027,
                        "override_existing": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_import_national_holidays_invalid_year() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Try invalid year
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays/import-national")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "year": 1900,
                        "override_existing": false
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// Test: Recurring Holiday Check
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_recurring_holiday_check() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_hol_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create a recurring holiday (Christmas in 2027)
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/holidays")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "holiday_date": "2027-12-25",
                        "name": "Natale",
                        "holiday_type": "NATIONAL",
                        "is_recurring": true
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Check if Christmas 2030 is recognized as a holiday (due to recurring)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/holidays/check/2030-12-25")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["date"].as_str().unwrap(), "2030-12-25");
    assert!(json["is_holiday"].as_bool().unwrap());
    assert!(json["holiday"].is_object());
}
