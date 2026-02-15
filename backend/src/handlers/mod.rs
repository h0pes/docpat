/*!
 * HTTP Request Handlers Module
 *
 * Contains all HTTP request handlers for the API endpoints.
 */

pub mod appointments;
pub mod audit_logs;
pub mod auth;
pub mod drug_interactions;
pub mod files;
pub mod system_health;
pub mod diagnoses;
pub mod holidays;
pub mod mfa;
pub mod notifications;
pub mod patients;
pub mod prescriptions;
pub mod prescription_templates;
pub mod reports;
pub mod settings;
pub mod visits;
pub mod visit_templates;
pub mod visit_versions;
pub mod working_hours;

#[cfg(feature = "rbac")]
pub mod users;

#[cfg(feature = "pdf-export")]
pub mod documents;

pub use appointments::{
    cancel_appointment, check_availability, create_appointment, get_appointment,
    get_daily_schedule, get_monthly_schedule, get_weekly_schedule, list_appointments,
    update_appointment,
};
pub use auth::{login_handler, logout_handler, refresh_token_handler};
pub use diagnoses::{
    create_diagnosis, delete_diagnosis, get_diagnosis, get_patient_diagnoses,
    get_visit_diagnoses, search_icd10, update_diagnosis,
};
pub use mfa::{mfa_enroll_handler, mfa_setup_handler};
pub use patients::{
    create_patient, delete_patient, get_patient, get_statistics as get_patient_statistics,
    list_patients, reactivate_patient, search_patients, update_patient,
};
pub use prescriptions::{
    cancel_prescription, complete_prescription, create_custom_medication, create_prescription,
    delete_prescription, discontinue_prescription, get_patient_prescriptions, get_prescription,
    get_visit_prescriptions, hold_prescription, list_prescriptions, resume_prescription,
    search_medications, update_prescription,
};
pub use visits::{
    create_visit, delete_visit, get_patient_visits, get_visit, get_visit_statistics, list_visits,
    lock_visit, sign_visit, update_visit,
};
pub use visit_templates::{
    create_template as create_visit_template, delete_template as delete_visit_template,
    get_template as get_visit_template, list_templates as list_visit_templates,
    update_template as update_visit_template,
};
pub use prescription_templates::{
    create_template as create_prescription_template,
    delete_template as delete_prescription_template, get_template as get_prescription_template,
    list_templates as list_prescription_templates,
    update_template as update_prescription_template,
};
pub use visit_versions::{
    get_visit_version, list_visit_versions, restore_visit_version,
};
pub use reports::{
    export_report, get_appointment_report, get_dashboard_report, get_diagnosis_report,
    get_patient_report, get_productivity_report, get_revenue_report,
};
pub use settings::{
    bulk_update_settings, get_setting, get_settings_by_group, list_groups, list_settings,
    reset_setting, update_setting,
};

