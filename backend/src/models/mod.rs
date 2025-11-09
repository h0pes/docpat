/*!
 * Data Models Module
 *
 * Contains database models and their associated operations.
 */

pub mod audit_log;
pub mod patient;
pub mod patient_insurance;
pub mod user;

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
