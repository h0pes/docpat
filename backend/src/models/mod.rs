/*!
 * Data Models Module
 *
 * Contains database models and their associated operations.
 */

pub mod appointment;
pub mod audit_log;
pub mod document_template;
pub mod generated_document;
pub mod patient;
pub mod report;
pub mod patient_insurance;
pub mod prescription;
pub mod prescription_template;
pub mod user;
pub mod visit;
pub mod visit_diagnosis;
pub mod visit_template;
pub mod visit_version;

pub use appointment::{
    Appointment, AppointmentDto, AppointmentSearchFilter, AppointmentStatistics,
    AppointmentStatus, AppointmentType, AvailabilityRequest, AvailabilityResponse,
    CancelAppointmentRequest, CreateAppointmentRequest, RecurringFrequency, RecurringPattern,
    TimeSlot, UpdateAppointmentRequest,
};
pub use audit_log::{AuditAction, AuditLog, CreateAuditLog, EntityType};
pub use patient::{
    Address, CreatePatientRequest, EmergencyContact, Gender, Medication, Patient,
    PatientDto, PatientSearchFilter, PatientStatus, UpdatePatientRequest,
};
pub use patient_insurance::{
    CreateInsuranceRequest, InsuranceType, PatientInsurance, PatientInsuranceDto,
    PolicyholderRelationship, ProviderAddress, UpdateInsuranceRequest,
};
pub use user::{User, UserDto, UserRole};

/// Authenticated user information extracted from JWT token
/// This is added as a request extension by the auth middleware
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: uuid::Uuid,
    pub role: UserRole,
}
pub use visit::{
    CreateVisitRequest, ReviewOfSystems, UpdateVisitRequest, Visit, VisitResponse, VisitStatus,
    VisitType, VitalSigns,
};
pub use visit_diagnosis::{
    CreateVisitDiagnosisRequest, DiagnosisType, ICD10SearchResult, UpdateVisitDiagnosisRequest,
    VisitDiagnosis, VisitDiagnosisResponse,
};
pub use prescription::{
    CreatePrescriptionRequest, DrugInteractionWarning, MedicationForm, MedicationSearchResult,
    Prescription, PrescriptionResponse, PrescriptionStatus, RouteOfAdministration,
    UpdatePrescriptionRequest,
};
pub use prescription_template::{
    CreatePrescriptionTemplateRequest, PrescriptionTemplate, PrescriptionTemplateResponse,
    TemplateMedication, UpdatePrescriptionTemplateRequest,
};
pub use visit_template::{
    CreateVisitTemplateRequest, UpdateVisitTemplateRequest, VisitTemplate,
    VisitTemplateResponse,
};
pub use visit_version::{VisitVersion, VisitVersionResponse, VisitVersionSummary};
pub use document_template::{
    CreateDocumentTemplateRequest, DocumentTemplate, DocumentTemplateFilter,
    DocumentTemplateResponse, DocumentTemplateSummary, DocumentType, ListDocumentTemplatesResponse,
    PageOrientation, PageSize, TemplateLanguage, UpdateDocumentTemplateRequest,
};
pub use generated_document::{
    BulkGenerateError, BulkGenerateRequest, BulkGenerateResult, DeliverDocumentRequest,
    DocumentStatistics, DocumentStatus, DocumentStatusCount, DocumentTypeCount,
    GenerateDocumentRequest, GeneratedDocument, GeneratedDocumentFilter,
    GeneratedDocumentResponse, GeneratedDocumentSummary, ListGeneratedDocumentsResponse,
    SignDocumentRequest,
};
pub use report::{
    AgeGroupCount, AppointmentReportFilter, AppointmentUtilizationReport, DailyAppointmentCount,
    DashboardReport, DateRangeFilter, DayOfWeekCount, DiagnosisCategoryCount, DiagnosisCount,
    DiagnosisReportFilter, DiagnosisTrendsReport, ExportFormat, ExportReportRequest,
    GenderBreakdown, HourlyCount, MonthlyCount, MonthlyDiagnosisCount, NewPatientSummary,
    PatientReportFilter, PatientStatisticsReport, ProductivityReportFilter, ProductivitySummary,
    ProviderProductivity, ProviderProductivityReport, QuickStats, RecentActivity,
    RecentAppointment, RecentVisit, ReportDateRange, ReportType, RevenueReport,
    RevenueReportFilter,
};
