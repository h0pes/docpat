/*!
 * Report Models
 *
 * Data structures for reporting and analytics endpoints.
 * Supports date range filtering for all report types.
 */

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Date range filter for reports
#[derive(Debug, Clone, Deserialize)]
pub struct DateRangeFilter {
    /// Start date (inclusive)
    pub start_date: NaiveDate,
    /// End date (inclusive)
    pub end_date: NaiveDate,
}

impl DateRangeFilter {
    /// Create a new date range filter
    pub fn new(start_date: NaiveDate, end_date: NaiveDate) -> Self {
        Self {
            start_date,
            end_date,
        }
    }

    /// Validate that end date is not before start date
    pub fn validate(&self) -> Result<(), String> {
        if self.end_date < self.start_date {
            return Err("End date cannot be before start date".to_string());
        }
        Ok(())
    }
}

// ========== APPOINTMENT REPORTS ==========

/// Appointment utilization report query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct AppointmentReportFilter {
    /// Start date (inclusive)
    pub start_date: Option<NaiveDate>,
    /// End date (inclusive)
    pub end_date: Option<NaiveDate>,
    /// Provider ID filter (optional)
    pub provider_id: Option<Uuid>,
}

/// Appointment utilization report response
#[derive(Debug, Clone, Serialize)]
pub struct AppointmentUtilizationReport {
    /// Report date range
    pub date_range: ReportDateRange,
    /// Total scheduled appointments in period
    pub total_scheduled: i64,
    /// Completed appointments
    pub completed: i64,
    /// Cancelled appointments
    pub cancelled: i64,
    /// No-show appointments
    pub no_shows: i64,
    /// Utilization rate (completed / scheduled * 100)
    pub utilization_rate: f64,
    /// No-show rate percentage
    pub no_show_rate: f64,
    /// Cancellation rate percentage
    pub cancellation_rate: f64,
    /// Average appointments per day
    pub avg_appointments_per_day: f64,
    /// Breakdown by appointment type
    pub by_type: HashMap<String, i64>,
    /// Breakdown by day of week (0=Sunday, 6=Saturday)
    pub by_day_of_week: Vec<DayOfWeekCount>,
    /// Breakdown by hour of day
    pub by_hour: Vec<HourlyCount>,
    /// Daily trend data
    pub daily_trend: Vec<DailyAppointmentCount>,
}

/// Date range included in report response
#[derive(Debug, Clone, Serialize)]
pub struct ReportDateRange {
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

/// Count by day of week
#[derive(Debug, Clone, Serialize)]
pub struct DayOfWeekCount {
    /// Day index (0=Sunday, 1=Monday, etc.)
    pub day: i32,
    /// Day name for display
    pub day_name: String,
    /// Appointment count
    pub count: i64,
}

/// Count by hour of day
#[derive(Debug, Clone, Serialize)]
pub struct HourlyCount {
    /// Hour (0-23)
    pub hour: i32,
    /// Appointment count
    pub count: i64,
}

/// Daily appointment count for trend charts
#[derive(Debug, Clone, Serialize)]
pub struct DailyAppointmentCount {
    pub date: NaiveDate,
    pub scheduled: i64,
    pub completed: i64,
    pub cancelled: i64,
    pub no_shows: i64,
}

// ========== PATIENT REPORTS ==========

/// Patient statistics report query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct PatientReportFilter {
    /// Start date for new patient registration (optional)
    pub start_date: Option<NaiveDate>,
    /// End date for new patient registration (optional)
    pub end_date: Option<NaiveDate>,
}

/// Patient statistics report response
#[derive(Debug, Clone, Serialize)]
pub struct PatientStatisticsReport {
    /// Report date range (if filtered)
    pub date_range: Option<ReportDateRange>,
    /// Total patients in system
    pub total_patients: i64,
    /// Active patients
    pub active_patients: i64,
    /// Inactive patients
    pub inactive_patients: i64,
    /// Deceased patients
    pub deceased_patients: i64,
    /// Patients with active insurance
    pub patients_with_insurance: i64,
    /// New patients registered in period (if date filtered)
    pub new_patients_in_period: Option<i64>,
    /// Gender breakdown
    pub by_gender: GenderBreakdown,
    /// Age distribution
    pub age_distribution: Vec<AgeGroupCount>,
    /// Monthly registration trend (last 12 months)
    pub monthly_registrations: Vec<MonthlyCount>,
}

