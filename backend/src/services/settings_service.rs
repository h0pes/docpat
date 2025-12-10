/*!
 * Settings Service
 *
 * Handles business logic for system settings management including:
 * - CRUD operations for settings
 * - Settings validation by value type
 * - In-memory caching with TTL
 * - Settings change audit logging
 * - Bulk update operations
 */

use crate::models::{
    AuditAction, AuditLog, CreateAuditLog, EntityType,
};
use crate::models::system_setting::{
    BulkUpdateSettingsRequest, ListSettingGroupsResponse, ListSettingsResponse, SettingChangeAudit,
    SettingGroupInfo, SettingsFilter, SettingValueType, SystemSetting, SystemSettingResponse,
    UpdateSettingRequest,
};
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};
use uuid::Uuid;

/// Cache entry with TTL
struct CacheEntry {
    value: SystemSettingResponse,
    expires_at: Instant,
}

/// Settings Service for managing system configuration
pub struct SettingsService {
    pool: PgPool,
    /// In-memory cache for settings
    cache: RwLock<HashMap<String, CacheEntry>>,
    /// Cache TTL duration
    cache_ttl: Duration,
}

impl SettingsService {
    /// Create new settings service with default cache TTL (5 minutes)
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            cache: RwLock::new(HashMap::new()),
            cache_ttl: Duration::from_secs(300),
        }
    }

    /// Create new settings service with custom cache TTL
    pub fn with_cache_ttl(pool: PgPool, cache_ttl: Duration) -> Self {
        Self {
            pool,
            cache: RwLock::new(HashMap::new()),
            cache_ttl,
        }
    }

    // ==================== Cache Operations ====================

    /// Get setting from cache if not expired
    fn get_from_cache(&self, key: &str) -> Option<SystemSettingResponse> {
        let cache = self.cache.read().ok()?;
        if let Some(entry) = cache.get(key) {
            if entry.expires_at > Instant::now() {
                return Some(entry.value.clone());
            }
        }
        None
    }

    /// Store setting in cache
    fn set_cache(&self, key: &str, value: SystemSettingResponse) {
        if let Ok(mut cache) = self.cache.write() {
            cache.insert(
                key.to_string(),
                CacheEntry {
                    value,
                    expires_at: Instant::now() + self.cache_ttl,
                },
            );
        }
    }

    /// Invalidate cache entry for a specific key
    fn invalidate_cache(&self, key: &str) {
        if let Ok(mut cache) = self.cache.write() {
            cache.remove(key);
        }
    }

    /// Invalidate all cache entries
    pub fn invalidate_all_cache(&self) {
        if let Ok(mut cache) = self.cache.write() {
            cache.clear();
        }
    }

    // ==================== Validation ====================

    /// Validate that a value matches the expected type
    fn validate_value_type(&self, value: &serde_json::Value, value_type: &str) -> Result<()> {
        let expected_type = SettingValueType::from_str(value_type)
            .ok_or_else(|| anyhow!("Unknown value type: {}", value_type))?;

        let is_valid = match expected_type {
            SettingValueType::String => value.is_string(),
            SettingValueType::Integer => value.is_i64() || value.is_u64(),
            SettingValueType::Float => value.is_f64() || value.is_i64() || value.is_u64(),
            SettingValueType::Boolean => value.is_boolean(),
            SettingValueType::Date => {
                if let Some(s) = value.as_str() {
                    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok()
                } else {
                    false
                }
            }
            SettingValueType::Datetime => {
                if let Some(s) = value.as_str() {
                    chrono::DateTime::parse_from_rfc3339(s).is_ok()
                } else {
                    false
                }
            }
            SettingValueType::Json => value.is_object(),
            SettingValueType::Array => value.is_array(),
        };

        if !is_valid {
            return Err(anyhow!(
                "Value does not match expected type {}. Got: {}",
                value_type,
                match value {
                    serde_json::Value::Null => "null",
                    serde_json::Value::Bool(_) => "boolean",
                    serde_json::Value::Number(_) => "number",
                    serde_json::Value::String(_) => "string",
                    serde_json::Value::Array(_) => "array",
                    serde_json::Value::Object(_) => "object",
                }
            ));
        }

        Ok(())
    }

    // ==================== CRUD Operations ====================

    /// Get all settings with optional filters
    pub async fn list_settings(&self, filter: SettingsFilter) -> Result<ListSettingsResponse> {
        let mut query = String::from(
            r#"
            SELECT
                id, setting_key, setting_group, setting_name, setting_value,
                value_type, description, default_value, validation_rules,
                is_public, is_encrypted, is_readonly, created_at, updated_at, updated_by
            FROM system_settings
            WHERE 1=1
            "#,
        );

        let mut params: Vec<String> = Vec::new();

        if let Some(group) = &filter.group {
            params.push(group.clone());
            query.push_str(&format!(" AND setting_group = ${}", params.len()));
        }

        if filter.public_only.unwrap_or(false) {
            query.push_str(" AND is_public = true");
        }

        if let Some(search) = &filter.search {
            params.push(format!("%{}%", search));
            query.push_str(&format!(
                " AND (setting_key ILIKE ${0} OR setting_name ILIKE ${0})",
                params.len()
            ));
        }

        query.push_str(" ORDER BY setting_group, setting_key");

        // Build dynamic query
        let mut sqlx_query = sqlx::query_as::<_, SystemSetting>(&query);
        for param in &params {
            sqlx_query = sqlx_query.bind(param);
        }

        let settings = sqlx_query
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch settings")?;

        let total = settings.len() as i64;
        let settings_response: Vec<SystemSettingResponse> =
            settings.into_iter().map(SystemSettingResponse::from).collect();

        Ok(ListSettingsResponse {
            settings: settings_response,
            total,
        })
    }

    /// Get a single setting by key
    pub async fn get_setting(&self, key: &str) -> Result<Option<SystemSettingResponse>> {
        // Check cache first
        if let Some(cached) = self.get_from_cache(key) {
            return Ok(Some(cached));
        }

        let setting = sqlx::query_as!(
            SystemSetting,
            r#"
            SELECT
                id, setting_key, setting_group, setting_name, setting_value,
                value_type, description, default_value, validation_rules,
                is_public, is_encrypted, is_readonly, created_at, updated_at, updated_by
            FROM system_settings
            WHERE setting_key = $1
            "#,
            key
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch setting")?;

        if let Some(s) = setting {
            let response = SystemSettingResponse::from(s);
            self.set_cache(key, response.clone());
            Ok(Some(response))
        } else {
            Ok(None)
        }
    }

    /// Get a setting value, returning the default if not found
    pub async fn get_setting_value<T: serde::de::DeserializeOwned>(
        &self,
        key: &str,
    ) -> Result<Option<T>> {
        let setting = self.get_setting(key).await?;
        match setting {
            Some(s) => {
                let value: T = serde_json::from_value(s.setting_value)
                    .context("Failed to deserialize setting value")?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    /// Update a setting value
    pub async fn update_setting(
        &self,
        key: &str,
        request: UpdateSettingRequest,
        updated_by: Uuid,
    ) -> Result<SystemSettingResponse> {
        // First, get the current setting to validate and audit
        let current_setting = sqlx::query_as!(
            SystemSetting,
            r#"
            SELECT
                id, setting_key, setting_group, setting_name, setting_value,
                value_type, description, default_value, validation_rules,
                is_public, is_encrypted, is_readonly, created_at, updated_at, updated_by
            FROM system_settings
            WHERE setting_key = $1
            "#,
            key
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch setting for update")?
        .ok_or_else(|| anyhow!("Setting not found: {}", key))?;

        // Check if setting is readonly
        if current_setting.is_readonly {
            return Err(anyhow!("Cannot modify readonly setting: {}", key));
        }

        // Validate the new value type
        self.validate_value_type(&request.value, &current_setting.value_type)?;

        // Update the setting
        let updated_setting = sqlx::query_as!(
            SystemSetting,
            r#"
            UPDATE system_settings
            SET setting_value = $1, updated_by = $2, updated_at = NOW()
            WHERE setting_key = $3
            RETURNING
                id, setting_key, setting_group, setting_name, setting_value,
                value_type, description, default_value, validation_rules,
                is_public, is_encrypted, is_readonly, created_at, updated_at, updated_by
            "#,
            request.value,
            updated_by,
            key
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to update setting")?;

        // Invalidate cache for this key
        self.invalidate_cache(key);

        // Log the change for audit (async, don't block response)
        let audit_changes = serde_json::json!({
            "setting_key": key,
            "old_value": current_setting.setting_value,
            "new_value": request.value,
        });

        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(updated_by),
                action: AuditAction::Update,
                entity_type: EntityType::User, // Using User as settings entity placeholder
                entity_id: Some(key.to_string()),
                changes: Some(audit_changes),
                ip_address: None,
                user_agent: None,
                request_id: None,
            },
        )
        .await;

        let response = SystemSettingResponse::from(updated_setting);
        self.set_cache(key, response.clone());
        Ok(response)
    }

    /// Bulk update multiple settings
    pub async fn bulk_update_settings(
        &self,
        request: BulkUpdateSettingsRequest,
        updated_by: Uuid,
    ) -> Result<Vec<SystemSettingResponse>> {
        let mut results = Vec::new();
        let mut errors = Vec::new();

        for setting_update in request.settings {
            match self
                .update_setting(
                    &setting_update.key,
                    UpdateSettingRequest {
                        value: setting_update.value,
                    },
                    updated_by,
                )
                .await
            {
                Ok(result) => results.push(result),
                Err(e) => errors.push(format!("{}: {}", setting_update.key, e)),
            }
        }

        if !errors.is_empty() {
            return Err(anyhow!(
                "Some settings failed to update: {}",
                errors.join("; ")
            ));
        }

        Ok(results)
    }

    /// Reset a setting to its default value
    pub async fn reset_setting(&self, key: &str, updated_by: Uuid) -> Result<SystemSettingResponse> {
        // Get the current setting with its default value
        let current_setting = sqlx::query_as!(
            SystemSetting,
            r#"
            SELECT
                id, setting_key, setting_group, setting_name, setting_value,
                value_type, description, default_value, validation_rules,
                is_public, is_encrypted, is_readonly, created_at, updated_at, updated_by
            FROM system_settings
            WHERE setting_key = $1
            "#,
            key
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch setting for reset")?
        .ok_or_else(|| anyhow!("Setting not found: {}", key))?;

        // Check if setting is readonly
        if current_setting.is_readonly {
            return Err(anyhow!("Cannot reset readonly setting: {}", key));
        }

        // Get the default value
        let default_value = current_setting
            .default_value
            .clone()
            .ok_or_else(|| anyhow!("Setting has no default value: {}", key))?;

        // Update to default value
        let updated_setting = sqlx::query_as!(
            SystemSetting,
            r#"
            UPDATE system_settings
            SET setting_value = $1, updated_by = $2, updated_at = NOW()
            WHERE setting_key = $3
            RETURNING
                id, setting_key, setting_group, setting_name, setting_value,
                value_type, description, default_value, validation_rules,
                is_public, is_encrypted, is_readonly, created_at, updated_at, updated_by
            "#,
            default_value,
            updated_by,
            key
        )
        .fetch_one(&self.pool)
        .await
        .context("Failed to reset setting")?;

        // Invalidate cache
        self.invalidate_cache(key);

        // Log the reset for audit
        let audit_changes = serde_json::json!({
            "setting_key": key,
            "action": "reset_to_default",
            "old_value": current_setting.setting_value,
            "new_value": default_value,
        });

        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(updated_by),
                action: AuditAction::Update,
                entity_type: EntityType::User,
                entity_id: Some(key.to_string()),
                changes: Some(audit_changes),
                ip_address: None,
                user_agent: None,
                request_id: None,
            },
        )
        .await;

        let response = SystemSettingResponse::from(updated_setting);
        self.set_cache(key, response.clone());
        Ok(response)
    }

    /// Get all setting groups with counts
    pub async fn list_groups(&self) -> Result<ListSettingGroupsResponse> {
        let groups = sqlx::query!(
            r#"
            SELECT
                setting_group,
                COUNT(*) as count
            FROM system_settings
            GROUP BY setting_group
            ORDER BY setting_group
            "#
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch setting groups")?;

        let group_infos: Vec<SettingGroupInfo> = groups
            .into_iter()
            .map(|row| {
                let group_key = row.setting_group.clone();
                let display_name = crate::models::system_setting::SettingGroup::from_str(&group_key)
                    .map(|g| g.display_name().to_string())
                    .unwrap_or_else(|| group_key.clone());

                SettingGroupInfo {
                    key: group_key,
                    name: display_name,
                    setting_count: row.count.unwrap_or(0),
                }
            })
            .collect();

        Ok(ListSettingGroupsResponse { groups: group_infos })
    }

    /// Get settings by group
    pub async fn get_settings_by_group(&self, group: &str) -> Result<ListSettingsResponse> {
        self.list_settings(SettingsFilter {
            group: Some(group.to_string()),
            public_only: None,
            search: None,
        })
        .await
    }

    /// Get public settings only (for unauthenticated access)
    pub async fn get_public_settings(&self) -> Result<ListSettingsResponse> {
        self.list_settings(SettingsFilter {
            group: None,
            public_only: Some(true),
            search: None,
        })
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_string_type() {
        let service = SettingsService {
            pool: sqlx::PgPool::connect_lazy("postgres://").unwrap(),
            cache: RwLock::new(HashMap::new()),
            cache_ttl: Duration::from_secs(300),
        };

        // Valid string
        let result = service.validate_value_type(&serde_json::json!("test"), "STRING");
        assert!(result.is_ok());

        // Invalid - number instead of string
        let result = service.validate_value_type(&serde_json::json!(42), "STRING");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_integer_type() {
        let service = SettingsService {
            pool: sqlx::PgPool::connect_lazy("postgres://").unwrap(),
            cache: RwLock::new(HashMap::new()),
            cache_ttl: Duration::from_secs(300),
        };

        // Valid integer
        let result = service.validate_value_type(&serde_json::json!(42), "INTEGER");
        assert!(result.is_ok());

        // Invalid - string instead of integer
        let result = service.validate_value_type(&serde_json::json!("42"), "INTEGER");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_boolean_type() {
        let service = SettingsService {
            pool: sqlx::PgPool::connect_lazy("postgres://").unwrap(),
            cache: RwLock::new(HashMap::new()),
            cache_ttl: Duration::from_secs(300),
        };

        // Valid boolean
        let result = service.validate_value_type(&serde_json::json!(true), "BOOLEAN");
        assert!(result.is_ok());

        let result = service.validate_value_type(&serde_json::json!(false), "BOOLEAN");
        assert!(result.is_ok());

        // Invalid - string instead of boolean
        let result = service.validate_value_type(&serde_json::json!("true"), "BOOLEAN");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_array_type() {
        let service = SettingsService {
            pool: sqlx::PgPool::connect_lazy("postgres://").unwrap(),
            cache: RwLock::new(HashMap::new()),
            cache_ttl: Duration::from_secs(300),
        };

        // Valid array
        let result = service.validate_value_type(&serde_json::json!(["a", "b", "c"]), "ARRAY");
        assert!(result.is_ok());

        // Invalid - object instead of array
        let result = service.validate_value_type(&serde_json::json!({"key": "value"}), "ARRAY");
        assert!(result.is_err());
    }
}
