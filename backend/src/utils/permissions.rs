//! Permission Checking Helpers
//!
//! Provides utility functions for checking user permissions in handlers

use crate::middleware::authorization::CasbinEnforcer;
use crate::models::user::UserRole;
use axum::{http::StatusCode, Json};
use serde_json::json;

/// Check if a user has permission to perform an action on a resource
/// Returns Ok(()) if permission is granted, Err with proper HTTP response otherwise
pub async fn check_permission(
    enforcer: &CasbinEnforcer,
    user_role: &UserRole,
    resource: &str,
    action: &str,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let has_permission = enforcer
        .enforce(user_role, resource, action)
        .await
        .map_err(|e| {
            tracing::error!("Permission check error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "AUTHORIZATION_ERROR",
                    "message": "Failed to check permissions"
                })),
            )
        })?;

    if !has_permission {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "FORBIDDEN",
                "message": format!(
                    "Insufficient permissions. Required: {} on {}",
                    action, resource
                )
            })),
        ));
    }

    Ok(())
}

/// Check if a user is an admin
pub fn is_admin(user_role: &UserRole) -> bool {
    matches!(user_role, UserRole::Admin)
}

/// Check if a user is a doctor
pub fn is_doctor(user_role: &UserRole) -> bool {
    matches!(user_role, UserRole::Doctor)
}

/// Require admin role, return error if not admin
pub fn require_admin(user_role: &UserRole) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    if !is_admin(user_role) {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "FORBIDDEN",
                "message": "This operation requires administrator privileges"
            })),
        ));
    }
    Ok(())
}

/// Check if user can access another user's data
/// Admins can access all users, doctors can only access their own data
pub fn can_access_user(
    requesting_user_id: &uuid::Uuid,
    target_user_id: &uuid::Uuid,
    requesting_user_role: &UserRole,
) -> bool {
    // Admins can access any user
    if is_admin(requesting_user_role) {
        return true;
    }

    // Users can access their own data
    requesting_user_id == target_user_id
}

/// Require that a user can access another user's data
pub fn require_user_access(
    requesting_user_id: &uuid::Uuid,
    target_user_id: &uuid::Uuid,
    requesting_user_role: &UserRole,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    if !can_access_user(requesting_user_id, target_user_id, requesting_user_role) {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "FORBIDDEN",
                "message": "You don't have permission to access this user's data"
            })),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_is_admin() {
        assert!(is_admin(&UserRole::Admin));
        assert!(!is_admin(&UserRole::Doctor));
    }

    #[test]
    fn test_is_doctor() {
        assert!(is_doctor(&UserRole::Doctor));
        assert!(!is_doctor(&UserRole::Admin));
    }

    #[test]
    fn test_require_admin() {
        assert!(require_admin(&UserRole::Admin).is_ok());
        assert!(require_admin(&UserRole::Doctor).is_err());
    }

    #[test]
    fn test_can_access_user() {
        let user_id = Uuid::new_v4();
        let other_user_id = Uuid::new_v4();

        // Admin can access any user
        assert!(can_access_user(&user_id, &other_user_id, &UserRole::Admin));

        // Doctor can access their own data
        assert!(can_access_user(&user_id, &user_id, &UserRole::Doctor));

        // Doctor cannot access other users' data
        assert!(!can_access_user(&user_id, &other_user_id, &UserRole::Doctor));
    }

    #[test]
    fn test_require_user_access() {
        let user_id = Uuid::new_v4();
        let other_user_id = Uuid::new_v4();

        // Admin can access any user
        assert!(require_user_access(&user_id, &other_user_id, &UserRole::Admin).is_ok());

        // Doctor can access their own data
        assert!(require_user_access(&user_id, &user_id, &UserRole::Doctor).is_ok());

        // Doctor cannot access other users' data
        assert!(require_user_access(&user_id, &other_user_id, &UserRole::Doctor).is_err());
    }
}
