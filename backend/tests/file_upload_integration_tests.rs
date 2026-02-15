/*!
 * File Upload Integration Tests
 *
 * Tests for the file upload service endpoints:
 * - POST /api/v1/files/upload
 * - GET /api/v1/files
 * - GET /api/v1/files/:id
 * - GET /api/v1/files/:id/download
 * - GET /api/v1/files/:id/serve
 * - PUT /api/v1/files/:id
 * - DELETE /api/v1/files/:id
 * - POST /api/v1/settings/logo
 * - GET /api/v1/settings/logo
 * - GET /api/v1/settings/logo/image
 * - DELETE /api/v1/settings/logo
 */

mod test_utils;

use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
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

// Helper to create a minimal valid PNG image (1x1 transparent pixel)
fn create_test_png() -> Vec<u8> {
    vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width = 1
        0x00, 0x00, 0x00, 0x01, // height = 1
        0x08, 0x06, // bit depth = 8, color type = 6 (RGBA)
        0x00, 0x00, 0x00, // compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // IHDR CRC
        0x00, 0x00, 0x00, 0x0A, // IDAT length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
        0x0D, 0x0A, 0x2D, 0xB4, // IDAT CRC
        0x00, 0x00, 0x00, 0x00, // IEND length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82, // IEND CRC
    ]
}

// Helper to create a minimal valid JPEG image
fn create_test_jpeg() -> Vec<u8> {
    vec![
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x3F, 0xFF, 0xD9,
    ]
}

// Helper to create multipart form body with file
fn create_multipart_body(filename: &str, content: &[u8], purpose: Option<&str>) -> (String, Vec<u8>) {
    let boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";

    let mut body = Vec::new();

    // Add file part
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(
        format!(
            "Content-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n",
            filename
        )
        .as_bytes(),
    );
    body.extend_from_slice(b"Content-Type: application/octet-stream\r\n\r\n");
    body.extend_from_slice(content);
    body.extend_from_slice(b"\r\n");

    // Add purpose if provided
    if let Some(p) = purpose {
        body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
        body.extend_from_slice(b"Content-Disposition: form-data; name=\"purpose\"\r\n\r\n");
        body.extend_from_slice(p.as_bytes());
        body.extend_from_slice(b"\r\n");
    }

    // End boundary
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

    let content_type = format!("multipart/form-data; boundary={}", boundary);

    (content_type, body)
}

