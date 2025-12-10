/*!
 * System Settings Integration Tests
 *
 * Comprehensive integration tests for settings endpoints:
 * - List settings (GET /api/v1/settings)
 * - Get setting by key (GET /api/v1/settings/:key)
 * - Update setting (PUT /api/v1/settings/:key)
 * - Bulk update settings (POST /api/v1/settings/bulk)
 * - Reset setting (POST /api/v1/settings/reset/:key)
 * - List groups (GET /api/v1/settings/groups)
 * - Get settings by group (GET /api/v1/settings/group/:group)
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

// ============================================================================
// Test: List Settings
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_settings_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // List all settings
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have settings
    assert!(json["settings"].is_array());
    assert!(json["total"].as_i64().unwrap() > 0);

    // Check that settings have expected structure
    let settings = json["settings"].as_array().unwrap();
    if let Some(first) = settings.first() {
        assert!(first.get("setting_key").is_some());
        assert!(first.get("setting_group").is_some());
        assert!(first.get("setting_name").is_some());
        assert!(first.get("setting_value").is_some());
        assert!(first.get("value_type").is_some());
    }
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_settings_as_doctor_sees_public_only() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("doctor_settings_{}", suffix),
        "Test123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    // List settings (should only see public ones)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned settings should be public
    let settings = json["settings"].as_array().unwrap();
    for setting in settings {
        assert_eq!(setting["is_public"].as_bool().unwrap(), true);
    }
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_settings_with_group_filter() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings2_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // List settings filtered by clinic group
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings?group=clinic")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned settings should be in clinic group
    let settings = json["settings"].as_array().unwrap();
    assert!(!settings.is_empty());
    for setting in settings {
        assert_eq!(setting["setting_group"].as_str().unwrap(), "clinic");
    }
}

// ============================================================================
// Test: Get Single Setting
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_setting_by_key() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings3_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Get specific setting
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings/clinic.name")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["setting_key"].as_str().unwrap(), "clinic.name");
    assert_eq!(json["setting_group"].as_str().unwrap(), "clinic");
    assert!(json.get("setting_value").is_some());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_setting() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings4_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Get nonexistent setting
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings/nonexistent.setting")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Update Setting
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_setting_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings5_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Update setting
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/settings/clinic.name")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "value": "Test Medical Practice"
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

    assert_eq!(
        json["setting_value"].as_str().unwrap(),
        "Test Medical Practice"
    );

    // Verify the change persisted
    let verify_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings/clinic.name")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let verify_body = body_to_bytes(verify_response.into_body()).await;
    let verify_json: Value = serde_json::from_slice(&verify_body).unwrap();

    assert_eq!(
        verify_json["setting_value"].as_str().unwrap(),
        "Test Medical Practice"
    );
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_setting_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("doctor_settings2_{}", suffix),
        "Test123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Test123!").await;

    // Try to update setting (should be forbidden)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/settings/clinic.name")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "value": "Unauthorized Change"
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
async fn test_update_setting_with_invalid_type() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings6_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Try to update an integer setting with a string (should fail)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/settings/appointment.default_duration")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "value": "not an integer"
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
// Test: Reset Setting
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_reset_setting_to_default() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings7_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // First, update the setting
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/settings/clinic.name")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "value": "Modified Practice Name"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Now reset to default
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/settings/reset/clinic.name")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should be reset to default value
    assert_eq!(json["setting_value"].as_str().unwrap(), "Medical Practice");
}

// ============================================================================
// Test: List Groups
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_setting_groups() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings8_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // List all groups
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings/groups")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have groups
    assert!(json["groups"].is_array());
    let groups = json["groups"].as_array().unwrap();
    assert!(!groups.is_empty());

    // Check expected groups exist
    let group_keys: Vec<&str> = groups.iter().filter_map(|g| g["key"].as_str()).collect();

    assert!(group_keys.contains(&"clinic"));
    assert!(group_keys.contains(&"appointment"));
    assert!(group_keys.contains(&"security"));
}

// ============================================================================
// Test: Get Settings by Group
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_settings_by_group() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings9_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Get security settings group
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings/group/security")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have security settings
    let settings = json["settings"].as_array().unwrap();
    assert!(!settings.is_empty());

    // All should be in security group
    for setting in settings {
        assert_eq!(setting["setting_group"].as_str().unwrap(), "security");
    }
}

// ============================================================================
// Test: Bulk Update Settings
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_bulk_update_settings() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin =
        TestUser::create_admin_user(&pool, &format!("admin_settings10_{}", suffix), "Test123!")
            .await;
    let token = login_and_get_token(&app, &admin.username, "Test123!").await;

    // Bulk update multiple settings
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/settings/bulk")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "settings": [
                            {
                                "key": "clinic.name",
                                "value": "Bulk Updated Clinic"
                            },
                            {
                                "key": "clinic.phone",
                                "value": "+39 02 1234567"
                            }
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

    // Should return array of updated settings
    assert!(json.is_array());
    assert_eq!(json.as_array().unwrap().len(), 2);
}

// ============================================================================
// Test: Unauthenticated Access
// ============================================================================

#[tokio::test]
async fn test_settings_unauthenticated() {
    let (app, _pool) = setup_test().await;

    // Try to list settings without authentication
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/settings")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
