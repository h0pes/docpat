/*!
 * Report Export Service
 *
 * Handles exporting reports to various formats:
 * - CSV (Comma-Separated Values)
 * - PDF (Portable Document Format)
 * - Excel (XLSX)
 */

use anyhow::{Context, Result};
use chrono::Utc;

use crate::models::{
    AppointmentUtilizationReport, DiagnosisTrendsReport, ExportFormat, PatientStatisticsReport,
    ProviderProductivityReport, RevenueReport,
};

/// Export response containing the file data and metadata
#[derive(Debug)]
pub struct ExportResponse {
    /// File content as bytes
    pub data: Vec<u8>,
    /// MIME type for the response
    pub content_type: String,
    /// Suggested filename
    pub filename: String,
}

/// Report export service
pub struct ReportExportService;

impl ReportExportService {
    /// Create a new export service instance
    pub fn new() -> Self {
        Self
    }

    // ========== CSV EXPORT ==========

    /// Export appointment utilization report to CSV
    #[cfg(feature = "report-export")]
    pub fn export_appointment_report_csv(
        &self,
        report: &AppointmentUtilizationReport,
    ) -> Result<ExportResponse> {
        let mut wtr = csv::WriterBuilder::new()
            .flexible(true)
            .from_writer(vec![]);

        // Write summary section - use 2 columns consistently
        wtr.write_record(["Appointment Utilization Report", ""])
            .context("Failed to write CSV header")?;
        wtr.write_record([
            "Date Range",
            &format!(
                "{} to {}",
                report.date_range.start_date, report.date_range.end_date
            ),
        ])
        .context("Failed to write date range")?;
        wtr.write_record(["", ""])
            .context("Failed to write empty row")?;

        // Summary statistics
        wtr.write_record(["Summary Statistics", ""])
            .context("Failed to write section header")?;
        wtr.write_record(["Metric", "Value"])
            .context("Failed to write column headers")?;
        wtr.write_record(["Total Scheduled", &report.total_scheduled.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Completed", &report.completed.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Cancelled", &report.cancelled.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["No Shows", &report.no_shows.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Utilization Rate (%)", &format!("{:.2}", report.utilization_rate)])
            .context("Failed to write record")?;
        wtr.write_record(["No Show Rate (%)", &format!("{:.2}", report.no_show_rate)])
            .context("Failed to write record")?;
        wtr.write_record(["Cancellation Rate (%)", &format!("{:.2}", report.cancellation_rate)])
            .context("Failed to write record")?;
        wtr.write_record([
            "Avg Appointments/Day",
            &format!("{:.2}", report.avg_appointments_per_day),
        ])
        .context("Failed to write record")?;

        // By type breakdown
        wtr.write_record(["", ""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Appointments by Type", ""])
            .context("Failed to write section header")?;
        wtr.write_record(["Type", "Count"])
            .context("Failed to write column headers")?;
        for (appt_type, count) in &report.by_type {
            wtr.write_record([appt_type, &count.to_string()])
                .context("Failed to write record")?;
        }

        // By day of week
        wtr.write_record(["", ""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Appointments by Day of Week", ""])
            .context("Failed to write section header")?;
        wtr.write_record(["Day", "Count"])
            .context("Failed to write column headers")?;
        for day in &report.by_day_of_week {
            wtr.write_record([&day.day_name, &day.count.to_string()])
                .context("Failed to write record")?;
        }

        // By hour
        wtr.write_record(["", ""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Appointments by Hour", ""])
            .context("Failed to write section header")?;
        wtr.write_record(["Hour", "Count"])
            .context("Failed to write column headers")?;
        for hour in &report.by_hour {
            wtr.write_record([&format!("{:02}:00", hour.hour), &hour.count.to_string()])
                .context("Failed to write record")?;
        }

        // Daily trend
        wtr.write_record(["", ""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Daily Trend", "", "", "", ""])
            .context("Failed to write section header")?;
        wtr.write_record(["Date", "Scheduled", "Completed", "Cancelled", "No Shows"])
            .context("Failed to write column headers")?;
        for day in &report.daily_trend {
            wtr.write_record([
                &day.date.to_string(),
                &day.scheduled.to_string(),
                &day.completed.to_string(),
                &day.cancelled.to_string(),
                &day.no_shows.to_string(),
            ])
            .context("Failed to write record")?;
        }

        let data = wtr.into_inner().context("Failed to finalize CSV")?;
        let filename = format!(
            "appointment_report_{}.csv",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type: "text/csv".to_string(),
            filename,
        })
    }

    /// Export patient statistics report to CSV
    #[cfg(feature = "report-export")]
    pub fn export_patient_report_csv(
        &self,
        report: &PatientStatisticsReport,
    ) -> Result<ExportResponse> {
        let mut wtr = csv::WriterBuilder::new()
            .flexible(true)
            .from_writer(vec![]);

        // Write header
        wtr.write_record(["Patient Statistics Report"])
            .context("Failed to write CSV header")?;
        if let Some(ref date_range) = report.date_range {
            wtr.write_record([
                "Date Range",
                &format!("{} to {}", date_range.start_date, date_range.end_date),
            ])
            .context("Failed to write date range")?;
        }
        wtr.write_record([""])
            .context("Failed to write empty row")?;

        // Summary statistics
        wtr.write_record(["Patient Summary"])
            .context("Failed to write section header")?;
        wtr.write_record(["Metric", "Value"])
            .context("Failed to write column headers")?;
        wtr.write_record(["Total Patients", &report.total_patients.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Active Patients", &report.active_patients.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Inactive Patients", &report.inactive_patients.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Deceased Patients", &report.deceased_patients.to_string()])
            .context("Failed to write record")?;
        wtr.write_record([
            "Patients with Insurance",
            &report.patients_with_insurance.to_string(),
        ])
        .context("Failed to write record")?;
        if let Some(new_patients) = report.new_patients_in_period {
            wtr.write_record(["New Patients in Period", &new_patients.to_string()])
                .context("Failed to write record")?;
        }

        // Gender breakdown
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Gender Distribution"])
            .context("Failed to write section header")?;
        wtr.write_record(["Gender", "Count"])
            .context("Failed to write column headers")?;
        wtr.write_record(["Male", &report.by_gender.male.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Female", &report.by_gender.female.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Other", &report.by_gender.other.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Unspecified", &report.by_gender.unspecified.to_string()])
            .context("Failed to write record")?;

        // Age distribution
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Age Distribution"])
            .context("Failed to write section header")?;
        wtr.write_record(["Age Group", "Count"])
            .context("Failed to write column headers")?;
        for age_group in &report.age_distribution {
            wtr.write_record([&age_group.age_group, &age_group.count.to_string()])
                .context("Failed to write record")?;
        }

        // Monthly registrations
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Monthly Registrations"])
            .context("Failed to write section header")?;
        wtr.write_record(["Month", "Year", "Count"])
            .context("Failed to write column headers")?;
        for month in &report.monthly_registrations {
            wtr.write_record([
                &month.month_name,
                &month.year.to_string(),
                &month.count.to_string(),
            ])
            .context("Failed to write record")?;
        }

        let data = wtr.into_inner().context("Failed to finalize CSV")?;
        let filename = format!(
            "patient_report_{}.csv",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type: "text/csv".to_string(),
            filename,
        })
    }

    /// Export diagnosis trends report to CSV
    #[cfg(feature = "report-export")]
    pub fn export_diagnosis_report_csv(
        &self,
        report: &DiagnosisTrendsReport,
    ) -> Result<ExportResponse> {
        let mut wtr = csv::WriterBuilder::new()
            .flexible(true)
            .from_writer(vec![]);

        // Write header
        wtr.write_record(["Diagnosis Trends Report"])
            .context("Failed to write CSV header")?;
        if let Some(ref date_range) = report.date_range {
            wtr.write_record([
                "Date Range",
                &format!("{} to {}", date_range.start_date, date_range.end_date),
            ])
            .context("Failed to write date range")?;
        }
        wtr.write_record([""])
            .context("Failed to write empty row")?;

        // Summary
        wtr.write_record(["Summary"])
            .context("Failed to write section header")?;
        wtr.write_record(["Metric", "Value"])
            .context("Failed to write column headers")?;
        wtr.write_record(["Total Diagnoses", &report.total_diagnoses.to_string()])
            .context("Failed to write record")?;
        wtr.write_record(["Unique ICD-10 Codes", &report.unique_codes.to_string()])
            .context("Failed to write record")?;

        // Top diagnoses
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Top Diagnoses"])
            .context("Failed to write section header")?;
        wtr.write_record(["ICD-10 Code", "Description", "Count", "Percentage"])
            .context("Failed to write column headers")?;
        for diag in &report.top_diagnoses {
            wtr.write_record([
                &diag.icd10_code,
                &diag.description,
                &diag.count.to_string(),
                &format!("{:.2}%", diag.percentage),
            ])
            .context("Failed to write record")?;
        }

        // By category
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Diagnoses by ICD-10 Category"])
            .context("Failed to write section header")?;
        wtr.write_record(["Category", "Category Name", "Count"])
            .context("Failed to write column headers")?;
        for cat in &report.by_category {
            wtr.write_record([&cat.category, &cat.category_name, &cat.count.to_string()])
                .context("Failed to write record")?;
        }

        // Monthly trend
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Monthly Trend"])
            .context("Failed to write section header")?;
        wtr.write_record(["Month", "Year", "Count"])
            .context("Failed to write column headers")?;
        for month in &report.monthly_trend {
            wtr.write_record([
                &month.month_name,
                &month.year.to_string(),
                &month.count.to_string(),
            ])
            .context("Failed to write record")?;
        }

        let data = wtr.into_inner().context("Failed to finalize CSV")?;
        let filename = format!(
            "diagnosis_report_{}.csv",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type: "text/csv".to_string(),
            filename,
        })
    }

    /// Export provider productivity report to CSV
    #[cfg(feature = "report-export")]
    pub fn export_productivity_report_csv(
        &self,
        report: &ProviderProductivityReport,
    ) -> Result<ExportResponse> {
        let mut wtr = csv::WriterBuilder::new()
            .flexible(true)
            .from_writer(vec![]);

        // Write header
        wtr.write_record(["Provider Productivity Report"])
            .context("Failed to write CSV header")?;
        if let Some(ref date_range) = report.date_range {
            wtr.write_record([
                "Date Range",
                &format!("{} to {}", date_range.start_date, date_range.end_date),
            ])
            .context("Failed to write date range")?;
        }
        wtr.write_record([""])
            .context("Failed to write empty row")?;

        // Summary
        wtr.write_record(["Overall Summary"])
            .context("Failed to write section header")?;
        wtr.write_record(["Metric", "Value"])
            .context("Failed to write column headers")?;
        wtr.write_record([
            "Total Appointments",
            &report.summary.total_appointments.to_string(),
        ])
        .context("Failed to write record")?;
        wtr.write_record([
            "Completed Appointments",
            &report.summary.completed_appointments.to_string(),
        ])
        .context("Failed to write record")?;
        wtr.write_record(["Total Visits", &report.summary.total_visits.to_string()])
            .context("Failed to write record")?;
        wtr.write_record([
            "Total Prescriptions",
            &report.summary.total_prescriptions.to_string(),
        ])
        .context("Failed to write record")?;
        wtr.write_record([
            "Total Documents",
            &report.summary.total_documents.to_string(),
        ])
        .context("Failed to write record")?;
        wtr.write_record([
            "Avg Appointment Duration (min)",
            &format!("{:.1}", report.summary.avg_appointment_duration),
        ])
        .context("Failed to write record")?;

        // Provider breakdown
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Provider Details"])
            .context("Failed to write section header")?;
        wtr.write_record([
            "Provider Name",
            "Role",
            "Appointments Completed",
            "Visits Documented",
            "Prescriptions Written",
            "Documents Generated",
            "Unique Patients",
            "Avg Visits/Day",
            "Completion Rate (%)",
        ])
        .context("Failed to write column headers")?;
        for provider in &report.by_provider {
            wtr.write_record([
                &provider.provider_name,
                &provider.provider_role,
                &provider.appointments_completed.to_string(),
                &provider.visits_documented.to_string(),
                &provider.prescriptions_written.to_string(),
                &provider.documents_generated.to_string(),
                &provider.unique_patients_seen.to_string(),
                &format!("{:.2}", provider.avg_visits_per_day),
                &format!("{:.1}", provider.completion_rate),
            ])
            .context("Failed to write record")?;
        }

        let data = wtr.into_inner().context("Failed to finalize CSV")?;
        let filename = format!(
            "productivity_report_{}.csv",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type: "text/csv".to_string(),
            filename,
        })
    }

    /// Export revenue report to CSV
    #[cfg(feature = "report-export")]
    pub fn export_revenue_report_csv(&self, report: &RevenueReport) -> Result<ExportResponse> {
        let mut wtr = csv::WriterBuilder::new()
            .flexible(true)
            .from_writer(vec![]);

        // Write header
        wtr.write_record(["Revenue Report"])
            .context("Failed to write CSV header")?;
        if let Some(ref date_range) = report.date_range {
            wtr.write_record([
                "Date Range",
                &format!("{} to {}", date_range.start_date, date_range.end_date),
            ])
            .context("Failed to write date range")?;
        }
        wtr.write_record([""])
            .context("Failed to write empty row")?;

        // Note
        wtr.write_record(["Note", &report.note])
            .context("Failed to write note")?;
        wtr.write_record([""])
            .context("Failed to write empty row")?;

        // Summary
        wtr.write_record(["Summary"])
            .context("Failed to write section header")?;
        wtr.write_record(["Metric", "Value"])
            .context("Failed to write column headers")?;
        wtr.write_record(["Total Visits", &report.total_visits.to_string()])
            .context("Failed to write record")?;
        wtr.write_record([
            "Avg Visits/Day",
            &format!("{:.2}", report.avg_visits_per_day),
        ])
        .context("Failed to write record")?;

        // Visits by type
        wtr.write_record([""])
            .context("Failed to write empty row")?;
        wtr.write_record(["Visits by Type"])
            .context("Failed to write section header")?;
        wtr.write_record(["Type", "Count"])
            .context("Failed to write column headers")?;
        for (visit_type, count) in &report.visits_by_type {
            wtr.write_record([visit_type, &count.to_string()])
                .context("Failed to write record")?;
        }

        let data = wtr.into_inner().context("Failed to finalize CSV")?;
        let filename = format!(
            "revenue_report_{}.csv",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type: "text/csv".to_string(),
            filename,
        })
    }

    // ========== EXCEL EXPORT ==========

    /// Export appointment utilization report to Excel
    #[cfg(feature = "report-export")]
    pub fn export_appointment_report_excel(
        &self,
        report: &AppointmentUtilizationReport,
    ) -> Result<ExportResponse> {
        use rust_xlsxwriter::{Format, Workbook};

        let mut workbook = Workbook::new();

        // Create formats
        let header_format = Format::new().set_bold();
        let title_format = Format::new().set_bold().set_font_size(14);
        let percent_format = Format::new().set_num_format("0.00%");

        // Add worksheet and get its index
        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Appointment Report")?;

        // Title
        let mut row = 0u32;
        worksheet.write_with_format(row, 0, "Appointment Utilization Report", &title_format)?;
        row += 1;
        worksheet.write(
            row,
            0,
            format!(
                "Date Range: {} to {}",
                report.date_range.start_date, report.date_range.end_date
            ),
        )?;
        row += 2;

        // Summary section
        worksheet.write_with_format(row, 0, "Summary Statistics", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Metric", &header_format)?;
        worksheet.write_with_format(row, 1, "Value", &header_format)?;
        row += 1;

        worksheet.write(row, 0, "Total Scheduled")?;
        worksheet.write(row, 1, report.total_scheduled as f64)?;
        row += 1;
        worksheet.write(row, 0, "Completed")?;
        worksheet.write(row, 1, report.completed as f64)?;
        row += 1;
        worksheet.write(row, 0, "Cancelled")?;
        worksheet.write(row, 1, report.cancelled as f64)?;
        row += 1;
        worksheet.write(row, 0, "No Shows")?;
        worksheet.write(row, 1, report.no_shows as f64)?;
        row += 1;
        worksheet.write(row, 0, "Utilization Rate")?;
        worksheet.write_with_format(row, 1, report.utilization_rate / 100.0, &percent_format)?;
        row += 1;
        worksheet.write(row, 0, "No Show Rate")?;
        worksheet.write_with_format(row, 1, report.no_show_rate / 100.0, &percent_format)?;
        row += 1;
        worksheet.write(row, 0, "Cancellation Rate")?;
        worksheet.write_with_format(row, 1, report.cancellation_rate / 100.0, &percent_format)?;
        row += 1;
        worksheet.write(row, 0, "Avg Appointments/Day")?;
        worksheet.write(row, 1, report.avg_appointments_per_day)?;
        row += 2;

        // By type
        worksheet.write_with_format(row, 0, "Appointments by Type", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Type", &header_format)?;
        worksheet.write_with_format(row, 1, "Count", &header_format)?;
        row += 1;
        for (appt_type, count) in &report.by_type {
            worksheet.write(row, 0, appt_type)?;
            worksheet.write(row, 1, *count as f64)?;
            row += 1;
        }
        row += 1;

        // By day of week
        worksheet.write_with_format(row, 0, "Appointments by Day of Week", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Day", &header_format)?;
        worksheet.write_with_format(row, 1, "Count", &header_format)?;
        row += 1;
        for day in &report.by_day_of_week {
            worksheet.write(row, 0, &day.day_name)?;
            worksheet.write(row, 1, day.count as f64)?;
            row += 1;
        }
        row += 1;

        // By hour
        worksheet.write_with_format(row, 0, "Appointments by Hour", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Hour", &header_format)?;
        worksheet.write_with_format(row, 1, "Count", &header_format)?;
        row += 1;
        for hour in &report.by_hour {
            worksheet.write(row, 0, format!("{:02}:00", hour.hour))?;
            worksheet.write(row, 1, hour.count as f64)?;
            row += 1;
        }
        row += 1;

        // Daily trend (in the same sheet)
        worksheet.write_with_format(row, 0, "Daily Trend", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Date", &header_format)?;
        worksheet.write_with_format(row, 1, "Scheduled", &header_format)?;
        worksheet.write_with_format(row, 2, "Completed", &header_format)?;
        worksheet.write_with_format(row, 3, "Cancelled", &header_format)?;
        worksheet.write_with_format(row, 4, "No Shows", &header_format)?;
        row += 1;

        for day in &report.daily_trend {
            worksheet.write(row, 0, day.date.to_string())?;
            worksheet.write(row, 1, day.scheduled as f64)?;
            worksheet.write(row, 2, day.completed as f64)?;
            worksheet.write(row, 3, day.cancelled as f64)?;
            worksheet.write(row, 4, day.no_shows as f64)?;
            row += 1;
        }

        // Auto-fit columns
        worksheet.set_column_width(0, 25)?;
        worksheet.set_column_width(1, 15)?;

        let data = workbook.save_to_buffer()?;
        let filename = format!(
            "appointment_report_{}.xlsx",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            filename,
        })
    }

    /// Export patient statistics report to Excel
    #[cfg(feature = "report-export")]
    pub fn export_patient_report_excel(
        &self,
        report: &PatientStatisticsReport,
    ) -> Result<ExportResponse> {
        use rust_xlsxwriter::{Format, Workbook};

        let mut workbook = Workbook::new();
        let header_format = Format::new().set_bold();
        let title_format = Format::new().set_bold().set_font_size(14);

        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Patient Statistics")?;

        let mut row = 0u32;
        worksheet.write_with_format(row, 0, "Patient Statistics Report", &title_format)?;
        row += 1;
        if let Some(ref date_range) = report.date_range {
            worksheet.write(
                row,
                0,
                format!(
                    "Date Range: {} to {}",
                    date_range.start_date, date_range.end_date
                ),
            )?;
            row += 1;
        }
        row += 1;

        // Summary
        worksheet.write_with_format(row, 0, "Patient Summary", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Metric", &header_format)?;
        worksheet.write_with_format(row, 1, "Value", &header_format)?;
        row += 1;

        worksheet.write(row, 0, "Total Patients")?;
        worksheet.write(row, 1, report.total_patients as f64)?;
        row += 1;
        worksheet.write(row, 0, "Active Patients")?;
        worksheet.write(row, 1, report.active_patients as f64)?;
        row += 1;
        worksheet.write(row, 0, "Inactive Patients")?;
        worksheet.write(row, 1, report.inactive_patients as f64)?;
        row += 1;
        worksheet.write(row, 0, "Deceased Patients")?;
        worksheet.write(row, 1, report.deceased_patients as f64)?;
        row += 1;
        worksheet.write(row, 0, "Patients with Insurance")?;
        worksheet.write(row, 1, report.patients_with_insurance as f64)?;
        row += 1;
        if let Some(new_patients) = report.new_patients_in_period {
            worksheet.write(row, 0, "New Patients in Period")?;
            worksheet.write(row, 1, new_patients as f64)?;
            row += 1;
        }
        row += 1;

        // Gender breakdown
        worksheet.write_with_format(row, 0, "Gender Distribution", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Gender", &header_format)?;
        worksheet.write_with_format(row, 1, "Count", &header_format)?;
        row += 1;
        worksheet.write(row, 0, "Male")?;
        worksheet.write(row, 1, report.by_gender.male as f64)?;
        row += 1;
        worksheet.write(row, 0, "Female")?;
        worksheet.write(row, 1, report.by_gender.female as f64)?;
        row += 1;
        worksheet.write(row, 0, "Other")?;
        worksheet.write(row, 1, report.by_gender.other as f64)?;
        row += 1;
        worksheet.write(row, 0, "Unspecified")?;
        worksheet.write(row, 1, report.by_gender.unspecified as f64)?;
        row += 2;

        // Age distribution
        worksheet.write_with_format(row, 0, "Age Distribution", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Age Group", &header_format)?;
        worksheet.write_with_format(row, 1, "Count", &header_format)?;
        row += 1;
        for age in &report.age_distribution {
            worksheet.write(row, 0, &age.age_group)?;
            worksheet.write(row, 1, age.count as f64)?;
            row += 1;
        }
        row += 1;

        // Monthly registrations
        worksheet.write_with_format(row, 0, "Monthly Registrations", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Month", &header_format)?;
        worksheet.write_with_format(row, 1, "Year", &header_format)?;
        worksheet.write_with_format(row, 2, "Count", &header_format)?;
        row += 1;
        for month in &report.monthly_registrations {
            worksheet.write(row, 0, &month.month_name)?;
            worksheet.write(row, 1, month.year as f64)?;
            worksheet.write(row, 2, month.count as f64)?;
            row += 1;
        }

        worksheet.set_column_width(0, 25)?;
        worksheet.set_column_width(1, 15)?;

        let data = workbook.save_to_buffer()?;
        let filename = format!(
            "patient_report_{}.xlsx",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            filename,
        })
    }

    /// Export diagnosis trends report to Excel
    #[cfg(feature = "report-export")]
    pub fn export_diagnosis_report_excel(
        &self,
        report: &DiagnosisTrendsReport,
    ) -> Result<ExportResponse> {
        use rust_xlsxwriter::{Format, Workbook};

        let mut workbook = Workbook::new();
        let header_format = Format::new().set_bold();
        let title_format = Format::new().set_bold().set_font_size(14);
        let percent_format = Format::new().set_num_format("0.00%");

        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Diagnosis Trends")?;

        let mut row = 0u32;
        worksheet.write_with_format(row, 0, "Diagnosis Trends Report", &title_format)?;
        row += 1;
        if let Some(ref date_range) = report.date_range {
            worksheet.write(
                row,
                0,
                format!(
                    "Date Range: {} to {}",
                    date_range.start_date, date_range.end_date
                ),
            )?;
            row += 1;
        }
        row += 1;

        // Summary
        worksheet.write_with_format(row, 0, "Summary", &header_format)?;
        row += 1;
        worksheet.write(row, 0, "Total Diagnoses")?;
        worksheet.write(row, 1, report.total_diagnoses as f64)?;
        row += 1;
        worksheet.write(row, 0, "Unique ICD-10 Codes")?;
        worksheet.write(row, 1, report.unique_codes as f64)?;
        row += 2;

        // Top diagnoses
        worksheet.write_with_format(row, 0, "Top Diagnoses", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "ICD-10 Code", &header_format)?;
        worksheet.write_with_format(row, 1, "Description", &header_format)?;
        worksheet.write_with_format(row, 2, "Count", &header_format)?;
        worksheet.write_with_format(row, 3, "Percentage", &header_format)?;
        row += 1;
        for diag in &report.top_diagnoses {
            worksheet.write(row, 0, &diag.icd10_code)?;
            worksheet.write(row, 1, &diag.description)?;
            worksheet.write(row, 2, diag.count as f64)?;
            worksheet.write_with_format(row, 3, diag.percentage / 100.0, &percent_format)?;
            row += 1;
        }
        row += 1;

        // By category
        worksheet.write_with_format(row, 0, "By ICD-10 Category", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Category", &header_format)?;
        worksheet.write_with_format(row, 1, "Category Name", &header_format)?;
        worksheet.write_with_format(row, 2, "Count", &header_format)?;
        row += 1;
        for cat in &report.by_category {
            worksheet.write(row, 0, &cat.category)?;
            worksheet.write(row, 1, &cat.category_name)?;
            worksheet.write(row, 2, cat.count as f64)?;
            row += 1;
        }
        row += 1;

        // Monthly trend
        worksheet.write_with_format(row, 0, "Monthly Trend", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Month", &header_format)?;
        worksheet.write_with_format(row, 1, "Year", &header_format)?;
        worksheet.write_with_format(row, 2, "Count", &header_format)?;
        row += 1;
        for month in &report.monthly_trend {
            worksheet.write(row, 0, &month.month_name)?;
            worksheet.write(row, 1, month.year as f64)?;
            worksheet.write(row, 2, month.count as f64)?;
            row += 1;
        }

        worksheet.set_column_width(0, 15)?;
        worksheet.set_column_width(1, 40)?;
        worksheet.set_column_width(2, 10)?;
        worksheet.set_column_width(3, 12)?;

        let data = workbook.save_to_buffer()?;
        let filename = format!(
            "diagnosis_report_{}.xlsx",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            filename,
        })
    }

    /// Export productivity report to Excel
    #[cfg(feature = "report-export")]
    pub fn export_productivity_report_excel(
        &self,
        report: &ProviderProductivityReport,
    ) -> Result<ExportResponse> {
        use rust_xlsxwriter::{Format, Workbook};

        let mut workbook = Workbook::new();
        let header_format = Format::new().set_bold();
        let title_format = Format::new().set_bold().set_font_size(14);
        let percent_format = Format::new().set_num_format("0.0%");

        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Productivity")?;

        let mut row = 0u32;
        worksheet.write_with_format(row, 0, "Provider Productivity Report", &title_format)?;
        row += 1;
        if let Some(ref date_range) = report.date_range {
            worksheet.write(
                row,
                0,
                format!(
                    "Date Range: {} to {}",
                    date_range.start_date, date_range.end_date
                ),
            )?;
            row += 1;
        }
        row += 1;

        // Summary
        worksheet.write_with_format(row, 0, "Overall Summary", &header_format)?;
        row += 1;
        worksheet.write(row, 0, "Total Appointments")?;
        worksheet.write(row, 1, report.summary.total_appointments as f64)?;
        row += 1;
        worksheet.write(row, 0, "Completed Appointments")?;
        worksheet.write(row, 1, report.summary.completed_appointments as f64)?;
        row += 1;
        worksheet.write(row, 0, "Total Visits")?;
        worksheet.write(row, 1, report.summary.total_visits as f64)?;
        row += 1;
        worksheet.write(row, 0, "Total Prescriptions")?;
        worksheet.write(row, 1, report.summary.total_prescriptions as f64)?;
        row += 1;
        worksheet.write(row, 0, "Total Documents")?;
        worksheet.write(row, 1, report.summary.total_documents as f64)?;
        row += 1;
        worksheet.write(row, 0, "Avg Appointment Duration (min)")?;
        worksheet.write(row, 1, report.summary.avg_appointment_duration)?;
        row += 2;

        // Provider details
        worksheet.write_with_format(row, 0, "Provider Details", &header_format)?;
        row += 1;
        let headers = [
            "Provider Name",
            "Role",
            "Appointments",
            "Visits",
            "Prescriptions",
            "Documents",
            "Unique Patients",
            "Avg Visits/Day",
            "Completion Rate",
        ];
        for (col, header) in headers.iter().enumerate() {
            worksheet.write_with_format(row, col as u16, *header, &header_format)?;
        }
        row += 1;

        for provider in &report.by_provider {
            worksheet.write(row, 0, &provider.provider_name)?;
            worksheet.write(row, 1, &provider.provider_role)?;
            worksheet.write(row, 2, provider.appointments_completed as f64)?;
            worksheet.write(row, 3, provider.visits_documented as f64)?;
            worksheet.write(row, 4, provider.prescriptions_written as f64)?;
            worksheet.write(row, 5, provider.documents_generated as f64)?;
            worksheet.write(row, 6, provider.unique_patients_seen as f64)?;
            worksheet.write(row, 7, provider.avg_visits_per_day)?;
            worksheet.write_with_format(row, 8, provider.completion_rate / 100.0, &percent_format)?;
            row += 1;
        }

        worksheet.set_column_width(0, 20)?;
        worksheet.set_column_width(1, 10)?;

        let data = workbook.save_to_buffer()?;
        let filename = format!(
            "productivity_report_{}.xlsx",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            filename,
        })
    }

    /// Export revenue report to Excel
    #[cfg(feature = "report-export")]
    pub fn export_revenue_report_excel(&self, report: &RevenueReport) -> Result<ExportResponse> {
        use rust_xlsxwriter::{Format, Workbook};

        let mut workbook = Workbook::new();
        let header_format = Format::new().set_bold();
        let title_format = Format::new().set_bold().set_font_size(14);

        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Revenue")?;

        let mut row = 0u32;
        worksheet.write_with_format(row, 0, "Revenue Report", &title_format)?;
        row += 1;
        if let Some(ref date_range) = report.date_range {
            worksheet.write(
                row,
                0,
                format!(
                    "Date Range: {} to {}",
                    date_range.start_date, date_range.end_date
                ),
            )?;
            row += 1;
        }
        row += 1;

        // Note
        worksheet.write(row, 0, "Note:")?;
        worksheet.write(row, 1, &report.note)?;
        row += 2;

        // Summary
        worksheet.write_with_format(row, 0, "Summary", &header_format)?;
        row += 1;
        worksheet.write(row, 0, "Total Visits")?;
        worksheet.write(row, 1, report.total_visits as f64)?;
        row += 1;
        worksheet.write(row, 0, "Avg Visits/Day")?;
        worksheet.write(row, 1, report.avg_visits_per_day)?;
        row += 2;

        // By type
        worksheet.write_with_format(row, 0, "Visits by Type", &header_format)?;
        row += 1;
        worksheet.write_with_format(row, 0, "Type", &header_format)?;
        worksheet.write_with_format(row, 1, "Count", &header_format)?;
        row += 1;
        for (visit_type, count) in &report.visits_by_type {
            worksheet.write(row, 0, visit_type)?;
            worksheet.write(row, 1, *count as f64)?;
            row += 1;
        }

        worksheet.set_column_width(0, 20)?;
        worksheet.set_column_width(1, 50)?;

        let data = workbook.save_to_buffer()?;
        let filename = format!(
            "revenue_report_{}.xlsx",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data,
            content_type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            filename,
        })
    }

    // ========== PDF EXPORT ==========

    /// Export appointment utilization report to PDF
    #[cfg(feature = "report-export")]
    pub fn export_appointment_report_pdf(
        &self,
        report: &AppointmentUtilizationReport,
    ) -> Result<ExportResponse> {
        use genpdf::{
            elements::{Break, Paragraph, TableLayout},
            fonts, Document, Element, SimplePageDecorator,
        };

        // Load built-in font
        let font_family = fonts::from_files("./assets/fonts", "LiberationSans", None)
            .or_else(|_| fonts::from_files("/usr/share/fonts/liberation", "LiberationSans", None))
            .or_else(|_| {
                fonts::from_files("/usr/share/fonts/truetype/dejavu", "DejaVuSans", None)
            })
            .context("No suitable fonts found for PDF generation")?;

        let mut doc = Document::new(font_family);
        doc.set_title("Appointment Utilization Report");
        doc.set_page_decorator(SimplePageDecorator::new());

        // Title
        doc.push(
            Paragraph::new("Appointment Utilization Report")
                .styled(genpdf::style::Style::new().bold().with_font_size(16)),
        );
        doc.push(Paragraph::new(format!(
            "Date Range: {} to {}",
            report.date_range.start_date, report.date_range.end_date
        )));
        doc.push(Break::new(1));

        // Summary table
        doc.push(
            Paragraph::new("Summary Statistics")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );

        let mut summary_table = TableLayout::new(vec![1, 1]);
        summary_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
            true, true, true,
        ));

        summary_table
            .row()
            .element(Paragraph::new("Metric").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Value").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Total Scheduled"))
            .element(Paragraph::new(report.total_scheduled.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Completed"))
            .element(Paragraph::new(report.completed.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Cancelled"))
            .element(Paragraph::new(report.cancelled.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("No Shows"))
            .element(Paragraph::new(report.no_shows.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Utilization Rate"))
            .element(Paragraph::new(format!("{:.2}%", report.utilization_rate)))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("No Show Rate"))
            .element(Paragraph::new(format!("{:.2}%", report.no_show_rate)))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Cancellation Rate"))
            .element(Paragraph::new(format!("{:.2}%", report.cancellation_rate)))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Avg Appointments/Day"))
            .element(Paragraph::new(format!(
                "{:.2}",
                report.avg_appointments_per_day
            )))
            .push()
            .expect("Failed to push row");

        doc.push(summary_table);
        doc.push(Break::new(1));

        // By type
        doc.push(
            Paragraph::new("Appointments by Type")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut type_table = TableLayout::new(vec![1, 1]);
        type_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(true, true, true));
        type_table
            .row()
            .element(Paragraph::new("Type").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Count").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");
        for (appt_type, count) in &report.by_type {
            type_table
                .row()
                .element(Paragraph::new(appt_type))
                .element(Paragraph::new(count.to_string()))
                .push()
                .expect("Failed to push row");
        }
        doc.push(type_table);

        // Render to buffer
        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .context("Failed to render PDF")?;

        let filename = format!(
            "appointment_report_{}.pdf",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data: buffer,
            content_type: "application/pdf".to_string(),
            filename,
        })
    }

    /// Export patient statistics report to PDF
    #[cfg(feature = "report-export")]
    pub fn export_patient_report_pdf(
        &self,
        report: &PatientStatisticsReport,
    ) -> Result<ExportResponse> {
        use genpdf::{
            elements::{Break, Paragraph, TableLayout},
            fonts, Document, Element, SimplePageDecorator,
        };

        let font_family = fonts::from_files("./assets/fonts", "LiberationSans", None)
            .or_else(|_| fonts::from_files("/usr/share/fonts/liberation", "LiberationSans", None))
            .or_else(|_| {
                fonts::from_files("/usr/share/fonts/truetype/dejavu", "DejaVuSans", None)
            })
            .context("No suitable fonts found for PDF generation")?;

        let mut doc = Document::new(font_family);
        doc.set_title("Patient Statistics Report");
        doc.set_page_decorator(SimplePageDecorator::new());

        doc.push(
            Paragraph::new("Patient Statistics Report")
                .styled(genpdf::style::Style::new().bold().with_font_size(16)),
        );
        if let Some(ref date_range) = report.date_range {
            doc.push(Paragraph::new(format!(
                "Date Range: {} to {}",
                date_range.start_date, date_range.end_date
            )));
        }
        doc.push(Break::new(1));

        // Summary
        doc.push(
            Paragraph::new("Patient Summary")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut summary_table = TableLayout::new(vec![1, 1]);
        summary_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
            true, true, true,
        ));
        summary_table
            .row()
            .element(Paragraph::new("Metric").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Value").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Total Patients"))
            .element(Paragraph::new(report.total_patients.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Active Patients"))
            .element(Paragraph::new(report.active_patients.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Inactive Patients"))
            .element(Paragraph::new(report.inactive_patients.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Patients with Insurance"))
            .element(Paragraph::new(report.patients_with_insurance.to_string()))
            .push()
            .expect("Failed to push row");
        doc.push(summary_table);
        doc.push(Break::new(1));

        // Gender breakdown
        doc.push(
            Paragraph::new("Gender Distribution")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut gender_table = TableLayout::new(vec![1, 1]);
        gender_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
            true, true, true,
        ));
        gender_table
            .row()
            .element(Paragraph::new("Gender").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Count").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");
        gender_table
            .row()
            .element(Paragraph::new("Male"))
            .element(Paragraph::new(report.by_gender.male.to_string()))
            .push()
            .expect("Failed to push row");
        gender_table
            .row()
            .element(Paragraph::new("Female"))
            .element(Paragraph::new(report.by_gender.female.to_string()))
            .push()
            .expect("Failed to push row");
        gender_table
            .row()
            .element(Paragraph::new("Other"))
            .element(Paragraph::new(report.by_gender.other.to_string()))
            .push()
            .expect("Failed to push row");
        gender_table
            .row()
            .element(Paragraph::new("Unspecified"))
            .element(Paragraph::new(report.by_gender.unspecified.to_string()))
            .push()
            .expect("Failed to push row");
        doc.push(gender_table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .context("Failed to render PDF")?;

        let filename = format!(
            "patient_report_{}.pdf",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data: buffer,
            content_type: "application/pdf".to_string(),
            filename,
        })
    }

    /// Export diagnosis trends report to PDF
    #[cfg(feature = "report-export")]
    pub fn export_diagnosis_report_pdf(
        &self,
        report: &DiagnosisTrendsReport,
    ) -> Result<ExportResponse> {
        use genpdf::{
            elements::{Break, Paragraph, TableLayout},
            fonts, Document, Element, SimplePageDecorator,
        };

        let font_family = fonts::from_files("./assets/fonts", "LiberationSans", None)
            .or_else(|_| fonts::from_files("/usr/share/fonts/liberation", "LiberationSans", None))
            .or_else(|_| {
                fonts::from_files("/usr/share/fonts/truetype/dejavu", "DejaVuSans", None)
            })
            .context("No suitable fonts found for PDF generation")?;

        let mut doc = Document::new(font_family);
        doc.set_title("Diagnosis Trends Report");
        doc.set_page_decorator(SimplePageDecorator::new());

        doc.push(
            Paragraph::new("Diagnosis Trends Report")
                .styled(genpdf::style::Style::new().bold().with_font_size(16)),
        );
        if let Some(ref date_range) = report.date_range {
            doc.push(Paragraph::new(format!(
                "Date Range: {} to {}",
                date_range.start_date, date_range.end_date
            )));
        }
        doc.push(Break::new(1));

        // Summary
        doc.push(Paragraph::new(format!(
            "Total Diagnoses: {}",
            report.total_diagnoses
        )));
        doc.push(Paragraph::new(format!(
            "Unique ICD-10 Codes: {}",
            report.unique_codes
        )));
        doc.push(Break::new(1));

        // Top diagnoses
        doc.push(
            Paragraph::new("Top Diagnoses")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut diag_table = TableLayout::new(vec![1, 2, 1, 1]);
        diag_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(true, true, true));
        diag_table
            .row()
            .element(Paragraph::new("ICD-10").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Description").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Count").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("%").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");

        for diag in report.top_diagnoses.iter().take(15) {
            diag_table
                .row()
                .element(Paragraph::new(&diag.icd10_code))
                .element(Paragraph::new(&diag.description))
                .element(Paragraph::new(diag.count.to_string()))
                .element(Paragraph::new(format!("{:.1}%", diag.percentage)))
                .push()
                .expect("Failed to push row");
        }
        doc.push(diag_table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .context("Failed to render PDF")?;

        let filename = format!(
            "diagnosis_report_{}.pdf",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data: buffer,
            content_type: "application/pdf".to_string(),
            filename,
        })
    }

    /// Export productivity report to PDF
    #[cfg(feature = "report-export")]
    pub fn export_productivity_report_pdf(
        &self,
        report: &ProviderProductivityReport,
    ) -> Result<ExportResponse> {
        use genpdf::{
            elements::{Break, Paragraph, TableLayout},
            fonts, Document, Element, SimplePageDecorator,
        };

        let font_family = fonts::from_files("./assets/fonts", "LiberationSans", None)
            .or_else(|_| fonts::from_files("/usr/share/fonts/liberation", "LiberationSans", None))
            .or_else(|_| {
                fonts::from_files("/usr/share/fonts/truetype/dejavu", "DejaVuSans", None)
            })
            .context("No suitable fonts found for PDF generation")?;

        let mut doc = Document::new(font_family);
        doc.set_title("Provider Productivity Report");
        doc.set_page_decorator(SimplePageDecorator::new());

        doc.push(
            Paragraph::new("Provider Productivity Report")
                .styled(genpdf::style::Style::new().bold().with_font_size(16)),
        );
        if let Some(ref date_range) = report.date_range {
            doc.push(Paragraph::new(format!(
                "Date Range: {} to {}",
                date_range.start_date, date_range.end_date
            )));
        }
        doc.push(Break::new(1));

        // Summary
        doc.push(
            Paragraph::new("Overall Summary")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut summary_table = TableLayout::new(vec![1, 1]);
        summary_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
            true, true, true,
        ));
        summary_table
            .row()
            .element(Paragraph::new("Metric").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Value").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Total Appointments"))
            .element(Paragraph::new(report.summary.total_appointments.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Completed Appointments"))
            .element(Paragraph::new(
                report.summary.completed_appointments.to_string(),
            ))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Total Visits"))
            .element(Paragraph::new(report.summary.total_visits.to_string()))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Total Prescriptions"))
            .element(Paragraph::new(
                report.summary.total_prescriptions.to_string(),
            ))
            .push()
            .expect("Failed to push row");
        summary_table
            .row()
            .element(Paragraph::new("Total Documents"))
            .element(Paragraph::new(report.summary.total_documents.to_string()))
            .push()
            .expect("Failed to push row");
        doc.push(summary_table);
        doc.push(Break::new(1));

        // Provider details
        doc.push(
            Paragraph::new("Provider Details")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut provider_table = TableLayout::new(vec![2, 1, 1, 1, 1]);
        provider_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
            true, true, true,
        ));
        provider_table
            .row()
            .element(Paragraph::new("Provider").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Appts").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Visits").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Rx").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Patients").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");

        for provider in &report.by_provider {
            provider_table
                .row()
                .element(Paragraph::new(&provider.provider_name))
                .element(Paragraph::new(provider.appointments_completed.to_string()))
                .element(Paragraph::new(provider.visits_documented.to_string()))
                .element(Paragraph::new(provider.prescriptions_written.to_string()))
                .element(Paragraph::new(provider.unique_patients_seen.to_string()))
                .push()
                .expect("Failed to push row");
        }
        doc.push(provider_table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .context("Failed to render PDF")?;

        let filename = format!(
            "productivity_report_{}.pdf",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data: buffer,
            content_type: "application/pdf".to_string(),
            filename,
        })
    }

    /// Export revenue report to PDF
    #[cfg(feature = "report-export")]
    pub fn export_revenue_report_pdf(&self, report: &RevenueReport) -> Result<ExportResponse> {
        use genpdf::{
            elements::{Break, Paragraph, TableLayout},
            fonts, Document, Element, SimplePageDecorator,
        };

        let font_family = fonts::from_files("./assets/fonts", "LiberationSans", None)
            .or_else(|_| fonts::from_files("/usr/share/fonts/liberation", "LiberationSans", None))
            .or_else(|_| {
                fonts::from_files("/usr/share/fonts/truetype/dejavu", "DejaVuSans", None)
            })
            .context("No suitable fonts found for PDF generation")?;

        let mut doc = Document::new(font_family);
        doc.set_title("Revenue Report");
        doc.set_page_decorator(SimplePageDecorator::new());

        doc.push(
            Paragraph::new("Revenue Report")
                .styled(genpdf::style::Style::new().bold().with_font_size(16)),
        );
        if let Some(ref date_range) = report.date_range {
            doc.push(Paragraph::new(format!(
                "Date Range: {} to {}",
                date_range.start_date, date_range.end_date
            )));
        }
        doc.push(Break::new(1));

        doc.push(Paragraph::new(format!("Note: {}", report.note)));
        doc.push(Break::new(1));

        doc.push(Paragraph::new(format!(
            "Total Visits: {}",
            report.total_visits
        )));
        doc.push(Paragraph::new(format!(
            "Avg Visits/Day: {:.2}",
            report.avg_visits_per_day
        )));
        doc.push(Break::new(1));

        // Visits by type
        doc.push(
            Paragraph::new("Visits by Type")
                .styled(genpdf::style::Style::new().bold().with_font_size(12)),
        );
        let mut type_table = TableLayout::new(vec![1, 1]);
        type_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(true, true, true));
        type_table
            .row()
            .element(Paragraph::new("Type").styled(genpdf::style::Style::new().bold()))
            .element(Paragraph::new("Count").styled(genpdf::style::Style::new().bold()))
            .push()
            .expect("Failed to push row");
        for (visit_type, count) in &report.visits_by_type {
            type_table
                .row()
                .element(Paragraph::new(visit_type))
                .element(Paragraph::new(count.to_string()))
                .push()
                .expect("Failed to push row");
        }
        doc.push(type_table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .context("Failed to render PDF")?;

        let filename = format!(
            "revenue_report_{}.pdf",
            Utc::now().format("%Y%m%d_%H%M%S")
        );

        Ok(ExportResponse {
            data: buffer,
            content_type: "application/pdf".to_string(),
            filename,
        })
    }

    // ========== PUBLIC EXPORT METHODS ==========

    /// Export a report based on format
    #[cfg(feature = "report-export")]
    pub fn export_appointment_report(
        &self,
        report: &AppointmentUtilizationReport,
        format: &ExportFormat,
    ) -> Result<ExportResponse> {
        match format {
            ExportFormat::Csv => self.export_appointment_report_csv(report),
            ExportFormat::Excel => self.export_appointment_report_excel(report),
            ExportFormat::Pdf => self.export_appointment_report_pdf(report),
            ExportFormat::Json => {
                let data = serde_json::to_vec_pretty(report)?;
                Ok(ExportResponse {
                    data,
                    content_type: "application/json".to_string(),
                    filename: format!(
                        "appointment_report_{}.json",
                        Utc::now().format("%Y%m%d_%H%M%S")
                    ),
                })
            }
        }
    }

    #[cfg(feature = "report-export")]
    pub fn export_patient_report(
        &self,
        report: &PatientStatisticsReport,
        format: &ExportFormat,
    ) -> Result<ExportResponse> {
        match format {
            ExportFormat::Csv => self.export_patient_report_csv(report),
            ExportFormat::Excel => self.export_patient_report_excel(report),
            ExportFormat::Pdf => self.export_patient_report_pdf(report),
            ExportFormat::Json => {
                let data = serde_json::to_vec_pretty(report)?;
                Ok(ExportResponse {
                    data,
                    content_type: "application/json".to_string(),
                    filename: format!(
                        "patient_report_{}.json",
                        Utc::now().format("%Y%m%d_%H%M%S")
                    ),
                })
            }
        }
    }

    #[cfg(feature = "report-export")]
    pub fn export_diagnosis_report(
        &self,
        report: &DiagnosisTrendsReport,
        format: &ExportFormat,
    ) -> Result<ExportResponse> {
        match format {
            ExportFormat::Csv => self.export_diagnosis_report_csv(report),
            ExportFormat::Excel => self.export_diagnosis_report_excel(report),
            ExportFormat::Pdf => self.export_diagnosis_report_pdf(report),
            ExportFormat::Json => {
                let data = serde_json::to_vec_pretty(report)?;
                Ok(ExportResponse {
                    data,
                    content_type: "application/json".to_string(),
                    filename: format!(
                        "diagnosis_report_{}.json",
                        Utc::now().format("%Y%m%d_%H%M%S")
                    ),
                })
            }
        }
    }

    #[cfg(feature = "report-export")]
    pub fn export_productivity_report(
        &self,
        report: &ProviderProductivityReport,
        format: &ExportFormat,
    ) -> Result<ExportResponse> {
        match format {
            ExportFormat::Csv => self.export_productivity_report_csv(report),
            ExportFormat::Excel => self.export_productivity_report_excel(report),
            ExportFormat::Pdf => self.export_productivity_report_pdf(report),
            ExportFormat::Json => {
                let data = serde_json::to_vec_pretty(report)?;
                Ok(ExportResponse {
                    data,
                    content_type: "application/json".to_string(),
                    filename: format!(
                        "productivity_report_{}.json",
                        Utc::now().format("%Y%m%d_%H%M%S")
                    ),
                })
            }
        }
    }

    #[cfg(feature = "report-export")]
    pub fn export_revenue_report(
        &self,
        report: &RevenueReport,
        format: &ExportFormat,
    ) -> Result<ExportResponse> {
        match format {
            ExportFormat::Csv => self.export_revenue_report_csv(report),
            ExportFormat::Excel => self.export_revenue_report_excel(report),
            ExportFormat::Pdf => self.export_revenue_report_pdf(report),
            ExportFormat::Json => {
                let data = serde_json::to_vec_pretty(report)?;
                Ok(ExportResponse {
                    data,
                    content_type: "application/json".to_string(),
                    filename: format!(
                        "revenue_report_{}.json",
                        Utc::now().format("%Y%m%d_%H%M%S")
                    ),
                })
            }
        }
    }

    // Fallback implementations when feature is not enabled
    #[cfg(not(feature = "report-export"))]
    pub fn export_appointment_report(
        &self,
        _report: &AppointmentUtilizationReport,
        _format: &ExportFormat,
    ) -> Result<ExportResponse> {
        anyhow::bail!("Report export feature is not enabled. Rebuild with --features report-export")
    }

    #[cfg(not(feature = "report-export"))]
    pub fn export_patient_report(
        &self,
        _report: &PatientStatisticsReport,
        _format: &ExportFormat,
    ) -> Result<ExportResponse> {
        anyhow::bail!("Report export feature is not enabled. Rebuild with --features report-export")
    }

    #[cfg(not(feature = "report-export"))]
    pub fn export_diagnosis_report(
        &self,
        _report: &DiagnosisTrendsReport,
        _format: &ExportFormat,
    ) -> Result<ExportResponse> {
        anyhow::bail!("Report export feature is not enabled. Rebuild with --features report-export")
    }

    #[cfg(not(feature = "report-export"))]
    pub fn export_productivity_report(
        &self,
        _report: &ProviderProductivityReport,
        _format: &ExportFormat,
    ) -> Result<ExportResponse> {
        anyhow::bail!("Report export feature is not enabled. Rebuild with --features report-export")
    }

    #[cfg(not(feature = "report-export"))]
    pub fn export_revenue_report(
        &self,
        _report: &RevenueReport,
        _format: &ExportFormat,
    ) -> Result<ExportResponse> {
        anyhow::bail!("Report export feature is not enabled. Rebuild with --features report-export")
    }
}

impl Default for ReportExportService {
    fn default() -> Self {
        Self::new()
    }
}
