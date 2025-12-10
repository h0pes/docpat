/*!
 * System Settings Model
 *
 * Data models for system-wide configuration settings.
 * Settings are stored as key-value pairs with type information
 * for validation and proper serialization/deserialization.
 *
 * Used for:
 * - Practice/clinic configuration
 * - Appointment settings
 * - Security settings
 * - Localization preferences
 * - Backup configuration
 * - Notification settings
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Setting value types for validation and proper parsing
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SettingValueType {
    String,
    Integer,
    Float,
    Boolean,
    Date,
    Datetime,
    Json,
    Array,
}

impl SettingValueType {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            SettingValueType::String => "STRING",
            SettingValueType::Integer => "INTEGER",
            SettingValueType::Float => "FLOAT",
            SettingValueType::Boolean => "BOOLEAN",
            SettingValueType::Date => "DATE",
            SettingValueType::Datetime => "DATETIME",
            SettingValueType::Json => "JSON",
            SettingValueType::Array => "ARRAY",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "STRING" => Some(SettingValueType::String),
            "INTEGER" => Some(SettingValueType::Integer),
            "FLOAT" => Some(SettingValueType::Float),
            "BOOLEAN" => Some(SettingValueType::Boolean),
            "DATE" => Some(SettingValueType::Date),
            "DATETIME" => Some(SettingValueType::Datetime),
            "JSON" => Some(SettingValueType::Json),
            "ARRAY" => Some(SettingValueType::Array),
            _ => None,
        }
    }
}

impl std::fmt::Display for SettingValueType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Setting group for organization
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SettingGroup {
    Clinic,
    Appointment,
    Notification,
    Security,
    Backup,
    Localization,
    System,
}

impl SettingGroup {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            SettingGroup::Clinic => "clinic",
            SettingGroup::Appointment => "appointment",
            SettingGroup::Notification => "notification",
            SettingGroup::Security => "security",
            SettingGroup::Backup => "backup",
            SettingGroup::Localization => "localization",
            SettingGroup::System => "system",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "clinic" => Some(SettingGroup::Clinic),
            "appointment" => Some(SettingGroup::Appointment),
            "notification" => Some(SettingGroup::Notification),
            "security" => Some(SettingGroup::Security),
            "backup" => Some(SettingGroup::Backup),
            "localization" => Some(SettingGroup::Localization),
            "system" => Some(SettingGroup::System),
            _ => None,
        }
    }

    /// Get human-readable display name
    pub fn display_name(&self) -> &'static str {
        match self {
            SettingGroup::Clinic => "Clinic Settings",
            SettingGroup::Appointment => "Appointment Settings",
            SettingGroup::Notification => "Notification Settings",
            SettingGroup::Security => "Security Settings",
            SettingGroup::Backup => "Backup Settings",
            SettingGroup::Localization => "Localization Settings",
            SettingGroup::System => "System Settings",
        }
    }

    /// Get all available groups
    pub fn all() -> Vec<Self> {
        vec![
            SettingGroup::Clinic,
            SettingGroup::Appointment,
            SettingGroup::Notification,
            SettingGroup::Security,
            SettingGroup::Backup,
            SettingGroup::Localization,
            SettingGroup::System,
        ]
    }
}

impl std::fmt::Display for SettingGroup {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// System setting database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SystemSetting {
    pub id: Uuid,
    pub setting_key: String,
    pub setting_group: String,
    pub setting_name: String,
    pub setting_value: serde_json::Value,
    pub value_type: String,
    pub description: Option<String>,
    pub default_value: Option<serde_json::Value>,
    pub validation_rules: Option<serde_json::Value>,
    pub is_public: bool,
    pub is_encrypted: bool,
    pub is_readonly: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

/// System setting response DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSettingResponse {
    pub id: Uuid,
    pub setting_key: String,
    pub setting_group: String,
    pub setting_name: String,
    pub setting_value: serde_json::Value,
    pub value_type: SettingValueType,
    pub description: Option<String>,
    pub default_value: Option<serde_json::Value>,
    pub is_public: bool,
    pub is_readonly: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<SystemSetting> for SystemSettingResponse {
    fn from(setting: SystemSetting) -> Self {
        Self {
            id: setting.id,
            setting_key: setting.setting_key,
            setting_group: setting.setting_group,
            setting_name: setting.setting_name,
            setting_value: setting.setting_value,
            value_type: SettingValueType::from_str(&setting.value_type)
                .unwrap_or(SettingValueType::String),
            description: setting.description,
            default_value: setting.default_value,
            is_public: setting.is_public,
            is_readonly: setting.is_readonly,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        }
    }
}

/// Request to update a setting
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateSettingRequest {
    /// The new value for the setting (must match value_type)
    pub value: serde_json::Value,
}

/// Request to bulk update settings
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct BulkUpdateSettingsRequest {
    /// List of settings to update
    #[validate(length(min = 1, message = "At least one setting is required"))]
    pub settings: Vec<SettingUpdate>,
}

/// Individual setting update in bulk operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingUpdate {
    /// Setting key to update
    pub key: String,
    /// New value for the setting
    pub value: serde_json::Value,
}

/// Response for listing settings
#[derive(Debug, Clone, Serialize)]
pub struct ListSettingsResponse {
    pub settings: Vec<SystemSettingResponse>,
    pub total: i64,
}

/// Filter for listing settings
#[derive(Debug, Clone, Deserialize, Default)]
pub struct SettingsFilter {
    /// Filter by group
    pub group: Option<String>,
    /// Include only public settings
    pub public_only: Option<bool>,
    /// Search term for key or name
    pub search: Option<String>,
}

/// Setting group information
#[derive(Debug, Clone, Serialize)]
pub struct SettingGroupInfo {
    pub key: String,
    pub name: String,
    pub setting_count: i64,
}

/// Response for listing setting groups
#[derive(Debug, Clone, Serialize)]
pub struct ListSettingGroupsResponse {
    pub groups: Vec<SettingGroupInfo>,
}

/// Audit entry for setting changes
#[derive(Debug, Clone, Serialize)]
pub struct SettingChangeAudit {
    pub setting_key: String,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
    pub changed_at: DateTime<Utc>,
    pub changed_by: Uuid,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_setting_value_type_conversion() {
        assert_eq!(SettingValueType::String.as_str(), "STRING");
        assert_eq!(SettingValueType::Integer.as_str(), "INTEGER");
        assert_eq!(SettingValueType::Boolean.as_str(), "BOOLEAN");

        assert_eq!(
            SettingValueType::from_str("STRING"),
            Some(SettingValueType::String)
        );
        assert_eq!(
            SettingValueType::from_str("BOOLEAN"),
            Some(SettingValueType::Boolean)
        );
        assert_eq!(SettingValueType::from_str("INVALID"), None);
    }

    #[test]
    fn test_setting_group_conversion() {
        assert_eq!(SettingGroup::Clinic.as_str(), "clinic");
        assert_eq!(SettingGroup::Security.as_str(), "security");

        assert_eq!(
            SettingGroup::from_str("clinic"),
            Some(SettingGroup::Clinic)
        );
        assert_eq!(
            SettingGroup::from_str("CLINIC"),
            Some(SettingGroup::Clinic)
        );
        assert_eq!(SettingGroup::from_str("invalid"), None);
    }

    #[test]
    fn test_setting_value_type_serialization() {
        let value_type = SettingValueType::String;
        let json = serde_json::to_string(&value_type).unwrap();
        assert_eq!(json, "\"STRING\"");

        let deserialized: SettingValueType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SettingValueType::String);
    }

    #[test]
    fn test_setting_group_all() {
        let groups = SettingGroup::all();
        assert_eq!(groups.len(), 7);
        assert!(groups.contains(&SettingGroup::Clinic));
        assert!(groups.contains(&SettingGroup::Security));
    }
}
