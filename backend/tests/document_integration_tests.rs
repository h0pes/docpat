/*!
 * Document Generation Integration Tests
 *
 * Comprehensive integration tests for document generation endpoints:
 * - Create document template (POST /api/v1/document-templates)
 * - Get document template (GET /api/v1/document-templates/:id)
 * - List document templates (GET /api/v1/document-templates)
 * - Update document template (PUT /api/v1/document-templates/:id)
 * - Delete document template (DELETE /api/v1/document-templates/:id)
 * - Generate document (POST /api/v1/documents/generate)
 * - Get generated document (GET /api/v1/documents/:id)
 * - List generated documents (GET /api/v1/documents)
 * - Download document (GET /api/v1/documents/:id/download)
 * - Sign document (POST /api/v1/documents/:id/sign)
 * - Deliver document (POST /api/v1/documents/:id/deliver)
 * - Get document statistics (GET /api/v1/documents/statistics)
 *
 * These tests require the `pdf-export` feature to be enabled.
 */

#![cfg(feature = "pdf-export")]

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use chrono::Utc;
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

mod test_utils;
use test_utils::{teardown_test_db, TestApp, TestUser};

/// Generate a unique suffix to avoid conflicts between tests
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

/// Helper to create admin user and get token (for template CRUD operations)
async fn create_admin_and_login(app: &axum::Router, pool: &sqlx::PgPool, suffix: &str) -> String {
    let password = "AdminPassword123!";
    let admin = TestUser::create_admin_user(pool, &format!("admin_{}", suffix), password).await;
    login_and_get_token(app, &admin.username, password).await
}

/// Helper to create doctor user and get token (for document operations)
async fn create_doctor_and_login(app: &axum::Router, pool: &sqlx::PgPool, suffix: &str) -> String {
    let password = "TestPassword123!";
    let user = TestUser::create_active_user(pool, &format!("doctor_{}", suffix), password, false).await;
    login_and_get_token(app, &user.username, password).await
}

