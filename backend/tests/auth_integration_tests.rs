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
use chrono::{Duration, Utc};
use http_body_util::BodyExt;
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tower::ServiceExt;
use uuid::Uuid;

mod test_utils;
use test_utils::{teardown_test_db, TestApp, TestUser};

/// JWT claims structure for creating test tokens
#[derive(Debug, Serialize, Deserialize)]
struct TestClaims {
    sub: String,
    role: String,
    iat: i64,
    exp: i64,
    token_type: String,
    jti: String,
}

/// Create an expired JWT token for testing
fn create_expired_token(user_id: &Uuid, role: &str) -> String {
    let now = Utc::now();
    // Token expired 1 hour ago
    let expired_at = now - Duration::hours(1);

    let claims = TestClaims {
        sub: user_id.to_string(),
        role: role.to_string(),
        iat: (now - Duration::hours(2)).timestamp(),
        exp: expired_at.timestamp(),
        token_type: "access".to_string(),
        jti: Uuid::new_v4().to_string(),
    };

    // Use the same secret as test configuration
    let secret = "test_secret_key_minimum_32_characters_long_for_security";

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to create expired token")
}

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

/// Test login with MFA enabled - missing MFA code returns 200 with requires_mfa flag
///
/// When MFA is enabled but no code is provided, the API returns 200 OK with
/// `requires_mfa: true` flag. This allows the client to prompt for MFA code
/// and complete the two-step authentication flow.
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

    // Two-step auth flow: returns 200 with requiresMfa flag instead of 401
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify the requiresMfa flag is set (camelCase in JSON response)
    assert_eq!(json["requiresMfa"].as_bool(), Some(true));
    // Verify user info is returned
    assert!(json["user"]["username"].as_str().is_some());
    // Verify tokens are provided (temporary tokens for MFA step)
    assert!(json["tokens"]["access_token"].as_str().is_some());

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

// ============================================================================
// Token Expiration Security Tests
// ============================================================================

/// Test that expired access token is rejected
///
/// This test verifies that the authentication middleware properly rejects
/// tokens that have passed their expiration time.
#[tokio::test]
async fn test_expired_access_token_rejected() {
    let (app, pool) = TestApp::new().await;

    // Create a user (we need a valid user_id for the token, even though
    // the token will be rejected before user lookup)
    let test_user = TestUser::create_active_user(&pool, "doctor_expired", "Test123!", false).await;

    // Create an expired token
    let expired_token = create_expired_token(&test_user.id, "DOCTOR");

    // Try to access a protected endpoint with the expired token
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/users/me")
                .header("authorization", format!("Bearer {}", expired_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should be rejected with 401 Unauthorized
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

/// Test that expired token cannot be used for sensitive operations
///
/// Verifies that expired tokens are rejected even when attempting
/// critical operations like password changes.
#[tokio::test]
async fn test_expired_token_cannot_perform_operations() {
    let (app, pool) = TestApp::new().await;

    let test_user = TestUser::create_active_user(&pool, "doctor_exp_ops", "Test123!", false).await;

    // Create an expired token
    let expired_token = create_expired_token(&test_user.id, "DOCTOR");

    // Try to create a patient with expired token
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", expired_token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Patient",
                        "date_of_birth": "1990-01-01",
                        "gender": "M",
                        "fiscal_code": "TSTPTN90A01H501X"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should be rejected with 401 Unauthorized
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

/// Test that tampered token (modified payload) is rejected
///
/// Verifies that tokens with modified payloads are rejected
/// due to signature verification failure.
#[tokio::test]
async fn test_tampered_token_rejected() {
    let (app, pool) = TestApp::new().await;

    let test_user = TestUser::create_active_user(&pool, "doctor_tamper", "Test123!", false).await;

    // First, login to get a valid token
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
                        "password": "Test123!"
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
    let valid_token = login_json["tokens"]["access_token"].as_str().unwrap();

    // Tamper with the token by changing a character in the payload section
    // JWT format: header.payload.signature
    let parts: Vec<&str> = valid_token.split('.').collect();
    if parts.len() == 3 {
        // Modify the payload slightly
        let mut tampered_payload = parts[1].to_string();
        if let Some(last_char) = tampered_payload.pop() {
            // Change the last character
            let new_char = if last_char == 'A' { 'B' } else { 'A' };
            tampered_payload.push(new_char);
        }

        let tampered_token = format!("{}.{}.{}", parts[0], tampered_payload, parts[2]);

        // Try to use tampered token
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/api/v1/users/me")
                    .header("authorization", format!("Bearer {}", tampered_token))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // Should be rejected with 401 Unauthorized
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    teardown_test_db(&pool).await;
}
