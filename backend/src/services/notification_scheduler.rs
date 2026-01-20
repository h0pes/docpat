/*!
 * Notification Scheduler Service
 *
 * Background task that handles automatic notification scheduling:
 * - Runs daily at a configurable time (default 8:00 AM)
 * - Generates appointment reminders based on patient preferences
 * - Processes pending notifications
 * - Retries failed notifications
 *
 * Milestone 15, Phase 5.2
 */

use crate::services::{notification_service::NotificationService, SettingsService};
use crate::utils::encryption::EncryptionKey;
use anyhow::Result;
use chrono::{DateTime, Duration, NaiveTime, TimeZone, Utc};
use sqlx::{PgPool, Postgres, Transaction};
use std::sync::Arc;
use tokio::time::{sleep, Duration as TokioDuration};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// Scheduler configuration loaded from settings
#[derive(Debug, Clone)]
pub struct SchedulerConfig {
    /// Whether the scheduler is enabled
    pub enabled: bool,
    /// Time of day to run reminders (HH:MM format)
    pub reminder_time: String,
    /// Maximum notifications to process per run
    pub batch_size: i64,
    /// Whether to auto-retry failed notifications
    pub retry_failed_enabled: bool,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            reminder_time: "08:00".to_string(),
            batch_size: 50,
            retry_failed_enabled: true,
        }
    }
}

/// Notification Scheduler
///
/// Background service that manages automatic notification scheduling
pub struct NotificationScheduler {
    pool: PgPool,
    notification_service: NotificationService,
    settings_service: Arc<SettingsService>,
    encryption_key: EncryptionKey,
}

/// System user ID for scheduler operations
/// Uses testadmin user ID - in production this should be a dedicated system user
/// TODO: Create a dedicated "system" user in production with a known UUID
const SYSTEM_USER_ID: Uuid = Uuid::from_u128(0x0bd21b8d_b27c_452e_a4a8_1e2f020d880a);

/// System role for scheduler operations
const SYSTEM_ROLE: &str = "ADMIN";

impl NotificationScheduler {
    /// Create a new notification scheduler
    pub fn new(
        pool: PgPool,
        notification_service: NotificationService,
        settings_service: Arc<SettingsService>,
        encryption_key: EncryptionKey,
    ) -> Self {
        Self {
            pool,
            notification_service,
            settings_service,
            encryption_key,
        }
    }

    /// Set RLS context for scheduler operations
    ///
    /// Uses a system user with ADMIN role to access all records
    async fn set_rls_context(tx: &mut Transaction<'_, Postgres>) -> Result<()> {
        // Use set_config() for parameterized queries (security best practice)
        sqlx::query("SELECT set_config('app.current_user_id', $1, true)")
            .bind(SYSTEM_USER_ID.to_string())
            .execute(&mut **tx)
            .await?;
        sqlx::query("SELECT set_config('app.current_user_role', $1, true)")
            .bind(SYSTEM_ROLE)
            .execute(&mut **tx)
            .await?;

        Ok(())
    }

    /// Load scheduler configuration from database settings
    async fn load_config(&self) -> SchedulerConfig {
        let mut config = SchedulerConfig::default();

        // Load scheduler_enabled
        if let Ok(Some(setting)) = self.settings_service.get_setting("scheduler_enabled").await {
            if let Some(value) = setting.setting_value.as_bool() {
                config.enabled = value;
            }
        }

        // Load scheduler_reminder_time
        if let Ok(Some(setting)) = self
            .settings_service
            .get_setting("scheduler_reminder_time")
            .await
        {
            if let Some(value) = setting.setting_value.as_str() {
                config.reminder_time = value.to_string();
            }
        }

        // Load scheduler_batch_size
        if let Ok(Some(setting)) = self
            .settings_service
            .get_setting("scheduler_batch_size")
            .await
        {
            if let Some(value) = setting.setting_value.as_i64() {
                config.batch_size = value;
            }
        }

        // Load scheduler_retry_failed_enabled
        if let Ok(Some(setting)) = self
            .settings_service
            .get_setting("scheduler_retry_failed_enabled")
            .await
        {
            if let Some(value) = setting.setting_value.as_bool() {
                config.retry_failed_enabled = value;
            }
        }

        config
    }

    /// Parse time string (HH:MM) into NaiveTime
    fn parse_reminder_time(time_str: &str) -> Option<NaiveTime> {
        NaiveTime::parse_from_str(time_str, "%H:%M").ok()
    }

