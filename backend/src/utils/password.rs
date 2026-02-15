/*!
 * Password Hashing Utilities
 *
 * Provides secure password hashing and verification using Argon2id,
 * which is the recommended password hashing algorithm for new applications.
 */

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Algorithm, Argon2, Params, Version,
};

use crate::utils::{AppError, Result};

/// Password complexity requirements for security
#[derive(Debug, Clone)]
pub struct PasswordRequirements {
    pub min_length: usize,
    pub max_length: usize,
    pub require_uppercase: bool,
    pub require_lowercase: bool,
    pub require_number: bool,
    pub require_special: bool,
}

impl Default for PasswordRequirements {
    fn default() -> Self {
        Self {
            min_length: 8,
            max_length: 128,
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

/// Build an Argon2id instance using parameters from environment variables.
///
/// Reads `ARGON2_MEMORY_COST` (KiB), `ARGON2_TIME_COST` (iterations), and
/// `ARGON2_PARALLELISM` (threads). Falls back to library defaults if
/// any variable is missing or invalid.
fn argon2_from_env() -> Argon2<'static> {
    let m_cost = std::env::var("ARGON2_MEMORY_COST")
        .ok()
        .and_then(|v| v.parse::<u32>().ok());
    let t_cost = std::env::var("ARGON2_TIME_COST")
        .ok()
        .and_then(|v| v.parse::<u32>().ok());
    let p_cost = std::env::var("ARGON2_PARALLELISM")
        .ok()
        .and_then(|v| v.parse::<u32>().ok());

    // If no env vars are set, use library defaults for backward compatibility
    if m_cost.is_none() && t_cost.is_none() && p_cost.is_none() {
        return Argon2::default();
    }

    // Build params with env values, falling back to library defaults per-field
    match Params::new(
        m_cost.unwrap_or(19456),  // library default: ~19 MiB
        t_cost.unwrap_or(2),      // library default: 2 iterations
        p_cost.unwrap_or(1),      // library default: 1 thread
        None,                     // default output length
    ) {
        Ok(params) => Argon2::new(Algorithm::Argon2id, Version::V0x13, params),
        Err(e) => {
            tracing::warn!("Invalid Argon2 parameters from environment: {e}, using defaults");
            Argon2::default()
        }
    }
}

/// Common password base words that should be rejected regardless of complexity.
/// The check strips trailing digits and special characters, then lowercases
/// the result before matching, so "Password1!", "QWERTY123!" etc. are all caught.
const COMMON_PASSWORD_BASES: &[&str] = &[
    "password", "passw0rd", "p@ssword", "p@ssw0rd",
    "qwerty", "letmein", "welcome", "monkey", "dragon",
    "master", "login", "princess", "football", "shadow",
    "sunshine", "trustno", "iloveyou", "batman", "access",
    "hello", "charlie", "donald", "admin", "administrator",
    "root", "toor", "pass", "test", "guest",
    "abc123", "abcdef", "changeme", "secret", "love",
    "god", "sex", "money", "freedom", "whatever",
    "qazwsx", "mustang", "michael", "summer", "internet",
    "soccer", "hockey", "killer", "pepper", "joshua",
    "hunter", "ranger", "buster", "thomas", "robert",
    "matrix", "computer", "superman", "jordan", "junior",
    "harley", "cheese", "amanda", "dakota", "ginger",
    "cookie", "george", "summer", "taylor", "baseball",
    "starwars", "maggie", "silver", "william", "dallas",
    "yankees", "jennifer", "jessica", "thunder", "chicken",
];

/// Extract the base word from a password by stripping trailing non-alphabetic characters
/// and converting to lowercase. For example: "Password1!" -> "password",
/// "QWERTY123!@#" -> "qwerty", "Hunter2!" -> "hunter".
fn extract_password_base(password: &str) -> String {
    password
        .trim_end_matches(|c: char| !c.is_alphabetic())
        .to_lowercase()
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
    /// - Minimum 8 characters, maximum 128 characters
    /// - At least one uppercase letter
    /// - At least one lowercase letter
    /// - At least one number
    /// - At least one special character (!@#$%^&*(),.?":{}|<>)
    /// - Must not be a common/weak password
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

        // Check maximum length (prevents Argon2 DoS with very long input)
        if password.len() > reqs.max_length {
            failures.push(format!(
                "must be at most {} characters long",
                reqs.max_length
            ));
        }

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

        // Check against common password dictionary
        let base = extract_password_base(password);
        if COMMON_PASSWORD_BASES.contains(&base.as_str()) {
            failures.push("must not be based on a common or easily guessed word".to_string());
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
        let argon2 = argon2_from_env();

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
            max_length: 128,
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
    fn test_custom_argon2_params_hash_verifies() {
        // Verify that hashes created with custom Argon2 params (as when env vars are set)
        // can be verified by verify_password (which reads params from the PHC hash string)
        let params = Params::new(32768, 3, 2, None).unwrap();
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
        let salt = SaltString::generate(&mut OsRng);

        let hash = argon2
            .hash_password(b"TestPassword123!", &salt)
            .unwrap()
            .to_string();

        // verify_password uses Argon2::default() but reads params from the PHC hash
        assert!(PasswordHasherUtil::verify_password("TestPassword123!", &hash));
        assert!(!PasswordHasherUtil::verify_password("WrongPassword!", &hash));
    }

    #[test]
    fn test_password_various_special_chars() {
        // Uses "Xkcd" base which is not in the common password dictionary
        let passwords = vec![
            "Xkcd123@",
            "Xkcd123#",
            "Xkcd123$",
            "Xkcd123%",
            "Xkcd123^",
            "Xkcd123&",
            "Xkcd123*",
            "Xkcd123!",
            "Xkcd123-",
            "Xkcd123_",
            "Xkcd123=",
            "Xkcd123+",
        ];

        for pwd in passwords {
            let result = PasswordHasherUtil::validate_password_complexity(pwd, None);
            assert!(result.is_ok(), "Password '{}' should be valid", pwd);
        }
    }

    #[test]
    fn test_password_too_long() {
        // 129 characters exceeds the default max of 128
        let password = format!("A{}1!", "a".repeat(126));
        assert_eq!(password.len(), 129);
        let result = PasswordHasherUtil::validate_password_complexity(&password, None);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("at most 128 characters"));
    }

    #[test]
    fn test_password_at_max_length() {
        // Exactly 128 characters should be accepted
        let password = format!("A{}1!", "a".repeat(125));
        assert_eq!(password.len(), 128);
        let result = PasswordHasherUtil::validate_password_complexity(&password, None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_common_password_rejected() {
        // These all pass complexity rules but are based on common words
        let common_passwords = vec![
            "Password1!",
            "Qwerty123!",
            "Welcome1!",
            "Letmein1!",
            "Admin123!",
            "Dragon99!",
            "Monkey12!",
            "Shadow99!",
            "Master12!",
            "PASSW0RD1!",
        ];

        for pwd in common_passwords {
            let result = PasswordHasherUtil::validate_password_complexity(pwd, None);
            assert!(result.is_err(), "Common password '{}' should be rejected", pwd);
            let error = result.unwrap_err().to_string();
            assert!(
                error.contains("common or easily guessed"),
                "Error for '{}' should mention common word: {}",
                pwd,
                error
            );
        }
    }

    #[test]
    fn test_non_common_password_accepted() {
        // Unique passwords should pass
        let good_passwords = vec![
            "Zx9$kLm2Pq",
            "MyC@t8Fluffy",
            "Tr0mb0ne!Play",
            "J5&neptune#R",
        ];

        for pwd in good_passwords {
            let result = PasswordHasherUtil::validate_password_complexity(pwd, None);
            assert!(result.is_ok(), "Password '{}' should be accepted", pwd);
        }
    }

    #[test]
    fn test_extract_password_base() {
        assert_eq!(extract_password_base("Password1!"), "password");
        assert_eq!(extract_password_base("QWERTY123!@#"), "qwerty");
        assert_eq!(extract_password_base("Hunter2!"), "hunter");
        assert_eq!(extract_password_base("dragon"), "dragon");
        assert_eq!(extract_password_base("12345"), "");
    }
}
