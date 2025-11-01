/*!
 * User Management & RBAC Integration Tests
 *
 * Comprehensive integration tests for user management endpoints and RBAC:
 * - Create user (ADMIN only)
 * - Get user (ADMIN or own profile)
 * - Update user (ADMIN or own profile with restrictions)
 * - List users (ADMIN only)
 * - Activate/Deactivate user (ADMIN only)
 * - Assign role (ADMIN only)
 * - Reset password (ADMIN only)
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
// CREATE USER TESTS
// ============================================================================

/// Test: Admin can create a new user
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_user_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin1", "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "username": "newdoctor",
                        "email": "newdoctor@test.com",
                        "password": "NewDoctor123!",
                        "role": "DOCTOR",
                        "first_name": "New",
                        "last_name": "Doctor",
                        "phone": "+1234567890"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;

    // Debug output
    if status != StatusCode::CREATED {
        eprintln!("Status: {}", status);
        eprintln!("Body: {}", String::from_utf8_lossy(&body));
    }

    assert_eq!(status, StatusCode::CREATED);

    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["username"], "newdoctor");
    assert_eq!(json["email"], "newdoctor@test.com");
    assert_eq!(json["role"], "DOCTOR");
    assert_eq!(json["first_name"], "New");
    assert_eq!(json["last_name"], "Doctor");
    assert!(json["is_active"].as_bool().unwrap());

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot create a new user (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_user_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, "doctor1", "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "username": "anotherdoctor",
                        "email": "anotherdoctor@test.com",
                        "password": "AnotherDoctor123!",
                        "role": "DOCTOR",
                        "first_name": "Another",
                        "last_name": "Doctor"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

/// Test: Create user with weak password fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_user_weak_password_validation() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin2", "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "username": "weakpass",
                        "email": "weakpass@test.com",
                        "password": "weak",  // Too weak
                        "role": "DOCTOR",
                        "first_name": "Weak",
                        "last_name": "Pass"
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
    assert!(json["message"].as_str().unwrap().contains("complexity"));

    teardown_test_db(&pool).await;
}

/// Test: Create user with duplicate username fails
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_user_duplicate_username() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin3", "AdminPass123!").await;
    let _existing = TestUser::create_active_user(&pool, "existing", "Existing123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "username": "existing",  // Duplicate
                        "email": "newemail@test.com",
                        "password": "NewPass123!",
                        "role": "DOCTOR",
                        "first_name": "New",
                        "last_name": "User"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CONFLICT);

    teardown_test_db(&pool).await;
}

// ============================================================================
// GET USER TESTS
// ============================================================================

/// Test: Admin can get any user's details
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_user_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin4", "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, "doctor2", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/users/{}", doctor.id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["username"], doctor.username);
    assert_eq!(json["email"], doctor.email);
    assert_eq!(json["role"], "DOCTOR");

    teardown_test_db(&pool).await;
}

/// Test: Doctor can get their own profile
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_own_user_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, "doctor3", "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/users/{}", doctor.id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["username"], doctor.username);

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot get another user's details (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_other_user_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor1 = TestUser::create_active_user(&pool, "doctor4", "DoctorPass123!", false).await;
    let doctor2 = TestUser::create_active_user(&pool, "doctor5", "DoctorPass123!", false).await;
    let doctor1_token = login_and_get_token(&app, &doctor1.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/users/{}", doctor2.id))
                .header("authorization", format!("Bearer {}", doctor1_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

/// Test: Get non-existent user returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_user() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin5", "AdminPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let fake_id = uuid::Uuid::new_v4();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/users/{}", fake_id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// UPDATE USER TESTS
// ============================================================================

/// Test: Admin can update any user's information
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_user_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin6", "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, "doctor6", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/users/{}", doctor.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "first_name": "Updated",
                        "last_name": "Name",
                        "email": "updated@test.com"
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

    assert_eq!(json["first_name"], "Updated");
    assert_eq!(json["last_name"], "Name");
    assert_eq!(json["email"], "updated@test.com");

    teardown_test_db(&pool).await;
}

/// Test: Doctor can update their own information (except role)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_own_user_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, "doctor7", "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/users/{}", doctor.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "first_name": "Self",
                        "last_name": "Updated",
                        "phone": "+9876543210"
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

    assert_eq!(json["first_name"], "Self");
    assert_eq!(json["last_name"], "Updated");

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot change their own role
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_own_role_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, "doctor8", "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/users/{}", doctor.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(
                    json!({
                        "role": "ADMIN"  // Trying to escalate privileges
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot update another user
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_other_user_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor1 = TestUser::create_active_user(&pool, "doctor9", "DoctorPass123!", false).await;
    let doctor2 = TestUser::create_active_user(&pool, "doctor10", "DoctorPass123!", false).await;
    let doctor1_token = login_and_get_token(&app, &doctor1.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/users/{}", doctor2.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor1_token))
                .body(Body::from(
                    json!({
                        "first_name": "Hacked"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

// ============================================================================
// LIST USERS TESTS
// ============================================================================

/// Test: Admin can list all users
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_users_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin7", "AdminPass123!").await;
    let _doctor1 = TestUser::create_active_user(&pool, "doctor11", "DoctorPass123!", false).await;
    let _doctor2 = TestUser::create_active_user(&pool, "doctor12", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/users")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["users"].is_array());
    assert!(json["users"].as_array().unwrap().len() >= 3); // At least admin + 2 doctors
    assert!(json["total"].is_number());
    assert!(json["total"].as_i64().unwrap() >= 3);

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot list users (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_users_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(&pool, "doctor13", "DoctorPass123!", false).await;
    let doctor_token = login_and_get_token(&app, &doctor.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/users")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

/// Test: List users with pagination
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_users_with_pagination() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin8", "AdminPass123!").await;

    // Create several test users
    for i in 1..=5 {
        TestUser::create_active_user(&pool, &format!("doctor{}", i), "DoctorPass123!", false).await;
    }

    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/users?limit=2&offset=0")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["limit"], 2);
    assert_eq!(json["offset"], 0);
    assert_eq!(json["users"].as_array().unwrap().len(), 2);

    teardown_test_db(&pool).await;
}

// ============================================================================
// ACTIVATE/DEACTIVATE USER TESTS
// ============================================================================

/// Test: Admin can deactivate a user
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_deactivate_user_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin9", "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, "doctor14", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/deactivate", doctor.id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["is_active"], false);

    teardown_test_db(&pool).await;
}

/// Test: Admin can activate a user
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_activate_user_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin10", "AdminPass123!").await;
    let doctor = TestUser::create_inactive_user(&pool, "doctor15", "DoctorPass123!").await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/activate", doctor.id))
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["is_active"], true);

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot deactivate users (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_deactivate_user_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor1 = TestUser::create_active_user(&pool, "doctor16", "DoctorPass123!", false).await;
    let doctor2 = TestUser::create_active_user(&pool, "doctor17", "DoctorPass123!", false).await;
    let doctor1_token = login_and_get_token(&app, &doctor1.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/deactivate", doctor2.id))
                .header("authorization", format!("Bearer {}", doctor1_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

// ============================================================================
// ASSIGN ROLE TESTS
// ============================================================================

/// Test: Admin can assign role to user
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_assign_role_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin11", "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, "doctor18", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/role", doctor.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "role": "ADMIN"
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

    assert_eq!(json["role"], "ADMIN");

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot assign roles (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_assign_role_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor1 = TestUser::create_active_user(&pool, "doctor19", "DoctorPass123!", false).await;
    let doctor2 = TestUser::create_active_user(&pool, "doctor20", "DoctorPass123!", false).await;
    let doctor1_token = login_and_get_token(&app, &doctor1.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/role", doctor2.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor1_token))
                .body(Body::from(
                    json!({
                        "role": "ADMIN"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

// ============================================================================
// RESET PASSWORD TESTS
// ============================================================================

/// Test: Admin can reset user password
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_reset_password_as_admin_success() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin12", "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, "doctor21", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/reset-password", doctor.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "new_password": "NewPassword123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify can login with new password
    let login_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": doctor.username,
                        "password": "NewPassword123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(login_response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}

/// Test: Doctor cannot reset passwords (RBAC enforcement)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_reset_password_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor1 = TestUser::create_active_user(&pool, "doctor22", "DoctorPass123!", false).await;
    let doctor2 = TestUser::create_active_user(&pool, "doctor23", "DoctorPass123!", false).await;
    let doctor1_token = login_and_get_token(&app, &doctor1.username, "DoctorPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/reset-password", doctor2.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor1_token))
                .body(Body::from(
                    json!({
                        "new_password": "HackedPassword123!"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    teardown_test_db(&pool).await;
}

/// Test: Reset password with weak password fails
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_reset_password_weak_password_validation() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(&pool, "admin13", "AdminPass123!").await;
    let doctor = TestUser::create_active_user(&pool, "doctor24", "DoctorPass123!", false).await;
    let admin_token = login_and_get_token(&app, &admin.username, "AdminPass123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/users/{}/reset-password", doctor.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(
                    json!({
                        "new_password": "weak"  // Too weak
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    teardown_test_db(&pool).await;
}

// ============================================================================
// UNAUTHORIZED ACCESS TESTS
// ============================================================================

/// Test: Unauthenticated request returns 401
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_user_without_auth_unauthorized() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "username": "testuser",
                        "email": "test@test.com",
                        "password": "TestPass123!",
                        "role": "DOCTOR",
                        "first_name": "Test",
                        "last_name": "User"
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

/// Test: Invalid token returns 401
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_users_with_invalid_token_unauthorized() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/users")
                .header("authorization", "Bearer invalid_token_here")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}
