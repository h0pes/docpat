/**
 * Report Types and Interfaces
 *
 * TypeScript type definitions for reporting and analytics data structures,
 * matching the backend Rust models for the Reporting & Analytics module (Milestone 12).
 */

// ========== DATE RANGE ==========

/**
 * Date range for filtering reports
 */
export interface DateRangeFilter {
  /** Start date (inclusive) - ISO 8601 format */
  start_date: string;
  /** End date (inclusive) - ISO 8601 format */
  end_date: string;
}

/**
 * Date range included in report responses
 */
export interface ReportDateRange {
  start_date: string;
  end_date: string;
}

// ========== APPOINTMENT REPORTS ==========

/**
 * Appointment report query parameters
 */
export interface AppointmentReportFilter {
  /** Start date (inclusive) */
  start_date?: string;
  /** End date (inclusive) */
  end_date?: string;
  /** Provider ID filter (optional) */
  provider_id?: string;
}

/**
 * Count by day of week
 */
export interface DayOfWeekCount {
  /** Day index (0=Sunday, 1=Monday, etc.) */
  day: number;
  /** Day name for display */
  day_name: string;
  /** Appointment count */
  count: number;
}

/**
 * Count by hour of day
 */
export interface HourlyCount {
  /** Hour (0-23) */
  hour: number;
  /** Appointment count */
  count: number;
}

/**
 * Daily appointment count for trend charts
 */
export interface DailyAppointmentCount {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_shows: number;
}

/**
 * Appointment utilization report response
 */
export interface AppointmentUtilizationReport {
  /** Report date range */
  date_range: ReportDateRange;
  /** Total scheduled appointments in period */
  total_scheduled: number;
  /** Completed appointments */
  completed: number;
  /** Cancelled appointments */
  cancelled: number;
  /** No-show appointments */
  no_shows: number;
  /** Utilization rate (completed / scheduled * 100) */
  utilization_rate: number;
  /** No-show rate percentage */
  no_show_rate: number;
  /** Cancellation rate percentage */
  cancellation_rate: number;
  /** Average appointments per day */
  avg_appointments_per_day: number;
  /** Breakdown by appointment type */
  by_type: Record<string, number>;
  /** Breakdown by day of week (0=Sunday, 6=Saturday) */
  by_day_of_week: DayOfWeekCount[];
  /** Breakdown by hour of day */
  by_hour: HourlyCount[];
  /** Daily trend data */
  daily_trend: DailyAppointmentCount[];
}

// ========== PATIENT REPORTS ==========

/**
 * Patient statistics report query parameters
 */
export interface PatientReportFilter {
  /** Start date for new patient registration (optional) */
  start_date?: string;
  /** End date for new patient registration (optional) */
  end_date?: string;
}

/**
 * Gender breakdown statistics
 */
export interface GenderBreakdown {
  male: number;
  female: number;
  other: number;
  unspecified: number;
}

/**
 * Age group count
 */
export interface AgeGroupCount {
  /** Age group label (e.g., "0-18", "19-30", etc.) */
  age_group: string;
  /** Count of patients in group */
  count: number;
}

/**
 * Monthly count for trends
 */
export interface MonthlyCount {
  /** Year */
  year: number;
  /** Month (1-12) */
  month: number;
  /** Month name for display */
  month_name: string;
  /** Count */
  count: number;
}

/**
 * Patient statistics report response
 */
export interface PatientStatisticsReport {
  /** Report date range (if filtered) */
  date_range: ReportDateRange | null;
  /** Total patients in system */
  total_patients: number;
  /** Active patients */
  active_patients: number;
  /** Inactive patients */
  inactive_patients: number;
  /** Deceased patients */
  deceased_patients: number;
  /** Patients with active insurance */
  patients_with_insurance: number;
  /** New patients registered in period (if date filtered) */
  new_patients_in_period: number | null;
  /** Gender breakdown */
  by_gender: GenderBreakdown;
  /** Age distribution */
  age_distribution: AgeGroupCount[];
  /** Monthly registration trend (last 12 months) */
  monthly_registrations: MonthlyCount[];
}

// ========== DIAGNOSIS REPORTS ==========

/**
 * Diagnosis trends report query parameters
 */
export interface DiagnosisReportFilter {
  /** Start date (inclusive) */
  start_date?: string;
  /** End date (inclusive) */
  end_date?: string;
  /** Provider ID filter (optional) */
  provider_id?: string;
  /** Limit number of top diagnoses */
  limit?: number;
}

/**
 * Diagnosis frequency count
 */
export interface DiagnosisCount {
  /** ICD-10 code */
  icd10_code: string;
  /** Diagnosis description */
  description: string;
  /** Number of times diagnosed */
  count: number;
  /** Percentage of total */
  percentage: number;
}

/**
 * Monthly diagnosis count
 */
export interface MonthlyDiagnosisCount {
  year: number;
  month: number;
  month_name: string;
  count: number;
}

/**
 * Diagnosis category count (by ICD-10 chapter)
 */
export interface DiagnosisCategoryCount {
  /** Category code prefix (e.g., "A00-B99") */
  category: string;
  /** Category name */
  category_name: string;
  /** Count */
  count: number;
}

/**
 * Diagnosis trends report response
 */
export interface DiagnosisTrendsReport {
  /** Report date range */
  date_range: ReportDateRange | null;
  /** Total diagnoses recorded */
  total_diagnoses: number;
  /** Unique diagnosis codes */
  unique_codes: number;
  /** Top diagnoses by frequency */
  top_diagnoses: DiagnosisCount[];
  /** Monthly diagnosis trend */
  monthly_trend: MonthlyDiagnosisCount[];
  /** Diagnoses by category (ICD-10 chapter) */
  by_category: DiagnosisCategoryCount[];
}

