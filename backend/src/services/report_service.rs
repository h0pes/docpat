/*!
 * Report Service Layer
 *
 * Business logic for reporting and analytics, including:
 * - Appointment utilization reports
 * - Patient statistics
 * - Diagnosis trends
 * - Provider productivity metrics
 * - Revenue tracking (optional)
 * - Dashboard aggregation
 */

use crate::models::{
    AgeGroupCount, AppointmentReportFilter, AppointmentUtilizationReport, DailyAppointmentCount,
    DashboardReport, DayOfWeekCount, DiagnosisCategoryCount, DiagnosisCount, DiagnosisReportFilter,
    DiagnosisTrendsReport, GenderBreakdown, HourlyCount, MonthlyCount, MonthlyDiagnosisCount,
    NewPatientSummary, PatientReportFilter, PatientStatisticsReport, ProductivityReportFilter,
    ProductivitySummary, ProviderProductivity, ProviderProductivityReport, QuickStats,
    RecentActivity, RecentAppointment, RecentVisit, ReportDateRange, RevenueReport,
    RevenueReportFilter,
};
use anyhow::{Context, Result};
use chrono::{Datelike, NaiveDate, Utc};
use sqlx::{PgPool, Postgres, Row, Transaction};
use std::collections::HashMap;
use uuid::Uuid;

/// Report service for generating analytics and statistics
pub struct ReportService {
    pool: PgPool,
}

impl ReportService {
    /// Create a new report service
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Helper to set RLS context in a transaction
    ///
    /// This sets the PostgreSQL session variables required by Row-Level Security policies.
    async fn set_rls_context(
        tx: &mut Transaction<'_, Postgres>,
        user_id: Uuid,
    ) -> Result<()> {
        // Query the user's role from the database
        let role: String = sqlx::query_scalar("SELECT role::TEXT FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&mut **tx)
            .await
            .context("Failed to fetch user role for RLS context")?;

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

    /// Get default date range (last 30 days)
    fn default_date_range() -> (NaiveDate, NaiveDate) {
        let today = Utc::now().date_naive();
        let start = today - chrono::Duration::days(30);
        (start, today)
    }

    /// Get day of week name
    fn day_of_week_name(day: i32) -> String {
        match day {
            0 => "Sunday".to_string(),
            1 => "Monday".to_string(),
            2 => "Tuesday".to_string(),
            3 => "Wednesday".to_string(),
            4 => "Thursday".to_string(),
            5 => "Friday".to_string(),
            6 => "Saturday".to_string(),
            _ => "Unknown".to_string(),
        }
    }

    /// Get month name
    fn month_name(month: i32) -> String {
        match month {
            1 => "January".to_string(),
            2 => "February".to_string(),
            3 => "March".to_string(),
            4 => "April".to_string(),
            5 => "May".to_string(),
            6 => "June".to_string(),
            7 => "July".to_string(),
            8 => "August".to_string(),
            9 => "September".to_string(),
            10 => "October".to_string(),
            11 => "November".to_string(),
            12 => "December".to_string(),
            _ => "Unknown".to_string(),
        }
    }

    /// Get ICD-10 category name from code prefix
    fn icd10_category_name(category: &str) -> String {
        match category.chars().next() {
            Some('A') | Some('B') => "Infectious and Parasitic Diseases".to_string(),
            Some('C') | Some('D') => "Neoplasms / Blood Diseases".to_string(),
            Some('E') => "Endocrine, Nutritional, Metabolic".to_string(),
            Some('F') => "Mental and Behavioral Disorders".to_string(),
            Some('G') => "Nervous System Diseases".to_string(),
            Some('H') => "Eye and Ear Diseases".to_string(),
            Some('I') => "Circulatory System Diseases".to_string(),
            Some('J') => "Respiratory System Diseases".to_string(),
            Some('K') => "Digestive System Diseases".to_string(),
            Some('L') => "Skin Diseases".to_string(),
            Some('M') => "Musculoskeletal Diseases".to_string(),
            Some('N') => "Genitourinary System Diseases".to_string(),
            Some('O') => "Pregnancy and Childbirth".to_string(),
            Some('P') => "Perinatal Conditions".to_string(),
            Some('Q') => "Congenital Malformations".to_string(),
            Some('R') => "Symptoms and Abnormal Findings".to_string(),
            Some('S') | Some('T') => "Injury and Poisoning".to_string(),
            Some('V') | Some('W') | Some('X') | Some('Y') => "External Causes".to_string(),
            Some('Z') => "Factors Influencing Health Status".to_string(),
            _ => "Other".to_string(),
        }
    }

    // ========== APPOINTMENT UTILIZATION REPORT ==========

    /// Generate appointment utilization report
    ///
    /// Provides comprehensive statistics on appointment scheduling and completion.
    /// When no date range is provided, returns all-time data without date filtering.
    pub async fn get_appointment_utilization(
        &self,
        filter: AppointmentReportFilter,
        user_id: Uuid,
    ) -> Result<AppointmentUtilizationReport> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Determine if we have a date range (None means "All Time")
        let date_range = match (filter.start_date, filter.end_date) {
            (Some(s), Some(e)) => Some((s, e)),
            (Some(s), None) => Some((s, Utc::now().date_naive())),
            (None, Some(e)) => Some((e - chrono::Duration::days(30), e)),
            (None, None) => None, // All Time - no date filtering
        };

        // Build date filter clause based on whether we have a date range
        let (date_clause, provider_param_offset) = if date_range.is_some() {
            (" WHERE scheduled_start::DATE >= $1 AND scheduled_start::DATE <= $2", 3)
        } else {
            (" WHERE 1=1", 1)
        };

        // Build provider filter clause
        let provider_clause = filter
            .provider_id
            .map(|_| format!(" AND provider_id = ${}", provider_param_offset))
            .unwrap_or_default();

        // Count by status
        let status_query = format!(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') THEN 1 ELSE 0 END), 0)::BIGINT as total_scheduled,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0)::BIGINT as completed,
                COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0)::BIGINT as cancelled,
                COALESCE(SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END), 0)::BIGINT as no_shows
            FROM appointments
            {}{}
            "#,
            date_clause, provider_clause
        );

