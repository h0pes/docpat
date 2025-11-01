/*!
 * User Model
 *
 * Represents users in the medical practice management system,
 * including authentication and authorization data.
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::utils::{AppError, Result};

/// User role enumeration
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UserRole {
    /// Administrator with full system access
    #[sqlx(rename = "ADMIN")]
    Admin,
    /// Doctor with patient care access
    #[sqlx(rename = "DOCTOR")]
    Doctor,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "ADMIN"),
            UserRole::Doctor => write!(f, "DOCTOR"),
        }
    }
}

/// User model representing a user in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    /// Unique user identifier
    pub id: Uuid,
    /// Unique username for authentication
    pub username: String,
    /// User email address
    pub email: String,
    /// Argon2 hashed password
    #[serde(skip_serializing)]
    pub password_hash: String,
    /// User role (ADMIN or DOCTOR)
    pub role: UserRole,
    /// First name
    pub first_name: String,
    /// Last name
    pub last_name: String,
    /// Phone number (optional)
    pub phone: Option<String>,
    /// Whether the account is active
    pub is_active: bool,
    /// MFA secret for TOTP (optional, encrypted)
    #[serde(skip_serializing)]
    pub mfa_secret: Option<String>,
    /// Whether MFA is enabled for this user
    pub mfa_enabled: bool,
    /// Backup codes for account recovery (hashed)
    #[serde(skip_serializing)]
    pub backup_codes: Option<Vec<String>>,
    /// Last login timestamp
    pub last_login: Option<DateTime<Utc>>,
    /// Number of consecutive failed login attempts
    pub failed_login_attempts: i32,
    /// Timestamp until which the account is locked (if locked)
    pub locked_until: Option<DateTime<Utc>>,
    /// Account creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    pub updated_at: DateTime<Utc>,
    /// ID of user who created this account
    pub created_by: Option<Uuid>,
}

impl User {
    /// Find a user by username
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `username` - Username to search for
    ///
    /// # Returns
    ///
    /// The user if found, or NotFound error
    pub async fn find_by_username(pool: &PgPool, username: &str) -> Result<Self> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, email, password_hash, role, first_name, last_name,
                   phone, is_active, mfa_secret, mfa_enabled, backup_codes, last_login,
                   failed_login_attempts, locked_until, created_at, updated_at, created_by
            FROM users
            WHERE username = $1
            "#,
        )
        .bind(username)
        .fetch_one(pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => AppError::NotFound("User not found".to_string()),
            _ => AppError::from(e),
        })
    }

    /// Find a user by ID
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `user_id` - User UUID to search for
    ///
    /// # Returns
    ///
    /// The user if found, or NotFound error
    pub async fn find_by_id(pool: &PgPool, user_id: &Uuid) -> Result<Self> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, email, password_hash, role, first_name, last_name,
                   phone, is_active, mfa_secret, mfa_enabled, backup_codes, last_login,
                   failed_login_attempts, locked_until, created_at, updated_at, created_by
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => AppError::NotFound("User not found".to_string()),
            _ => AppError::from(e),
        })
    }

    /// Find a user by email
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `email` - Email address to search for
    ///
    /// # Returns
    ///
    /// The user if found, or NotFound error
    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Self> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, email, password_hash, role, first_name, last_name,
                   phone, is_active, mfa_secret, mfa_enabled, backup_codes, last_login,
                   failed_login_attempts, locked_until, created_at, updated_at, created_by
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_one(pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => AppError::NotFound("User not found".to_string()),
            _ => AppError::from(e),
        })
    }

    /// Check if the account is currently locked
    ///
    /// # Returns
    ///
    /// `true` if the account is locked, `false` otherwise
    pub fn is_locked(&self) -> bool {
        if let Some(locked_until) = self.locked_until {
            locked_until > Utc::now()
        } else {
            false
        }
    }

    /// Update last login timestamp
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    pub async fn update_last_login(&self, pool: &PgPool) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE users
            SET last_login = NOW(),
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(self.id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Increment failed login attempts
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `max_attempts` - Maximum allowed failed attempts before lockout
    /// * `lockout_duration_secs` - Duration of lockout in seconds
    pub async fn increment_failed_login(
        &self,
        pool: &PgPool,
        max_attempts: u32,
        lockout_duration_secs: i64,
    ) -> Result<()> {
        let new_attempts = self.failed_login_attempts + 1;
        let locked_until = if new_attempts >= max_attempts as i32 {
            Some(Utc::now() + chrono::Duration::seconds(lockout_duration_secs))
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE users
            SET failed_login_attempts = $1,
                locked_until = $2,
                updated_at = NOW()
            WHERE id = $3
            "#,
        )
        .bind(new_attempts)
        .bind(locked_until)
        .bind(self.id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Set MFA secret for the user
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `secret` - Base32-encoded TOTP secret
    pub async fn set_mfa_secret(&self, pool: &PgPool, secret: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE users
            SET mfa_secret = $1,
                updated_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(secret)
        .bind(self.id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Remove MFA secret (disable MFA)
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    pub async fn remove_mfa_secret(&self, pool: &PgPool) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE users
            SET mfa_secret = NULL,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(self.id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Check if MFA is enabled for this user
    ///
    /// # Returns
    ///
    /// `true` if MFA is enabled, `false` otherwise
    pub fn has_mfa_enabled(&self) -> bool {
        self.mfa_enabled && self.mfa_secret.is_some()
    }
}

/// User data transfer object for safe serialization (without sensitive data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDto {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub first_name: String,
    pub last_name: String,
    pub phone: Option<String>,
    pub is_active: bool,
    pub mfa_enabled: bool,
    pub last_login: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserDto {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            is_active: user.is_active,
            mfa_enabled: user.mfa_secret.is_some(),
            last_login: user.last_login,
            created_at: user.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_role_display() {
        assert_eq!(UserRole::Admin.to_string(), "ADMIN");
        assert_eq!(UserRole::Doctor.to_string(), "DOCTOR");
    }

    #[test]
    fn test_user_is_locked() {
        let user_locked = User {
            id: Uuid::new_v4(),
            username: "test".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            role: UserRole::Doctor,
            first_name: "Test".to_string(),
            last_name: "User".to_string(),
            phone: None,
            is_active: true,
            mfa_secret: None,
            mfa_enabled: false,
            backup_codes: None,
            last_login: None,
            failed_login_attempts: 5,
            locked_until: Some(Utc::now() + chrono::Duration::hours(1)),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        };

        assert!(user_locked.is_locked());

        let user_unlocked = User {
            locked_until: None,
            ..user_locked
        };

        assert!(!user_unlocked.is_locked());
    }

    #[test]
    fn test_user_has_mfa_enabled() {
        let user_with_mfa = User {
            id: Uuid::new_v4(),
            username: "test".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            role: UserRole::Doctor,
            first_name: "Test".to_string(),
            last_name: "User".to_string(),
            phone: None,
            is_active: true,
            mfa_secret: Some("SECRET123".to_string()),
            mfa_enabled: true,
            backup_codes: None,
            last_login: None,
            failed_login_attempts: 0,
            locked_until: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        };

        assert!(user_with_mfa.has_mfa_enabled());

        let user_without_mfa = User {
            mfa_secret: None,
            ..user_with_mfa
        };

        assert!(!user_without_mfa.has_mfa_enabled());
    }

    #[test]
    fn test_user_dto_from_user() {
        let user = User {
            id: Uuid::new_v4(),
            username: "test".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            role: UserRole::Doctor,
            first_name: "Test".to_string(),
            last_name: "User".to_string(),
            phone: Some("+1234567890".to_string()),
            is_active: true,
            mfa_secret: Some("SECRET".to_string()),
            mfa_enabled: true,
            backup_codes: None,
            last_login: None,
            failed_login_attempts: 0,
            locked_until: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        };

        let dto: UserDto = user.into();
        assert_eq!(dto.username, "test");
        assert!(dto.mfa_enabled);
    }
}
