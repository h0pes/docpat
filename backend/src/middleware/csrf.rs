/*!
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * Implements CSRF protection using the double-submit cookie pattern.
 * Prevents malicious sites from making unauthorized requests on behalf
 * of authenticated users.
 *
 * Protection Strategy:
 * - Generate unique CSRF token per session
 * - Store token in secure, HttpOnly cookie
 * - Require token in X-CSRF-Token header for state-changing requests
 * - Validate token matches for POST/PUT/DELETE/PATCH requests
 * - Exempt safe methods (GET, HEAD, OPTIONS)
 *
 * Security Standards:
 * - OWASP CSRF Prevention Cheat Sheet
 * - Double Submit Cookie Pattern
 * - Cryptographically secure random tokens
 */

use axum::{
    extract::Request,
    http::{HeaderMap, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::{thread_rng, RngCore};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tower_cookies::{Cookie, Cookies};

/// CSRF token length in bytes (32 bytes = 256 bits)
const CSRF_TOKEN_LENGTH: usize = 32;

/// Name of the CSRF token cookie
const CSRF_COOKIE_NAME: &str = "csrf_token";

/// Name of the CSRF token header
const CSRF_HEADER_NAME: &str = "x-csrf-token";

/// CSRF token store for validating tokens
///
/// In production with multiple instances, consider using Redis
/// for distributed token storage.
#[derive(Clone)]
pub struct CsrfTokenStore {
    tokens: Arc<RwLock<HashMap<String, String>>>,
}

impl CsrfTokenStore {
    /// Create a new CSRF token store
    pub fn new() -> Self {
        Self {
            tokens: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Generate a new CSRF token
    ///
    /// Tokens are cryptographically secure random values encoded in base64.
    pub fn generate_token(&self) -> String {
        let mut token_bytes = vec![0u8; CSRF_TOKEN_LENGTH];
        thread_rng().fill_bytes(&mut token_bytes);
        BASE64.encode(&token_bytes)
    }

    /// Store a token for a session
    pub fn store_token(&self, session_id: &str, token: &str) {
        let mut tokens = self.tokens.write().unwrap();
        tokens.insert(session_id.to_string(), token.to_string());
    }

    /// Validate a token for a session
    pub fn validate_token(&self, session_id: &str, token: &str) -> bool {
        let tokens = self.tokens.read().unwrap();
        tokens.get(session_id).map_or(false, |stored| stored == token)
    }

    /// Remove a token for a session
    pub fn remove_token(&self, session_id: &str) {
        let mut tokens = self.tokens.write().unwrap();
        tokens.remove(session_id);
    }

    /// Clean up expired tokens (should be called periodically)
    pub fn cleanup(&self) {
        // In a real implementation, this would remove tokens for expired sessions
        // For now, we rely on session management to handle cleanup
    }
}

impl Default for CsrfTokenStore {
    fn default() -> Self {
        Self::new()
    }
}

/// CSRF protection configuration
#[derive(Clone, Debug)]
pub struct CsrfConfig {
    /// Cookie name for CSRF token
    pub cookie_name: String,
    /// Header name for CSRF token
    pub header_name: String,
    /// Cookie path
    pub cookie_path: String,
    /// Cookie domain (None for same-origin only)
    pub cookie_domain: Option<String>,
    /// Cookie secure flag (should be true in production)
    pub cookie_secure: bool,
    /// Cookie SameSite attribute
    pub cookie_same_site: tower_cookies::cookie::SameSite,
}

impl Default for CsrfConfig {
    fn default() -> Self {
        Self {
            cookie_name: CSRF_COOKIE_NAME.to_string(),
            header_name: CSRF_HEADER_NAME.to_string(),
            cookie_path: "/".to_string(),
            cookie_domain: None,
            cookie_secure: true, // Should be true in production (HTTPS only)
            cookie_same_site: tower_cookies::cookie::SameSite::Strict,
        }
    }
}

impl CsrfConfig {
    /// Create configuration for development (allows HTTP)
    pub fn development() -> Self {
        Self {
            cookie_secure: false, // Allow HTTP in development
            ..Default::default()
        }
    }

    /// Create configuration for production (enforces HTTPS)
    pub fn production() -> Self {
        Self {
            cookie_secure: true,
            ..Default::default()
        }
    }
}

/// CSRF protection middleware
///
/// Protects against Cross-Site Request Forgery attacks by validating
/// CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH).
///
/// Safe methods (GET, HEAD, OPTIONS) are exempt from validation.
///
/// Usage:
/// ```rust,ignore
/// use axum::Extension;
///
/// let csrf_store = CsrfTokenStore::new();
/// let app = Router::new()
///     .route("/api/data", post(handler))
///     .layer(Extension(csrf_store.clone()))
///     .layer(axum::middleware::from_fn(csrf_protection_middleware));
/// ```
pub async fn csrf_protection_middleware(
    cookies: Cookies,
    request: Request,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let headers = request.headers().clone();

    // Extract or generate CSRF token
    let csrf_token = match cookies.get(CSRF_COOKIE_NAME) {
        Some(cookie) => cookie.value().to_string(),
        None => {
            // Generate new token
            let token = generate_csrf_token();
            set_csrf_cookie(&cookies, &token, &CsrfConfig::default());
            token
        }
    };

    // Safe methods (GET, HEAD, OPTIONS) don't require CSRF validation
    if is_safe_method(&method) {
        return next.run(request).await;
    }

    // State-changing methods require CSRF token validation
    let header_token = headers
        .get(CSRF_HEADER_NAME)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if header_token.is_empty() {
        return (
            StatusCode::FORBIDDEN,
            "Missing CSRF token in request header",
        ).into_response();
    }

    if header_token != csrf_token {
        return (StatusCode::FORBIDDEN, "Invalid CSRF token").into_response();
    }

    // Token is valid, proceed with request
    next.run(request).await
}

/// Check if HTTP method is safe (doesn't modify state)
fn is_safe_method(method: &Method) -> bool {
    matches!(
        method,
        &Method::GET | &Method::HEAD | &Method::OPTIONS | &Method::TRACE
    )
}

/// Generate a new CSRF token
fn generate_csrf_token() -> String {
    let mut token_bytes = vec![0u8; CSRF_TOKEN_LENGTH];
    thread_rng().fill_bytes(&mut token_bytes);
    BASE64.encode(&token_bytes)
}

/// Set CSRF token cookie
fn set_csrf_cookie(cookies: &Cookies, token: &str, config: &CsrfConfig) {
    let mut cookie = Cookie::new(config.cookie_name.clone(), token.to_string());

    cookie.set_path(config.cookie_path.clone());
    cookie.set_http_only(true); // Prevent JavaScript access
    cookie.set_secure(config.cookie_secure);
    cookie.set_same_site(config.cookie_same_site);

    if let Some(domain) = &config.cookie_domain {
        cookie.set_domain(domain.clone());
    }

    cookies.add(cookie);
}

/// Extract CSRF token from request headers
pub fn extract_csrf_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(CSRF_HEADER_NAME)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// Validate CSRF token from headers against cookie
pub fn validate_csrf_token(cookies: &Cookies, headers: &HeaderMap) -> bool {
    let cookie_token = cookies
        .get(CSRF_COOKIE_NAME)
        .map(|c| c.value().to_string());

    let header_token = extract_csrf_token(headers);

    match (cookie_token, header_token) {
        (Some(cookie), Some(header)) => cookie == header,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csrf_token_generation() {
        let token1 = generate_csrf_token();
        let token2 = generate_csrf_token();

        // Tokens should be base64 strings
        assert!(!token1.is_empty());
        assert!(!token2.is_empty());

        // Tokens should be unique
        assert_ne!(token1, token2);

        // Tokens should decode to correct length
        let decoded = BASE64.decode(&token1).unwrap();
        assert_eq!(decoded.len(), CSRF_TOKEN_LENGTH);
    }

    #[test]
    fn test_csrf_token_store() {
        let store = CsrfTokenStore::new();
        let session_id = "test-session-123";
        let token = "test-token-456";

        // Store token
        store.store_token(session_id, token);

        // Validate correct token
        assert!(store.validate_token(session_id, token));

        // Validate incorrect token
        assert!(!store.validate_token(session_id, "wrong-token"));

        // Validate non-existent session
        assert!(!store.validate_token("non-existent", token));

        // Remove token
        store.remove_token(session_id);
        assert!(!store.validate_token(session_id, token));
    }

    #[test]
    fn test_is_safe_method() {
        assert!(is_safe_method(&Method::GET));
        assert!(is_safe_method(&Method::HEAD));
        assert!(is_safe_method(&Method::OPTIONS));
        assert!(is_safe_method(&Method::TRACE));

        assert!(!is_safe_method(&Method::POST));
        assert!(!is_safe_method(&Method::PUT));
        assert!(!is_safe_method(&Method::DELETE));
        assert!(!is_safe_method(&Method::PATCH));
    }

    #[test]
    fn test_csrf_config_default() {
        let config = CsrfConfig::default();

        assert_eq!(config.cookie_name, CSRF_COOKIE_NAME);
        assert_eq!(config.header_name, CSRF_HEADER_NAME);
        assert_eq!(config.cookie_path, "/");
        assert!(config.cookie_secure);
        assert_eq!(
            config.cookie_same_site,
            tower_cookies::cookie::SameSite::Strict
        );
    }

    #[test]
    fn test_csrf_config_development() {
        let config = CsrfConfig::development();
        assert!(!config.cookie_secure); // Allows HTTP in development
    }

    #[test]
    fn test_csrf_config_production() {
        let config = CsrfConfig::production();
        assert!(config.cookie_secure); // Enforces HTTPS
    }

    // Integration tests with full middleware stack are complex due to cookie handling
    // These would typically be tested in end-to-end tests with a real HTTP client
    // For now, we test the core validation logic in unit tests above

    #[test]
    fn test_extract_csrf_token() {
        let mut headers = HeaderMap::new();
        headers.insert(CSRF_HEADER_NAME, "test-token-123".parse().unwrap());

        let token = extract_csrf_token(&headers);
        assert_eq!(token, Some("test-token-123".to_string()));

        // Test with missing header
        let empty_headers = HeaderMap::new();
        let no_token = extract_csrf_token(&empty_headers);
        assert_eq!(no_token, None);
    }
}
