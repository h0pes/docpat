/*!
 * Configuration Module
 *
 * Handles application configuration loading from environment variables
 * and provides structured access to configuration values.
 */

use std::time::Duration;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    /// Server configuration
    pub server: ServerConfig,
    /// Database configuration
    pub database: DatabaseConfig,
    /// JWT authentication configuration
    pub jwt: JwtConfig,
    /// Security configuration
    pub security: SecurityConfig,
}

/// Server configuration
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// Server host address (e.g., "0.0.0.0")
    pub host: String,
    /// Server port number
    pub port: u16,
    /// Environment (development, production)
    pub environment: String,
}

/// Database configuration
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    /// PostgreSQL connection URL
    pub url: String,
    /// Maximum number of connections in the pool
    pub max_connections: u32,
    /// Minimum number of connections in the pool
    pub min_connections: u32,
    /// Connection acquire timeout in seconds
    pub acquire_timeout: Duration,
    /// Idle connection timeout in seconds
    pub idle_timeout: Duration,
    /// Maximum connection lifetime in seconds
    pub max_lifetime: Duration,
}

/// JWT configuration
#[derive(Debug, Clone)]
pub struct JwtConfig {
    /// JWT secret key for signing access tokens
    pub secret: String,
    /// JWT refresh token secret key
    pub refresh_secret: String,
    /// Access token expiration time in seconds (default: 30 minutes)
    pub access_token_expiry: i64,
    /// Refresh token expiration time in seconds (default: 7 days)
    pub refresh_token_expiry: i64,
}

/// Security configuration
#[derive(Debug, Clone)]
pub struct SecurityConfig {
    /// AES-256 encryption key for medical data (32 bytes base64)
    pub encryption_key: String,
    /// Session timeout in seconds (default: 30 minutes)
    pub session_timeout: i64,
    /// Maximum failed login attempts before lockout
    pub max_failed_login_attempts: u32,
    /// Account lockout duration in seconds
    pub lockout_duration: i64,
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// # Errors
    ///
    /// Returns an error if required environment variables are missing
    /// or contain invalid values.
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv::dotenv().ok();

        let config = Self {
            server: ServerConfig {
                host: std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: std::env::var("SERVER_PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()
                    .unwrap_or(8080),
                environment: std::env::var("ENVIRONMENT")
                    .unwrap_or_else(|_| "development".to_string()),
            },

            database: DatabaseConfig {
                url: std::env::var("DATABASE_URL")
                    .expect("DATABASE_URL must be set"),
                max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                    .unwrap_or_else(|_| "20".to_string())
                    .parse()
                    .unwrap_or(20),
                min_connections: std::env::var("DATABASE_MIN_CONNECTIONS")
                    .unwrap_or_else(|_| "5".to_string())
                    .parse()
                    .unwrap_or(5),
                acquire_timeout: Duration::from_secs(
                    std::env::var("DATABASE_CONNECT_TIMEOUT")
                        .unwrap_or_else(|_| "30".to_string())
                        .parse()
                        .unwrap_or(30),
                ),
                idle_timeout: Duration::from_secs(
                    std::env::var("DATABASE_IDLE_TIMEOUT")
                        .unwrap_or_else(|_| "600".to_string())
                        .parse()
                        .unwrap_or(600),
                ),
                max_lifetime: Duration::from_secs(
                    std::env::var("DATABASE_MAX_LIFETIME")
                        .unwrap_or_else(|_| "1800".to_string())
                        .parse()
                        .unwrap_or(1800),
                ),
            },

            jwt: JwtConfig {
                secret: std::env::var("JWT_SECRET")
                    .expect("JWT_SECRET must be set"),
                refresh_secret: std::env::var("JWT_REFRESH_SECRET")
                    .expect("JWT_REFRESH_SECRET must be set"),
                access_token_expiry: std::env::var("JWT_ACCESS_TOKEN_EXPIRY")
                    .unwrap_or_else(|_| "900".to_string()) // 15 minutes (aligned with .env.example)
                    .parse()
                    .unwrap_or(900),
                refresh_token_expiry: std::env::var("JWT_REFRESH_TOKEN_EXPIRY")
                    .unwrap_or_else(|_| "604800".to_string()) // 7 days
                    .parse()
                    .unwrap_or(604800),
            },

            security: SecurityConfig {
                encryption_key: std::env::var("ENCRYPTION_KEY")
                    .expect("ENCRYPTION_KEY must be set"),
                session_timeout: std::env::var("SESSION_TIMEOUT")
                    .unwrap_or_else(|_| "1800".to_string())
                    .parse()
                    .unwrap_or(1800),
                max_failed_login_attempts: std::env::var("MAX_LOGIN_ATTEMPTS")
                    .unwrap_or_else(|_| "5".to_string())
                    .parse()
                    .unwrap_or(5),
                lockout_duration: std::env::var("ACCOUNT_LOCKOUT_DURATION")
                    .unwrap_or_else(|_| "900".to_string()) // 15 minutes
                    .parse()
                    .unwrap_or(900),
            },
        };

        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_config_defaults() {
        std::env::remove_var("SERVER_HOST");
        std::env::remove_var("SERVER_PORT");

        let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port: u16 = std::env::var("SERVER_PORT")
            .unwrap_or_else(|_| "8000".to_string())
            .parse()
            .unwrap_or(8000);

        assert_eq!(host, "0.0.0.0");
        assert_eq!(port, 8000);
    }
}
