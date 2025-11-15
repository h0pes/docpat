/*!
 * HTTP Request Handlers Module
 *
 * Contains all HTTP request handlers for the API endpoints.
 */

pub mod appointments;
pub mod auth;
pub mod mfa;
pub mod patients;

#[cfg(feature = "rbac")]
pub mod users;

pub use appointments::{
    cancel_appointment, check_availability, create_appointment, get_appointment,
    get_daily_schedule, get_monthly_schedule, get_weekly_schedule, list_appointments,
    update_appointment,
};
pub use auth::{login_handler, logout_handler, refresh_token_handler, AppState};
pub use mfa::{mfa_enroll_handler, mfa_setup_handler};
pub use patients::{
    create_patient, delete_patient, get_patient, get_statistics as get_patient_statistics,
    list_patients, search_patients, update_patient,
};
