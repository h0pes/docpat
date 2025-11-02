/*!
 * Security Headers Middleware
 *
 * Implements comprehensive security HTTP headers to protect against
 * common web vulnerabilities according to OWASP recommendations.
 *
 * Headers included:
 * - Strict-Transport-Security (HSTS)
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 *
 * Security Standards:
 * - OWASP Secure Headers Project
 * - NIST SP 800-53
 * - HIPAA Technical Safeguards
 */

use axum::{
    extract::Request,
    http::header::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};

/// Security headers configuration
#[derive(Clone, Debug)]
pub struct SecurityHeadersConfig {
    /// Enable HTTP Strict Transport Security (HSTS)
    pub enable_hsts: bool,
    /// HSTS max-age in seconds (default: 1 year)
    pub hsts_max_age: u32,
    /// Include subdomains in HSTS
    pub hsts_include_subdomains: bool,
    /// Enable HSTS preload
    pub hsts_preload: bool,

    /// Content Security Policy directives
    pub csp_directives: Vec<String>,
    /// Report-Only mode for CSP (for testing)
    pub csp_report_only: bool,

    /// X-Frame-Options value (DENY, SAMEORIGIN, or custom)
    pub frame_options: FrameOptions,

    /// Referrer-Policy value
    pub referrer_policy: ReferrerPolicy,

    /// Permissions-Policy directives
    pub permissions_policy: Vec<String>,
}

/// X-Frame-Options values
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FrameOptions {
    /// Deny all framing
    Deny,
    /// Allow same-origin framing
    SameOrigin,
}

impl FrameOptions {
    fn as_str(&self) -> &'static str {
        match self {
            FrameOptions::Deny => "DENY",
            FrameOptions::SameOrigin => "SAMEORIGIN",
        }
    }
}

/// Referrer-Policy values
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReferrerPolicy {
    /// No referrer information
    NoReferrer,
    /// Only send origin as referrer
    Origin,
    /// Full URL for same-origin, origin for cross-origin
    StrictOriginWhenCrossOrigin,
    /// No referrer for cross-origin
    SameOrigin,
}

impl ReferrerPolicy {
    fn as_str(&self) -> &'static str {
        match self {
            ReferrerPolicy::NoReferrer => "no-referrer",
            ReferrerPolicy::Origin => "origin",
            ReferrerPolicy::StrictOriginWhenCrossOrigin => "strict-origin-when-cross-origin",
            ReferrerPolicy::SameOrigin => "same-origin",
        }
    }
}

impl Default for SecurityHeadersConfig {
    fn default() -> Self {
        Self {
            // HSTS configuration (enforces HTTPS)
            enable_hsts: true,
            hsts_max_age: 31536000, // 1 year
            hsts_include_subdomains: true,
            hsts_preload: false, // Set to true only after adding to preload list

            // Content Security Policy (strict default)
            csp_directives: vec![
                "default-src 'self'".to_string(),
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'".to_string(), // Allow React development
                "style-src 'self' 'unsafe-inline'".to_string(), // Allow inline styles for Tailwind
                "img-src 'self' data: https:".to_string(),
                "font-src 'self' data:".to_string(),
                "connect-src 'self'".to_string(),
                "frame-ancestors 'none'".to_string(), // No framing allowed
                "base-uri 'self'".to_string(),
                "form-action 'self'".to_string(),
            ],
            csp_report_only: false,

            // Prevent clickjacking
            frame_options: FrameOptions::Deny,

            // Referrer policy (balance privacy and functionality)
            referrer_policy: ReferrerPolicy::StrictOriginWhenCrossOrigin,

            // Permissions Policy (restrict powerful features)
            permissions_policy: vec![
                "geolocation=()".to_string(),
                "camera=()".to_string(),
                "microphone=()".to_string(),
                "payment=()".to_string(),
                "usb=()".to_string(),
            ],
        }
    }
}

