/*!
 * Audit Log Model
 *
 * Data models for HIPAA-compliant audit logging and security tracking.
 * All medical data access and modifications are logged here.
 *
 * Key features:
 * - Immutable audit trail (enforced by database triggers)
 * - Partitioned by month for performance
 * - Comprehensive filtering and search
 * - Statistics and activity summaries
 */

use chrono::{DateTime, NaiveDate, Utc};
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

impl AuditAction {
    /// Returns all possible audit action values
    pub fn all() -> Vec<&'static str> {
        vec!["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "SEARCH", "EXPORT"]
    }

    /// Parse from string (case-insensitive)
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "CREATE" => Some(Self::Create),
            "READ" => Some(Self::Read),
            "UPDATE" => Some(Self::Update),
            "DELETE" => Some(Self::Delete),
            "LOGIN" => Some(Self::Login),
            "LOGOUT" => Some(Self::Logout),
            "SEARCH" => Some(Self::Search),
            "EXPORT" => Some(Self::Export),
            _ => None,
        }
    }
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
    Diagnosis,
    Appointment,
    User,
    Document,
    Holiday,
    WorkingHours,
    SystemSetting,
    File,
    Template,
    Notification,
}

impl EntityType {
    /// Returns all possible entity type values
    pub fn all() -> Vec<&'static str> {
        vec![
            "PATIENT", "PATIENT_INSURANCE", "VISIT", "PRESCRIPTION", "DIAGNOSIS",
            "APPOINTMENT", "USER", "DOCUMENT", "HOLIDAY", "WORKING_HOURS", "SYSTEM_SETTING",
            "FILE", "TEMPLATE", "NOTIFICATION"
        ]
    }

    /// Parse from string (case-insensitive)
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "PATIENT" => Some(Self::Patient),
            "PATIENT_INSURANCE" => Some(Self::PatientInsurance),
            "VISIT" => Some(Self::Visit),
            "PRESCRIPTION" => Some(Self::Prescription),
            "DIAGNOSIS" => Some(Self::Diagnosis),
            "APPOINTMENT" => Some(Self::Appointment),
            "USER" => Some(Self::User),
            "DOCUMENT" => Some(Self::Document),
            "HOLIDAY" => Some(Self::Holiday),
            "WORKING_HOURS" => Some(Self::WorkingHours),
            "SYSTEM_SETTING" => Some(Self::SystemSetting),
            "FILE" => Some(Self::File),
            "TEMPLATE" => Some(Self::Template),
            "NOTIFICATION" => Some(Self::Notification),
            _ => None,
        }
    }
}

impl std::fmt::Display for EntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Patient => write!(f, "PATIENT"),
            Self::PatientInsurance => write!(f, "PATIENT_INSURANCE"),
            Self::Visit => write!(f, "VISIT"),
            Self::Prescription => write!(f, "PRESCRIPTION"),
            Self::Diagnosis => write!(f, "DIAGNOSIS"),
            Self::Appointment => write!(f, "APPOINTMENT"),
            Self::User => write!(f, "USER"),
            Self::Document => write!(f, "DOCUMENT"),
            Self::Holiday => write!(f, "HOLIDAY"),
            Self::WorkingHours => write!(f, "WORKING_HOURS"),
            Self::SystemSetting => write!(f, "SYSTEM_SETTING"),
            Self::File => write!(f, "FILE"),
            Self::Template => write!(f, "TEMPLATE"),
            Self::Notification => write!(f, "NOTIFICATION"),
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

// ============================================================================
// API Response DTOs
// ============================================================================

/// Response DTO for a single audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogResponse {
    pub id: i64,
    pub user_id: Option<Uuid>,
    pub user_email: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub changes: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl From<AuditLog> for AuditLogResponse {
    fn from(log: AuditLog) -> Self {
        Self {
            id: log.id,
            user_id: log.user_id,
            user_email: None, // Will be populated by service layer
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            changes: log.changes.map(|v| serde_json::Value::from(v)),
            ip_address: log.ip_address.map(|ip| ip.to_string()),
            user_agent: log.user_agent,
            request_id: log.request_id,
            created_at: log.created_at,
        }
    }
}

