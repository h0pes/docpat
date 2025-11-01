/*!
 * JWT Service
 *
 * Handles JWT token generation, validation, and refresh token management.
 * Uses HS256 algorithm for signing tokens.
 */

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config::JwtConfig;
use crate::models::UserRole;
use crate::utils::{AppError, Result};

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: String,
    /// User role
    pub role: String,
    /// Issued at (Unix timestamp)
    pub iat: i64,
    /// Expiration time (Unix timestamp)
    pub exp: i64,
    /// Token type (access or refresh)
    pub token_type: String,
    /// JWT ID - unique identifier for this token
    pub jti: String,
}

/// Token pair containing access and refresh tokens
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenPair {
    /// Access token (short-lived)
    pub access_token: String,
    /// Refresh token (long-lived)
    pub refresh_token: String,
    /// Access token expiration time in seconds
    pub expires_in: i64,
}

/// JWT service for token operations
#[derive(Clone)]
pub struct JwtService {
    config: JwtConfig,
}

impl JwtService {
    /// Create a new JWT service instance
    ///
    /// # Arguments
    ///
    /// * `config` - JWT configuration
    pub fn new(config: JwtConfig) -> Self {
        Self { config }
    }

    /// Generate access and refresh tokens for a user
    ///
    /// # Arguments
    ///
    /// * `user_id` - User UUID
    /// * `role` - User role
    ///
    /// # Returns
    ///
    /// A token pair containing both access and refresh tokens
    ///
    /// # Errors
    ///
    /// Returns an error if token generation fails
    pub fn generate_tokens(&self, user_id: &Uuid, role: &UserRole) -> Result<TokenPair> {
        let access_token = self.generate_access_token(user_id, role)?;
        let refresh_token = self.generate_refresh_token(user_id, role)?;

        Ok(TokenPair {
            access_token,
            refresh_token,
            expires_in: self.config.access_token_expiry,
        })
    }

    /// Generate an access token
    ///
    /// # Arguments
    ///
    /// * `user_id` - User UUID
    /// * `role` - User role
    ///
    /// # Returns
    ///
    /// JWT access token string
    fn generate_access_token(&self, user_id: &Uuid, role: &UserRole) -> Result<String> {
        let now = Utc::now();
        let expiry = now + Duration::seconds(self.config.access_token_expiry);

        let claims = Claims {
            sub: user_id.to_string(),
            role: role.to_string(),
            iat: now.timestamp(),
            exp: expiry.timestamp(),
            token_type: "access".to_string(),
            jti: Uuid::new_v4().to_string(), // Unique token identifier
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.secret.as_bytes()),
        )?;

