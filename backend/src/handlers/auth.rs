/*!
 * Authentication HTTP Handlers
 *
 * Handles HTTP requests for authentication endpoints (login, refresh, logout).
 */

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use axum::Extension;
use crate::{
    middleware::session_timeout::SessionManager,
    models::{AuditAction, AuditLog, CreateAuditLog, EntityType, RequestContext},
    services::{AuthService, EmailService, LoginRequest, LoginResponse, SettingsService, TokenPair},
    utils::{EncryptionKey, Result},
};
use sqlx::PgPool;
use std::sync::Arc;

#[cfg(feature = "rbac")]
use crate::middleware::authorization::CasbinEnforcer;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth_service: AuthService,
    pub session_manager: SessionManager,
    pub encryption_key: Option<EncryptionKey>,
    /// Email service for document delivery (optional - None if not configured)
    pub email_service: Option<EmailService>,
    /// Settings service with in-memory cache (shared across requests)
    pub settings_service: Arc<SettingsService>,
    /// Server start time for uptime calculation
    pub start_time: std::time::SystemTime,
    /// Current environment (development/production)
    pub environment: String,
    #[cfg(feature = "rbac")]
    pub enforcer: CasbinEnforcer,
}

/// Login handler
///
/// POST /api/v1/auth/login
///
/// # Request Body
///
/// ```json
/// {
///   "username": "doctor1",
///   "password": "secure_password",
///   "mfa_code": "123456" // Optional, required if MFA is enabled
/// }
/// ```
///
/// # Response
///
/// ```json
/// {
///   "user": {
///     "id": "uuid",
///     "username": "doctor1",
///     "email": "doctor@example.com",
///     "role": "DOCTOR",
///     ...
///   },
///   "tokens": {
///     "access_token": "jwt_token",
///     "refresh_token": "jwt_refresh_token",
///     "expires_in": 1800
///   }
/// }
/// ```
pub async fn login_handler(
    State(state): State<AppState>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(login_req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    tracing::info!("Login attempt for user: {}", login_req.username);

    let mut response = state.auth_service.login(&state.pool, login_req, Some(&request_ctx)).await?;

    // Check if global MFA requirement is enabled and user hasn't set up MFA
    // Only check if login was successful and user doesn't already need MFA verification
    if !response.requires_mfa && !response.user.mfa_enabled {
        // Check the security.mfa_required setting
        let mfa_required: bool = state
            .settings_service
            .get_setting_value("security.mfa_required")
            .await
            .unwrap_or(None)
            .unwrap_or(false);

        if mfa_required {
            tracing::info!(
                "MFA setup required for user {} (global mfa_required is ON)",
                response.user.username
            );
            response.requires_mfa_setup = true;
        }
    }

    // Track session activity on successful login
    state.session_manager.track_activity(&response.user.id);
    tracing::debug!("Session activity tracked for user: {}", response.user.id);

    Ok(Json(response))
}

/// Refresh token request
#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

/// Refresh token handler
///
/// POST /api/v1/auth/refresh
///
/// # Request Body
///
/// ```json
/// {
///   "refresh_token": "jwt_refresh_token"
/// }
/// ```
///
/// # Response
///
/// ```json
/// {
///   "access_token": "new_jwt_token",
///   "refresh_token": "new_jwt_refresh_token",
///   "expires_in": 1800
/// }
/// ```
pub async fn refresh_token_handler(
    State(state): State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Result<Json<TokenPair>> {
    tracing::info!("Token refresh request");

    // Validate refresh token and get user_id
    let claims = state.auth_service.validate_refresh_token_only(&req.refresh_token)?;
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| crate::utils::AppError::Unauthorized("Invalid user ID in token".to_string()))?;

    // Refresh the token
    let tokens = state.auth_service.refresh_token(&state.pool, &req.refresh_token).await?;

    // Track session activity on successful token refresh
    state.session_manager.track_activity(&user_id);
    tracing::debug!("Session activity tracked for user: {}", user_id);

    Ok(Json(tokens))
}

/// Logout response
#[derive(Debug, Serialize)]
pub struct LogoutResponse {
    pub message: String,
}

/// Logout request with optional access token
#[derive(Debug, Deserialize)]
pub struct LogoutRequest {
    /// Optional access token to invalidate session
    pub access_token: Option<String>,
}

/// Logout handler
///
/// POST /api/v1/auth/logout
///
/// Invalidates the user's session if an access token is provided.
///
/// # Request Body (Optional)
///
/// ```json
/// {
///   "access_token": "jwt_access_token"
/// }
/// ```
///
/// # Response
///
/// ```json
/// {
///   "message": "Logged out successfully"
/// }
/// ```
pub async fn logout_handler(
    State(state): State<AppState>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<LogoutRequest>,
) -> Result<impl IntoResponse> {
    tracing::info!("Logout request");

    // If access token provided, invalidate the session
    if let Some(token) = req.access_token {
        if let Ok(claims) = state.auth_service.validate_token(&token) {
            let user_id = uuid::Uuid::parse_str(&claims.sub)
                .map_err(|_| crate::utils::AppError::Unauthorized("Invalid user ID in token".to_string()))?;
            state.session_manager.invalidate_session(&user_id);
            tracing::info!("Session invalidated for user: {}", user_id);

            // Create audit log entry for logout
            let _ = AuditLog::create(
                &state.pool,
                CreateAuditLog {
                    user_id: Some(user_id),
                    action: AuditAction::Logout,
                    entity_type: EntityType::User,
                    entity_id: Some(user_id.to_string()),
                    changes: None,
                    ip_address: request_ctx.ip_address.clone(),
                    user_agent: request_ctx.user_agent.clone(),
                    request_id: Some(request_ctx.request_id),
                },
            )
            .await;
        }
    }

    Ok((
        StatusCode::OK,
        Json(LogoutResponse {
            message: "Logged out successfully".to_string(),
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{JwtConfig, SecurityConfig};

    fn test_auth_service() -> AuthService {
        let jwt_config = JwtConfig {
            secret: "test_secret_key_minimum_32_characters_long_for_security".to_string(),
            refresh_secret: "test_refresh_secret_key_minimum_32_characters_long".to_string(),
            access_token_expiry: 1800,
            refresh_token_expiry: 604800,
        };

        let security_config = SecurityConfig {
            encryption_key: "test_encryption_key_32_chars!!".to_string(),
            session_timeout: 1800,
            max_failed_login_attempts: 5,
            lockout_duration: 900,
        };

        AuthService::new(jwt_config, security_config)
    }

    #[tokio::test]
    async fn test_logout_handler() {
        use crate::middleware::session_timeout::SessionManager;
        use crate::services::SettingsService;
        use sqlx::PgPool;

        // Create minimal AppState for test
        let pool = PgPool::connect("postgresql://localhost/test")
            .await
            .unwrap_or_else(|_| panic!("Test skipped - no database"));

        #[cfg(feature = "rbac")]
        let enforcer = {
            use crate::middleware::authorization::CasbinEnforcer;
            CasbinEnforcer::new("casbin/model.conf", "casbin/policy.csv")
                .await
                .expect("Failed to initialize Casbin enforcer for test")
        };

        let app_state = AppState {
            pool: pool.clone(),
            auth_service: test_auth_service(),
            session_manager: SessionManager::new(1800),
            encryption_key: None, // Not needed for auth test
            email_service: None,  // Not needed for auth test
            settings_service: Arc::new(SettingsService::new(pool)),
            start_time: std::time::SystemTime::now(),
            environment: "test".to_string(),
            #[cfg(feature = "rbac")]
            enforcer,
        };

        let logout_req = LogoutRequest {
            access_token: None,
        };

        // Create a mock request context for the test
        let request_ctx = RequestContext {
            request_id: uuid::Uuid::new_v4(),
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("test-agent".to_string()),
        };

        let response = logout_handler(
            State(app_state),
            Extension(request_ctx),
            Json(logout_req),
        ).await;

        assert!(response.is_ok());
    }
}
