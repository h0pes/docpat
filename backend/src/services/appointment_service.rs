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
    CreateAppointmentRequest, EntityType, RecurringPattern, TimeSlot, UpdateAppointmentRequest,
};
use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Duration, Utc};
use sqlx::{PgPool, Postgres, Transaction};
use std::collections::HashMap;
use uuid::Uuid;
use validator::Validate;

/// Business hours configuration
const BUSINESS_START_HOUR: u32 = 8; // 8:00 AM
const BUSINESS_END_HOUR: u32 = 18; // 6:00 PM
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

    /// Create a new appointment with conflict detection
    ///
    /// This validates the appointment, checks for conflicts, and creates the record.
    pub async fn create_appointment(
        &self,
        data: CreateAppointmentRequest,
        created_by_id: Uuid,
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

        // Start transaction for conflict check + insert
        let mut tx = self.pool.begin().await?;

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
                ip_address: None,
                user_agent: None,
                request_id: None,
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
    ) -> Result<Option<AppointmentDto>> {
        let appointment = sqlx::query_as::<_, Appointment>(
            r#"SELECT * FROM appointments WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

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
                    ip_address: None,
                    user_agent: None,
                    request_id: None,
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
    ) -> Result<AppointmentDto> {
        // Validate request
        data.validate()
            .context("Invalid update data")?;

        let mut tx = self.pool.begin().await?;

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

        // If rescheduling, check for conflicts
        if let Some(new_start) = data.scheduled_start {
            let duration = data.duration_minutes.unwrap_or(existing.duration_minutes);
            let new_end = new_start + Duration::minutes(duration as i64);

            self.check_conflicts(
                &mut tx,
                existing.provider_id,
                new_start,
                new_end,
                Some(id), // Exclude current appointment from conflict check
            )
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
                ip_address: None,
                user_agent: None,
                request_id: None,
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
    ) -> Result<AppointmentDto> {
        let mut tx = self.pool.begin().await?;

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
                ip_address: None,
                user_agent: None,
                request_id: None,
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
    ) -> Result<()> {
        self.cancel_appointment(
            id,
            "Appointment deleted".to_string(),
            deleted_by_id,
        )
        .await?;

        Ok(())
    }

    /// List appointments with filtering
    pub async fn list_appointments(
        &self,
        filter: AppointmentSearchFilter,
        user_id: Option<Uuid>,
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
                    ip_address: None,
                    user_agent: None,
                    request_id: None,
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
    async fn create_recurring_series(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        parent: &Appointment,
        pattern: &RecurringPattern,
        created_by_id: Uuid,
    ) -> Result<()> {
        let mut current_date = parent.scheduled_start;
        let mut count = 0;
        let max_count = pattern.max_occurrences.unwrap_or(52); // Default to 1 year

        while count < max_count {
            // Calculate next occurrence
            current_date = self.calculate_next_occurrence(current_date, pattern);

            // Check if we've reached the end date
            if let Some(end_date) = pattern.end_date {
                if current_date > end_date {
                    break;
                }
            }

            // Check for conflicts
            let scheduled_end = current_date + Duration::minutes(parent.duration_minutes as i64);
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
                count += 1;
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
    /// Returns time slots showing which are available and which are booked
    pub async fn check_availability(
        &self,
        provider_id: Uuid,
        date: DateTime<Utc>,
        duration_minutes: i32,
    ) -> Result<Vec<TimeSlot>> {
        // Get start and end of the day
        let day_start = date.date_naive().and_hms_opt(BUSINESS_START_HOUR, 0, 0)
            .ok_or_else(|| anyhow!("Invalid start time"))?;
        let day_end = date.date_naive().and_hms_opt(BUSINESS_END_HOUR, 0, 0)
            .ok_or_else(|| anyhow!("Invalid end time"))?;

        let day_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(day_start, Utc);
        let day_end_utc = DateTime::<Utc>::from_naive_utc_and_offset(day_end, Utc);

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

            // Check if this slot conflicts with any booked appointment
            let is_available = !booked_appointments.iter().any(|appt| {
                // Check if slot overlaps with appointment
                (current_time >= appt.scheduled_start && current_time < appt.scheduled_end)
                    || (slot_end > appt.scheduled_start && slot_end <= appt.scheduled_end)
                    || (current_time <= appt.scheduled_start && slot_end >= appt.scheduled_end)
            });

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
