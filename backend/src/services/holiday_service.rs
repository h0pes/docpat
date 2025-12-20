/*!
 * Holiday Service
 *
 * Business logic for managing holidays and vacation days.
 * Handles CRUD operations, recurring holiday resolution, and date checking.
 */

use chrono::{Datelike, NaiveDate};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::holiday::{
    calculate_easter, get_italian_national_holidays, CheckHolidayResponse, CreateHolidayRequest,
    Holiday, HolidayResponse, HolidayType, HolidaysFilter, ImportHolidaysResponse,
    ImportNationalHolidaysRequest, ListHolidaysResponse, UpdateHolidayRequest,
};

/// Service for managing holidays
pub struct HolidayService {
    pool: PgPool,
}

impl HolidayService {
    /// Create a new holiday service
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // =========================================================================
    // CRUD Operations
    // =========================================================================

    /// List holidays with filters
    pub async fn list_holidays(
        &self,
        filter: HolidaysFilter,
    ) -> Result<ListHolidaysResponse, sqlx::Error> {
        // Build the query based on filters
        let holidays = match (&filter.from_date, &filter.to_date, &filter.holiday_type, &filter.year) {
            (Some(from), Some(to), Some(h_type), _) => {
                sqlx::query_as::<_, Holiday>(
                    r#"
                    SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                           created_at, updated_at, created_by, updated_by
                    FROM holidays
                    WHERE holiday_date >= $1 AND holiday_date <= $2 AND holiday_type = $3
                    ORDER BY holiday_date
                    "#,
                )
                .bind(from)
                .bind(to)
                .bind(h_type)
                .fetch_all(&self.pool)
                .await?
            }
            (Some(from), Some(to), None, _) => {
                sqlx::query_as::<_, Holiday>(
                    r#"
                    SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                           created_at, updated_at, created_by, updated_by
                    FROM holidays
                    WHERE holiday_date >= $1 AND holiday_date <= $2
                    ORDER BY holiday_date
                    "#,
                )
                .bind(from)
                .bind(to)
                .fetch_all(&self.pool)
                .await?
            }
            (None, None, Some(h_type), Some(year)) => {
                let year_start = NaiveDate::from_ymd_opt(*year, 1, 1).unwrap_or_default();
                let year_end = NaiveDate::from_ymd_opt(*year, 12, 31).unwrap_or_default();
                sqlx::query_as::<_, Holiday>(
                    r#"
                    SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                           created_at, updated_at, created_by, updated_by
                    FROM holidays
                    WHERE holiday_date >= $1 AND holiday_date <= $2 AND holiday_type = $3
                    ORDER BY holiday_date
                    "#,
                )
                .bind(year_start)
                .bind(year_end)
                .bind(h_type)
                .fetch_all(&self.pool)
                .await?
            }
            (None, None, None, Some(year)) => {
                let year_start = NaiveDate::from_ymd_opt(*year, 1, 1).unwrap_or_default();
                let year_end = NaiveDate::from_ymd_opt(*year, 12, 31).unwrap_or_default();
                sqlx::query_as::<_, Holiday>(
                    r#"
                    SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                           created_at, updated_at, created_by, updated_by
                    FROM holidays
                    WHERE holiday_date >= $1 AND holiday_date <= $2
                    ORDER BY holiday_date
                    "#,
                )
                .bind(year_start)
                .bind(year_end)
                .fetch_all(&self.pool)
                .await?
            }
            (None, None, Some(h_type), None) => {
                sqlx::query_as::<_, Holiday>(
                    r#"
                    SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                           created_at, updated_at, created_by, updated_by
                    FROM holidays
                    WHERE holiday_type = $1
                    ORDER BY holiday_date
                    "#,
                )
                .bind(h_type)
                .fetch_all(&self.pool)
                .await?
            }
            _ => {
                sqlx::query_as::<_, Holiday>(
                    r#"
                    SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                           created_at, updated_at, created_by, updated_by
                    FROM holidays
                    ORDER BY holiday_date
                    "#,
                )
                .fetch_all(&self.pool)
                .await?
            }
        };

        let total = holidays.len() as i64;
        let holiday_responses: Vec<HolidayResponse> =
            holidays.into_iter().map(|h| h.into()).collect();

        Ok(ListHolidaysResponse {
            holidays: holiday_responses,
            total,
        })
    }

