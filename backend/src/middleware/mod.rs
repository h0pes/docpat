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

// Rate limiting middleware
pub mod rate_limit;

// Audit logging middleware
pub mod audit;

// CORS configuration
pub mod cors;

// Security headers middleware
pub mod security_headers;

// CSRF protection middleware
pub mod csrf;

// Request validation middleware
pub mod request_validation;
