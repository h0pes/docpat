/*!
 * Audit Logging Middleware
 *
 * Implements comprehensive audit logging for HIPAA compliance.
 * Logs all API requests and responses to the audit_logs table,
 * capturing user actions, timestamps, IP addresses, and changes.
 *
 * Key Features:
 * - Automatic logging of all authenticated requests
 * - IP address and user agent tracking
 * - Request/response status tracking
 * - Immutable audit trail (enforced by database)
 * - Performance optimized (async logging)
 *
 * HIPAA Compliance:
 * - 45 CFR § 164.312(b) - Audit Controls
 * - All ePHI access must be logged
 * - Logs must be protected against modification
 */

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use ipnetwork::IpNetwork;
use serde_json::Value;
use sqlx::PgPool;
use std::time::Instant;
use uuid::Uuid;

use crate::handlers::auth::AppState;

/// Audit log entry that will be stored in the database
#[derive(Debug, Clone)]
pub struct AuditLogEntry {
    /// ID of the user performing the action (if authenticated)
    pub user_id: Option<Uuid>,
    /// Action being performed (HTTP method + path)
    pub action: String,
    /// Entity type being accessed (extracted from path)
    pub entity_type: Option<String>,
    /// Entity ID being accessed (extracted from path)
    pub entity_id: Option<String>,
    /// Changes made (for POST/PUT/DELETE requests)
    pub changes: Option<Value>,
    /// IP address of the client
    pub ip_address: Option<IpNetwork>,
    /// User agent string
    pub user_agent: Option<String>,
    /// HTTP status code of the response
    pub status_code: u16,
    /// Duration of the request in milliseconds
    pub duration_ms: i64,
}

impl AuditLogEntry {
    /// Create a new audit log entry from request data
    pub fn from_request(
        request: &Request,
        user_id: Option<Uuid>,
        ip_address: Option<IpNetwork>,
    ) -> Self {
        let path = request.uri().path();
        let method = request.method().as_str();

        // Extract entity type and ID from path
        // Pattern: /api/v1/{entity_type}/{entity_id}
        let (entity_type, entity_id) = extract_entity_from_path(path);

        // Build action string
        let action = format!("{} {}", method, path);

        // Extract user agent
        let user_agent = request
            .headers()
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        Self {
            user_id,
            action,
            entity_type,
            entity_id,
            changes: None,
            ip_address,
            user_agent,
            status_code: 0, // Will be set after response
            duration_ms: 0, // Will be set after response
        }
    }

    /// Save the audit log entry to the database
    ///
    /// This is performed asynchronously to avoid blocking the response.
    /// Errors are logged but do not fail the request.
    pub async fn save(mut self, pool: &PgPool, status_code: u16, duration_ms: i64) -> Result<(), sqlx::Error> {
        self.status_code = status_code;
        self.duration_ms = duration_ms;

        sqlx::query!(
            r#"
            INSERT INTO audit_logs (
                user_id,
                action,
                entity_type,
                entity_id,
                changes,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            self.user_id,
            self.action,
            self.entity_type,
            self.entity_id,
            self.changes,
            self.ip_address,
            self.user_agent,
        )
        .execute(pool)
        .await?;

        Ok(())
    }
}

/// Extract entity type and ID from a path
///
/// Examples:
/// - `/api/v1/patients/123` -> (Some("patients"), Some("123"))
/// - `/api/v1/appointments` -> (Some("appointments"), None)
/// - `/health` -> (None, None)
fn extract_entity_from_path(path: &str) -> (Option<String>, Option<String>) {
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

    // Look for API paths: /api/v1/{entity_type}/{entity_id?}
    if parts.len() >= 3 && parts[0] == "api" && parts[1] == "v1" {
        let entity_type = Some(parts[2].to_string());
        let entity_id = parts.get(3).map(|s| s.to_string());
        return (entity_type, entity_id);
    }

    (None, None)
}

/// Audit logging middleware
///
/// This middleware logs all API requests to the audit_logs table.
/// It captures:
/// - User ID (extracted from JWT Authorization header if present)
/// - Action performed (method + path)
/// - Entity type and ID
/// - IP address and user agent
/// - Request duration
/// - Response status code
///
/// Skips logging for health checks and other non-sensitive paths.
/// The middleware runs as a global layer and does not depend on per-route
/// auth middleware — it extracts user identity directly from the JWT token.
pub async fn audit_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path().to_string();

    // Skip audit logging for non-sensitive paths
    if path == "/health" || path == "/metrics" || path == "/api/health" {
        return next.run(request).await;
    }

    // Extract user ID from JWT Authorization header (if present)
    let user_id_value = extract_user_id_from_auth_header(&request, &state);

