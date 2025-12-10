/*!
 * Audit Log Service
 *
 * Service layer for querying and managing audit logs.
 * Provides comprehensive filtering, statistics, and export functionality.
 *
 * Key features:
 * - Optimized queries for partitioned audit_logs table
 * - Rich filtering (by user, action, entity, date range)
 * - Statistics and activity summaries
 * - CSV/JSON export with rate limiting consideration
 * - User activity tracking
 */

use chrono::{DateTime, Duration, NaiveDate, Utc};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::models::audit_log::{
    ActionCount, AuditLog, AuditLogResponse, AuditLogStatistics, AuditLogsFilter,
    EntityTypeCount, ExportAuditLogsRequest, ExportFormat, ListAuditLogsResponse,
    UserActivityCount, UserActivitySummary,
};

/// Service for querying audit logs
pub struct AuditLogService {
    pool: PgPool,
}

impl AuditLogService {
    /// Create a new AuditLogService instance
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// List audit logs with filtering and pagination
    ///
    /// Supports filtering by:
    /// - user_id: Filter by specific user
    /// - action: Filter by action type (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, SEARCH, EXPORT)
    /// - entity_type: Filter by entity type (PATIENT, VISIT, etc.)
    /// - entity_id: Filter by specific entity ID
    /// - date_from/date_to: Filter by date range
    /// - ip_address: Filter by IP address (partial match)
    pub async fn list_logs(
        &self,
        mut filter: AuditLogsFilter,
    ) -> Result<ListAuditLogsResponse, sqlx::Error> {
        filter.validate();

        // Build dynamic WHERE clause
        let mut conditions: Vec<String> = vec![];
        let mut param_idx = 1;

        if filter.user_id.is_some() {
            conditions.push(format!("user_id = ${}", param_idx));
            param_idx += 1;
        }
        if filter.action.is_some() {
            conditions.push(format!("action = ${}", param_idx));
            param_idx += 1;
        }
        if filter.entity_type.is_some() {
            conditions.push(format!("entity_type = ${}", param_idx));
            param_idx += 1;
        }
        if filter.entity_id.is_some() {
            conditions.push(format!("entity_id = ${}", param_idx));
            param_idx += 1;
        }
        if filter.date_from.is_some() {
            conditions.push(format!("created_at >= ${}::date", param_idx));
            param_idx += 1;
        }
        if filter.date_to.is_some() {
            conditions.push(format!("created_at < (${}::date + interval '1 day')", param_idx));
            param_idx += 1;
        }
        if filter.ip_address.is_some() {
            conditions.push(format!("ip_address::text LIKE '%' || ${} || '%'", param_idx));
            param_idx += 1;
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Get total count
        let count_query = format!(
            "SELECT COUNT(*) as count FROM audit_logs {}",
            where_clause
        );

        // Build the count query with bindings
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);

        if let Some(ref user_id) = filter.user_id {
            count_builder = count_builder.bind(user_id);
        }
        if let Some(ref action) = filter.action {
            count_builder = count_builder.bind(action);
        }
        if let Some(ref entity_type) = filter.entity_type {
            count_builder = count_builder.bind(entity_type);
        }
        if let Some(ref entity_id) = filter.entity_id {
            count_builder = count_builder.bind(entity_id);
        }
        if let Some(ref date_from) = filter.date_from {
            count_builder = count_builder.bind(date_from);
        }
        if let Some(ref date_to) = filter.date_to {
            count_builder = count_builder.bind(date_to);
        }
        if let Some(ref ip_address) = filter.ip_address {
            count_builder = count_builder.bind(ip_address);
        }

        let total = count_builder.fetch_one(&self.pool).await?;

        // Get paginated results
        let data_query = format!(
            r#"
            SELECT
                al.id, al.user_id, al.action, al.entity_type, al.entity_id,
                al.changes, al.ip_address, al.user_agent, al.request_id, al.created_at,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            {}
            ORDER BY al.created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            where_clause,
            param_idx,
            param_idx + 1
        );

        // We need to use a raw query approach for dynamic binding
        // Let's use a simpler fixed query approach with optional parameters
        let logs = self.fetch_logs_with_filter(&filter).await?;

        let total_pages = (total as f64 / filter.page_size as f64).ceil() as i64;

        Ok(ListAuditLogsResponse {
            logs,
            total,
            page: filter.page,
            page_size: filter.page_size,
            total_pages,
        })
    }

