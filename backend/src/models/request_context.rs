/*!
 * Request Context
 *
 * Holds HTTP request metadata (IP address, user agent, request ID) that is
 * extracted from incoming requests via middleware and passed through to
 * services for audit logging.
 */

use uuid::Uuid;

/// Request context containing metadata about the HTTP request.
/// This is populated by the request_context_middleware and can be
/// passed to services that need to create audit log entries.
#[derive(Clone, Debug)]
pub struct RequestContext {
    /// Client IP address (from X-Forwarded-For, X-Real-IP, or direct connection)
    pub ip_address: Option<String>,
    /// Client User-Agent header
    pub user_agent: Option<String>,
    /// Unique request identifier for tracing
    pub request_id: Uuid,
}

impl RequestContext {
    /// Create a new RequestContext with the provided values
    pub fn new(ip_address: Option<String>, user_agent: Option<String>) -> Self {
        Self {
            ip_address,
            user_agent,
            request_id: Uuid::new_v4(),
        }
    }

    /// Create an empty context (for cases where no request context is available)
    pub fn empty() -> Self {
        Self {
            ip_address: None,
            user_agent: None,
            request_id: Uuid::new_v4(),
        }
    }
}