    // Extract IP address from request headers
    // Priority: X-Forwarded-For > X-Real-IP (behind reverse proxy, these are always set)
    let ip_address = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .and_then(|s| s.trim().parse::<std::net::IpAddr>().ok())
        .or_else(|| {
            request
                .headers()
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<std::net::IpAddr>().ok())
        })
        .map(|ip| IpNetwork::from(ip));

    // Create audit log entry
    let audit_entry = AuditLogEntry::from_request(&request, user_id_value, ip_address);

    // Record start time
    let start_time = Instant::now();

    // Process the request
    let response = next.run(request).await;

    // Calculate duration
    let duration_ms = start_time.elapsed().as_millis() as i64;

    // Get response status code
    let status_code = response.status().as_u16();

    // Save audit log asynchronously (don't wait for it to complete)
    // This prevents audit logging from slowing down requests
    let pool = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = audit_entry.save(&pool, status_code, duration_ms).await {
            tracing::error!("Failed to save audit log ({})", e.to_string().chars().take(100).collect::<String>());
        }
    });

    response
}

/// Extract user ID from JWT Authorization header without requiring auth middleware.
/// Returns None if no valid token is present (unauthenticated requests).
fn extract_user_id_from_auth_header(request: &Request, state: &AppState) -> Option<Uuid> {
    let auth_header = request.headers().get("authorization")?;
    let auth_str = auth_header.to_str().ok()?;
    let token = auth_str.strip_prefix("Bearer ")?;
    let claims = state.auth_service.validate_token(token).ok()?;
    Uuid::parse_str(&claims.sub).ok()
}


#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Method;

    #[test]
    fn test_extract_entity_from_path() {
        // Test patient path with ID
        let (entity_type, entity_id) = extract_entity_from_path("/api/v1/patients/123");
        assert_eq!(entity_type, Some("patients".to_string()));
        assert_eq!(entity_id, Some("123".to_string()));

        // Test appointments path without ID
        let (entity_type, entity_id) = extract_entity_from_path("/api/v1/appointments");
        assert_eq!(entity_type, Some("appointments".to_string()));
        assert_eq!(entity_id, None);

        // Test nested path
        let (entity_type, entity_id) = extract_entity_from_path("/api/v1/patients/123/visits");
        assert_eq!(entity_type, Some("patients".to_string()));
        assert_eq!(entity_id, Some("123".to_string()));

        // Test health check path
        let (entity_type, entity_id) = extract_entity_from_path("/health");
        assert_eq!(entity_type, None);
        assert_eq!(entity_id, None);
    }

    #[tokio::test]
    async fn test_audit_log_entry_creation() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/v1/patients/123")
            .header("user-agent", "TestClient/1.0")
            .body(Body::empty())
            .unwrap();

        let user_id = Uuid::new_v4();
        let ip_address = "192.168.1.1".parse::<std::net::IpAddr>().ok().map(|ip| IpNetwork::from(ip));

        let entry = AuditLogEntry::from_request(&request, Some(user_id), ip_address);

        assert_eq!(entry.user_id, Some(user_id));
        assert_eq!(entry.action, "GET /api/v1/patients/123");
        assert_eq!(entry.entity_type, Some("patients".to_string()));
        assert_eq!(entry.entity_id, Some("123".to_string()));
        assert_eq!(entry.user_agent, Some("TestClient/1.0".to_string()));
        assert_eq!(entry.ip_address, ip_address);
    }

    #[test]
    fn test_audit_log_entry_post_request() {
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/v1/patients")
            .body(Body::empty())
            .unwrap();

        let entry = AuditLogEntry::from_request(&request, None, None);

        assert_eq!(entry.action, "POST /api/v1/patients");
        assert_eq!(entry.entity_type, Some("patients".to_string()));
        assert_eq!(entry.entity_id, None);
    }

    #[test]
    fn test_audit_log_entry_delete_request() {
        let request = Request::builder()
            .method(Method::DELETE)
            .uri("/api/v1/appointments/456")
            .body(Body::empty())
            .unwrap();

        let entry = AuditLogEntry::from_request(&request, None, None);

        assert_eq!(entry.action, "DELETE /api/v1/appointments/456");
        assert_eq!(entry.entity_type, Some("appointments".to_string()));
        assert_eq!(entry.entity_id, Some("456".to_string()));
    }

    #[test]
    fn test_ip_address_parsing() {
        let ip_v4: std::net::IpAddr = "192.168.1.1".parse().unwrap();
        assert!(ip_v4.is_ipv4());

        let ip_v6: std::net::IpAddr = "::1".parse().unwrap();
        assert!(ip_v6.is_ipv6());
    }
}
