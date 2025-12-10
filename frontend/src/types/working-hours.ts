/**
 * Working Hours Type Definitions
 *
 * Type definitions for working hours configuration.
 * These types align with the backend API in handlers/working_hours.rs
 * and models/working_hours.rs
 *
 * Uses ISO 8601 convention: Monday = 1, Sunday = 7
 */

/**
 * Day of week using ISO 8601 convention
 * Monday = 1, Sunday = 7
 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Day of week string representation
 */
export type DayOfWeekName =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/**
 * Override type for date-specific working hours
 * Matches OverrideType enum in backend
 */
export type OverrideType = 'CLOSED' | 'CUSTOM_HOURS' | 'EXTENDED_HOURS';

/**
 * Default working hours response DTO
 * Matches DefaultWorkingHoursResponse in backend
 */
export interface DefaultWorkingHoursResponse {
  id: string;
  day_of_week: DayOfWeekName;
  day_name: string;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_working_day: boolean;
  updated_at: string;
}

/**
 * Working hours override response DTO
 * Matches WorkingHoursOverrideResponse in backend
 */
export interface WorkingHoursOverrideResponse {
  id: string;
  override_date: string;
  override_type: OverrideType;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request to update a single day's working hours
 * Matches UpdateDayWorkingHoursRequest in backend
 */
export interface UpdateDayWorkingHoursRequest {
  day_of_week: DayOfWeek;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_working_day: boolean;
}

/**
 * Request to update all working hours (bulk update)
 * Matches UpdateAllWorkingHoursRequest in backend
 */
export interface UpdateAllWorkingHoursRequest {
  days: UpdateDayWorkingHoursRequest[];
}

/**
 * Request to create a working hours override
 * Matches CreateOverrideRequest in backend
 */
export interface CreateOverrideRequest {
  override_date: string;
  override_type: OverrideType;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  reason: string | null;
}

/**
 * Request to update a working hours override
 * Matches UpdateOverrideRequest in backend
 */
export interface UpdateOverrideRequest {
  override_type?: OverrideType;
  start_time?: string | null;
  end_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  reason?: string | null;
}

/**
 * Response for the full weekly schedule
 * Matches WeeklyScheduleResponse in backend
 */
export interface WeeklyScheduleResponse {
  days: DefaultWorkingHoursResponse[];
}

/**
 * Response for listing overrides
 * Matches ListOverridesResponse in backend
 */
export interface ListOverridesResponse {
  overrides: WorkingHoursOverrideResponse[];
  total: number;
}

/**
 * Filter for listing overrides
 * Matches OverridesFilter in backend
 */
export interface OverridesFilter {
  from_date?: string;
  to_date?: string;
  override_type?: OverrideType;
  future_only?: boolean;
}

/**
 * Effective working hours for a specific date
 * Matches EffectiveWorkingHours in backend
 */
export interface EffectiveWorkingHours {
  date: string;
  day_of_week: number;
  day_name: string;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_override: boolean;
  source: 'DEFAULT' | 'OVERRIDE';
}

/**
 * Query for effective hours
 * Matches EffectiveHoursQuery in backend
 */
export interface EffectiveHoursQuery {
  from_date: string;
  to_date: string;
}

/**
 * Response with effective hours for a date range
 * Matches EffectiveHoursResponse in backend
 */
export interface EffectiveHoursResponse {
  from_date: string;
  to_date: string;
  days: EffectiveWorkingHours[];
}

/**
 * Check working day response
 */
export interface CheckWorkingDayResponse {
  date: string;
  is_working_day: boolean;
}

/**
 * Day of week information for UI
 */
export interface DayInfo {
  value: DayOfWeek;
  name: DayOfWeekName;
  displayName: string;
  displayNameIt: string;
}

/**
 * Get all days of the week with information
 * @returns Array of day info objects
 */
export function getAllDays(): DayInfo[] {
  return [
    { value: 1, name: 'MONDAY', displayName: 'Monday', displayNameIt: 'Lunedì' },
    { value: 2, name: 'TUESDAY', displayName: 'Tuesday', displayNameIt: 'Martedì' },
    { value: 3, name: 'WEDNESDAY', displayName: 'Wednesday', displayNameIt: 'Mercoledì' },
    { value: 4, name: 'THURSDAY', displayName: 'Thursday', displayNameIt: 'Giovedì' },
    { value: 5, name: 'FRIDAY', displayName: 'Friday', displayNameIt: 'Venerdì' },
    { value: 6, name: 'SATURDAY', displayName: 'Saturday', displayNameIt: 'Sabato' },
    { value: 7, name: 'SUNDAY', displayName: 'Sunday', displayNameIt: 'Domenica' },
  ];
}

/**
 * Get day info by value
 * @param value - Day of week number (1-7)
 * @returns Day info or undefined
 */
export function getDayInfo(value: DayOfWeek): DayInfo | undefined {
  return getAllDays().find((d) => d.value === value);
}

/**
 * Get day display name from DayOfWeekName
 * @param name - Day of week name
 * @param locale - Locale ('en' or 'it')
 * @returns Display name
 */
export function getDayDisplayName(
  name: DayOfWeekName,
  locale: 'en' | 'it' = 'en'
): string {
  const day = getAllDays().find((d) => d.name === name);
  if (!day) return name;
  return locale === 'it' ? day.displayNameIt : day.displayName;
}

/**
 * Get override type display name
 * @param type - Override type
 * @param locale - Locale ('en' or 'it')
 * @returns Display name
 */
export function getOverrideTypeDisplayName(
  type: OverrideType,
  locale: 'en' | 'it' = 'en'
): string {
  const names: Record<OverrideType, { en: string; it: string }> = {
    CLOSED: { en: 'Closed', it: 'Chiuso' },
    CUSTOM_HOURS: { en: 'Custom Hours', it: 'Orario Personalizzato' },
    EXTENDED_HOURS: { en: 'Extended Hours', it: 'Orario Prolungato' },
  };
  return names[type]?.[locale] || type;
}

/**
 * Format time for display (HH:MM to localized format)
 * @param time - Time string in HH:MM format
 * @returns Formatted time string
 */
export function formatTime(time: string | null): string {
  if (!time) return '-';
  return time;
}

/**
 * Calculate working hours duration
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @param breakStart - Break start time in HH:MM format (optional)
 * @param breakEnd - Break end time in HH:MM format (optional)
 * @returns Duration in hours
 */
export function calculateWorkingDuration(
  startTime: string | null,
  endTime: string | null,
  breakStart: string | null = null,
  breakEnd: string | null = null
): number {
  if (!startTime || !endTime) return 0;

  const parseTime = (t: string): number => {
    const [hours, minutes] = t.split(':').map(Number);
    return hours * 60 + minutes;
  };

  let totalMinutes = parseTime(endTime) - parseTime(startTime);

  if (breakStart && breakEnd) {
    totalMinutes -= parseTime(breakEnd) - parseTime(breakStart);
  }

  return Math.max(0, totalMinutes / 60);
}

/**
 * All available override types
 */
export const OVERRIDE_TYPES: OverrideType[] = [
  'CLOSED',
  'CUSTOM_HOURS',
  'EXTENDED_HOURS',
];
