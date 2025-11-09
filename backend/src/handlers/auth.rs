/*!
 * Authentication HTTP Handlers
 *
 * Handles HTTP requests for authentication endpoints (login, refresh, logout).
 */

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::{
    middleware::session_timeout::SessionManager,
    services::{AuthService, LoginRequest, LoginResponse, TokenPair},
    utils::{EncryptionKey, Result},
};
use sqlx::PgPool;

#[cfg(feature = "rbac")]
use crate::middleware::authorization::CasbinEnforcer;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth_service: AuthService,
    pub session_manager: SessionManager,
    pub encryption_key: Option<EncryptionKey>,
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
    Json(login_req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    tracing::info!("Login attempt for user: {}", login_req.username);

    let response = state.auth_service.login(&state.pool, login_req).await?;

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
            pool,
            auth_service: test_auth_service(),
            session_manager: SessionManager::new(1800),
            encryption_key: None, // Not needed for auth test
            #[cfg(feature = "rbac")]
            enforcer,
        };

        let logout_req = LogoutRequest {
            access_token: None,
        };

        let response = logout_handler(
            State(app_state),
            Json(logout_req),
        ).await;

        assert!(response.is_ok());
    }
}