    /// Calculate duration until the next scheduled run
    fn duration_until_next_run(reminder_time: &str) -> TokioDuration {
        let now = Utc::now();

        // Parse the reminder time
        let target_time = match Self::parse_reminder_time(reminder_time) {
            Some(t) => t,
            None => {
                warn!(
                    "Invalid reminder time format: {}, using default 08:00",
                    reminder_time
                );
                NaiveTime::from_hms_opt(8, 0, 0).unwrap()
            }
        };

        // Get today's date in UTC
        let today = now.date_naive();

        // Create target datetime for today
        let target_today = today.and_time(target_time);
        let target_today_utc: DateTime<Utc> = Utc.from_utc_datetime(&target_today);

        // If we've passed today's target time, schedule for tomorrow
        let target_datetime = if target_today_utc <= now {
            let tomorrow = today + Duration::days(1);
            let target_tomorrow = tomorrow.and_time(target_time);
            Utc.from_utc_datetime(&target_tomorrow)
        } else {
            target_today_utc
        };

        // Calculate duration until target
        let duration_secs = (target_datetime - now).num_seconds().max(0) as u64;
        TokioDuration::from_secs(duration_secs)
    }

    /// Start the background scheduler loop
    ///
    /// This spawns a background task that:
    /// 1. Waits until the configured reminder time
    /// 2. Generates appointment reminders for upcoming appointments
    /// 3. Processes pending notifications
    /// 4. Retries failed notifications (if enabled)
    /// 5. Loops back to step 1
    pub async fn start(self: Arc<Self>) {
        info!("Starting notification scheduler background task");

        loop {
            // Load latest configuration
            let config = self.load_config().await;

            if !config.enabled {
                info!("Notification scheduler is disabled, waiting 5 minutes before checking again");
                sleep(TokioDuration::from_secs(300)).await;
                continue;
            }

            // Calculate wait time until next scheduled run
            let wait_duration = Self::duration_until_next_run(&config.reminder_time);
            info!(
                "Scheduler will run at {} (in {} seconds)",
                config.reminder_time,
                wait_duration.as_secs()
            );

            // Wait until scheduled time
            sleep(wait_duration).await;

            // Re-check if still enabled before running
            let config = self.load_config().await;
            if !config.enabled {
                info!("Scheduler was disabled while waiting, skipping run");
                continue;
            }

            info!("Running scheduled notification tasks");

            // Run the scheduler tasks
            if let Err(e) = self.run_scheduler_tasks(&config).await {
                error!("Scheduler run failed: {}", e);
            }

            // Sleep for 60 seconds after running to prevent tight loop
            // This ensures we move past the scheduled time before recalculating next run
            sleep(TokioDuration::from_secs(60)).await;
        }
    }

    /// Run all scheduler tasks
    async fn run_scheduler_tasks(&self, config: &SchedulerConfig) -> Result<()> {
        // 1. Generate appointment reminders
        info!("Generating appointment reminders...");
        let reminders_created = self.generate_appointment_reminders(config.batch_size).await?;
        info!("Created {} appointment reminders", reminders_created);

        // 2. Process pending notifications
        info!("Processing pending notifications...");
        let processed = self.process_pending_notifications(config.batch_size).await?;
        info!("Processed {} pending notifications", processed);

        // 3. Retry failed notifications (if enabled)
        if config.retry_failed_enabled {
            info!("Retrying failed notifications...");
            let retried = self.retry_failed_notifications(config.batch_size / 2).await?;
            info!("Retried {} failed notifications", retried);
        }

        Ok(())
    }