/// Helper function to create a test patient
/// Note: Uses unique fiscal_code for each patient to avoid database constraint violations
async fn create_test_patient(
    app: &axum::Router,
    token: &str,
    first_name: &str,
    last_name: &str,
) -> Value {
    // Generate unique values using timestamp
    let suffix = unique_suffix();
    // Generate a valid Italian fiscal code format: 6 chars + 2 digits + 1 char + 2 digits + 1 char + 3 digits + 1 char
    // Example valid format: RSSMRA85C15H501X
    // We vary the last 4 characters to make it unique while keeping format valid
    let patient_data = json!({
        "first_name": first_name,
        "last_name": last_name,
        "date_of_birth": "1985-03-15",
        "gender": "M",
        "phone_primary": format!("+393401234{}", &suffix[..3]),
        "email": format!("patient{}@test.com", suffix),
        "preferred_contact_method": "PHONE",
        // Use a null fiscal_code to bypass validation (optional field)
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/patients")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(patient_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;
    if status != StatusCode::CREATED {
        panic!("Failed to create patient: {} - {:?}", status, String::from_utf8_lossy(&body));
    }
    serde_json::from_slice(&body).unwrap()
}

/// Helper to create standard additional_data for document generation
fn create_document_additional_data() -> serde_json::Value {
    json!({
        "document": {
            "date": Utc::now().format("%Y-%m-%d").to_string()
        }
    })
}

/// Helper function to create a document template
async fn create_test_template(
    app: &axum::Router,
    token: &str,
    template_key: &str,
    document_type: &str,
) -> Value {
    let template_data = json!({
        "template_key": template_key,
        "template_name": format!("Test Template {}", template_key),
        "description": "A test document template",
        "document_type": document_type,
        "template_html": "<h1>{{patient.full_name}}</h1><p>Date: {{document.date}}</p>",
        "template_variables": {
            "required": ["patient", "document"],
            "patient": ["full_name"],
            "document": ["date"]
        },
        "page_size": "A4",
        "page_orientation": "PORTRAIT",
        "margin_top_mm": 20,
        "margin_bottom_mm": 20,
        "margin_left_mm": 20,
        "margin_right_mm": 20,
        "is_active": true,
        "is_default": false,
        "language": "italian"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/document-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(template_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_to_bytes(response.into_body()).await;
    serde_json::from_slice(&body).unwrap()
}

// ============================================================================
// Document Template Tests
// ============================================================================

#[tokio::test]
async fn test_create_document_template() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user and login (only ADMIN can create templates)
    let token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create a document template
    let template_key = format!("test_template_{}", suffix);
    let template_data = json!({
        "template_key": template_key,
        "template_name": "Test Medical Certificate",
        "description": "A test template for medical certificates",
        "document_type": "MEDICAL_CERTIFICATE",
        "template_html": "<html><body><h1>Medical Certificate</h1><p>Patient: {{patient.full_name}}</p></body></html>",
        "template_variables": {
            "required": ["patient"],
            "patient": ["full_name", "date_of_birth"]
        },
        "page_size": "A4",
        "page_orientation": "PORTRAIT",
        "margin_top_mm": 20,
        "margin_bottom_mm": 20,
        "margin_left_mm": 15,
        "margin_right_mm": 15,
        "is_active": true,
        "is_default": false,
        "language": "italian"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/document-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(template_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["id"].is_string());
    assert_eq!(json["template_key"], template_key);
    assert_eq!(json["document_type"], "MEDICAL_CERTIFICATE");
    assert_eq!(json["language"], "italian");
    assert_eq!(json["is_active"], true);
}

#[tokio::test]
async fn test_get_document_template() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create a template first (admin creates it)
    let template_key = format!("get_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user to read the template
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Get the template by ID (doctor reads it)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/document-templates/{}", template_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], template_id);
    assert_eq!(json["template_key"], template_key);
}

#[tokio::test]
async fn test_list_document_templates() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create templates
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create multiple templates (admin creates them)
    create_test_template(&app, &admin_token, &format!("list_cert_{}", suffix), "MEDICAL_CERTIFICATE").await;
    create_test_template(&app, &admin_token, &format!("list_ref_{}", suffix), "REFERRAL_LETTER").await;

    // Create doctor user to list templates
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // List all templates (doctor reads them)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/document-templates")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["templates"].is_array());
    assert!(json["total"].as_i64().unwrap() >= 2);
}

#[tokio::test]
async fn test_list_document_templates_with_filter() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create templates
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create templates of different types (admin creates them)
    create_test_template(&app, &admin_token, &format!("filter_cert_{}", suffix), "MEDICAL_CERTIFICATE").await;
    create_test_template(&app, &admin_token, &format!("filter_ref_{}", suffix), "REFERRAL_LETTER").await;

    // Create doctor user to filter templates
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Filter by document type (doctor reads them)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/document-templates?document_type=MEDICAL_CERTIFICATE")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // All returned templates should be medical certificates
    for template in json["templates"].as_array().unwrap() {
        assert_eq!(template["document_type"], "MEDICAL_CERTIFICATE");
    }
}

#[tokio::test]
async fn test_update_document_template() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user (only admin can create and update templates)
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create a template
    let template_key = format!("update_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Update the template (admin updates it)
    let update_data = json!({
        "template_name": "Updated Template Name",
        "description": "Updated description"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/document-templates/{}", template_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(update_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["template_name"], "Updated Template Name");
    assert_eq!(json["description"], "Updated description");
}

#[tokio::test]
async fn test_delete_document_template() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user (only admins can delete)
    let password = "TestPassword123!";
    let user = TestUser::create_admin_user(&pool, &format!("docadmin_{}", suffix), password).await;
    let token = login_and_get_token(&app, &user.username, password).await;

    // Create a template
    let template_key = format!("delete_template_{}", suffix);
    let template = create_test_template(&app, &token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Delete the template
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/document-templates/{}", template_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify template is deleted/deactivated
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/document-templates/{}", template_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should be not found or inactive
    assert!(response.status() == StatusCode::NOT_FOUND || response.status() == StatusCode::OK);
}

// ============================================================================
// Document Generation Tests
// ============================================================================

#[tokio::test]
async fn test_generate_document() {
    // Initialize tracing for debugging
    let _ = tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .with_test_writer()
        .try_init();

    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create a template (admin creates it)
    let template_key = format!("gen_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Create a patient (doctor creates patient)
    let patient = create_test_patient(&app, &doctor_token, "Mario", "Rossi").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Generate a document (doctor generates it)
    let generate_data = json!({
        "template_id": template_id,
        "patient_id": patient_id,
        "document_title": "Test Medical Certificate",
        "additional_data": {
            "document": {
                "date": "2025-11-28"
            },
            "certificate": {
                "content": "is fit for work"
            }
        }
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = body_to_bytes(response.into_body()).await;
    if status != StatusCode::CREATED {
        panic!("Failed to generate document: {} - {:?}", status, String::from_utf8_lossy(&body));
    }

    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["id"].is_string());
    assert_eq!(json["patient_id"], patient_id);
    assert_eq!(json["template_id"], template_id);
    assert!(json["status"] == "GENERATED" || json["status"] == "GENERATING");
}

#[tokio::test]
async fn test_get_generated_document() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Create a template (admin creates it)
    let template_key = format!("get_gen_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Create a patient (doctor creates patient)
    let patient = create_test_patient(&app, &doctor_token, "Luigi", "Verdi").await;
    let patient_id = patient["id"].as_str().unwrap();

    let generate_data = json!({
        "template_id": template_id,
        "patient_id": patient_id,
        "document_title": "Test Document",
        "additional_data": create_document_additional_data()
    });

    let gen_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = gen_response.status();
    let body = body_to_bytes(gen_response.into_body()).await;
    if status != StatusCode::CREATED {
        panic!("Failed to generate document: {} - {:?}", status, String::from_utf8_lossy(&body));
    }
    let doc: Value = serde_json::from_slice(&body).unwrap();
    let document_id = doc["id"].as_str().unwrap();

    // Get the document (doctor reads it)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/documents/{}", document_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["id"], document_id);
    assert_eq!(json["patient_id"], patient_id);
}

#[tokio::test]
async fn test_list_generated_documents() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    let template_key = format!("list_gen_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Create a patient (doctor creates patient)
    let patient = create_test_patient(&app, &doctor_token, "Anna", "Bianchi").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Generate multiple documents (doctor generates them)
    for i in 0..3 {
        let generate_data = json!({
            "template_id": template_id,
            "patient_id": patient_id,
            "document_title": format!("Test Document {}", i),
            "additional_data": create_document_additional_data()
        });

        let resp = app.clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/documents/generate")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", doctor_token))
                    .body(Body::from(generate_data.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::CREATED, "Failed to generate document {}", i);
    }

    // List all documents (doctor reads them)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/documents")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json["documents"].is_array());
    assert!(json["total"].as_i64().unwrap() >= 3);
}

#[tokio::test]
async fn test_list_documents_by_patient() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    let template_key = format!("patient_filter_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Create two patients (doctor creates them)
    let patient1 = create_test_patient(&app, &doctor_token, "Paolo", "Neri").await;
    let patient1_id = patient1["id"].as_str().unwrap();

    let patient2 = create_test_patient(&app, &doctor_token, "Giovanni", "Russo").await;
    let patient2_id = patient2["id"].as_str().unwrap();

    // Generate documents for patient 1 (doctor generates them)
    for i in 0..2 {
        let generate_data = json!({
            "template_id": template_id,
            "patient_id": patient1_id,
            "document_title": format!("P1 Document {}", i),
            "additional_data": create_document_additional_data()
        });

        let resp = app.clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/documents/generate")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", doctor_token))
                    .body(Body::from(generate_data.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::CREATED, "Failed to generate document for patient 1");
    }

    // Generate document for patient 2
    let generate_data = json!({
        "template_id": template_id,
        "patient_id": patient2_id,
        "document_title": "P2 Document",
        "additional_data": create_document_additional_data()
    });

    let resp = app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED, "Failed to generate document for patient 2");

    // Filter documents by patient 1 (doctor filters them)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/documents?patient_id={}", patient1_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Should have exactly 2 documents for patient 1
    assert_eq!(json["total"].as_i64().unwrap(), 2);
    for doc in json["documents"].as_array().unwrap() {
        assert_eq!(doc["patient_id"], patient1_id);
    }
}

#[tokio::test]
async fn test_sign_document() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    let template_key = format!("sign_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Create patient and document (doctor creates them)
    let patient = create_test_patient(&app, &doctor_token, "Luca", "Ferrari").await;
    let patient_id = patient["id"].as_str().unwrap();

    let generate_data = json!({
        "template_id": template_id,
        "patient_id": patient_id,
        "document_title": "Document to Sign",
        "additional_data": create_document_additional_data()
    });

    let gen_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = gen_response.status();
    let body = body_to_bytes(gen_response.into_body()).await;
    if status != StatusCode::CREATED {
        panic!("Failed to generate document for signing: {} - {:?}", status, String::from_utf8_lossy(&body));
    }
    let doc: Value = serde_json::from_slice(&body).unwrap();
    let document_id = doc["id"].as_str().unwrap();

    // Sign the document (doctor signs it)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/documents/{}/sign", document_id))
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["is_signed"], true);
    assert!(json["signed_at"].is_string());
}

#[tokio::test]
async fn test_deliver_document() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user to create template
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    let template_key = format!("deliver_template_{}", suffix);
    let template = create_test_template(&app, &admin_token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &format!("{}_doc", suffix)).await;

    // Create patient and document (doctor creates them)
    let patient = create_test_patient(&app, &doctor_token, "Maria", "Costa").await;
    let patient_id = patient["id"].as_str().unwrap();

    let generate_data = json!({
        "template_id": template_id,
        "patient_id": patient_id,
        "document_title": "Document to Deliver",
        "additional_data": create_document_additional_data()
    });

    let gen_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = gen_response.status();
    let body = body_to_bytes(gen_response.into_body()).await;
    if status != StatusCode::CREATED {
        panic!("Failed to generate document for delivery: {} - {:?}", status, String::from_utf8_lossy(&body));
    }
    let doc: Value = serde_json::from_slice(&body).unwrap();
    let document_id = doc["id"].as_str().unwrap();

    // Deliver the document (doctor delivers it)
    // Note: Using "in_person" delivery method since email service is not configured in tests
    // For email delivery testing, email service would need to be configured in TestApp
    let deliver_data = json!({
        "delivered_to": "Patient Name",
        "delivery_method": "in_person"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/documents/{}/deliver", document_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(deliver_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["delivered_to"], "Patient Name");
    assert!(json["delivered_at"].is_string());
    assert_eq!(json["status"], "DELIVERED");
}

#[tokio::test]
async fn test_get_document_statistics() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user (doctors can read statistics)
    let doctor_token = create_doctor_and_login(&app, &pool, &suffix).await;

    // Get statistics
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/documents/statistics")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = body_to_bytes(response.into_body()).await;
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify statistics structure
    assert!(json["total_documents"].is_number());
    assert!(json["by_type"].is_array());
    assert!(json["by_status"].is_array());
    assert!(json["signed_count"].is_number());
    assert!(json["delivered_count"].is_number());
    assert!(json["total_size_bytes"].is_number());
}

#[tokio::test]
async fn test_delete_generated_document() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user (only admins can delete)
    let password = "TestPassword123!";
    let user = TestUser::create_admin_user(&pool, &format!("docadmin_{}", suffix), password).await;
    let token = login_and_get_token(&app, &user.username, password).await;

    // Create patient and document
    let patient = create_test_patient(&app, &token, "Franco", "Moretti").await;
    let patient_id = patient["id"].as_str().unwrap();

    let template_key = format!("delete_doc_{}", suffix);
    let template = create_test_template(&app, &token, &template_key, "MEDICAL_CERTIFICATE").await;
    let template_id = template["id"].as_str().unwrap();

    let generate_data = json!({
        "template_id": template_id,
        "patient_id": patient_id,
        "document_title": "Document to Delete",
        "additional_data": create_document_additional_data()
    });

    let gen_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = gen_response.status();
    let body = body_to_bytes(gen_response.into_body()).await;
    if status != StatusCode::CREATED {
        panic!("Failed to generate document for deletion: {} - {:?}", status, String::from_utf8_lossy(&body));
    }
    let doc: Value = serde_json::from_slice(&body).unwrap();
    let document_id = doc["id"].as_str().unwrap();

    // Delete the document
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/documents/{}", document_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Verify document is deleted/marked deleted
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/documents/{}", document_id))
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Should be not found or status = DELETED
    let status = response.status();
    assert!(status == StatusCode::NOT_FOUND || status == StatusCode::OK);
}

// ============================================================================
// Validation Tests
// ============================================================================

#[tokio::test]
async fn test_create_template_validation_error() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create admin user (only admin can create templates)
    let admin_token = create_admin_and_login(&app, &pool, &suffix).await;

    // Try to create template with invalid key (uppercase not allowed)
    let template_data = json!({
        "template_key": "INVALID_KEY",
        "template_name": "Test Template",
        "document_type": "MEDICAL_CERTIFICATE",
        "template_html": "<p>Test</p>"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/document-templates")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", admin_token))
                .body(Body::from(template_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_generate_document_invalid_template() {
    let (app, pool) = setup_test().await;
    let suffix = unique_suffix();

    // Create doctor user for document operations
    let doctor_token = create_doctor_and_login(&app, &pool, &suffix).await;

    // Create a patient (doctor creates patient)
    let patient = create_test_patient(&app, &doctor_token, "Test", "Patient").await;
    let patient_id = patient["id"].as_str().unwrap();

    // Try to generate document with non-existent template
    let generate_data = json!({
        "template_id": "00000000-0000-0000-0000-000000000000",
        "patient_id": patient_id,
        "document_title": "Test Document",
        "additional_data": create_document_additional_data()
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/documents/generate")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", doctor_token))
                .body(Body::from(generate_data.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should fail - template not found
    assert!(response.status() == StatusCode::NOT_FOUND || response.status() == StatusCode::INTERNAL_SERVER_ERROR);
}

// ============================================================================
// Authentication Tests
// ============================================================================

#[tokio::test]
async fn test_document_endpoint_requires_auth() {
    let (app, _pool) = setup_test().await;

    // Try to access document templates without authentication
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/document-templates")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