// ========== PROVIDER PRODUCTIVITY REPORTS ==========

/**
 * Provider productivity report query parameters
 */
export interface ProductivityReportFilter {
  /** Start date (inclusive) */
  start_date?: string;
  /** End date (inclusive) */
  end_date?: string;
  /** Provider ID filter (optional, if not specified returns all providers) */
  provider_id?: string;
}

/**
 * Productivity summary
 */
export interface ProductivitySummary {
  /** Total appointments across all providers */
  total_appointments: number;
  /** Total completed appointments */
  completed_appointments: number;
  /** Total visits documented */
  total_visits: number;
  /** Total prescriptions written */
  total_prescriptions: number;
  /** Total documents generated */
  total_documents: number;
  /** Average appointment duration (minutes) */
  avg_appointment_duration: number;
}

/**
 * Individual provider productivity
 */
export interface ProviderProductivity {
  /** Provider user ID */
  provider_id: string;
  /** Provider name */
  provider_name: string;
  /** Provider role */
  provider_role: string;
  /** Appointments completed */
  appointments_completed: number;
  /** Visits documented */
  visits_documented: number;
  /** Prescriptions written */
  prescriptions_written: number;
  /** Documents generated */
  documents_generated: number;
  /** Patients seen (unique) */
  unique_patients_seen: number;
  /** Average visits per day */
  avg_visits_per_day: number;
  /** Completion rate */
  completion_rate: number;
}

/**
 * Provider productivity report response
 */
export interface ProviderProductivityReport {
  /** Report date range */
  date_range: ReportDateRange | null;
  /** Overall statistics */
  summary: ProductivitySummary;
  /** Per-provider breakdown (if multiple providers) */
  by_provider: ProviderProductivity[];
}

// ========== REVENUE REPORTS ==========

/**
 * Revenue report query parameters
 */
export interface RevenueReportFilter {
  /** Start date (inclusive) */
  start_date?: string;
  /** End date (inclusive) */
  end_date?: string;
  /** Provider ID filter (optional) */
  provider_id?: string;
}

/**
 * Revenue report response (placeholder - based on visits until billing integration)
 */
export interface RevenueReport {
  /** Report date range */
  date_range: ReportDateRange | null;
  /** Total visits in period */
  total_visits: number;
  /** Visits by type */
  visits_by_type: Record<string, number>;
  /** Average visits per day */
  avg_visits_per_day: number;
  /** Note about billing integration requirement */
  note: string;
}

// ========== DASHBOARD REPORT ==========

/**
 * Recent appointment summary
 */
export interface RecentAppointment {
  id: string;
  patient_name: string;
  scheduled_start: string;
  appointment_type: string;
  status: string;
}

/**
 * Recent visit summary
 */
export interface RecentVisit {
  id: string;
  patient_name: string;
  visit_date: string;
  visit_type: string;
  status: string;
}

/**
 * New patient summary
 */
export interface NewPatientSummary {
  id: string;
  name: string;
  registered_at: string;
}

/**
 * Quick statistics for dashboard
 */
export interface QuickStats {
  /** Today's appointments */
  appointments_today: number;
  /** Appointments this week */
  appointments_this_week: number;
  /** Pending visits to document */
  pending_visits: number;
  /** Active patients */
  active_patients: number;
  /** Documents generated this month */
  documents_this_month: number;
}

/**
 * Recent activity summary
 */
export interface RecentActivity {
  /** Recent appointments (last 5) */
  recent_appointments: RecentAppointment[];
  /** Recent visits (last 5) */
  recent_visits: RecentVisit[];
  /** New patients (last 5) */
  new_patients: NewPatientSummary[];
}

/**
 * Dashboard overview report
 */
export interface DashboardReport {
  /** Report generation timestamp */
  generated_at: string;
  /** Quick stats for dashboard widgets */
  quick_stats: QuickStats;
  /** Recent activity */
  recent_activity: RecentActivity;
}

// ========== EXPORT ==========

/**
 * Export format options
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

/**
 * Report type for export
 */
export enum ReportType {
  APPOINTMENT_UTILIZATION = 'appointment_utilization',
  PATIENT_STATISTICS = 'patient_statistics',
  DIAGNOSIS_TRENDS = 'diagnosis_trends',
  PROVIDER_PRODUCTIVITY = 'provider_productivity',
  REVENUE = 'revenue',
  DASHBOARD = 'dashboard',
}

/**
 * Export request
 */
export interface ExportReportRequest {
  /** Report type to export */
  report_type: ReportType;
  /** Export format */
  format: ExportFormat;
  /** Date range filter */
  start_date?: string;
  end_date?: string;
  /** Provider filter */
  provider_id?: string;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Get color for report status badge
 * @param rate - Percentage rate value
 * @param thresholds - Optional custom thresholds [good, warning]
 * @returns Tailwind color class
 */
export function getRateColor(rate: number, thresholds = [80, 60]): string {
  if (rate >= thresholds[0]) {
    return 'text-green-600 dark:text-green-400';
  } else if (rate >= thresholds[1]) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  return 'text-red-600 dark:text-red-400';
}

/**
 * Format percentage for display
 * @param value - Percentage value
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousands separator
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Get chart colors for consistent styling
 * @returns Object with chart color values
 */
export function getChartColors() {
  return {
    primary: '#3B82F6', // blue-500
    success: '#10B981', // emerald-500
    warning: '#F59E0B', // amber-500
    danger: '#EF4444', // red-500
    info: '#8B5CF6', // violet-500
    muted: '#6B7280', // gray-500
    // Extended palette for multi-series charts
    palette: [
      '#3B82F6', // blue
      '#10B981', // emerald
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ],
  };
}
