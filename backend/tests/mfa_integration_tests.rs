/*!
 * MFA (Multi-Factor Authentication) Integration Tests
 *
 * Comprehensive integration tests for MFA endpoints:
 * - MFA setup (secret generation, QR code generation)
 * - MFA enrollment (verification and activation)
 * - Login with MFA (TOTP code verification)
 * - Backup codes (generation, usage, consumption)
 */

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use totp_rs::{Algorithm, Secret, TOTP};
use uuid::Uuid;

mod test_utils;
use test_utils::{teardown_test_db, TestApp, TestUser};

/// Helper function to read response body as bytes
async fn body_to_bytes(body: axum::body::Body) -> bytes::Bytes {
    body.collect().await.unwrap().to_bytes()
}

/// Generate a valid TOTP code for testing
fn generate_totp_code(secret: &str) -> String {
    eprintln!("Generating TOTP code for secret: {} (length: {})", secret, secret.len());

    let secret_bytes = Secret::Encoded(secret.to_string())
        .to_bytes()
        .expect("Failed to decode secret");

    eprintln!("Secret bytes length: {}", secret_bytes.len());

    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        Some("DocPat Medical".to_string()),
        "test@docpat".to_string(),
    )
    .expect("Failed to create TOTP");

    totp.generate_current().expect("Failed to generate code")
}

/// Test MFA setup - should generate secret, QR code, and backup codes
#[tokio::test]
async fn test_mfa_setup_success() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_setup", "Test123!", false).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id
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
    assert!(json["secret"].is_string());
    assert!(json["qr_code"].is_string());
    assert!(json["totp_uri"].is_string());
    assert!(json["backup_codes"].is_array());

    // Verify QR code is base64 encoded PNG
    let qr_code = json["qr_code"].as_str().unwrap();
    assert!(qr_code.starts_with("data:image/png;base64,"));

    // Verify TOTP URI format
    let totp_uri = json["totp_uri"].as_str().unwrap();
    eprintln!("TOTP URI: {}", totp_uri);
    assert!(totp_uri.starts_with("otpauth://totp/"));
    assert!(totp_uri.contains("DocPat") || totp_uri.contains("DocPat%20Medical"),
        "TOTP URI does not contain DocPat Medical: {}", totp_uri);

    // Verify backup codes
    let backup_codes = json["backup_codes"].as_array().unwrap();
    assert_eq!(backup_codes.len(), 10);
    for code in backup_codes {
        let code_str = code.as_str().unwrap();
        assert_eq!(code_str.len(), 8);
        assert!(code_str.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    teardown_test_db(&pool).await;
}

/// Test MFA enrollment with valid code
#[tokio::test]
async fn test_mfa_enrollment_success() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_enroll", "Test123!", false).await;

    // Step 1: Setup MFA
    let setup_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(setup_response.status(), StatusCode::OK);

    let setup_body = body_to_bytes(setup_response.into_body()).await;
    let setup_json: Value = serde_json::from_slice(&setup_body).unwrap();

    let secret = setup_json["secret"].as_str().unwrap();
    let backup_codes = setup_json["backup_codes"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap().to_string())
        .collect::<Vec<_>>();

    // Step 2: Generate valid TOTP code
    let totp_code = generate_totp_code(secret);

    // Step 3: Enroll in MFA
    let enroll_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/enroll")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id,
                        "secret": secret,
                        "code": totp_code,
                        "backup_codes": backup_codes
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(enroll_response.status(), StatusCode::OK);

    let enroll_body = body_to_bytes(enroll_response.into_body()).await;
    let enroll_json: Value = serde_json::from_slice(&enroll_body).unwrap();

    assert_eq!(enroll_json["mfa_enabled"], true);
    assert!(enroll_json["message"].as_str().unwrap().contains("success"));

    teardown_test_db(&pool).await;
}

/// Test MFA enrollment with invalid code
#[tokio::test]
async fn test_mfa_enrollment_invalid_code() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_invalid", "Test123!", false).await;

    // Setup MFA
    let setup_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let setup_body = body_to_bytes(setup_response.into_body()).await;
    let setup_json: Value = serde_json::from_slice(&setup_body).unwrap();
    let secret = setup_json["secret"].as_str().unwrap();
    let backup_codes = setup_json["backup_codes"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap().to_string())
        .collect::<Vec<_>>();

    // Try to enroll with invalid code
    let enroll_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/enroll")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id,
                        "secret": secret,
                        "code": "000000",  // Invalid code
                        "backup_codes": backup_codes
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(enroll_response.status(), StatusCode::UNAUTHORIZED);

    let enroll_body = body_to_bytes(enroll_response.into_body()).await;
    let enroll_json: Value = serde_json::from_slice(&enroll_body).unwrap();

    assert_eq!(enroll_json["error"], "UNAUTHORIZED");
    assert!(enroll_json["message"].as_str().unwrap().contains("Invalid"));

    teardown_test_db(&pool).await;
}

