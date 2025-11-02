/*!
 * Request Validation Middleware
 *
 * Provides input validation and sanitization to prevent common attacks:
 * - SQL injection detection
 * - XSS (Cross-Site Scripting) prevention
 * - Path traversal detection
 * - Excessively large payloads
 * - Invalid content types
 *
 * Security Standards:
 * - OWASP Input Validation Cheat Sheet
 * - Defense in depth (validation at multiple layers)
 * - Fail securely (reject suspicious input)
 */

use axum::{
    body::{Body, Bytes},
    extract::Request,
    http::{HeaderMap, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use regex::Regex;
use std::sync::OnceLock;

/// Maximum allowed request body size (10 MB)
const MAX_BODY_SIZE: usize = 10 * 1024 * 1024;

/// SQL injection patterns (common keywords and syntax)
static SQL_INJECTION_PATTERNS: OnceLock<Regex> = OnceLock::new();

/// XSS patterns (script tags and event handlers)
static XSS_PATTERNS: OnceLock<Regex> = OnceLock::new();

/// Path traversal patterns
static PATH_TRAVERSAL_PATTERNS: OnceLock<Regex> = OnceLock::new();

/// Get SQL injection detection regex
fn sql_injection_regex() -> &'static Regex {
    SQL_INJECTION_PATTERNS.get_or_init(|| {
        Regex::new(r"(?i)(union\s+select|insert\s+into|delete\s+from|drop\s+table|drop\s+database|update\s+.+set|exec\s*\(|execute\s*\(|script\s*>|<\s*script|javascript:|onerror\s*=|onload\s*=|--\s*$|;\s*--|/\*|\*/|xp_cmdshell|'\s*or\s*'|'\s*OR\s*'|1\s*=\s*1|admin'\s*--|'\s*;)").unwrap()
    })
}

/// Get XSS detection regex
fn xss_regex() -> &'static Regex {
    XSS_PATTERNS.get_or_init(|| {
        Regex::new(r"(?i)(<script|</script>|javascript:|onerror\s*=|onload\s*=|onclick\s*=|onfocus\s*=|onmouseover\s*=|eval\s*\(|expression\s*\(|vbscript:|<iframe|<object|<embed)").unwrap()
    })
}

/// Get path traversal detection regex
fn path_traversal_regex() -> &'static Regex {
    PATH_TRAVERSAL_PATTERNS.get_or_init(|| {
        Regex::new(r"(\.\.[\\/]|[\\/]\.\.[\\/]|%2e%2e|%252e%252e)").unwrap()
    })
}

/// Validation configuration
#[derive(Clone, Debug)]
pub struct ValidationConfig {
    /// Maximum request body size in bytes
    pub max_body_size: usize,
    /// Enable SQL injection detection
    pub detect_sql_injection: bool,
    /// Enable XSS detection
    pub detect_xss: bool,
    /// Enable path traversal detection
    pub detect_path_traversal: bool,
    /// Allowed content types for POST/PUT requests
    pub allowed_content_types: Vec<String>,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            max_body_size: MAX_BODY_SIZE,
            detect_sql_injection: true,
            detect_xss: true,
            detect_path_traversal: true,
            allowed_content_types: vec![
                "application/json".to_string(),
                "application/x-www-form-urlencoded".to_string(),
                "multipart/form-data".to_string(),
                "text/plain".to_string(),
            ],
        }
    }
}

impl ValidationConfig {
    /// Create a strict validation configuration (all checks enabled)
    pub fn strict() -> Self {
        Self::default()
    }

    /// Create a permissive configuration (for development)
    pub fn permissive() -> Self {
        Self {
            max_body_size: 50 * 1024 * 1024, // 50 MB
            detect_sql_injection: false,
            detect_xss: false,
            detect_path_traversal: false,
            allowed_content_types: vec![], // Allow all
        }
    }
}