    /// Generate appointment reminders for upcoming appointments
    ///
    /// For each appointment in the reminder window:
    /// 1. Check patient's notification preferences
    /// 2. Check if reminder was already sent
    /// 3. Create and queue reminder notification
    async fn generate_appointment_reminders(&self, limit: i64) -> Result<i64> {
        let mut created = 0;

        // Start transaction and set RLS context
        let mut tx = self.pool.begin().await?;
        Self::set_rls_context(&mut tx).await?;

        // Query appointments that need reminders
        // Join with patient_notification_preferences to get reminder settings
        let appointments = sqlx::query!(
            r#"
            SELECT
                a.id as appointment_id,
                a.patient_id,
                a.scheduled_start,
                a.type as appointment_type,
                a.reason,
                p.first_name as patient_first_name,
                p.last_name as patient_last_name,
                p.email as patient_email,
                u.first_name as provider_first_name,
                u.last_name as provider_last_name,
                pnp.email_enabled,
                pnp.reminder_enabled,
                pnp.reminder_days_before,
                pnp.email_address_override
            FROM appointments a
            INNER JOIN patients p ON p.id = a.patient_id
            INNER JOIN users u ON u.id = a.provider_id
            LEFT JOIN patient_notification_preferences pnp ON pnp.patient_id = a.patient_id
            WHERE a.status IN ('SCHEDULED', 'CONFIRMED')
              AND a.scheduled_start > NOW()
              AND a.scheduled_start <= NOW() + INTERVAL '7 days'
              AND (pnp.email_enabled IS NULL OR pnp.email_enabled = true)
              AND (pnp.reminder_enabled IS NULL OR pnp.reminder_enabled = true)
            ORDER BY a.scheduled_start ASC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(&mut *tx)
        .await?;

        for appt in appointments {
            // Check if reminder should be sent today
            let reminder_days = appt.reminder_days_before.unwrap_or(1) as i64;
            let appointment_date = appt.scheduled_start.date_naive();
            let today = Utc::now().date_naive();
            let days_until_appt = (appointment_date - today).num_days();

            // Only send reminder if today matches the reminder window
            if days_until_appt != reminder_days {
                debug!(
                    "Skipping reminder for appointment {} - days until: {}, reminder_days: {}",
                    appt.appointment_id, days_until_appt, reminder_days
                );
                continue;
            }

            // Get patient email (prefer override) and decrypt it
            let encrypted_email = appt.email_address_override.or(appt.patient_email);
            if encrypted_email.is_none() {
                debug!(
                    "Skipping reminder for appointment {} - no email address",
                    appt.appointment_id
                );
                continue;
            }

            // Decrypt the email address
            let recipient_email = match self.encryption_key.decrypt(&encrypted_email.unwrap()) {
                Ok(email) => email,
                Err(e) => {
                    warn!(
                        "Failed to decrypt email for appointment {} - {}",
                        appt.appointment_id, e
                    );
                    continue;
                }
            };

            // Check if reminder already sent for this appointment
            let already_sent = sqlx::query_scalar!(
                r#"
                SELECT EXISTS(
                    SELECT 1 FROM notification_queue
                    WHERE appointment_id = $1
                      AND notification_type = 'APPOINTMENT_REMINDER'
                      AND status IN ('SENT', 'PENDING', 'PROCESSING')
                ) as "exists!"
                "#,
                appt.appointment_id
            )
            .fetch_one(&mut *tx)
            .await?;

            if already_sent {
                debug!(
                    "Skipping reminder for appointment {} - already sent/pending",
                    appt.appointment_id
                );
                continue;
            }

            // Generate reminder notification - decrypt patient name
            let patient_first_name = match self.encryption_key.decrypt(&appt.patient_first_name) {
                Ok(name) => name,
                Err(e) => {
                    warn!(
                        "Failed to decrypt patient first name for appointment {} - {}",
                        appt.appointment_id, e
                    );
                    continue;
                }
            };
            let patient_last_name = match self.encryption_key.decrypt(&appt.patient_last_name) {
                Ok(name) => name,
                Err(e) => {
                    warn!(
                        "Failed to decrypt patient last name for appointment {} - {}",
                        appt.appointment_id, e
                    );
                    continue;
                }
            };
            let patient_name = format!("{} {}", patient_first_name, patient_last_name);

            // Get provider (doctor) name for the reminder email
            let provider_name = format!(
                "Dr. {} {}",
                appt.provider_first_name,
                appt.provider_last_name
            );

            let (subject, body) = crate::services::notification_service::generate_appointment_reminder_email(
                &patient_name,
                &appt.scheduled_start,
                &provider_name,
                &appt.appointment_type,
            );

            // Create notification in queue
            let notification_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO notification_queue (
                    id, patient_id, appointment_id, notification_type, delivery_method,
                    recipient_email, recipient_name, subject, message_body,
                    scheduled_for, priority, status, created_by
                )
                VALUES ($1, $2, $3, 'APPOINTMENT_REMINDER', 'EMAIL', $4, $5, $6, $7, NOW(), 5, 'PENDING', $8)
                "#,
                notification_id,
                appt.patient_id,
                appt.appointment_id,
                recipient_email,
                patient_name,
                subject,
                body,
                // Use a system UUID for scheduler-created notifications
                SYSTEM_USER_ID
            )
            .execute(&mut *tx)
            .await?;

            info!(
                "Created reminder for appointment {} (patient: {})",
                appt.appointment_id, patient_name
            );
            created += 1;
        }

        // Commit the transaction
        tx.commit().await?;

        Ok(created)
    }