/// Test login with MFA enabled using valid TOTP code
#[tokio::test]
async fn test_login_with_mfa_success() {
    let (app, pool) = TestApp::new().await;

    // Create user with MFA already enabled
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_login", "Test123!", true).await;

    // Generate valid TOTP code
    let totp_code = generate_totp_code(&test_user.mfa_secret.clone().unwrap());
    eprintln!("Generated TOTP code: {}", totp_code);

    // Login with MFA code
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
                        "password": "Test123!",
                        "mfa_code": totp_code
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    if status != StatusCode::OK {
        let body = body_to_bytes(response.into_body()).await;
        eprintln!("Login failed with status {}: {}", status, String::from_utf8_lossy(&body));
        panic!("Expected OK but got {}", status);
    }
    assert_eq!(status, StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["user"]["id"].is_string());
    assert_eq!(json["user"]["username"], test_user.username);
    assert!(json["tokens"]["access_token"].is_string());

    teardown_test_db(&pool).await;
}

/// Test login with MFA enabled but missing MFA code returns 200 with requiresMfa flag
///
/// When MFA is enabled but no code is provided, the API returns 200 OK with
/// `requiresMfa: true` flag. This allows the client to prompt for MFA code
/// and complete the two-step authentication flow.
#[tokio::test]
async fn test_login_with_mfa_missing_code() {
    let (app, pool) = TestApp::new().await;

    // Create user with MFA enabled
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_missing", "Test123!", true).await;

    // Try to login without MFA code
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

/// Test login with MFA enabled but invalid MFA code
#[tokio::test]
async fn test_login_with_mfa_invalid_code() {
    let (app, pool) = TestApp::new().await;

    // Create user with MFA enabled
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_wrong_code", "Test123!", true).await;

    // Try to login with invalid MFA code
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
                        "password": "Test123!",
                        "mfa_code": "999999"  // Invalid code
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

/// Test login with backup code
#[tokio::test]
async fn test_login_with_backup_code() {
    let (app, pool) = TestApp::new().await;

    // Create user with MFA and backup codes
    let test_user = TestUser::create_user_with_backup_codes(&pool, "doctor_backup", "Test123!").await;

    // Get one of the backup codes (before it's hashed)
    let backup_code = test_user.backup_code_plaintext.clone().unwrap();

    // Try to login with backup code
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
                        "password": "Test123!",
                        "mfa_code": backup_code
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

    assert!(json["user"]["id"].is_string());
    assert!(json["tokens"]["access_token"].is_string());

    // Verify backup code was consumed (try using it again)
    let response2 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": test_user.username,
                        "password": "Test123!",
                        "mfa_code": backup_code
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should fail because backup code was already used
    assert_eq!(response2.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

// ============================================================================
// MFA Edge Case Tests
// ============================================================================

/// Test MFA setup for non-existent user returns 404
#[tokio::test]
async fn test_mfa_setup_nonexistent_user() {
    let (app, pool) = TestApp::new().await;

    let fake_user_id = Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": fake_user_id
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["error"], "NOT_FOUND");

    teardown_test_db(&pool).await;
}

/// Test MFA setup for inactive user returns 403 Forbidden
#[tokio::test]
async fn test_mfa_setup_inactive_user() {
    let (app, pool) = TestApp::new().await;
    let inactive_user = TestUser::create_inactive_user(&pool, "inactive_mfa_setup", "Test123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": inactive_user.id
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

    assert_eq!(json["error"], "FORBIDDEN");
    assert!(json["message"].as_str().unwrap().contains("inactive"));

    teardown_test_db(&pool).await;
}

/// Test MFA enrollment for non-existent user returns 404
#[tokio::test]
async fn test_mfa_enroll_nonexistent_user() {
    let (app, pool) = TestApp::new().await;

    let fake_user_id = Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/enroll")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": fake_user_id,
                        "secret": "JBSWY3DPEHPK3PXP",
                        "code": "123456",
                        "backup_codes": ["ABC12345", "DEF67890"]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["error"], "NOT_FOUND");

    teardown_test_db(&pool).await;
}

/// Test MFA enrollment for inactive user returns 403 Forbidden
#[tokio::test]
async fn test_mfa_enroll_inactive_user() {
    let (app, pool) = TestApp::new().await;
    let inactive_user = TestUser::create_inactive_user(&pool, "inactive_mfa_enroll", "Test123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/enroll")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": inactive_user.id,
                        "secret": "JBSWY3DPEHPK3PXP",
                        "code": "123456",
                        "backup_codes": ["ABC12345", "DEF67890"]
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

    assert_eq!(json["error"], "FORBIDDEN");
    assert!(json["message"].as_str().unwrap().contains("inactive"));

    teardown_test_db(&pool).await;
}

/// Test MFA enrollment with invalid secret format returns 400 Bad Request
#[tokio::test]
async fn test_mfa_enroll_invalid_secret_format() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_invalid_secret", "Test123!", false).await;

    // Use an invalid base32 secret (contains invalid characters)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/enroll")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id,
                        "secret": "!!!INVALID_SECRET!!!",
                        "code": "123456",
                        "backup_codes": ["ABC12345", "DEF67890"]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["error"], "BAD_REQUEST");
    assert!(json["message"].as_str().unwrap().contains("Invalid MFA secret"));

    teardown_test_db(&pool).await;
}

/// Test login with MFA code that is too short
#[tokio::test]
async fn test_login_with_mfa_code_too_short() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_short", "Test123!", true).await;

    // Try to login with MFA code that's too short (5 digits)
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
                        "password": "Test123!",
                        "mfa_code": "12345"  // Too short - only 5 digits
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

    teardown_test_db(&pool).await;
}

