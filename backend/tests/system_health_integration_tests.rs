/*!
 * System Health Integration Tests
 *
 * Comprehensive integration tests for system health & status endpoints:
 * - GET /api/v1/system/health/detailed - Detailed health check
 * - GET /api/v1/system/info - System information
 * - GET /api/v1/system/storage - Storage statistics
 * - GET /api/v1/system/backup-status - Backup status
 * - RBAC permission enforcement (ADMIN only)
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
// Test: Detailed Health Check
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_detailed_health_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_hlth_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/health/detailed")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify response structure
    assert!(json["status"].is_string());
    assert!(json["timestamp"].is_string());
    assert!(json["uptime_seconds"].is_u64());
    assert!(json["version"].is_string());
    assert!(json["components"].is_array());

    // Status should be healthy, degraded, or unhealthy
    let status = json["status"].as_str().unwrap();
    assert!(status == "healthy" || status == "degraded" || status == "unhealthy");

    // Check components array has database check
    let components = json["components"].as_array().unwrap();
    assert!(!components.is_empty());

    // Find database component
    let db_component = components.iter().find(|c| c["name"] == "database");
    assert!(db_component.is_some());
    let db = db_component.unwrap();
    assert!(db["status"].is_string());
    assert!(db["latency_ms"].is_i64());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_detailed_health_as_doctor() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user (non-admin)
    let doctor = TestUser::create_active_user(&pool, &format!("doc_hlth_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/health/detailed")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Doctor should be forbidden (ADMIN only)
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_detailed_health_unauthenticated() {
    let (app, _pool) = setup_test().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/health/detailed")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should return 401 Unauthorized
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ============================================================================
// Test: System Info
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_system_info_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_info_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/info")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify application info
    assert!(json["application"]["name"].is_string());
    assert!(json["application"]["version"].is_string());
    assert!(json["application"]["rust_version"].is_string());

    // Verify server info
    assert!(json["server"]["hostname"].is_string());
    assert!(json["server"]["os"].is_string());
    assert!(json["server"]["arch"].is_string());
    assert!(json["server"]["uptime_seconds"].is_u64());
    assert!(json["server"]["started_at"].is_string());

    // Verify database info
    assert!(json["database"]["version"].is_string());
    assert!(json["database"]["database_name"].is_string());
    assert!(json["database"]["connection_pool_size"].is_u64());
    assert!(json["database"]["total_tables"].is_i64());

    // Verify environment info
    assert!(json["environment"]["environment"].is_string());
    assert!(json["environment"]["debug_mode"].is_boolean());
    assert!(json["environment"]["log_level"].is_string());
    assert!(json["environment"]["timezone"].is_string());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_system_info_as_doctor() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_info_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/info")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Doctor should be forbidden (ADMIN only)
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ============================================================================
// Test: Storage Stats
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_storage_stats_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_stor_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/storage")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify database stats
    assert!(json["database"]["total_size_mb"].is_f64());
    assert!(json["database"]["tables_size_mb"].is_f64());
    assert!(json["database"]["indexes_size_mb"].is_f64());
    assert!(json["database"]["estimated_rows"].is_i64());

    // Verify file system stats
    assert!(json["file_system"]["documents_size_mb"].is_f64());
    assert!(json["file_system"]["uploads_size_mb"].is_f64());
    assert!(json["file_system"]["logs_size_mb"].is_f64());
    assert!(json["file_system"]["available_disk_gb"].is_f64());
    assert!(json["file_system"]["total_disk_gb"].is_f64());
    assert!(json["file_system"]["disk_usage_percent"].is_f64());

    // Verify breakdown
    assert!(json["breakdown"]["tables"].is_array());
    let tables = json["breakdown"]["tables"].as_array().unwrap();
    if !tables.is_empty() {
        let first_table = &tables[0];
        assert!(first_table["table_name"].is_string());
        assert!(first_table["size_mb"].is_f64());
        assert!(first_table["row_count"].is_i64());
    }
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_storage_stats_as_doctor() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_stor_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/storage")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Doctor should be forbidden (ADMIN only)
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ============================================================================
// Test: Backup Status
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_backup_status_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_bkup_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/backup-status")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify backup status structure
    assert!(json["enabled"].is_boolean());
    assert!(json["backup_location"].is_string());
    assert!(json["retention_days"].is_i64());

    // last_backup and next_scheduled can be null if no backups exist
    assert!(json["last_backup"].is_null() || json["last_backup"].is_object());
    assert!(json["next_scheduled"].is_null() || json["next_scheduled"].is_string());

    // If last_backup exists, verify its structure
    if json["last_backup"].is_object() {
        let backup = &json["last_backup"];
        assert!(backup["timestamp"].is_string());
        assert!(backup["size_mb"].is_f64());
        assert!(backup["duration_seconds"].is_i64());
        assert!(backup["status"].is_string());
        assert!(backup["filename"].is_string());
    }
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_backup_status_as_doctor() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let doctor = TestUser::create_active_user(&pool, &format!("doc_bkup_{}", suffix), "Zk9$mX2vL!", false).await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/backup-status")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Doctor should be forbidden (ADMIN only)
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ============================================================================
// Test: Health Check Components
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_health_check_includes_pool_metrics() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_pool_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/health/detailed")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify database pool metrics
    assert!(json["database_pool"].is_object());
    let pool_metrics = &json["database_pool"];
    assert!(pool_metrics["size"].is_u64());
    assert!(pool_metrics["available"].is_u64());
    assert!(pool_metrics["in_use"].is_u64());
    assert!(pool_metrics["max_connections"].is_u64());
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_health_check_includes_system_resources() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_res_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/health/detailed")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify system resources are present (values depend on OS support)
    assert!(json["system_resources"].is_object() || json["system_resources"].is_null());

    if json["system_resources"].is_object() {
        let resources = &json["system_resources"];
        // These may be null on some platforms but should exist in the object
        assert!(resources.get("memory_used_mb").is_some());
        assert!(resources.get("memory_total_mb").is_some());
        assert!(resources.get("memory_percent").is_some());
        assert!(resources.get("disk_used_gb").is_some());
        assert!(resources.get("disk_total_gb").is_some());
        assert!(resources.get("disk_percent").is_some());
    }
}

// ============================================================================
// Test: System Info Database Details
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_system_info_database_version() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    let admin = TestUser::create_admin_user(&pool, &format!("admin_dbv_{}", suffix), "Zk9$mX2vL!").await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/system/info")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Database version should contain "PostgreSQL"
    let db_version = json["database"]["version"].as_str().unwrap();
    assert!(db_version.contains("PostgreSQL"));

    // Database name should be mpms_test (test database)
    let db_name = json["database"]["database_name"].as_str().unwrap();
    assert!(db_name.contains("mpms") || db_name.contains("test"));

    // Total tables should be > 0
    let total_tables = json["database"]["total_tables"].as_i64().unwrap();
    assert!(total_tables > 0, "Expected at least one table in the database");
}
