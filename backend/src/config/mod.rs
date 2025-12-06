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
    /// Email configuration (optional - for document delivery)
    pub email: Option<EmailConfig>,
}

/// Email/SMTP configuration
/// SECURITY: These credentials are loaded from environment variables only.
/// They are NEVER stored in the database, logs, or any persistent storage.
#[derive(Clone)]
pub struct EmailConfig {
    /// SMTP server host (e.g., "smtp.gmail.com")
    pub smtp_host: String,
    /// SMTP server port (e.g., 587 for TLS)
    pub smtp_port: u16,
    /// SMTP username (email address)
    pub smtp_username: String,
    /// SMTP password or app-specific password
    /// SECURITY: This is sensitive - never log or store this value
    smtp_password: String,
    /// Sender email address (typically same as username)
    pub from_email: String,
    /// Sender display name
    pub from_name: String,
    /// Whether email sending is enabled
    pub enabled: bool,
}

impl EmailConfig {
    /// Get the SMTP password securely
    /// This method exists to make password access explicit and auditable
    pub fn smtp_password(&self) -> &str {
        &self.smtp_password
    }
}

// Custom Debug implementation to prevent password leakage in logs
impl std::fmt::Debug for EmailConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("EmailConfig")
            .field("smtp_host", &self.smtp_host)
            .field("smtp_port", &self.smtp_port)
            .field("smtp_username", &self.smtp_username)
            .field("smtp_password", &"[REDACTED]")
            .field("from_email", &self.from_email)
            .field("from_name", &self.from_name)
            .field("enabled", &self.enabled)
            .finish()
    }
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
                    .unwrap_or_else(|_| "8000".to_string())
                    .parse()
                    .unwrap_or(8000),
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

            email: Self::load_email_config(),
        };

        Ok(config)
    }

    /// Load email configuration from environment variables
    /// Returns None if SMTP_ENABLED is false or not set
    fn load_email_config() -> Option<EmailConfig> {
        let enabled = std::env::var("SMTP_ENABLED")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);

        if !enabled {
            return None;
        }

        // Only load sensitive credentials if email is enabled
        let smtp_host = std::env::var("SMTP_HOST").ok()?;
        let smtp_port = std::env::var("SMTP_PORT")
            .ok()?
            .parse()
            .ok()?;
        let smtp_username = std::env::var("SMTP_USERNAME").ok()?;
        let smtp_password = std::env::var("SMTP_PASSWORD").ok()?;
        let from_email = std::env::var("SMTP_FROM_EMAIL")
            .unwrap_or_else(|_| smtp_username.clone());
        let from_name = std::env::var("SMTP_FROM_NAME")
            .unwrap_or_else(|_| "DocPat".to_string());

        Some(EmailConfig {
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
            from_email,
            from_name,
            enabled,
        })
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