        let status_row = match (date_range, filter.provider_id) {
            (Some((start, end)), Some(provider_id)) => {
                sqlx::query(&status_query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_one(&mut *tx)
                    .await?
            }
            (Some((start, end)), None) => {
                sqlx::query(&status_query)
                    .bind(start)
                    .bind(end)
                    .fetch_one(&mut *tx)
                    .await?
            }
            (None, Some(provider_id)) => {
                sqlx::query(&status_query)
                    .bind(provider_id)
                    .fetch_one(&mut *tx)
                    .await?
            }
            (None, None) => {
                sqlx::query(&status_query)
                    .fetch_one(&mut *tx)
                    .await?
            }
        };

        let total_scheduled: i64 = status_row.try_get("total_scheduled").unwrap_or(0);
        let completed: i64 = status_row.try_get("completed").unwrap_or(0);
        let cancelled: i64 = status_row.try_get("cancelled").unwrap_or(0);
        let no_shows: i64 = status_row.try_get("no_shows").unwrap_or(0);

        // Calculate rates
        let utilization_rate = if total_scheduled > 0 {
            (completed as f64 / total_scheduled as f64) * 100.0
        } else {
            0.0
        };

        let no_show_rate = if total_scheduled > 0 {
            (no_shows as f64 / total_scheduled as f64) * 100.0
        } else {
            0.0
        };

        let cancellation_rate = if total_scheduled > 0 {
            (cancelled as f64 / total_scheduled as f64) * 100.0
        } else {
            0.0
        };

        // Calculate days in range (for "All Time", calculate from earliest to latest appointment)
        let avg_appointments_per_day = if let Some((start, end)) = date_range {
            let days_in_range = (end - start).num_days() + 1;
            if days_in_range > 0 {
                total_scheduled as f64 / days_in_range as f64
            } else {
                0.0
            }
        } else {
            // For All Time, get date range from actual data
            let date_range_row: Option<(Option<NaiveDate>, Option<NaiveDate>)> = sqlx::query_as(
                "SELECT MIN(scheduled_start::DATE), MAX(scheduled_start::DATE) FROM appointments"
            )
            .fetch_optional(&mut *tx)
            .await?;

            if let Some((Some(min_date), Some(max_date))) = date_range_row {
                let days = (max_date - min_date).num_days() + 1;
                if days > 0 { total_scheduled as f64 / days as f64 } else { 0.0 }
            } else {
                0.0
            }
        };

        // Get breakdown by type
        let type_query = format!(
            r#"
            SELECT type::TEXT as appointment_type, COUNT(*)::BIGINT as count
            FROM appointments
            {}{}
            GROUP BY type
            "#,
            date_clause, provider_clause
        );

        let type_rows = match (date_range, filter.provider_id) {
            (Some((start, end)), Some(provider_id)) => {
                sqlx::query(&type_query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (Some((start, end)), None) => {
                sqlx::query(&type_query)
                    .bind(start)
                    .bind(end)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, Some(provider_id)) => {
                sqlx::query(&type_query)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, None) => {
                sqlx::query(&type_query)
                    .fetch_all(&mut *tx)
                    .await?
            }
        };

        let mut by_type = HashMap::new();
        for row in type_rows {
            let appointment_type: String = row.try_get("appointment_type").unwrap_or_default();
            let count: i64 = row.try_get("count").unwrap_or(0);
            by_type.insert(appointment_type, count);
        }

        // Get breakdown by day of week (PostgreSQL: 0=Sunday, 6=Saturday)
        let dow_query = format!(
            r#"
            SELECT EXTRACT(DOW FROM scheduled_start)::INTEGER as dow, COUNT(*)::BIGINT as count
            FROM appointments
            {}{}
            GROUP BY dow
            ORDER BY dow
            "#,
            date_clause, provider_clause
        );

        let dow_rows = match (date_range, filter.provider_id) {
            (Some((start, end)), Some(provider_id)) => {
                sqlx::query(&dow_query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (Some((start, end)), None) => {
                sqlx::query(&dow_query)
                    .bind(start)
                    .bind(end)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, Some(provider_id)) => {
                sqlx::query(&dow_query)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, None) => {
                sqlx::query(&dow_query)
                    .fetch_all(&mut *tx)
                    .await?
            }
        };

        let mut by_day_of_week = Vec::new();
        for row in dow_rows {
            let day: i32 = row.try_get("dow").unwrap_or(0);
            let count: i64 = row.try_get("count").unwrap_or(0);
            by_day_of_week.push(DayOfWeekCount {
                day,
                day_name: Self::day_of_week_name(day),
                count,
            });
        }

        // Get breakdown by hour
        let hour_query = format!(
            r#"
            SELECT EXTRACT(HOUR FROM scheduled_start)::INTEGER as hour, COUNT(*)::BIGINT as count
            FROM appointments
            {}{}
            GROUP BY hour
            ORDER BY hour
            "#,
            date_clause, provider_clause
        );

        let hour_rows = match (date_range, filter.provider_id) {
            (Some((start, end)), Some(provider_id)) => {
                sqlx::query(&hour_query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (Some((start, end)), None) => {
                sqlx::query(&hour_query)
                    .bind(start)
                    .bind(end)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, Some(provider_id)) => {
                sqlx::query(&hour_query)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, None) => {
                sqlx::query(&hour_query)
                    .fetch_all(&mut *tx)
                    .await?
            }
        };

        let mut by_hour = Vec::new();
        for row in hour_rows {
            let hour: i32 = row.try_get("hour").unwrap_or(0);
            let count: i64 = row.try_get("count").unwrap_or(0);
            by_hour.push(HourlyCount { hour, count });
        }

        // Get daily trend
        let daily_query = format!(
            r#"
            SELECT
                scheduled_start::DATE as date,
                COUNT(*)::BIGINT as scheduled,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)::BIGINT as completed,
                SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::BIGINT as cancelled,
                SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END)::BIGINT as no_shows
            FROM appointments
            {}{}
            GROUP BY scheduled_start::DATE
            ORDER BY date
            "#,
            date_clause, provider_clause
        );

        let daily_rows = match (date_range, filter.provider_id) {
            (Some((start, end)), Some(provider_id)) => {
                sqlx::query(&daily_query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (Some((start, end)), None) => {
                sqlx::query(&daily_query)
                    .bind(start)
                    .bind(end)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, Some(provider_id)) => {
                sqlx::query(&daily_query)
                    .bind(provider_id)
                    .fetch_all(&mut *tx)
                    .await?
            }
            (None, None) => {
                sqlx::query(&daily_query)
                    .fetch_all(&mut *tx)
                    .await?
            }
        };

        let today = Utc::now().date_naive();
        let mut daily_trend = Vec::new();
        for row in daily_rows {
            let date: NaiveDate = row.try_get("date").unwrap_or(today);
            let scheduled: i64 = row.try_get("scheduled").unwrap_or(0);
            let completed: i64 = row.try_get("completed").unwrap_or(0);
            let cancelled: i64 = row.try_get("cancelled").unwrap_or(0);
            let no_shows: i64 = row.try_get("no_shows").unwrap_or(0);
            daily_trend.push(DailyAppointmentCount {
                date,
                scheduled,
                completed,
                cancelled,
                no_shows,
            });
        }

        tx.commit().await.context("Failed to commit transaction")?;

        // Build the response date range - for All Time, use actual data range or default
        let report_date_range = if let Some((start, end)) = date_range {
            ReportDateRange {
                start_date: start,
                end_date: end,
            }
        } else {
            // For All Time, get actual date range from data or use today
            let first_date = daily_trend.first().map(|d| d.date).unwrap_or(today);
            let last_date = daily_trend.last().map(|d| d.date).unwrap_or(today);
            ReportDateRange {
                start_date: first_date,
                end_date: last_date,
            }
        };

        Ok(AppointmentUtilizationReport {
            date_range: report_date_range,
            total_scheduled,
            completed,
            cancelled,
            no_shows,
            utilization_rate,
            no_show_rate,
            cancellation_rate,
            avg_appointments_per_day,
            by_type,
            by_day_of_week,
            by_hour,
            daily_trend,
        })
    }

    // ========== PATIENT STATISTICS REPORT ==========

    /// Generate patient statistics report
    ///
    /// Provides demographics and registration statistics.
    pub async fn get_patient_statistics(
        &self,
        filter: PatientReportFilter,
        user_id: Uuid,
    ) -> Result<PatientStatisticsReport> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Total patients by status
        let status_row = sqlx::query(
            r#"
            SELECT
                COUNT(*)::BIGINT as total,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)::BIGINT as active,
                SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END)::BIGINT as inactive,
                SUM(CASE WHEN status = 'DECEASED' THEN 1 ELSE 0 END)::BIGINT as deceased
            FROM patients
            "#,
        )
        .fetch_one(&mut *tx)
        .await?;

        let total_patients: i64 = status_row.try_get("total").unwrap_or(0);
        let active_patients: i64 = status_row.try_get("active").unwrap_or(0);
        let inactive_patients: i64 = status_row.try_get("inactive").unwrap_or(0);
        let deceased_patients: i64 = status_row.try_get("deceased").unwrap_or(0);

        // Patients with insurance
        let insurance_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(DISTINCT patient_id)::BIGINT FROM patient_insurance WHERE is_active = true",
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        // New patients in period (if date filter provided)
        let (date_range, new_patients_in_period) = match (filter.start_date, filter.end_date) {
            (Some(start), Some(end)) => {
                let count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*)::BIGINT FROM patients WHERE created_at::DATE >= $1 AND created_at::DATE <= $2",
                )
                .bind(start)
                .bind(end)
                .fetch_one(&mut *tx)
                .await
                .unwrap_or(0);

                (
                    Some(ReportDateRange {
                        start_date: start,
                        end_date: end,
                    }),
                    Some(count),
                )
            }
            _ => (None, None),
        };

        // Gender breakdown
        let gender_row = sqlx::query(
            r#"
            SELECT
                SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END)::BIGINT as male,
                SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END)::BIGINT as female,
                SUM(CASE WHEN gender = 'OTHER' THEN 1 ELSE 0 END)::BIGINT as other,
                SUM(CASE WHEN gender IS NULL THEN 1 ELSE 0 END)::BIGINT as unspecified
            FROM patients
            "#,
        )
        .fetch_one(&mut *tx)
        .await?;

