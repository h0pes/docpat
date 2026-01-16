/*!
 * Appointment Service Layer
 *
 * Business logic for appointment management, including:
 * - Conflict detection and prevention
 * - Availability checking
 * - Recurring appointments
 * - Status workflow management
 * - Audit logging
 */

use crate::models::{
    Appointment, AppointmentDto, AppointmentSearchFilter, AppointmentStatistics,
    AppointmentStatus, AppointmentType, AuditAction, AuditLog, CreateAuditLog,
    CreateAppointmentRequest, EntityType, RecurringPattern, RequestContext, TimeSlot,
    UpdateAppointmentRequest,
};
use crate::services::{HolidayService, WorkingHoursService};
use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Duration, NaiveTime, TimeZone, Utc};
use chrono_tz::Europe::Rome;
use sqlx::{PgPool, Postgres, Transaction};
use std::collections::HashMap;
use uuid::Uuid;
use validator::Validate;

/// Fallback business hours when working hours are not configured
const FALLBACK_START_HOUR: u32 = 8; // 8:00 AM
const FALLBACK_END_HOUR: u32 = 18; // 6:00 PM
const DEFAULT_SLOT_DURATION: i64 = 30; // 30 minutes

/// Appointment service
pub struct AppointmentService {
    pool: PgPool,
}