        Ok(token)
    }

    /// Generate a refresh token
    ///
    /// # Arguments
    ///
    /// * `user_id` - User UUID
    /// * `role` - User role
    ///
    /// # Returns
    ///
    /// JWT refresh token string
    fn generate_refresh_token(&self, user_id: &Uuid, role: &UserRole) -> Result<String> {
        let now = Utc::now();
        let expiry = now + Duration::seconds(self.config.refresh_token_expiry);

        let claims = Claims {
            sub: user_id.to_string(),
            role: role.to_string(),
            iat: now.timestamp(),
            exp: expiry.timestamp(),
            token_type: "refresh".to_string(),
            jti: Uuid::new_v4().to_string(), // Unique token identifier
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.refresh_secret.as_bytes()),
        )?;

        Ok(token)
    }

    /// Validate and decode an access token
    ///
    /// # Arguments
    ///
    /// * `token` - JWT token string
    ///
    /// # Returns
    ///
    /// Decoded claims if valid
    ///
    /// # Errors
    ///
    /// Returns Unauthorized error if token is invalid, expired, or malformed
    pub fn validate_access_token(&self, token: &str) -> Result<Claims> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.config.secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| {
            tracing::warn!("Invalid access token: {:?}", e);
            AppError::Unauthorized("Invalid or expired token".to_string())
        })?;

        // Verify token type
        if token_data.claims.token_type != "access" {
            return Err(AppError::Unauthorized("Invalid token type".to_string()));
        }

        Ok(token_data.claims)
    }

    /// Validate and decode a refresh token
    ///
    /// # Arguments
    ///
    /// * `token` - JWT refresh token string
    ///
    /// # Returns
    ///
    /// Decoded claims if valid
    ///
    /// # Errors
    ///
    /// Returns Unauthorized error if token is invalid, expired, or malformed
    pub fn validate_refresh_token(&self, token: &str) -> Result<Claims> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.config.refresh_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| {
            tracing::warn!("Invalid refresh token: {:?}", e);
            AppError::Unauthorized("Invalid or expired refresh token".to_string())
        })?;

        // Verify token type
        if token_data.claims.token_type != "refresh" {
            return Err(AppError::Unauthorized("Invalid token type".to_string()));
        }

        Ok(token_data.claims)
    }

    /// Refresh an access token using a valid refresh token
    ///
    /// # Arguments
    ///
    /// * `refresh_token` - Valid refresh token
    ///
    /// # Returns
    ///
    /// New token pair
    ///
    /// # Errors
    ///
    /// Returns an error if the refresh token is invalid
    pub fn refresh_access_token(&self, refresh_token: &str) -> Result<TokenPair> {
        let claims = self.validate_refresh_token(refresh_token)?;

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

        let role = match claims.role.as_str() {
            "ADMIN" => UserRole::Admin,
            "DOCTOR" => UserRole::Doctor,
            _ => return Err(AppError::Unauthorized("Invalid role in token".to_string())),
        };

        self.generate_tokens(&user_id, &role)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_jwt_config() -> JwtConfig {
        JwtConfig {
            secret: "test_secret_key_minimum_32_characters_long_for_security".to_string(),
            refresh_secret: "test_refresh_secret_key_minimum_32_characters_long".to_string(),
            access_token_expiry: 1800, // 30 minutes
            refresh_token_expiry: 604800, // 7 days
        }
    }

    #[test]
    fn test_generate_tokens() {
        let jwt_service = JwtService::new(test_jwt_config());
        let user_id = Uuid::new_v4();
        let role = UserRole::Doctor;

        let result = jwt_service.generate_tokens(&user_id, &role);
        assert!(result.is_ok());

        let tokens = result.unwrap();
        assert!(!tokens.access_token.is_empty());
        assert!(!tokens.refresh_token.is_empty());
        assert_eq!(tokens.expires_in, 1800);
    }

    #[test]
    fn test_validate_access_token_success() {
        let jwt_service = JwtService::new(test_jwt_config());
        let user_id = Uuid::new_v4();
        let role = UserRole::Admin;

        let tokens = jwt_service.generate_tokens(&user_id, &role).unwrap();
        let claims = jwt_service.validate_access_token(&tokens.access_token);

        assert!(claims.is_ok());
        let claims = claims.unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.role, "ADMIN");
        assert_eq!(claims.token_type, "access");
    }

    #[test]
    fn test_validate_refresh_token_success() {
        let jwt_service = JwtService::new(test_jwt_config());
        let user_id = Uuid::new_v4();
        let role = UserRole::Doctor;

        let tokens = jwt_service.generate_tokens(&user_id, &role).unwrap();
        let claims = jwt_service.validate_refresh_token(&tokens.refresh_token);

        assert!(claims.is_ok());
        let claims = claims.unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.role, "DOCTOR");
        assert_eq!(claims.token_type, "refresh");
    }

    #[test]
    fn test_validate_access_token_invalid() {
        let jwt_service = JwtService::new(test_jwt_config());
        let result = jwt_service.validate_access_token("invalid_token");
        assert!(result.is_err());
    }

    #[test]
    fn test_refresh_access_token() {
        let jwt_service = JwtService::new(test_jwt_config());
        let user_id = Uuid::new_v4();
        let role = UserRole::Doctor;

        let tokens = jwt_service.generate_tokens(&user_id, &role).unwrap();
        let new_tokens = jwt_service.refresh_access_token(&tokens.refresh_token);

        assert!(new_tokens.is_ok());
        let new_tokens = new_tokens.unwrap();
        assert!(!new_tokens.access_token.is_empty());
        assert_ne!(new_tokens.access_token, tokens.access_token);
    }

    #[test]
    fn test_wrong_token_type() {
        let jwt_service = JwtService::new(test_jwt_config());
        let user_id = Uuid::new_v4();
        let role = UserRole::Doctor;

        let tokens = jwt_service.generate_tokens(&user_id, &role).unwrap();

        // Try to use refresh token as access token
        let result = jwt_service.validate_access_token(&tokens.refresh_token);
        assert!(result.is_err());

        // Try to use access token as refresh token
        let result = jwt_service.validate_refresh_token(&tokens.access_token);
        assert!(result.is_err());
    }
}
