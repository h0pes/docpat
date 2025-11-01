/*!
 * Middleware Module
 *
 * Contains HTTP middleware for authentication, authorization, rate limiting,
 * audit logging, and other cross-cutting concerns.
 */

// JWT Authentication middleware
pub mod auth;

// Session timeout tracking
pub mod session_timeout;

// Authorization middleware with Casbin RBAC
#[cfg(feature = "rbac")]
pub mod authorization;

// Placeholder for future middleware implementations
// pub mod rate_limit;
// pub mod audit;
