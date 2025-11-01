/*!
 * Error Handling
 *
 * Defines application-wide error types and conversion implementations
 * for proper error handling and HTTP response mapping.
 */

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::fmt;

/// Application result type
pub type Result<T> = std::result::Result<T, AppError>;

/// Application error types
#[derive(Debug)]
pub enum AppError {
    /// Database error
    Database(sqlx::Error),
    /// Authentication error
    Unauthorized(String),
    /// Forbidden error
    Forbidden(String),
    /// Not found error
    NotFound(String),
    /// Validation error
    Validation(String),
    /// Conflict error (e.g., duplicate resource)
    Conflict(String),
    /// Rate limit exceeded
    RateLimitExceeded,
    /// Internal server error
    Internal(String),
    /// Bad request
    BadRequest(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(err) => write!(f, "Database error: {}", err),
            Self::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            Self::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            Self::NotFound(msg) => write!(f, "Not found: {}", msg),
            Self::Validation(msg) => write!(f, "Validation error: {}", msg),
            Self::Conflict(msg) => write!(f, "Conflict: {}", msg),
            Self::RateLimitExceeded => write!(f, "Rate limit exceeded"),
            Self::Internal(msg) => write!(f, "Internal server error: {}", msg),
            Self::BadRequest(msg) => write!(f, "Bad request: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

/// Convert SQLx errors to AppError
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        tracing::error!("Database error: {:?}", err);
        Self::Database(err)
    }
}

/// Convert JWT errors to AppError
impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        tracing::error!("JWT error: {:?}", err);
        Self::Unauthorized(format!("Invalid token: {}", err))
    }
}

/// Convert Argon2 password hash errors to AppError
impl From<argon2::password_hash::Error> for AppError {
    fn from(err: argon2::password_hash::Error) -> Self {
        tracing::error!("Password hash error: {:?}", err);
        Self::Internal(format!("Password hashing error: {}", err))
    }
}

/// Convert AppError to HTTP response
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_code, message) = match self {
            Self::Database(ref err) => {
                // Don't expose internal database errors to clients
                tracing::error!("Database error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "An internal database error occurred".to_string(),
                )
            }
            Self::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", msg),
            Self::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg),
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg),
            Self::Validation(msg) => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", msg),
            Self::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg),
            Self::RateLimitExceeded => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMIT_EXCEEDED",
                "Too many requests, please try again later".to_string(),
            ),
            Self::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An internal server error occurred".to_string(),
                )
            }
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, "BAD_REQUEST", msg),
        };

        let body = Json(json!({
            "error": error_code,
            "message": message,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }));

        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_display() {
        let err = AppError::Unauthorized("Invalid credentials".to_string());
        assert_eq!(err.to_string(), "Unauthorized: Invalid credentials");

        let err = AppError::NotFound("User not found".to_string());
        assert_eq!(err.to_string(), "Not found: User not found");
    }

    #[test]
    fn test_app_error_from_sqlx() {
        let sqlx_err = sqlx::Error::RowNotFound;
        let app_err: AppError = sqlx_err.into();
        match app_err {
            AppError::Database(_) => (),
            _ => panic!("Expected Database error"),
        }
    }
}
