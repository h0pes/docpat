/*!
 * Holiday Model
 *
 * Data models for holiday and vacation calendar management.
 * Supports national holidays, practice closures, and vacation days.
 *
 * Holiday types:
 * - NATIONAL: Public holidays (e.g., Christmas, New Year)
 * - PRACTICE_CLOSED: Practice-specific closures (e.g., staff training)
 * - VACATION: Doctor's vacation days
 *
 * The is_recurring flag handles annual holidays (e.g., Christmas on Dec 25).
 */

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Type of holiday
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HolidayType {
    /// National/public holidays (e.g., Christmas, New Year)
    National,
    /// Practice-specific closures (e.g., staff training day)
    PracticeClosed,
    /// Doctor's vacation days
    Vacation,
}

impl HolidayType {
    /// Convert to database string
    pub fn as_str(&self) -> &'static str {
        match self {
            HolidayType::National => "NATIONAL",
            HolidayType::PracticeClosed => "PRACTICE_CLOSED",
            HolidayType::Vacation => "VACATION",
        }
    }

    /// Parse from database string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "NATIONAL" => Some(HolidayType::National),
            "PRACTICE_CLOSED" => Some(HolidayType::PracticeClosed),
            "VACATION" => Some(HolidayType::Vacation),
            _ => None,
        }
    }

    /// Get display name in English
    pub fn display_name(&self) -> &'static str {
        match self {
            HolidayType::National => "National Holiday",
            HolidayType::PracticeClosed => "Practice Closed",
            HolidayType::Vacation => "Vacation",
        }
    }

    /// Get display name in Italian
    pub fn display_name_it(&self) -> &'static str {
        match self {
            HolidayType::National => "Festività Nazionale",
            HolidayType::PracticeClosed => "Studio Chiuso",
            HolidayType::Vacation => "Ferie",
        }
    }

    /// Get all holiday types
    pub fn all() -> Vec<Self> {
        vec![
            HolidayType::National,
            HolidayType::PracticeClosed,
            HolidayType::Vacation,
        ]
    }
}

