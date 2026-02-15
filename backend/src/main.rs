/*!
 * DocPat Backend - Medical Practice Management System
 *
 * Main application entry point for the Axum-based REST API server.
 *
 * This is a HIPAA-compliant medical records management system designed
 * for single-practitioner use with enterprise-grade security.
 */

// Module declarations
mod config;
mod db;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;
mod utils;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use axum_server::tls_rustls::RustlsConfig;
use serde::{Deserialize, Serialize};
use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use db::create_pool;
use handlers::auth::AppState;
use middleware::cors::cors_from_env;
use middleware::session_timeout::SessionManager;
use routes::create_api_v1_routes;
use services::{AuthService, EmailService, NotificationService, SettingsService, spawn_notification_scheduler};
use std::sync::Arc;
use utils::EncryptionKey;

#[cfg(feature = "rbac")]
use middleware::authorization::CasbinEnforcer;

/// Health check response
#[derive(Debug, Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    version: String,
    uptime_seconds: u64,
    timestamp: String,
    database: String,
}

/// API version info response
#[derive(Debug, Serialize, Deserialize)]
struct VersionResponse {
    name: String,
    version: String,
    rust_version: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Install rustls crypto provider (required for rustls 0.23+)
    // Using aws-lc-rs as recommended by rustls for performance and FIPS support
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    // Check for health check CLI flag
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "--health-check" {
        return perform_health_check().await;
    }

    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug,axum::rejection=trace,sqlx=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting DocPat Backend API Server...");
    tracing::info!("Version: {}", env!("CARGO_PKG_VERSION"));
    tracing::info!("Rust version: {}", env!("CARGO_PKG_RUST_VERSION"));

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Configuration loaded successfully");
    tracing::info!("Environment: {}", config.server.environment);

    // Warn if debug/trace logging is enabled in production
    let log_level = std::env::var("RUST_LOG").unwrap_or_default();
    if config.server.environment == "production"
        && (log_level.contains("debug") || log_level.contains("trace"))
    {
        tracing::warn!(
            "RUST_LOG={} in production environment — consider setting to 'info' or 'warn' \
             to avoid exposing sensitive data in logs",
            log_level
        );
    }

    // Create database connection pool
    let pool = create_pool(&config.database).await?;
    tracing::info!("Database connection pool created successfully");

    // Create authentication service
    let auth_service = AuthService::new(config.jwt.clone(), config.security.clone());
    tracing::info!("Authentication service initialized");

    // Create session manager
    let session_manager = SessionManager::new(config.security.session_timeout);
    tracing::info!(
        "Session manager initialized with {} second timeout",
        config.security.session_timeout
    );

    // Initialize Casbin enforcer for RBAC (if rbac feature is enabled)
    #[cfg(feature = "rbac")]
    let enforcer = {
        let model_path = "casbin/model.conf";
        let policy_path = "casbin/policy.csv";

        match CasbinEnforcer::new(model_path, policy_path).await {
            Ok(enforcer) => {
                tracing::info!("Casbin RBAC enforcer initialized successfully");
                enforcer
            }
            Err(e) => {
                tracing::error!("Failed to initialize Casbin enforcer: {}", e);
                return Err(anyhow::anyhow!("Casbin initialization failed: {}", e));
            }
        }
    };

    // Initialize encryption key for PHI/PII data
    let encryption_key = match EncryptionKey::from_env() {
        Ok(key) => {
            tracing::info!("Encryption key loaded successfully from environment");
            Some(key)
        }
        Err(e) => {
            tracing::warn!(
                "Encryption key not configured or invalid: {}. Patient management features will be disabled.",
                e
            );
            None
        }
    };

    // Initialize email service (optional - for document delivery)
    let email_service = match EmailService::new(config.email.as_ref()) {
        Ok(service) => {
            if service.is_enabled() {
                tracing::info!("Email service initialized and enabled");
                Some(service)
            } else {
                tracing::info!("Email service disabled - SMTP not configured");
                None
            }
        }
        Err(e) => {
            tracing::warn!("Failed to initialize email service: {}. Document email delivery will be unavailable.", e);
            None
        }
    };

    // Record server start time
    let start_time = std::time::SystemTime::now();

    // Create settings service (shared singleton with cache)
    let settings_service = Arc::new(SettingsService::new(pool.clone()));

    // Create application state
    let app_state = AppState {
        pool: pool.clone(),
        auth_service,
        session_manager,
        encryption_key,
        email_service,
        settings_service,
        start_time,
        environment: config.server.environment.clone(),
        #[cfg(feature = "rbac")]
        enforcer,
    };

    // Spawn notification scheduler background task (if email and encryption are enabled)
    if let (Some(ref email_svc), Some(ref enc_key)) = (&app_state.email_service, &app_state.encryption_key) {
        let notification_service = NotificationService::new(pool.clone(), email_svc.clone());
        spawn_notification_scheduler(
            pool.clone(),
            notification_service,
            app_state.settings_service.clone(),
            enc_key.clone(),
        );
        tracing::info!("Notification scheduler started");
    } else if app_state.email_service.is_none() {
        tracing::info!("Notification scheduler not started - email service not configured");
    } else {
        tracing::info!("Notification scheduler not started - encryption key not configured");
    }