    /// Internal method to fetch logs with dynamic filters
    async fn fetch_logs_with_filter(
        &self,
        filter: &AuditLogsFilter,
    ) -> Result<Vec<AuditLogResponse>, sqlx::Error> {
        // Use a single query with optional parameter checks
        // This is more efficient than building dynamic SQL
        let logs = sqlx::query_as!(
            AuditLogWithEmail,
            r#"
            SELECT
                al.id,
                al.user_id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.changes,
                al.ip_address,
                al.user_agent,
                al.request_id,
                al.created_at,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE
                ($1::uuid IS NULL OR al.user_id = $1)
                AND ($2::text IS NULL OR al.action = $2)
                AND ($3::text IS NULL OR al.entity_type = $3)
                AND ($4::text IS NULL OR al.entity_id = $4)
                AND ($5::date IS NULL OR al.created_at >= $5::date)
                AND ($6::date IS NULL OR al.created_at < ($6::date + interval '1 day'))
                AND ($7::text IS NULL OR al.ip_address::text LIKE '%' || $7 || '%')
            ORDER BY al.created_at DESC
            LIMIT $8 OFFSET $9
            "#,
            filter.user_id,
            filter.action.as_deref(),
            filter.entity_type.as_deref(),
            filter.entity_id.as_deref(),
            filter.date_from,
            filter.date_to,
            filter.ip_address.as_deref(),
            filter.page_size,
            filter.offset()
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(logs.into_iter().map(|l| l.into()).collect())
    }

    /// Get a single audit log by ID
    pub async fn get_log(&self, id: i64) -> Result<Option<AuditLogResponse>, sqlx::Error> {
        let log = sqlx::query_as!(
            AuditLogWithEmail,
            r#"
            SELECT
                al.id,
                al.user_id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.changes,
                al.ip_address,
                al.user_agent,
                al.request_id,
                al.created_at,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(log.map(|l| l.into()))
    }

    /// Get audit log statistics
    pub async fn get_statistics(&self) -> Result<AuditLogStatistics, sqlx::Error> {
        let now = Utc::now();
        let today = now.date_naive();
        let week_ago = today - Duration::days(7);
        let month_ago = today - Duration::days(30);

        // Total count
        let total_logs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM audit_logs")
            .fetch_one(&self.pool)
            .await?;

        // Count for today
        let logs_today: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM audit_logs WHERE created_at >= $1::date"
        )
        .bind(today)
        .fetch_one(&self.pool)
        .await?;

        // Count for this week
        let logs_this_week: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM audit_logs WHERE created_at >= $1::date"
        )
        .bind(week_ago)
        .fetch_one(&self.pool)
        .await?;

        // Count for this month
        let logs_this_month: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM audit_logs WHERE created_at >= $1::date"
        )
        .bind(month_ago)
        .fetch_one(&self.pool)
        .await?;

