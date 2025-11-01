/*!
 * Utilities Module
 *
 * Contains utility functions for error handling, validation, and encryption.
 */

pub mod errors;
pub mod password;

#[cfg(feature = "rbac")]
pub mod permissions;

pub use errors::{AppError, Result};
pub use password::PasswordHasherUtil;