/// Validation error response
#[derive(Debug)]
pub enum ValidationError {
    /// Request body too large
    BodyTooLarge { size: usize, max: usize },
    /// Potential SQL injection detected
    SqlInjection { pattern: String },
    /// Potential XSS attack detected
    XssDetected { pattern: String },
    /// Path traversal attempt detected
    PathTraversal { pattern: String },
    /// Invalid content type
    InvalidContentType { received: String },
}

impl IntoResponse for ValidationError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ValidationError::BodyTooLarge { size, max } => (
                StatusCode::PAYLOAD_TOO_LARGE,
                format!("Request body too large: {} bytes (max: {} bytes)", size, max),
            ),
            ValidationError::SqlInjection { pattern } => (
                StatusCode::BAD_REQUEST,
                format!("Potential SQL injection detected: {}", pattern),
            ),
            ValidationError::XssDetected { pattern } => (
                StatusCode::BAD_REQUEST,
                format!("Potential XSS attack detected: {}", pattern),
            ),
            ValidationError::PathTraversal { pattern } => (
                StatusCode::BAD_REQUEST,
                format!("Path traversal detected: {}", pattern),
            ),
            ValidationError::InvalidContentType { received } => (
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                format!("Invalid content type: {}", received),
            ),
        };

        (status, message).into_response()
    }
}

/// Check for SQL injection patterns in a string
pub fn check_sql_injection(input: &str) -> Option<String> {
    let regex = sql_injection_regex();
    regex.find(input).map(|m| m.as_str().to_string())
}

/// Check for XSS patterns in a string
pub fn check_xss(input: &str) -> Option<String> {
    let regex = xss_regex();
    regex.find(input).map(|m| m.as_str().to_string())
}

/// Check for path traversal patterns in a string
pub fn check_path_traversal(input: &str) -> Option<String> {
    let regex = path_traversal_regex();
    regex.find(input).map(|m| m.as_str().to_string())
}

/// Validate request headers and path
pub fn validate_request_metadata(
    method: &Method,
    path: &str,
    headers: &HeaderMap,
    config: &ValidationConfig,
) -> Result<(), ValidationError> {
    // Check path for traversal attempts
    if config.detect_path_traversal {
        if let Some(pattern) = check_path_traversal(path) {
            return Err(ValidationError::PathTraversal { pattern });
        }
    }

    // Check content-type for POST/PUT/PATCH requests
    if matches!(method, &Method::POST | &Method::PUT | &Method::PATCH) {
        if !config.allowed_content_types.is_empty() {
            let content_type = headers
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");

            // Extract base content type (ignore charset and other parameters)
            let base_type = content_type.split(';').next().unwrap_or("").trim();

            if !base_type.is_empty()
                && !config
                    .allowed_content_types
                    .iter()
                    .any(|allowed| base_type.starts_with(allowed))
            {
                return Err(ValidationError::InvalidContentType {
                    received: base_type.to_string(),
                });
            }
        }
    }

    Ok(())
}

/// Validate request body content
pub fn validate_body_content(body: &str, config: &ValidationConfig) -> Result<(), ValidationError> {
    // Check for SQL injection
    if config.detect_sql_injection {
        if let Some(pattern) = check_sql_injection(body) {
            return Err(ValidationError::SqlInjection { pattern });
        }
    }

    // Check for XSS
    if config.detect_xss {
        if let Some(pattern) = check_xss(body) {
            return Err(ValidationError::XssDetected { pattern });
        }
    }

    Ok(())
}

/// Request validation middleware
///
/// Validates incoming requests for common security issues.
/// Should be placed early in the middleware chain.
///
/// Note: This middleware reads the request body, which means it can only
/// be used once per request. Place it before other middleware that also
/// read the body.
pub async fn request_validation_middleware(
    request: Request,
    next: Next,
) -> Result<Response, ValidationError> {
    request_validation_middleware_with_config(ValidationConfig::default(), request, next).await
}