    /// Process pending notifications
    async fn process_pending_notifications(&self, limit: i64) -> Result<i64> {
        let pending = self
            .notification_service
            .get_pending_notifications(limit, SYSTEM_USER_ID)
            .await?;

        let mut processed = 0;
        for notification in &pending {
            match self
                .notification_service
                .process_notification(notification, SYSTEM_USER_ID)
                .await
            {
                Ok(result) => {
                    if result.success {
                        processed += 1;
                        debug!("Successfully sent notification {}", notification.id);
                    } else {
                        warn!(
                            "Failed to send notification {}: {}",
                            notification.id, result.message
                        );
                    }
                }
                Err(e) => {
                    error!("Error processing notification {}: {}", notification.id, e);
                }
            }
        }

        Ok(processed)
    }

    /// Retry failed notifications
    async fn retry_failed_notifications(&self, limit: i64) -> Result<i64> {
        let retry_notifications = self
            .notification_service
            .get_retry_notifications(limit, SYSTEM_USER_ID)
            .await?;

        let mut retried = 0;
        for notification in &retry_notifications {
            match self
                .notification_service
                .process_notification(notification, SYSTEM_USER_ID)
                .await
            {
                Ok(result) => {
                    if result.success {
                        retried += 1;
                        debug!("Successfully retried notification {}", notification.id);
                    } else {
                        warn!(
                            "Failed to retry notification {}: {}",
                            notification.id, result.message
                        );
                    }
                }
                Err(e) => {
                    error!("Error retrying notification {}: {}", notification.id, e);
                }
            }
        }

        Ok(retried)
    }
}