        let by_gender = GenderBreakdown {
            male: gender_row.try_get("male").unwrap_or(0),
            female: gender_row.try_get("female").unwrap_or(0),
            other: gender_row.try_get("other").unwrap_or(0),
            unspecified: gender_row.try_get("unspecified").unwrap_or(0),
        };

        // Age distribution (note: date_of_birth is encrypted, so we need to decrypt for calculation)
        // For now, we'll provide a placeholder since age calculation requires decryption
        // In production, consider storing age group or calculating during patient creation/update
        let age_distribution = vec![
            AgeGroupCount {
                age_group: "0-18".to_string(),
                count: 0,
            },
            AgeGroupCount {
                age_group: "19-30".to_string(),
                count: 0,
            },
            AgeGroupCount {
                age_group: "31-50".to_string(),
                count: 0,
            },
            AgeGroupCount {
                age_group: "51-65".to_string(),
                count: 0,
            },
            AgeGroupCount {
                age_group: "66-80".to_string(),
                count: 0,
            },
            AgeGroupCount {
                age_group: "80+".to_string(),
                count: 0,
            },
        ];

        // Monthly registrations (last 12 months)
        let monthly_rows = sqlx::query(
            r#"
            SELECT
                EXTRACT(YEAR FROM created_at)::INTEGER as year,
                EXTRACT(MONTH FROM created_at)::INTEGER as month,
                COUNT(*)::BIGINT as count
            FROM patients
            WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY year, month
            ORDER BY year, month
            "#,
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut monthly_registrations = Vec::new();
        for row in monthly_rows {
            let year: i32 = row.try_get("year").unwrap_or(0);
            let month: i32 = row.try_get("month").unwrap_or(0);
            let count: i64 = row.try_get("count").unwrap_or(0);
            monthly_registrations.push(MonthlyCount {
                year,
                month,
                month_name: Self::month_name(month),
                count,
            });
        }

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(PatientStatisticsReport {
            date_range,
            total_patients,
            active_patients,
            inactive_patients,
            deceased_patients,
            patients_with_insurance: insurance_count,
            new_patients_in_period,
            by_gender,
            age_distribution,
            monthly_registrations,
        })
    }

