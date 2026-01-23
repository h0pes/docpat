/*!
 * Notification Integration Tests
 *
 * Comprehensive tests for notification system endpoints:
 * - Notification CRUD operations
 * - Notification status transitions (retry, cancel)
 * - Patient notification preferences
 * - Email status and test email
 * - RBAC permission enforcement
 */

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use chrono::Utc;
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use uuid::Uuid;

mod test_utils;
use test_utils::{teardown_test_db, TestApp, TestUser};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

/// Create a test patient in the database
async fn create_test_patient(app: &axum::Router, token: &str) -> Uuid {
    let suffix = unique_suffix();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "first_name": "Test",
                        "last_name": "Patient",
                        "date_of_birth": "1980-01-15",
                        "gender": "M",
                        "email": format!("patient{}@test.com", suffix),
                        "phone_primary": format!("+393401234{}", &suffix[..3])
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
            "Failed to create patient: {} - {}",
            status,
            String::from_utf8_lossy(&body)
        );
    }
    let json: Value = serde_json::from_slice(&body).unwrap();
    Uuid::parse_str(json["id"].as_str().unwrap()).unwrap()
}

/// Create a test appointment for notification testing
async fn create_test_appointment(
    app: &axum::Router,
    token: &str,
    patient_id: Uuid,
    provider_id: Uuid,
) -> Uuid {
    // Schedule for tomorrow at 10:00 AM UTC
    let tomorrow_10am = Utc::now()
        .date_naive()
        .succ_opt()
        .unwrap()
        .and_hms_opt(10, 0, 0)
        .unwrap()
        .and_utc();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/appointments")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id.to_string(),
                        "provider_id": provider_id.to_string(),
                        "scheduled_start": tomorrow_10am.to_rfc3339(),
                        "duration_minutes": 30,
                        "type": "ROUTINE_CHECKUP",
                        "reason": "Test appointment"
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
            "Failed to create appointment: {} - {}",
            status,
            String::from_utf8_lossy(&body)
        );
    }
    let json: Value = serde_json::from_slice(&body).unwrap();
    Uuid::parse_str(json["id"].as_str().unwrap()).unwrap()
}

// ============================================================================
// EMAIL STATUS TESTS
// ============================================================================

/// Test: Doctor can get email status
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_email_status_as_doctor() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("status_doc{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications/email-status")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    // Email service is disabled in test mode
    assert_eq!(json["enabled"], false);
    assert_eq!(json["configured"], true);

    teardown_test_db(&pool).await;
}

/// Test: Unauthenticated request fails
#[tokio::test]
async fn test_get_email_status_unauthenticated_fails() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications/email-status")
                .header("content-type", "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    teardown_test_db(&pool).await;
}

// ============================================================================
// NOTIFICATION CRUD TESTS
// ============================================================================

/// Test: Doctor can create a notification
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_notification_as_doctor_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("notif_doc{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id.to_string(),
                        "notification_type": "APPOINTMENT_REMINDER",
                        "delivery_method": "EMAIL",
                        "recipient_email": "test@example.com",
                        "recipient_name": "Test Patient",
                        "subject": "Appointment Reminder",
                        "message_body": "Your appointment is scheduled for tomorrow.",
                        "priority": 5
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
    assert!(json["id"].is_string());
    assert_eq!(json["notification_type"], "APPOINTMENT_REMINDER");
    assert_eq!(json["delivery_method"], "EMAIL");
    assert_eq!(json["status"], "PENDING");

    teardown_test_db(&pool).await;
}

/// Test: Create notification with linked appointment
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_notification_with_appointment() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("appt_notif{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;
    let appointment_id = create_test_appointment(&app, &token, patient_id, doctor.id).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id.to_string(),
                        "appointment_id": appointment_id.to_string(),
                        "notification_type": "APPOINTMENT_BOOKED",
                        "delivery_method": "EMAIL",
                        "recipient_email": "patient@example.com",
                        "message_body": "Your appointment has been booked."
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
    assert_eq!(json["appointment_id"], appointment_id.to_string());
    assert_eq!(json["notification_type"], "APPOINTMENT_BOOKED");

    teardown_test_db(&pool).await;
}