impl SecurityHeadersConfig {
    /// Create configuration optimized for development
    ///
    /// More permissive settings for easier local development:
    /// - Disabled HSTS (allows HTTP)
    /// - Relaxed CSP (allows eval, inline scripts)
    /// - CSP in report-only mode
    pub fn development() -> Self {
        Self {
            enable_hsts: false, // Don't enforce HTTPS in development
            csp_report_only: true, // Don't block in development
            ..Default::default()
        }
    }

    /// Create configuration for production
    ///
    /// Strict security settings:
    /// - Enforced HSTS with preload
    /// - Strict CSP
    /// - All security headers enabled
    pub fn production() -> Self {
        Self {
            enable_hsts: true,
            hsts_preload: true,
            csp_report_only: false,
            // Remove unsafe-inline and unsafe-eval for production
            csp_directives: vec![
                "default-src 'self'".to_string(),
                "script-src 'self'".to_string(),
                "style-src 'self'".to_string(),
                "img-src 'self' data: https:".to_string(),
                "font-src 'self' data:".to_string(),
                "connect-src 'self'".to_string(),
                "frame-ancestors 'none'".to_string(),
                "base-uri 'self'".to_string(),
                "form-action 'self'".to_string(),
                "upgrade-insecure-requests".to_string(),
            ],
            ..Default::default()
        }
    }

    /// Build HSTS header value
    fn build_hsts_header(&self) -> Option<String> {
        if !self.enable_hsts {
            return None;
        }

        let mut parts = vec![format!("max-age={}", self.hsts_max_age)];

        if self.hsts_include_subdomains {
            parts.push("includeSubDomains".to_string());
        }

        if self.hsts_preload {
            parts.push("preload".to_string());
        }

        Some(parts.join("; "))
    }

    /// Build CSP header value
    fn build_csp_header(&self) -> String {
        self.csp_directives.join("; ")
    }

    /// Build Permissions-Policy header value
    fn build_permissions_policy_header(&self) -> String {
        self.permissions_policy.join(", ")
    }
}

/// Security headers middleware
///
/// Adds comprehensive security headers to all responses.
/// Should be applied early in the middleware chain.
///
/// # Example
///
/// ```rust,ignore
/// let app = Router::new()
///     .route("/api/health", get(health_check))
///     .layer(axum::middleware::from_fn(security_headers_middleware));
/// ```
pub async fn security_headers_middleware(
    request: Request,
    next: Next,
) -> Response {
    security_headers_middleware_with_config(
        SecurityHeadersConfig::default(),
        request,
        next,
    ).await
}

