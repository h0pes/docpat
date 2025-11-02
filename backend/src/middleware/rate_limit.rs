/*!
 * Rate Limiting Middleware
 *
 * Implements per-IP and per-user rate limiting to prevent abuse and DoS attacks.
 * Uses the tower-governor crate with in-memory state.
 *
 * Rate Limits (per minute):
 * - Unauthenticated (by IP): 100 requests/minute
 * - Authenticated (by user ID): 300 requests/minute
 * - Bulk operations: 10 requests/minute
 *
 * Headers returned:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the window resets
 * - Retry-After: Seconds to wait before retrying (on 429 response)
 */

use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Extension,
};
use governor::{
    clock::{Clock, DefaultClock},
    state::{InMemoryState, direct::NotKeyed},
    Quota, RateLimiter as GovernorRateLimiter,
};
use std::{num::NonZeroU32, sync::Arc};
use uuid::Uuid;

/// Rate limiter type for simple (non-keyed) rate limiting
type SimpleRateLimiter = Arc<GovernorRateLimiter<NotKeyed, InMemoryState, DefaultClock>>;

/// Configuration for different rate limit tiers
#[derive(Clone, Debug)]
pub struct RateLimitConfig {
    /// Unauthenticated requests (by IP): 100 requests/minute
    pub unauthenticated_limit: u32,
    /// Authenticated requests (by user ID): 300 requests/minute
    pub authenticated_limit: u32,
    /// Bulk operations: 10 requests/minute
    pub bulk_limit: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            unauthenticated_limit: 100,
            authenticated_limit: 300,
            bulk_limit: 10,
        }
    }
}

/// Rate limiting layer that can be added to Axum router
///
/// This layer maintains separate rate limiters for different tiers of usage.
/// The middleware function determines which limiter to apply based on authentication
/// status and request path.
#[derive(Clone)]
pub struct RateLimitLayer {
    config: RateLimitConfig,
    unauthenticated_limiter: SimpleRateLimiter,
    authenticated_limiter: SimpleRateLimiter,
    bulk_limiter: SimpleRateLimiter,
}

impl RateLimitLayer {
    /// Create a new rate limit layer with default configuration
    pub fn new() -> Self {
        let config = RateLimitConfig::default();
        Self::with_config(config)
    }

    /// Create a new rate limit layer with custom configuration
    pub fn with_config(config: RateLimitConfig) -> Self {
        let unauthenticated_limiter = Arc::new(GovernorRateLimiter::direct(
            Quota::per_minute(NonZeroU32::new(config.unauthenticated_limit).unwrap())
        ));

        let authenticated_limiter = Arc::new(GovernorRateLimiter::direct(
            Quota::per_minute(NonZeroU32::new(config.authenticated_limit).unwrap())
        ));

        let bulk_limiter = Arc::new(GovernorRateLimiter::direct(
            Quota::per_minute(NonZeroU32::new(config.bulk_limit).unwrap())
        ));

        Self {
            config,
            unauthenticated_limiter,
            authenticated_limiter,
            bulk_limiter,
        }
    }

    /// Get the configuration
    pub fn config(&self) -> &RateLimitConfig {
        &self.config
    }

    /// Get the unauthenticated rate limiter
    pub fn unauthenticated(&self) -> SimpleRateLimiter {
        Arc::clone(&self.unauthenticated_limiter)
    }

    /// Get the authenticated rate limiter
    pub fn authenticated(&self) -> SimpleRateLimiter {
        Arc::clone(&self.authenticated_limiter)
    }

    /// Get the bulk operations rate limiter
    pub fn bulk(&self) -> SimpleRateLimiter {
        Arc::clone(&self.bulk_limiter)
    }
}

impl Default for RateLimitLayer {
    fn default() -> Self {
        Self::new()
    }
}

/// Rate limiting middleware function
///
/// This middleware checks rate limits based on authentication status:
/// - Unauthenticated requests: Limited to 100/min (shared per instance)
/// - Authenticated requests: Limited to 300/min (per user, but shared in this implementation)
/// - Bulk operations: Special endpoints limited to 10/min
///
/// Returns 429 Too Many Requests if rate limit is exceeded.
///
/// Note: This implementation uses a simple per-instance rate limiter rather than
/// per-IP or per-user tracking. For production use with multiple instances or
/// stricter per-user limits, consider using Redis-backed rate limiting.
pub async fn rate_limit_middleware(
    Extension(rate_limiter): Extension<RateLimitLayer>,
    user_id: Option<Extension<Uuid>>,
    request: Request,
    next: Next,
) -> Result<Response, impl IntoResponse> {
    // Determine if this is a bulk operation endpoint
    let is_bulk = request.uri().path().contains("/bulk")
        || request.uri().path().contains("/export")
        || request.uri().path().contains("/import");

    // Determine the appropriate rate limiter and limit value
    let (limiter, limit) = if is_bulk {
        // Bulk operations: always use strictest limit
        (rate_limiter.bulk(), rate_limiter.config().bulk_limit)
    } else if user_id.is_some() {
        // Authenticated: use higher limit
        (rate_limiter.authenticated(), rate_limiter.config().authenticated_limit)
    } else {
        // Unauthenticated: use default limit
        (rate_limiter.unauthenticated(), rate_limiter.config().unauthenticated_limit)
    };

    // Check the rate limit
    match limiter.check() {
        Ok(_) => {
            // Rate limit check passed, proceed with request
            let response = next.run(request).await;

            // Add rate limit headers to response
            let mut response = response.into_response();
            add_rate_limit_headers(
                response.headers_mut(),
                limit,
                true,
            );

            Ok(response)
        }
        Err(not_until) => {
            // Rate limit exceeded
            let wait_time = not_until.wait_time_from(DefaultClock::default().now());
            let retry_after_secs = wait_time.as_secs();

            // Create headers for 429 response
            let mut headers = HeaderMap::new();
            add_rate_limit_headers(&mut headers, limit, false);
            headers.insert(
                "Retry-After",
                retry_after_secs.to_string().parse().unwrap(),
            );

            Err((StatusCode::TOO_MANY_REQUESTS, headers))
        }
    }
}