/// Test: Invalid notification type fails
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_create_notification_invalid_type_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("inv_type{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "notification_type": "INVALID_TYPE",
                        "delivery_method": "EMAIL",
                        "recipient_email": "test@example.com",
                        "message_body": "Test message"
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

/// Test: Unauthenticated create fails
#[tokio::test]
async fn test_create_notification_unauthenticated_fails() {
    let (app, pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "notification_type": "APPOINTMENT_REMINDER",
                        "delivery_method": "EMAIL",
                        "recipient_email": "test@example.com",
                        "message_body": "Test message"
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

/// Test: List notifications
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_notifications_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("list_notif{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;

    // Create a notification first
    let _create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id.to_string(),
                        "notification_type": "APPOINTMENT_REMINDER",
                        "delivery_method": "EMAIL",
                        "recipient_email": "test@example.com",
                        "message_body": "Test message"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // List notifications
    let list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_response.status(), StatusCode::OK);

    let body = body_to_bytes(list_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json["notifications"].is_array());
    assert!(json["total"].as_i64().unwrap() >= 1);

    teardown_test_db(&pool).await;
}

/// Test: List notifications with type filter
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_notifications_with_filter() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("filter_notif{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    // Create notifications of different types
    for notification_type in ["APPOINTMENT_REMINDER", "CUSTOM"] {
        let _ = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/notifications")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", token))
                    .body(Body::from(
                        json!({
                            "notification_type": notification_type,
                            "delivery_method": "EMAIL",
                            "recipient_email": "test@example.com",
                            "message_body": "Test message"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // Filter by notification type
    let filter_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications?notification_type=APPOINTMENT_REMINDER")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(filter_response.status(), StatusCode::OK);

    let body = body_to_bytes(filter_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    let notifications = json["notifications"].as_array().unwrap();
    for notif in notifications {
        assert_eq!(notif["notification_type"], "APPOINTMENT_REMINDER");
    }

    teardown_test_db(&pool).await;
}

/// Test: Get notification by ID
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_notification_by_id_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("get_notif{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    // Create a notification
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "notification_type": "CUSTOM",
                        "delivery_method": "EMAIL",
                        "recipient_email": "test@example.com",
                        "subject": "Custom Notification",
                        "message_body": "This is a custom notification."
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let notification_id = create_json["id"].as_str().unwrap();

    // Get notification by ID
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/notifications/{}", notification_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::OK);

    let body = body_to_bytes(get_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["id"], notification_id);
    assert_eq!(json["notification_type"], "CUSTOM");

    teardown_test_db(&pool).await;
}

/// Test: Get nonexistent notification returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_nonexistent_notification_returns_404() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("notif_404{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    let fake_id = Uuid::new_v4();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/notifications/{}", fake_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// NOTIFICATION STATUS TESTS
// ============================================================================

/// Test: Cancel pending notification
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_cancel_pending_notification_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("cancel_notif{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    // Create a notification
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "notification_type": "APPOINTMENT_REMINDER",
                        "delivery_method": "EMAIL",
                        "recipient_email": "test@example.com",
                        "message_body": "Reminder message"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let notification_id = create_json["id"].as_str().unwrap();

    // Cancel the notification
    let cancel_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/notifications/{}", notification_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(cancel_response.status(), StatusCode::OK);

    let body = body_to_bytes(cancel_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "CANCELLED");

    teardown_test_db(&pool).await;
}

// ============================================================================
// NOTIFICATION STATISTICS TESTS
// ============================================================================

/// Test: Get notification statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_notification_statistics_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("stats_notif{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    // Create some notifications
    for _ in 0..3 {
        let _ = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/notifications")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", token))
                    .body(Body::from(
                        json!({
                            "notification_type": "APPOINTMENT_REMINDER",
                            "delivery_method": "EMAIL",
                            "recipient_email": "test@example.com",
                            "message_body": "Test message"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // Get statistics
    let stats_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications/statistics")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(stats_response.status(), StatusCode::OK);

    let body = body_to_bytes(stats_response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json["total_notifications"].as_i64().unwrap() >= 3);
    assert!(json["pending_count"].is_number());
    assert!(json["sent_today"].is_number());
    assert!(json["failed_count"].is_number());

    teardown_test_db(&pool).await;
}

/// Test: Admin can get statistics
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_notification_statistics_as_admin() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(
        &pool,
        &format!("stats_admin{}", unique_suffix()),
        "Password123!",
    )
    .await;
    let token = login_and_get_token(&app, &admin.username, "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications/statistics")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}

// ============================================================================
// PATIENT NOTIFICATION PREFERENCES TESTS
// ============================================================================

/// Test: Get patient notification preferences
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_patient_preferences_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("pref_get{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!(
                    "/api/v1/patients/{}/notification-preferences",
                    patient_id
                ))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["patient_id"], patient_id.to_string());
    assert!(json["email_enabled"].is_boolean());
    assert!(json["reminder_enabled"].is_boolean());
    assert!(json["reminder_days_before"].is_number());

    teardown_test_db(&pool).await;
}

/// Test: Update patient notification preferences
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_patient_preferences_success() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("pref_update{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!(
                    "/api/v1/patients/{}/notification-preferences",
                    patient_id
                ))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "email_enabled": false,
                        "reminder_enabled": true,
                        "reminder_days_before": 2,
                        "confirmation_enabled": false
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
    assert_eq!(json["email_enabled"], false);
    assert_eq!(json["reminder_enabled"], true);
    assert_eq!(json["reminder_days_before"], 2);
    assert_eq!(json["confirmation_enabled"], false);

    teardown_test_db(&pool).await;
}

/// Test: Invalid reminder days fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_patient_preferences_invalid_days_fails() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("pref_inv{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!(
                    "/api/v1/patients/{}/notification-preferences",
                    patient_id
                ))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "reminder_days_before": 10  // Invalid: max is 7
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

