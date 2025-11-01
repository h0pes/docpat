/*!
 * Password Hashing Utilities
 *
 * Provides secure password hashing and verification using Argon2id,
 * which is the recommended password hashing algorithm for new applications.
 */

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

use crate::utils::{AppError, Result};

/// Password complexity requirements for security
#[derive(Debug, Clone)]
pub struct PasswordRequirements {
    pub min_length: usize,
    pub require_uppercase: bool,
    pub require_lowercase: bool,
    pub require_number: bool,
    pub require_special: bool,
}

impl Default for PasswordRequirements {
    fn default() -> Self {
        Self {
            min_length: 8,
            require_uppercase: true,
            require_lowercase: true,
            require_number: true,
            require_special: true,
        }
    }
}

/// Password validation error details
#[derive(Debug, Clone)]
pub struct PasswordValidationError {
    pub message: String,
    pub failures: Vec<String>,
}

impl std::fmt::Display for PasswordValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.message, self.failures.join(", "))
    }
}

/// Password hasher for secure password operations
pub struct PasswordHasherUtil;

impl PasswordHasherUtil {
    /// Validate password complexity requirements
    ///
    /// # Arguments
    ///
    /// * `password` - Plain text password to validate
    /// * `requirements` - Optional custom requirements (uses defaults if None)
    ///
    /// # Returns
    ///
    /// Ok(()) if password meets requirements, Err with detailed failures otherwise
    ///
    /// # Default Requirements
    ///
    /// - Minimum 8 characters
    /// - At least one uppercase letter
    /// - At least one lowercase letter
    /// - At least one number
    /// - At least one special character (!@#$%^&*(),.?":{}|<>)
    ///
    /// # Example
    ///
    /// ```
    /// use docpat_backend::utils::password::PasswordHasherUtil;
    ///
    /// # fn main() -> Result<(), Box<dyn std::error::Error>> {
    /// // Valid password
    /// PasswordHasherUtil::validate_password_complexity("MyPass123!", None)?;
    ///
    /// // Invalid password (too short, no special char)
    /// assert!(PasswordHasherUtil::validate_password_complexity("Short1", None).is_err());
    /// # Ok(())
    /// # }
    /// ```
    pub fn validate_password_complexity(
        password: &str,
        requirements: Option<PasswordRequirements>,
    ) -> Result<()> {
        let reqs = requirements.unwrap_or_default();
        let mut failures = Vec::new();

        // Check minimum length
        if password.len() < reqs.min_length {
            failures.push(format!(
                "must be at least {} characters long",
                reqs.min_length
            ));
        }

        // Check uppercase requirement
        if reqs.require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            failures.push("must contain at least one uppercase letter".to_string());
        }

        // Check lowercase requirement
        if reqs.require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
            failures.push("must contain at least one lowercase letter".to_string());
        }

        // Check number requirement
        if reqs.require_number && !password.chars().any(|c| c.is_numeric()) {
            failures.push("must contain at least one number".to_string());
        }

        // Check special character requirement
        if reqs.require_special {
            let special_chars = "!@#$%^&*(),.?\":{}|<>-_=+[]\\;'/`~";
            if !password.chars().any(|c| special_chars.contains(c)) {
                failures.push(format!(
                    "must contain at least one special character ({})",
                    special_chars
                ));
            }
        }

        if !failures.is_empty() {
            return Err(AppError::Validation(format!(
                "Password does not meet complexity requirements: {}",
                failures.join("; ")
            )));
        }

        Ok(())
    }

    /// Hash a password using Argon2id
    ///
    /// # Arguments
    ///
    /// * `password` - Plain text password to hash
    ///
    /// # Returns
    ///
    /// PHC-formatted hash string suitable for database storage
    ///
    /// # Errors
    ///
    /// Returns an error if hashing fails
    ///
    /// # Example
    ///
    /// ```
    /// use docpat_backend::utils::password::PasswordHasherUtil;
    ///
    /// # fn main() -> Result<(), Box<dyn std::error::Error>> {
    /// let hash = PasswordHasherUtil::hash_password("my_secure_password")?;
    /// assert!(hash.starts_with("$argon2"));
    /// # Ok(())
    /// # }
    /// ```
    pub fn hash_password(password: &str) -> std::result::Result<String, argon2::password_hash::Error> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)?
            .to_string();

        Ok(password_hash)
    }

    /// Verify a password against a hash
    ///
    /// # Arguments
    ///
    /// * `password` - Plain text password to verify
    /// * `hash` - PHC-formatted hash string from database
    ///
    /// # Returns
    ///
    /// `true` if password matches hash, `false` otherwise
    ///
    /// # Example
    ///
    /// ```
    /// use docpat_backend::utils::password::PasswordHasherUtil;
    ///
    /// # fn main() -> Result<(), Box<dyn std::error::Error>> {
    /// let hash = PasswordHasherUtil::hash_password("my_secure_password")?;
    /// assert!(PasswordHasherUtil::verify_password("my_secure_password", &hash));
    /// assert!(!PasswordHasherUtil::verify_password("wrong_password", &hash));
    /// # Ok(())
    /// # }
    /// ```
    pub fn verify_password(password: &str, hash: &str) -> bool {
        let parsed_hash = match PasswordHash::new(hash) {
            Ok(hash) => hash,
            Err(e) => {
                tracing::error!("Failed to parse password hash: {:?}", e);
                return false;
            }
        };

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok()
    }
}