    // ========== DIAGNOSIS TRENDS REPORT ==========

    /// Generate diagnosis trends report
    ///
    /// Analyzes diagnosis frequency and trends over time.
    pub async fn get_diagnosis_trends(
        &self,
        filter: DiagnosisReportFilter,
        user_id: Uuid,
    ) -> Result<DiagnosisTrendsReport> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Determine date range
        let date_range = match (filter.start_date, filter.end_date) {
            (Some(start), Some(end)) => Some(ReportDateRange {
                start_date: start,
                end_date: end,
            }),
            _ => None,
        };

        let limit = filter.limit.unwrap_or(20) as i64;

        // Build date filter clause
        let date_clause = match (&filter.start_date, &filter.end_date) {
            (Some(_), Some(_)) => " AND v.visit_date >= $1 AND v.visit_date <= $2",
            _ => "",
        };

        // Total and unique diagnoses
        let count_query = format!(
            r#"
            SELECT
                COUNT(*)::BIGINT as total,
                COUNT(DISTINCT vd.icd10_code)::BIGINT as unique_codes
            FROM visit_diagnoses vd
            JOIN visits v ON vd.visit_id = v.id
            WHERE 1=1{}
            "#,
            date_clause
        );

        let count_row = if let (Some(start), Some(end)) = (filter.start_date, filter.end_date) {
            sqlx::query(&count_query)
                .bind(start)
                .bind(end)
                .fetch_one(&mut *tx)
                .await?
        } else {
            sqlx::query(&count_query).fetch_one(&mut *tx).await?
        };

        let total_diagnoses: i64 = count_row.try_get("total").unwrap_or(0);
        let unique_codes: i64 = count_row.try_get("unique_codes").unwrap_or(0);

        // Top diagnoses
        let top_query = format!(
            r#"
            SELECT
                vd.icd10_code,
                vd.icd10_description as description,
                COUNT(*)::BIGINT as count
            FROM visit_diagnoses vd
            JOIN visits v ON vd.visit_id = v.id
            WHERE 1=1{}
            GROUP BY vd.icd10_code, vd.icd10_description
            ORDER BY count DESC
            LIMIT ${}
            "#,
            date_clause,
            if date_clause.is_empty() { "1" } else { "3" }
        );

        let top_rows = if let (Some(start), Some(end)) = (filter.start_date, filter.end_date) {
            sqlx::query(&top_query)
                .bind(start)
                .bind(end)
                .bind(limit)
                .fetch_all(&mut *tx)
                .await?
        } else {
            sqlx::query(&top_query)
                .bind(limit)
                .fetch_all(&mut *tx)
                .await?
        };

        let mut top_diagnoses = Vec::new();
        for row in top_rows {
            let icd10_code: String = row.try_get("icd10_code").unwrap_or_default();
            let description: String = row.try_get("description").unwrap_or_default();
            let count: i64 = row.try_get("count").unwrap_or(0);
            let percentage = if total_diagnoses > 0 {
                (count as f64 / total_diagnoses as f64) * 100.0
            } else {
                0.0
            };
            top_diagnoses.push(DiagnosisCount {
                icd10_code,
                description,
                count,
                percentage,
            });
        }