/// Test: Get preferences for nonexistent patient returns 404
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_preferences_nonexistent_patient_returns_404() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("pref_404{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    let fake_patient_id = Uuid::new_v4();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!(
                    "/api/v1/patients/{}/notification-preferences",
                    fake_patient_id
                ))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    teardown_test_db(&pool).await;
}

// ============================================================================
// SEND TEST EMAIL TESTS (ADMIN ONLY)
// ============================================================================

/// Test: Doctor cannot send test email (ADMIN only)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_send_test_email_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("test_email_doc{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications/send-test")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "to_email": "test@example.com",
                        "to_name": "Test User"
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

/// Test: Admin can send test email (returns error due to disabled service but endpoint accessible)
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_send_test_email_as_admin() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(
        &pool,
        &format!("test_email_admin{}", unique_suffix()),
        "Password123!",
    )
    .await;
    let token = login_and_get_token(&app, &admin.username, "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications/send-test")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "to_email": "admin@example.com",
                        "to_name": "Admin User"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Email service is disabled in test mode, returns BAD_REQUEST but endpoint is accessible
    assert!(
        response.status() == StatusCode::OK || response.status() == StatusCode::BAD_REQUEST
    );

    teardown_test_db(&pool).await;
}

/// Test: Invalid email format fails validation
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_send_test_email_invalid_email_fails() {
    let (app, pool) = setup_test().await;
    let admin = TestUser::create_admin_user(
        &pool,
        &format!("inv_email_admin{}", unique_suffix()),
        "Password123!",
    )
    .await;
    let token = login_and_get_token(&app, &admin.username, "Password123!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications/send-test")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "to_email": "not-a-valid-email"
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
// COMPLETE WORKFLOW TESTS
// ============================================================================

/// Test: Complete notification workflow
#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_complete_notification_workflow() {
    let (app, pool) = setup_test().await;
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("workflow{}", unique_suffix()),
        "Password123!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Password123!").await;
    let patient_id = create_test_patient(&app, &token).await;
    let appointment_id = create_test_appointment(&app, &token, patient_id, doctor.id).await;

    // 1. Set up patient preferences
    let pref_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!(
                    "/api/v1/patients/{}/notification-preferences",
                    patient_id
                ))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "email_enabled": true,
                        "reminder_enabled": true,
                        "reminder_days_before": 1
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(pref_response.status(), StatusCode::OK);

    // 2. Create appointment confirmation notification
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/notifications")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    json!({
                        "patient_id": patient_id.to_string(),
                        "appointment_id": appointment_id.to_string(),
                        "notification_type": "APPOINTMENT_CONFIRMATION",
                        "delivery_method": "EMAIL",
                        "recipient_email": "patient@example.com",
                        "recipient_name": "Test Patient",
                        "subject": "Appointment Confirmed",
                        "message_body": "Your appointment has been confirmed.",
                        "metadata": {
                            "appointment_date": "2026-01-23",
                            "appointment_time": "10:00"
                        }
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_response.status(), StatusCode::CREATED);

    let create_body = body_to_bytes(create_response.into_body()).await;
    let create_json: Value = serde_json::from_slice(&create_body).unwrap();
    let notification_id = create_json["id"].as_str().unwrap();

    // 3. Verify notification in list
    let list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/notifications?patient_id={}", patient_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(list_response.status(), StatusCode::OK);

    let list_body = body_to_bytes(list_response.into_body()).await;
    let list_json: Value = serde_json::from_slice(&list_body).unwrap();
    assert!(list_json["total"].as_i64().unwrap() >= 1);

    // 4. Get notification details
    let get_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/notifications/{}", notification_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_response.status(), StatusCode::OK);

    let get_body = body_to_bytes(get_response.into_body()).await;
    let get_json: Value = serde_json::from_slice(&get_body).unwrap();
    assert_eq!(get_json["notification_type"], "APPOINTMENT_CONFIRMATION");

    // 5. Cancel notification
    let cancel_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/notifications/{}", notification_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(cancel_response.status(), StatusCode::OK);

    let cancel_body = body_to_bytes(cancel_response.into_body()).await;
    let cancel_json: Value = serde_json::from_slice(&cancel_body).unwrap();
    assert_eq!(cancel_json["status"], "CANCELLED");

    // 6. Verify in statistics
    let stats_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/notifications/statistics")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(stats_response.status(), StatusCode::OK);

    teardown_test_db(&pool).await;
}
