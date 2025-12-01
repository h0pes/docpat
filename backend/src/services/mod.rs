/*!
 * Services Module
 *
 * Contains business logic and service layer implementations.
 */

pub mod appointment_service;
pub mod auth_service;
pub mod document_service;
pub mod email_service;
pub mod jwt_service;
pub mod patient_service;
pub mod prescription_service;
pub mod prescription_template_service;
pub mod visit_diagnosis_service;
pub mod visit_service;
pub mod visit_template_service;

pub use appointment_service::AppointmentService;
pub use auth_service::{AuthService, LoginRequest, LoginResponse};
pub use document_service::DocumentService;
pub use email_service::{generate_document_email_body, EmailResult, EmailService};
pub use jwt_service::{Claims, JwtService, TokenPair};
pub use patient_service::{
    DuplicateConfidence, PatientService, PatientStatistics, PotentialDuplicate, StatusBreakdown,
};
pub use prescription_service::{MedicationSearchResult, PrescriptionService};
pub use prescription_template_service::PrescriptionTemplateService;
pub use visit_diagnosis_service::{ICD10SearchResult, VisitDiagnosisService};
pub use visit_service::{
    LockVisitRequest, SignVisitRequest, VisitSearchFilter, VisitService, VisitStatistics,
    VisitTypeCount,
};
pub use visit_template_service::VisitTemplateService;