impl AppointmentService {
    /// Create a new appointment service
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Helper to set RLS context in a transaction
    ///
    /// This sets the PostgreSQL session variables required by Row-Level Security policies.
    async fn set_rls_context(
        tx: &mut Transaction<'_, Postgres>,
        user_id: Uuid,
    ) -> Result<()> {
        // Query the user's role from the database
        let role: String = sqlx::query_scalar(
            "SELECT role::TEXT FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_one(&mut **tx)
        .await
        .context("Failed to fetch user role for RLS context")?;

        // Set RLS context variables
        let user_id_query = format!("SET LOCAL app.current_user_id = '{}'", user_id);
        let role_query = format!("SET LOCAL app.current_user_role = '{}'", role);

        sqlx::query(&user_id_query)
            .execute(&mut **tx)
            .await
            .context("Failed to set RLS user context")?;

        sqlx::query(&role_query)
            .execute(&mut **tx)
            .await
            .context("Failed to set RLS role context")?;

        Ok(())
    }

    /// Create a new appointment with conflict detection
    ///
    /// This validates the appointment, checks for conflicts, and creates the record.
    pub async fn create_appointment(
        &self,
        data: CreateAppointmentRequest,
        created_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<AppointmentDto> {
        // Validate request
        data.validate()
            .context("Invalid appointment data")?;
        data.validate_appointment()
            .map_err(|e| anyhow!(e))?;

        // Parse UUIDs
        let patient_id = Uuid::parse_str(&data.patient_id)
            .context("Invalid patient ID")?;
        let provider_id = Uuid::parse_str(&data.provider_id)
            .context("Invalid provider ID")?;

        // Calculate end time
        let scheduled_end = data.scheduled_start
            + Duration::minutes(data.duration_minutes as i64);

        // Validate against working hours and holidays BEFORE starting transaction
        self.validate_working_hours_and_holidays(data.scheduled_start, scheduled_end)
            .await?;

        // Start transaction for conflict check + insert
        let mut tx = self.pool.begin().await?;

        // Set RLS context
        Self::set_rls_context(&mut tx, created_by_id).await?;

        // Check for conflicts
        self.check_conflicts(
            &mut tx,
            provider_id,
            data.scheduled_start,
            scheduled_end,
            None, // No existing appointment ID for creates
        )
        .await?;

        // Verify patient exists
        self.verify_patient_exists(&mut tx, patient_id).await?;

        // Verify provider exists
        self.verify_provider_exists(&mut tx, provider_id).await?;

        // Insert appointment
        let appointment = sqlx::query_as::<_, Appointment>(
            r#"
            INSERT INTO appointments (
                patient_id, provider_id, scheduled_start, scheduled_end,
                duration_minutes, type, reason, notes,
                is_recurring, recurring_pattern,
                created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            "#,
        )
        .bind(patient_id)
        .bind(provider_id)
        .bind(data.scheduled_start)
        .bind(scheduled_end)
        .bind(data.duration_minutes)
        .bind(data.appointment_type)
        .bind(data.reason)
        .bind(data.notes)
        .bind(data.is_recurring.unwrap_or(false))
        .bind(data.recurring_pattern.map(sqlx::types::Json))
        .bind(created_by_id)
        .bind(created_by_id)
        .fetch_one(&mut *tx)
        .await
        .context("Failed to create appointment")?;

        // Create recurring appointments if needed
        if appointment.is_recurring {
            if let Some(pattern) = &appointment.recurring_pattern {
                self.create_recurring_series(
                    &mut tx,
                    &appointment,
                    &pattern.0,
                    created_by_id,
                )
                .await?;
            }
        }

        tx.commit().await?;

        // Audit log (after commit, failures don't affect transaction)
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(created_by_id),
                action: AuditAction::Create,
                entity_type: EntityType::Appointment,
                entity_id: Some(appointment.id.to_string()),
                changes: Some(serde_json::json!({
                    "patient_id": patient_id,
                    "provider_id": provider_id,
                    "scheduled_start": data.scheduled_start,
                    "type": data.appointment_type,
                })),
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        Ok(appointment.into())
    }

    /// Get appointment by ID
    pub async fn get_appointment(
        &self,
        id: Uuid,
        user_id: Option<Uuid>,
        request_ctx: Option<&RequestContext>,
    ) -> Result<Option<AppointmentDto>> {
        // If user_id is provided, use RLS context
        let appointment = if let Some(uid) = user_id {
            let mut tx = self.pool.begin().await?;
            Self::set_rls_context(&mut tx, uid).await?;

            let appt = sqlx::query_as::<_, Appointment>(
                r#"SELECT * FROM appointments WHERE id = $1"#,
            )
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

            tx.commit().await?;
            appt
        } else {
            sqlx::query_as::<_, Appointment>(
                r#"SELECT * FROM appointments WHERE id = $1"#,
            )
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
        };

        if let Some(ref appt) = appointment {
            // Audit log
            let _ = AuditLog::create(
                &self.pool,
                CreateAuditLog {
                    user_id,
                    action: AuditAction::Read,
                    entity_type: EntityType::Appointment,
                    entity_id: Some(appt.id.to_string()),
                    changes: None,
                    ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                    user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                    request_id: request_ctx.map(|c| c.request_id),
                },
            )
            .await;
        }

        Ok(appointment.map(|a| a.into()))
    }

    /// Update appointment
    pub async fn update_appointment(
        &self,
        id: Uuid,
        data: UpdateAppointmentRequest,
        updated_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<AppointmentDto> {
        // Validate request
        data.validate()
            .context("Invalid update data")?;

        let mut tx = self.pool.begin().await?;

        // Set RLS context
        Self::set_rls_context(&mut tx, updated_by_id).await?;

        // Get existing appointment
        let existing = self.get_appointment_for_update(&mut tx, id).await?;

        // Check if status transition is valid
        if let Some(new_status) = data.status {
            if !existing.status.can_transition_to(&new_status) {
                return Err(anyhow!(
                    "Invalid status transition from {:?} to {:?}",
                    existing.status,
                    new_status
                ));
            }
        }

        // If rescheduling, validate working hours/holidays and check for conflicts
        if let Some(new_start) = data.scheduled_start {
            let duration = data.duration_minutes.unwrap_or(existing.duration_minutes);
            let new_end = new_start + Duration::minutes(duration as i64);

            // Validate against working hours and holidays
            self.validate_working_hours_and_holidays(new_start, new_end)
                .await?;

            self.check_conflicts(
                &mut tx,
                existing.provider_id,
                new_start,
                new_end,
                Some(id), // Exclude current appointment from conflict check
            )
            .await?;
        } else if let Some(new_duration) = data.duration_minutes {
            // If only duration is changing, need to validate the new end time
            let new_end = existing.scheduled_start + Duration::minutes(new_duration as i64);
            self.validate_working_hours_and_holidays(existing.scheduled_start, new_end)
                .await?;
        }

        // Build update query dynamically
        let mut updates = Vec::new();
        let mut param_index = 1;

        if data.scheduled_start.is_some() {
            updates.push(format!("scheduled_start = ${}", param_index));
            param_index += 1;
        }
        if data.duration_minutes.is_some() {
            updates.push(format!("duration_minutes = ${}", param_index));
            param_index += 1;
            // Also update scheduled_end
            updates.push(format!("scheduled_end = scheduled_start + (duration_minutes || ' minutes')::INTERVAL"));
        }
        if data.appointment_type.is_some() {
            updates.push(format!("type = ${}", param_index));
            param_index += 1;
        }
        if data.reason.is_some() {
            updates.push(format!("reason = ${}", param_index));
            param_index += 1;
        }
        if data.notes.is_some() {
            updates.push(format!("notes = ${}", param_index));
            param_index += 1;
        }
        if data.status.is_some() {
            updates.push(format!("status = ${}", param_index));
            param_index += 1;
        }
        if data.cancellation_reason.is_some() {
            updates.push(format!("cancellation_reason = ${}", param_index));
            param_index += 1;
        }

        if updates.is_empty() {
            return Ok(existing.into());
        }

        updates.push(format!("updated_by = ${}", param_index));
        param_index += 1;
        updates.push("updated_at = NOW()".to_string());

        let query_str = format!(
            "UPDATE appointments SET {} WHERE id = ${} RETURNING *",
            updates.join(", "),
            param_index
        );

        // Serialize data for audit log before consuming it
        let audit_changes = serde_json::to_value(&data)?;

        let mut query = sqlx::query_as::<_, Appointment>(&query_str);

        // Bind parameters in the same order
        if let Some(start) = data.scheduled_start {
            query = query.bind(start);
        }
        if let Some(duration) = data.duration_minutes {
            query = query.bind(duration);
        }
        if let Some(apt_type) = data.appointment_type {
            query = query.bind(apt_type);
        }
        if let Some(reason) = data.reason {
            query = query.bind(reason);
        }
        if let Some(notes) = data.notes {
            query = query.bind(notes);
        }
        if let Some(status) = data.status {
            query = query.bind(status);
        }
        if let Some(cancel_reason) = data.cancellation_reason {
            query = query.bind(cancel_reason);
        }
        query = query.bind(updated_by_id);
        query = query.bind(id);

        let updated = query
            .fetch_one(&mut *tx)
            .await
            .context("Failed to update appointment")?;

        tx.commit().await?;

        // Audit log (after commit)
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(updated_by_id),
                action: AuditAction::Update,
                entity_type: EntityType::Appointment,
                entity_id: Some(id.to_string()),
                changes: Some(audit_changes),
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        Ok(updated.into())
    }

    /// Cancel appointment
    pub async fn cancel_appointment(
        &self,
        id: Uuid,
        cancellation_reason: String,
        cancelled_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<AppointmentDto> {
        let mut tx = self.pool.begin().await?;

        // Set RLS context
        Self::set_rls_context(&mut tx, cancelled_by_id).await?;

        // Get existing appointment
        let existing = self.get_appointment_for_update(&mut tx, id).await?;

        // Check if can be cancelled
        if !existing.can_cancel() {
            return Err(anyhow!(
                "Appointment with status {:?} cannot be cancelled",
                existing.status
            ));
        }

        // Update to cancelled
        let cancelled = sqlx::query_as::<_, Appointment>(
            r#"
            UPDATE appointments
            SET status = 'CANCELLED',
                cancellation_reason = $1,
                cancelled_at = NOW(),
                cancelled_by = $2,
                updated_at = NOW(),
                updated_by = $2
            WHERE id = $3
            RETURNING *
            "#,
        )
        .bind(&cancellation_reason)
        .bind(cancelled_by_id)
        .bind(id)
        .fetch_one(&mut *tx)
        .await
        .context("Failed to cancel appointment")?;

        tx.commit().await?;

        // Audit log (after commit)
        let _ = AuditLog::create(
            &self.pool,
            CreateAuditLog {
                user_id: Some(cancelled_by_id),
                action: AuditAction::Update,
                entity_type: EntityType::Appointment,
                entity_id: Some(id.to_string()),
                changes: Some(serde_json::json!({
                    "status": "CANCELLED",
                    "cancellation_reason": cancellation_reason,
                })),
                ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                request_id: request_ctx.map(|c| c.request_id),
            },
        )
        .await;

        Ok(cancelled.into())
    }

    /// Delete appointment (soft delete by cancelling)
    pub async fn delete_appointment(
        &self,
        id: Uuid,
        deleted_by_id: Uuid,
        request_ctx: Option<&RequestContext>,
    ) -> Result<()> {
        self.cancel_appointment(
            id,
            "Appointment deleted".to_string(),
            deleted_by_id,
            request_ctx,
        )
        .await?;

        Ok(())
    }

    /// List appointments with filtering
    pub async fn list_appointments(
        &self,
        filter: AppointmentSearchFilter,
        user_id: Option<Uuid>,
        request_ctx: Option<&RequestContext>,
    ) -> Result<(Vec<AppointmentDto>, i64)> {
        // Validate filter
        filter.validate()
            .context("Invalid search filter")?;

        let limit = filter.limit.unwrap_or(50);
        let offset = filter.offset.unwrap_or(0);

        // Build query dynamically
        let mut where_clauses = Vec::new();
        let mut param_index = 1;

        if filter.patient_id.is_some() {
            where_clauses.push(format!("patient_id = ${}", param_index));
            param_index += 1;
        }
        if filter.provider_id.is_some() {
            where_clauses.push(format!("provider_id = ${}", param_index));
            param_index += 1;
        }
        if filter.status.is_some() {
            where_clauses.push(format!("status = ${}", param_index));
            param_index += 1;
        }
        if filter.appointment_type.is_some() {
            where_clauses.push(format!("type = ${}", param_index));
            param_index += 1;
        }
        if filter.start_date.is_some() {
            where_clauses.push(format!("scheduled_start >= ${}", param_index));
            param_index += 1;
        }
        if filter.end_date.is_some() {
            where_clauses.push(format!("scheduled_end <= ${}", param_index));
            param_index += 1;
        }

        let where_clause = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_clauses.join(" AND "))
        };

        // Use transaction with RLS context if user_id is provided
        let (total, appointments) = if let Some(uid) = user_id {
            let mut tx = self.pool.begin().await?;
            Self::set_rls_context(&mut tx, uid).await?;

            // Count query
            let count_query = format!("SELECT COUNT(*) FROM appointments {}", where_clause);
            let mut count_q = sqlx::query_scalar::<_, i64>(&count_query);

            if let Some(patient_id) = filter.patient_id {
                count_q = count_q.bind(patient_id);
            }
            if let Some(provider_id) = filter.provider_id {
                count_q = count_q.bind(provider_id);
            }
            if let Some(status) = filter.status {
                count_q = count_q.bind(status);
            }
            if let Some(apt_type) = filter.appointment_type {
                count_q = count_q.bind(apt_type);
            }
            if let Some(start_date) = filter.start_date {
                count_q = count_q.bind(start_date);
            }
            if let Some(end_date) = filter.end_date {
                count_q = count_q.bind(end_date);
            }

            let total = count_q.fetch_one(&mut *tx).await?;

            // Data query
            let data_query = format!(
                "SELECT * FROM appointments {} ORDER BY scheduled_start DESC LIMIT ${} OFFSET ${}",
                where_clause, param_index, param_index + 1
            );

            let mut data_q = sqlx::query_as::<_, Appointment>(&data_query);

            if let Some(patient_id) = filter.patient_id {
                data_q = data_q.bind(patient_id);
            }
            if let Some(provider_id) = filter.provider_id {
                data_q = data_q.bind(provider_id);
            }
            if let Some(status) = filter.status {
                data_q = data_q.bind(status);
            }
            if let Some(apt_type) = filter.appointment_type {
                data_q = data_q.bind(apt_type);
            }
            if let Some(start_date) = filter.start_date {
                data_q = data_q.bind(start_date);
            }
            if let Some(end_date) = filter.end_date {
                data_q = data_q.bind(end_date);
            }
            data_q = data_q.bind(limit);
            data_q = data_q.bind(offset);

            let appointments = data_q.fetch_all(&mut *tx).await?;
            tx.commit().await?;

            (total, appointments)
        } else {
            // Fallback without RLS context (for system/admin operations)
            // Count query
            let count_query = format!("SELECT COUNT(*) FROM appointments {}", where_clause);
            let mut count_q = sqlx::query_scalar::<_, i64>(&count_query);

            if let Some(patient_id) = filter.patient_id {
                count_q = count_q.bind(patient_id);
            }
            if let Some(provider_id) = filter.provider_id {
                count_q = count_q.bind(provider_id);
            }
            if let Some(status) = filter.status {
                count_q = count_q.bind(status);
            }
            if let Some(apt_type) = filter.appointment_type {
                count_q = count_q.bind(apt_type);
            }
            if let Some(start_date) = filter.start_date {
                count_q = count_q.bind(start_date);
            }
            if let Some(end_date) = filter.end_date {
                count_q = count_q.bind(end_date);
            }

            let total = count_q.fetch_one(&self.pool).await?;

            // Data query
            let data_query = format!(
                "SELECT * FROM appointments {} ORDER BY scheduled_start DESC LIMIT ${} OFFSET ${}",
                where_clause, param_index, param_index + 1
            );

            let mut data_q = sqlx::query_as::<_, Appointment>(&data_query);

            if let Some(patient_id) = filter.patient_id {
                data_q = data_q.bind(patient_id);
            }
            if let Some(provider_id) = filter.provider_id {
                data_q = data_q.bind(provider_id);
            }
            if let Some(status) = filter.status {
                data_q = data_q.bind(status);
            }
            if let Some(apt_type) = filter.appointment_type {
                data_q = data_q.bind(apt_type);
            }
            if let Some(start_date) = filter.start_date {
                data_q = data_q.bind(start_date);
            }
            if let Some(end_date) = filter.end_date {
                data_q = data_q.bind(end_date);
            }
            data_q = data_q.bind(limit);
            data_q = data_q.bind(offset);

            let appointments = data_q.fetch_all(&self.pool).await?;
            (total, appointments)
        };

        // Audit log for search
        if user_id.is_some() {
            let _ = AuditLog::create(
                &self.pool,
                CreateAuditLog {
                    user_id,
                    action: AuditAction::Read,
                    entity_type: EntityType::Appointment,
                    entity_id: None,
                    changes: Some(serde_json::to_value(&filter)?),
                    ip_address: request_ctx.and_then(|c| c.ip_address.clone()),
                    user_agent: request_ctx.and_then(|c| c.user_agent.clone()),
                    request_id: request_ctx.map(|c| c.request_id),
                },
            )
            .await;
        }

        let dtos = appointments.into_iter().map(|a| a.into()).collect();

        Ok((dtos, total))
    }

    /// Get appointment statistics
    pub async fn get_statistics(&self) -> Result<AppointmentStatistics> {
        // Total appointments
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM appointments")
            .fetch_one(&self.pool)
            .await?;

        // By status
        let status_rows: Vec<(String, i64)> = sqlx::query_as(
            "SELECT status::TEXT, COUNT(*) FROM appointments GROUP BY status",
        )
        .fetch_all(&self.pool)
        .await?;

        let mut by_status = HashMap::new();
        for (status, count) in status_rows {
            by_status.insert(status, count);
        }

        // By type
        let type_rows: Vec<(String, i64)> = sqlx::query_as(
            "SELECT type::TEXT, COUNT(*) FROM appointments GROUP BY type",
        )
        .fetch_all(&self.pool)
        .await?;

        let mut by_type = HashMap::new();
        for (apt_type, count) in type_rows {
            by_type.insert(apt_type, count);
        }

        // Upcoming today
        let upcoming_today: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM appointments
            WHERE scheduled_start >= CURRENT_DATE
              AND scheduled_start < CURRENT_DATE + INTERVAL '1 day'
              AND status IN ('SCHEDULED', 'CONFIRMED')
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // Upcoming this week
        let upcoming_week: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM appointments
            WHERE scheduled_start >= CURRENT_DATE
              AND scheduled_start < CURRENT_DATE + INTERVAL '7 days'
              AND status IN ('SCHEDULED', 'CONFIRMED')
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // No-show rate
        let no_shows: f64 = sqlx::query_scalar(
            "SELECT COUNT(*)::FLOAT FROM appointments WHERE status = 'NO_SHOW'",
        )
        .fetch_one(&self.pool)
        .await?;

        let no_show_rate = if total > 0 {
            (no_shows / total as f64) * 100.0
        } else {
            0.0
        };

        // Cancellation rate
        let cancellations: f64 = sqlx::query_scalar(
            "SELECT COUNT(*)::FLOAT FROM appointments WHERE status = 'CANCELLED'",
        )
        .fetch_one(&self.pool)
        .await?;

        let cancellation_rate = if total > 0 {
            (cancellations / total as f64) * 100.0
        } else {
            0.0
        };

        Ok(AppointmentStatistics {
            total,
            by_status,
            by_type,
            upcoming_today,
            upcoming_week,
            no_show_rate,
            cancellation_rate,
        })
    }

    /// Validate appointment time against working hours and holidays
    ///
    /// Checks that:
    /// 1. The date is not a holiday
    /// 2. The date is a working day
    /// 3. The time falls within working hours
    /// 4. The time does not overlap with break times
    async fn validate_working_hours_and_holidays(
        &self,
        scheduled_start: DateTime<Utc>,
        scheduled_end: DateTime<Utc>,
    ) -> Result<()> {
        let date_naive = scheduled_start.date_naive();

        // Check if this date is a holiday
        let holiday_service = HolidayService::new(self.pool.clone());
        let is_holiday = holiday_service
            .is_holiday(date_naive)
            .await
            .map_err(|e| anyhow!("Failed to check holiday: {}", e))?;

        if is_holiday {
            return Err(anyhow!(
                "Cannot schedule appointment on a holiday ({})",
                date_naive.format("%Y-%m-%d")
            ));
        }

        // Get effective working hours for this date
        let working_hours_service = WorkingHoursService::new(self.pool.clone());
        let effective_hours = working_hours_service
            .get_effective_hours_for_date(date_naive)
            .await
            .map_err(|e| anyhow!("Failed to get working hours: {}", e))?;

        // Check if it's a working day
        if !effective_hours.is_working_day {
            return Err(anyhow!(
                "Cannot schedule appointment on a non-working day ({})",
                date_naive.format("%Y-%m-%d")
            ));
        }

        // Parse working hours
        let start_time = effective_hours
            .start_time
            .as_ref()
            .and_then(|t| parse_time_str(t))
            .unwrap_or((FALLBACK_START_HOUR, 0));

        let end_time = effective_hours
            .end_time
            .as_ref()
            .and_then(|t| parse_time_str(t))
            .unwrap_or((FALLBACK_END_HOUR, 0));

        // Get appointment times in local timezone (Europe/Rome)
        // Working hours are defined in local time, so we must convert UTC to local for comparison
        let local_start = scheduled_start.with_timezone(&Rome);
        let local_end = scheduled_end.with_timezone(&Rome);
        let appt_start_time = local_start.time();
        let appt_end_time = local_end.time();

        let working_start = NaiveTime::from_hms_opt(start_time.0, start_time.1, 0)
            .unwrap_or(NaiveTime::from_hms_opt(8, 0, 0).unwrap());
        let working_end = NaiveTime::from_hms_opt(end_time.0, end_time.1, 0)
            .unwrap_or(NaiveTime::from_hms_opt(18, 0, 0).unwrap());

        // Check if appointment is within working hours
        if appt_start_time < working_start || appt_end_time > working_end {
            return Err(anyhow!(
                "Appointment time ({} - {}) is outside working hours ({} - {})",
                appt_start_time.format("%H:%M"),
                appt_end_time.format("%H:%M"),
                working_start.format("%H:%M"),
                working_end.format("%H:%M")
            ));
        }

        // Check if appointment overlaps with break time
        if let (Some(break_start_str), Some(break_end_str)) =
            (&effective_hours.break_start, &effective_hours.break_end)
        {
            if let (Some((break_start_h, break_start_m)), Some((break_end_h, break_end_m))) =
                (parse_time_str(break_start_str), parse_time_str(break_end_str))
            {
                let break_start = NaiveTime::from_hms_opt(break_start_h, break_start_m, 0)
                    .unwrap_or(NaiveTime::from_hms_opt(12, 0, 0).unwrap());
                let break_end = NaiveTime::from_hms_opt(break_end_h, break_end_m, 0)
                    .unwrap_or(NaiveTime::from_hms_opt(13, 0, 0).unwrap());

                // Check if appointment overlaps with break
                // Overlap occurs if: appt_start < break_end AND appt_end > break_start
                if appt_start_time < break_end && appt_end_time > break_start {
                    return Err(anyhow!(
                        "Appointment time ({} - {}) overlaps with break time ({} - {})",
                        appt_start_time.format("%H:%M"),
                        appt_end_time.format("%H:%M"),
                        break_start.format("%H:%M"),
                        break_end.format("%H:%M")
                    ));
                }
            }
        }

        Ok(())
    }

    /// Check for scheduling conflicts
    ///
    /// Returns an error if there's an overlapping appointment for the same provider
    async fn check_conflicts(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        provider_id: Uuid,
        scheduled_start: DateTime<Utc>,
        scheduled_end: DateTime<Utc>,
        exclude_id: Option<Uuid>,
    ) -> Result<()> {
        let query = if let Some(id) = exclude_id {
            sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*)
                FROM appointments
                WHERE provider_id = $1
                  AND id != $2
                  AND status NOT IN ('CANCELLED', 'NO_SHOW')
                  AND tstzrange(scheduled_start, scheduled_end) && tstzrange($3, $4)
                "#,
            )
            .bind(provider_id)
            .bind(id)
            .bind(scheduled_start)
            .bind(scheduled_end)
        } else {
            sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*)
                FROM appointments
                WHERE provider_id = $1
                  AND status NOT IN ('CANCELLED', 'NO_SHOW')
                  AND tstzrange(scheduled_start, scheduled_end) && tstzrange($2, $3)
                "#,
            )
            .bind(provider_id)
            .bind(scheduled_start)
            .bind(scheduled_end)
        };

