/*!
 * Authentication Service
 *
 * Handles user authentication, login, logout, and token refresh operations.
 * Implements security features like account lockout after failed attempts.
 */

use sqlx::PgPool;
use uuid::Uuid;

use crate::config::{JwtConfig, SecurityConfig};
use crate::models::{User, UserDto};
use crate::services::{JwtService, TokenPair};
use crate::utils::{AppError, PasswordHasherUtil, Result};

/// Login request data
#[derive(Debug, serde::Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    pub mfa_code: Option<String>,
}

/// Login response data
#[derive(Debug, serde::Serialize)]
pub struct LoginResponse {
    pub user: UserDto,
    pub tokens: TokenPair,
}

/// Authentication service
#[derive(Clone)]
pub struct AuthService {
    jwt_service: JwtService,
    security_config: SecurityConfig,
}

impl AuthService {
    /// Create a new authentication service
    ///
    /// # Arguments
    ///
    /// * `jwt_config` - JWT configuration
    /// * `security_config` - Security configuration
    pub fn new(jwt_config: JwtConfig, security_config: SecurityConfig) -> Self {
        Self {
            jwt_service: JwtService::new(jwt_config),
            security_config,
        }
    }

    /// Generate JWT access and refresh tokens
    ///
    /// # Arguments
    ///
    /// * `user_id` - User UUID
    /// * `role` - User role
    ///
    /// # Returns
    ///
    /// Token pair with access and refresh tokens
    pub fn generate_tokens(&self, user_id: &Uuid, role: &crate::models::UserRole) -> Result<TokenPair> {
        self.jwt_service.generate_tokens(user_id, role)
    }

    /// Authenticate a user with username and password
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `login_req` - Login request containing credentials
    ///
    /// # Returns
    ///
    /// Login response with user data and JWT tokens
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - User not found
    /// - Invalid password
    /// - Account is locked
    /// - Account is inactive
    /// - MFA is enabled but code is missing or invalid
    pub async fn login(&self, pool: &PgPool, login_req: LoginRequest) -> Result<LoginResponse> {
        // Find user by username
        let user = User::find_by_username(pool, &login_req.username).await?;

        // Check if account is active
        if !user.is_active {
            return Err(AppError::Forbidden(
                "Account is inactive. Please contact administrator.".to_string(),
            ));
        }

        // Check if account is locked
        if user.is_locked() {
            return Err(AppError::Forbidden(format!(
                "Account is locked due to too many failed login attempts. Please try again later."
            )));
        }

        // Verify password
        if !PasswordHasherUtil::verify_password(&login_req.password, &user.password_hash) {
            // Increment failed login attempts
            user.increment_failed_login(
                pool,
                self.security_config.max_failed_login_attempts,
                self.security_config.lockout_duration,
            )
            .await?;

            return Err(AppError::Unauthorized(
                "Invalid username or password".to_string(),
            ));
        }

        // Check MFA if enabled
        if user.has_mfa_enabled() {
            let mfa_code = login_req
                .mfa_code
                .ok_or_else(|| AppError::Unauthorized("MFA code required".to_string()))?;

            // Try to verify MFA code (TOTP or backup code)
            self.verify_mfa_code_or_backup(pool, &user, &mfa_code).await?;
        }

        // Update last login timestamp and clear failed attempts
        user.update_last_login(pool).await?;

        // Generate JWT tokens
        let tokens = self.jwt_service.generate_tokens(&user.id, &user.role)?;

        // Create response
        let response = LoginResponse {
            user: user.into(),
            tokens,
        };

        tracing::info!("User {} logged in successfully", login_req.username);

        Ok(response)
    }

    /// Refresh access token using a valid refresh token
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `refresh_token` - Valid refresh token
    ///
    /// # Returns
    ///
    /// New token pair
    ///
    /// # Errors
    ///
    /// Returns an error if the refresh token is invalid or user is inactive/locked
    pub async fn refresh_token(&self, pool: &PgPool, refresh_token: &str) -> Result<TokenPair> {
        // Validate refresh token
        let claims = self.jwt_service.validate_refresh_token(refresh_token)?;

        // Parse user ID from claims
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

        // Verify user still exists and is active
        let user = User::find_by_id(pool, &user_id).await?;

        if !user.is_active {
            return Err(AppError::Forbidden("Account is inactive".to_string()));
        }

        if user.is_locked() {
            return Err(AppError::Forbidden("Account is locked".to_string()));
        }

        // Generate new token pair
        let tokens = self.jwt_service.refresh_access_token(refresh_token)?;

        tracing::info!("Access token refreshed for user {}", user.id);

        Ok(tokens)
    }