/// Gender breakdown statistics
#[derive(Debug, Clone, Serialize)]
pub struct GenderBreakdown {
    pub male: i64,
    pub female: i64,
    pub other: i64,
    pub unspecified: i64,
}

/// Age group count
#[derive(Debug, Clone, Serialize)]
pub struct AgeGroupCount {
    /// Age group label (e.g., "0-18", "19-30", etc.)
    pub age_group: String,
    /// Count of patients in group
    pub count: i64,
}

/// Monthly count for trends
#[derive(Debug, Clone, Serialize)]
pub struct MonthlyCount {
    /// Year
    pub year: i32,
    /// Month (1-12)
    pub month: i32,
    /// Month name for display
    pub month_name: String,
    /// Count
    pub count: i64,
}

// ========== DIAGNOSIS REPORTS ==========

/// Diagnosis trends report query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct DiagnosisReportFilter {
    /// Start date (inclusive)
    pub start_date: Option<NaiveDate>,
    /// End date (inclusive)
    pub end_date: Option<NaiveDate>,
    /// Provider ID filter (optional)
    pub provider_id: Option<Uuid>,
    /// Limit number of top diagnoses
    pub limit: Option<i32>,
}

/// Diagnosis trends report response
#[derive(Debug, Clone, Serialize)]
pub struct DiagnosisTrendsReport {
    /// Report date range
    pub date_range: Option<ReportDateRange>,
    /// Total diagnoses recorded
    pub total_diagnoses: i64,
    /// Unique diagnosis codes
    pub unique_codes: i64,
    /// Top diagnoses by frequency
    pub top_diagnoses: Vec<DiagnosisCount>,
    /// Monthly diagnosis trend
    pub monthly_trend: Vec<MonthlyDiagnosisCount>,
    /// Diagnoses by category (ICD-10 chapter)
    pub by_category: Vec<DiagnosisCategoryCount>,
}

/// Diagnosis frequency count
#[derive(Debug, Clone, Serialize)]
pub struct DiagnosisCount {
    /// ICD-10 code
    pub icd10_code: String,
    /// Diagnosis description
    pub description: String,
    /// Number of times diagnosed
    pub count: i64,
    /// Percentage of total
    pub percentage: f64,
}

/// Monthly diagnosis count
#[derive(Debug, Clone, Serialize)]
pub struct MonthlyDiagnosisCount {
    pub year: i32,
    pub month: i32,
    pub month_name: String,
    pub count: i64,
}

/// Diagnosis category count (by ICD-10 chapter)
#[derive(Debug, Clone, Serialize)]
pub struct DiagnosisCategoryCount {
    /// Category code prefix (e.g., "A00-B99")
    pub category: String,
    /// Category name
    pub category_name: String,
    /// Count
    pub count: i64,
}

// ========== PROVIDER PRODUCTIVITY REPORTS ==========

/// Provider productivity report query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct ProductivityReportFilter {
    /// Start date (inclusive)
    pub start_date: Option<NaiveDate>,
    /// End date (inclusive)
    pub end_date: Option<NaiveDate>,
    /// Provider ID filter (optional, if not specified returns all providers)
    pub provider_id: Option<Uuid>,
}

/// Provider productivity report response
#[derive(Debug, Clone, Serialize)]
pub struct ProviderProductivityReport {
    /// Report date range
    pub date_range: Option<ReportDateRange>,
    /// Overall statistics
    pub summary: ProductivitySummary,
    /// Per-provider breakdown (if multiple providers)
    pub by_provider: Vec<ProviderProductivity>,
}

/// Productivity summary
#[derive(Debug, Clone, Serialize)]
pub struct ProductivitySummary {
    /// Total appointments across all providers
    pub total_appointments: i64,
    /// Total completed appointments
    pub completed_appointments: i64,
    /// Total visits documented
    pub total_visits: i64,
    /// Total prescriptions written
    pub total_prescriptions: i64,
    /// Total documents generated
    pub total_documents: i64,
    /// Average appointment duration (minutes)
    pub avg_appointment_duration: f64,
}

