/**
 * Holiday Type Definitions
 *
 * Type definitions for holiday and vacation calendar management.
 * These types align with the backend API in handlers/holidays.rs
 * and models/holiday.rs
 */

/**
 * Type of holiday
 * Matches HolidayType enum in backend
 */
export type HolidayType = 'NATIONAL' | 'PRACTICE_CLOSED' | 'VACATION';

/**
 * Holiday response from API
 * Matches HolidayResponse in backend
 */
export interface Holiday {
  id: string;
  holiday_date: string;
  name: string;
  holiday_type: HolidayType;
  holiday_type_display: string;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a new holiday
 * Matches CreateHolidayRequest in backend
 */
export interface CreateHolidayRequest {
  holiday_date: string;
  name: string;
  holiday_type: HolidayType;
  is_recurring?: boolean;
  notes?: string | null;
}

/**
 * Request to update an existing holiday
 * Matches UpdateHolidayRequest in backend
 */
export interface UpdateHolidayRequest {
  holiday_date?: string;
  name?: string;
  holiday_type?: HolidayType;
  is_recurring?: boolean;
  notes?: string | null;
}

/**
 * Filter for listing holidays
 * Matches HolidaysFilter in backend
 */
export interface HolidaysFilter {
  from_date?: string;
  to_date?: string;
  holiday_type?: HolidayType;
  year?: number;
  include_recurring?: boolean;
}

/**
 * Response for listing holidays
 * Matches ListHolidaysResponse in backend
 */
export interface ListHolidaysResponse {
  holidays: Holiday[];
  total: number;
}

/**
 * Response for checking if a date is a holiday
 * Matches CheckHolidayResponse in backend
 */
export interface CheckHolidayResponse {
  date: string;
  is_holiday: boolean;
  holiday: Holiday | null;
}

/**
 * Request for importing Italian national holidays
 * Matches ImportNationalHolidaysRequest in backend
 */
export interface ImportNationalHolidaysRequest {
  year: number;
  override_existing?: boolean;
}

/**
 * Response for import operation
 * Matches ImportHolidaysResponse in backend
 */
export interface ImportHolidaysResponse {
  year: number;
  imported_count: number;
  skipped_count: number;
  holidays: Holiday[];
}

/**
 * Query for holiday date range
 */
export interface HolidayRangeQuery {
  from_date: string;
  to_date: string;
}

/**
 * Get holiday type display name
 * @param type - Holiday type
 * @param locale - Locale ('en' or 'it')
 * @returns Display name
 */
export function getHolidayTypeDisplayName(
  type: HolidayType,
  locale: 'en' | 'it' = 'en'
): string {
  const names: Record<HolidayType, { en: string; it: string }> = {
    NATIONAL: { en: 'National Holiday', it: 'Festività Nazionale' },
    PRACTICE_CLOSED: { en: 'Practice Closed', it: 'Studio Chiuso' },
    VACATION: { en: 'Vacation', it: 'Ferie' },
  };
  return names[type]?.[locale] || type;
}

/**
 * Get holiday type color for UI
 * @param type - Holiday type
 * @returns Tailwind color class
 */
export function getHolidayTypeColor(type: HolidayType): string {
  const colors: Record<HolidayType, string> = {
    NATIONAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    PRACTICE_CLOSED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    VACATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Get holiday type badge variant
 * @param type - Holiday type
 * @returns Badge variant
 */
export function getHolidayTypeBadgeVariant(
  type: HolidayType
): 'destructive' | 'secondary' | 'default' | 'outline' {
  const variants: Record<HolidayType, 'destructive' | 'secondary' | 'default' | 'outline'> = {
    NATIONAL: 'destructive',
    PRACTICE_CLOSED: 'secondary',
    VACATION: 'default',
  };
  return variants[type] || 'outline';
}

/**
 * Format holiday date for display
 * @param date - ISO date string
 * @param locale - Locale code
 * @returns Formatted date string
 */
export function formatHolidayDate(date: string, locale = 'en-US'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if a holiday is in the past
 * @param holiday - Holiday object
 * @returns True if the holiday date is in the past
 */
export function isHolidayPast(holiday: Holiday): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holidayDate = new Date(holiday.holiday_date);
  return holidayDate < today;
}

/**
 * Check if a holiday is today
 * @param holiday - Holiday object
 * @returns True if the holiday is today
 */
export function isHolidayToday(holiday: Holiday): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holidayDate = new Date(holiday.holiday_date);
  holidayDate.setHours(0, 0, 0, 0);
  return holidayDate.getTime() === today.getTime();
}

/**
 * Sort holidays by date
 * @param holidays - Array of holidays
 * @param ascending - Sort direction
 * @returns Sorted array
 */
export function sortHolidaysByDate(
  holidays: Holiday[],
  ascending = true
): Holiday[] {
  return [...holidays].sort((a, b) => {
    const diff = new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime();
    return ascending ? diff : -diff;
  });
}

/**
 * Group holidays by month
 * @param holidays - Array of holidays
 * @returns Map of month key to holidays
 */
export function groupHolidaysByMonth(
  holidays: Holiday[]
): Map<string, Holiday[]> {
  const groups = new Map<string, Holiday[]>();

  for (const holiday of holidays) {
    const date = new Date(holiday.holiday_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(holiday);
  }

  return groups;
}

/**
 * All available holiday types
 */
export const HOLIDAY_TYPES: HolidayType[] = [
  'NATIONAL',
  'PRACTICE_CLOSED',
  'VACATION',
];

/**
 * Italian national holidays (fixed dates)
 * Useful for UI display and validation
 */
export const ITALIAN_NATIONAL_HOLIDAYS = [
  { month: 1, day: 1, name: 'Capodanno', nameEn: "New Year's Day" },
  { month: 1, day: 6, name: 'Epifania', nameEn: 'Epiphany' },
  { month: 4, day: 25, name: 'Festa della Liberazione', nameEn: 'Liberation Day' },
  { month: 5, day: 1, name: 'Festa del Lavoro', nameEn: 'Labour Day' },
  { month: 6, day: 2, name: 'Festa della Repubblica', nameEn: 'Republic Day' },
  { month: 8, day: 15, name: 'Ferragosto', nameEn: 'Assumption of Mary' },
  { month: 11, day: 1, name: 'Ognissanti', nameEn: "All Saints' Day" },
  { month: 12, day: 8, name: 'Immacolata Concezione', nameEn: 'Immaculate Conception' },
  { month: 12, day: 25, name: 'Natale', nameEn: 'Christmas Day' },
  { month: 12, day: 26, name: 'Santo Stefano', nameEn: "St. Stephen's Day" },
];
