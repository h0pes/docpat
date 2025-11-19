/*!
 * Visit Version Models
 *
 * Data models for visit note version history tracking.
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Visit version database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VisitVersion {
    pub id: Uuid,
    pub visit_id: Uuid,
    pub version_number: i32,

    // Complete snapshot of visit data (JSONB)
    pub visit_data: sqlx::types::JsonValue,

    pub changed_by: Uuid,
    pub change_reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Response model for visit versions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitVersionResponse {
    pub id: Uuid,
    pub visit_id: Uuid,
    pub version_number: i32,
    pub visit_data: serde_json::Value,  // Full visit snapshot
    pub changed_by: Uuid,
    pub change_reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Summary of a visit version (without full visit_data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitVersionSummary {
    pub id: Uuid,
    pub visit_id: Uuid,
    pub version_number: i32,
    pub changed_by: Uuid,
    pub change_reason: Option<String>,
    pub created_at: DateTime<Utc>,
}