/// Request validation middleware with custom configuration
pub async fn request_validation_middleware_with_config(
    config: ValidationConfig,
    request: Request,
    next: Next,
) -> Result<Response, ValidationError> {
    let (parts, body) = request.into_parts();

    // Validate request metadata (headers, path, method)
    validate_request_metadata(&parts.method, parts.uri.path(), &parts.headers, &config)?;

    // For GET/HEAD requests, skip body validation
    if matches!(parts.method, Method::GET | Method::HEAD | Method::OPTIONS) {
        let request = Request::from_parts(parts, body);
        return Ok(next.run(request).await);
    }

    // Read and validate body for other methods
    let bytes = match axum::body::to_bytes(body, config.max_body_size).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return Err(ValidationError::BodyTooLarge {
                size: config.max_body_size + 1,
                max: config.max_body_size,
            });
        }
    };

    // Validate body content if it's text-based
    if let Ok(body_str) = std::str::from_utf8(&bytes) {
        validate_body_content(body_str, &config)?;
    }

    // Reconstruct request with validated body
    let request = Request::from_parts(parts, Body::from(bytes));

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sql_injection_detection() {
        // Should detect SQL injection attempts
        assert!(check_sql_injection("SELECT * FROM users WHERE id = 1; DROP TABLE users;").is_some());
        assert!(check_sql_injection("1' OR '1'='1").is_some());
        assert!(check_sql_injection("admin' --").is_some());
        assert!(check_sql_injection("UNION SELECT password FROM users").is_some());

        // Should not flag normal text
        assert!(check_sql_injection("Hello, this is a normal message").is_none());
        assert!(check_sql_injection("user@example.com").is_none());
    }

    #[test]
    fn test_xss_detection() {
        // Should detect XSS attempts
        assert!(check_xss("<script>alert('XSS')</script>").is_some());
        assert!(check_xss("javascript:alert('XSS')").is_some());
        assert!(check_xss("<img src=x onerror=alert('XSS')>").is_some());
        assert!(check_xss("<iframe src='evil.com'></iframe>").is_some());

        // Should not flag normal HTML entities or text
        assert!(check_xss("This is a normal message").is_none());
        assert!(check_xss("Email: user@example.com").is_none());
    }

    #[test]
    fn test_path_traversal_detection() {
        // Should detect path traversal attempts
        assert!(check_path_traversal("../../../etc/passwd").is_some());
        assert!(check_path_traversal("..\\..\\windows\\system32").is_some());
        assert!(check_path_traversal("/files/%2e%2e/secret").is_some());

        // Should not flag normal paths
        assert!(check_path_traversal("/api/v1/users").is_none());
        assert!(check_path_traversal("/files/document.pdf").is_none());
    }

    #[test]
    fn test_validation_config_default() {
        let config = ValidationConfig::default();
        assert_eq!(config.max_body_size, MAX_BODY_SIZE);
        assert!(config.detect_sql_injection);
        assert!(config.detect_xss);
        assert!(config.detect_path_traversal);
    }

    #[test]
    fn test_validation_config_permissive() {
        let config = ValidationConfig::permissive();
        assert!(!config.detect_sql_injection);
        assert!(!config.detect_xss);
        assert!(!config.detect_path_traversal);
    }

    #[test]
    fn test_validate_body_content_sql_injection() {
        let config = ValidationConfig::default();
        let result = validate_body_content("SELECT * FROM users; DROP TABLE users;", &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_body_content_xss() {
        let config = ValidationConfig::default();
        let result = validate_body_content("<script>alert('XSS')</script>", &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_body_content_clean() {
        let config = ValidationConfig::default();
        let result = validate_body_content("This is a clean message", &config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_request_metadata_path_traversal() {
        let config = ValidationConfig::default();
        let headers = HeaderMap::new();
        let result = validate_request_metadata(
            &Method::GET,
            "/../../../etc/passwd",
            &headers,
            &config,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_request_metadata_clean_path() {
        let config = ValidationConfig::default();
        let headers = HeaderMap::new();
        let result = validate_request_metadata(
            &Method::GET,
            "/api/v1/users",
            &headers,
            &config,
        );
        assert!(result.is_ok());
    }
}
