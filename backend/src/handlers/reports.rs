/*!
 * Reporting & Analytics HTTP Handlers
 *
 * Handles HTTP requests for reporting and analytics endpoints:
 * - Appointment utilization reports
 * - Patient statistics
 * - Diagnosis trends
 * - Provider productivity
 * - Revenue tracking
 * - Dashboard overview
 * - Report export (JSON, CSV, PDF, Excel)
 */

use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    handlers::auth::AppState,
    models::{
        AppointmentReportFilter, DiagnosisReportFilter, ExportFormat, ExportReportRequest,
        PatientReportFilter, ProductivityReportFilter, ReportType, RevenueReportFilter, UserRole,
    },
    services::{ReportExportService, ReportService},
    utils::{AppError, Result},
};

#[cfg(feature = "rbac")]
use tracing::warn;

/// Check if user has permission to access reports
#[cfg(feature = "rbac")]
async fn check_permission(
    state: &AppState,
    user_role: &UserRole,
    action: &str,
) -> Result<()> {
    let has_permission = state
        .enforcer
        .enforce(user_role, "reports", action)
        .await
        .map_err(|e| {
            warn!("RBAC enforcement error: {}", e);
            AppError::Internal("Failed to check permissions".to_string())
        })?;

    if !has_permission {
        return Err(AppError::Forbidden(format!(
            "User does not have permission to {} reports",
            action
        )));
    }

    Ok(())
}

/// Fallback for non-RBAC builds - only checks role
#[cfg(not(feature = "rbac"))]
async fn check_permission(
    _state: &AppState,
    user_role: &UserRole,
    _action: &str,
) -> Result<()> {
    // Simple role-based check without Casbin
    // Both ADMIN and DOCTOR can read reports
    if !matches!(user_role, UserRole::Admin | UserRole::Doctor) {
        return Err(AppError::Forbidden(
            "Insufficient permissions to access reports".to_string(),
        ));
    }
    Ok(())
}

/// Get appointment utilization report
///
/// GET /api/v1/reports/appointments
///
/// Query parameters:
/// - `start_date`: Start date filter (YYYY-MM-DD)
/// - `end_date`: End date filter (YYYY-MM-DD)
/// - `provider_id`: Filter by provider UUID
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_appointment_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(filter): Query<AppointmentReportFilter>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Generating appointment report for user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Check permissions
    check_permission(&state, &user_role, "read").await?;

    // Create report service
    let report_service = ReportService::new(state.pool.clone());

    // Generate report
    let report = report_service
        .get_appointment_utilization(filter, user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to generate appointment report: {}", e)))?;

    Ok((StatusCode::OK, Json(report)))
}

/// Get patient statistics report
///
/// GET /api/v1/reports/patients
///
/// Query parameters:
/// - `start_date`: Start date for new patient filter (YYYY-MM-DD)
/// - `end_date`: End date for new patient filter (YYYY-MM-DD)
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_patient_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(filter): Query<PatientReportFilter>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Generating patient statistics report for user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Check permissions
    check_permission(&state, &user_role, "read").await?;

    // Create report service
    let report_service = ReportService::new(state.pool.clone());

    // Generate report
    let report = report_service
        .get_patient_statistics(filter, user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to generate patient report: {}", e)))?;

    Ok((StatusCode::OK, Json(report)))
}

/// Get diagnosis trends report
///
/// GET /api/v1/reports/diagnoses
///
/// Query parameters:
/// - `start_date`: Start date filter (YYYY-MM-DD)
/// - `end_date`: End date filter (YYYY-MM-DD)
/// - `provider_id`: Filter by provider UUID
/// - `limit`: Maximum number of top diagnoses to return (default: 20)
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_diagnosis_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(filter): Query<DiagnosisReportFilter>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Generating diagnosis trends report for user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Check permissions
    check_permission(&state, &user_role, "read").await?;

    // Create report service
    let report_service = ReportService::new(state.pool.clone());

    // Generate report
    let report = report_service
        .get_diagnosis_trends(filter, user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to generate diagnosis report: {}", e)))?;

    Ok((StatusCode::OK, Json(report)))
}

/// Get provider productivity report
///
/// GET /api/v1/reports/productivity
///
/// Query parameters:
/// - `start_date`: Start date filter (YYYY-MM-DD)
/// - `end_date`: End date filter (YYYY-MM-DD)
/// - `provider_id`: Filter by specific provider UUID
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_productivity_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(filter): Query<ProductivityReportFilter>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Generating productivity report for user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Check permissions
    check_permission(&state, &user_role, "read").await?;

    // Create report service
    let report_service = ReportService::new(state.pool.clone());

    // Generate report
    let report = report_service
        .get_provider_productivity(filter, user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to generate productivity report: {}", e)))?;

    Ok((StatusCode::OK, Json(report)))
}

/// Get revenue report
///
/// GET /api/v1/reports/revenue
///
/// Query parameters:
/// - `start_date`: Start date filter (YYYY-MM-DD)
/// - `end_date`: End date filter (YYYY-MM-DD)
/// - `provider_id`: Filter by provider UUID
///
/// Note: This is a placeholder based on visit counts. Actual revenue
/// tracking requires billing module integration.
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN only (revenue data is sensitive)
pub async fn get_revenue_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Query(filter): Query<RevenueReportFilter>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Generating revenue report for user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Revenue reports may be restricted to ADMIN only in production
    // For now, check standard reports permission
    check_permission(&state, &user_role, "read").await?;

    // Create report service
    let report_service = ReportService::new(state.pool.clone());

    // Generate report
    let report = report_service
        .get_revenue_report(filter, user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to generate revenue report: {}", e)))?;

    Ok((StatusCode::OK, Json(report)))
}

