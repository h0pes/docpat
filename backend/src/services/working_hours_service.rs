/*!
 * Working Hours Service
 *
 * Business logic for managing clinic working hours.
 * Handles default weekly schedule and date-specific overrides.
 */

use chrono::{Datelike, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::working_hours::{
    parse_time, validate_break_times, validate_time_range, CreateOverrideRequest,
    DayOfWeek, DefaultWorkingHours, DefaultWorkingHoursResponse, EffectiveHoursQuery,
    EffectiveHoursResponse, EffectiveWorkingHours, ListOverridesResponse, OverrideType,
    OverridesFilter, UpdateAllWorkingHoursRequest, UpdateDayWorkingHoursRequest,
    UpdateOverrideRequest, WeeklyScheduleResponse, WorkingHoursOverride,
    WorkingHoursOverrideResponse,
};

/// Service for managing working hours
pub struct WorkingHoursService {
    pool: PgPool,
}

impl WorkingHoursService {
    /// Create a new working hours service
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // =========================================================================
    // Default Working Hours
    // =========================================================================

    /// Get all default working hours (weekly schedule)
    pub async fn get_weekly_schedule(&self) -> Result<WeeklyScheduleResponse, sqlx::Error> {
        let hours: Vec<DefaultWorkingHours> = sqlx::query_as(
            r#"
            SELECT id, day_of_week, start_time, end_time, break_start, break_end,
                   is_working_day, created_at, updated_at, updated_by
            FROM default_working_hours
            ORDER BY day_of_week
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let days: Vec<DefaultWorkingHoursResponse> =
            hours.into_iter().map(|h| h.into()).collect();

        Ok(WeeklyScheduleResponse { days })
    }

    /// Get working hours for a specific day
    pub async fn get_day_working_hours(
        &self,
        day_of_week: i16,
    ) -> Result<Option<DefaultWorkingHoursResponse>, sqlx::Error> {
        let hours: Option<DefaultWorkingHours> = sqlx::query_as(
            r#"
            SELECT id, day_of_week, start_time, end_time, break_start, break_end,
                   is_working_day, created_at, updated_at, updated_by
            FROM default_working_hours
            WHERE day_of_week = $1
            "#,
        )
        .bind(day_of_week)
        .fetch_optional(&self.pool)
        .await?;

        Ok(hours.map(|h| h.into()))
    }

    /// Update a single day's working hours
    pub async fn update_day_working_hours(
        &self,
        request: UpdateDayWorkingHoursRequest,
        user_id: Uuid,
    ) -> Result<DefaultWorkingHoursResponse, String> {
        // Validate time ranges
        let (start_time, end_time) = validate_time_range(
            request.start_time.as_deref(),
            request.end_time.as_deref(),
        )?;

        let (break_start, break_end) = validate_break_times(
            start_time,
            end_time,
            request.break_start.as_deref(),
            request.break_end.as_deref(),
        )?;

        // If not a working day, times should be null
        let (start_time, end_time, break_start, break_end) = if !request.is_working_day {
            (None, None, None, None)
        } else {
            (start_time, end_time, break_start, break_end)
        };

        let hours: DefaultWorkingHours = sqlx::query_as(
            r#"
            UPDATE default_working_hours
            SET start_time = $1,
                end_time = $2,
                break_start = $3,
                break_end = $4,
                is_working_day = $5,
                updated_at = NOW(),
                updated_by = $6
            WHERE day_of_week = $7
            RETURNING id, day_of_week, start_time, end_time, break_start, break_end,
                      is_working_day, created_at, updated_at, updated_by
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .bind(break_start)
        .bind(break_end)
        .bind(request.is_working_day)
        .bind(user_id)
        .bind(request.day_of_week)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| format!("Failed to update working hours: {}", e))?;

        tracing::info!(
            day = request.day_of_week,
            user_id = %user_id,
            "Updated working hours for day"
        );

        Ok(hours.into())
    }

    /// Update all working hours (bulk update)
    pub async fn update_all_working_hours(
        &self,
        request: UpdateAllWorkingHoursRequest,
        user_id: Uuid,
    ) -> Result<WeeklyScheduleResponse, String> {
        let mut results = Vec::new();

        for day_request in request.days {
            let result = self
                .update_day_working_hours(day_request, user_id)
                .await?;
            results.push(result);
        }

        // Sort by day of week
        results.sort_by_key(|r| r.day_of_week as i16);

        Ok(WeeklyScheduleResponse { days: results })
    }

    // =========================================================================
    // Working Hours Overrides
    // =========================================================================

    /// List working hours overrides with filters
    pub async fn list_overrides(
        &self,
        filter: OverridesFilter,
    ) -> Result<ListOverridesResponse, sqlx::Error> {
        let mut query = String::from(
            r#"
            SELECT id, override_date, override_type, start_time, end_time,
                   break_start, break_end, reason, created_at, updated_at,
                   created_by, updated_by
            FROM working_hours_overrides
            WHERE 1=1
            "#,
        );

        let mut params: Vec<String> = Vec::new();
        let mut param_index = 1;

        // Build dynamic WHERE clauses
        if let Some(from_date) = &filter.from_date {
            query.push_str(&format!(" AND override_date >= ${}", param_index));
            params.push(from_date.to_string());
            param_index += 1;
        }

        if let Some(to_date) = &filter.to_date {
            query.push_str(&format!(" AND override_date <= ${}", param_index));
            params.push(to_date.to_string());
            param_index += 1;
        }

        if let Some(override_type) = &filter.override_type {
            query.push_str(&format!(" AND override_type = ${}", param_index));
            params.push(override_type.clone());
            param_index += 1;
        }

        if filter.future_only.unwrap_or(false) {
            query.push_str(&format!(" AND override_date >= ${}", param_index));
            params.push(Utc::now().date_naive().to_string());
        }

        query.push_str(" ORDER BY override_date");

        // For simplicity, use raw SQL with manual binding
        // This is safe because we're only using validated filter values
        let overrides: Vec<WorkingHoursOverride> = match (
            &filter.from_date,
            &filter.to_date,
            &filter.override_type,
            filter.future_only,
        ) {
            (Some(from), Some(to), Some(otype), Some(true)) => {
                let today = Utc::now().date_naive();
                sqlx::query_as(
                    r#"
                    SELECT id, override_date, override_type, start_time, end_time,
                           break_start, break_end, reason, created_at, updated_at,
                           created_by, updated_by
                    FROM working_hours_overrides
                    WHERE override_date >= $1 AND override_date <= $2
                      AND override_type = $3 AND override_date >= $4
                    ORDER BY override_date
                    "#,
                )
                .bind(from)
                .bind(to)
                .bind(otype)
                .bind(today)
                .fetch_all(&self.pool)
                .await?
            }
            (Some(from), Some(to), Some(otype), _) => {
                sqlx::query_as(
                    r#"
                    SELECT id, override_date, override_type, start_time, end_time,
                           break_start, break_end, reason, created_at, updated_at,
                           created_by, updated_by
                    FROM working_hours_overrides
                    WHERE override_date >= $1 AND override_date <= $2 AND override_type = $3
                    ORDER BY override_date
                    "#,
                )
                .bind(from)
                .bind(to)
                .bind(otype)
                .fetch_all(&self.pool)
                .await?
            }
            (Some(from), Some(to), None, Some(true)) => {
                let today = Utc::now().date_naive();
                sqlx::query_as(
                    r#"
                    SELECT id, override_date, override_type, start_time, end_time,
                           break_start, break_end, reason, created_at, updated_at,
                           created_by, updated_by
                    FROM working_hours_overrides
                    WHERE override_date >= $1 AND override_date <= $2 AND override_date >= $3
                    ORDER BY override_date
                    "#,
                )
                .bind(from)
                .bind(to)
                .bind(today)
                .fetch_all(&self.pool)
                .await?
            }
            (Some(from), Some(to), None, _) => {
                sqlx::query_as(
                    r#"
                    SELECT id, override_date, override_type, start_time, end_time,
                           break_start, break_end, reason, created_at, updated_at,
                           created_by, updated_by
                    FROM working_hours_overrides
                    WHERE override_date >= $1 AND override_date <= $2
                    ORDER BY override_date
                    "#,
                )
                .bind(from)
                .bind(to)
                .fetch_all(&self.pool)
                .await?
            }
            (None, None, None, Some(true)) => {
                let today = Utc::now().date_naive();
                sqlx::query_as(
                    r#"
                    SELECT id, override_date, override_type, start_time, end_time,
                           break_start, break_end, reason, created_at, updated_at,
                           created_by, updated_by
                    FROM working_hours_overrides
                    WHERE override_date >= $1
                    ORDER BY override_date
                    "#,
                )
                .bind(today)
                .fetch_all(&self.pool)
                .await?
            }
            _ => {
                sqlx::query_as(
                    r#"
                    SELECT id, override_date, override_type, start_time, end_time,
                           break_start, break_end, reason, created_at, updated_at,
                           created_by, updated_by
                    FROM working_hours_overrides
                    ORDER BY override_date
                    "#,
                )
                .fetch_all(&self.pool)
                .await?
            }
        };

        let total = overrides.len() as i64;
        let response_overrides: Vec<WorkingHoursOverrideResponse> =
            overrides.into_iter().map(|o| o.into()).collect();

        Ok(ListOverridesResponse {
            overrides: response_overrides,
            total,
        })
    }

    /// Get a single override by ID
    pub async fn get_override(
        &self,
        id: Uuid,
    ) -> Result<Option<WorkingHoursOverrideResponse>, sqlx::Error> {
        let override_entry: Option<WorkingHoursOverride> = sqlx::query_as(
            r#"
            SELECT id, override_date, override_type, start_time, end_time,
                   break_start, break_end, reason, created_at, updated_at,
                   created_by, updated_by
            FROM working_hours_overrides
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(override_entry.map(|o| o.into()))
    }

    /// Create a new working hours override
    pub async fn create_override(
        &self,
        request: CreateOverrideRequest,
        user_id: Uuid,
    ) -> Result<WorkingHoursOverrideResponse, String> {
        // Validate date is today or in the future
        let today = Utc::now().date_naive();
        if request.override_date < today {
            return Err("Override date must be today or in the future".to_string());
        }

        // Validate times based on override type
        let (start_time, end_time) = match request.override_type {
            OverrideType::Closed => (None, None),
            OverrideType::CustomHours | OverrideType::ExtendedHours => {
                if request.start_time.is_none() || request.end_time.is_none() {
                    return Err(format!(
                        "{:?} requires start_time and end_time",
                        request.override_type
                    ));
                }
                validate_time_range(
                    request.start_time.as_deref(),
                    request.end_time.as_deref(),
                )?
            }
        };

        let (break_start, break_end) = validate_break_times(
            start_time,
            end_time,
            request.break_start.as_deref(),
            request.break_end.as_deref(),
        )?;

        let override_entry: WorkingHoursOverride = sqlx::query_as(
            r#"
            INSERT INTO working_hours_overrides
                (override_date, override_type, start_time, end_time, break_start,
                 break_end, reason, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
            RETURNING id, override_date, override_type, start_time, end_time,
                      break_start, break_end, reason, created_at, updated_at,
                      created_by, updated_by
            "#,
        )
        .bind(request.override_date)
        .bind(request.override_type.as_str())
        .bind(start_time)
        .bind(end_time)
        .bind(break_start)
        .bind(break_end)
        .bind(&request.reason)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("unique_override_date") {
                "An override already exists for this date".to_string()
            } else {
                format!("Failed to create override: {}", e)
            }
        })?;

        tracing::info!(
            date = %request.override_date,
            override_type = ?request.override_type,
            user_id = %user_id,
            "Created working hours override"
        );

        Ok(override_entry.into())
    }

    /// Update an existing override
    pub async fn update_override(
        &self,
        id: Uuid,
        request: UpdateOverrideRequest,
        user_id: Uuid,
    ) -> Result<WorkingHoursOverrideResponse, String> {
        // Get existing override
        let existing = self
            .get_override(id)
            .await
            .map_err(|e| format!("Failed to fetch override: {}", e))?
            .ok_or_else(|| "Override not found".to_string())?;

        // Validate date is today or in the future
        let today = Utc::now().date_naive();
        if existing.override_date < today {
            return Err("Cannot modify overrides for past dates".to_string());
        }

        // Determine the override type to use
        let override_type = request.override_type.unwrap_or(existing.override_type);

        // Validate times based on override type
        let (start_time, end_time) = match override_type {
            OverrideType::Closed => (None, None),
            OverrideType::CustomHours | OverrideType::ExtendedHours => {
                let start = request.start_time.or(existing.start_time);
                let end = request.end_time.or(existing.end_time);
                if start.is_none() || end.is_none() {
                    return Err(format!(
                        "{:?} requires start_time and end_time",
                        override_type
                    ));
                }
                validate_time_range(start.as_deref(), end.as_deref())?
            }
        };

        let break_start_str = request.break_start.or(existing.break_start);
        let break_end_str = request.break_end.or(existing.break_end);
        let (break_start, break_end) = validate_break_times(
            start_time,
            end_time,
            break_start_str.as_deref(),
            break_end_str.as_deref(),
        )?;

        let reason = request.reason.or(existing.reason);

        let override_entry: WorkingHoursOverride = sqlx::query_as(
            r#"
            UPDATE working_hours_overrides
            SET override_type = $1,
                start_time = $2,
                end_time = $3,
                break_start = $4,
                break_end = $5,
                reason = $6,
                updated_at = NOW(),
                updated_by = $7
            WHERE id = $8
            RETURNING id, override_date, override_type, start_time, end_time,
                      break_start, break_end, reason, created_at, updated_at,
                      created_by, updated_by
            "#,
        )
        .bind(override_type.as_str())
        .bind(start_time)
        .bind(end_time)
        .bind(break_start)
        .bind(break_end)
        .bind(&reason)
        .bind(user_id)
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| format!("Failed to update override: {}", e))?;

        tracing::info!(
            id = %id,
            user_id = %user_id,
            "Updated working hours override"
        );

        Ok(override_entry.into())
    }

    /// Delete an override
    pub async fn delete_override(&self, id: Uuid) -> Result<(), String> {
        // Get existing override to check date
        let existing = self
            .get_override(id)
            .await
            .map_err(|e| format!("Failed to fetch override: {}", e))?
            .ok_or_else(|| "Override not found".to_string())?;

        // Allow deleting past overrides (for cleanup) but log it
        let today = Utc::now().date_naive();
        if existing.override_date < today {
            tracing::warn!(
                id = %id,
                date = %existing.override_date,
                "Deleting override for past date"
            );
        }

        sqlx::query("DELETE FROM working_hours_overrides WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete override: {}", e))?;

        tracing::info!(id = %id, "Deleted working hours override");

        Ok(())
    }

    // =========================================================================
    // Effective Working Hours
    // =========================================================================

    /// Get effective working hours for a date range
    /// Combines default schedule with any overrides
    pub async fn get_effective_hours(
        &self,
        query: EffectiveHoursQuery,
    ) -> Result<EffectiveHoursResponse, String> {
        // Get default schedule
        let schedule = self
            .get_weekly_schedule()
            .await
            .map_err(|e| format!("Failed to get weekly schedule: {}", e))?;

        // Get overrides for the date range
        let overrides = self
            .list_overrides(OverridesFilter {
                from_date: Some(query.from_date),
                to_date: Some(query.to_date),
                override_type: None,
                future_only: None,
            })
            .await
            .map_err(|e| format!("Failed to get overrides: {}", e))?;

        // Build a map of date -> override for quick lookup
        let override_map: std::collections::HashMap<NaiveDate, WorkingHoursOverrideResponse> =
            overrides
                .overrides
                .into_iter()
                .map(|o| (o.override_date, o))
                .collect();

        // Iterate through each day in the range
        let mut days = Vec::new();
        let mut current_date = query.from_date;

        while current_date <= query.to_date {
            let day_of_week = Self::naive_date_to_day_of_week(current_date);
            let day_name = day_of_week.display_name().to_string();

            let effective = if let Some(override_entry) = override_map.get(&current_date) {
                // Use override
                EffectiveWorkingHours {
                    date: current_date,
                    day_of_week: day_of_week.as_i16(),
                    day_name,
                    is_working_day: override_entry.override_type != OverrideType::Closed,
                    start_time: override_entry.start_time.clone(),
                    end_time: override_entry.end_time.clone(),
                    break_start: override_entry.break_start.clone(),
                    break_end: override_entry.break_end.clone(),
                    is_override: true,
                    source: "OVERRIDE".to_string(),
                }
            } else {
                // Use default schedule
                let default = schedule
                    .days
                    .iter()
                    .find(|d| d.day_of_week == day_of_week)
                    .cloned();

                match default {
                    Some(d) => EffectiveWorkingHours {
                        date: current_date,
                        day_of_week: day_of_week.as_i16(),
                        day_name,
                        is_working_day: d.is_working_day,
                        start_time: d.start_time,
                        end_time: d.end_time,
                        break_start: d.break_start,
                        break_end: d.break_end,
                        is_override: false,
                        source: "DEFAULT".to_string(),
                    },
                    None => EffectiveWorkingHours {
                        date: current_date,
                        day_of_week: day_of_week.as_i16(),
                        day_name,
                        is_working_day: false,
                        start_time: None,
                        end_time: None,
                        break_start: None,
                        break_end: None,
                        is_override: false,
                        source: "DEFAULT".to_string(),
                    },
                }
            };

            days.push(effective);
            current_date = current_date
                .succ_opt()
                .unwrap_or(current_date);
        }

        Ok(EffectiveHoursResponse {
            from_date: query.from_date,
            to_date: query.to_date,
            days,
        })
    }

    /// Check if a specific date is a working day
    pub async fn is_working_day(&self, date: NaiveDate) -> Result<bool, String> {
        let hours = self.get_effective_hours_for_date(date).await?;
        Ok(hours.is_working_day)
    }

    /// Get effective working hours for a specific date
    ///
    /// Returns the working hours for a specific date, taking into account
    /// any overrides. This is used by the appointment service for availability checking.
    pub async fn get_effective_hours_for_date(
        &self,
        date: NaiveDate,
    ) -> Result<EffectiveWorkingHours, String> {
        // Check for override first
        let override_filter = OverridesFilter {
            from_date: Some(date),
            to_date: Some(date),
            override_type: None,
            future_only: None,
        };

        let overrides = self
            .list_overrides(override_filter)
            .await
            .map_err(|e| format!("Failed to check overrides: {}", e))?;

        let day_of_week = Self::naive_date_to_day_of_week(date);
        let day_name = day_of_week.display_name().to_string();

        if let Some(override_entry) = overrides.overrides.first() {
            // Use override
            return Ok(EffectiveWorkingHours {
                date,
                day_of_week: day_of_week.as_i16(),
                day_name,
                is_working_day: override_entry.override_type != OverrideType::Closed,
                start_time: override_entry.start_time.clone(),
                end_time: override_entry.end_time.clone(),
                break_start: override_entry.break_start.clone(),
                break_end: override_entry.break_end.clone(),
                is_override: true,
                source: "OVERRIDE".to_string(),
            });
        }

        // Check default schedule
        let default = self
            .get_day_working_hours(day_of_week.as_i16())
            .await
            .map_err(|e| format!("Failed to get default hours: {}", e))?;

        Ok(match default {
            Some(d) => EffectiveWorkingHours {
                date,
                day_of_week: day_of_week.as_i16(),
                day_name,
                is_working_day: d.is_working_day,
                start_time: d.start_time,
                end_time: d.end_time,
                break_start: d.break_start,
                break_end: d.break_end,
                is_override: false,
                source: "DEFAULT".to_string(),
            },
            None => EffectiveWorkingHours {
                date,
                day_of_week: day_of_week.as_i16(),
                day_name,
                is_working_day: false,
                start_time: None,
                end_time: None,
                break_start: None,
                break_end: None,
                is_override: false,
                source: "DEFAULT".to_string(),
            },
        })
    }

    /// Convert NaiveDate to DayOfWeek (ISO 8601: Monday = 1)
    fn naive_date_to_day_of_week(date: NaiveDate) -> DayOfWeek {
        // chrono's weekday(): Mon=0, Tue=1, ..., Sun=6
        // We want: Mon=1, Tue=2, ..., Sun=7
        let weekday = date.weekday().num_days_from_monday() as i16 + 1;
        DayOfWeek::from_i16(weekday).unwrap_or(DayOfWeek::Monday)
    }
}