/// Test login with MFA code that is too long
#[tokio::test]
async fn test_login_with_mfa_code_too_long() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_mfa_long", "Test123!", true).await;

    // Try to login with MFA code that's too long (10 digits)
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
                        "password": "Test123!",
                        "mfa_code": "1234567890"  // Too long - 10 digits
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

    teardown_test_db(&pool).await;
}

/// Test login with invalid backup code (correct format but wrong code)
#[tokio::test]
async fn test_login_with_invalid_backup_code() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_user_with_backup_codes(&pool, "doctor_bad_backup", "Test123!").await;

    // Try to login with a fake backup code (8 char alphanumeric, correct format)
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
                        "password": "Test123!",
                        "mfa_code": "FAKECODE"  // Valid format but wrong code
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

    teardown_test_db(&pool).await;
}

/// Test MFA setup returns different secrets on each call
#[tokio::test]
async fn test_mfa_setup_generates_unique_secrets() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_unique_secret", "Test123!", false).await;

    // First setup call
    let response1 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response1.status(), StatusCode::OK);
    let body1 = body_to_bytes(response1.into_body()).await;
    let json1: Value = serde_json::from_slice(&body1).unwrap();
    let secret1 = json1["secret"].as_str().unwrap().to_string();

    // Second setup call
    let response2 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response2.status(), StatusCode::OK);
    let body2 = body_to_bytes(response2.into_body()).await;
    let json2: Value = serde_json::from_slice(&body2).unwrap();
    let secret2 = json2["secret"].as_str().unwrap().to_string();

    // Secrets should be different on each call
    assert_ne!(secret1, secret2, "MFA setup should generate unique secrets each time");

    teardown_test_db(&pool).await;
}

/// Test MFA enrollment with empty backup codes array
#[tokio::test]
async fn test_mfa_enroll_empty_backup_codes() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "doctor_empty_backup", "Test123!", false).await;

    // Setup MFA first
    let setup_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/setup")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let setup_body = body_to_bytes(setup_response.into_body()).await;
    let setup_json: Value = serde_json::from_slice(&setup_body).unwrap();
    let secret = setup_json["secret"].as_str().unwrap();
    let totp_code = generate_totp_code(secret);

    // Try to enroll with empty backup codes array
    let enroll_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/mfa/enroll")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "user_id": test_user.id,
                        "secret": secret,
                        "code": totp_code,
                        "backup_codes": []  // Empty array
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should succeed but user will have no backup codes
    assert_eq!(enroll_response.status(), StatusCode::OK);

    let enroll_body = body_to_bytes(enroll_response.into_body()).await;
    let enroll_json: Value = serde_json::from_slice(&enroll_body).unwrap();
    assert_eq!(enroll_json["mfa_enabled"], true);

    teardown_test_db(&pool).await;
}
