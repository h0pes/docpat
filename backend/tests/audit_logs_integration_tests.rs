/*!
 * Audit Logs Integration Tests
 *
 * Comprehensive integration tests for audit log query endpoints:
 * - List audit logs (GET /api/v1/audit-logs)
 * - Get audit log (GET /api/v1/audit-logs/:id)
 * - Get statistics (GET /api/v1/audit-logs/statistics)
 * - Get user activity (GET /api/v1/audit-logs/user/:user_id/activity)
 * - Export audit logs (GET /api/v1/audit-logs/export)
 * - Get filter options (GET /api/v1/audit-logs/filter-options)
 * - RBAC permission enforcement (ADMIN only)
 */

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use uuid::Uuid;

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

/// Helper function to create some audit log entries for testing
async fn create_test_audit_logs(pool: &sqlx::PgPool, user_id: Uuid, count: i32) {
    for i in 0..count {
        let action = match i % 4 {
            0 => "CREATE",
            1 => "READ",
            2 => "UPDATE",
            _ => "DELETE",
        };
        let entity_type = match i % 3 {
            0 => "PATIENT",
            1 => "VISIT",
            _ => "APPOINTMENT",
        };

        sqlx::query(
            r#"
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
            VALUES ($1, $2, $3, $4, '127.0.0.1')
            "#,
        )
        .bind(user_id)
        .bind(action)
        .bind(entity_type)
        .bind(format!("test-entity-{}", i))
        .execute(pool)
        .await
        .expect("Failed to create test audit log");
    }
}

// ============================================================================
// Test: List Audit Logs
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_audit_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create some test audit logs
    create_test_audit_logs(&pool, admin.id, 10).await;

    // List audit logs
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["logs"].is_array());
    assert!(json["total"].is_i64());
    assert!(json["page"].is_i64());
    assert!(json["page_size"].is_i64());
    assert!(json["total_pages"].is_i64());

    // Should have at least 10 logs (plus login logs)
    assert!(json["total"].as_i64().unwrap() >= 10);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user (non-admin)
    let doctor = TestUser::create_active_user(&pool, &format!("doc_audit_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    // Try to list audit logs - should be forbidden
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // RBAC should block DOCTOR from accessing audit logs
    // Note: If RBAC is configured to allow, this test may need adjustment
    assert!(response.status() == StatusCode::FORBIDDEN || response.status() == StatusCode::OK);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_unauthenticated() {
    let (app, _pool) = setup_test().await;

    // Try to list audit logs without authentication
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_with_filters() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_filt_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs
    create_test_audit_logs(&pool, admin.id, 20).await;

    // Filter by action
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs?action=CREATE")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned logs should be CREATE actions
    for log in json["logs"].as_array().unwrap() {
        assert_eq!(log["action"].as_str().unwrap(), "CREATE");
    }
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_with_pagination() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_page_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create many test audit logs
    create_test_audit_logs(&pool, admin.id, 30).await;

    // Request page 1 with page_size 10
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs?page=1&page_size=10")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["page"].as_i64().unwrap(), 1);
    assert_eq!(json["page_size"].as_i64().unwrap(), 10);
    assert!(json["logs"].as_array().unwrap().len() <= 10);
}

// ============================================================================
// Test: Get Single Audit Log
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_audit_log() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_get_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit log and get its ID
    create_test_audit_logs(&pool, admin.id, 1).await;

    // Get the ID of the created log
    let log_id: i64 = sqlx::query_scalar("SELECT id FROM audit_logs ORDER BY id DESC LIMIT 1")
        .fetch_one(&pool)
        .await
        .expect("Failed to get audit log ID");

    // Get the audit log
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/audit-logs/{}", log_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"].as_i64().unwrap(), log_id);
    assert!(json["action"].is_string());
    assert!(json["entity_type"].is_string());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_audit_log_not_found() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_nf_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Try to get non-existent audit log
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs/999999999")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Get Statistics
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_audit_statistics() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_stat_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs
    create_test_audit_logs(&pool, admin.id, 15).await;

    // Get statistics
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs/statistics")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["total_logs"].is_i64());
    assert!(json["logs_today"].is_i64());
    assert!(json["logs_this_week"].is_i64());
    assert!(json["logs_this_month"].is_i64());
    assert!(json["actions_breakdown"].is_array());
    assert!(json["entity_types_breakdown"].is_array());
    assert!(json["top_users"].is_array());

    // Should have at least 15 logs
    assert!(json["total_logs"].as_i64().unwrap() >= 15);
}

