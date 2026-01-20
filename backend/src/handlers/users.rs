//! User Management Handlers
//!
//! CRUD operations for user management, restricted by RBAC permissions

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::handlers::auth::AppState;
use crate::models::user::{User, UserRole};
use crate::models::{AuditAction, AuditLog, CreateAuditLog, EntityType, RequestContext};
use crate::utils::password::{validate_password, PasswordHasherUtil};

#[cfg(feature = "rbac")]
use crate::utils::permissions::{require_admin, require_user_access};

/// Request body for creating a new user
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub role: UserRole,
    pub first_name: String,
    pub last_name: String,
    pub phone: Option<String>,
}

/// Request body for updating a user
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
    /// Only admins can change roles
    pub role: Option<UserRole>,
}

/// Request body for role assignment
#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub role: UserRole,
}

/// Request body for password reset
#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

/// Response for user operations
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub first_name: String,
    pub last_name: String,
    pub phone: Option<String>,
    pub is_active: bool,
    pub mfa_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_login: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<User> for UserResponse {
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
            mfa_enabled: user.mfa_enabled,
            created_at: user.created_at,
            last_login: user.last_login,
        }
    }
}

/// List users response
#[derive(Debug, Serialize)]
pub struct ListUsersResponse {
    pub users: Vec<UserResponse>,
    pub total: i64,
    pub offset: i64,
    pub limit: i64,
}

/// Query parameters for listing users
#[derive(Debug, Deserialize)]
pub struct ListUsersQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub role: Option<UserRole>,
    pub is_active: Option<bool>,
    pub search: Option<String>,
}

fn default_limit() -> i64 {
    20
}

/// Create a new user (ADMIN only)
pub async fn create_user(
    State(state): State<AppState>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<UserResponse>), (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Validate password complexity
    validate_password(&req.password).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "INVALID_PASSWORD",
                "message": e
            })),
        )
    })?;

    // Hash password
    let password_hash = PasswordHasherUtil::hash_password(&req.password).map_err(|e| {
        tracing::error!("Password hashing error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to process password"
            })),
        )
    })?;

    // Create user in database
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *
        "#
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.role)
    .bind(&req.first_name)
    .bind(&req.last_name)
    .bind(&req.phone)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error creating user: {}", e);
        match e {
            sqlx::Error::Database(db_err) if db_err.constraint().is_some() => {
                (
                    StatusCode::CONFLICT,
                    Json(serde_json::json!({
                        "error": "USER_EXISTS",
                        "message": "A user with this username or email already exists"
                    })),
                )
            }
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "INTERNAL_ERROR",
                    "message": "Failed to create user"
                })),
            ),
        }
    })?;

    // Create audit log for user creation
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Create,
            entity_type: EntityType::User,
            entity_id: Some(user.id.to_string()),
            changes: Some(serde_json::json!({
                "username": user.username,
                "email": user.email,
                "role": format!("{:?}", user.role),
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::CREATED, Json(UserResponse::from(user))))
}

/// Get user by ID (ADMIN or own user)
pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    // Extension to get current user info (set by auth middleware)
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_user_access(&current_user_id, &user_id, &user_role)?;

    let user = User::find_by_id(pool, &user_id)
        .await
        .map_err(|e| {
            tracing::error!("Database error fetching user: {}", e);
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "USER_NOT_FOUND",
                    "message": "User not found"
                })),
            )
        })?;

    Ok(Json(UserResponse::from(user)))
}