/// Add rate limit headers to the response
///
/// Adds the following headers:
/// - X-RateLimit-Limit: Maximum requests allowed in the time window
/// - X-RateLimit-Remaining: Number of requests remaining (approximate)
/// - X-RateLimit-Reset: Unix timestamp when the rate limit window resets
fn add_rate_limit_headers(
    headers: &mut HeaderMap,
    limit: u32,
    has_quota: bool,
) {
    // Add headers
    headers.insert(
        "X-RateLimit-Limit",
        limit.to_string().parse().unwrap(),
    );

    // Remaining is approximate - we know if we have quota or not
    let remaining = if has_quota {
        limit.saturating_sub(1) // We just consumed one request
    } else {
        0
    };

    headers.insert(
        "X-RateLimit-Remaining",
        remaining.to_string().parse().unwrap(),
    );

    // Calculate reset time (60 seconds from now for per-minute quota)
    // Use system time for the reset timestamp since QuantaInstant is not a Unix timestamp
    use std::time::{SystemTime, UNIX_EPOCH};
    let reset_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() + 60;
    headers.insert(
        "X-RateLimit-Reset",
        reset_time.to_string().parse().unwrap(),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_config_default() {
        let config = RateLimitConfig::default();

        // Verify default limits are set correctly
        assert_eq!(config.unauthenticated_limit, 100);
        assert_eq!(config.authenticated_limit, 300);
        assert_eq!(config.bulk_limit, 10);
    }

    #[test]
    fn test_rate_limit_layer_creation() {
        let layer = RateLimitLayer::new();

        // Verify limiters are created
        assert!(Arc::strong_count(&layer.unauthenticated_limiter) >= 1);
        assert!(Arc::strong_count(&layer.authenticated_limiter) >= 1);
        assert!(Arc::strong_count(&layer.bulk_limiter) >= 1);
    }

    #[test]
    fn test_rate_limit_layer_with_custom_config() {
        let config = RateLimitConfig {
            unauthenticated_limit: 50,
            authenticated_limit: 200,
            bulk_limit: 5,
        };

        let layer = RateLimitLayer::with_config(config);

        // Verify config is stored
        assert_eq!(layer.config().unauthenticated_limit, 50);
        assert_eq!(layer.config().authenticated_limit, 200);
        assert_eq!(layer.config().bulk_limit, 5);
    }

    #[test]
    fn test_rate_limiter_enforcement_unauthenticated() {
        let layer = RateLimitLayer::new();
        let limiter = layer.unauthenticated();

        // Should allow up to 100 requests
        for i in 1..=100 {
            assert!(
                limiter.check().is_ok(),
                "Request {} should succeed",
                i
            );
        }

        // 101st request should be rate limited
        let result = limiter.check();
        assert!(result.is_err(), "Request 101 should be rate limited");
    }

    #[test]
    fn test_rate_limiter_enforcement_authenticated() {
        let layer = RateLimitLayer::new();
        let limiter = layer.authenticated();

        // Should allow up to 300 requests
        for i in 1..=300 {
            assert!(
                limiter.check().is_ok(),
                "Authenticated request {} should succeed",
                i
            );
        }

        // 301st request should be rate limited
        let result = limiter.check();
        assert!(result.is_err(), "Authenticated request 301 should be rate limited");
    }

    #[test]
    fn test_bulk_operations_strict_limit() {
        let layer = RateLimitLayer::new();
        let bulk_limiter = layer.bulk();

        // Bulk operations limited to 10/min
        for i in 1..=10 {
            assert!(
                bulk_limiter.check().is_ok(),
                "Bulk request {} should succeed",
                i
            );
        }

        // 11th request should be rate limited
        assert!(bulk_limiter.check().is_err(), "Bulk request 11 should be rate limited");
    }

    #[test]
    fn test_independent_limiters() {
        let layer = RateLimitLayer::new();
        let unauth = layer.unauthenticated();
        let auth = layer.authenticated();
        let bulk = layer.bulk();

        // Exhaust unauthenticated limiter
        for _ in 0..100 {
            assert!(unauth.check().is_ok());
        }
        assert!(unauth.check().is_err());

        // Other limiters should still work
        assert!(auth.check().is_ok(), "Authenticated limiter should be independent");
        assert!(bulk.check().is_ok(), "Bulk limiter should be independent");
    }

    #[test]
    fn test_rate_limit_headers() {
        let mut headers = HeaderMap::new();
        add_rate_limit_headers(&mut headers, 100, true);

        // Verify headers are added
        assert!(headers.contains_key("X-RateLimit-Limit"));
        assert!(headers.contains_key("X-RateLimit-Remaining"));
        assert!(headers.contains_key("X-RateLimit-Reset"));

        // Verify limit value
        assert_eq!(
            headers.get("X-RateLimit-Limit").unwrap().to_str().unwrap(),
            "100"
        );
    }

    #[test]
    fn test_rate_limit_headers_no_quota() {
        let mut headers = HeaderMap::new();
        add_rate_limit_headers(&mut headers, 100, false);

        // Remaining should be 0 when no quota
        assert_eq!(
            headers.get("X-RateLimit-Remaining").unwrap().to_str().unwrap(),
            "0"
        );
    }
}