    /// Get a single holiday by ID
    pub async fn get_holiday(&self, id: Uuid) -> Result<Option<HolidayResponse>, sqlx::Error> {
        let holiday: Option<Holiday> = sqlx::query_as(
            r#"
            SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                   created_at, updated_at, created_by, updated_by
            FROM holidays
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(holiday.map(|h| h.into()))
    }

    /// Create a new holiday
    pub async fn create_holiday(
        &self,
        request: CreateHolidayRequest,
        user_id: Uuid,
    ) -> Result<HolidayResponse, String> {
        let holiday: Holiday = sqlx::query_as(
            r#"
            INSERT INTO holidays (holiday_date, name, holiday_type, is_recurring, notes, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            RETURNING id, holiday_date, name, holiday_type, is_recurring, notes,
                      created_at, updated_at, created_by, updated_by
            "#,
        )
        .bind(request.holiday_date)
        .bind(&request.name)
        .bind(request.holiday_type.as_str())
        .bind(request.is_recurring)
        .bind(&request.notes)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("unique_holiday_date") {
                "A holiday already exists for this date".to_string()
            } else {
                format!("Failed to create holiday: {}", e)
            }
        })?;

        tracing::info!(
            date = %request.holiday_date,
            name = %request.name,
            holiday_type = ?request.holiday_type,
            user_id = %user_id,
            "Created holiday"
        );

        Ok(holiday.into())
    }