/// Security headers middleware with custom configuration
///
/// Allows customization of security headers.
pub async fn security_headers_middleware_with_config(
    config: SecurityHeadersConfig,
    request: Request,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // HSTS (HTTP Strict Transport Security)
    if let Some(hsts_value) = config.build_hsts_header() {
        if let Ok(value) = HeaderValue::from_str(&hsts_value) {
            headers.insert("Strict-Transport-Security", value);
        }
    }

    // Content Security Policy
    let csp_value = config.build_csp_header();
    if let Ok(value) = HeaderValue::from_str(&csp_value) {
        let header_name = if config.csp_report_only {
            HeaderName::from_static("content-security-policy-report-only")
        } else {
            HeaderName::from_static("content-security-policy")
        };
        headers.insert(header_name, value);
    }

    // X-Frame-Options
    headers.insert(
        "X-Frame-Options",
        HeaderValue::from_static(config.frame_options.as_str()),
    );

    // X-Content-Type-Options (prevent MIME sniffing)
    headers.insert(
        "X-Content-Type-Options",
        HeaderValue::from_static("nosniff"),
    );

    // X-XSS-Protection (legacy, but still useful for old browsers)
    headers.insert(
        "X-XSS-Protection",
        HeaderValue::from_static("1; mode=block"),
    );

    // Referrer-Policy
    headers.insert(
        "Referrer-Policy",
        HeaderValue::from_static(config.referrer_policy.as_str()),
    );

    // Permissions-Policy
    let permissions_policy = config.build_permissions_policy_header();
    if let Ok(value) = HeaderValue::from_str(&permissions_policy) {
        headers.insert(
            HeaderName::from_static("permissions-policy"),
            value,
        );
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::get,
        Router,
    };
    use tower::ServiceExt;

    async fn handler() -> &'static str {
        "OK"
    }

    #[tokio::test]
    async fn test_security_headers_default() {
        let app = Router::new()
            .route("/test", get(handler))
            .layer(axum::middleware::from_fn(security_headers_middleware));

        let request = Request::builder()
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let headers = response.headers();
        assert!(headers.contains_key("strict-transport-security"));
        assert!(headers.contains_key("x-frame-options"));
        assert!(headers.contains_key("x-content-type-options"));
        assert!(headers.contains_key("x-xss-protection"));
        assert!(headers.contains_key("referrer-policy"));
    }

    #[test]
    fn test_config_default() {
        let config = SecurityHeadersConfig::default();

        assert!(config.enable_hsts);
        assert_eq!(config.hsts_max_age, 31536000);
        assert!(config.hsts_include_subdomains);
        assert!(!config.csp_report_only);
        assert_eq!(config.frame_options, FrameOptions::Deny);
    }

    #[test]
    fn test_config_development() {
        let config = SecurityHeadersConfig::development();

        assert!(!config.enable_hsts); // HSTS disabled for dev
        assert!(config.csp_report_only); // CSP in report-only mode
    }

    #[test]
    fn test_config_production() {
        let config = SecurityHeadersConfig::production();

        assert!(config.enable_hsts);
        assert!(config.hsts_preload);
        assert!(!config.csp_report_only);
        // Production CSP should be stricter (no unsafe-inline/unsafe-eval)
        assert!(!config.csp_directives.iter().any(|d| d.contains("unsafe-inline")));
    }

    #[test]
    fn test_hsts_header_generation() {
        let config = SecurityHeadersConfig {
            enable_hsts: true,
            hsts_max_age: 3600,
            hsts_include_subdomains: true,
            hsts_preload: true,
            ..Default::default()
        };

        let header = config.build_hsts_header().unwrap();
        assert!(header.contains("max-age=3600"));
        assert!(header.contains("includeSubDomains"));
        assert!(header.contains("preload"));
    }

    #[test]
    fn test_hsts_disabled() {
        let config = SecurityHeadersConfig {
            enable_hsts: false,
            ..Default::default()
        };

        assert!(config.build_hsts_header().is_none());
    }

    #[test]
    fn test_csp_header_generation() {
        let config = SecurityHeadersConfig::default();
        let csp = config.build_csp_header();

        assert!(csp.contains("default-src 'self'"));
        assert!(csp.contains("frame-ancestors 'none'"));
    }

    #[test]
    fn test_frame_options_values() {
        assert_eq!(FrameOptions::Deny.as_str(), "DENY");
        assert_eq!(FrameOptions::SameOrigin.as_str(), "SAMEORIGIN");
    }

    #[test]
    fn test_referrer_policy_values() {
        assert_eq!(ReferrerPolicy::NoReferrer.as_str(), "no-referrer");
        assert_eq!(ReferrerPolicy::Origin.as_str(), "origin");
        assert_eq!(
            ReferrerPolicy::StrictOriginWhenCrossOrigin.as_str(),
            "strict-origin-when-cross-origin"
        );
        assert_eq!(ReferrerPolicy::SameOrigin.as_str(), "same-origin");
    }

    #[test]
    fn test_permissions_policy_generation() {
        let config = SecurityHeadersConfig::default();
        let policy = config.build_permissions_policy_header();

        assert!(policy.contains("geolocation=()"));
        assert!(policy.contains("camera=()"));
        assert!(policy.contains("microphone=()"));
    }
}
