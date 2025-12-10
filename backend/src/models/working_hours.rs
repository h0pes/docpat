/*!
 * Working Hours Model
 *
 * Data models for clinic working hours configuration.
 * Supports default weekly schedule with date-specific overrides.
 *
 * Uses ISO 8601 convention: Monday = 1, Sunday = 7
 *
 * Used for:
 * - Default weekly working hours
 * - Date-specific overrides (custom hours, closed days)
 * - Appointment availability checking
 */

use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Day of week using ISO 8601 convention (Monday = 1, Sunday = 7)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum DayOfWeek {
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
    Sunday = 7,
}

impl DayOfWeek {
    /// Convert from database integer
    pub fn from_i16(value: i16) -> Option<Self> {
        match value {
            1 => Some(DayOfWeek::Monday),
            2 => Some(DayOfWeek::Tuesday),
            3 => Some(DayOfWeek::Wednesday),
            4 => Some(DayOfWeek::Thursday),
            5 => Some(DayOfWeek::Friday),
            6 => Some(DayOfWeek::Saturday),
            7 => Some(DayOfWeek::Sunday),
            _ => None,
        }
    }

    /// Convert to database integer
    pub fn as_i16(&self) -> i16 {
        *self as i16
    }

    /// Get display name in English
    pub fn display_name(&self) -> &'static str {
        match self {
            DayOfWeek::Monday => "Monday",
            DayOfWeek::Tuesday => "Tuesday",
            DayOfWeek::Wednesday => "Wednesday",
            DayOfWeek::Thursday => "Thursday",
            DayOfWeek::Friday => "Friday",
            DayOfWeek::Saturday => "Saturday",
            DayOfWeek::Sunday => "Sunday",
        }
    }

    /// Get display name in Italian
    pub fn display_name_it(&self) -> &'static str {
        match self {
            DayOfWeek::Monday => "Lunedì",
            DayOfWeek::Tuesday => "Martedì",
            DayOfWeek::Wednesday => "Mercoledì",
            DayOfWeek::Thursday => "Giovedì",
            DayOfWeek::Friday => "Venerdì",
            DayOfWeek::Saturday => "Sabato",
            DayOfWeek::Sunday => "Domenica",
        }
    }

    /// Get all days of the week in order (Monday first)
    pub fn all() -> Vec<Self> {
        vec![
            DayOfWeek::Monday,
            DayOfWeek::Tuesday,
            DayOfWeek::Wednesday,
            DayOfWeek::Thursday,
            DayOfWeek::Friday,
            DayOfWeek::Saturday,
            DayOfWeek::Sunday,
        ]
    }
}

/// Override type for date-specific working hours
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OverrideType {
    /// Day is completely closed
    Closed,
    /// Custom working hours (different from default)
    CustomHours,
    /// Extended hours (longer than default)
    ExtendedHours,
}

impl OverrideType {
    /// Convert to database string
    pub fn as_str(&self) -> &'static str {
        match self {
            OverrideType::Closed => "CLOSED",
            OverrideType::CustomHours => "CUSTOM_HOURS",
            OverrideType::ExtendedHours => "EXTENDED_HOURS",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "CLOSED" => Some(OverrideType::Closed),
            "CUSTOM_HOURS" => Some(OverrideType::CustomHours),
            "EXTENDED_HOURS" => Some(OverrideType::ExtendedHours),
            _ => None,
        }
    }
}

/// Default working hours database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DefaultWorkingHours {
    pub id: Uuid,
    pub day_of_week: i16,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub break_start: Option<NaiveTime>,
    pub break_end: Option<NaiveTime>,
    pub is_working_day: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

/// Default working hours response DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultWorkingHoursResponse {
    pub id: Uuid,
    pub day_of_week: DayOfWeek,
    pub day_name: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub break_start: Option<String>,
    pub break_end: Option<String>,
    pub is_working_day: bool,
    pub updated_at: DateTime<Utc>,
}

impl From<DefaultWorkingHours> for DefaultWorkingHoursResponse {
    fn from(hours: DefaultWorkingHours) -> Self {
        let day = DayOfWeek::from_i16(hours.day_of_week).unwrap_or(DayOfWeek::Monday);
        Self {
            id: hours.id,
            day_of_week: day,
            day_name: day.display_name().to_string(),
            start_time: hours.start_time.map(|t| t.format("%H:%M").to_string()),
            end_time: hours.end_time.map(|t| t.format("%H:%M").to_string()),
            break_start: hours.break_start.map(|t| t.format("%H:%M").to_string()),
            break_end: hours.break_end.map(|t| t.format("%H:%M").to_string()),
            is_working_day: hours.is_working_day,
            updated_at: hours.updated_at,
        }
    }
}

