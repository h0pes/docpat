/*!
 * JWT Authentication Middleware
 *
 * Validates JWT tokens and adds user information to request extensions.
 */

use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

use crate::{
    handlers::auth::AppState,
    models::UserRole,
    utils::AppError,
};

/// JWT Authentication Middleware
///
/// Extracts and validates JWT token from Authorization header,
/// then adds user_id and role as request extensions.
pub async fn jwt_auth_middleware(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, impl IntoResponse> {
    // Extract Authorization header
    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                "Missing or invalid authorization header",
            ));
        }
    };

    // Validate token and extract claims
    let claims = match state.auth_service.validate_token(token) {
        Ok(claims) => claims,
        Err(_) => {
            return Err((StatusCode::UNAUTHORIZED, "Invalid or expired token"));
        }
    };

    // Parse user_id from claims
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid user ID in token",
        )
    })?;

    // Parse role from claims
    let role = match claims.role.as_str() {
        "ADMIN" => UserRole::Admin,
        "DOCTOR" => UserRole::Doctor,
        _ => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid role in token",
            ));
        }
    };

    // Add user_id and role to request extensions
    req.extensions_mut().insert(user_id);
    req.extensions_mut().insert(role);

    Ok(next.run(req).await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{JwtConfig, SecurityConfig};
    use crate::services::AuthService;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        middleware,
        response::Response,
        routing::get,
        Extension, Router,
    };
    use tower::ServiceExt;
    use uuid::Uuid;

    // Test handler that echoes back the user_id and role from extensions
    async fn test_handler(
        Extension(user_id): Extension<Uuid>,
        Extension(role): Extension<UserRole>,
    ) -> String {
        format!("user_id: {}, role: {}", user_id, role)
    }

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
    async fn test_jwt_auth_middleware_valid_token() {
        let auth_service = test_auth_service();
        let user_id = Uuid::new_v4();

        // Generate a valid token
        let tokens = auth_service
            .generate_tokens(&user_id, &UserRole::Doctor)
            .unwrap();

        // Create a minimal AppState for testing
        let pool = sqlx::PgPool::connect("postgresql://localhost/test")
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
            auth_service,
            session_manager: crate::middleware::session_timeout::SessionManager::new(1800),
            encryption_key: None, // Not needed for auth middleware test
            #[cfg(feature = "rbac")]
            enforcer,
        };

        // Create router with middleware
        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            ))
            .with_state(app_state);

        // Create request with valid token
        let request = Request::builder()
            .uri("/test")
            .header("authorization", format!("Bearer {}", tokens.access_token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_jwt_auth_middleware_missing_token() {
        let auth_service = test_auth_service();

        let pool = sqlx::PgPool::connect("postgresql://localhost/test")
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
            auth_service,
            session_manager: crate::middleware::session_timeout::SessionManager::new(1800),
            encryption_key: None, // Not needed for auth middleware test
            #[cfg(feature = "rbac")]
            enforcer,
        };

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            ))
            .with_state(app_state);

        // Create request without token
        let request = Request::builder()
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_jwt_auth_middleware_invalid_token() {
        let auth_service = test_auth_service();

        let pool = sqlx::PgPool::connect("postgresql://localhost/test")
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
            auth_service,
            session_manager: crate::middleware::session_timeout::SessionManager::new(1800),
            encryption_key: None, // Not needed for auth middleware test
            #[cfg(feature = "rbac")]
            enforcer,
        };

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            ))
            .with_state(app_state);

        // Create request with invalid token
        let request = Request::builder()
            .uri("/test")
            .header("authorization", "Bearer invalid_token")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