/// Response DTO for paginated list of audit logs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListAuditLogsResponse {
    pub logs: Vec<AuditLogResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

// ============================================================================
// Query Filter DTOs
// ============================================================================

/// Filter parameters for querying audit logs
#[derive(Debug, Clone, Deserialize, Default)]
pub struct AuditLogsFilter {
    /// Filter by user ID
    pub user_id: Option<Uuid>,
    /// Filter by action type (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, SEARCH, EXPORT)
    pub action: Option<String>,
    /// Filter by entity type (PATIENT, VISIT, etc.)
    pub entity_type: Option<String>,
    /// Filter by specific entity ID
    pub entity_id: Option<String>,
    /// Filter logs from this date (inclusive)
    pub date_from: Option<NaiveDate>,
    /// Filter logs until this date (inclusive)
    pub date_to: Option<NaiveDate>,
    /// Filter by IP address (partial match)
    pub ip_address: Option<String>,
    /// Page number (1-indexed)
    #[serde(default = "default_page")]
    pub page: i64,
    /// Number of items per page (max 100)
    #[serde(default = "default_page_size")]
    pub page_size: i64,
    /// Sort by column (created_at, action, entity_type, user_email)
    #[serde(default = "default_sort_by")]
    pub sort_by: String,
    /// Sort order (asc or desc)
    #[serde(default = "default_sort_order")]
    pub sort_order: String,
}

fn default_sort_by() -> String {
    "created_at".to_string()
}

fn default_sort_order() -> String {
    "desc".to_string()
}

fn default_page() -> i64 {
    1
}

fn default_page_size() -> i64 {
    50
}

impl AuditLogsFilter {
    /// Valid columns for sorting
    const VALID_SORT_COLUMNS: &'static [&'static str] = &[
        "created_at",
        "action",
        "entity_type",
        "user_email",
    ];

    /// Validate and sanitize filter parameters
    pub fn validate(&mut self) {
        if self.page < 1 {
            self.page = 1;
        }
        if self.page_size < 1 {
            self.page_size = 50;
        }
        if self.page_size > 100 {
            self.page_size = 100;
        }
        // Validate sort_by (prevent SQL injection)
        if !Self::VALID_SORT_COLUMNS.contains(&self.sort_by.as_str()) {
            self.sort_by = "created_at".to_string();
        }
        // Validate sort_order
        if self.sort_order != "asc" && self.sort_order != "desc" {
            self.sort_order = "desc".to_string();
        }
    }

    /// Get the ORDER BY clause for the query
    pub fn order_by_clause(&self) -> String {
        let order = if self.sort_order == "asc" { "ASC" } else { "DESC" };
        // Map frontend column names to database column names
        let column = match self.sort_by.as_str() {
            "user_email" => "u.email".to_string(),
            "created_at" => "al.created_at".to_string(),
            "action" => "al.action".to_string(),
            "entity_type" => "al.entity_type".to_string(),
            _ => "al.created_at".to_string(),
        };
        format!("{} {} NULLS LAST", column, order)
    }

    /// Calculate offset for pagination
    pub fn offset(&self) -> i64 {
        (self.page - 1) * self.page_size
    }
}

// ============================================================================
// Statistics DTOs
// ============================================================================

/// Statistics summary for audit logs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogStatistics {
    pub total_logs: i64,
    pub logs_today: i64,
    pub logs_this_week: i64,
    pub logs_this_month: i64,
    pub actions_breakdown: Vec<ActionCount>,
    pub entity_types_breakdown: Vec<EntityTypeCount>,
    pub top_users: Vec<UserActivityCount>,
}

/// Count of logs by action type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionCount {
    pub action: String,
    pub count: i64,
}

/// Count of logs by entity type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityTypeCount {
    pub entity_type: String,
    pub count: i64,
}

/// Count of logs by user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserActivityCount {
    pub user_id: Uuid,
    pub user_email: Option<String>,
    pub count: i64,
}

// ============================================================================
// User Activity DTOs
// ============================================================================

