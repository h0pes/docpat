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

// Rate limiting middleware (handled by Nginx in production)
#[allow(dead_code)]
pub mod rate_limit;

// Audit logging middleware
pub mod audit;

// Request context extraction middleware
pub mod request_context;

// CORS configuration
pub mod cors;

// Security headers middleware (handled by Nginx in production)
#[allow(dead_code)]
pub mod security_headers;

// CSRF protection middleware (not yet wired — JWT-based auth mitigates CSRF)
#[allow(dead_code)]
pub mod csrf;

// Request validation middleware (not yet wired — Nginx handles in production)
#[allow(dead_code)]
pub mod request_validation;

// Error redaction middleware (prevents leaking implementation details)
pub mod error_redaction;