    /// Update an existing holiday
    pub async fn update_holiday(
        &self,
        id: Uuid,
        request: UpdateHolidayRequest,
        user_id: Uuid,
    ) -> Result<HolidayResponse, String> {
        // Get existing holiday
        let existing = self
            .get_holiday(id)
            .await
            .map_err(|e| format!("Failed to fetch holiday: {}", e))?
            .ok_or_else(|| "Holiday not found".to_string())?;

        // Build update values
        let holiday_date = request.holiday_date.unwrap_or(existing.holiday_date);
        let name = request.name.unwrap_or(existing.name);
        let holiday_type = request
            .holiday_type
            .map(|t| t.as_str().to_string())
            .unwrap_or_else(|| existing.holiday_type.as_str().to_string());
        let is_recurring = request.is_recurring.unwrap_or(existing.is_recurring);
        let notes = request.notes.or(existing.notes);

        let holiday: Holiday = sqlx::query_as(
            r#"
            UPDATE holidays
            SET holiday_date = $1,
                name = $2,
                holiday_type = $3,
                is_recurring = $4,
                notes = $5,
                updated_at = NOW(),
                updated_by = $6
            WHERE id = $7
            RETURNING id, holiday_date, name, holiday_type, is_recurring, notes,
                      created_at, updated_at, created_by, updated_by
            "#,
        )
        .bind(holiday_date)
        .bind(&name)
        .bind(&holiday_type)
        .bind(is_recurring)
        .bind(&notes)
        .bind(user_id)
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("unique_holiday_date") {
                "A holiday already exists for the new date".to_string()
            } else {
                format!("Failed to update holiday: {}", e)
            }
        })?;

        tracing::info!(
            id = %id,
            user_id = %user_id,
            "Updated holiday"
        );

        Ok(holiday.into())
    }

    /// Delete a holiday
    pub async fn delete_holiday(&self, id: Uuid) -> Result<(), String> {
        let result = sqlx::query("DELETE FROM holidays WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete holiday: {}", e))?;

        if result.rows_affected() == 0 {
            return Err("Holiday not found".to_string());
        }

        tracing::info!(id = %id, "Deleted holiday");

        Ok(())
    }

    // =========================================================================
    // Holiday Checking
    // =========================================================================

    /// Check if a specific date is a holiday
    ///
    /// This checks both:
    /// 1. Direct date matches in the holidays table
    /// 2. Recurring holidays (checks month/day regardless of year)
    pub async fn check_holiday(&self, date: NaiveDate) -> Result<CheckHolidayResponse, String> {
        // First, check for exact date match
        let exact_match: Option<Holiday> = sqlx::query_as(
            r#"
            SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                   created_at, updated_at, created_by, updated_by
            FROM holidays
            WHERE holiday_date = $1
            "#,
        )
        .bind(date)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to check holiday: {}", e))?;

        if let Some(holiday) = exact_match {
            return Ok(CheckHolidayResponse {
                date,
                is_holiday: true,
                holiday: Some(holiday.into()),
            });
        }

        // Check for recurring holidays (match month and day)
        let month = date.month() as i32;
        let day = date.day() as i32;

        let recurring_match: Option<Holiday> = sqlx::query_as(
            r#"
            SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                   created_at, updated_at, created_by, updated_by
            FROM holidays
            WHERE is_recurring = TRUE
              AND EXTRACT(MONTH FROM holiday_date) = $1
              AND EXTRACT(DAY FROM holiday_date) = $2
            LIMIT 1
            "#,
        )
        .bind(month)
        .bind(day)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to check recurring holiday: {}", e))?;

        if let Some(holiday) = recurring_match {
            // Return a modified response with the queried date
            let mut response: HolidayResponse = holiday.into();
            // Note: We keep the original holiday_date from DB for reference
            return Ok(CheckHolidayResponse {
                date,
                is_holiday: true,
                holiday: Some(response),
            });
        }

        // Not a holiday
        Ok(CheckHolidayResponse {
            date,
            is_holiday: false,
            holiday: None,
        })
    }

    /// Check if a date is a holiday (simple boolean return)
    pub async fn is_holiday(&self, date: NaiveDate) -> Result<bool, String> {
        let result = self.check_holiday(date).await?;
        Ok(result.is_holiday)
    }

    // =========================================================================
    // Import Italian National Holidays
    // =========================================================================

    /// Import Italian national holidays for a given year
    ///
    /// This creates holiday entries for both fixed-date holidays and Easter-dependent holidays.
    pub async fn import_national_holidays(
        &self,
        request: ImportNationalHolidaysRequest,
        user_id: Uuid,
    ) -> Result<ImportHolidaysResponse, String> {
        let year = request.year;

        // Validate year range
        if year < 2020 || year > 2100 {
            return Err("Year must be between 2020 and 2100".to_string());
        }

        let mut imported = Vec::new();
        let mut skipped_count = 0;

        // Import fixed-date holidays
        for holiday_def in get_italian_national_holidays() {
            let holiday_date = NaiveDate::from_ymd_opt(year, holiday_def.month, holiday_def.day);
            if let Some(date) = holiday_date {
                let result = self
                    .import_single_holiday(
                        date,
                        holiday_def.name.to_string(),
                        HolidayType::National,
                        true, // Fixed holidays are recurring
                        request.override_existing,
                        user_id,
                    )
                    .await;

                match result {
                    Ok(Some(h)) => imported.push(h),
                    Ok(None) => skipped_count += 1,
                    Err(e) => {
                        tracing::warn!(
                            date = %date,
                            error = %e,
                            "Failed to import holiday"
                        );
                        skipped_count += 1;
                    }
                }
            }
        }

        // Import Easter-dependent holidays (not recurring as they change each year)
        let (easter_month, easter_day) = calculate_easter(year);
        if let Some(easter_date) = NaiveDate::from_ymd_opt(year, easter_month, easter_day) {
            // Easter Sunday
            let result = self
                .import_single_holiday(
                    easter_date,
                    format!("Pasqua {}", year),
                    HolidayType::National,
                    false, // Easter is not recurring (date changes)
                    request.override_existing,
                    user_id,
                )
                .await;

            match result {
                Ok(Some(h)) => imported.push(h),
                Ok(None) => skipped_count += 1,
                Err(_) => skipped_count += 1,
            }

            // Easter Monday
            if let Some(easter_monday) = easter_date.succ_opt() {
                let result = self
                    .import_single_holiday(
                        easter_monday,
                        format!("Lunedì dell'Angelo {}", year),
                        HolidayType::National,
                        false, // Easter Monday is not recurring
                        request.override_existing,
                        user_id,
                    )
                    .await;

                match result {
                    Ok(Some(h)) => imported.push(h),
                    Ok(None) => skipped_count += 1,
                    Err(_) => skipped_count += 1,
                }
            }
        }

        tracing::info!(
            year = year,
            imported_count = imported.len(),
            skipped_count = skipped_count,
            user_id = %user_id,
            "Imported Italian national holidays"
        );

        Ok(ImportHolidaysResponse {
            year,
            imported_count: imported.len() as i32,
            skipped_count,
            holidays: imported,
        })
    }

    /// Helper to import a single holiday
    async fn import_single_holiday(
        &self,
        date: NaiveDate,
        name: String,
        holiday_type: HolidayType,
        is_recurring: bool,
        override_existing: bool,
        user_id: Uuid,
    ) -> Result<Option<HolidayResponse>, String> {
        // Check if holiday already exists for this EXACT date (not recurring matches)
        // We only want to skip if there's already a holiday entry for this specific date
        let existing: Option<Holiday> = sqlx::query_as(
            r#"
            SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                   created_at, updated_at, created_by, updated_by
            FROM holidays
            WHERE holiday_date = $1
            "#,
        )
        .bind(date)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to check existing holiday: {}", e))?;

        if existing.is_some() && !override_existing {
            // Skip, already exists for this exact date
            return Ok(None);
        }

        if let Some(h) = existing {
            if override_existing {
                // Delete existing first
                let _ = self.delete_holiday(h.id).await;
            }
        }

        // Create the holiday
        let request = CreateHolidayRequest {
            holiday_date: date,
            name,
            holiday_type,
            is_recurring,
            notes: Some("Imported Italian national holiday".to_string()),
        };

        let result = self.create_holiday(request, user_id).await?;
        Ok(Some(result))
    }

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /// Get holidays for a date range (for calendar display)
    pub async fn get_holidays_for_range(
        &self,
        from_date: NaiveDate,
        to_date: NaiveDate,
    ) -> Result<Vec<HolidayResponse>, String> {
        // Limit range to 1 year
        let days_diff = (to_date - from_date).num_days();
        if days_diff > 366 {
            return Err("Date range cannot exceed 1 year".to_string());
        }

        // Get direct holidays in range
        let direct_holidays: Vec<Holiday> = sqlx::query_as(
            r#"
            SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                   created_at, updated_at, created_by, updated_by
            FROM holidays
            WHERE holiday_date >= $1 AND holiday_date <= $2
            ORDER BY holiday_date
            "#,
        )
        .bind(from_date)
        .bind(to_date)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to get holidays: {}", e))?;

        let mut result: Vec<HolidayResponse> = direct_holidays.into_iter().map(|h| h.into()).collect();

        // Check for recurring holidays that fall within the range but aren't directly stored
        // (This handles cases where recurring holidays from a different base year apply)
        let recurring_holidays: Vec<Holiday> = sqlx::query_as(
            r#"
            SELECT id, holiday_date, name, holiday_type, is_recurring, notes,
                   created_at, updated_at, created_by, updated_by
            FROM holidays
            WHERE is_recurring = TRUE
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to get recurring holidays: {}", e))?;

        // For each day in the range, check if a recurring holiday applies
        let mut current_date = from_date;
        while current_date <= to_date {
            // Check if we already have a holiday for this date
            let already_included = result.iter().any(|h| h.holiday_date == current_date);

            if !already_included {
                // Check recurring holidays
                let month = current_date.month();
                let day = current_date.day();

                if let Some(recurring) = recurring_holidays.iter().find(|h| {
                    h.holiday_date.month() == month && h.holiday_date.day() == day
                }) {
                    // Add this recurring holiday for the current date
                    let mut holiday_response: HolidayResponse = recurring.clone().into();
                    // Update the date to the actual date in the range
                    // Note: We create a virtual entry for display purposes
                    // The actual DB record keeps its original date
                    result.push(HolidayResponse {
                        id: recurring.id,
                        holiday_date: current_date, // Show the date in the requested year
                        name: holiday_response.name,
                        holiday_type: holiday_response.holiday_type,
                        holiday_type_display: holiday_response.holiday_type_display,
                        is_recurring: true,
                        notes: holiday_response.notes,
                        created_at: holiday_response.created_at,
                        updated_at: holiday_response.updated_at,
                    });
                }
            }

            current_date = current_date.succ_opt().unwrap_or(current_date);
            if current_date == to_date.succ_opt().unwrap_or(to_date) {
                break;
            }
        }

        // Sort by date
        result.sort_by(|a, b| a.holiday_date.cmp(&b.holiday_date));

        Ok(result)
    }
}
