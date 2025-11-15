/*!
 * Services Module
 *
 * Contains business logic and service layer implementations.
 */

pub mod appointment_service;
pub mod auth_service;
pub mod jwt_service;
pub mod patient_service;

pub use appointment_service::AppointmentService;
pub use auth_service::{AuthService, LoginRequest, LoginResponse};
pub use jwt_service::{Claims, JwtService, TokenPair};
pub use patient_service::{
    DuplicateConfidence, PatientService, PatientStatistics, PotentialDuplicate, StatusBreakdown,
};