/// Spawn the notification scheduler as a background task
///
/// This should be called from main.rs after all services are initialized.
pub fn spawn_notification_scheduler(
    pool: PgPool,
    notification_service: NotificationService,
    settings_service: Arc<SettingsService>,
    encryption_key: EncryptionKey,
) {
    let scheduler = Arc::new(NotificationScheduler::new(
        pool,
        notification_service,
        settings_service,
        encryption_key,
    ));

    tokio::spawn(async move {
        scheduler.start().await;
    });

    info!("Notification scheduler spawned as background task");
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Timelike;

    #[test]
    fn test_parse_reminder_time_valid() {
        let time = NotificationScheduler::parse_reminder_time("08:00");
        assert!(time.is_some());
        let t = time.unwrap();
        assert_eq!(t.hour(), 8);
        assert_eq!(t.minute(), 0);
    }

    #[test]
    fn test_parse_reminder_time_afternoon() {
        let time = NotificationScheduler::parse_reminder_time("14:30");
        assert!(time.is_some());
        let t = time.unwrap();
        assert_eq!(t.hour(), 14);
        assert_eq!(t.minute(), 30);
    }

    #[test]
    fn test_parse_reminder_time_invalid() {
        let time = NotificationScheduler::parse_reminder_time("invalid");
        assert!(time.is_none());
    }

    #[test]
    fn test_parse_reminder_time_edge_cases() {
        assert!(NotificationScheduler::parse_reminder_time("00:00").is_some());
        assert!(NotificationScheduler::parse_reminder_time("23:59").is_some());
        assert!(NotificationScheduler::parse_reminder_time("25:00").is_none());
        assert!(NotificationScheduler::parse_reminder_time("12:60").is_none());
    }

    #[test]
    fn test_scheduler_config_default() {
        let config = SchedulerConfig::default();
        assert!(config.enabled);
        assert_eq!(config.reminder_time, "08:00");
        assert_eq!(config.batch_size, 50);
        assert!(config.retry_failed_enabled);
    }

    #[test]
    fn test_parse_reminder_time_with_leading_zeros() {
        let time = NotificationScheduler::parse_reminder_time("07:05");
        assert!(time.is_some());
        let t = time.unwrap();
        assert_eq!(t.hour(), 7);
        assert_eq!(t.minute(), 5);
    }

    #[test]
    fn test_parse_reminder_time_invalid_formats() {
        // Missing colon
        assert!(NotificationScheduler::parse_reminder_time("0800").is_none());
        // Too many colons - seconds format not supported by %H:%M
        assert!(NotificationScheduler::parse_reminder_time("08:00:00").is_none());
        // Letters instead of numbers
        assert!(NotificationScheduler::parse_reminder_time("ab:cd").is_none());
        // Empty string
        assert!(NotificationScheduler::parse_reminder_time("").is_none());
        // Negative values (as text)
        assert!(NotificationScheduler::parse_reminder_time("-8:00").is_none());
        // Just random text
        assert!(NotificationScheduler::parse_reminder_time("noon").is_none());
        assert!(NotificationScheduler::parse_reminder_time("midnight").is_none());
    }

    #[test]
    fn test_parse_reminder_time_lenient_formats() {
        // Chrono's parser is lenient with some formats
        // Single digit hour with colon is accepted
        assert!(NotificationScheduler::parse_reminder_time("8:00").is_some());
        // Leading whitespace is trimmed
        assert!(NotificationScheduler::parse_reminder_time(" 08:00").is_some());
    }

    #[test]
    fn test_parse_reminder_time_all_valid_hours() {
        for hour in 0..24 {
            let time_str = format!("{:02}:00", hour);
            let result = NotificationScheduler::parse_reminder_time(&time_str);
            assert!(
                result.is_some(),
                "Should parse valid hour: {}",
                time_str
            );
            assert_eq!(result.unwrap().hour(), hour);
        }
    }

    #[test]
    fn test_parse_reminder_time_all_valid_minutes() {
        for minute in 0..60 {
            let time_str = format!("12:{:02}", minute);
            let result = NotificationScheduler::parse_reminder_time(&time_str);
            assert!(
                result.is_some(),
                "Should parse valid minute: {}",
                time_str
            );
            assert_eq!(result.unwrap().minute(), minute);
        }
    }

    #[test]
    fn test_duration_until_next_run_returns_positive() {
        // The duration should always be positive (or zero)
        let duration = NotificationScheduler::duration_until_next_run("08:00");
        assert!(duration.as_secs() >= 0);
    }

    #[test]
    fn test_duration_until_next_run_with_invalid_time_uses_default() {
        // Invalid time should fall back to 08:00
        let duration1 = NotificationScheduler::duration_until_next_run("invalid");
        let duration2 = NotificationScheduler::duration_until_next_run("08:00");

        // Both should be similar (within a second due to timing)
        let diff = if duration1.as_secs() > duration2.as_secs() {
            duration1.as_secs() - duration2.as_secs()
        } else {
            duration2.as_secs() - duration1.as_secs()
        };

        assert!(diff <= 1, "Difference should be minimal: {} seconds", diff);
    }

    #[test]
    fn test_duration_until_next_run_within_24_hours() {
        let duration = NotificationScheduler::duration_until_next_run("08:00");
        // Duration should be at most 24 hours (86400 seconds)
        assert!(
            duration.as_secs() <= 86400,
            "Duration should be at most 24 hours: {} seconds",
            duration.as_secs()
        );
    }

    #[test]
    fn test_scheduler_config_clone() {
        let config = SchedulerConfig {
            enabled: false,
            reminder_time: "09:30".to_string(),
            batch_size: 100,
            retry_failed_enabled: false,
        };

        let cloned = config.clone();

        assert_eq!(config.enabled, cloned.enabled);
        assert_eq!(config.reminder_time, cloned.reminder_time);
        assert_eq!(config.batch_size, cloned.batch_size);
        assert_eq!(config.retry_failed_enabled, cloned.retry_failed_enabled);
    }

    #[test]
    fn test_scheduler_config_debug() {
        let config = SchedulerConfig::default();
        let debug_str = format!("{:?}", config);

        assert!(debug_str.contains("enabled"));
        assert!(debug_str.contains("reminder_time"));
        assert!(debug_str.contains("batch_size"));
        assert!(debug_str.contains("retry_failed_enabled"));
    }

    #[test]
    fn test_system_constants() {
        // Verify system constants are set correctly
        // SYSTEM_USER_ID is testadmin's UUID
        assert_eq!(
            SYSTEM_USER_ID,
            Uuid::from_u128(0x0bd21b8d_b27c_452e_a4a8_1e2f020d880a)
        );
        assert_eq!(SYSTEM_ROLE, "ADMIN");
    }
}
