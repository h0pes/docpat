//! Authorization Middleware
//!
//! This module provides RBAC-based authorization using Casbin.
//! It checks if a user has permission to perform an action on a resource.

use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use casbin::{CoreApi, DefaultModel, Enforcer, FileAdapter};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::user::UserRole;

/// Permission requirement for a route
#[derive(Debug, Clone)]
pub struct RequirePermission {
    pub resource: String,
    pub action: String,
}

impl RequirePermission {
    /// Create a new permission requirement
    pub fn new(resource: impl Into<String>, action: impl Into<String>) -> Self {
        Self {
            resource: resource.into(),
            action: action.into(),
        }
    }
}

/// Casbin enforcer wrapper for thread-safe access
#[derive(Clone)]
pub struct CasbinEnforcer {
    enforcer: Arc<RwLock<Enforcer>>,
}

impl CasbinEnforcer {
    /// Initialize Casbin enforcer from policy files
    pub async fn new(model_path: &str, policy_path: &str) -> Result<Self, casbin::Error> {
        // Load model from file
        let model = DefaultModel::from_file(model_path).await?;

        // Create file adapter with owned string for 'static lifetime
        let adapter = FileAdapter::new(policy_path.to_string());

        // Create enforcer with model and adapter
        let enforcer = Enforcer::new(model, adapter).await?;

        Ok(Self {
            enforcer: Arc::new(RwLock::new(enforcer)),
        })
    }

    /// Check if a user has permission to perform an action on a resource
    pub async fn enforce(&self, role: &UserRole, resource: &str, action: &str) -> Result<bool, casbin::Error> {
        let role_str = match role {
            UserRole::Admin => "ADMIN",
            UserRole::Doctor => "DOCTOR",
        };

        let enforcer = self.enforcer.read().await;
        enforcer.enforce((role_str, resource, action))
    }

    // TODO: Implement these methods when needed for dynamic role assignment
    // /// Add a role assignment for a user (for future use with user-specific policies)
    // pub async fn add_role_for_user(&self, user: &str, role: &str) -> Result<bool, casbin::Error> {
    //     let mut enforcer = self.enforcer.write().await;
    //     enforcer.add_grouping_policy(vec![user.to_string(), role.to_string()]).await
    // }

    // /// Remove a role assignment for a user
    // pub async fn remove_role_for_user(&self, user: &str, role: &str) -> Result<bool, casbin::Error> {
    //     let mut enforcer = self.enforcer.write().await;
    //     enforcer.remove_grouping_policy(vec![user.to_string(), role.to_string()]).await
    // }

    // /// Get all roles for a user
    // pub async fn get_roles_for_user(&self, user: &str) -> Vec<String> {
    //     let enforcer = self.enforcer.read().await;
    //     enforcer.get_roles_for_user(user, None)
    // }

    /// Reload policies from file (useful for dynamic policy updates)
    pub async fn reload_policies(&self) -> Result<(), casbin::Error> {
        let mut enforcer = self.enforcer.write().await;
        enforcer.load_policy().await
    }
}

/// Extract user role from request extensions
/// This assumes the auth middleware has already validated the JWT and set the user role
fn extract_user_role(req: &Request) -> Result<UserRole, (StatusCode, Json<serde_json::Value>)> {
    req.extensions()
        .get::<UserRole>()
        .cloned()
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "UNAUTHORIZED",
                    "message": "Authentication required"
                })),
            )
        })
}

/// Authorization middleware that checks RBAC permissions
pub async fn require_permission(
    State(enforcer): State<CasbinEnforcer>,
    req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    // Extract the required permission from request extensions
    let permission = req
        .extensions()
        .get::<RequirePermission>()
        .cloned()
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "CONFIGURATION_ERROR",
                    "message": "Permission requirement not configured for this route"
                })),
            )
        })?;

    // Extract user role from request extensions (set by auth middleware)
    let user_role = extract_user_role(&req)?;

    // Check permission using Casbin
    let has_permission = enforcer
        .enforce(&user_role, &permission.resource, &permission.action)
        .await
        .map_err(|e| {
            tracing::error!("Casbin enforcement error: {}", e);
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
                    permission.action, permission.resource
                )
            })),
        ));
    }

    // User has permission, proceed with request
    Ok(next.run(req).await)
}

/// Helper macro to create permission requirements
#[macro_export]
macro_rules! require_perm {
    ($resource:expr, $action:expr) => {
        RequirePermission::new($resource, $action)
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_casbin_enforcer_initialization() {
        // This test requires the policy files to exist
        let result = CasbinEnforcer::new(
            "casbin/model.conf",
            "casbin/policy.csv",
        ).await;

        assert!(result.is_ok(), "Casbin enforcer should initialize successfully");
    }

    #[tokio::test]
    async fn test_admin_has_full_access() {
        let enforcer = CasbinEnforcer::new(
            "casbin/model.conf",
            "casbin/policy.csv",
        ).await.unwrap();

        // Test admin permissions
        let has_perm = enforcer.enforce(&UserRole::Admin, "patients", "create").await.unwrap();
        assert!(has_perm, "ADMIN should have create permission on patients");

        let has_perm = enforcer.enforce(&UserRole::Admin, "users", "delete").await.unwrap();
        assert!(has_perm, "ADMIN should have delete permission on users");

        let has_perm = enforcer.enforce(&UserRole::Admin, "audit_logs", "read").await.unwrap();
        assert!(has_perm, "ADMIN should have read permission on audit_logs");
    }

    #[tokio::test]
    async fn test_doctor_permissions() {
        let enforcer = CasbinEnforcer::new(
            "casbin/model.conf",
            "casbin/policy.csv",
        ).await.unwrap();

        // Test doctor permissions
        let has_perm = enforcer.enforce(&UserRole::Doctor, "patients", "create").await.unwrap();
        assert!(has_perm, "DOCTOR should have create permission on patients");

        let has_perm = enforcer.enforce(&UserRole::Doctor, "visits", "create").await.unwrap();
        assert!(has_perm, "DOCTOR should have create permission on visits");

        // Test restricted permissions
        let has_perm = enforcer.enforce(&UserRole::Doctor, "users", "delete").await.unwrap();
        assert!(!has_perm, "DOCTOR should NOT have delete permission on users");

        let has_perm = enforcer.enforce(&UserRole::Doctor, "audit_logs", "read").await.unwrap();
        assert!(!has_perm, "DOCTOR should NOT have read permission on audit_logs");
    }

    #[tokio::test]
    async fn test_permission_requirements() {
        let perm = RequirePermission::new("patients", "create");
        assert_eq!(perm.resource, "patients");
        assert_eq!(perm.action, "create");
    }
}
