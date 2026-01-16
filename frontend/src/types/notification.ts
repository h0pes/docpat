/**
 * Notification Types
 *
 * TypeScript types for the notification system including
 * notifications, preferences, filters, and API responses.
 */

/**
 * Notification type enum
 */
export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_CANCELLATION'
  | 'CUSTOM';

/**
 * Notification delivery method
 */
export type DeliveryMethod = 'EMAIL' | 'SMS' | 'PUSH';

/**
 * Notification status
 */
export type NotificationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Notification metadata for appointment details
 */
export interface NotificationMetadata {
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: string;
  [key: string]: string | undefined;
}

/**
 * Notification response from API
 */
export interface NotificationResponse {
  id: string;
  patient_id: string | null;
  patient_name?: string;
  appointment_id: string | null;
  notification_type: NotificationType;
  delivery_method: DeliveryMethod;
  recipient_email: string;
  recipient_phone: string | null;
  subject: string;
  body: string;
  status: NotificationStatus;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  created_by: string | null;
  /** Additional metadata (e.g., appointment details) */
  metadata?: NotificationMetadata;
}

/**
 * Patient notification preferences
 */
export interface PatientNotificationPreferences {
  patient_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  reminder_enabled: boolean;
  reminder_days_before: number;
  preferred_time: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create notification request
 */
export interface CreateNotificationRequest {
  patient_id?: string;
  appointment_id?: string;
  notification_type: NotificationType;
  delivery_method: DeliveryMethod;
  recipient_email: string;
  recipient_phone?: string;
  subject: string;
  body: string;
  scheduled_for?: string;
}

/**
 * Update patient notification preferences request
 */
export interface UpdateNotificationPreferencesRequest {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
  preferred_time?: string;
}

/**
 * Notification filter parameters
 */
export interface NotificationFilter {
  patient_id?: string;
  appointment_id?: string;
  notification_type?: NotificationType;
  status?: NotificationStatus;
  from_date?: string;
  to_date?: string;
  offset?: number;
  limit?: number;
}

/**
 * Notification statistics
 */
export interface NotificationStatistics {
  total_notifications: number;
  pending_count: number;
  sent_count: number;
  failed_count: number;
  cancelled_count: number;
  sent_today: number;
  failed_today: number;
  average_delivery_time_seconds: number | null;
}

/**
 * List notifications response
 */
export interface ListNotificationsResponse {
  notifications: NotificationResponse[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Email status response
 */
export interface EmailStatusResponse {
  enabled: boolean;
  configured: boolean;
}

/**
 * Send test email request
 */
export interface SendTestEmailRequest {
  to_email: string;
  to_name?: string;
}

/**
 * Send test email response
 */
export interface SendTestEmailResponse {
  success: boolean;
  message: string;
}

/**
 * Helper function to get status badge variant
 */
export function getNotificationStatusVariant(
  status: NotificationStatus
): 'default' | 'secondary' | 'success' | 'destructive' | 'warning' {
  switch (status) {
    case 'SENT':
      return 'success';
    case 'FAILED':
      return 'destructive';
    case 'PENDING':
      return 'warning';
    case 'PROCESSING':
      return 'secondary';
    case 'CANCELLED':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * Helper function to get notification type label key
 */
export function getNotificationTypeKey(type: NotificationType): string {
  switch (type) {
    case 'APPOINTMENT_REMINDER':
      return 'notifications.types.appointment_reminder';
    case 'APPOINTMENT_BOOKED':
      return 'notifications.types.appointment_booked';
    case 'APPOINTMENT_CONFIRMATION':
      return 'notifications.types.appointment_confirmation';
    case 'APPOINTMENT_CANCELLATION':
      return 'notifications.types.appointment_cancellation';
    case 'CUSTOM':
      return 'notifications.types.custom';
    default:
      return 'notifications.types.unknown';
  }
}

/**
 * Helper function to get status label key
 */
export function getNotificationStatusKey(status: NotificationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'notifications.status.pending';
    case 'PROCESSING':
      return 'notifications.status.processing';
    case 'SENT':
      return 'notifications.status.sent';
    case 'FAILED':
      return 'notifications.status.failed';
    case 'CANCELLED':
      return 'notifications.status.cancelled';
    default:
      return 'notifications.status.unknown';
  }
}

/**
 * Helper function to get notification type badge variant/color
 */
export function getNotificationTypeVariant(
  type: NotificationType
): 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline' {
  switch (type) {
    case 'APPOINTMENT_BOOKED':
      return 'secondary'; // blue-ish
    case 'APPOINTMENT_CONFIRMATION':
      return 'success'; // green
    case 'APPOINTMENT_CANCELLATION':
      return 'destructive'; // red
    case 'APPOINTMENT_REMINDER':
      return 'warning'; // yellow/orange
    case 'CUSTOM':
      return 'outline';
    default:
      return 'default';
  }
}
