/*!
 * Appointment Model
 *
 * Represents an appointment in the medical practice management system.
 * Includes conflict detection, status workflow, and recurring appointment support.
 *
 * Status Workflow:
 * - SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
 * - SCHEDULED/CONFIRMED can go to CANCELLED or NO_SHOW
 * - COMPLETED, CANCELLED, and NO_SHOW are final states
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;
use validator::Validate;

/// Appointment status enum representing the lifecycle of an appointment
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppointmentStatus {
    /// Appointment has been scheduled but not yet confirmed
    Scheduled,
    /// Appointment has been confirmed by patient or staff
    Confirmed,
    /// Appointment is currently in progress
    InProgress,
    /// Appointment has been completed
    Completed,
    /// Appointment was cancelled
    Cancelled,
    /// Patient did not show up for the appointment
    NoShow,
}

impl AppointmentStatus {
    /// Check if transition from current status to new status is valid
    pub fn can_transition_to(&self, new_status: &AppointmentStatus) -> bool {
        match self {
            AppointmentStatus::Scheduled => matches!(
                new_status,
                AppointmentStatus::Scheduled
                    | AppointmentStatus::Confirmed
                    | AppointmentStatus::Cancelled
                    | AppointmentStatus::NoShow
            ),
            AppointmentStatus::Confirmed => matches!(
                new_status,
                AppointmentStatus::Confirmed
                    | AppointmentStatus::InProgress
                    | AppointmentStatus::Cancelled
                    | AppointmentStatus::NoShow
            ),
            AppointmentStatus::InProgress => matches!(
                new_status,
                AppointmentStatus::InProgress
                    | AppointmentStatus::Completed
                    | AppointmentStatus::Cancelled
            ),
            // Final states cannot transition
            AppointmentStatus::Completed
            | AppointmentStatus::Cancelled
            | AppointmentStatus::NoShow => self == new_status,
        }
    }

    /// Check if this is a final state (cannot be changed)
    pub fn is_final(&self) -> bool {
        matches!(
            self,
            AppointmentStatus::Completed
                | AppointmentStatus::Cancelled
                | AppointmentStatus::NoShow
        )
    }
}

/// Appointment type enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppointmentType {
    /// New patient initial consultation
    NewPatient,
    /// Follow-up appointment
    FollowUp,
    /// Urgent appointment
    Urgent,
    /// Consultation appointment
    Consultation,
    /// Routine checkup
    RoutineCheckup,
    /// Acupuncture session
    Acupuncture,
}

impl AppointmentType {
    /// Get default duration in minutes for this appointment type
    pub fn default_duration(&self) -> i32 {
        match self {
            AppointmentType::NewPatient => 60,
            AppointmentType::FollowUp => 30,
            AppointmentType::Urgent => 30,
            AppointmentType::Consultation => 45,
            AppointmentType::RoutineCheckup => 30,
            AppointmentType::Acupuncture => 45,
        }
    }
}

/// Recurring appointment pattern
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RecurringFrequency {
    /// Repeats daily
    Daily,
    /// Repeats weekly
    Weekly,
    /// Repeats bi-weekly (every 2 weeks)
    BiWeekly,
    /// Repeats monthly
    Monthly,
}

/// Recurring appointment pattern details
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct RecurringPattern {
    /// Frequency of recurrence
    pub frequency: RecurringFrequency,

    /// Interval between occurrences (e.g., every 2 weeks)
    #[validate(range(min = 1, max = 52))]
    pub interval: i32,

    /// End date for recurring series (optional)
    pub end_date: Option<DateTime<Utc>>,

    /// Maximum number of occurrences (optional, alternative to end_date)
    #[validate(range(min = 1, max = 100))]
    pub max_occurrences: Option<i32>,
}

/// Main Appointment model representing a database record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Appointment {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub provider_id: Uuid,

    // Scheduling
    pub scheduled_start: DateTime<Utc>,
    pub scheduled_end: DateTime<Utc>,
    pub duration_minutes: i32,

    // Details
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub appointment_type: AppointmentType,
    pub reason: Option<String>,
    pub notes: Option<String>,

    // Status
    pub status: AppointmentStatus,

    // Cancellation
    pub cancellation_reason: Option<String>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub cancelled_by: Option<Uuid>,

    // Confirmation
    pub confirmation_code: Option<String>,
    pub confirmed_at: Option<DateTime<Utc>>,

    // Recurring
    pub is_recurring: bool,
    pub recurring_pattern: Option<sqlx::types::Json<RecurringPattern>>,
    pub parent_appointment_id: Option<Uuid>,

    // Reminders
    pub reminder_sent_email: bool,
    pub reminder_sent_sms: bool,
    pub reminder_sent_whatsapp: bool,
    pub reminder_sent_at: Option<DateTime<Utc>>,

    // Check-in/out
    pub checked_in_at: Option<DateTime<Utc>>,
    pub checked_out_at: Option<DateTime<Utc>>,

    // Audit
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

impl Appointment {
    /// Check if the appointment is in the past
    pub fn is_past(&self) -> bool {
        self.scheduled_end < Utc::now()
    }

    /// Check if the appointment is upcoming (in the future)
    pub fn is_upcoming(&self) -> bool {
        self.scheduled_start > Utc::now()
    }

    /// Check if the appointment is currently happening
    pub fn is_current(&self) -> bool {
        let now = Utc::now();
        self.scheduled_start <= now && now <= self.scheduled_end
    }

    /// Check if the appointment can be cancelled
    pub fn can_cancel(&self) -> bool {
        !self.status.is_final() && self.status != AppointmentStatus::InProgress
    }

    /// Check if the appointment can be rescheduled
    pub fn can_reschedule(&self) -> bool {
        matches!(
            self.status,
            AppointmentStatus::Scheduled | AppointmentStatus::Confirmed
        )
    }

    /// Check if reminders should be sent (24 hours before appointment)
    pub fn should_send_reminder(&self) -> bool {
        if self.reminder_sent_at.is_some() {
            return false;
        }

        let now = Utc::now();
        let hours_until_appointment = (self.scheduled_start - now).num_hours();

        // Send reminder 24 hours before
        hours_until_appointment <= 24 && hours_until_appointment > 0
    }
}

/// Data Transfer Object for appointment responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppointmentDto {
    pub id: Uuid,
    pub patient_id: Uuid,
    pub provider_id: Uuid,

    pub scheduled_start: DateTime<Utc>,
    pub scheduled_end: DateTime<Utc>,
    pub duration_minutes: i32,

    #[serde(rename = "type")]
    pub appointment_type: AppointmentType,
    pub reason: Option<String>,
    pub notes: Option<String>,

    pub status: AppointmentStatus,

    pub cancellation_reason: Option<String>,
    pub cancelled_at: Option<DateTime<Utc>>,

    pub confirmation_code: Option<String>,
    pub confirmed_at: Option<DateTime<Utc>>,

    pub is_recurring: bool,
    pub recurring_pattern: Option<RecurringPattern>,
    pub parent_appointment_id: Option<Uuid>,

    pub reminder_sent_email: bool,
    pub reminder_sent_sms: bool,
    pub reminder_sent_whatsapp: bool,

    pub checked_in_at: Option<DateTime<Utc>>,
    pub checked_out_at: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Appointment> for AppointmentDto {
    fn from(appointment: Appointment) -> Self {
        AppointmentDto {
            id: appointment.id,
            patient_id: appointment.patient_id,
            provider_id: appointment.provider_id,
            scheduled_start: appointment.scheduled_start,
            scheduled_end: appointment.scheduled_end,
            duration_minutes: appointment.duration_minutes,
            appointment_type: appointment.appointment_type,
            reason: appointment.reason,
            notes: appointment.notes,
            status: appointment.status,
            cancellation_reason: appointment.cancellation_reason,
            cancelled_at: appointment.cancelled_at,
            confirmation_code: appointment.confirmation_code,
            confirmed_at: appointment.confirmed_at,
            is_recurring: appointment.is_recurring,
            recurring_pattern: appointment.recurring_pattern.map(|p| p.0),
            parent_appointment_id: appointment.parent_appointment_id,
            reminder_sent_email: appointment.reminder_sent_email,
            reminder_sent_sms: appointment.reminder_sent_sms,
            reminder_sent_whatsapp: appointment.reminder_sent_whatsapp,
            checked_in_at: appointment.checked_in_at,
            checked_out_at: appointment.checked_out_at,
            created_at: appointment.created_at,
            updated_at: appointment.updated_at,
        }
    }
}

/// Request to create a new appointment
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateAppointmentRequest {
    #[validate(custom(function = "crate::utils::validate_uuid"))]
    pub patient_id: String,

    #[validate(custom(function = "crate::utils::validate_uuid"))]
    pub provider_id: String,

    pub scheduled_start: DateTime<Utc>,

    #[validate(range(min = 15, max = 480, message = "Duration must be between 15 and 480 minutes"))]
    pub duration_minutes: i32,

    #[serde(rename = "type")]
    pub appointment_type: AppointmentType,

    #[validate(length(max = 2000, message = "Reason must not exceed 2000 characters"))]
    pub reason: Option<String>,

    #[validate(length(max = 5000, message = "Notes must not exceed 5000 characters"))]
    pub notes: Option<String>,

    // Recurring appointment fields
    pub is_recurring: Option<bool>,

    #[validate(nested)]
    pub recurring_pattern: Option<RecurringPattern>,

    /// Whether to send email confirmation notification to patient
    #[serde(default)]
    pub send_notification: Option<bool>,
}

impl CreateAppointmentRequest {
    /// Validate the appointment request
    pub fn validate_appointment(&self) -> Result<(), String> {
        // Validate that scheduled_start is in the future
        if self.scheduled_start <= Utc::now() {
            return Err("Appointment must be scheduled in the future".to_string());
        }

        // If recurring, pattern must be provided
        if self.is_recurring.unwrap_or(false) && self.recurring_pattern.is_none() {
            return Err("Recurring pattern required for recurring appointments".to_string());
        }

        Ok(())
    }
}

/// Request to update an existing appointment
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateAppointmentRequest {
    pub scheduled_start: Option<DateTime<Utc>>,

    #[validate(range(min = 15, max = 480, message = "Duration must be between 15 and 480 minutes"))]
    pub duration_minutes: Option<i32>,

    #[serde(rename = "type")]
    pub appointment_type: Option<AppointmentType>,

    #[validate(length(max = 2000, message = "Reason must not exceed 2000 characters"))]
    pub reason: Option<String>,

    #[validate(length(max = 5000, message = "Notes must not exceed 5000 characters"))]
    pub notes: Option<String>,

    pub status: Option<AppointmentStatus>,

    #[validate(length(max = 2000, message = "Cancellation reason must not exceed 2000 characters"))]
    pub cancellation_reason: Option<String>,

    /// Whether to send notification on status change (e.g., confirmation)
    pub send_notification: Option<bool>,
}

/// Request to cancel an appointment
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CancelAppointmentRequest {
    #[validate(length(min = 1, max = 2000, message = "Cancellation reason is required and must not exceed 2000 characters"))]
    pub cancellation_reason: String,

    /// Whether to send email cancellation notification to patient
    #[serde(default)]
    pub send_notification: Option<bool>,
}

/// Request to check appointment availability
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct AvailabilityRequest {
    #[validate(custom(function = "crate::utils::validate_uuid"))]
    pub provider_id: String,

    pub date: DateTime<Utc>,

    #[validate(range(min = 15, max = 480, message = "Duration must be between 15 and 480 minutes"))]
    pub duration_minutes: i32,
}

/// Available time slot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlot {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub available: bool,
}

/// Availability response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailabilityResponse {
    pub date: DateTime<Utc>,
    pub provider_id: Uuid,
    pub slots: Vec<TimeSlot>,
}

/// Search/filter parameters for appointments
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct AppointmentSearchFilter {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub status: Option<AppointmentStatus>,
    pub appointment_type: Option<AppointmentType>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,

    #[validate(range(min = 1, max = 1000))]
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Statistics for appointments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppointmentStatistics {
    pub total: i64,
    pub by_status: std::collections::HashMap<String, i64>,
    pub by_type: std::collections::HashMap<String, i64>,
    pub upcoming_today: i64,
    pub upcoming_week: i64,
    pub no_show_rate: f64,
    pub cancellation_rate: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_appointment_status_transitions() {
        // Valid transitions from SCHEDULED
        assert!(AppointmentStatus::Scheduled.can_transition_to(&AppointmentStatus::Confirmed));
        assert!(AppointmentStatus::Scheduled.can_transition_to(&AppointmentStatus::Cancelled));
        assert!(AppointmentStatus::Scheduled.can_transition_to(&AppointmentStatus::NoShow));
        assert!(!AppointmentStatus::Scheduled.can_transition_to(&AppointmentStatus::InProgress));

        // Valid transitions from CONFIRMED
        assert!(AppointmentStatus::Confirmed.can_transition_to(&AppointmentStatus::InProgress));
        assert!(AppointmentStatus::Confirmed.can_transition_to(&AppointmentStatus::Cancelled));
        assert!(!AppointmentStatus::Confirmed.can_transition_to(&AppointmentStatus::Scheduled));

        // COMPLETED is final
        assert!(!AppointmentStatus::Completed.can_transition_to(&AppointmentStatus::Cancelled));
        assert!(AppointmentStatus::Completed.is_final());
    }

    #[test]
    fn test_appointment_type_default_duration() {
        assert_eq!(AppointmentType::NewPatient.default_duration(), 60);
        assert_eq!(AppointmentType::FollowUp.default_duration(), 30);
        assert_eq!(AppointmentType::Acupuncture.default_duration(), 45);
    }

    #[test]
    fn test_recurring_pattern_validation() {
        let pattern = RecurringPattern {
            frequency: RecurringFrequency::Weekly,
            interval: 1,
            end_date: Some(Utc::now() + chrono::Duration::days(90)),
            max_occurrences: Some(12),
        };

        assert!(pattern.validate().is_ok());

        // Invalid interval
        let invalid_pattern = RecurringPattern {
            frequency: RecurringFrequency::Weekly,
            interval: 100, // Too high
            end_date: None,
            max_occurrences: Some(12),
        };

        assert!(invalid_pattern.validate().is_err());
    }
}