/// Convenience function for password validation with default requirements
///
/// This is a wrapper around `PasswordHasherUtil::validate_password_complexity`
/// with default requirements.
///
/// # Arguments
///
/// * `password` - Plain text password to validate
///
/// # Returns
///
/// Ok(()) if password meets requirements, Err with detailed message otherwise
pub fn validate_password(password: &str) -> std::result::Result<(), String> {
    PasswordHasherUtil::validate_password_complexity(password, None)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123!";
        let hash = PasswordHasherUtil::hash_password(password).unwrap();

        // Hash should start with $argon2
        assert!(hash.starts_with("$argon2"));

        // Hash should not be the same as the password
        assert_ne!(hash, password);
    }

    #[test]
    fn test_password_verification_success() {
        let password = "correct_password";
        let hash = PasswordHasherUtil::hash_password(password).unwrap();

        assert!(PasswordHasherUtil::verify_password(password, &hash));
    }

    #[test]
    fn test_password_verification_failure() {
        let password = "correct_password";
        let hash = PasswordHasherUtil::hash_password(password).unwrap();

        assert!(!PasswordHasherUtil::verify_password("wrong_password", &hash));
    }

    #[test]
    fn test_different_hashes_for_same_password() {
        let password = "same_password";
        let hash1 = PasswordHasherUtil::hash_password(password).unwrap();
        let hash2 = PasswordHasherUtil::hash_password(password).unwrap();

        // Hashes should be different due to random salt
        assert_ne!(hash1, hash2);

        // But both should verify correctly
        assert!(PasswordHasherUtil::verify_password(password, &hash1));
        assert!(PasswordHasherUtil::verify_password(password, &hash2));
    }

    #[test]
    fn test_invalid_hash_format() {
        assert!(!PasswordHasherUtil::verify_password("password", "invalid_hash"));
    }

    // Password complexity validation tests
    #[test]
    fn test_valid_password() {
        let password = "MySecure123!";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_password_too_short() {
        let password = "Short1!";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("at least 8 characters"));
    }

    #[test]
    fn test_password_missing_uppercase() {
        let password = "lowercase123!";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("uppercase letter"));
    }

    #[test]
    fn test_password_missing_lowercase() {
        let password = "UPPERCASE123!";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("lowercase letter"));
    }

    #[test]
    fn test_password_missing_number() {
        let password = "NoNumbers!";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("number"));
    }

    #[test]
    fn test_password_missing_special_char() {
        let password = "NoSpecial123";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("special character"));
    }

    #[test]
    fn test_password_multiple_failures() {
        let password = "weak";
        let result = PasswordHasherUtil::validate_password_complexity(password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        // Should mention multiple failures
        assert!(error.contains("8 characters"));
        assert!(error.contains("uppercase"));
        assert!(error.contains("number"));
        assert!(error.contains("special"));
    }

    #[test]
    fn test_password_custom_requirements() {
        let custom_reqs = PasswordRequirements {
            min_length: 12,
            require_uppercase: true,
            require_lowercase: true,
            require_number: true,
            require_special: false, // Special char not required
        };

        // Valid with custom requirements (no special char needed)
        let password = "MyPassword123";
        let result = PasswordHasherUtil::validate_password_complexity(password, Some(custom_reqs.clone()));
        assert!(result.is_ok());

        // Invalid - too short for custom requirement
        let password = "Short123";
        let result = PasswordHasherUtil::validate_password_complexity(password, Some(custom_reqs));
        assert!(result.is_err());
    }

    #[test]
    fn test_password_various_special_chars() {
        let passwords = vec![
            "Test123@",
            "Test123#",
            "Test123$",
            "Test123%",
            "Test123^",
            "Test123&",
            "Test123*",
            "Test123!",
            "Test123-",
            "Test123_",
            "Test123=",
            "Test123+",
        ];

        for pwd in passwords {
            let result = PasswordHasherUtil::validate_password_complexity(pwd, None);
            assert!(result.is_ok(), "Password '{}' should be valid", pwd);
        }
    }
}
