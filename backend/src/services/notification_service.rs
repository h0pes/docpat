/*!
 * Notification Service
 *
 * Handles business logic for the notification system including:
 * - Creating and queuing notifications
 * - Processing pending notifications
 * - Retry logic for failed notifications
 * - Patient notification preferences management
 * - Notification history queries
 */

use crate::{
    models::{
        CreateNotificationRequest, ListNotificationsResponse, Notification, NotificationFilter,
        NotificationResponse, NotificationStatistics, PatientNotificationPreferences,
        PatientNotificationPreferencesResponse, UpdateNotificationPreferencesRequest,
    },
    services::email_service::{EmailResult, EmailService},
};
use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use chrono_tz::Europe::Rome;
use sqlx::{PgPool, Postgres, Transaction};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// Notification Service
#[derive(Clone)]
pub struct NotificationService {
    pool: PgPool,
    email_service: EmailService,
}

impl NotificationService {
    /// Create new notification service
    pub fn new(pool: PgPool, email_service: EmailService) -> Self {
        Self {
            pool,
            email_service,
        }
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

        debug!("Setting RLS context: user_id={}, role={}", user_id, role);

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

    // ========================================================================
    // NOTIFICATION CRUD
    // ========================================================================

    /// Create a new notification in the queue
    pub async fn create_notification(
        &self,
        data: CreateNotificationRequest,
        created_by: Uuid,
    ) -> Result<NotificationResponse> {
        let scheduled_for = data.scheduled_for.unwrap_or_else(Utc::now);
        let priority = data.priority.unwrap_or(5);
        let metadata_json = data
            .metadata
            .map(|m| serde_json::to_value(m).ok())
            .flatten();

        // Start transaction and set RLS context for INSERT
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, created_by).await?;

        let notification = sqlx::query_as!(
            Notification,
            r#"
            INSERT INTO notification_queue (
                patient_id, appointment_id, notification_type, delivery_method,
                recipient_email, recipient_name, subject, message_body,
                scheduled_for, priority, status, metadata, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, $12)
            RETURNING
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            "#,
            data.patient_id,
            data.appointment_id,
            data.notification_type,
            data.delivery_method,
            data.recipient_email,
            data.recipient_name,
            data.subject,
            data.message_body,
            scheduled_for,
            priority,
            metadata_json,
            created_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to create notification")?;

        tx.commit().await.context("Failed to commit transaction")?;

        // Get patient name if patient_id is provided
        let patient_name = if let Some(pid) = notification.patient_id {
            self.get_patient_name(pid).await.ok().flatten()
        } else {
            None
        };

        Ok(notification.to_response(patient_name))
    }

    /// Get notification by ID (requires user_id for RLS)
    pub async fn get_notification(&self, id: Uuid, user_id: Uuid) -> Result<Option<NotificationResponse>> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let notification = sqlx::query_as!(
            Notification,
            r#"
            SELECT
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            FROM notification_queue
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch notification")?;

        tx.commit().await.context("Failed to commit transaction")?;

        match notification {
            Some(n) => {
                let patient_name = if let Some(pid) = n.patient_id {
                    self.get_patient_name(pid).await.ok().flatten()
                } else {
                    None
                };
                Ok(Some(n.to_response(patient_name)))
            }
            None => Ok(None),
        }
    }

    /// List notifications with filtering
    pub async fn list_notifications(
        &self,
        filter: NotificationFilter,
        user_id: Uuid,
    ) -> Result<ListNotificationsResponse> {
        let limit = filter.limit.unwrap_or(50).min(100);
        let offset = filter.offset.unwrap_or(0);

        // Start transaction and set RLS context for SELECT
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Use simpler query with optional bindings
        let notifications = sqlx::query_as!(
            Notification,
            r#"
            SELECT
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            FROM notification_queue
            WHERE ($1::uuid IS NULL OR patient_id = $1)
              AND ($2::uuid IS NULL OR appointment_id = $2)
              AND ($3::text IS NULL OR notification_type = $3)
              AND ($4::text IS NULL OR delivery_method = $4)
              AND ($5::text IS NULL OR status = $5)
              AND ($6::timestamptz IS NULL OR created_at >= $6)
              AND ($7::timestamptz IS NULL OR created_at <= $7)
            ORDER BY created_at DESC
            LIMIT $8 OFFSET $9
            "#,
            filter.patient_id,
            filter.appointment_id,
            filter.notification_type,
            filter.delivery_method,
            filter.status,
            filter.from_date,
            filter.to_date,
            limit,
            offset
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch notifications")?;

        // Get total count
        let total: i64 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM notification_queue
            WHERE ($1::uuid IS NULL OR patient_id = $1)
              AND ($2::uuid IS NULL OR appointment_id = $2)
              AND ($3::text IS NULL OR notification_type = $3)
              AND ($4::text IS NULL OR delivery_method = $4)
              AND ($5::text IS NULL OR status = $5)
              AND ($6::timestamptz IS NULL OR created_at >= $6)
              AND ($7::timestamptz IS NULL OR created_at <= $7)
            "#,
            filter.patient_id,
            filter.appointment_id,
            filter.notification_type,
            filter.delivery_method,
            filter.status,
            filter.from_date,
            filter.to_date,
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to count notifications")?;

        tx.commit().await.context("Failed to commit transaction")?;

        // Convert to responses with patient names
        let mut responses = Vec::with_capacity(notifications.len());
        for n in notifications {
            let patient_name = if let Some(pid) = n.patient_id {
                self.get_patient_name(pid).await.ok().flatten()
            } else {
                None
            };
            responses.push(n.to_response(patient_name));
        }

        Ok(ListNotificationsResponse {
            notifications: responses,
            total,
            offset,
            limit,
        })
    }

    /// Get pending notifications ready to send (requires user_id for RLS)
    pub async fn get_pending_notifications(&self, limit: i64, user_id: Uuid) -> Result<Vec<Notification>> {
        let now = Utc::now();

        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let notifications = sqlx::query_as!(
            Notification,
            r#"
            SELECT
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            FROM notification_queue
            WHERE status = 'PENDING'
              AND scheduled_for <= $1
            ORDER BY priority ASC, scheduled_for ASC
            LIMIT $2
            "#,
            now,
            limit
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch pending notifications")?;

        tx.commit().await.context("Failed to commit transaction")?;
        Ok(notifications)
    }

    /// Get notifications ready for retry (requires user_id for RLS)
    pub async fn get_retry_notifications(&self, limit: i64, user_id: Uuid) -> Result<Vec<Notification>> {
        let now = Utc::now();

        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let notifications = sqlx::query_as!(
            Notification,
            r#"
            SELECT
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            FROM notification_queue
            WHERE status = 'FAILED'
              AND retry_count < max_retries
              AND next_retry_at IS NOT NULL
              AND next_retry_at <= $1
            ORDER BY priority ASC, next_retry_at ASC
            LIMIT $2
            "#,
            now,
            limit
        )
        .fetch_all(&mut *tx)
        .await
        .context("Failed to fetch retry notifications")?;

        tx.commit().await.context("Failed to commit transaction")?;
        Ok(notifications)
    }

    /// Cancel a pending notification (requires user_id for RLS)
    pub async fn cancel_notification(&self, id: Uuid, user_id: Uuid) -> Result<NotificationResponse> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // First check if notification can be cancelled
        let existing = sqlx::query_scalar!(
            r#"SELECT status FROM notification_queue WHERE id = $1"#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check notification")?
        .ok_or_else(|| anyhow::anyhow!("Notification not found"))?;

        if existing != "PENDING" && existing != "FAILED" {
            return Err(anyhow::anyhow!(
                "Cannot cancel notification with status: {}",
                existing
            ));
        }

        let notification = sqlx::query_as!(
            Notification,
            r#"
            UPDATE notification_queue
            SET status = 'CANCELLED'
            WHERE id = $1
            RETURNING
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            "#,
            id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to cancel notification")?;

        tx.commit().await.context("Failed to commit transaction")?;

        let patient_name = if let Some(pid) = notification.patient_id {
            self.get_patient_name(pid).await.ok().flatten()
        } else {
            None
        };

        Ok(notification.to_response(patient_name))
    }

    /// Retry a failed notification (requires user_id for RLS)
    pub async fn retry_notification(&self, id: Uuid, user_id: Uuid) -> Result<NotificationResponse> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Check if can retry
        let existing = sqlx::query!(
            r#"SELECT status, retry_count, max_retries FROM notification_queue WHERE id = $1"#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to check notification")?
        .ok_or_else(|| anyhow::anyhow!("Notification not found"))?;

        if existing.status != "FAILED" {
            return Err(anyhow::anyhow!(
                "Can only retry failed notifications, current status: {}",
                existing.status
            ));
        }

        if existing.retry_count >= existing.max_retries {
            return Err(anyhow::anyhow!(
                "Notification has exceeded max retries ({}/{})",
                existing.retry_count,
                existing.max_retries
            ));
        }

        // Set to PROCESSING (trigger will handle retry_count increment)
        let notification = sqlx::query_as!(
            Notification,
            r#"
            UPDATE notification_queue
            SET status = 'PROCESSING'
            WHERE id = $1
            RETURNING
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            "#,
            id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to retry notification")?;

        tx.commit().await.context("Failed to commit transaction")?;

        let patient_name = if let Some(pid) = notification.patient_id {
            self.get_patient_name(pid).await.ok().flatten()
        } else {
            None
        };

        Ok(notification.to_response(patient_name))
    }

    // ========================================================================
    // NOTIFICATION PROCESSING
    // ========================================================================

    /// Process a single notification - send email
    /// Requires user_id for RLS context on status updates
    pub async fn process_notification(&self, notification: &Notification, user_id: Uuid) -> Result<EmailResult> {
        debug!(
            "process_notification called: id={}, status={}, user_id={}",
            notification.id, notification.status, user_id
        );

        // Mark as PROCESSING (with RLS context)
        {
            let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
            Self::set_rls_context(&mut tx, user_id).await?;
            let result = sqlx::query!(
                r#"UPDATE notification_queue SET status = 'PROCESSING' WHERE id = $1 AND status = 'PENDING'"#,
                notification.id
            )
            .execute(&mut *tx)
            .await
            .context("Failed to mark notification as processing")?;
            debug!("UPDATE to PROCESSING affected {} rows for notification {}", result.rows_affected(), notification.id);
            tx.commit().await.context("Failed to commit transaction")?;
            debug!("Committed PROCESSING status for notification {}", notification.id);
        }

        // Only handle EMAIL for now
        if notification.delivery_method != "EMAIL" {
            let error_msg = format!(
                "Unsupported delivery method: {}",
                notification.delivery_method
            );
            self.mark_notification_failed(notification.id, &error_msg, None, user_id)
                .await?;
            return Ok(EmailResult {
                success: false,
                message: error_msg,
            });
        }

        // Check recipient email
        let recipient_email = match &notification.recipient_email {
            Some(email) if !email.is_empty() => email.clone(),
            _ => {
                let error_msg = "No recipient email address".to_string();
                self.mark_notification_failed(notification.id, &error_msg, None, user_id)
                    .await?;
                return Ok(EmailResult {
                    success: false,
                    message: error_msg,
                });
            }
        };

        let recipient_name = notification
            .recipient_name
            .clone()
            .unwrap_or_else(|| "Patient".to_string());

        let subject = notification
            .subject
            .clone()
            .unwrap_or_else(|| "Notification from DocPat".to_string());

        // Generate HTML body (simple wrapper)
        let html_body = format!(
            r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
{}
<hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
<p style="font-size: 11px; color: #666;">
This is an automated message from DocPat Medical Practice Management System.
</p>
</div>
</body>
</html>"#,
            notification.message_body.replace("\n", "<br>")
        );

        // Send email
        let result = self
            .email_service
            .send_notification(
                &recipient_email,
                &recipient_name,
                &subject,
                &notification.message_body,
                Some(&html_body),
            )
            .await?;

        if result.success {
            debug!("Email sent successfully, calling mark_notification_sent for {}", notification.id);
            self.mark_notification_sent(notification.id, user_id).await?;
            debug!("mark_notification_sent completed for {}", notification.id);
            info!(
                "Notification {} sent successfully to {}",
                notification.id, recipient_email
            );
        } else {
            self.mark_notification_failed(notification.id, &result.message, None, user_id)
                .await?;
            warn!(
                "Notification {} failed to send: {}",
                notification.id, result.message
            );
        }

        Ok(result)
    }

    /// Mark notification as sent (requires RLS context)
    async fn mark_notification_sent(&self, id: Uuid, user_id: Uuid) -> Result<()> {
        debug!("mark_notification_sent called for id={} user_id={}", id, user_id);
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;
        debug!("RLS context set for mark_notification_sent");

        let result = sqlx::query!(
            r#"
            UPDATE notification_queue
            SET status = 'SENT', sent_at = NOW()
            WHERE id = $1
            "#,
            id
        )
        .execute(&mut *tx)
        .await
        .context("Failed to mark notification as sent")?;

        debug!("UPDATE to SENT affected {} rows for notification {}", result.rows_affected(), id);

        tx.commit().await.context("Failed to commit transaction")?;
        debug!("Committed SENT status for notification {}", id);
        Ok(())
    }

    /// Mark notification as failed (requires RLS context)
    async fn mark_notification_failed(
        &self,
        id: Uuid,
        error_message: &str,
        error_code: Option<&str>,
        user_id: Uuid,
    ) -> Result<()> {
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        sqlx::query!(
            r#"
            UPDATE notification_queue
            SET status = 'FAILED',
                error_message = $2,
                error_code = $3
            WHERE id = $1
            "#,
            id,
            error_message,
            error_code
        )
        .execute(&mut *tx)
        .await
        .context("Failed to mark notification as failed")?;

        tx.commit().await.context("Failed to commit transaction")?;
        Ok(())
    }

    /// Process all pending notifications (called by scheduler)
    /// Requires user_id for RLS context
    pub async fn process_pending_notifications(&self, batch_size: i64, user_id: Uuid) -> Result<(i32, i32)> {
        let notifications = self.get_pending_notifications(batch_size, user_id).await?;

        let mut sent = 0;
        let mut failed = 0;

        for notification in notifications {
            match self.process_notification(&notification, user_id).await {
                Ok(result) if result.success => sent += 1,
                Ok(_) => failed += 1,
                Err(e) => {
                    error!("Error processing notification {}: {:?}", notification.id, e);
                    failed += 1;
                }
            }
        }

        // Also process retries
        let retry_notifications = self.get_retry_notifications(batch_size, user_id).await?;
        for notification in retry_notifications {
            match self.process_notification(&notification, user_id).await {
                Ok(result) if result.success => sent += 1,
                Ok(_) => failed += 1,
                Err(e) => {
                    error!(
                        "Error processing retry notification {}: {:?}",
                        notification.id, e
                    );
                    failed += 1;
                }
            }
        }

        Ok((sent, failed))
    }

    // ========================================================================
    // PATIENT PREFERENCES
    // ========================================================================

    /// Get patient notification preferences
    ///
    /// Returns 404 if the patient does not exist (security: prevents enumeration)
    pub async fn get_patient_preferences(
        &self,
        patient_id: Uuid,
        user_id: Uuid,
    ) -> Result<PatientNotificationPreferencesResponse> {
        // Start transaction and set RLS context for SELECT
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Security: First verify the patient exists (RLS will also check access)
        let patient_exists = sqlx::query_scalar!(
            r#"SELECT EXISTS(SELECT 1 FROM patients WHERE id = $1) as "exists!""#,
            patient_id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to check patient existence")?;

        if !patient_exists {
            tx.commit().await.context("Failed to commit transaction")?;
            anyhow::bail!("Patient not found");
        }

        let prefs = sqlx::query_as!(
            PatientNotificationPreferences,
            r#"
            SELECT
                patient_id, email_enabled, email_address_override,
                reminder_enabled, reminder_days_before, confirmation_enabled,
                created_at, updated_at, updated_by
            FROM patient_notification_preferences
            WHERE patient_id = $1
            "#,
            patient_id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch patient preferences")?;

        tx.commit().await.context("Failed to commit transaction")?;

        // Return default preferences if none exist (patient exists but no prefs yet)
        let prefs = prefs.unwrap_or_else(|| {
            let mut default = PatientNotificationPreferences::default();
            default.patient_id = patient_id;
            default
        });

        Ok(prefs.to_response())
    }

    /// Check if a patient can receive email notifications
    ///
    /// Returns true only if:
    /// - Patient has email_enabled = true (or no preferences exist, defaulting to true)
    ///
    /// This is the authoritative backend check that should be used before sending ANY notification,
    /// regardless of what the frontend requests.
    pub async fn can_patient_receive_email(&self, patient_id: Uuid, user_id: Uuid) -> bool {
        match self.get_patient_preferences(patient_id, user_id).await {
            Ok(prefs) => prefs.email_enabled,
            Err(e) => {
                // Log error but default to allowing notifications if we can't check
                // (better to send when unsure than to silently drop)
                warn!(
                    "Failed to check notification preferences for patient {}: {}. Defaulting to allow.",
                    patient_id, e
                );
                true
            }
        }
    }

    /// Update or create patient notification preferences
    ///
    /// Returns 404 if the patient does not exist (security: prevents enumeration)
    pub async fn update_patient_preferences(
        &self,
        patient_id: Uuid,
        data: UpdateNotificationPreferencesRequest,
        updated_by: Uuid,
    ) -> Result<PatientNotificationPreferencesResponse> {
        // Start transaction and set RLS context for INSERT/UPDATE
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, updated_by).await?;

        // Security: First verify the patient exists (RLS will also check access)
        let patient_exists = sqlx::query_scalar!(
            r#"SELECT EXISTS(SELECT 1 FROM patients WHERE id = $1) as "exists!""#,
            patient_id
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to check patient existence")?;

        if !patient_exists {
            tx.commit().await.context("Failed to commit transaction")?;
            anyhow::bail!("Patient not found");
        }

        // Use upsert (INSERT ... ON CONFLICT UPDATE)
        let prefs = sqlx::query_as!(
            PatientNotificationPreferences,
            r#"
            INSERT INTO patient_notification_preferences (
                patient_id, email_enabled, email_address_override,
                reminder_enabled, reminder_days_before, confirmation_enabled,
                updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (patient_id) DO UPDATE SET
                email_enabled = COALESCE($2, patient_notification_preferences.email_enabled),
                email_address_override = CASE
                    WHEN $3 IS NULL THEN patient_notification_preferences.email_address_override
                    ELSE $3
                END,
                reminder_enabled = COALESCE($4, patient_notification_preferences.reminder_enabled),
                reminder_days_before = COALESCE($5, patient_notification_preferences.reminder_days_before),
                confirmation_enabled = COALESCE($6, patient_notification_preferences.confirmation_enabled),
                updated_by = $7,
                updated_at = NOW()
            RETURNING
                patient_id, email_enabled, email_address_override,
                reminder_enabled, reminder_days_before, confirmation_enabled,
                created_at, updated_at, updated_by
            "#,
            patient_id,
            data.email_enabled.unwrap_or(true),
            data.email_address_override,
            data.reminder_enabled.unwrap_or(true),
            data.reminder_days_before.unwrap_or(1),
            data.confirmation_enabled.unwrap_or(true),
            updated_by
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to update patient preferences")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(prefs.to_response())
    }

    // ========================================================================
    // STATISTICS
    // ========================================================================

    /// Get notification statistics
    pub async fn get_statistics(&self, user_id: Uuid) -> Result<NotificationStatistics> {
        let today_start = Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap();
        let today_start = chrono::DateTime::<Utc>::from_naive_utc_and_offset(today_start, Utc);

        // Start transaction and set RLS context for SELECT
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let stats = sqlx::query!(
            r#"
            SELECT
                (SELECT COUNT(*) FROM notification_queue) as "total!",
                (SELECT COUNT(*) FROM notification_queue WHERE status = 'PENDING') as "pending!",
                (SELECT COUNT(*) FROM notification_queue WHERE status = 'SENT' AND sent_at >= $1) as "sent_today!",
                (SELECT COUNT(*) FROM notification_queue WHERE status = 'FAILED') as "failed!"
            "#,
            today_start
        )
        .fetch_one(&mut *tx)
        .await
        .context("Failed to fetch notification statistics")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(NotificationStatistics {
            total_notifications: stats.total,
            pending_count: stats.pending,
            sent_today: stats.sent_today,
            failed_count: stats.failed,
        })
    }

    // ========================================================================
    // APPOINTMENT NOTIFICATION HELPERS
    // ========================================================================

    /// Queue appointment reminder notification
    pub async fn queue_appointment_reminder(
        &self,
        patient_id: Uuid,
        appointment_id: Uuid,
        patient_email: &str,
        patient_name: &str,
        appointment_date: chrono::DateTime<Utc>,
        doctor_name: &str,
        appointment_type: &str,
        days_before: i32,
        created_by: Uuid,
    ) -> Result<NotificationResponse> {
        let scheduled_for = appointment_date - Duration::days(days_before as i64);

        // Don't queue if scheduled time is in the past
        if scheduled_for <= Utc::now() {
            return Err(anyhow::anyhow!(
                "Reminder scheduled time is in the past"
            ));
        }

        let (subject, body) = generate_appointment_reminder_email(
            patient_name,
            &appointment_date,
            doctor_name,
            appointment_type,
        );

        // Create metadata with appointment info for display in notification cards
        let local_date = appointment_date.with_timezone(&Rome);
        let metadata = serde_json::json!({
            "appointment_date": local_date.format("%Y-%m-%d").to_string(),
            "appointment_time": local_date.format("%H:%M").to_string(),
            "appointment_type": appointment_type.to_string()
        });

        let request = CreateNotificationRequest {
            patient_id: Some(patient_id),
            appointment_id: Some(appointment_id),
            notification_type: "APPOINTMENT_REMINDER".to_string(),
            delivery_method: "EMAIL".to_string(),
            recipient_email: Some(patient_email.to_string()),
            recipient_name: Some(patient_name.to_string()),
            subject: Some(subject),
            message_body: body,
            scheduled_for: Some(scheduled_for),
            priority: Some(3), // Higher priority for reminders
            metadata: Some(metadata),
        };

        self.create_notification(request, created_by).await
    }

    /// Queue and immediately send appointment booked notification (when created/scheduled)
    pub async fn queue_appointment_booked(
        &self,
        patient_id: Uuid,
        appointment_id: Uuid,
        patient_email: &str,
        patient_name: &str,
        appointment_date: chrono::DateTime<Utc>,
        doctor_name: &str,
        appointment_type: &str,
        created_by: Uuid,
    ) -> Result<NotificationResponse> {
        let (subject, body) = generate_appointment_booked_email(
            patient_name,
            &appointment_date,
            doctor_name,
            appointment_type,
        );

        // Create metadata with appointment info for display in notification cards
        let local_date = appointment_date.with_timezone(&Rome);
        let metadata = serde_json::json!({
            "appointment_date": local_date.format("%Y-%m-%d").to_string(),
            "appointment_time": local_date.format("%H:%M").to_string(),
            "appointment_type": appointment_type.to_string()
        });

        let request = CreateNotificationRequest {
            patient_id: Some(patient_id),
            appointment_id: Some(appointment_id),
            notification_type: "APPOINTMENT_BOOKED".to_string(),
            delivery_method: "EMAIL".to_string(),
            recipient_email: Some(patient_email.to_string()),
            recipient_name: Some(patient_name.to_string()),
            subject: Some(subject),
            message_body: body,
            scheduled_for: None,
            priority: Some(2),   // High priority for booking confirmations
            metadata: Some(metadata),
        };

        // Create notification record
        let notification_response = self.create_notification(request, created_by).await?;

        // Immediately send the notification (don't wait for scheduler)
        match self.get_notification_by_id(notification_response.id, created_by).await {
            Ok(Some(n)) => {
                match self.process_notification(&n, created_by).await {
                    Ok(result) if result.success => {
                        info!("Booking email sent immediately for appointment {}", appointment_id);
                    }
                    Ok(result) => {
                        warn!("Booking email failed for appointment {}: {}", appointment_id, result.message);
                    }
                    Err(e) => {
                        warn!("Failed to process booking notification: {}", e);
                    }
                }
            }
            Ok(None) => {
                warn!("Could not find notification {} for immediate send", notification_response.id);
            }
            Err(e) => {
                warn!("Failed to fetch notification for immediate send: {}", e);
            }
        }

        Ok(notification_response)
    }

    /// Queue and immediately send appointment confirmation notification (when confirmed)
    pub async fn queue_appointment_confirmation(
        &self,
        patient_id: Uuid,
        appointment_id: Uuid,
        patient_email: &str,
        patient_name: &str,
        appointment_date: chrono::DateTime<Utc>,
        doctor_name: &str,
        appointment_type: &str,
        created_by: Uuid,
    ) -> Result<NotificationResponse> {
        let (subject, body) = generate_appointment_confirmation_email(
            patient_name,
            &appointment_date,
            doctor_name,
            appointment_type,
        );

        // Create metadata with appointment info for display in notification cards
        let local_date = appointment_date.with_timezone(&Rome);
        let metadata = serde_json::json!({
            "appointment_date": local_date.format("%Y-%m-%d").to_string(),
            "appointment_time": local_date.format("%H:%M").to_string(),
            "appointment_type": appointment_type.to_string()
        });

        let request = CreateNotificationRequest {
            patient_id: Some(patient_id),
            appointment_id: Some(appointment_id),
            notification_type: "APPOINTMENT_CONFIRMATION".to_string(),
            delivery_method: "EMAIL".to_string(),
            recipient_email: Some(patient_email.to_string()),
            recipient_name: Some(patient_name.to_string()),
            subject: Some(subject),
            message_body: body,
            scheduled_for: None,
            priority: Some(2),   // High priority for confirmations
            metadata: Some(metadata),
        };

        // Create notification record
        let notification_response = self.create_notification(request, created_by).await?;

        // Immediately send the notification (don't wait for scheduler)
        match self.get_notification_by_id(notification_response.id, created_by).await {
            Ok(Some(n)) => {
                match self.process_notification(&n, created_by).await {
                    Ok(result) if result.success => {
                        info!("Confirmation email sent immediately for appointment {}", appointment_id);
                    }
                    Ok(result) => {
                        warn!("Confirmation email failed for appointment {}: {}", appointment_id, result.message);
                    }
                    Err(e) => {
                        warn!("Failed to process confirmation notification: {}", e);
                    }
                }
            }
            Ok(None) => {
                warn!("Could not find notification {} for immediate send", notification_response.id);
            }
            Err(e) => {
                warn!("Failed to fetch notification for immediate send: {}", e);
            }
        }

        Ok(notification_response)
    }

    /// Queue and immediately send appointment cancellation notification
    pub async fn queue_appointment_cancellation(
        &self,
        patient_id: Uuid,
        appointment_id: Uuid,
        patient_email: &str,
        patient_name: &str,
        appointment_date: chrono::DateTime<Utc>,
        doctor_name: &str,
        appointment_type: &str,
        cancellation_reason: Option<&str>,
        created_by: Uuid,
    ) -> Result<NotificationResponse> {
        let (subject, body) = generate_appointment_cancellation_email(
            patient_name,
            &appointment_date,
            doctor_name,
            appointment_type,
            cancellation_reason,
        );

        // Create metadata with appointment info for display in notification cards
        let local_date = appointment_date.with_timezone(&Rome);
        let metadata = serde_json::json!({
            "appointment_date": local_date.format("%Y-%m-%d").to_string(),
            "appointment_time": local_date.format("%H:%M").to_string(),
            "appointment_type": appointment_type.to_string()
        });

        let request = CreateNotificationRequest {
            patient_id: Some(patient_id),
            appointment_id: Some(appointment_id),
            notification_type: "APPOINTMENT_CANCELLATION".to_string(),
            delivery_method: "EMAIL".to_string(),
            recipient_email: Some(patient_email.to_string()),
            recipient_name: Some(patient_name.to_string()),
            subject: Some(subject),
            message_body: body,
            scheduled_for: None, // Send immediately
            priority: Some(1),   // Highest priority for cancellations
            metadata: Some(metadata),
        };

        // Create notification record
        let notification_response = self.create_notification(request, created_by).await?;

        // Immediately send the notification (don't wait for scheduler)
        match self.get_notification_by_id(notification_response.id, created_by).await {
            Ok(Some(n)) => {
                match self.process_notification(&n, created_by).await {
                    Ok(result) if result.success => {
                        info!("Cancellation email sent immediately for appointment {}", appointment_id);
                    }
                    Ok(result) => {
                        warn!("Cancellation email failed for appointment {}: {}", appointment_id, result.message);
                    }
                    Err(e) => {
                        warn!("Failed to process cancellation notification: {}", e);
                    }
                }
            }
            Ok(None) => {
                warn!("Could not find notification {} for immediate send", notification_response.id);
            }
            Err(e) => {
                warn!("Failed to fetch notification for immediate send: {}", e);
            }
        }

        Ok(notification_response)
    }

    /// Cancel all pending notifications for an appointment
    pub async fn cancel_appointment_notifications(&self, appointment_id: Uuid, user_id: Uuid) -> Result<i64> {
        // Start transaction and set RLS context for UPDATE
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let result = sqlx::query!(
            r#"
            UPDATE notification_queue
            SET status = 'CANCELLED'
            WHERE appointment_id = $1
              AND status IN ('PENDING', 'FAILED')
            "#,
            appointment_id
        )
        .execute(&mut *tx)
        .await
        .context("Failed to cancel appointment notifications")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(result.rows_affected() as i64)
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /// Get raw notification record by ID (for internal processing)
    /// Requires user_id for RLS context
    async fn get_notification_by_id(&self, id: Uuid, user_id: Uuid) -> Result<Option<Notification>> {
        // Start transaction and set RLS context for SELECT
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let notification = sqlx::query_as!(
            Notification,
            r#"
            SELECT
                id, patient_id, appointment_id, user_id, notification_type,
                delivery_method, recipient_email, recipient_phone, recipient_name,
                subject, message_body, message_template, scheduled_for, priority,
                status, retry_count, max_retries, last_retry_at, next_retry_at,
                sent_at, delivered_at, delivery_status, delivery_receipt,
                error_message, error_code, provider_name, provider_message_id,
                metadata, created_at, updated_at, created_by
            FROM notification_queue
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await
        .context("Failed to fetch notification by ID")?;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(notification)
    }

    /// Get patient name by ID (decrypted)
    async fn get_patient_name(&self, patient_id: Uuid) -> Result<Option<String>> {
        // Note: Patient name is encrypted, so we need to handle that
        // For now, just get the raw value - encryption handling should be done elsewhere
        // query_scalar! with fetch_optional returns Option<T> where T is the column type
        // For nullable column first_name, it returns Option<Option<String>>
        // But if first_name is NOT NULL in schema, it returns Option<String>
        // Since first_name column allows NULL, let's handle it properly
        let result = sqlx::query_scalar!(
            r#"SELECT first_name FROM patients WHERE id = $1"#,
            patient_id
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch patient name")?;

        // Result is Option<String> - None if no row found, Some(name) if found
        Ok(result)
    }

    /// Send a test email to verify SMTP configuration
    pub async fn send_test_email(&self, to_email: &str, to_name: &str) -> Result<EmailResult> {
        let subject = "DocPat - Test Email";
        let body_text = "This is a test email from DocPat Medical Practice Management System.\n\nIf you received this email, your SMTP configuration is working correctly.";
        let body_html = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #2563eb;">DocPat - Test Email</h2>
<p>This is a test email from DocPat Medical Practice Management System.</p>
<p style="color: #16a34a; font-weight: bold;">✓ If you received this email, your SMTP configuration is working correctly.</p>
</div>
</body>
</html>"#;

        self.email_service
            .send_notification(to_email, to_name, subject, body_text, Some(body_html))
            .await
    }
}

// ============================================================================
// EMAIL TEMPLATE GENERATION
// ============================================================================

/// Generate appointment reminder email content
pub fn generate_appointment_reminder_email(
    patient_name: &str,
    appointment_date: &chrono::DateTime<Utc>,
    doctor_name: &str,
    appointment_type: &str,
) -> (String, String) {
    // Convert UTC to local timezone (Europe/Rome) for display
    let local_date = appointment_date.with_timezone(&Rome);
    let formatted_date = local_date.format("%A, %B %d, %Y at %H:%M").to_string();

    let subject = format!("Appointment Reminder - {}", formatted_date);

    let body = format!(
        r#"Dear {},

This is a reminder for your upcoming appointment:

📅 Date: {}
👨‍⚕️ Doctor: {}
📋 Type: {}

Please arrive 10-15 minutes early to complete any necessary paperwork.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
DocPat Medical Practice"#,
        patient_name, formatted_date, doctor_name, appointment_type
    );

    (subject, body)
}

/// Generate appointment booked email content (sent when appointment is created/scheduled)
pub fn generate_appointment_booked_email(
    patient_name: &str,
    appointment_date: &chrono::DateTime<Utc>,
    doctor_name: &str,
    appointment_type: &str,
) -> (String, String) {
    // Convert UTC to local timezone (Europe/Rome) for display
    let local_date = appointment_date.with_timezone(&Rome);
    let formatted_date = local_date.format("%A, %B %d, %Y at %H:%M").to_string();

    let subject = "Appointment Scheduled".to_string();

    let body = format!(
        r#"Dear {},

Your appointment has been scheduled:

📅 Date: {}
👨‍⚕️ Doctor: {}
📋 Type: {}

You will receive a reminder before your appointment.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
DocPat Medical Practice"#,
        patient_name, formatted_date, doctor_name, appointment_type
    );

    (subject, body)
}

/// Generate appointment confirmation email content (sent when appointment is confirmed)
pub fn generate_appointment_confirmation_email(
    patient_name: &str,
    appointment_date: &chrono::DateTime<Utc>,
    doctor_name: &str,
    appointment_type: &str,
) -> (String, String) {
    // Convert UTC to local timezone (Europe/Rome) for display
    let local_date = appointment_date.with_timezone(&Rome);
    let formatted_date = local_date.format("%A, %B %d, %Y at %H:%M").to_string();

    let subject = "Appointment Confirmed".to_string();

    let body = format!(
        r#"Dear {},

Your appointment has been confirmed:

📅 Date: {}
👨‍⚕️ Doctor: {}
📋 Type: {}

We look forward to seeing you. You will receive a reminder before your appointment.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
DocPat Medical Practice"#,
        patient_name, formatted_date, doctor_name, appointment_type
    );

    (subject, body)
}

/// Generate appointment cancellation email content
pub fn generate_appointment_cancellation_email(
    patient_name: &str,
    appointment_date: &chrono::DateTime<Utc>,
    doctor_name: &str,
    appointment_type: &str,
    cancellation_reason: Option<&str>,
) -> (String, String) {
    // Convert UTC to local timezone (Europe/Rome) for display
    let local_date = appointment_date.with_timezone(&Rome);
    let formatted_date = local_date.format("%A, %B %d, %Y at %H:%M").to_string();

    let subject = "Appointment Cancelled".to_string();

    let reason_text = match cancellation_reason {
        Some(reason) if !reason.is_empty() => format!("\n\nReason: {}", reason),
        _ => String::new(),
    };

    let body = format!(
        r#"Dear {},

We regret to inform you that your appointment has been cancelled:

📅 Original Date: {}
👨‍⚕️ Doctor: {}
📋 Type: {}{}

We apologize for any inconvenience this may cause. Please contact us to reschedule at your earliest convenience.

Best regards,
DocPat Medical Practice"#,
        patient_name, formatted_date, doctor_name, appointment_type, reason_text
    );

    (subject, body)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_generate_reminder_email() {
        let date = Utc::now() + Duration::days(1);
        let (subject, body) = generate_appointment_reminder_email(
            "John Doe",
            &date,
            "Dr. Smith",
            "General Checkup",
        );

        assert!(subject.contains("Appointment Reminder"));
        assert!(body.contains("John Doe"));
        assert!(body.contains("Dr. Smith"));
        assert!(body.contains("General Checkup"));
    }

    #[test]
    fn test_generate_confirmation_email() {
        let date = Utc::now() + Duration::days(7);
        let (subject, body) = generate_appointment_confirmation_email(
            "Jane Doe",
            &date,
            "Dr. Johnson",
            "Follow-up",
        );

        assert_eq!(subject, "Appointment Confirmed");
        assert!(body.contains("Jane Doe"));
        assert!(body.contains("Dr. Johnson"));
        assert!(body.contains("Follow-up"));
    }

    #[test]
    fn test_generate_cancellation_email_with_reason() {
        let date = Utc::now() + Duration::days(3);
        let (subject, body) = generate_appointment_cancellation_email(
            "Alice Smith",
            &date,
            "Dr. Williams",
            "Consultation",
            Some("Doctor unavailable due to emergency"),
        );

        assert_eq!(subject, "Appointment Cancelled");
        assert!(body.contains("Alice Smith"));
        assert!(body.contains("Dr. Williams"));
        assert!(body.contains("Consultation"));
        assert!(body.contains("Doctor unavailable due to emergency"));
    }

    #[test]
    fn test_generate_cancellation_email_without_reason() {
        let date = Utc::now() + Duration::days(2);
        let (subject, body) = generate_appointment_cancellation_email(
            "Bob Jones",
            &date,
            "Dr. Brown",
            "Annual Checkup",
            None,
        );

        assert_eq!(subject, "Appointment Cancelled");
        assert!(body.contains("Bob Jones"));
        assert!(body.contains("Dr. Brown"));
        assert!(!body.contains("Reason:"));
    }

    #[test]
    fn test_generate_cancellation_email_with_empty_reason() {
        let date = Utc::now() + Duration::days(1);
        let (subject, body) = generate_appointment_cancellation_email(
            "Test Patient",
            &date,
            "Dr. Empty",
            "Checkup",
            Some(""),
        );

        assert_eq!(subject, "Appointment Cancelled");
        assert!(body.contains("Test Patient"));
        // Empty reason should be treated like no reason
        assert!(!body.contains("Reason:"));
    }

    #[test]
    fn test_email_contains_date_formatting() {
        // Use a specific date to test formatting
        let date = Utc.with_ymd_and_hms(2026, 3, 15, 14, 30, 0).unwrap();
        let (subject, body) = generate_appointment_reminder_email(
            "Date Test",
            &date,
            "Dr. Format",
            "Testing",
        );

        // Subject should contain the formatted date
        assert!(subject.contains("Sunday"));
        assert!(subject.contains("March"));
        assert!(subject.contains("15"));
        assert!(subject.contains("2026"));
        assert!(subject.contains("14:30"));

        // Body should also contain the formatted date
        assert!(body.contains("Sunday"));
        assert!(body.contains("March"));
    }

    #[test]
    fn test_email_with_special_characters_in_name() {
        let date = Utc::now() + Duration::days(1);
        let (subject, body) = generate_appointment_confirmation_email(
            "José García-López",
            &date,
            "Dr. Müller",
            "Consultation",
        );

        assert_eq!(subject, "Appointment Confirmed");
        assert!(body.contains("José García-López"));
        assert!(body.contains("Dr. Müller"));
    }

    #[test]
    fn test_email_with_long_appointment_type() {
        let date = Utc::now() + Duration::days(1);
        let long_type = "Extended Comprehensive Annual Health Assessment and Review";
        let (_, body) = generate_appointment_reminder_email(
            "Patient Name",
            &date,
            "Dr. Doctor",
            long_type,
        );

        assert!(body.contains(long_type));
    }

    #[test]
    fn test_all_email_templates_contain_docpat_signature() {
        let date = Utc::now() + Duration::days(1);

        let (_, reminder_body) = generate_appointment_reminder_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
        );
        let (_, confirmation_body) = generate_appointment_confirmation_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
        );
        let (_, cancellation_body) = generate_appointment_cancellation_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
            None,
        );

        assert!(reminder_body.contains("DocPat Medical Practice"));
        assert!(confirmation_body.contains("DocPat Medical Practice"));
        assert!(cancellation_body.contains("DocPat Medical Practice"));
    }

    #[test]
    fn test_email_templates_have_correct_icons() {
        let date = Utc::now() + Duration::days(1);

        let (_, body) = generate_appointment_reminder_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
        );

        // Check for emoji icons in templates
        assert!(body.contains("📅")); // Calendar icon
        assert!(body.contains("👨\u{200d}⚕️")); // Doctor icon
        assert!(body.contains("📋")); // Clipboard icon
    }

    #[test]
    fn test_reminder_email_contains_early_arrival_note() {
        let date = Utc::now() + Duration::days(1);
        let (_, body) = generate_appointment_reminder_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
        );

        assert!(body.contains("arrive 10-15 minutes early"));
    }

    #[test]
    fn test_confirmation_email_mentions_reminder() {
        let date = Utc::now() + Duration::days(7);
        let (_, body) = generate_appointment_confirmation_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
        );

        assert!(body.contains("reminder before your appointment"));
    }

    #[test]
    fn test_cancellation_email_is_apologetic() {
        let date = Utc::now() + Duration::days(1);
        let (_, body) = generate_appointment_cancellation_email(
            "Patient",
            &date,
            "Doctor",
            "Type",
            None,
        );

        assert!(body.contains("regret to inform"));
        assert!(body.contains("apologize for any inconvenience"));
    }
}
