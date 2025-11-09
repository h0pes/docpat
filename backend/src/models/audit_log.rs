// Audit Log model for HIPAA compliance and security tracking
// All medical data access and modifications are logged here

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::ipnetwork::IpNetwork, PgPool};
use uuid::Uuid;

/// Audit action types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuditAction {
    Create,
    Read,
    Update,
    Delete,
    Login,
    Logout,
    Search,
    Export,
}

impl std::fmt::Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Create => write!(f, "CREATE"),
            Self::Read => write!(f, "READ"),
            Self::Update => write!(f, "UPDATE"),
            Self::Delete => write!(f, "DELETE"),
            Self::Login => write!(f, "LOGIN"),
            Self::Logout => write!(f, "LOGOUT"),
            Self::Search => write!(f, "SEARCH"),
            Self::Export => write!(f, "EXPORT"),
        }
    }
}

/// Entity types that can be audited
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EntityType {
    Patient,
    PatientInsurance,
    Visit,
    Prescription,
    Appointment,
    User,
    Document,
}

impl std::fmt::Display for EntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Patient => write!(f, "PATIENT"),
            Self::PatientInsurance => write!(f, "PATIENT_INSURANCE"),
            Self::Visit => write!(f, "VISIT"),
            Self::Prescription => write!(f, "PRESCRIPTION"),
            Self::Appointment => write!(f, "APPOINTMENT"),
            Self::User => write!(f, "USER"),
            Self::Document => write!(f, "DOCUMENT"),
        }
    }
}

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: i64,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub changes: Option<sqlx::types::JsonValue>,
    pub ip_address: Option<IpNetwork>,
    pub user_agent: Option<String>,
    pub request_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

/// Request to create an audit log entry
#[derive(Debug, Clone)]
pub struct CreateAuditLog {
    pub user_id: Option<Uuid>,
    pub action: AuditAction,
    pub entity_type: EntityType,
    pub entity_id: Option<String>,
    pub changes: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<Uuid>,
}

impl AuditLog {
    /// Create a new audit log entry (immutable once created)
    pub async fn create(pool: &PgPool, log: CreateAuditLog) -> Result<(), sqlx::Error> {
        // Parse IP address if provided
        let ip_network = if let Some(ref ip_str) = log.ip_address {
            match ip_str.parse::<IpNetwork>() {
                Ok(ip) => Some(ip),
                Err(_) => {
                    tracing::warn!("Invalid IP address format: {}", ip_str);
                    None
                }
            }
        } else {
            None
        };

        // Convert changes to JSONB
        let changes_jsonb = log.changes.map(|c| sqlx::types::JsonValue::from(c));

        sqlx::query(
            r#"
            INSERT INTO audit_logs (
                user_id, action, entity_type, entity_id,
                changes, ip_address, user_agent, request_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(log.user_id)
        .bind(log.action.to_string())
        .bind(log.entity_type.to_string())
        .bind(log.entity_id)
        .bind(changes_jsonb)
        .bind(ip_network)
        .bind(log.user_agent)
        .bind(log.request_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Get audit logs for a specific entity
    pub async fn get_by_entity(
        pool: &PgPool,
        entity_type: EntityType,
        entity_id: &str,
        limit: i64,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let logs = sqlx::query_as!(
            AuditLog,
            r#"
            SELECT
                id, user_id, action, entity_type, entity_id,
                changes, ip_address, user_agent, request_id, created_at
            FROM audit_logs
            WHERE entity_type = $1 AND entity_id = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
            entity_type.to_string(),
            entity_id,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }

    /// Get audit logs for a specific user
    pub async fn get_by_user(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let logs = sqlx::query_as!(
            AuditLog,
            r#"
            SELECT
                id, user_id, action, entity_type, entity_id,
                changes, ip_address, user_agent, request_id, created_at
            FROM audit_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
            user_id,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }

    /// Get recent audit logs (for security monitoring)
    pub async fn get_recent(
        pool: &PgPool,
        limit: i64,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let logs = sqlx::query_as!(
            AuditLog,
            r#"
            SELECT
                id, user_id, action, entity_type, entity_id,
                changes, ip_address, user_agent, request_id, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_action_display() {
        assert_eq!(AuditAction::Create.to_string(), "CREATE");
        assert_eq!(AuditAction::Read.to_string(), "READ");
        assert_eq!(AuditAction::Update.to_string(), "UPDATE");
        assert_eq!(AuditAction::Delete.to_string(), "DELETE");
    }

    #[test]
    fn test_entity_type_display() {
        assert_eq!(EntityType::Patient.to_string(), "PATIENT");
        assert_eq!(EntityType::Visit.to_string(), "VISIT");
        assert_eq!(EntityType::Prescription.to_string(), "PRESCRIPTION");
    }

    #[test]
    fn test_audit_action_serialization() {
        let action = AuditAction::Create;
        let json = serde_json::to_string(&action).unwrap();
        assert_eq!(json, "\"CREATE\"");

        let deserialized: AuditAction = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, AuditAction::Create);
    }
}