/// Summary of a user's activity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserActivitySummary {
    pub user_id: Uuid,
    pub user_email: Option<String>,
    pub total_actions: i64,
    pub first_activity: Option<DateTime<Utc>>,
    pub last_activity: Option<DateTime<Utc>>,
    pub actions_breakdown: Vec<ActionCount>,
    pub recent_logs: Vec<AuditLogResponse>,
}

// ============================================================================
// Export DTOs
// ============================================================================

/// Export format options
#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Csv,
    Json,
}

impl Default for ExportFormat {
    fn default() -> Self {
        Self::Csv
    }
}

/// Request parameters for exporting audit logs
#[derive(Debug, Clone, Deserialize)]
pub struct ExportAuditLogsRequest {
    /// Filter parameters (same as list endpoint)
    #[serde(flatten)]
    pub filter: AuditLogsFilter,
    /// Export format (csv or json)
    #[serde(default)]
    pub format: ExportFormat,
    /// Maximum number of records to export (default: 10000, max: 50000)
    #[serde(default = "default_export_limit")]
    pub limit: i64,
}

fn default_export_limit() -> i64 {
    10000
}

impl ExportAuditLogsRequest {
    /// Validate and sanitize export parameters
    pub fn validate(&mut self) {
        self.filter.validate();
        if self.limit < 1 {
            self.limit = 10000;
        }
        if self.limit > 50000 {
            self.limit = 50000;
        }
    }
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
    fn test_audit_action_from_str() {
        assert_eq!(AuditAction::from_str("CREATE"), Some(AuditAction::Create));
        assert_eq!(AuditAction::from_str("create"), Some(AuditAction::Create));
        assert_eq!(AuditAction::from_str("LOGIN"), Some(AuditAction::Login));
        assert_eq!(AuditAction::from_str("INVALID"), None);
    }

    #[test]
    fn test_entity_type_display() {
        assert_eq!(EntityType::Patient.to_string(), "PATIENT");
        assert_eq!(EntityType::Visit.to_string(), "VISIT");
        assert_eq!(EntityType::Prescription.to_string(), "PRESCRIPTION");
        assert_eq!(EntityType::Holiday.to_string(), "HOLIDAY");
        assert_eq!(EntityType::WorkingHours.to_string(), "WORKING_HOURS");
        assert_eq!(EntityType::SystemSetting.to_string(), "SYSTEM_SETTING");
    }

    #[test]
    fn test_entity_type_from_str() {
        assert_eq!(EntityType::from_str("PATIENT"), Some(EntityType::Patient));
        assert_eq!(EntityType::from_str("patient"), Some(EntityType::Patient));
        assert_eq!(EntityType::from_str("HOLIDAY"), Some(EntityType::Holiday));
        assert_eq!(EntityType::from_str("WORKING_HOURS"), Some(EntityType::WorkingHours));
        assert_eq!(EntityType::from_str("INVALID"), None);
    }

    #[test]
    fn test_audit_action_serialization() {
        let action = AuditAction::Create;
        let json = serde_json::to_string(&action).unwrap();
        assert_eq!(json, "\"CREATE\"");

        let deserialized: AuditAction = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, AuditAction::Create);
    }

    #[test]
    fn test_audit_logs_filter_validation() {
        let mut filter = AuditLogsFilter {
            page: 0,
            page_size: 200,
            ..Default::default()
        };
        filter.validate();
        assert_eq!(filter.page, 1);
        assert_eq!(filter.page_size, 100);
    }

    #[test]
    fn test_audit_logs_filter_offset() {
        let filter = AuditLogsFilter {
            page: 3,
            page_size: 25,
            ..Default::default()
        };
        assert_eq!(filter.offset(), 50);
    }

    #[test]
    fn test_export_format_default() {
        let format = ExportFormat::default();
        assert_eq!(format, ExportFormat::Csv);
    }

    #[test]
    fn test_export_request_validation() {
        let mut request = ExportAuditLogsRequest {
            filter: AuditLogsFilter::default(),
            format: ExportFormat::Json,
            limit: 100000,
        };
        request.validate();
        assert_eq!(request.limit, 50000); // capped at max
    }
}