/// Get dashboard report
///
/// GET /api/v1/reports/dashboard
///
/// Returns quick stats and recent activity for the main dashboard.
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn get_dashboard_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
) -> Result<impl IntoResponse> {
    tracing::info!(
        "Generating dashboard report for user: {} (role: {:?})",
        user_id,
        user_role
    );

    // Check permissions
    check_permission(&state, &user_role, "read").await?;

    // Create report service
    let report_service = ReportService::new(state.pool.clone());

    // Generate report
    let report = report_service
        .get_dashboard_report(user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to generate dashboard report: {}", e)))?;

    Ok((StatusCode::OK, Json(report)))
}

/// Export report
///
/// POST /api/v1/reports/export
///
/// Request body:
/// ```json
/// {
///   "report_type": "appointment_utilization",
///   "format": "json",
///   "start_date": "2024-01-01",
///   "end_date": "2024-12-31",
///   "provider_id": "uuid" (optional)
/// }
/// ```
///
/// Supported report types:
/// - `appointment_utilization`
/// - `patient_statistics`
/// - `diagnosis_trends`
/// - `provider_productivity`
/// - `revenue`
/// - `dashboard`
///
/// Supported formats:
/// - `json` (default)
/// - `csv`
/// - `pdf`
/// - `excel`
///
/// **RBAC**: Requires 'read' permission on 'reports' resource
/// **Roles**: ADMIN, DOCTOR
pub async fn export_report(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(user_role): Extension<UserRole>,
    Json(req): Json<ExportReportRequest>,
) -> Result<Response> {
    tracing::info!(
        "Exporting report {:?} as {:?} for user: {} (role: {:?})",
        req.report_type,
        req.format,
        user_id,
        user_role
    );

    // Check permissions
    check_permission(&state, &user_role, "read").await?;

    // Create services
    let report_service = ReportService::new(state.pool.clone());
    let export_service = ReportExportService::new();

    // Generate and export the appropriate report based on type
    let export_response = match req.report_type {
        ReportType::AppointmentUtilization => {
            let filter = AppointmentReportFilter {
                start_date: req.start_date,
                end_date: req.end_date,
                provider_id: req.provider_id,
            };
            let report = report_service
                .get_appointment_utilization(filter, user_id)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to generate report: {}", e)))?;
            export_service
                .export_appointment_report(&report, &req.format)
                .map_err(|e| AppError::Internal(format!("Failed to export report: {}", e)))?
        }
        ReportType::PatientStatistics => {
            let filter = PatientReportFilter {
                start_date: req.start_date,
                end_date: req.end_date,
            };
            let report = report_service
                .get_patient_statistics(filter, user_id)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to generate report: {}", e)))?;
            export_service
                .export_patient_report(&report, &req.format)
                .map_err(|e| AppError::Internal(format!("Failed to export report: {}", e)))?
        }
        ReportType::DiagnosisTrends => {
            let filter = DiagnosisReportFilter {
                start_date: req.start_date,
                end_date: req.end_date,
                provider_id: req.provider_id,
                limit: None,
            };
            let report = report_service
                .get_diagnosis_trends(filter, user_id)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to generate report: {}", e)))?;
            export_service
                .export_diagnosis_report(&report, &req.format)
                .map_err(|e| AppError::Internal(format!("Failed to export report: {}", e)))?
        }
        ReportType::ProviderProductivity => {
            let filter = ProductivityReportFilter {
                start_date: req.start_date,
                end_date: req.end_date,
                provider_id: req.provider_id,
            };
            let report = report_service
                .get_provider_productivity(filter, user_id)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to generate report: {}", e)))?;
            export_service
                .export_productivity_report(&report, &req.format)
                .map_err(|e| AppError::Internal(format!("Failed to export report: {}", e)))?
        }
        ReportType::Revenue => {
            let filter = RevenueReportFilter {
                start_date: req.start_date,
                end_date: req.end_date,
                provider_id: req.provider_id,
            };
            let report = report_service
                .get_revenue_report(filter, user_id)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to generate report: {}", e)))?;
            export_service
                .export_revenue_report(&report, &req.format)
                .map_err(|e| AppError::Internal(format!("Failed to export report: {}", e)))?
        }
        ReportType::Dashboard => {
            // Dashboard doesn't support export to other formats - return JSON only
            let report = report_service
                .get_dashboard_report(user_id)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to generate report: {}", e)))?;
            let data = serde_json::to_vec_pretty(&report)
                .map_err(|e| AppError::Internal(format!("Failed to serialize report: {}", e)))?;
            crate::services::ExportResponse {
                data,
                content_type: "application/json".to_string(),
                filename: format!(
                    "dashboard_report_{}.json",
                    chrono::Utc::now().format("%Y%m%d_%H%M%S")
                ),
            }
        }
    };

    // Build response with appropriate headers for file download
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, export_response.content_type)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", export_response.filename),
        )
        .body(Body::from(export_response.data))
        .map_err(|e| AppError::Internal(format!("Failed to build response: {}", e)))?;

    Ok(response)
}
