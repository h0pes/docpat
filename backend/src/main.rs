/*!
 * DocPat Backend - Medical Practice Management System
 *
 * Main application entry point for the Axum-based REST API server.
 *
 * This is a HIPAA-compliant medical records management system designed
 * for single-practitioner use with enterprise-grade security.
 */

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::{env, net::SocketAddr};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Application state
#[derive(Clone)]
struct AppState {
    app_version: String,
    start_time: std::time::SystemTime,
}

/// Health check response
#[derive(Debug, Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    version: String,
    uptime_seconds: u64,
    timestamp: String,
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
    // Check for health check CLI flag
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "--health-check" {
        return perform_health_check().await;
    }

    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug,axum::rejection=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting DocPat Backend API Server...");
    tracing::info!("Version: {}", env!("CARGO_PKG_VERSION"));
    tracing::info!("Rust version: {}", env!("CARGO_PKG_RUST_VERSION"));

    // Create application state
    let state = AppState {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        start_time: std::time::SystemTime::now(),
    };

    // Build application router
    let app = create_app(state);

    // Get server configuration from environment
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse::<u16>()
        .unwrap_or(8000);

    let addr = format!("{}:{}", host, port);
    tracing::info!("Server listening on {}", addr);

    // Start the server
    let listener = TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Create the Axum application router
fn create_app(state: AppState) -> Router {
    Router::new()
        // Health check endpoints
        .route("/health", get(health_handler))
        .route("/api/health", get(health_handler))

        // API version endpoint
        .route("/api/version", get(version_handler))

        // Root endpoint
        .route("/", get(root_handler))

        // Add middleware
        .layer(TraceLayer::new_for_http())

        // Add shared state
        .with_state(state)
}

/// Root handler - API information
async fn root_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "name": "DocPat Backend API",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "Medical Practice Management System",
        "status": "operational"
    }))
}

/// Health check handler
async fn health_handler(State(state): State<AppState>) -> impl IntoResponse {
    let uptime = state
        .start_time
        .elapsed()
        .unwrap_or_default()
        .as_secs();

    let response = HealthResponse {
        status: "healthy".to_string(),
        version: state.app_version.clone(),
        uptime_seconds: uptime,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    (StatusCode::OK, Json(response))
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
async fn perform_health_check() -> anyhow::Result<()> {
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8000".to_string());
    let url = format!("http://127.0.0.1:{}/health", port);

    match reqwest::get(&url).await {
        Ok(response) if response.status().is_success() => {
            println!("Health check passed");
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_endpoint() {
        let state = AppState {
            app_version: "test".to_string(),
            start_time: std::time::SystemTime::now(),
        };
        let app = create_app(state);

        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_root_endpoint() {
        let state = AppState {
            app_version: "test".to_string(),
            start_time: std::time::SystemTime::now(),
        };
        let app = create_app(state);

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_version_endpoint() {
        let state = AppState {
            app_version: "test".to_string(),
            start_time: std::time::SystemTime::now(),
        };
        let app = create_app(state);

        let response = app
            .oneshot(Request::builder().uri("/api/version").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
