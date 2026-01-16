/*!
 * Notification Models
 *
 * Data models for the notification system including:
 * - Notification queue (pending, sent, failed notifications)
 * - Patient notification preferences
 * - Request/Response DTOs
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::{Validate, ValidationError};

// ============================================================================
// ENUMS
// ============================================================================

/// Notification type enum matching database constraint
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum NotificationType {
    AppointmentReminder,
    AppointmentBooked,        // Sent when appointment is created (status: SCHEDULED)
    AppointmentConfirmation,  // Sent when appointment is confirmed (status: CONFIRMED)
    AppointmentCancellation,
    VisitSummary,
    PrescriptionReady,
    FollowUpReminder,
    Custom,
}

impl NotificationType {
    /// Convert to database value
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AppointmentReminder => "APPOINTMENT_REMINDER",
            Self::AppointmentBooked => "APPOINTMENT_BOOKED",
            Self::AppointmentConfirmation => "APPOINTMENT_CONFIRMATION",
            Self::AppointmentCancellation => "APPOINTMENT_CANCELLATION",
            Self::VisitSummary => "VISIT_SUMMARY",
            Self::PrescriptionReady => "PRESCRIPTION_READY",
            Self::FollowUpReminder => "FOLLOW_UP_REMINDER",
            Self::Custom => "CUSTOM",
        }
    }

    /// Parse from database value
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "APPOINTMENT_REMINDER" => Some(Self::AppointmentReminder),
            "APPOINTMENT_BOOKED" => Some(Self::AppointmentBooked),
            "APPOINTMENT_CONFIRMATION" => Some(Self::AppointmentConfirmation),
            "APPOINTMENT_CANCELLATION" => Some(Self::AppointmentCancellation),
            "VISIT_SUMMARY" => Some(Self::VisitSummary),
            "PRESCRIPTION_READY" => Some(Self::PrescriptionReady),
            "FOLLOW_UP_REMINDER" => Some(Self::FollowUpReminder),
            "CUSTOM" => Some(Self::Custom),
            _ => None,
        }
    }

    /// Get all valid notification type strings (for validation error messages)
    pub fn valid_types() -> &'static [&'static str] {
        &[
            "APPOINTMENT_REMINDER",
            "APPOINTMENT_BOOKED",
            "APPOINTMENT_CONFIRMATION",
            "APPOINTMENT_CANCELLATION",
            "VISIT_SUMMARY",
            "PRESCRIPTION_READY",
            "FOLLOW_UP_REMINDER",
            "CUSTOM",
        ]
    }
}

/// Validator function for notification_type field
fn validate_notification_type(value: &str) -> Result<(), ValidationError> {
    if NotificationType::from_str(value).is_some() {
        Ok(())
    } else {
        let mut error = ValidationError::new("invalid_notification_type");
        error.message = Some(
            format!(
                "Invalid notification type '{}'. Valid types: {:?}",
                value,
                NotificationType::valid_types()
            )
            .into(),
        );
        Err(error)
    }
}

/// Validator function for delivery_method field
fn validate_delivery_method(value: &str) -> Result<(), ValidationError> {
    if DeliveryMethod::from_str(value).is_some() {
        Ok(())
    } else {
        let mut error = ValidationError::new("invalid_delivery_method");
        error.message = Some(
            format!(
                "Invalid delivery method '{}'. Valid methods: EMAIL, SMS, WHATSAPP, PUSH",
                value
            )
            .into(),
        );
        Err(error)
    }
}

/// Delivery method enum matching database constraint
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DeliveryMethod {
    Email,
    Sms,
    Whatsapp,
    Push,
}

impl DeliveryMethod {
    /// Convert to database value
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Email => "EMAIL",
            Self::Sms => "SMS",
            Self::Whatsapp => "WHATSAPP",
            Self::Push => "PUSH",
        }
    }

    /// Parse from database value
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "EMAIL" => Some(Self::Email),
            "SMS" => Some(Self::Sms),
            "WHATSAPP" => Some(Self::Whatsapp),
            "PUSH" => Some(Self::Push),
            _ => None,
        }
    }
}

/// Notification status enum matching database constraint
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum NotificationStatus {
    Pending,
    Processing,
    Sent,
    Failed,
    Cancelled,
}

impl NotificationStatus {
    /// Convert to database value
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "PENDING",
            Self::Processing => "PROCESSING",
            Self::Sent => "SENT",
            Self::Failed => "FAILED",
            Self::Cancelled => "CANCELLED",
        }
    }

    /// Parse from database value
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "PENDING" => Some(Self::Pending),
            "PROCESSING" => Some(Self::Processing),
            "SENT" => Some(Self::Sent),
            "FAILED" => Some(Self::Failed),
            "CANCELLED" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

// ============================================================================
// DATABASE MODELS
// ============================================================================

/// Notification queue database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub patient_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub notification_type: String,
    pub delivery_method: String,
    pub recipient_email: Option<String>,
    pub recipient_phone: Option<String>,
    pub recipient_name: Option<String>,
    pub subject: Option<String>,
    pub message_body: String,
    pub message_template: Option<String>,
    pub scheduled_for: DateTime<Utc>,
    pub priority: i32,
    pub status: String,
    pub retry_count: i32,
    pub max_retries: i32,
    pub last_retry_at: Option<DateTime<Utc>>,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub sent_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub delivery_status: Option<String>,
    pub delivery_receipt: Option<String>,
    pub error_message: Option<String>,
    pub error_code: Option<String>,
    pub provider_name: Option<String>,
    pub provider_message_id: Option<String>,
    pub metadata: Option<sqlx::types::JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

/// Patient notification preferences database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PatientNotificationPreferences {
    pub patient_id: Uuid,
    pub email_enabled: bool,
    pub email_address_override: Option<String>,
    pub reminder_enabled: bool,
    pub reminder_days_before: i32,
    pub confirmation_enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/// Notification response model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub patient_id: Option<Uuid>,
    pub patient_name: Option<String>,
    pub appointment_id: Option<Uuid>,
    pub notification_type: String,
    pub delivery_method: String,
    pub recipient_email: Option<String>,
    pub recipient_name: Option<String>,
    pub subject: Option<String>,
    pub scheduled_for: DateTime<Utc>,
    pub priority: i32,
    pub status: String,
    pub retry_count: i32,
    pub max_retries: i32,
    pub sent_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    /// Additional metadata (e.g., appointment_date, appointment_time, appointment_type)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

/// Patient notification preferences response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientNotificationPreferencesResponse {
    pub patient_id: Uuid,
    pub email_enabled: bool,
    pub email_address_override: Option<String>,
    pub reminder_enabled: bool,
    pub reminder_days_before: i32,
    pub confirmation_enabled: bool,
    pub updated_at: DateTime<Utc>,
}

/// Notification statistics for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationStatistics {
    pub total_notifications: i64,
    pub pending_count: i64,
    pub sent_today: i64,
    pub failed_count: i64,
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/// Create notification request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateNotificationRequest {
    pub patient_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,

    #[validate(custom(function = "validate_notification_type"))]
    pub notification_type: String,

    #[serde(default = "default_delivery_method")]
    #[validate(custom(function = "validate_delivery_method"))]
    pub delivery_method: String,

    #[validate(email(message = "Invalid email address"))]
    pub recipient_email: Option<String>,

    #[validate(length(max = 255, message = "Recipient name too long"))]
    pub recipient_name: Option<String>,

    #[validate(length(max = 255, message = "Subject too long"))]
    pub subject: Option<String>,

    #[validate(length(min = 1, max = 10000, message = "Message body must be 1-10000 characters"))]
    pub message_body: String,

    /// When to send (defaults to now)
    pub scheduled_for: Option<DateTime<Utc>>,

    /// Priority 1-10 (1=highest, default=5)
    #[validate(range(min = 1, max = 10, message = "Priority must be 1-10"))]
    pub priority: Option<i32>,

    /// Additional metadata as JSON
    pub metadata: Option<serde_json::Value>,
}

fn default_delivery_method() -> String {
    "EMAIL".to_string()
}

/// Update notification preferences request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateNotificationPreferencesRequest {
    pub email_enabled: Option<bool>,

    #[validate(email(message = "Invalid override email address"))]
    pub email_address_override: Option<String>,

    pub reminder_enabled: Option<bool>,

    #[validate(range(min = 0, max = 7, message = "Reminder days must be 0-7"))]
    pub reminder_days_before: Option<i32>,

    pub confirmation_enabled: Option<bool>,
}

/// Notification filter for listing
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NotificationFilter {
    pub patient_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub notification_type: Option<String>,
    pub delivery_method: Option<String>,
    pub status: Option<String>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    /// Pagination: offset
    pub offset: Option<i64>,
    /// Pagination: limit (default 50)
    pub limit: Option<i64>,
}

/// List notifications response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListNotificationsResponse {
    pub notifications: Vec<NotificationResponse>,
    pub total: i64,
    pub offset: i64,
    pub limit: i64,
}

/// Send test email request
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct SendTestEmailRequest {
    #[validate(email(message = "Invalid email address"))]
    pub to_email: String,

    #[validate(length(max = 255, message = "Recipient name too long"))]
    pub to_name: Option<String>,
}

/// Send test email response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendTestEmailResponse {
    pub success: bool,
    pub message: String,
}

// ============================================================================
// HELPER IMPLEMENTATIONS
// ============================================================================

impl Notification {
    /// Convert database model to response
    pub fn to_response(&self, patient_name: Option<String>) -> NotificationResponse {
        // Convert sqlx JsonValue to serde_json::Value
        let metadata_value = self.metadata.as_ref().map(|v| {
            serde_json::from_str(&v.to_string()).unwrap_or(serde_json::Value::Null)
        });

        NotificationResponse {
            id: self.id,
            patient_id: self.patient_id,
            patient_name,
            appointment_id: self.appointment_id,
            notification_type: self.notification_type.clone(),
            delivery_method: self.delivery_method.clone(),
            recipient_email: self.recipient_email.clone(),
            recipient_name: self.recipient_name.clone(),
            subject: self.subject.clone(),
            scheduled_for: self.scheduled_for,
            priority: self.priority,
            status: self.status.clone(),
            retry_count: self.retry_count,
            max_retries: self.max_retries,
            sent_at: self.sent_at,
            error_message: self.error_message.clone(),
            created_at: self.created_at,
            metadata: metadata_value,
        }
    }

    /// Check if notification can be retried
    pub fn can_retry(&self) -> bool {
        self.status == "FAILED" && self.retry_count < self.max_retries
    }

    /// Check if notification can be cancelled
    pub fn can_cancel(&self) -> bool {
        self.status == "PENDING" || self.status == "FAILED"
    }
}

impl PatientNotificationPreferences {
    /// Convert to response
    pub fn to_response(&self) -> PatientNotificationPreferencesResponse {
        PatientNotificationPreferencesResponse {
            patient_id: self.patient_id,
            email_enabled: self.email_enabled,
            email_address_override: self.email_address_override.clone(),
            reminder_enabled: self.reminder_enabled,
            reminder_days_before: self.reminder_days_before,
            confirmation_enabled: self.confirmation_enabled,
            updated_at: self.updated_at,
        }
    }
}

impl Default for PatientNotificationPreferences {
    fn default() -> Self {
        Self {
            patient_id: Uuid::nil(),
            email_enabled: true,
            email_address_override: None,
            reminder_enabled: true,
            reminder_days_before: 1,
            confirmation_enabled: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            updated_by: None,
        }
    }
}
