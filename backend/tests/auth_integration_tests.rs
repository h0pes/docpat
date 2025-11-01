/*!
 * Authentication Integration Tests
 *
 * Comprehensive integration tests for authentication endpoints:
 * - Login (successful, failed password, account locked, inactive account)
 * - MFA verification (valid code, invalid code, missing code)
 * - Token refresh (valid, expired, invalid token)
 * - Logout functionality
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

/// Helper function to read response body as bytes
async fn body_to_bytes(body: axum::body::Body) -> bytes::Bytes {
    body.collect().await.unwrap().to_bytes()
}

/// Test successful login with valid credentials
#[tokio::test]
async fn test_login_success() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor1", "Test123!", false).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Test123!"
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

    // Verify response structure
    assert!(json["user"]["id"].is_string());
    assert_eq!(json["user"]["username"], test_user.username);
    assert_eq!(json["user"]["role"], "DOCTOR");
    assert!(json["tokens"]["access_token"].is_string());
    assert!(json["tokens"]["refresh_token"].is_string());
    assert!(json["tokens"]["expires_in"].is_number());

    teardown_test_db(&pool).await;
}

/// Test login with invalid password
#[tokio::test]
async fn test_login_invalid_password() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor2", "CorrectPass123!", false).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "WrongPass123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["error"], "UNAUTHORIZED");
    assert!(json["message"].as_str().unwrap().contains("Invalid"));

    teardown_test_db(&pool).await;
}

/// Test login with non-existent user
#[tokio::test]
async fn test_login_user_not_found() {
    let (app, pool) = TestApp::new().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": "nonexistent_user",
                        "password": "Password123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

/// Test login with inactive account
#[tokio::test]
async fn test_login_inactive_account() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_inactive_user(&pool, "doctor3", "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Password123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["message"].as_str().unwrap().contains("inactive"));

    teardown_test_db(&pool).await;
}

/// Test account lockout after multiple failed login attempts
#[tokio::test]
async fn test_account_lockout_after_failed_attempts() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor4", "CorrectPass123!", false).await;

    // Attempt 5 failed logins (default max_failed_login_attempts)
    for i in 0..5 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/auth/login")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        json!({
                            "username": test_user.username,
                            "password": "WrongPass123!"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        if i < 4 {
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        } else {
            // After 5th attempt, account should be locked
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        }
    }

    // 6th attempt should return account locked error
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "CorrectPass123!"  // Even with correct password
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["message"].as_str().unwrap().contains("locked"));

    teardown_test_db(&pool).await;
}

/// Test login with MFA enabled - missing MFA code
#[tokio::test]
async fn test_login_mfa_enabled_missing_code() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor5", "Password123!", true).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Password123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["message"].as_str().unwrap().contains("MFA"));

    teardown_test_db(&pool).await;
}

/// Test login with MFA enabled - invalid MFA code
#[tokio::test]
async fn test_login_mfa_enabled_invalid_code() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor6", "Password123!", true).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Password123!",
                        "mfa_code": "000000"  // Invalid code
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["message"].as_str().unwrap().contains("Invalid MFA"));

    teardown_test_db(&pool).await;
}

/// Test login with MFA enabled - valid MFA code
#[tokio::test]
async fn test_login_mfa_enabled_valid_code() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor7", "Password123!", true).await;

    // Generate valid TOTP code
    let valid_code = test_user.generate_totp_code();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Password123!",
                        "mfa_code": valid_code
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

    assert!(json["tokens"]["access_token"].is_string());
    assert!(json["tokens"]["refresh_token"].is_string());

    teardown_test_db(&pool).await;
}

/// Test refresh token with valid token
#[tokio::test]
async fn test_refresh_token_success() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor8", "Password123!", false).await;

    // First, login to get tokens
    let login_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Password123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(login_response.status(), StatusCode::OK);

    let login_body = body_to_bytes(login_response.into_body()).await;
    let login_json: Value = serde_json::from_slice(&login_body).unwrap();
    let refresh_token = login_json["tokens"]["refresh_token"].as_str().unwrap();

    // Now use refresh token to get new access token
    let refresh_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "refresh_token": refresh_token
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(refresh_response.status(), StatusCode::OK);

    let refresh_body = body_to_bytes(refresh_response.into_body()).await;
    let refresh_json: Value = serde_json::from_slice(&refresh_body).unwrap();

    assert!(refresh_json["access_token"].is_string());
    assert!(refresh_json["refresh_token"].is_string());
    assert!(refresh_json["expires_in"].is_number());

    teardown_test_db(&pool).await;
}

/// Test refresh token with invalid token
#[tokio::test]
async fn test_refresh_token_invalid() {
    let (app, pool) = TestApp::new().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "refresh_token": "invalid_token_here"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

/// Test refresh token for inactive user
#[tokio::test]
async fn test_refresh_token_inactive_user() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor9", "Password123!", false).await;

    // First, login to get tokens
    let login_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Password123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let login_body = body_to_bytes(login_response.into_body()).await;
    let login_json: Value = serde_json::from_slice(&login_body).unwrap();
    let refresh_token = login_json["tokens"]["refresh_token"].as_str().unwrap().to_string();

    // Deactivate the user
    test_user.deactivate(&pool).await;

    // Try to refresh token with deactivated account
    let refresh_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "refresh_token": refresh_token
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(refresh_response.status(), StatusCode::FORBIDDEN);

    let body = body_to_bytes(refresh_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["message"].as_str().unwrap().contains("inactive"));

    teardown_test_db(&pool).await;
}

/// Test logout endpoint
#[tokio::test]
async fn test_logout_success() {
    let (app, pool) = TestApp::new().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/logout")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({})
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["message"], "Logged out successfully");

    teardown_test_db(&pool).await;
}

/// Test malformed JSON request
#[tokio::test]
async fn test_login_malformed_json() {
    let (app, pool) = TestApp::new().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from("{invalid json"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

/// Test missing required fields
#[tokio::test]
async fn test_login_missing_fields() {
    let (app, pool) = TestApp::new().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": "doctor10"
                        // missing password
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Axum returns 422 UNPROCESSABLE_ENTITY for JSON deserialization failures
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

    teardown_test_db(&pool).await;
}