/// Individual provider productivity
#[derive(Debug, Clone, Serialize)]
pub struct ProviderProductivity {
    /// Provider user ID
    pub provider_id: Uuid,
    /// Provider name
    pub provider_name: String,
    /// Provider role
    pub provider_role: String,
    /// Appointments completed
    pub appointments_completed: i64,
    /// Visits documented
    pub visits_documented: i64,
    /// Prescriptions written
    pub prescriptions_written: i64,
    /// Documents generated
    pub documents_generated: i64,
    /// Patients seen (unique)
    pub unique_patients_seen: i64,
    /// Average visits per day
    pub avg_visits_per_day: f64,
    /// Completion rate
    pub completion_rate: f64,
}

// ========== REVENUE REPORTS (Optional) ==========

/// Revenue report query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct RevenueReportFilter {
    /// Start date (inclusive)
    pub start_date: Option<NaiveDate>,
    /// End date (inclusive)
    pub end_date: Option<NaiveDate>,
    /// Provider ID filter (optional)
    pub provider_id: Option<Uuid>,
}

/// Revenue report response (placeholder - can be expanded based on billing integration)
#[derive(Debug, Clone, Serialize)]
pub struct RevenueReport {
    /// Report date range
    pub date_range: Option<ReportDateRange>,
    /// Total visits in period
    pub total_visits: i64,
    /// Visits by type
    pub visits_by_type: HashMap<String, i64>,
    /// Average visits per day
    pub avg_visits_per_day: f64,
    /// Note: Actual revenue tracking requires billing module integration
    pub note: String,
}

// ========== COMBINED DASHBOARD REPORT ==========

/// Dashboard overview report
#[derive(Debug, Clone, Serialize)]
pub struct DashboardReport {
    /// Report generation timestamp
    pub generated_at: DateTime<Utc>,
    /// Quick stats for dashboard widgets
    pub quick_stats: QuickStats,
    /// Recent activity
    pub recent_activity: RecentActivity,
}

/// Quick statistics for dashboard
#[derive(Debug, Clone, Serialize)]
pub struct QuickStats {
    /// Today's appointments
    pub appointments_today: i64,
    /// Appointments this week
    pub appointments_this_week: i64,
    /// Pending visits to document
    pub pending_visits: i64,
    /// Active patients
    pub active_patients: i64,
    /// Documents generated this month
    pub documents_this_month: i64,
}

/// Recent activity summary
#[derive(Debug, Clone, Serialize)]
pub struct RecentActivity {
    /// Recent appointments (last 5)
    pub recent_appointments: Vec<RecentAppointment>,
    /// Recent visits (last 5)
    pub recent_visits: Vec<RecentVisit>,
    /// New patients (last 5)
    pub new_patients: Vec<NewPatientSummary>,
}

/// Recent appointment summary
#[derive(Debug, Clone, Serialize)]
pub struct RecentAppointment {
    pub id: Uuid,
    pub patient_name: String,
    pub scheduled_start: DateTime<Utc>,
    pub appointment_type: String,
    pub status: String,
}

/// Recent visit summary
#[derive(Debug, Clone, Serialize)]
pub struct RecentVisit {
    pub id: Uuid,
    pub patient_name: String,
    pub visit_date: NaiveDate,
    pub visit_type: String,
    pub status: String,
}

/// New patient summary
#[derive(Debug, Clone, Serialize)]
pub struct NewPatientSummary {
    pub id: Uuid,
    pub name: String,
    pub registered_at: DateTime<Utc>,
}

// ========== EXPORT FORMATS ==========

/// Export format options
#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
    Csv,
    Pdf,
    Excel,
}

impl Default for ExportFormat {
    fn default() -> Self {
        Self::Json
    }
}

/// Report type for export
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReportType {
    AppointmentUtilization,
    PatientStatistics,
    DiagnosisTrends,
    ProviderProductivity,
    Revenue,
    Dashboard,
}

/// Export request
#[derive(Debug, Clone, Deserialize)]
pub struct ExportReportRequest {
    /// Report type to export
    pub report_type: ReportType,
    /// Export format
    #[serde(default)]
    pub format: ExportFormat,
    /// Date range filter
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    /// Provider filter
    pub provider_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date_range_filter_validation() {
        let valid = DateRangeFilter::new(
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            NaiveDate::from_ymd_opt(2024, 12, 31).unwrap(),
        );
        assert!(valid.validate().is_ok());

        let invalid = DateRangeFilter::new(
            NaiveDate::from_ymd_opt(2024, 12, 31).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        );
        assert!(invalid.validate().is_err());
    }

    #[test]
    fn test_export_format_default() {
        assert_eq!(ExportFormat::default(), ExportFormat::Json);
    }
}
