/*!
 * Working Hours Integration Tests
 *
 * Comprehensive integration tests for working hours endpoints:
 * - Get weekly schedule (GET /api/v1/working-hours)
 * - Update day working hours (PUT /api/v1/working-hours/:day)
 * - Update all working hours (PUT /api/v1/working-hours)
 * - List overrides (GET /api/v1/working-hours/overrides)
 * - Get override (GET /api/v1/working-hours/overrides/:id)
 * - Create override (POST /api/v1/working-hours/overrides)
 * - Update override (PUT /api/v1/working-hours/overrides/:id)
 * - Delete override (DELETE /api/v1/working-hours/overrides/:id)
 * - Get effective hours (GET /api/v1/working-hours/effective)
 * - Check working day (GET /api/v1/working-hours/check/:date)
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

    // Clear working hours overrides
    sqlx::query("DELETE FROM working_hours_overrides")
        .execute(&pool)
        .await
        .expect("Failed to clear working hours overrides");

    // Re-seed default working hours after cleanup
    sqlx::query(
        r#"
        INSERT INTO default_working_hours (day_of_week, start_time, end_time, is_working_day) VALUES
            (1, '09:00', '18:00', true),      -- Monday
            (2, '09:00', '18:00', true),      -- Tuesday
            (3, '09:00', '18:00', true),      -- Wednesday
            (4, '09:00', '18:00', true),      -- Thursday
            (5, '09:00', '18:00', true),      -- Friday
            (6, NULL, NULL, false),           -- Saturday
            (7, NULL, NULL, false)            -- Sunday
        ON CONFLICT (day_of_week) DO UPDATE SET
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            is_working_day = EXCLUDED.is_working_day
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to seed default working hours");

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

/// Get a future date for testing overrides (unique per call using microseconds offset)
fn future_date() -> String {
    use chrono::{Duration, Local};
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let offset = COUNTER.fetch_add(1, Ordering::SeqCst) + 7;
    (Local::now() + Duration::days(offset as i64)).format("%Y-%m-%d").to_string()
}

/// Get a future date range for testing effective hours
fn future_date_range() -> (String, String) {
    use chrono::{Duration, Local};
    let from = (Local::now() + Duration::days(1)).format("%Y-%m-%d").to_string();
    let to = (Local::now() + Duration::days(14)).format("%Y-%m-%d").to_string();
    (from, to)
}

// ============================================================================
// Test: Get Weekly Schedule
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_weekly_schedule() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create user (any role can view schedule)
    let doctor = TestUser::create_active_user(&pool, &format!("doc_wh_{}", suffix), "Test123!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    // Get weekly schedule
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/working-hours")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have 7 days
    assert!(json["days"].is_array());
    let days = json["days"].as_array().unwrap();
    assert_eq!(days.len(), 7);

    // Check Monday has default working hours
    let monday = days.iter().find(|d| d["day_of_week"].as_str() == Some("MONDAY")).unwrap();
    assert!(monday["is_working_day"].as_bool().unwrap());
    assert_eq!(monday["start_time"].as_str().unwrap(), "09:00");
    assert_eq!(monday["end_time"].as_str().unwrap(), "18:00");

    // Check Saturday is closed by default
    let saturday = days.iter().find(|d| d["day_of_week"].as_str() == Some("SATURDAY")).unwrap();
    assert!(!saturday["is_working_day"].as_bool().unwrap());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_weekly_schedule_unauthenticated() {
    let (app, _pool) = setup_test().await;

    // Try without authentication
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/working-hours")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ============================================================================
// Test: Update Day Working Hours
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_day_working_hours_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Update Monday's hours
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/working-hours/1")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "day_of_week": 1,
                        "start_time": "08:00",
                        "end_time": "17:00",
                        "break_start": "12:00",
                        "break_end": "13:00",
                        "is_working_day": true
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

    assert_eq!(json["day_of_week"].as_str().unwrap(), "MONDAY");
    assert_eq!(json["start_time"].as_str().unwrap(), "08:00");
    assert_eq!(json["end_time"].as_str().unwrap(), "17:00");
    assert_eq!(json["break_start"].as_str().unwrap(), "12:00");
    assert_eq!(json["break_end"].as_str().unwrap(), "13:00");
    assert!(json["is_working_day"].as_bool().unwrap());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_day_working_hours_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user
    let doctor = TestUser::create_active_user(&pool, &format!("doc_wh_{}", suffix), "Test123!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    // Try to update Monday's hours
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/working-hours/1")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "day_of_week": 1,
                        "start_time": "08:00",
                        "end_time": "17:00",
                        "is_working_day": true
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
async fn test_update_day_invalid_day() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Try invalid day (8)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/working-hours/8")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "day_of_week": 8,
                        "start_time": "09:00",
                        "end_time": "18:00",
                        "is_working_day": true
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
// Test: Update All Working Hours (Bulk)
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_all_working_hours() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Update all days
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/working-hours")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "days": [
                            { "day_of_week": 1, "start_time": "08:00", "end_time": "16:00", "is_working_day": true },
                            { "day_of_week": 2, "start_time": "08:00", "end_time": "16:00", "is_working_day": true },
                            { "day_of_week": 3, "start_time": "08:00", "end_time": "16:00", "is_working_day": true },
                            { "day_of_week": 4, "start_time": "08:00", "end_time": "16:00", "is_working_day": true },
                            { "day_of_week": 5, "start_time": "08:00", "end_time": "16:00", "is_working_day": true },
                            { "day_of_week": 6, "start_time": "09:00", "end_time": "13:00", "is_working_day": true },
                            { "day_of_week": 7, "is_working_day": false }
                        ]
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

    let days = json["days"].as_array().unwrap();
    assert_eq!(days.len(), 7);

    // Check Saturday now has hours
    let saturday = days.iter().find(|d| d["day_of_week"].as_str() == Some("SATURDAY")).unwrap();
    assert!(saturday["is_working_day"].as_bool().unwrap());
    assert_eq!(saturday["start_time"].as_str().unwrap(), "09:00");
    assert_eq!(saturday["end_time"].as_str().unwrap(), "13:00");
}

// ============================================================================
// Test: Create Override
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_override_closed_day() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    let override_date = future_date();

    // Create a CLOSED override
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "Holiday"
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

    assert_eq!(json["override_date"].as_str().unwrap(), override_date);
    assert_eq!(json["override_type"].as_str().unwrap(), "CLOSED");
    assert_eq!(json["reason"].as_str().unwrap(), "Holiday");
    assert!(json["id"].is_string());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_override_custom_hours() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    let override_date = future_date();

    // Create a CUSTOM_HOURS override
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CUSTOM_HOURS",
                        "start_time": "10:00",
                        "end_time": "14:00",
                        "reason": "Half day"
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

    assert_eq!(json["override_type"].as_str().unwrap(), "CUSTOM_HOURS");
    assert_eq!(json["start_time"].as_str().unwrap(), "10:00");
    assert_eq!(json["end_time"].as_str().unwrap(), "14:00");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_override_duplicate_date() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    let override_date = future_date();

    // Create first override
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "First override"
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
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "Duplicate"
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
// Test: List Overrides
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_overrides() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Create an override
    let override_date = future_date();
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "Test"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // List overrides
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/working-hours/overrides?future_only=true")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["overrides"].is_array());
    assert!(json["total"].as_i64().unwrap() >= 1);
}

// ============================================================================
// Test: Get Single Override
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_override() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Create an override
    let override_date = future_date();
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "Test"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let override_id = create_json["id"].as_str().unwrap();

    // Get the override
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/working-hours/overrides/{}", override_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"].as_str().unwrap(), override_id);
    assert_eq!(json["override_date"].as_str().unwrap(), override_date);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_override_not_found() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    let fake_id = "00000000-0000-0000-0000-000000000000";

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/working-hours/overrides/{}", fake_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Update Override
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_override() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Create an override
    let override_date = future_date();
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "Initial"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let override_id = create_json["id"].as_str().unwrap();

    // Update the override
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/working-hours/overrides/{}", override_id))
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_type": "CUSTOM_HOURS",
                        "start_time": "10:00",
                        "end_time": "15:00",
                        "reason": "Updated to half day"
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

    assert_eq!(json["override_type"].as_str().unwrap(), "CUSTOM_HOURS");
    assert_eq!(json["start_time"].as_str().unwrap(), "10:00");
    assert_eq!(json["end_time"].as_str().unwrap(), "15:00");
    assert_eq!(json["reason"].as_str().unwrap(), "Updated to half day");
}

// ============================================================================
// Test: Delete Override
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_override() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Create an override
    let override_date = future_date();
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "To be deleted"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let override_id = create_json["id"].as_str().unwrap();

    // Delete the override
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/working-hours/overrides/{}", override_id))
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
                .uri(format!("/api/v1/working-hours/overrides/{}", override_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Get Effective Hours
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_effective_hours() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_wh_{}", suffix), "Test123!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    let (from_date, to_date) = future_date_range();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/working-hours/effective?from_date={}&to_date={}", from_date, to_date))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["days"].is_array());
    assert_eq!(json["from_date"].as_str().unwrap(), from_date);
    assert_eq!(json["to_date"].as_str().unwrap(), to_date);

    // Should have entries for each day in range
    let days = json["days"].as_array().unwrap();
    assert!(!days.is_empty());

    // Each day should have required fields
    if let Some(first_day) = days.first() {
        assert!(first_day.get("date").is_some());
        assert!(first_day.get("is_working_day").is_some());
        assert!(first_day.get("source").is_some());
    }
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_effective_hours_range_too_large() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_wh_{}", suffix), "Test123!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    use chrono::{Duration, Local};
    let from_date = Local::now().format("%Y-%m-%d").to_string();
    let to_date = (Local::now() + Duration::days(100)).format("%Y-%m-%d").to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/working-hours/effective?from_date={}&to_date={}", from_date, to_date))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// Test: Check Working Day
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_working_day() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_wh_{}", suffix), "Test123!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    // Find the next Monday
    use chrono::{Datelike, Duration, Local, Weekday};
    let today = Local::now().date_naive();
    let days_until_monday = (Weekday::Mon.num_days_from_monday() as i64 + 7 - today.weekday().num_days_from_monday() as i64) % 7;
    let next_monday = if days_until_monday == 0 { today + Duration::days(7) } else { today + Duration::days(days_until_monday) };
    let monday_str = next_monday.format("%Y-%m-%d").to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/working-hours/check/{}", monday_str))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["date"].as_str().unwrap(), monday_str);
    assert!(json["is_working_day"].as_bool().unwrap()); // Monday should be a working day
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_check_working_day_invalid_date() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_wh_{}", suffix), "Test123!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/working-hours/check/invalid-date")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ============================================================================
// Test: Override affects effective hours
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_override_affects_effective_hours() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_wh_{}", suffix), "Test123!").await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Create an override for a specific date
    let override_date = future_date();

    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/working-hours/overrides")
                .header("authorization", format!("Bearer {}", token.clone()))
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "override_date": override_date,
                        "override_type": "CLOSED",
                        "reason": "Special holiday"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Check that effective hours show this as non-working
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/working-hours/effective?from_date={}&to_date={}", override_date, override_date))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    let days = json["days"].as_array().unwrap();
    assert_eq!(days.len(), 1);

    let day = &days[0];
    assert_eq!(day["date"].as_str().unwrap(), override_date);
    assert!(!day["is_working_day"].as_bool().unwrap()); // Should be closed due to override
    assert_eq!(day["source"].as_str().unwrap(), "OVERRIDE");
}