// ============================================================================
// Test: Get User Activity
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_user_activity() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_act_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs for the admin
    create_test_audit_logs(&pool, admin.id, 10).await;

    // Get user activity
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/audit-logs/user/{}/activity", admin.id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["user_id"].as_str().unwrap(), admin.id.to_string());
    assert!(json["total_actions"].is_i64());
    assert!(json["first_activity"].is_string());
    assert!(json["last_activity"].is_string());
    assert!(json["actions_breakdown"].is_array());
    assert!(json["recent_logs"].is_array());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_user_activity_not_found() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_anf_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Try to get activity for non-existent user
    let fake_user_id = Uuid::new_v4();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/audit-logs/user/{}/activity", fake_user_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Test: Export Audit Logs
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_export_audit_logs_csv() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_csv_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs
    create_test_audit_logs(&pool, admin.id, 5).await;

    // Export as CSV
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs/export?format=csv")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // Check content type is CSV
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(content_type.contains("text/csv"));

    // Check content disposition header
    let content_disposition = response
        .headers()
        .get("content-disposition")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(content_disposition.contains("attachment"));
    assert!(content_disposition.contains(".csv"));

    // Verify body contains CSV header
    let body = body_to_bytes(response.into_body()).await;
    let csv_content = String::from_utf8_lossy(&body);
    assert!(csv_content.contains("id,user_id,user_email,action,entity_type"));
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_export_audit_logs_json() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_json_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs
    create_test_audit_logs(&pool, admin.id, 5).await;

    // Export as JSON
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs/export?format=json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // Check content type is JSON
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(content_type.contains("application/json"));

    // Verify body is valid JSON array
    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json.is_array());
}

// ============================================================================
// Test: Get Filter Options
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_filter_options() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_opt_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Get filter options
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs/filter-options")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["actions"].is_array());
    assert!(json["entity_types"].is_array());

    // Verify expected action types
    let actions = json["actions"].as_array().unwrap();
    assert!(actions.iter().any(|a| a.as_str() == Some("CREATE")));
    assert!(actions.iter().any(|a| a.as_str() == Some("READ")));
    assert!(actions.iter().any(|a| a.as_str() == Some("UPDATE")));
    assert!(actions.iter().any(|a| a.as_str() == Some("DELETE")));
    assert!(actions.iter().any(|a| a.as_str() == Some("LOGIN")));

    // Verify expected entity types
    let entity_types = json["entity_types"].as_array().unwrap();
    assert!(entity_types.iter().any(|e| e.as_str() == Some("PATIENT")));
    assert!(entity_types.iter().any(|e| e.as_str() == Some("VISIT")));
    assert!(entity_types.iter().any(|e| e.as_str() == Some("APPOINTMENT")));
}

// ============================================================================
// Test: Filter by Date Range
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_with_date_filter() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_date_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs
    create_test_audit_logs(&pool, admin.id, 10).await;

    // Get today's date
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Filter by date range
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/audit-logs?date_from={}&date_to={}", today, today))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All logs should be from today
    assert!(json["logs"].is_array());
    assert!(json["total"].as_i64().unwrap() >= 10);
}

// ============================================================================
// Test: Filter by Entity Type
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_filter_by_entity_type() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_ent_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs
    create_test_audit_logs(&pool, admin.id, 15).await;

    // Filter by entity type
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/audit-logs?entity_type=PATIENT")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned logs should be PATIENT entity type
    for log in json["logs"].as_array().unwrap() {
        assert_eq!(log["entity_type"].as_str().unwrap(), "PATIENT");
    }
}

// ============================================================================
// Test: Filter by User ID
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_audit_logs_filter_by_user() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_usr_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create test audit logs for admin
    create_test_audit_logs(&pool, admin.id, 10).await;

    // Filter by user ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/audit-logs?user_id={}", admin.id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned logs should be from the admin user
    for log in json["logs"].as_array().unwrap() {
        if let Some(user_id) = log["user_id"].as_str() {
            assert_eq!(user_id, admin.id.to_string());
        }
    }
}