        // Monthly trend (last 12 months)
        let monthly_query = r#"
            SELECT
                EXTRACT(YEAR FROM v.visit_date)::INTEGER as year,
                EXTRACT(MONTH FROM v.visit_date)::INTEGER as month,
                COUNT(vd.id)::BIGINT as count
            FROM visit_diagnoses vd
            JOIN visits v ON vd.visit_id = v.id
            WHERE v.visit_date >= NOW() - INTERVAL '12 months'
            GROUP BY year, month
            ORDER BY year, month
        "#;

        let monthly_rows = sqlx::query(monthly_query).fetch_all(&mut *tx).await?;

        let mut monthly_trend = Vec::new();
        for row in monthly_rows {
            let year: i32 = row.try_get("year").unwrap_or(0);
            let month: i32 = row.try_get("month").unwrap_or(0);
            let count: i64 = row.try_get("count").unwrap_or(0);
            monthly_trend.push(MonthlyDiagnosisCount {
                year,
                month,
                month_name: Self::month_name(month),
                count,
            });
        }

        // Diagnoses by category (ICD-10 chapter)
        let category_query = format!(
            r#"
            SELECT
                UPPER(SUBSTRING(vd.icd10_code, 1, 1)) as category,
                COUNT(*)::BIGINT as count
            FROM visit_diagnoses vd
            JOIN visits v ON vd.visit_id = v.id
            WHERE 1=1{}
            GROUP BY category
            ORDER BY count DESC
            "#,
            date_clause
        );

        let category_rows = if let (Some(start), Some(end)) = (filter.start_date, filter.end_date) {
            sqlx::query(&category_query)
                .bind(start)
                .bind(end)
                .fetch_all(&mut *tx)
                .await?
        } else {
            sqlx::query(&category_query).fetch_all(&mut *tx).await?
        };