// ============================================================================
// File Upload Tests
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_file_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("test.png", &png_data, Some("ATTACHMENT"));

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["id"].is_string());
    assert_eq!(json["original_filename"], "test.png");
    assert_eq!(json["mime_type"], "image/png");
    assert_eq!(json["purpose"], "ATTACHMENT");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_file_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("doctor_file_{}", suffix),
        "Zk9$mX2vL!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("test.png", &png_data, None);

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_upload_file_unauthenticated() {
    let (app, _pool) = setup_test().await;

    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("test.png", &png_data, None);

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_invalid_file_type() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file2_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Create a file with invalid content (not a real image)
    let invalid_content = b"This is not an image file";
    let (content_type, body) = create_multipart_body("test.txt", invalid_content, None);

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(
        json["error"].as_str().unwrap().contains("VALIDATION")
            || json["message"].as_str().unwrap().contains("Unable to detect")
    );
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_files_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file3_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // First upload a file
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("list_test.png", &png_data, Some("ATTACHMENT"));

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let _upload_response = app.clone().oneshot(upload_request).await.unwrap();

    // List files
    let request = Request::builder()
        .method("GET")
        .uri("/api/v1/files")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["files"].is_array());
    assert!(json["total"].as_i64().unwrap() >= 1);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_list_files_as_doctor_allowed() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("doctor_file2_{}", suffix),
        "Zk9$mX2vL!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    // Doctors should be able to read/list files
    let request = Request::builder()
        .method("GET")
        .uri("/api/v1/files")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    // Doctors have read access to files per policy
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_file_metadata() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file4_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Upload a file
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("metadata_test.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let upload_response = app.clone().oneshot(upload_request).await.unwrap();
    let upload_body = body_to_bytes(upload_response.into_body()).await;
    let upload_json: Value = serde_json::from_slice(&upload_body).unwrap();
    let file_id = upload_json["id"].as_str().unwrap();

    // Get metadata
    let request = Request::builder()
        .method("GET")
        .uri(format!("/api/v1/files/{}", file_id))
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], file_id);
    assert_eq!(json["original_filename"], "metadata_test.png");
    assert_eq!(json["mime_type"], "image/png");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_download_file() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file5_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Upload a file
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("download_test.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let upload_response = app.clone().oneshot(upload_request).await.unwrap();
    let upload_body = body_to_bytes(upload_response.into_body()).await;
    let upload_json: Value = serde_json::from_slice(&upload_body).unwrap();
    let file_id = upload_json["id"].as_str().unwrap();

    // Download file
    let request = Request::builder()
        .method("GET")
        .uri(format!("/api/v1/files/{}/download", file_id))
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Check headers
    let ct = response.headers().get(header::CONTENT_TYPE).unwrap();
    assert_eq!(ct.to_str().unwrap(), "image/png");

    let content_disposition = response.headers().get(header::CONTENT_DISPOSITION).unwrap();
    assert!(content_disposition.to_str().unwrap().contains("attachment"));
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_update_file_metadata() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file6_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Upload a file
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("update_test.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let upload_response = app.clone().oneshot(upload_request).await.unwrap();
    let upload_body = body_to_bytes(upload_response.into_body()).await;
    let upload_json: Value = serde_json::from_slice(&upload_body).unwrap();
    let file_id = upload_json["id"].as_str().unwrap();

    // Update metadata
    let update_body = json!({
        "alt_text": "Test image alt text",
        "description": "Test description"
    });

    let request = Request::builder()
        .method("PUT")
        .uri(format!("/api/v1/files/{}", file_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&update_body).unwrap()))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["alt_text"], "Test image alt text");
    assert_eq!(json["description"], "Test description");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_file() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_file7_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Upload a file
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("delete_test.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let upload_response = app.clone().oneshot(upload_request).await.unwrap();
    let upload_body = body_to_bytes(upload_response.into_body()).await;
    let upload_json: Value = serde_json::from_slice(&upload_body).unwrap();
    let file_id = upload_json["id"].as_str().unwrap();

    // Delete file
    let request = Request::builder()
        .method("DELETE")
        .uri(format!("/api/v1/files/{}", file_id))
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify file is not found
    let get_request = Request::builder()
        .method("GET")
        .uri(format!("/api/v1/files/{}", file_id))
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let get_response = app.clone().oneshot(get_request).await.unwrap();
    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

// ============================================================================
// Logo Endpoint Tests
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_logo_as_admin() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_logo_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("logo.png", &png_data, None);

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["id"].is_string());
    assert!(json["url"].as_str().unwrap().contains("/api/v1/files/"));
    assert_eq!(json["mime_type"], "image/png");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_logo_as_doctor_forbidden() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user
    let doctor = TestUser::create_active_user(
        &pool,
        &format!("doctor_logo_{}", suffix),
        "Zk9$mX2vL!",
        false,
    )
    .await;
    let token = login_and_get_token(&app, &doctor.username, "Zk9$mX2vL!").await;

    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("logo.png", &png_data, None);

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_logo() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_logo2_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // First upload a logo
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("logo.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let _upload_response = app.clone().oneshot(upload_request).await.unwrap();

    // Get logo metadata
    let request = Request::builder()
        .method("GET")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["id"].is_string());
    assert_eq!(json["mime_type"], "image/png");
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_get_logo_not_set() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_logo3_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let request = Request::builder()
        .method("GET")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_serve_logo_image() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_logo4_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // First upload a logo
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("logo.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let _upload_response = app.clone().oneshot(upload_request).await.unwrap();

    // Serve logo image
    let request = Request::builder()
        .method("GET")
        .uri("/api/v1/settings/logo/image")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Check headers
    let ct = response.headers().get(header::CONTENT_TYPE).unwrap();
    assert_eq!(ct.to_str().unwrap(), "image/png");

    let content_disposition = response.headers().get(header::CONTENT_DISPOSITION).unwrap();
    assert!(content_disposition.to_str().unwrap().contains("inline"));
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_delete_logo() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_logo5_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // First upload a logo
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("logo.png", &png_data, None);

    let upload_request = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let _upload_response = app.clone().oneshot(upload_request).await.unwrap();

    // Delete logo
    let request = Request::builder()
        .method("DELETE")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify logo is gone
    let get_request = Request::builder()
        .method("GET")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let get_response = app.clone().oneshot(get_request).await.unwrap();
    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_logo_replaces_previous() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_logo6_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    // Upload first logo
    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("logo1.png", &png_data, None);

    let upload_request1 = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response1 = app.clone().oneshot(upload_request1).await.unwrap();
    let body1 = body_to_bytes(response1.into_body()).await;
    let json1: Value = serde_json::from_slice(&body1).unwrap();
    let id1 = json1["id"].as_str().unwrap().to_string();

    // Upload second logo
    let jpeg_data = create_test_jpeg();
    let (content_type2, body2) = create_multipart_body("logo2.jpg", &jpeg_data, None);

    let upload_request2 = Request::builder()
        .method("POST")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type2)
        .body(Body::from(body2))
        .unwrap();

    let response2 = app.clone().oneshot(upload_request2).await.unwrap();
    assert_eq!(response2.status(), StatusCode::OK);

    let body2 = body_to_bytes(response2.into_body()).await;
    let json2: Value = serde_json::from_slice(&body2).unwrap();
    let id2 = json2["id"].as_str().unwrap().to_string();

    // IDs should be different
    assert_ne!(id1, id2);

    // Current logo should be the second one (JPEG)
    let get_request = Request::builder()
        .method("GET")
        .uri("/api/v1/settings/logo")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let get_response = app.clone().oneshot(get_request).await.unwrap();
    let get_body = body_to_bytes(get_response.into_body()).await;
    let get_json: Value = serde_json::from_slice(&get_body).unwrap();

    assert_eq!(get_json["id"], id2);
    assert_eq!(get_json["mime_type"], "image/jpeg");
}

// ============================================================================
// Security Tests
// ============================================================================

#[tokio::test]
#[cfg(feature = "rbac")]
async fn test_upload_with_path_traversal_filename() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user
    let admin = TestUser::create_admin_user(&pool, &format!("admin_sec_{}", suffix), "Zk9$mX2vL!")
        .await;
    let token = login_and_get_token(&app, &admin.username, "Zk9$mX2vL!").await;

    let png_data = create_test_png();
    let (content_type, body) = create_multipart_body("../../../etc/passwd.png", &png_data, None);

    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/files/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", content_type)
        .body(Body::from(body))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    // Should either reject or sanitize the filename
    // If it succeeds, filename should be sanitized
    if response.status() == StatusCode::OK {
        let body = body_to_bytes(response.into_body()).await;
        let json: Value = serde_json::from_slice(&body).unwrap();
        let filename = json["original_filename"].as_str().unwrap();
        assert!(!filename.contains(".."));
        assert!(!filename.contains("/"));
    } else {
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