    // Build application router
    let app = create_app(app_state, start_time);

    // Start the server (HTTP or HTTPS based on TLS configuration)
    let addr: SocketAddr = format!("{}:{}", config.server.host, config.server.port)
        .parse()
        .expect("Invalid server address");

    if config.tls.is_ready() {
        // Start HTTPS server with TLS
        let cert_path = PathBuf::from(config.tls.cert_path_required());
        let key_path = PathBuf::from(config.tls.key_path_required());

        tracing::info!("TLS enabled - loading certificates...");
        tracing::info!("  Certificate: {}", cert_path.display());
        tracing::info!("  Private key: {}", key_path.display());

        let tls_config = RustlsConfig::from_pem_file(&cert_path, &key_path)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to load TLS certificates: {}", e))?;

        tracing::info!("HTTPS server listening on https://{}", addr);

        axum_server::bind_rustls(addr, tls_config)
            .serve(app.into_make_service_with_connect_info::<SocketAddr>())
            .await?;
    } else {
        // Start HTTP server (development mode or TLS not configured)
        if config.tls.enabled {
            tracing::warn!(
                "TLS is enabled but certificate paths are not configured. Starting HTTP server instead."
            );
        }
        tracing::info!("HTTP server listening on http://{}", addr);

        let listener = TcpListener::bind(addr).await?;
        axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await?;
    }

    Ok(())
}

/// Create the Axum application router
///
/// # Arguments
///
/// * `state` - Application state containing database pool and services
/// * `start_time` - Server start timestamp for uptime calculation
fn create_app(state: AppState, start_time: std::time::SystemTime) -> Router {
    // Clone pool for health check handlers
    let pool_for_health1 = state.pool.clone();
    let pool_for_health2 = state.pool.clone();

    Router::new()
        // Health check endpoints
        .route(
            "/health",
            get(move || health_handler(pool_for_health1.clone(), start_time)),
        )
        .route(
            "/api/health",
            get(move || health_handler(pool_for_health2.clone(), start_time)),
        )
        // API version endpoint
        .route("/api/version", get(version_handler))
        // Root endpoint
        .route("/", get(root_handler))
        // API v1 routes
        .nest("/api/v1", create_api_v1_routes(state))
        // Add middleware (CORS must be added before other middleware)
        .layer(cors_from_env())
        .layer(TraceLayer::new_for_http())
}

/// Root handler - API information
async fn root_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "name": "DocPat Backend API",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "Medical Practice Management System",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "api_v1": "/api/v1",
            "auth": "/api/v1/auth"
        }
    }))
}

/// Health check handler
async fn health_handler(
    pool: sqlx::PgPool,
    start_time: std::time::SystemTime,
) -> impl IntoResponse {
    let uptime = start_time.elapsed().unwrap_or_default().as_secs();

    // Test database connection
    let db_status = match sqlx::query("SELECT 1").execute(&pool).await {
        Ok(_) => "connected",
        Err(e) => {
            tracing::error!("Database health check failed: {:?}", e);
            "disconnected"
        }
    };

    let response = HealthResponse {
        status: if db_status == "connected" {
            "healthy"
        } else {
            "unhealthy"
        }
        .to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: uptime,
        timestamp: chrono::Utc::now().to_rfc3339(),
        database: db_status.to_string(),
    };

    let status_code = if db_status == "connected" {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (status_code, Json(response))
}

/// Version info handler
async fn version_handler() -> impl IntoResponse {
    let response = VersionResponse {
        name: env!("CARGO_PKG_NAME").to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        rust_version: env!("CARGO_PKG_RUST_VERSION").to_string(),
    };

    Json(response)
}

/// Perform health check for Docker healthcheck
///
/// Checks both HTTP and HTTPS endpoints based on TLS_ENABLED setting.
async fn perform_health_check() -> anyhow::Result<()> {
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8000".to_string());
    let tls_enabled = env::var("TLS_ENABLED")
        .unwrap_or_else(|_| "false".to_string())
        .parse::<bool>()
        .unwrap_or(false);

    let scheme = if tls_enabled { "https" } else { "http" };
    let url = format!("{}://127.0.0.1:{}/health", scheme, port);

    // Build HTTP client - for HTTPS health checks in dev, we need to accept self-signed certs
    let client = if tls_enabled {
        reqwest::Client::builder()
            .danger_accept_invalid_certs(true) // Accept self-signed certs for health check
            .build()
            .unwrap_or_default()
    } else {
        reqwest::Client::new()
    };

    match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => {
            println!("Health check passed ({})", scheme.to_uppercase());
            std::process::exit(0);
        }
        Ok(response) => {
            eprintln!("Health check failed with status: {}", response.status());
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("Health check failed: {}", e);
            std::process::exit(1);
        }
    }
}

// Unit tests removed - use integration tests in tests/ directory instead
// These endpoints require database connection and are better tested as integration tests
