/*!
 * CORS (Cross-Origin Resource Sharing) Configuration
 *
 * Configures CORS headers to allow the React frontend to communicate
 * with the Rust backend API. Provides different configurations for
 * development and production environments.
 *
 * Security Considerations:
 * - Development: Permissive settings for localhost development
 * - Production: Strict origin validation and credential handling
 * - Supports preflight requests (OPTIONS method)
 * - Configurable allowed methods, headers, and exposed headers
 */

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    HeaderName, HeaderValue, Method,
};
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};

/// CORS configuration builder
pub struct CorsConfig {
    /// Allowed origins (defaults to localhost for development)
    pub allowed_origins: Vec<String>,
    /// Allow credentials (cookies, authorization headers)
    pub allow_credentials: bool,
    /// Maximum age for preflight cache (in seconds)
    pub max_age: Duration,
}

impl Default for CorsConfig {
    fn default() -> Self {
        Self {
            // Default to development origins
            allowed_origins: vec![
                "http://localhost:5173".to_string(), // Vite dev server
                "http://localhost:3000".to_string(), // Alternative React dev server
                "http://127.0.0.1:5173".to_string(),
                "http://127.0.0.1:3000".to_string(),
            ],
            allow_credentials: true,
            max_age: Duration::from_secs(3600), // 1 hour
        }
    }
}

impl CorsConfig {
    /// Create a new CORS configuration for development
    ///
    /// Development mode is permissive to allow rapid iteration:
    /// - Allows multiple localhost origins
    /// - Allows credentials
    /// - Longer preflight cache
    pub fn development() -> Self {
        Self::default()
    }

    /// Create a new CORS configuration for production
    ///
    /// Production mode is strict for security:
    /// - Only allows specified production origins
    /// - Requires explicit origin configuration
    /// - Shorter preflight cache
    pub fn production(allowed_origins: Vec<String>) -> Self {
        Self {
            allowed_origins,
            allow_credentials: true,
            max_age: Duration::from_secs(600), // 10 minutes
        }
    }

    /// Build the CORS layer for Axum
    ///
    /// Creates a tower-http CorsLayer configured according to the settings.
    /// This layer should be added to the Axum router.
    pub fn into_layer(self) -> CorsLayer {
        // Parse origins into HeaderValues
        let origins: Vec<HeaderValue> = self
            .allowed_origins
            .iter()
            .filter_map(|origin| origin.parse().ok())
            .collect();

        let cors = CorsLayer::new()
            // Allow specific HTTP methods
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::DELETE,
                Method::PATCH,
                Method::OPTIONS,
            ])
            // Allow specific headers
            .allow_headers([
                ACCEPT,
                AUTHORIZATION,
                CONTENT_TYPE,
                // Custom headers for our API
                HeaderName::from_static("x-request-id"),
                HeaderName::from_static("x-api-key"),
            ])
            // Expose specific headers to the frontend
            .expose_headers([
                HeaderName::from_static("x-request-id"),
                HeaderName::from_static("x-ratelimit-limit"),
                HeaderName::from_static("x-ratelimit-remaining"),
                HeaderName::from_static("x-ratelimit-reset"),
            ])
            // Set max age for preflight cache
            .max_age(self.max_age);

        // Configure origins
        let cors = if origins.is_empty() {
            // If no origins specified, allow any (development fallback)
            cors.allow_origin(Any)
        } else {
            // Use specific origins (production)
            cors.allow_origin(origins)
        };

        // Configure credentials
        if self.allow_credentials {
            cors.allow_credentials(true)
        } else {
            cors
        }
    }
}

/// Helper function to create a development CORS layer
///
/// Quick helper for setting up CORS in development mode.
/// Use this in your application setup:
///
/// ```rust,ignore
/// let app = Router::new()
///     .route("/api/health", get(health_check))
///     .layer(cors_development());
/// ```
pub fn cors_development() -> CorsLayer {
    CorsConfig::development().into_layer()
}

/// Helper function to create a production CORS layer
///
/// Requires explicit origin configuration for security.
/// Use this in your application setup:
///
/// ```rust,ignore
/// let origins = vec![
///     "https://app.example.com".to_string(),
///     "https://www.example.com".to_string(),
/// ];
/// let app = Router::new()
///     .route("/api/health", get(health_check))
///     .layer(cors_production(origins));
/// ```
pub fn cors_production(allowed_origins: Vec<String>) -> CorsLayer {
    CorsConfig::production(allowed_origins).into_layer()
}

/// Helper function to create CORS layer from environment variable
///
/// Reads allowed origins from the CORS_ALLOWED_ORIGINS environment variable.
/// The variable should contain a comma-separated list of origins:
///
/// ```bash
/// CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
/// ```
///
/// Falls back to development configuration if not set.
pub fn cors_from_env() -> CorsLayer {
    match std::env::var("CORS_ALLOWED_ORIGINS") {
        Ok(origins_str) => {
            let origins: Vec<String> = origins_str
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();

            if origins.is_empty() {
                // Fallback to development if empty
                cors_development()
            } else {
                cors_production(origins)
            }
        }
        Err(_) => {
            // Environment variable not set, use development defaults
            cors_development()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cors_config_default() {
        let config = CorsConfig::default();

        assert!(!config.allowed_origins.is_empty());
        assert!(config.allow_credentials);
        assert_eq!(config.max_age, Duration::from_secs(3600));
    }

    #[test]
    fn test_cors_config_development() {
        let config = CorsConfig::development();

        // Should include localhost origins
        assert!(config.allowed_origins.iter().any(|o| o.contains("localhost")));
        assert!(config.allow_credentials);
    }

    #[test]
    fn test_cors_config_production() {
        let origins = vec![
            "https://app.example.com".to_string(),
            "https://api.example.com".to_string(),
        ];
        let config = CorsConfig::production(origins.clone());

        assert_eq!(config.allowed_origins, origins);
        assert!(config.allow_credentials);
        assert_eq!(config.max_age, Duration::from_secs(600));
    }

    #[test]
    fn test_cors_config_into_layer() {
        let config = CorsConfig::development();
        let _layer = config.into_layer();
        // If this compiles and doesn't panic, the layer is valid
    }

    #[test]
    fn test_cors_development_helper() {
        let _layer = cors_development();
        // If this compiles and doesn't panic, the layer is valid
    }

    #[test]
    fn test_cors_production_helper() {
        let origins = vec!["https://app.example.com".to_string()];
        let _layer = cors_production(origins);
        // If this compiles and doesn't panic, the layer is valid
    }

    #[test]
    fn test_cors_from_env_fallback() {
        // Without setting environment variable, should fall back to development
        std::env::remove_var("CORS_ALLOWED_ORIGINS");
        let _layer = cors_from_env();
        // If this compiles and doesn't panic, the layer is valid
    }

    #[test]
    fn test_cors_from_env_with_origins() {
        // Set environment variable
        std::env::set_var("CORS_ALLOWED_ORIGINS", "https://app.example.com,https://api.example.com");
        let _layer = cors_from_env();
        // Clean up
        std::env::remove_var("CORS_ALLOWED_ORIGINS");
        // If this compiles and doesn't panic, the layer is valid
    }

    #[test]
    fn test_cors_from_env_empty_string() {
        // Set empty environment variable, should fall back to development
        std::env::set_var("CORS_ALLOWED_ORIGINS", "");
        let _layer = cors_from_env();
        // Clean up
        std::env::remove_var("CORS_ALLOWED_ORIGINS");
        // If this compiles and doesn't panic, the layer is valid
    }
}