/// Update user (ADMIN or own user with restrictions)
pub async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_user_access(&current_user_id, &user_id, &user_role)?;

    // Only admins can change roles
    if req.role.is_some() {
        #[cfg(feature = "rbac")]
        require_admin(&user_role)?;
    }

    // Check if there are any updates
    if req.email.is_none() && req.first_name.is_none() && req.last_name.is_none() && req.phone.is_none() && req.role.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "NO_UPDATES",
                "message": "No fields to update"
            })),
        ));
    }

    // Fetch current user
    let mut user = User::find_by_id(pool, &user_id)
        .await
        .map_err(|e| {
            tracing::error!("Database error fetching user: {}", e);
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "USER_NOT_FOUND",
                    "message": "User not found"
                })),
            )
        })?;

    // Update fields
    if let Some(email) = req.email.clone() {
        user.email = email;
    }
    if let Some(first_name) = req.first_name.clone() {
        user.first_name = first_name;
    }
    if let Some(last_name) = req.last_name.clone() {
        user.last_name = last_name;
    }
    if let Some(phone) = req.phone.clone() {
        user.phone = Some(phone);
    }
    if let Some(role) = req.role.clone() {
        user.role = role;
    }

    // Execute update
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET email = $1, first_name = $2, last_name = $3, phone = $4, role = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *
        "#
    )
    .bind(&user.email)
    .bind(&user.first_name)
    .bind(&user.last_name)
    .bind(&user.phone)
    .bind(&user.role)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error updating user: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to update user"
            })),
        )
    })?;

    // Create audit log for user update
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Update,
            entity_type: EntityType::User,
            entity_id: Some(user_id.to_string()),
            changes: Some(serde_json::json!({
                "email": req.email,
                "first_name": req.first_name,
                "last_name": req.last_name,
                "phone": req.phone,
                "role": req.role.map(|r| format!("{:?}", r)),
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(UserResponse::from(user)))
}

/// List all users with pagination and filters (ADMIN only)
pub async fn list_users(
    State(state): State<AppState>,
    Extension(user_role): Extension<UserRole>,
    Query(query): Query<ListUsersQuery>,
) -> Result<Json<ListUsersResponse>, (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Build parameterized query with sqlx::QueryBuilder to prevent SQL injection
    use sqlx::QueryBuilder;

    // Count query
    let mut count_builder: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("SELECT COUNT(*) as count FROM users WHERE 1=1");

    if let Some(role) = &query.role {
        count_builder.push(" AND role = ");
        count_builder.push_bind(role.to_string());
    }
    if let Some(is_active) = query.is_active {
        count_builder.push(" AND is_active = ");
        count_builder.push_bind(is_active);
    }
    if let Some(search) = &query.search {
        let search_pattern = format!("%{}%", search);
        count_builder.push(" AND (username ILIKE ");
        count_builder.push_bind(search_pattern.clone());
        count_builder.push(" OR email ILIKE ");
        count_builder.push_bind(search_pattern.clone());
        count_builder.push(" OR first_name ILIKE ");
        count_builder.push_bind(search_pattern.clone());
        count_builder.push(" OR last_name ILIKE ");
        count_builder.push_bind(search_pattern);
        count_builder.push(")");
    }

    let total: (i64,) = count_builder
        .build_query_as()
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("Database error counting users: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "INTERNAL_ERROR",
                    "message": "Failed to count users"
                })),
            )
        })?;

    // Users query with same filters
    let mut users_builder: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("SELECT * FROM users WHERE 1=1");

    if let Some(role) = &query.role {
        users_builder.push(" AND role = ");
        users_builder.push_bind(role.to_string());
    }
    if let Some(is_active) = query.is_active {
        users_builder.push(" AND is_active = ");
        users_builder.push_bind(is_active);
    }
    if let Some(search) = &query.search {
        let search_pattern = format!("%{}%", search);
        users_builder.push(" AND (username ILIKE ");
        users_builder.push_bind(search_pattern.clone());
        users_builder.push(" OR email ILIKE ");
        users_builder.push_bind(search_pattern.clone());
        users_builder.push(" OR first_name ILIKE ");
        users_builder.push_bind(search_pattern.clone());
        users_builder.push(" OR last_name ILIKE ");
        users_builder.push_bind(search_pattern);
        users_builder.push(")");
    }

    users_builder.push(" ORDER BY created_at DESC LIMIT ");
    users_builder.push_bind(query.limit);
    users_builder.push(" OFFSET ");
    users_builder.push_bind(query.offset);

    let users: Vec<User> = users_builder
        .build_query_as()
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("Database error fetching users: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "INTERNAL_ERROR",
                    "message": "Failed to fetch users"
                })),
            )
        })?;

    Ok(Json(ListUsersResponse {
        users: users.into_iter().map(UserResponse::from).collect(),
        total: total.0,
        offset: query.offset,
        limit: query.limit,
    }))
}