        let mut by_category = Vec::new();
        for row in category_rows {
            let category: String = row.try_get("category").unwrap_or_default();
            let count: i64 = row.try_get("count").unwrap_or(0);
            by_category.push(DiagnosisCategoryCount {
                category: category.clone(),
                category_name: Self::icd10_category_name(&category),
                count,
            });
        }

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(DiagnosisTrendsReport {
            date_range,
            total_diagnoses,
            unique_codes,
            top_diagnoses,
            monthly_trend,
            by_category,
        })
    }

    // ========== PROVIDER PRODUCTIVITY REPORT ==========

    /// Generate provider productivity report
    ///
    /// Analyzes provider workload and efficiency metrics.
    pub async fn get_provider_productivity(
        &self,
        filter: ProductivityReportFilter,
        user_id: Uuid,
    ) -> Result<ProviderProductivityReport> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Determine if we have a date range (None means "All Time")
        let date_range = match (filter.start_date, filter.end_date) {
            (Some(s), Some(e)) => Some((s, e)),
            (Some(s), None) => Some((s, Utc::now().date_naive())),
            (None, Some(e)) => Some((e - chrono::Duration::days(30), e)),
            (None, None) => None, // All Time - no date filtering
        };

        // Build provider filter clause - parameter position depends on whether dates are present
        let provider_param_pos = if date_range.is_some() { 3 } else { 1 };

        // Summary statistics - different queries based on whether we have date filters
        let summary_query = if let Some(_) = date_range {
            let provider_clause = filter
                .provider_id
                .map(|_| format!(" AND provider_id = ${}", provider_param_pos))
                .unwrap_or_default();

            format!(
                r#"
                SELECT
                    (SELECT COUNT(*)::BIGINT FROM appointments WHERE scheduled_start::DATE >= $1 AND scheduled_start::DATE <= $2{0}) as total_appointments,
                    (SELECT COUNT(*)::BIGINT FROM appointments WHERE scheduled_start::DATE >= $1 AND scheduled_start::DATE <= $2{0} AND status = 'COMPLETED') as completed_appointments,
                    (SELECT COUNT(*)::BIGINT FROM visits WHERE visit_date >= $1 AND visit_date <= $2{0}) as total_visits,
                    (SELECT COUNT(*)::BIGINT FROM prescriptions WHERE prescribed_date >= $1 AND prescribed_date <= $2{0}) as total_prescriptions,
                    (SELECT COUNT(*)::BIGINT FROM generated_documents WHERE created_at::DATE >= $1 AND created_at::DATE <= $2 AND status != 'DELETED') as total_documents
                "#,
                provider_clause
            )
        } else {
            let provider_clause = filter
                .provider_id
                .map(|_| format!(" WHERE provider_id = ${}", provider_param_pos))
                .unwrap_or_default();

            format!(
                r#"
                SELECT
                    (SELECT COUNT(*)::BIGINT FROM appointments{0}) as total_appointments,
                    (SELECT COUNT(*)::BIGINT FROM appointments WHERE status = 'COMPLETED'{1}) as completed_appointments,
                    (SELECT COUNT(*)::BIGINT FROM visits{0}) as total_visits,
                    (SELECT COUNT(*)::BIGINT FROM prescriptions{0}) as total_prescriptions,
                    (SELECT COUNT(*)::BIGINT FROM generated_documents WHERE status != 'DELETED') as total_documents
                "#,
                provider_clause,
                if filter.provider_id.is_some() { format!(" AND provider_id = ${}", provider_param_pos) } else { String::new() }
            )
        };

        let summary_row = match (date_range, filter.provider_id) {
            (Some((start, end)), Some(provider_id)) => {
                sqlx::query(&summary_query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_one(&mut *tx)
                    .await?
            }
            (Some((start, end)), None) => {
                sqlx::query(&summary_query)
                    .bind(start)
                    .bind(end)
                    .fetch_one(&mut *tx)
                    .await?
            }
            (None, Some(provider_id)) => {
                sqlx::query(&summary_query)
                    .bind(provider_id)
                    .fetch_one(&mut *tx)
                    .await?
            }
            (None, None) => {
                sqlx::query(&summary_query)
                    .fetch_one(&mut *tx)
                    .await?
            }
        };

        let total_appointments: i64 = summary_row.try_get("total_appointments").unwrap_or(0);
        let completed_appointments: i64 = summary_row.try_get("completed_appointments").unwrap_or(0);
        let total_visits: i64 = summary_row.try_get("total_visits").unwrap_or(0);
        let total_prescriptions: i64 = summary_row.try_get("total_prescriptions").unwrap_or(0);
        let total_documents: i64 = summary_row.try_get("total_documents").unwrap_or(0);

        // Average appointment duration - handle with/without date range
        let avg_duration: f64 = if let Some((start, end)) = date_range {
            let provider_filter = if filter.provider_id.is_some() { " AND provider_id = $3" } else { "" };
            let query = format!(
                r#"
                SELECT COALESCE(AVG(duration_minutes), 0)::FLOAT as avg_duration
                FROM appointments
                WHERE scheduled_start::DATE >= $1 AND scheduled_start::DATE <= $2{} AND status = 'COMPLETED'
                "#,
                provider_filter
            );
            if let Some(provider_id) = filter.provider_id {
                sqlx::query_scalar(&query)
                    .bind(start)
                    .bind(end)
                    .bind(provider_id)
                    .fetch_one(&mut *tx)
                    .await
                    .unwrap_or(0.0)
            } else {
                sqlx::query_scalar(&query)
                    .bind(start)
                    .bind(end)
                    .fetch_one(&mut *tx)
                    .await
                    .unwrap_or(0.0)
            }
        } else {
            // All Time - no date filter
            let provider_filter = if filter.provider_id.is_some() { " AND provider_id = $1" } else { "" };
            let query = format!(
                r#"
                SELECT COALESCE(AVG(duration_minutes), 0)::FLOAT as avg_duration
                FROM appointments
                WHERE status = 'COMPLETED'{}
                "#,
                provider_filter
            );
            if let Some(provider_id) = filter.provider_id {
                sqlx::query_scalar(&query)
                    .bind(provider_id)
                    .fetch_one(&mut *tx)
                    .await
                    .unwrap_or(0.0)
            } else {
                sqlx::query_scalar(&query)
                    .fetch_one(&mut *tx)
                    .await
                    .unwrap_or(0.0)
            }
        };

        let summary = ProductivitySummary {
            total_appointments,
            completed_appointments,
            total_visits,
            total_prescriptions,
            total_documents,
            avg_appointment_duration: avg_duration,
        };

        // Per-provider breakdown - handle with/without date range
        let (provider_rows, days_in_range) = if let Some((start, end)) = date_range {
            let provider_query = r#"
                SELECT
                    u.id as provider_id,
                    u.first_name || ' ' || u.last_name as provider_name,
                    u.role::TEXT as provider_role,
                    COALESCE((SELECT COUNT(*) FROM appointments a WHERE a.provider_id = u.id AND a.scheduled_start::DATE >= $1 AND a.scheduled_start::DATE <= $2 AND a.status = 'COMPLETED'), 0)::BIGINT as appointments_completed,
                    COALESCE((SELECT COUNT(*) FROM visits v WHERE v.provider_id = u.id AND v.visit_date >= $1 AND v.visit_date <= $2), 0)::BIGINT as visits_documented,
                    COALESCE((SELECT COUNT(*) FROM prescriptions p WHERE p.provider_id = u.id AND p.prescribed_date >= $1 AND p.prescribed_date <= $2), 0)::BIGINT as prescriptions_written,
                    COALESCE((SELECT COUNT(*) FROM generated_documents d WHERE d.created_by = u.id AND d.created_at::DATE >= $1 AND d.created_at::DATE <= $2 AND d.status != 'DELETED'), 0)::BIGINT as documents_generated,
                    COALESCE((SELECT COUNT(DISTINCT patient_id) FROM visits v WHERE v.provider_id = u.id AND v.visit_date >= $1 AND v.visit_date <= $2), 0)::BIGINT as unique_patients_seen
                FROM users u
                WHERE u.role IN ('ADMIN', 'DOCTOR')
                ORDER BY visits_documented DESC
            "#;

            let rows = sqlx::query(provider_query)
                .bind(start)
                .bind(end)
                .fetch_all(&mut *tx)
                .await?;

            let days = (end - start).num_days().max(1) as f64;
            (rows, days)
        } else {
            // All Time - no date filter, calculate days from earliest to now
            let provider_query = r#"
                SELECT
                    u.id as provider_id,
                    u.first_name || ' ' || u.last_name as provider_name,
                    u.role::TEXT as provider_role,
                    COALESCE((SELECT COUNT(*) FROM appointments a WHERE a.provider_id = u.id AND a.status = 'COMPLETED'), 0)::BIGINT as appointments_completed,
                    COALESCE((SELECT COUNT(*) FROM visits v WHERE v.provider_id = u.id), 0)::BIGINT as visits_documented,
                    COALESCE((SELECT COUNT(*) FROM prescriptions p WHERE p.provider_id = u.id), 0)::BIGINT as prescriptions_written,
                    COALESCE((SELECT COUNT(*) FROM generated_documents d WHERE d.created_by = u.id AND d.status != 'DELETED'), 0)::BIGINT as documents_generated,
                    COALESCE((SELECT COUNT(DISTINCT patient_id) FROM visits v WHERE v.provider_id = u.id), 0)::BIGINT as unique_patients_seen
                FROM users u
                WHERE u.role IN ('ADMIN', 'DOCTOR')
                ORDER BY visits_documented DESC
            "#;

            let rows = sqlx::query(provider_query)
                .fetch_all(&mut *tx)
                .await?;

            // For "All Time", calculate days from earliest data
            let earliest_query = r#"
                SELECT COALESCE(MIN(d), CURRENT_DATE) as earliest FROM (
                    SELECT MIN(scheduled_start::DATE) as d FROM appointments
                    UNION ALL
                    SELECT MIN(visit_date) as d FROM visits
                ) subq
            "#;
            let earliest_date: NaiveDate = sqlx::query_scalar(earliest_query)
                .fetch_one(&mut *tx)
                .await
                .unwrap_or_else(|_| Utc::now().date_naive());
            let days = (Utc::now().date_naive() - earliest_date).num_days().max(1) as f64;
            (rows, days)
        };

        let mut by_provider = Vec::new();
        for row in provider_rows {
            let provider_id: Uuid = row.try_get("provider_id").unwrap_or_default();
            let provider_name: String = row.try_get("provider_name").unwrap_or_default();
            let provider_role: String = row.try_get("provider_role").unwrap_or_default();
            let appointments_completed: i64 = row.try_get("appointments_completed").unwrap_or(0);
            let visits_documented: i64 = row.try_get("visits_documented").unwrap_or(0);
            let prescriptions_written: i64 = row.try_get("prescriptions_written").unwrap_or(0);
            let documents_generated: i64 = row.try_get("documents_generated").unwrap_or(0);
            let unique_patients_seen: i64 = row.try_get("unique_patients_seen").unwrap_or(0);

            let avg_visits_per_day = visits_documented as f64 / days_in_range;
            let completion_rate = if appointments_completed > 0 {
                100.0 // All counted are completed
            } else {
                0.0
            };

            // Filter by provider if specified
            if let Some(filter_provider_id) = filter.provider_id {
                if provider_id != filter_provider_id {
                    continue;
                }
            }

            by_provider.push(ProviderProductivity {
                provider_id,
                provider_name,
                provider_role,
                appointments_completed,
                visits_documented,
                prescriptions_written,
                documents_generated,
                unique_patients_seen,
                avg_visits_per_day,
                completion_rate,
            });
        }

        tx.commit().await.context("Failed to commit transaction")?;

        // Convert date_range tuple to ReportDateRange struct
        let report_date_range = date_range.map(|(start, end)| ReportDateRange {
            start_date: start,
            end_date: end,
        });

        Ok(ProviderProductivityReport {
            date_range: report_date_range,
            summary,
            by_provider,
        })
    }

    // ========== REVENUE REPORT (PLACEHOLDER) ==========

    /// Generate revenue report (placeholder)
    ///
    /// Note: Actual revenue tracking requires billing module integration.
    /// This provides visit-based metrics as a proxy for revenue analysis.
    pub async fn get_revenue_report(
        &self,
        filter: RevenueReportFilter,
        user_id: Uuid,
    ) -> Result<RevenueReport> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        // Determine date range
        let (start_date, end_date) = match (filter.start_date, filter.end_date) {
            (Some(s), Some(e)) => (s, e),
            (Some(s), None) => (s, Utc::now().date_naive()),
            (None, Some(e)) => (e - chrono::Duration::days(30), e),
            (None, None) => Self::default_date_range(),
        };

        let date_range = Some(ReportDateRange {
            start_date,
            end_date,
        });

        // Build provider filter clause
        let provider_clause = filter
            .provider_id
            .map(|_| " AND provider_id = $3")
            .unwrap_or("");

        // Total visits
        let visits_query = format!(
            r#"
            SELECT COUNT(*)::BIGINT as total
            FROM visits
            WHERE visit_date >= $1 AND visit_date <= $2{}
            "#,
            provider_clause
        );

        let total_visits: i64 = if let Some(provider_id) = filter.provider_id {
            sqlx::query_scalar(&visits_query)
                .bind(start_date)
                .bind(end_date)
                .bind(provider_id)
                .fetch_one(&mut *tx)
                .await
                .unwrap_or(0)
        } else {
            sqlx::query_scalar(&visits_query)
                .bind(start_date)
                .bind(end_date)
                .fetch_one(&mut *tx)
                .await
                .unwrap_or(0)
        };

        // Visits by type
        let type_query = format!(
            r#"
            SELECT visit_type::TEXT, COUNT(*)::BIGINT as count
            FROM visits
            WHERE visit_date >= $1 AND visit_date <= $2{}
            GROUP BY visit_type
            "#,
            provider_clause
        );

        let type_rows = if let Some(provider_id) = filter.provider_id {
            sqlx::query(&type_query)
                .bind(start_date)
                .bind(end_date)
                .bind(provider_id)
                .fetch_all(&mut *tx)
                .await?
        } else {
            sqlx::query(&type_query)
                .bind(start_date)
                .bind(end_date)
                .fetch_all(&mut *tx)
                .await?
        };

        let mut visits_by_type = HashMap::new();
        for row in type_rows {
            let visit_type: String = row.try_get("visit_type").unwrap_or_default();
            let count: i64 = row.try_get("count").unwrap_or(0);
            visits_by_type.insert(visit_type, count);
        }

        // Average visits per day
        let days_in_range = (end_date - start_date).num_days().max(1) as f64;
        let avg_visits_per_day = total_visits as f64 / days_in_range;

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(RevenueReport {
            date_range,
            total_visits,
            visits_by_type,
            avg_visits_per_day,
            note: "Revenue tracking requires billing module integration. These metrics are based on visit counts.".to_string(),
        })
    }

    // ========== DASHBOARD REPORT ==========

    /// Generate dashboard overview report
    ///
    /// Provides quick stats and recent activity for the main dashboard.
    pub async fn get_dashboard_report(&self, user_id: Uuid) -> Result<DashboardReport> {
        // Start transaction for RLS context
        let mut tx = self.pool.begin().await.context("Failed to begin transaction")?;
        Self::set_rls_context(&mut tx, user_id).await?;

        let today = Utc::now().date_naive();
        let week_start = today - chrono::Duration::days(today.weekday().num_days_from_monday() as i64);
        let week_end = week_start + chrono::Duration::days(6);
        let month_start = NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap_or(today);

        // Quick stats
        let appointments_today: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM appointments WHERE scheduled_start::DATE = $1",
        )
        .bind(today)
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let appointments_this_week: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM appointments WHERE scheduled_start::DATE >= $1 AND scheduled_start::DATE <= $2",
        )
        .bind(week_start)
        .bind(week_end)
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let visits_this_week: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM visits WHERE visit_date >= $1 AND visit_date <= $2",
        )
        .bind(week_start)
        .bind(week_end)
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let pending_visits: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM visits WHERE status = 'DRAFT'",
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let active_patients: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM patients WHERE status = 'ACTIVE'",
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let active_prescriptions: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM prescriptions WHERE status = 'ACTIVE'",
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let documents_this_month: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM generated_documents WHERE created_at::DATE >= $1 AND status != 'DELETED'",
        )
        .bind(month_start)
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);

        let quick_stats = QuickStats {
            appointments_today,
            appointments_this_week,
            visits_this_week,
            pending_visits,
            active_patients,
            active_prescriptions,
            documents_this_month,
        };

        // Recent appointments (encrypted patient names - show MRN instead for now)
        let recent_appointments_rows = sqlx::query(
            r#"
            SELECT
                a.id,
                p.medical_record_number as patient_name,
                a.scheduled_start,
                a.type::TEXT as appointment_type,
                a.status::TEXT as status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            ORDER BY a.scheduled_start DESC
            LIMIT 5
            "#,
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut recent_appointments = Vec::new();
        for row in recent_appointments_rows {
            recent_appointments.push(RecentAppointment {
                id: row.try_get("id").unwrap_or_default(),
                patient_name: row.try_get("patient_name").unwrap_or_default(),
                scheduled_start: row.try_get("scheduled_start").unwrap_or_else(|_| Utc::now()),
                appointment_type: row.try_get("appointment_type").unwrap_or_default(),
                status: row.try_get("status").unwrap_or_default(),
            });
        }

        // Recent visits
        let recent_visits_rows = sqlx::query(
            r#"
            SELECT
                v.id,
                p.medical_record_number as patient_name,
                v.visit_date,
                v.visit_type::TEXT as visit_type,
                v.status::TEXT as status
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            ORDER BY v.visit_date DESC, v.created_at DESC
            LIMIT 5
            "#,
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut recent_visits = Vec::new();
        for row in recent_visits_rows {
            recent_visits.push(RecentVisit {
                id: row.try_get("id").unwrap_or_default(),
                patient_name: row.try_get("patient_name").unwrap_or_default(),
                visit_date: row.try_get("visit_date").unwrap_or(today),
                visit_type: row.try_get("visit_type").unwrap_or_default(),
                status: row.try_get("status").unwrap_or_default(),
            });
        }

        // New patients (show MRN since names are encrypted)
        let new_patients_rows = sqlx::query(
            r#"
            SELECT
                id,
                medical_record_number as name,
                created_at
            FROM patients
            ORDER BY created_at DESC
            LIMIT 5
            "#,
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut new_patients = Vec::new();
        for row in new_patients_rows {
            new_patients.push(NewPatientSummary {
                id: row.try_get("id").unwrap_or_default(),
                name: row.try_get("name").unwrap_or_default(),
                registered_at: row.try_get("created_at").unwrap_or_else(|_| Utc::now()),
            });
        }

        let recent_activity = RecentActivity {
            recent_appointments,
            recent_visits,
            new_patients,
        };

        tx.commit().await.context("Failed to commit transaction")?;

        Ok(DashboardReport {
            generated_at: Utc::now(),
            quick_stats,
            recent_activity,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_day_of_week_name() {
        assert_eq!(ReportService::day_of_week_name(0), "Sunday");
        assert_eq!(ReportService::day_of_week_name(1), "Monday");
        assert_eq!(ReportService::day_of_week_name(6), "Saturday");
        assert_eq!(ReportService::day_of_week_name(7), "Unknown");
    }

    #[test]
    fn test_month_name() {
        assert_eq!(ReportService::month_name(1), "January");
        assert_eq!(ReportService::month_name(12), "December");
        assert_eq!(ReportService::month_name(13), "Unknown");
    }

    #[test]
    fn test_icd10_category_name() {
        assert_eq!(
            ReportService::icd10_category_name("A01"),
            "Infectious and Parasitic Diseases"
        );
        assert_eq!(
            ReportService::icd10_category_name("I10"),
            "Circulatory System Diseases"
        );
        assert_eq!(
            ReportService::icd10_category_name("Z00"),
            "Factors Influencing Health Status"
        );
    }

    #[test]
    fn test_default_date_range() {
        let (start, end) = ReportService::default_date_range();
        assert!(end >= start);
        assert_eq!((end - start).num_days(), 30);
    }
}