/// Holiday database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Holiday {
    pub id: Uuid,
    pub holiday_date: NaiveDate,
    pub name: String,
    pub holiday_type: String,
    pub is_recurring: bool,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Holiday response DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HolidayResponse {
    pub id: Uuid,
    pub holiday_date: NaiveDate,
    pub name: String,
    pub holiday_type: HolidayType,
    pub holiday_type_display: String,
    pub is_recurring: bool,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Holiday> for HolidayResponse {
    fn from(holiday: Holiday) -> Self {
        let h_type = HolidayType::from_str(&holiday.holiday_type)
            .unwrap_or(HolidayType::PracticeClosed);
        Self {
            id: holiday.id,
            holiday_date: holiday.holiday_date,
            name: holiday.name,
            holiday_type: h_type,
            holiday_type_display: h_type.display_name().to_string(),
            is_recurring: holiday.is_recurring,
            notes: holiday.notes,
            created_at: holiday.created_at,
            updated_at: holiday.updated_at,
        }
    }
}

/// Request to create a new holiday
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateHolidayRequest {
    /// Date of the holiday
    pub holiday_date: NaiveDate,

    /// Name/description of the holiday
    #[validate(length(min = 1, max = 200, message = "Name must be between 1 and 200 characters"))]
    pub name: String,

    /// Type of holiday
    pub holiday_type: HolidayType,

    /// Is this a recurring annual holiday?
    #[serde(default)]
    pub is_recurring: bool,

    /// Optional notes
    #[validate(length(max = 1000, message = "Notes must not exceed 1000 characters"))]
    pub notes: Option<String>,
}

/// Request to update an existing holiday
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateHolidayRequest {
    /// New date for the holiday (optional)
    pub holiday_date: Option<NaiveDate>,

    /// New name (optional)
    #[validate(length(min = 1, max = 200, message = "Name must be between 1 and 200 characters"))]
    pub name: Option<String>,

    /// New holiday type (optional)
    pub holiday_type: Option<HolidayType>,

    /// Is this recurring? (optional)
    pub is_recurring: Option<bool>,

    /// Updated notes (optional)
    #[validate(length(max = 1000, message = "Notes must not exceed 1000 characters"))]
    pub notes: Option<String>,
}

/// Filter for listing holidays
#[derive(Debug, Clone, Deserialize, Default)]
pub struct HolidaysFilter {
    /// Start date for range filter
    pub from_date: Option<NaiveDate>,
    /// End date for range filter
    pub to_date: Option<NaiveDate>,
    /// Filter by holiday type
    pub holiday_type: Option<String>,
    /// Filter by year
    pub year: Option<i32>,
    /// Include recurring holidays that would fall in the range
    #[serde(default)]
    pub include_recurring: bool,
}

/// Response for listing holidays
#[derive(Debug, Clone, Serialize)]
pub struct ListHolidaysResponse {
    pub holidays: Vec<HolidayResponse>,
    pub total: i64,
}

/// Response for checking if a date is a holiday
#[derive(Debug, Clone, Serialize)]
pub struct CheckHolidayResponse {
    pub date: NaiveDate,
    pub is_holiday: bool,
    pub holiday: Option<HolidayResponse>,
}

/// Request for importing Italian national holidays for a year
#[derive(Debug, Clone, Deserialize)]
pub struct ImportNationalHolidaysRequest {
    /// Year to import holidays for (e.g., 2025, 2026)
    pub year: i32,

    /// Override existing holidays for this year
    #[serde(default)]
    pub override_existing: bool,
}

/// Response for import operation
#[derive(Debug, Clone, Serialize)]
pub struct ImportHolidaysResponse {
    pub year: i32,
    pub imported_count: i32,
    pub skipped_count: i32,
    pub holidays: Vec<HolidayResponse>,
}

/// Italian national holidays data structure (for import functionality)
#[derive(Debug, Clone)]
pub struct ItalianNationalHoliday {
    pub month: u32,
    pub day: u32,
    pub name: &'static str,
    pub name_en: &'static str,
    pub is_recurring: bool,
}

/// Get list of Italian national holidays (fixed date)
/// Easter-dependent holidays (Pasqua, Lunedì dell'Angelo) need to be calculated separately
pub fn get_italian_national_holidays() -> Vec<ItalianNationalHoliday> {
    vec![
        ItalianNationalHoliday {
            month: 1,
            day: 1,
            name: "Capodanno",
            name_en: "New Year's Day",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 1,
            day: 6,
            name: "Epifania",
            name_en: "Epiphany",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 4,
            day: 25,
            name: "Festa della Liberazione",
            name_en: "Liberation Day",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 5,
            day: 1,
            name: "Festa del Lavoro",
            name_en: "Labour Day",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 6,
            day: 2,
            name: "Festa della Repubblica",
            name_en: "Republic Day",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 8,
            day: 15,
            name: "Ferragosto",
            name_en: "Assumption of Mary",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 11,
            day: 1,
            name: "Ognissanti",
            name_en: "All Saints' Day",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 12,
            day: 8,
            name: "Immacolata Concezione",
            name_en: "Immaculate Conception",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 12,
            day: 25,
            name: "Natale",
            name_en: "Christmas Day",
            is_recurring: true,
        },
        ItalianNationalHoliday {
            month: 12,
            day: 26,
            name: "Santo Stefano",
            name_en: "St. Stephen's Day",
            is_recurring: true,
        },
    ]
}

/// Calculate Easter Sunday for a given year using the Anonymous Gregorian algorithm
/// Returns (month, day) tuple
pub fn calculate_easter(year: i32) -> (u32, u32) {
    // Anonymous Gregorian algorithm (Meeus/Jones/Butcher algorithm)
    let a = year % 19;
    let b = year / 100;
    let c = year % 100;
    let d = b / 4;
    let e = b % 4;
    let f = (b + 8) / 25;
    let g = (b - f + 1) / 3;
    let h = (19 * a + b - d - g + 15) % 30;
    let i = c / 4;
    let k = c % 4;
    let l = (32 + 2 * e + 2 * i - h - k) % 7;
    let m = (a + 11 * h + 22 * l) / 451;
    let month = (h + l - 7 * m + 114) / 31;
    let day = ((h + l - 7 * m + 114) % 31) + 1;

    (month as u32, day as u32)
}

/// Get Easter-dependent holidays for a given year
/// Returns: (Easter Sunday date, Easter Monday date)
pub fn get_easter_holidays(year: i32) -> Option<(NaiveDate, NaiveDate)> {
    let (month, day) = calculate_easter(year);
    let easter = NaiveDate::from_ymd_opt(year, month, day)?;
    let easter_monday = easter.succ_opt()?;
    Some((easter, easter_monday))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_holiday_type_conversion() {
        assert_eq!(HolidayType::National.as_str(), "NATIONAL");
        assert_eq!(HolidayType::PracticeClosed.as_str(), "PRACTICE_CLOSED");
        assert_eq!(HolidayType::Vacation.as_str(), "VACATION");

        assert_eq!(HolidayType::from_str("NATIONAL"), Some(HolidayType::National));
        assert_eq!(HolidayType::from_str("national"), Some(HolidayType::National));
        assert_eq!(HolidayType::from_str("PRACTICE_CLOSED"), Some(HolidayType::PracticeClosed));
        assert_eq!(HolidayType::from_str("VACATION"), Some(HolidayType::Vacation));
        assert_eq!(HolidayType::from_str("INVALID"), None);
    }

    #[test]
    fn test_holiday_type_display_names() {
        assert_eq!(HolidayType::National.display_name(), "National Holiday");
        assert_eq!(HolidayType::National.display_name_it(), "Festività Nazionale");
        assert_eq!(HolidayType::Vacation.display_name(), "Vacation");
        assert_eq!(HolidayType::Vacation.display_name_it(), "Ferie");
    }

    #[test]
    fn test_all_holiday_types() {
        let types = HolidayType::all();
        assert_eq!(types.len(), 3);
        assert!(types.contains(&HolidayType::National));
        assert!(types.contains(&HolidayType::PracticeClosed));
        assert!(types.contains(&HolidayType::Vacation));
    }

    #[test]
    fn test_italian_national_holidays() {
        let holidays = get_italian_national_holidays();
        assert_eq!(holidays.len(), 10);

        // Check Christmas
        let christmas = holidays.iter().find(|h| h.month == 12 && h.day == 25);
        assert!(christmas.is_some());
        assert_eq!(christmas.unwrap().name, "Natale");
        assert!(christmas.unwrap().is_recurring);

        // Check Liberation Day
        let liberation = holidays.iter().find(|h| h.month == 4 && h.day == 25);
        assert!(liberation.is_some());
        assert_eq!(liberation.unwrap().name, "Festa della Liberazione");
    }

    #[test]
    fn test_calculate_easter() {
        // Known Easter dates
        assert_eq!(calculate_easter(2025), (4, 20)); // April 20, 2025
        assert_eq!(calculate_easter(2026), (4, 5));  // April 5, 2026
        assert_eq!(calculate_easter(2024), (3, 31)); // March 31, 2024
        assert_eq!(calculate_easter(2023), (4, 9));  // April 9, 2023
    }

    #[test]
    fn test_get_easter_holidays() {
        let result = get_easter_holidays(2025);
        assert!(result.is_some());

        let (easter, easter_monday) = result.unwrap();
        assert_eq!(easter, NaiveDate::from_ymd_opt(2025, 4, 20).unwrap());
        assert_eq!(easter_monday, NaiveDate::from_ymd_opt(2025, 4, 21).unwrap());
    }

    #[test]
    fn test_create_holiday_request_validation() {
        let valid_request = CreateHolidayRequest {
            holiday_date: NaiveDate::from_ymd_opt(2025, 12, 25).unwrap(),
            name: "Christmas".to_string(),
            holiday_type: HolidayType::National,
            is_recurring: true,
            notes: Some("Merry Christmas!".to_string()),
        };
        assert!(valid_request.validate().is_ok());

        // Empty name should fail
        let invalid_request = CreateHolidayRequest {
            holiday_date: NaiveDate::from_ymd_opt(2025, 12, 25).unwrap(),
            name: "".to_string(),
            holiday_type: HolidayType::National,
            is_recurring: true,
            notes: None,
        };
        assert!(invalid_request.validate().is_err());
    }
}