        let conflicts = query.fetch_one(&mut **tx).await?;

        if conflicts > 0 {
            return Err(anyhow!("Scheduling conflict detected for provider at this time"));
        }

        Ok(())
    }

    /// Verify patient exists
    async fn verify_patient_exists(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        patient_id: Uuid,
    ) -> Result<()> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM patients WHERE id = $1 AND status = 'ACTIVE')",
        )
        .bind(patient_id)
        .fetch_one(&mut **tx)
        .await?;

        if !exists {
            return Err(anyhow!("Patient not found or inactive"));
        }

        Ok(())
    }

    /// Verify provider exists
    async fn verify_provider_exists(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        provider_id: Uuid,
    ) -> Result<()> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND is_active = true)",
        )
        .bind(provider_id)
        .fetch_one(&mut **tx)
        .await?;

        if !exists {
            return Err(anyhow!("Provider not found or inactive"));
        }

        Ok(())
    }

    /// Get appointment for update (with lock)
    async fn get_appointment_for_update(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        id: Uuid,
    ) -> Result<Appointment> {
        sqlx::query_as::<_, Appointment>(
            "SELECT * FROM appointments WHERE id = $1 FOR UPDATE",
        )
        .bind(id)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or_else(|| anyhow!("Appointment not found"))
    }

    /// Create recurring appointment series
    ///
    /// Automatically skips holidays, non-working days, and conflicting time slots.
    async fn create_recurring_series(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        parent: &Appointment,
        pattern: &RecurringPattern,
        created_by_id: Uuid,
    ) -> Result<()> {
        let mut current_date = parent.scheduled_start;
        let mut count = 0;
        let mut skipped = 0;
        let max_count = pattern.max_occurrences.unwrap_or(52); // Default to 1 year
        let max_attempts = max_count * 3; // Allow up to 3x attempts to find valid slots

        while count < max_count && skipped < max_attempts {
            // Calculate next occurrence
            current_date = self.calculate_next_occurrence(current_date, pattern);

            // Check if we've reached the end date
            if let Some(end_date) = pattern.end_date {
                if current_date > end_date {
                    break;
                }
            }

            let scheduled_end = current_date + Duration::minutes(parent.duration_minutes as i64);

            // Skip holidays and non-working days
            if self
                .validate_working_hours_and_holidays(current_date, scheduled_end)
                .await
                .is_err()
            {
                tracing::debug!(
                    date = %current_date.date_naive(),
                    "Skipping recurring appointment - holiday or non-working day"
                );
                skipped += 1;
                continue;
            }

            // Check for conflicts with other appointments
            if self.check_conflicts(
                tx,
                parent.provider_id,
                current_date,
                scheduled_end,
                None,
            )
            .await
            .is_err()
            {
                // Skip conflicting appointments
                tracing::debug!(
                    date = %current_date.date_naive(),
                    "Skipping recurring appointment - conflict with existing appointment"
                );
                skipped += 1;
                continue;
            }

            // Create appointment in series
            sqlx::query(
                r#"
                INSERT INTO appointments (
                    patient_id, provider_id, scheduled_start, scheduled_end,
                    duration_minutes, type, reason, notes,
                    is_recurring, parent_appointment_id,
                    created_by, updated_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11)
                "#,
            )
            .bind(parent.patient_id)
            .bind(parent.provider_id)
            .bind(current_date)
            .bind(scheduled_end)
            .bind(parent.duration_minutes)
            .bind(parent.appointment_type)
            .bind(&parent.reason)
            .bind(&parent.notes)
            .bind(parent.id) // parent_appointment_id
            .bind(created_by_id)
            .bind(created_by_id)
            .execute(&mut **tx)
            .await?;

            count += 1;
        }

        Ok(())
    }

    /// Calculate next occurrence based on recurring pattern
    fn calculate_next_occurrence(
        &self,
        current: DateTime<Utc>,
        pattern: &RecurringPattern,
    ) -> DateTime<Utc> {
        use crate::models::RecurringFrequency;

        match pattern.frequency {
            RecurringFrequency::Daily => {
                current + Duration::days(pattern.interval as i64)
            }
            RecurringFrequency::Weekly => {
                current + Duration::weeks(pattern.interval as i64)
            }
            RecurringFrequency::BiWeekly => {
                current + Duration::weeks(2 * pattern.interval as i64)
            }
            RecurringFrequency::Monthly => {
                // Approximate (doesn't handle month boundaries perfectly)
                current + Duration::days(30 * pattern.interval as i64)
            }
        }
    }

    /// Check appointment availability for a provider on a given date
    ///
    /// Returns time slots showing which are available and which are booked.
    /// Respects working hours configuration, overrides, and holidays.
    pub async fn check_availability(
        &self,
        provider_id: Uuid,
        date: DateTime<Utc>,
        duration_minutes: i32,
    ) -> Result<Vec<TimeSlot>> {
        let date_naive = date.date_naive();

        // Check if this date is a holiday (block all appointments on holidays)
        let holiday_service = HolidayService::new(self.pool.clone());
        let is_holiday = holiday_service
            .is_holiday(date_naive)
            .await
            .map_err(|e| anyhow!("Failed to check holiday: {}", e))?;

        // If this is a holiday, return empty slots (no appointments on holidays)
        if is_holiday {
            tracing::debug!(date = %date_naive, "Date is a holiday, no availability");
            return Ok(Vec::new());
        }

        // Get effective working hours for this date
        let working_hours_service = WorkingHoursService::new(self.pool.clone());
        let effective_hours = working_hours_service
            .get_effective_hours_for_date(date_naive)
            .await
            .map_err(|e| anyhow!("Failed to get working hours: {}", e))?;

        // If not a working day, return empty slots
        if !effective_hours.is_working_day {
            return Ok(Vec::new());
        }

        // Parse working hours (with fallback to defaults)
        let (start_hour, start_min) = match &effective_hours.start_time {
            Some(time) => parse_time_str(time).unwrap_or((FALLBACK_START_HOUR, 0)),
            None => (FALLBACK_START_HOUR, 0),
        };

        let (end_hour, end_min) = match &effective_hours.end_time {
            Some(time) => parse_time_str(time).unwrap_or((FALLBACK_END_HOUR, 0)),
            None => (FALLBACK_END_HOUR, 0),
        };

        // Parse break times if configured
        let break_start = effective_hours.break_start.as_ref().and_then(|t| parse_time_str(t));
        let break_end = effective_hours.break_end.as_ref().and_then(|t| parse_time_str(t));

        let day_start = date_naive.and_hms_opt(start_hour, start_min, 0)
            .ok_or_else(|| anyhow!("Invalid start time"))?;
        let day_end = date_naive.and_hms_opt(end_hour, end_min, 0)
            .ok_or_else(|| anyhow!("Invalid end time"))?;

        // Convert local times (Europe/Rome) to UTC for database queries
        // Working hours are in local time, but DB stores appointments in UTC
        let day_start_local = Rome.from_local_datetime(&day_start)
            .single()
            .ok_or_else(|| anyhow!("Invalid local start time"))?;
        let day_end_local = Rome.from_local_datetime(&day_end)
            .single()
            .ok_or_else(|| anyhow!("Invalid local end time"))?;

        let day_start_utc = day_start_local.with_timezone(&Utc);
        let day_end_utc = day_end_local.with_timezone(&Utc);

        // Get all appointments for this provider on this date
        let booked_appointments = sqlx::query_as::<_, Appointment>(
            r#"
            SELECT * FROM appointments
            WHERE provider_id = $1
              AND scheduled_start >= $2
              AND scheduled_end <= $3
              AND status NOT IN ('CANCELLED', 'NO_SHOW')
            ORDER BY scheduled_start
            "#,
        )
        .bind(provider_id)
        .bind(day_start_utc)
        .bind(day_end_utc)
        .fetch_all(&self.pool)
        .await?;

        // Generate time slots
        let slot_duration = Duration::minutes(duration_minutes as i64);
        let mut slots = Vec::new();
        let mut current_time = day_start_utc;

        while current_time < day_end_utc {
            let slot_end = current_time + slot_duration;

            // Check if this slot is during a break
            let is_during_break = if let (Some((break_start_h, break_start_m)), Some((break_end_h, break_end_m))) = (break_start, break_end) {
                // Convert slot time from UTC to local for break comparison (breaks are in local time)
                let slot_time_local = current_time.with_timezone(&Rome).time();
                let break_start_time = NaiveTime::from_hms_opt(break_start_h, break_start_m, 0)
                    .unwrap_or(NaiveTime::from_hms_opt(12, 0, 0).unwrap());
                let break_end_time = NaiveTime::from_hms_opt(break_end_h, break_end_m, 0)
                    .unwrap_or(NaiveTime::from_hms_opt(13, 0, 0).unwrap());

                slot_time_local >= break_start_time && slot_time_local < break_end_time
            } else {
                false
            };

            // Check if this slot conflicts with any booked appointment
            let is_conflicted = booked_appointments.iter().any(|appt| {
                // Check if slot overlaps with appointment
                (current_time >= appt.scheduled_start && current_time < appt.scheduled_end)
                    || (slot_end > appt.scheduled_start && slot_end <= appt.scheduled_end)
                    || (current_time <= appt.scheduled_start && slot_end >= appt.scheduled_end)
            });

            let is_available = !is_during_break && !is_conflicted;

            slots.push(TimeSlot {
                start: current_time,
                end: slot_end,
                available: is_available,
            });

            // Move to next slot (default 30 minute increments)
            current_time = current_time + Duration::minutes(DEFAULT_SLOT_DURATION);
        }

        Ok(slots)
    }

    /// Get daily schedule for a provider
    ///
    /// Returns all appointments for a provider on a specific date
    pub async fn get_daily_schedule(
        &self,
        provider_id: Uuid,
        date: DateTime<Utc>,
    ) -> Result<Vec<AppointmentDto>> {
        let day_start = date.date_naive().and_hms_opt(0, 0, 0)
            .ok_or_else(|| anyhow!("Invalid start time"))?;
        let day_end = date.date_naive().and_hms_opt(23, 59, 59)
            .ok_or_else(|| anyhow!("Invalid end time"))?;

        let day_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(day_start, Utc);
        let day_end_utc = DateTime::<Utc>::from_naive_utc_and_offset(day_end, Utc);

        let appointments = sqlx::query_as::<_, Appointment>(
            r#"
            SELECT * FROM appointments
            WHERE provider_id = $1
              AND scheduled_start >= $2
              AND scheduled_end <= $3
            ORDER BY scheduled_start
            "#,
        )
        .bind(provider_id)
        .bind(day_start_utc)
        .bind(day_end_utc)
        .fetch_all(&self.pool)
        .await?;

        Ok(appointments.into_iter().map(|a| a.into()).collect())
    }

    /// Get weekly schedule for a provider
    ///
    /// Returns all appointments for a provider for the week containing the given date
    pub async fn get_weekly_schedule(
        &self,
        provider_id: Uuid,
        date: DateTime<Utc>,
    ) -> Result<Vec<AppointmentDto>> {
        // Calculate start of week (Monday)
        use chrono::Datelike;
        let weekday = date.date_naive().weekday().num_days_from_monday();
        let week_start = date - Duration::days(weekday as i64);
        let week_end = week_start + Duration::days(7);

        let week_start_midnight = week_start.date_naive().and_hms_opt(0, 0, 0)
            .ok_or_else(|| anyhow!("Invalid start time"))?;
        let week_end_midnight = week_end.date_naive().and_hms_opt(23, 59, 59)
            .ok_or_else(|| anyhow!("Invalid end time"))?;

        let week_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(week_start_midnight, Utc);
        let week_end_utc = DateTime::<Utc>::from_naive_utc_and_offset(week_end_midnight, Utc);

        let appointments = sqlx::query_as::<_, Appointment>(
            r#"
            SELECT * FROM appointments
            WHERE provider_id = $1
              AND scheduled_start >= $2
              AND scheduled_end <= $3
            ORDER BY scheduled_start
            "#,
        )
        .bind(provider_id)
        .bind(week_start_utc)
        .bind(week_end_utc)
        .fetch_all(&self.pool)
        .await?;

        Ok(appointments.into_iter().map(|a| a.into()).collect())
    }

    /// Get monthly schedule for a provider
    ///
    /// Returns all appointments for a provider for the month containing the given date
    pub async fn get_monthly_schedule(
        &self,
        provider_id: Uuid,
        date: DateTime<Utc>,
    ) -> Result<Vec<AppointmentDto>> {
        use chrono::Datelike;

        // Get first day of month
        let month_start = date.date_naive()
            .with_day0(0) // day0 is 0-indexed, so day 1 is 0
            .ok_or_else(|| anyhow!("Invalid date"))?
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| anyhow!("Invalid start time"))?;

        // Get last day of month
        let next_month = if date.month() == 12 {
            date.date_naive()
                .with_year(date.year() + 1).ok_or_else(|| anyhow!("Invalid year"))?
                .with_month0(0).ok_or_else(|| anyhow!("Invalid month"))? // January (0-indexed)
        } else {
            date.date_naive()
                .with_month0(date.month()).ok_or_else(|| anyhow!("Invalid month"))? // Next month (0-indexed)
        };

        let month_end = next_month
            .and_hms_opt(23, 59, 59)
            .ok_or_else(|| anyhow!("Invalid end time"))?;

        let month_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(month_start, Utc);
        let month_end_utc = DateTime::<Utc>::from_naive_utc_and_offset(month_end, Utc);

        let appointments = sqlx::query_as::<_, Appointment>(
            r#"
            SELECT * FROM appointments
            WHERE provider_id = $1
              AND scheduled_start >= $2
              AND scheduled_end <= $3
            ORDER BY scheduled_start
            "#,
        )
        .bind(provider_id)
        .bind(month_start_utc)
        .bind(month_end_utc)
        .fetch_all(&self.pool)
        .await?;

        Ok(appointments.into_iter().map(|a| a.into()).collect())
    }
}

/// Helper to parse time string "HH:MM" into (hour, minute)
fn parse_time_str(time: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() >= 2 {
        let hour = parts[0].parse::<u32>().ok()?;
        let minute = parts[1].parse::<u32>().ok()?;
        if hour < 24 && minute < 60 {
            return Some((hour, minute));
        }
    }
    None
}
