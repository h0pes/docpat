/*!
 * HTTP Request Handlers Module
 *
 * Contains all HTTP request handlers for the API endpoints.
 */

pub mod auth;
pub mod mfa;
pub mod patients;

#[cfg(feature = "rbac")]
pub mod users;

pub use auth::{login_handler, logout_handler, refresh_token_handler, AppState};
pub use mfa::{mfa_enroll_handler, mfa_setup_handler};
pub use patients::{
    create_patient, delete_patient, get_patient, get_statistics, list_patients, search_patients,
    update_patient,
};