    /// Verify MFA TOTP code
    ///
    /// # Arguments
    ///
    /// * `user` - User with MFA enabled
    /// * `code` - 6-digit TOTP code
    ///
    /// # Errors
    ///
    /// Returns Unauthorized error if code is invalid
    fn verify_mfa_code(&self, user: &User, code: &str) -> Result<()> {
        use totp_rs::{Algorithm, Secret, TOTP};

        let mfa_secret = user
            .mfa_secret
            .as_ref()
            .ok_or_else(|| AppError::Internal("MFA secret not found".to_string()))?;

        // Create TOTP instance
        // The secret is stored as a Base32-encoded string, so we need to decode it
        let secret = Secret::Encoded(mfa_secret.clone())
            .to_bytes()
            .map_err(|e| {
                tracing::error!("Failed to parse MFA secret: {:?}", e);
                AppError::Internal("Invalid MFA configuration".to_string())
            })?;

        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret,
            Some("DocPat Medical".to_string()),
            user.username.clone(),
        )
        .map_err(|e| {
            tracing::error!("Failed to create TOTP: {:?}", e);
            AppError::Internal("Invalid MFA configuration".to_string())
        })?;

        // Verify code
        let is_valid = totp.check_current(code).map_err(|e| {
            tracing::warn!("MFA verification failed for user {}: {:?}", user.id, e);
            AppError::Unauthorized("Invalid MFA code".to_string())
        })?;

        if !is_valid {
            return Err(AppError::Unauthorized("Invalid MFA code".to_string()));
        }

        Ok(())
    }

    /// Verify MFA code or backup code
    ///
    /// Tries TOTP first, then backup codes if TOTP fails
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `user` - User with MFA enabled
    /// * `code` - Either a 6-digit TOTP code or 8-character backup code
    ///
    /// # Errors
    ///
    /// Returns Unauthorized error if neither TOTP nor backup code is valid
    async fn verify_mfa_code_or_backup(&self, pool: &PgPool, user: &User, code: &str) -> Result<()> {
        // First, try TOTP verification
        if self.verify_mfa_code(user, code).is_ok() {
            tracing::info!("User {} authenticated with TOTP code", user.id);
            return Ok(());
        }

        // If TOTP fails, try backup codes
        if let Some(backup_codes) = &user.backup_codes {
            for (index, hashed_code) in backup_codes.iter().enumerate() {
                if PasswordHasherUtil::verify_password(code, hashed_code) {
                    tracing::info!(
                        "User {} authenticated with backup code (index: {})",
                        user.id,
                        index
                    );

                    // Remove used backup code from database
                    let remaining_codes: Vec<String> = backup_codes
                        .iter()
                        .enumerate()
                        .filter(|(i, _)| *i != index)
                        .map(|(_, code)| code.clone())
                        .collect();

                    sqlx::query(
                        r#"
                        UPDATE users
                        SET backup_codes = $1, updated_at = NOW()
                        WHERE id = $2
                        "#,
                    )
                    .bind(&remaining_codes)
                    .bind(&user.id)
                    .execute(pool)
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to remove used backup code: {:?}", e);
                        // Don't fail the login, just log the error
                    })
                    .ok();

                    tracing::warn!(
                        "Backup code used. {} codes remaining for user {}",
                        remaining_codes.len(),
                        user.id
                    );

                    return Ok(());
                }
            }
        }

        // Neither TOTP nor backup code was valid
        Err(AppError::Unauthorized(
            "Invalid MFA code or backup code".to_string(),
        ))
    }

    /// Validate access token and extract claims
    ///
    /// # Arguments
    ///
    /// * `token` - JWT access token
    ///
    /// # Returns
    ///
    /// Claims if token is valid
    pub fn validate_token(&self, token: &str) -> Result<crate::services::Claims> {
        self.jwt_service.validate_access_token(token)
    }

    /// Validate refresh token and extract claims
    ///
    /// # Arguments
    ///
    /// * `token` - JWT refresh token
    ///
    /// # Returns
    ///
    /// Claims if token is valid
    pub fn validate_refresh_token_only(&self, token: &str) -> Result<crate::services::Claims> {
        self.jwt_service.validate_refresh_token(token)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{JwtConfig, SecurityConfig};
    use crate::models::UserRole;

    fn test_configs() -> (JwtConfig, SecurityConfig) {
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

        (jwt_config, security_config)
    }

    #[test]
    fn test_auth_service_creation() {
        let (jwt_config, security_config) = test_configs();
        let _auth_service = AuthService::new(jwt_config, security_config);
    }

    #[test]
    fn test_validate_token() {
        let (jwt_config, security_config) = test_configs();
        let auth_service = AuthService::new(jwt_config.clone(), security_config);
        let jwt_service = JwtService::new(jwt_config);

        let user_id = Uuid::new_v4();
        let role = UserRole::Doctor;
        let tokens = jwt_service.generate_tokens(&user_id, &role).unwrap();

        let claims = auth_service.validate_token(&tokens.access_token);
        assert!(claims.is_ok());
    }
}