/// Working hours override database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkingHoursOverride {
    pub id: Uuid,
    pub override_date: NaiveDate,
    pub override_type: String,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub break_start: Option<NaiveTime>,
    pub break_end: Option<NaiveTime>,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Working hours override response DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkingHoursOverrideResponse {
    pub id: Uuid,
    pub override_date: NaiveDate,
    pub override_type: OverrideType,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub break_start: Option<String>,
    pub break_end: Option<String>,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<WorkingHoursOverride> for WorkingHoursOverrideResponse {
    fn from(override_entry: WorkingHoursOverride) -> Self {
        Self {
            id: override_entry.id,
            override_date: override_entry.override_date,
            override_type: OverrideType::from_str(&override_entry.override_type)
                .unwrap_or(OverrideType::CustomHours),
            start_time: override_entry.start_time.map(|t| t.format("%H:%M").to_string()),
            end_time: override_entry.end_time.map(|t| t.format("%H:%M").to_string()),
            break_start: override_entry.break_start.map(|t| t.format("%H:%M").to_string()),
            break_end: override_entry.break_end.map(|t| t.format("%H:%M").to_string()),
            reason: override_entry.reason,
            created_at: override_entry.created_at,
            updated_at: override_entry.updated_at,
        }
    }
}

/// Request to update a single day's working hours
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateDayWorkingHoursRequest {
    /// Day of week (1-7, Monday=1)
    #[validate(range(min = 1, max = 7, message = "Day of week must be between 1 (Monday) and 7 (Sunday)"))]
    pub day_of_week: i16,

    /// Start time in HH:MM format (null if closed)
    pub start_time: Option<String>,

    /// End time in HH:MM format (null if closed)
    pub end_time: Option<String>,

    /// Break start time in HH:MM format (optional)
    pub break_start: Option<String>,

    /// Break end time in HH:MM format (optional)
    pub break_end: Option<String>,

    /// Whether this is a working day
    pub is_working_day: bool,
}

/// Request to update all working hours (bulk update)
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateAllWorkingHoursRequest {
    /// List of day configurations (should include all 7 days)
    #[validate(length(min = 1, max = 7, message = "Must provide 1-7 day configurations"))]
    pub days: Vec<UpdateDayWorkingHoursRequest>,
}

/// Request to create a working hours override
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateOverrideRequest {
    /// Date for the override (must be today or in the future)
    pub override_date: NaiveDate,

    /// Type of override
    pub override_type: OverrideType,

    /// Start time in HH:MM format (required for CUSTOM_HOURS and EXTENDED_HOURS)
    pub start_time: Option<String>,

    /// End time in HH:MM format (required for CUSTOM_HOURS and EXTENDED_HOURS)
    pub end_time: Option<String>,

    /// Break start time in HH:MM format (optional)
    pub break_start: Option<String>,

    /// Break end time in HH:MM format (optional)
    pub break_end: Option<String>,

    /// Reason for the override
    #[validate(length(max = 500, message = "Reason must not exceed 500 characters"))]
    pub reason: Option<String>,
}

/// Request to update a working hours override
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateOverrideRequest {
    /// Type of override
    pub override_type: Option<OverrideType>,

    /// Start time in HH:MM format
    pub start_time: Option<String>,

    /// End time in HH:MM format
    pub end_time: Option<String>,

    /// Break start time in HH:MM format
    pub break_start: Option<String>,

    /// Break end time in HH:MM format
    pub break_end: Option<String>,

    /// Reason for the override
    #[validate(length(max = 500, message = "Reason must not exceed 500 characters"))]
    pub reason: Option<String>,
}

/// Response for the full weekly schedule
#[derive(Debug, Clone, Serialize)]
pub struct WeeklyScheduleResponse {
    pub days: Vec<DefaultWorkingHoursResponse>,
}

/// Response for listing overrides
#[derive(Debug, Clone, Serialize)]
pub struct ListOverridesResponse {
    pub overrides: Vec<WorkingHoursOverrideResponse>,
    pub total: i64,
}

/// Filter for listing overrides
#[derive(Debug, Clone, Deserialize, Default)]
pub struct OverridesFilter {
    /// Start date for range filter
    pub from_date: Option<NaiveDate>,
    /// End date for range filter
    pub to_date: Option<NaiveDate>,
    /// Filter by override type
    pub override_type: Option<String>,
    /// Only show future overrides (from today onwards)
    pub future_only: Option<bool>,
}

/// Effective working hours for a specific date (combines default + override)
#[derive(Debug, Clone, Serialize)]
pub struct EffectiveWorkingHours {
    pub date: NaiveDate,
    pub day_of_week: i16,
    pub day_name: String,
    pub is_working_day: bool,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub break_start: Option<String>,
    pub break_end: Option<String>,
    /// If this is from an override
    pub is_override: bool,
    /// Source of hours: "DEFAULT" or "OVERRIDE"
    pub source: String,
}

/// Request to get effective hours for a date range
#[derive(Debug, Clone, Deserialize)]
pub struct EffectiveHoursQuery {
    /// Start date
    pub from_date: NaiveDate,
    /// End date
    pub to_date: NaiveDate,
}

/// Response with effective hours for a date range
#[derive(Debug, Clone, Serialize)]
pub struct EffectiveHoursResponse {
    pub from_date: NaiveDate,
    pub to_date: NaiveDate,
    pub days: Vec<EffectiveWorkingHours>,
}

/// Helper to parse time string (HH:MM) to NaiveTime
pub fn parse_time(time_str: &str) -> Result<NaiveTime, String> {
    NaiveTime::parse_from_str(time_str, "%H:%M")
        .map_err(|_| format!("Invalid time format '{}'. Expected HH:MM", time_str))
}

/// Helper to validate time range
pub fn validate_time_range(
    start: Option<&str>,
    end: Option<&str>,
) -> Result<(Option<NaiveTime>, Option<NaiveTime>), String> {
    match (start, end) {
        (Some(s), Some(e)) => {
            let start_time = parse_time(s)?;
            let end_time = parse_time(e)?;
            if end_time <= start_time {
                return Err("End time must be after start time".to_string());
            }
            Ok((Some(start_time), Some(end_time)))
        }
        (None, None) => Ok((None, None)),
        _ => Err("Both start_time and end_time must be provided together, or both null".to_string()),
    }
}

/// Helper to validate break times within working hours
pub fn validate_break_times(
    start_time: Option<NaiveTime>,
    end_time: Option<NaiveTime>,
    break_start: Option<&str>,
    break_end: Option<&str>,
) -> Result<(Option<NaiveTime>, Option<NaiveTime>), String> {
    match (break_start, break_end) {
        (Some(bs), Some(be)) => {
            let break_start_time = parse_time(bs)?;
            let break_end_time = parse_time(be)?;

            if break_end_time <= break_start_time {
                return Err("Break end time must be after break start time".to_string());
            }

            // Check break is within working hours
            if let (Some(wstart), Some(wend)) = (start_time, end_time) {
                if break_start_time < wstart || break_end_time > wend {
                    return Err("Break times must be within working hours".to_string());
                }
            } else {
                return Err("Cannot set break times when working hours are not defined".to_string());
            }

            Ok((Some(break_start_time), Some(break_end_time)))
        }
        (None, None) => Ok((None, None)),
        _ => Err("Both break_start and break_end must be provided together, or both null".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_day_of_week_conversion() {
        assert_eq!(DayOfWeek::Monday.as_i16(), 1);
        assert_eq!(DayOfWeek::Sunday.as_i16(), 7);
        assert_eq!(DayOfWeek::from_i16(1), Some(DayOfWeek::Monday));
        assert_eq!(DayOfWeek::from_i16(7), Some(DayOfWeek::Sunday));
        assert_eq!(DayOfWeek::from_i16(0), None);
        assert_eq!(DayOfWeek::from_i16(8), None);
    }

    #[test]
    fn test_day_display_names() {
        assert_eq!(DayOfWeek::Monday.display_name(), "Monday");
        assert_eq!(DayOfWeek::Monday.display_name_it(), "Lunedì");
        assert_eq!(DayOfWeek::Friday.display_name(), "Friday");
        assert_eq!(DayOfWeek::Friday.display_name_it(), "Venerdì");
    }

    #[test]
    fn test_override_type_conversion() {
        assert_eq!(OverrideType::Closed.as_str(), "CLOSED");
        assert_eq!(OverrideType::CustomHours.as_str(), "CUSTOM_HOURS");
        assert_eq!(OverrideType::from_str("CLOSED"), Some(OverrideType::Closed));
        assert_eq!(OverrideType::from_str("INVALID"), None);
    }

    #[test]
    fn test_parse_time() {
        assert!(parse_time("09:00").is_ok());
        assert!(parse_time("18:30").is_ok());
        assert!(parse_time("invalid").is_err());
        assert!(parse_time("25:00").is_err());
    }

    #[test]
    fn test_validate_time_range() {
        // Valid range
        let result = validate_time_range(Some("09:00"), Some("18:00"));
        assert!(result.is_ok());

        // Invalid: end before start
        let result = validate_time_range(Some("18:00"), Some("09:00"));
        assert!(result.is_err());

        // Both null is valid
        let result = validate_time_range(None, None);
        assert!(result.is_ok());

        // One null is invalid
        let result = validate_time_range(Some("09:00"), None);
        assert!(result.is_err());
    }

    #[test]
    fn test_all_days() {
        let days = DayOfWeek::all();
        assert_eq!(days.len(), 7);
        assert_eq!(days[0], DayOfWeek::Monday);
        assert_eq!(days[6], DayOfWeek::Sunday);
    }
}
