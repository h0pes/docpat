/*!
 * Utilities Module
 *
 * Contains utility functions for error handling, validation, and encryption.
 */

pub mod encryption;
pub mod errors;
pub mod password;
pub mod validators;

#[cfg(feature = "rbac")]
pub mod permissions;

pub use encryption::EncryptionKey;
pub use errors::{AppError, Result};
pub use password::PasswordHasherUtil;
pub use validators::{EmailValidator, FiscalCodeValidator, PhoneValidator};