/// Deactivate user (ADMIN only)
pub async fn deactivate_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
) -> Result<(StatusCode, Json<UserResponse>), (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error deactivating user: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to deactivate user"
            })),
        )
    })?;

    // Create audit log for user deactivation
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Update,
            entity_type: EntityType::User,
            entity_id: Some(user_id.to_string()),
            changes: Some(serde_json::json!({
                "action": "deactivate",
                "is_active": false,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::OK, Json(UserResponse::from(user))))
}

/// Activate user (ADMIN only)
pub async fn activate_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
) -> Result<(StatusCode, Json<UserResponse>), (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error activating user: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to activate user"
            })),
        )
    })?;

    // Create audit log for user activation
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Update,
            entity_type: EntityType::User,
            entity_id: Some(user_id.to_string()),
            changes: Some(serde_json::json!({
                "action": "activate",
                "is_active": true,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok((StatusCode::OK, Json(UserResponse::from(user))))
}

/// Assign role to user (ADMIN only)
pub async fn assign_role(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<AssignRoleRequest>,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *"
    )
    .bind(&req.role)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error assigning role: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to assign role"
            })),
        )
    })?;

    // Create audit log for role assignment
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Update,
            entity_type: EntityType::User,
            entity_id: Some(user_id.to_string()),
            changes: Some(serde_json::json!({
                "action": "assign_role",
                "new_role": format!("{:?}", req.role),
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(Json(UserResponse::from(user)))
}

/// Reset user password (ADMIN only)
pub async fn reset_password(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
    Json(req): Json<ResetPasswordRequest>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Validate password complexity
    validate_password(&req.new_password).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "INVALID_PASSWORD",
                "message": e
            })),
        )
    })?;

    // Hash password
    let password_hash = PasswordHasherUtil::hash_password(&req.new_password).map_err(|e| {
        tracing::error!("Password hashing error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to process password"
            })),
        )
    })?;

    // Reset failed login attempts and update password
    sqlx::query(
        "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2"
    )
    .bind(&password_hash)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error resetting password: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to reset password"
            })),
        )
    })?;

    // Create audit log for password reset (don't log the actual password!)
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Update,
            entity_type: EntityType::User,
            entity_id: Some(user_id.to_string()),
            changes: Some(serde_json::json!({
                "action": "reset_password",
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    Ok(StatusCode::NO_CONTENT)
}

/// Reset user MFA (ADMIN only)
///
/// Clears MFA secret, backup codes, and disables MFA for the user.
/// This allows the user to re-enroll in MFA.
pub async fn reset_mfa(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Extension(current_user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Extension(request_ctx): Extension<RequestContext>,
) -> Result<(StatusCode, Json<UserResponse>), (StatusCode, Json<serde_json::Value>)> {
    let pool = &state.pool;
    #[cfg(feature = "rbac")]
    require_admin(&user_role)?;

    // Verify user exists first
    let _existing = User::find_by_id(pool, &user_id)
        .await
        .map_err(|e| {
            tracing::error!("Database error fetching user for MFA reset: {}", e);
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "USER_NOT_FOUND",
                    "message": "User not found"
                })),
            )
        })?;

    // Reset MFA: clear secret, backup codes, and disable MFA
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET mfa_secret = NULL, mfa_enabled = false, backup_codes = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error resetting MFA for user {}: {}", user_id, e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "INTERNAL_ERROR",
                "message": "Failed to reset MFA"
            })),
        )
    })?;

    // Create audit log for MFA reset
    let _ = AuditLog::create(
        pool,
        CreateAuditLog {
            user_id: Some(current_user_id),
            action: AuditAction::Update,
            entity_type: EntityType::User,
            entity_id: Some(user_id.to_string()),
            changes: Some(serde_json::json!({
                "action": "reset_mfa",
                "mfa_enabled": false,
            })),
            ip_address: request_ctx.ip_address.clone(),
            user_agent: request_ctx.user_agent.clone(),
            request_id: Some(request_ctx.request_id),
        },
    )
    .await;

    tracing::info!("MFA reset successfully for user: {}", user_id);

    Ok((StatusCode::OK, Json(UserResponse::from(user))))
}
