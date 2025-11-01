/*!
 * API v1 Routes
 *
 * Defines all version 1 API routes and their handlers.
 */

use axum::{
    middleware,
    routing::{get, post, put},
    Router,
};

use crate::handlers::auth::AppState;
use crate::handlers::{login_handler, logout_handler, mfa_enroll_handler, mfa_setup_handler, refresh_token_handler};
use crate::middleware::auth::jwt_auth_middleware;

#[cfg(feature = "rbac")]
use crate::handlers::users;

/// Create API v1 routes
///
/// # Arguments
///
/// * `state` - Application state containing database pool and services
///
/// # Returns
///
/// Configured router for API v1
pub fn create_api_v1_routes(state: AppState) -> Router {
    // Authentication routes (no auth middleware required)
    let auth_routes = Router::new()
        .route("/login", post(login_handler))
        .route("/refresh", post(refresh_token_handler))
        .route("/logout", post(logout_handler))
        .route("/mfa/setup", post(mfa_setup_handler))
        .route("/mfa/enroll", post(mfa_enroll_handler));

    // User management routes (RBAC feature) - requires authentication
    #[cfg(feature = "rbac")]
    let user_routes = Router::new()
        .route("/", post(users::create_user).get(users::list_users))
        .route("/{id}", get(users::get_user).put(users::update_user))
        .route("/{id}/activate", post(users::activate_user))
        .route("/{id}/deactivate", post(users::deactivate_user))
        .route("/{id}/role", post(users::assign_role))
        .route("/{id}/reset-password", post(users::reset_password))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Combine all v1 routes
    let mut router = Router::new()
        .nest("/auth", auth_routes);

    #[cfg(feature = "rbac")]
    {
        router = router.nest("/users", user_routes);
    }

    router
        // Future routes can be added here:
        // .nest("/patients", patient_routes)
        // .nest("/appointments", appointment_routes)
        // .nest("/visits", visit_routes)
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{DatabaseConfig, JwtConfig, SecurityConfig};
    use crate::db::create_pool;
    use crate::services::AuthService;
    use std::time::Duration;

    async fn test_app_state() -> AppState {
        let db_config = DatabaseConfig {
            url: "postgres://test:test@localhost/test".to_string(),
            max_connections: 5,
            min_connections: 1,
            acquire_timeout: Duration::from_secs(5),
            idle_timeout: Duration::from_secs(60),
            max_lifetime: Duration::from_secs(300),
        };

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

        // Note: This will fail if database is not available
        // In a real test, you'd use a test database or mock
        let pool = create_pool(&db_config).await.unwrap_or_else(|_| {
            panic!("Test database not available")
        });

        // Initialize Casbin enforcer for RBAC testing
        #[cfg(feature = "rbac")]
        let enforcer = {
            use crate::middleware::authorization::CasbinEnforcer;
            CasbinEnforcer::new("casbin/model.conf", "casbin/policy.csv")
                .await
                .expect("Failed to initialize Casbin enforcer for test")
        };

        AppState {
            pool,
            auth_service: AuthService::new(jwt_config, security_config.clone()),
            session_manager: crate::middleware::session_timeout::SessionManager::new(security_config.session_timeout),
            #[cfg(feature = "rbac")]
            enforcer,
        }
    }

    #[tokio::test]
    #[ignore] // Requires database
    async fn test_create_api_v1_routes() {
        let state = test_app_state().await;
        let _router = create_api_v1_routes(state);
        // Router created successfully
    }
}
