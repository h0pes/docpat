/*!
 * Error Redaction Middleware
 *
 * Intercepts Axum's default extractor rejection responses (text/plain 400/422)
 * and replaces them with generic JSON error responses. This prevents leaking
 * implementation details (e.g., UUID parsing library, Rust stack) in error messages.
 *
 * Our application errors (AppError) already return JSON with proper error codes,
 * so this middleware only targets non-JSON error responses from Axum's built-in
 * extractors (Path, Query, etc.).
 */

use axum::{
    body::Body,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

/// Middleware that redacts implementation details from extractor rejection responses.
///
/// Axum's built-in extractors (Path, Query, Json) return text/plain 400 responses
/// with detailed error messages that can reveal internal implementation details.
/// This middleware intercepts those responses and replaces them with a generic
/// JSON error in our standard format.
pub async fn redact_extractor_errors(request: Request<Body>, next: Next) -> Response {
    let response = next.run(request).await;

    // Only intercept 400 Bad Request and 422 Unprocessable Entity
    let status = response.status();
    if status != StatusCode::BAD_REQUEST && status != StatusCode::UNPROCESSABLE_ENTITY {
        return response;
    }

    // Only intercept non-JSON responses (our AppError already returns proper JSON)
    let is_json = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|ct| ct.contains("application/json"))
        .unwrap_or(false);

    if is_json {
        return response;
    }

    // Return generic JSON error in our standard format
    let generic_error = serde_json::json!({
        "error": "BAD_REQUEST",
        "message": "Invalid request parameters",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    (status, axum::Json(generic_error)).into_response()
}
