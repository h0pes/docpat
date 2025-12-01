/*!
 * API v1 Routes
 *
 * Defines all version 1 API routes and their handlers.
 */

use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};

use crate::handlers::auth::AppState;
use crate::handlers::{
    cancel_appointment, check_availability, create_appointment, create_diagnosis, create_patient,
    create_prescription, create_prescription_template, create_visit, create_visit_template,
    delete_diagnosis, delete_patient, delete_prescription, delete_prescription_template,
    delete_visit, delete_visit_template, discontinue_prescription, get_appointment,
    get_daily_schedule, get_diagnosis, get_monthly_schedule, get_patient,
    get_patient_diagnoses, get_patient_prescriptions, get_patient_statistics, get_patient_visits,
    get_prescription, get_prescription_template, get_visit, get_visit_diagnoses,
    get_visit_prescriptions, get_visit_statistics, get_visit_template, get_visit_version,
    get_weekly_schedule,
    list_appointments, list_patients, list_prescription_templates, list_visit_templates,
    list_visits, list_visit_versions, lock_visit, login_handler, logout_handler,
    mfa_enroll_handler, mfa_setup_handler, refresh_token_handler, restore_visit_version,
    search_icd10, search_medications, search_patients, sign_visit, update_appointment,
    update_diagnosis, update_patient, update_prescription, update_prescription_template,
    update_visit, update_visit_template,
};
use crate::middleware::auth::jwt_auth_middleware;

#[cfg(feature = "rbac")]
use crate::handlers::users;

#[cfg(feature = "pdf-export")]
use crate::handlers::documents;

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

    // Patient management routes - requires authentication
    let patient_routes = Router::new()
        .route("/", post(create_patient).get(list_patients))
        .route("/search", get(search_patients))
        .route("/statistics", get(get_patient_statistics))
        .route("/{id}", get(get_patient).put(update_patient).delete(delete_patient))
        .route("/{id}/visits", get(get_patient_visits))
        .route("/{id}/diagnoses", get(get_patient_diagnoses))
        .route("/{id}/prescriptions", get(get_patient_prescriptions))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Appointment management routes - requires authentication
    let appointment_routes = Router::new()
        .route("/", post(create_appointment).get(list_appointments))
        .route("/availability", get(check_availability))
        .route("/statistics", get(crate::handlers::appointments::get_statistics))
        .route("/schedule/daily", get(get_daily_schedule))
        .route("/schedule/weekly", get(get_weekly_schedule))
        .route("/schedule/monthly", get(get_monthly_schedule))
        .route("/{id}", get(get_appointment).put(update_appointment))
        .route("/{id}/cancel", post(cancel_appointment))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Visit management routes - requires authentication
    let visit_routes = Router::new()
        .route("/", post(create_visit).get(list_visits))
        .route("/statistics", get(get_visit_statistics))
        .route("/{id}", get(get_visit).put(update_visit).delete(delete_visit))
        .route("/{id}/sign", post(sign_visit))
        .route("/{id}/lock", post(lock_visit))
        .route("/{id}/diagnoses", get(get_visit_diagnoses))
        .route("/{id}/prescriptions", get(get_visit_prescriptions))
        .route("/{id}/versions", get(list_visit_versions))
        .route("/{id}/versions/{version_number}", get(get_visit_version))
        .route("/{id}/versions/{version_number}/restore", post(restore_visit_version))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Diagnosis management routes - requires authentication
    let diagnosis_routes = Router::new()
        .route("/", post(create_diagnosis))
        .route("/icd10/search", get(search_icd10))
        .route("/{id}", get(get_diagnosis).put(update_diagnosis).delete(delete_diagnosis))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Prescription management routes - requires authentication
    let prescription_routes = Router::new()
        .route("/", post(create_prescription))
        .route("/medications/search", get(search_medications))
        .route("/{id}", get(get_prescription).put(update_prescription).delete(delete_prescription))
        .route("/{id}/discontinue", post(discontinue_prescription))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Visit template routes - requires authentication
    let visit_template_routes = Router::new()
        .route("/", post(create_visit_template).get(list_visit_templates))
        .route("/{id}", get(get_visit_template).put(update_visit_template).delete(delete_visit_template))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Prescription template routes - requires authentication
    let prescription_template_routes = Router::new()
        .route("/", post(create_prescription_template).get(list_prescription_templates))
        .route("/{id}", get(get_prescription_template).put(update_prescription_template).delete(delete_prescription_template))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Document template routes (PDF export feature) - requires authentication
    #[cfg(feature = "pdf-export")]
    let document_template_routes = Router::new()
        .route("/", post(documents::create_document_template).get(documents::list_document_templates))
        .route("/default", get(documents::get_default_document_template))
        .route("/{id}", get(documents::get_document_template).put(documents::update_document_template).delete(documents::delete_document_template))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Generated document routes (PDF export feature) - requires authentication
    #[cfg(feature = "pdf-export")]
    let document_routes = Router::new()
        .route("/", get(documents::list_generated_documents))
        .route("/generate", post(documents::generate_document))
        .route("/statistics", get(documents::get_document_statistics))
        .route("/{id}", get(documents::get_generated_document).delete(documents::delete_generated_document))
        .route("/{id}/download", get(documents::download_document))
        .route("/{id}/sign", post(documents::sign_document))
        .route("/{id}/deliver", post(documents::deliver_document))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            jwt_auth_middleware,
        ));

    // Combine all v1 routes
    let mut router = Router::new()
        .nest("/auth", auth_routes)
        .nest("/patients", patient_routes)
        .nest("/appointments", appointment_routes)
        .nest("/visits", visit_routes)
        .nest("/diagnoses", diagnosis_routes)
        .nest("/prescriptions", prescription_routes)
        .nest("/visit-templates", visit_template_routes)
        .nest("/prescription-templates", prescription_template_routes);

    #[cfg(feature = "rbac")]
    {
        router = router.nest("/users", user_routes);
    }

    #[cfg(feature = "pdf-export")]
    {
        router = router
            .nest("/document-templates", document_template_routes)
            .nest("/documents", document_routes);
    }

    router.with_state(state)
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
            encryption_key: None, // Not needed for auth routes test
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