        // Actions breakdown
        let actions_breakdown = sqlx::query_as!(
            ActionCount,
            r#"
            SELECT action, COUNT(*)::bigint as "count!"
            FROM audit_logs
            GROUP BY action
            ORDER BY 2 DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        // Entity types breakdown
        let entity_types_breakdown = sqlx::query_as!(
            EntityTypeCount,
            r#"
            SELECT entity_type, COUNT(*)::bigint as "count!"
            FROM audit_logs
            GROUP BY entity_type
            ORDER BY 2 DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        // Top users (last 30 days)
        let top_users = sqlx::query_as!(
            UserActivityCountRow,
            r#"
            SELECT
                al.user_id as "user_id!",
                u.email as user_email,
                COUNT(*)::bigint as "count!"
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.user_id IS NOT NULL
              AND al.created_at >= $1::date
            GROUP BY al.user_id, u.email
            ORDER BY 3 DESC
            LIMIT 10
            "#,
            month_ago
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(AuditLogStatistics {
            total_logs,
            logs_today,
            logs_this_week,
            logs_this_month,
            actions_breakdown,
            entity_types_breakdown,
            top_users: top_users.into_iter().map(|u| u.into()).collect(),
        })
    }

    /// Get user activity summary
    pub async fn get_user_activity(
        &self,
        user_id: Uuid,
    ) -> Result<Option<UserActivitySummary>, sqlx::Error> {
        // Check if user exists
        let user_email: Option<String> = sqlx::query_scalar(
            "SELECT email FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        // Get activity summary
        let summary = sqlx::query!(
            r#"
            SELECT
                COUNT(*)::bigint as "total_actions!",
                MIN(created_at) as first_activity,
                MAX(created_at) as last_activity
            FROM audit_logs
            WHERE user_id = $1
            "#,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        if summary.total_actions == 0 {
            return Ok(None);
        }

        // Get actions breakdown for this user
        let actions_breakdown = sqlx::query_as!(
            ActionCount,
            r#"
            SELECT action, COUNT(*)::bigint as "count!"
            FROM audit_logs
            WHERE user_id = $1
            GROUP BY action
            ORDER BY 2 DESC
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        // Get recent logs (last 20)
        let recent_logs = sqlx::query_as!(
            AuditLogWithEmail,
            r#"
            SELECT
                al.id,
                al.user_id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.changes,
                al.ip_address,
                al.user_agent,
                al.request_id,
                al.created_at,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.user_id = $1
            ORDER BY al.created_at DESC
            LIMIT 20
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(Some(UserActivitySummary {
            user_id,
            user_email,
            total_actions: summary.total_actions,
            first_activity: summary.first_activity,
            last_activity: summary.last_activity,
            actions_breakdown,
            recent_logs: recent_logs.into_iter().map(|l| l.into()).collect(),
        }))
    }

    /// Export audit logs (returns data for export)
    ///
    /// This method returns data that can be formatted as CSV or JSON.
    /// Rate limiting should be applied at the handler level.
    pub async fn export_logs(
        &self,
        mut request: ExportAuditLogsRequest,
    ) -> Result<Vec<AuditLogResponse>, sqlx::Error> {
        request.validate();

        let logs = sqlx::query_as!(
            AuditLogWithEmail,
            r#"
            SELECT
                al.id,
                al.user_id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.changes,
                al.ip_address,
                al.user_agent,
                al.request_id,
                al.created_at,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE
                ($1::uuid IS NULL OR al.user_id = $1)
                AND ($2::text IS NULL OR al.action = $2)
                AND ($3::text IS NULL OR al.entity_type = $3)
                AND ($4::text IS NULL OR al.entity_id = $4)
                AND ($5::date IS NULL OR al.created_at >= $5::date)
                AND ($6::date IS NULL OR al.created_at < ($6::date + interval '1 day'))
                AND ($7::text IS NULL OR al.ip_address::text LIKE '%' || $7 || '%')
            ORDER BY al.created_at DESC
            LIMIT $8
            "#,
            request.filter.user_id,
            request.filter.action.as_deref(),
            request.filter.entity_type.as_deref(),
            request.filter.entity_id.as_deref(),
            request.filter.date_from,
            request.filter.date_to,
            request.filter.ip_address.as_deref(),
            request.limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(logs.into_iter().map(|l| l.into()).collect())
    }

    /// Generate CSV string from audit logs
    pub fn generate_csv(logs: &[AuditLogResponse]) -> String {
        let mut csv = String::from("id,user_id,user_email,action,entity_type,entity_id,ip_address,user_agent,request_id,created_at\n");

        for log in logs {
            csv.push_str(&format!(
                "{},{},{},{},{},{},{},{},{},{}\n",
                log.id,
                log.user_id.map(|u| u.to_string()).unwrap_or_default(),
                log.user_email.as_deref().unwrap_or(""),
                log.action,
                log.entity_type,
                log.entity_id.as_deref().unwrap_or(""),
                log.ip_address.as_deref().unwrap_or(""),
                Self::escape_csv_field(log.user_agent.as_deref().unwrap_or("")),
                log.request_id.map(|r| r.to_string()).unwrap_or_default(),
                log.created_at.to_rfc3339()
            ));
        }

        csv
    }

    /// Escape a CSV field (handles quotes and commas)
    fn escape_csv_field(field: &str) -> String {
        if field.contains(',') || field.contains('"') || field.contains('\n') {
            format!("\"{}\"", field.replace('"', "\"\""))
        } else {
            field.to_string()
        }
    }
}

// ============================================================================
// Internal DTOs for database queries
// ============================================================================

/// Internal struct for fetching audit logs with user email
#[derive(Debug)]
struct AuditLogWithEmail {
    id: i64,
    user_id: Option<Uuid>,
    action: String,
    entity_type: String,
    entity_id: Option<String>,
    changes: Option<sqlx::types::JsonValue>,
    ip_address: Option<sqlx::types::ipnetwork::IpNetwork>,
    user_agent: Option<String>,
    request_id: Option<Uuid>,
    created_at: DateTime<Utc>,
    user_email: Option<String>,
}

impl From<AuditLogWithEmail> for AuditLogResponse {
    fn from(log: AuditLogWithEmail) -> Self {
        Self {
            id: log.id,
            user_id: log.user_id,
            user_email: log.user_email,
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

/// Internal struct for user activity count queries
#[derive(Debug)]
struct UserActivityCountRow {
    user_id: Uuid,
    user_email: Option<String>,
    count: i64,
}

impl From<UserActivityCountRow> for UserActivityCount {
    fn from(row: UserActivityCountRow) -> Self {
        Self {
            user_id: row.user_id,
            user_email: row.user_email,
            count: row.count,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csv_escape_simple() {
        assert_eq!(AuditLogService::escape_csv_field("simple"), "simple");
    }

    #[test]
    fn test_csv_escape_with_comma() {
        assert_eq!(
            AuditLogService::escape_csv_field("has,comma"),
            "\"has,comma\""
        );
    }

    #[test]
    fn test_csv_escape_with_quotes() {
        assert_eq!(
            AuditLogService::escape_csv_field("has\"quote"),
            "\"has\"\"quote\""
        );
    }

    #[test]
    fn test_csv_escape_with_newline() {
        assert_eq!(
            AuditLogService::escape_csv_field("has\nnewline"),
            "\"has\nnewline\""
        );
    }
}
