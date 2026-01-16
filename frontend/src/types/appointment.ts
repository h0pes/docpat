/**
 * Appointment Types and Interfaces
 *
 * TypeScript type definitions for appointment-related data structures,
 * matching the backend Rust models for the medical practice management system.
 */

/**
 * Appointment status enum representing the lifecycle of an appointment
 */
export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

/**
 * Appointment type enum
 */
export enum AppointmentType {
  NEW_PATIENT = 'NEW_PATIENT',
  FOLLOW_UP = 'FOLLOW_UP',
  URGENT = 'URGENT',
  CONSULTATION = 'CONSULTATION',
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  ACUPUNCTURE = 'ACUPUNCTURE',
}

/**
 * Get default duration in minutes for appointment type
 */
export function getDefaultDuration(type: AppointmentType): number {
  switch (type) {
    case AppointmentType.NEW_PATIENT:
      return 60;
    case AppointmentType.FOLLOW_UP:
      return 30;
    case AppointmentType.URGENT:
      return 30;
    case AppointmentType.CONSULTATION:
      return 45;
    case AppointmentType.ROUTINE_CHECKUP:
      return 30;
    case AppointmentType.ACUPUNCTURE:
      return 45;
    default:
      return 30;
  }
}

/**
 * Recurring appointment frequency
 */
export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
  MONTHLY = 'MONTHLY',
}

/**
 * Recurring appointment pattern details
 */
export interface RecurringPattern {
  frequency: RecurringFrequency;
  interval: number;
  end_date?: string; // ISO 8601 format
  max_occurrences?: number;
}

/**
 * Main Appointment interface (DTO from backend)
 */
export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;

  // Scheduling
  scheduled_start: string; // ISO 8601 format
  scheduled_end: string; // ISO 8601 format
  duration_minutes: number;

  // Details
  type: AppointmentType;
  reason?: string;
  notes?: string;

  // Status
  status: AppointmentStatus;

  // Cancellation
  cancellation_reason?: string;
  cancelled_at?: string;

  // Confirmation
  confirmation_code?: string;
  confirmed_at?: string;

  // Recurring
  is_recurring: boolean;
  recurring_pattern?: RecurringPattern;
  parent_appointment_id?: string;

  // Reminders
  reminder_sent_email: boolean;
  reminder_sent_sms: boolean;
  reminder_sent_whatsapp: boolean;

  // Check-in/out
  checked_in_at?: string;
  checked_out_at?: string;

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a new appointment
 */
export interface CreateAppointmentRequest {
  patient_id: string;
  provider_id: string;
  scheduled_start: string; // ISO 8601 format
  duration_minutes: number;
  type: AppointmentType;
  reason?: string;
  notes?: string;
  is_recurring?: boolean;
  recurring_pattern?: RecurringPattern;
  send_notification?: boolean; // Send confirmation email to patient
}

/**
 * Request to update an existing appointment
 */
export interface UpdateAppointmentRequest {
  scheduled_start?: string;
  duration_minutes?: number;
  type?: AppointmentType;
  reason?: string;
  notes?: string;
  status?: AppointmentStatus;
  cancellation_reason?: string;
  send_notification?: boolean; // Send notification on status change (e.g., confirmation)
}

/**
 * Request to cancel an appointment
 */
export interface CancelAppointmentRequest {
  cancellation_reason: string;
  send_notification?: boolean; // Send cancellation email to patient
}

/**
 * Request to check appointment availability
 */
export interface AvailabilityRequest {
  provider_id: string;
  date: string; // ISO 8601 format
  duration_minutes: number;
}

/**
 * Available time slot
 */
export interface TimeSlot {
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  available: boolean;
}

/**
 * Availability response
 */
export interface AvailabilityResponse {
  date: string;
  provider_id: string;
  slots: TimeSlot[];
}

/**
 * Search/filter parameters for appointments
 */
export interface AppointmentSearchFilters {
  patient_id?: string;
  provider_id?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  start_date?: string; // ISO 8601 format
  end_date?: string; // ISO 8601 format
  limit?: number;
  offset?: number;
}

/**
 * Paginated appointment list response
 */
export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Statistics for appointments
 */
export interface AppointmentStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  upcoming_today: number;
  upcoming_week: number;
  no_show_rate: number;
  cancellation_rate: number;
}

/**
 * Daily schedule response
 */
export interface DailyScheduleResponse {
  date: string;
  appointments: Appointment[];
}

/**
 * Weekly schedule response
 */
export interface WeeklyScheduleResponse {
  start_date: string;
  end_date: string;
  appointments: Appointment[];
}

/**
 * Monthly schedule response
 */
export interface MonthlyScheduleResponse {
  year: number;
  month: number;
  appointments: Appointment[];
}

/**
 * Calendar event format for react-big-calendar
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: Appointment;
}

/**
 * Convert Appointment to CalendarEvent for react-big-calendar
 */
export function appointmentToCalendarEvent(appointment: Appointment): CalendarEvent {
  return {
    id: appointment.id,
    title: appointment.reason || appointment.type.replace('_', ' '),
    start: new Date(appointment.scheduled_start),
    end: new Date(appointment.scheduled_end),
    resource: appointment,
  };
}

/**
 * Get status display color for UI
 */
export function getStatusColor(status: AppointmentStatus): string {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case AppointmentStatus.CONFIRMED:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case AppointmentStatus.IN_PROGRESS:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case AppointmentStatus.COMPLETED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case AppointmentStatus.CANCELLED:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case AppointmentStatus.NO_SHOW:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get appointment type display color for calendar
 */
export function getTypeColor(type: AppointmentType): string {
  switch (type) {
    case AppointmentType.NEW_PATIENT:
      return '#3B82F6'; // blue-500
    case AppointmentType.FOLLOW_UP:
      return '#10B981'; // emerald-500
    case AppointmentType.URGENT:
      return '#EF4444'; // red-500
    case AppointmentType.CONSULTATION:
      return '#8B5CF6'; // violet-500
    case AppointmentType.ROUTINE_CHECKUP:
      return '#6B7280'; // gray-500
    case AppointmentType.ACUPUNCTURE:
      return '#F59E0B'; // amber-500
    default:
      return '#6B7280';
  }
}

/**
 * Check if status transition is valid
 */
export function canTransitionStatus(
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus
): boolean {
  switch (currentStatus) {
    case AppointmentStatus.SCHEDULED:
      return [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ].includes(newStatus);

    case AppointmentStatus.CONFIRMED:
      return [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ].includes(newStatus);

    case AppointmentStatus.IN_PROGRESS:
      return [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ].includes(newStatus);

    // Final states cannot transition
    case AppointmentStatus.COMPLETED:
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return currentStatus === newStatus;

    default:
      return false;
  }
}

/**
 * Check if appointment status is final
 */
export function isFinalStatus(status: AppointmentStatus): boolean {
  return [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ].includes(status);
}
