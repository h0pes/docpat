/*!
 * Test Utilities
 *
 * Provides helper functions and structures for integration testing:
 * - Test database setup and teardown
 * - Test user creation
 * - TOTP code generation for MFA testing
 * - Test application initialization
 */

use axum::Router;
use sqlx::{postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

use std::sync::Arc;

// Re-export main application modules for testing
use docpat_backend::{
    config::{DatabaseConfig, JwtConfig, SecurityConfig},
    handlers::auth::AppState,
    middleware::session_timeout::SessionManager,
    models::UserRole,
    routes::create_api_v1_routes,
    services::{AuthService, EmailService, SettingsService},
    utils::{encryption::EncryptionKey, PasswordHasherUtil},
};

/// Test application wrapper
pub struct TestApp {
    pub app: Router,
    pub pool: PgPool,
}

impl TestApp {
    /// Create a new test application instance
    ///
    /// Sets up:
    /// - Test database connection
    /// - Application state
    /// - Router with all routes
    pub async fn new() -> (Router, PgPool) {
        // Initialize tracing for tests (only once)
        use std::sync::Once;
        static INIT: Once = Once::new();
        INIT.call_once(|| {
            tracing_subscriber::fmt()
                .with_env_filter("docpat_backend=debug,warn")
                .with_test_writer()
                .try_init()
                .ok();
        });

        // Load environment variables from .env file
        dotenvy::dotenv().ok();

        // Load test configuration from environment or use defaults
        let db_config = DatabaseConfig {
            url: std::env::var("TEST_DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://mpms_user:dev_password_change_in_production@localhost:5432/mpms_test".to_string()),
            max_connections: 5,
            min_connections: 1,
            acquire_timeout: std::time::Duration::from_secs(5),
            idle_timeout: std::time::Duration::from_secs(60),
            max_lifetime: std::time::Duration::from_secs(300),
        };

        let jwt_config = JwtConfig {
            secret: "test_secret_key_minimum_32_characters_long_for_security".to_string(),
            refresh_secret: "test_refresh_secret_key_minimum_32_characters_long".to_string(),
            access_token_expiry: 1800,
            refresh_token_expiry: 604800,
        };

        let security_config = SecurityConfig {
            encryption_key: "test_encryption_key_32_chars!!".to_string(),
            session_timeout: 1800,
            max_failed_login_attempts: 5,
            lockout_duration: 900,
        };

        // Create database pool
        let pool = setup_test_db(&db_config).await;

        // Create authentication service
        let auth_service = AuthService::new(jwt_config, security_config);

        // Create session manager (30 minute timeout)
        let session_manager = SessionManager::new(1800);

        // Initialize Casbin enforcer for RBAC testing
        #[cfg(feature = "rbac")]
        let enforcer = {
            use docpat_backend::middleware::authorization::CasbinEnforcer;

            CasbinEnforcer::new("casbin/model.conf", "casbin/policy.csv")
                .await
                .expect("Failed to initialize Casbin enforcer for tests")
        };

        // Create encryption key for patient data
        // Set environment variable for test encryption key (32 bytes base64 encoded)
        std::env::set_var("ENCRYPTION_KEY", "dGVzdF9lbmNyeXB0aW9uX2tleV8zMmJ5dGVzX29rXCE="); // "test_encryption_key_32bytes_ok!" in base64 (exactly 32 bytes)
        let encryption_key = EncryptionKey::from_env()
            .expect("Failed to create encryption key for tests");

        // Create settings service
        let settings_service = Arc::new(SettingsService::new(pool.clone()));

        // Create a disabled email service for notification testing
        // This allows notification endpoints to work without actual SMTP
        let email_service = EmailService::new(None)
            .expect("Failed to create disabled email service for tests");

        // Create application state
        let app_state = AppState {
            pool: pool.clone(),
            auth_service,
            session_manager,
            encryption_key: Some(encryption_key),
            email_service: Some(email_service),
            settings_service,
            start_time: std::time::SystemTime::now(),
            environment: "test".to_string(),
            #[cfg(feature = "rbac")]
            enforcer,
        };

        // Create router
        let app = Router::new()
            .nest("/api/v1", create_api_v1_routes(app_state));

        (app, pool)
    }
}

/// Set up test database
///
/// Creates a fresh database connection pool and runs migrations
pub async fn setup_test_db(config: &DatabaseConfig) -> PgPool {
    let pool = PgPoolOptions::new()
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .acquire_timeout(config.acquire_timeout)
        .connect(&config.url)
        .await
        .expect("Failed to connect to test database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

/// Clean up test database
///
/// Removes all test data from the database using TRUNCATE CASCADE
/// which bypasses RLS policies and is more reliable than DELETE.
/// Note: TRUNCATE users CASCADE also cascades to default_working_hours and
/// system_settings via updated_by FK, so we re-seed them after cleanup.
pub async fn teardown_test_db(pool: &PgPool) {
    // Use TRUNCATE CASCADE to efficiently clean all test data
    // This bypasses RLS policies and cascades to dependent tables
    // Note: CASCADE to default_working_hours and system_settings via updated_by FK
    sqlx::query(
        r#"
        TRUNCATE users, patients, patient_insurance, appointments,
                 visits, visit_diagnoses, visit_templates, visit_versions,
                 prescriptions, prescription_templates,
                 document_templates, generated_documents,
                 holidays, uploaded_files, audit_logs,
                 notifications, patient_notification_preferences CASCADE
        "#
    )
    .execute(pool)
    .await
    .ok();

    // Re-seed default working hours (Mon-Fri 9:00-18:00, weekends closed)
    // These get deleted by CASCADE from TRUNCATE users because of updated_by FK
    sqlx::query(
        r#"
        INSERT INTO default_working_hours (day_of_week, start_time, end_time, is_working_day)
        VALUES
            (1, '09:00', '18:00', true),
            (2, '09:00', '18:00', true),
            (3, '09:00', '18:00', true),
            (4, '09:00', '18:00', true),
            (5, '09:00', '18:00', true),
            (6, NULL, NULL, false),
            (7, NULL, NULL, false)
        ON CONFLICT (day_of_week) DO NOTHING
        "#
    )
    .execute(pool)
    .await
    .ok();

    // Re-seed default system settings (also deleted by CASCADE from users.updated_by FK)
    sqlx::query(
        r#"
        INSERT INTO system_settings (setting_key, setting_group, setting_name, setting_value, value_type, description, default_value, is_public, is_readonly) VALUES
        ('clinic.name', 'clinic', 'Clinic Name', '"Medical Practice"', 'STRING', 'Name of the medical practice', '"Medical Practice"', true, false),
        ('clinic.address', 'clinic', 'Clinic Address', '"123 Main St, City, State 12345"', 'STRING', 'Physical address of the clinic', '""', true, false),
        ('clinic.phone', 'clinic', 'Clinic Phone', '"+1-555-0100"', 'STRING', 'Main clinic phone number', '""', true, false),
        ('clinic.email', 'clinic', 'Clinic Email', '"info@clinic.com"', 'STRING', 'Main clinic email address', '""', true, false),
        ('clinic.timezone', 'clinic', 'Timezone', '"Europe/Rome"', 'STRING', 'Clinic timezone for appointments', '"Europe/Rome"', false, false),
        ('appointment.default_duration', 'appointment', 'Default Appointment Duration (minutes)', '30', 'INTEGER', 'Default duration for appointments in minutes', '30', false, false),
        ('appointment.booking_advance_days', 'appointment', 'Booking Advance (days)', '90', 'INTEGER', 'How many days in advance patients can book', '90', false, false),
        ('appointment.cancellation_hours', 'appointment', 'Cancellation Notice (hours)', '24', 'INTEGER', 'Minimum hours notice required for cancellation', '24', false, false),
        ('appointment.buffer_minutes', 'appointment', 'Buffer Between Appointments (minutes)', '0', 'INTEGER', 'Buffer time between appointments', '0', false, false),
        ('appointment.allow_double_booking', 'appointment', 'Allow Double Booking', 'false', 'BOOLEAN', 'Whether to allow double-booking appointments', 'false', false, false),
        ('notification.reminder_hours_before', 'notification', 'Reminder Hours Before', '24', 'INTEGER', 'Hours before appointment to send reminder', '24', false, false),
        ('notification.email_enabled', 'notification', 'Email Notifications Enabled', 'false', 'BOOLEAN', 'Enable email notifications', 'false', false, false),
        ('notification.sms_enabled', 'notification', 'SMS Notifications Enabled', 'false', 'BOOLEAN', 'Enable SMS notifications', 'false', false, false),
        ('notification.whatsapp_enabled', 'notification', 'WhatsApp Notifications Enabled', 'false', 'BOOLEAN', 'Enable WhatsApp notifications', 'false', false, false),
        ('security.session_timeout_minutes', 'security', 'Session Timeout (minutes)', '30', 'INTEGER', 'Session inactivity timeout in minutes', '30', false, false),
        ('security.mfa_required', 'security', 'MFA Required', 'true', 'BOOLEAN', 'Require multi-factor authentication for all users', 'true', false, false),
        ('security.password_expiry_days', 'security', 'Password Expiry (days)', '90', 'INTEGER', 'Days until password expires (0 = never)', '90', false, false),
        ('security.max_login_attempts', 'security', 'Max Login Attempts', '5', 'INTEGER', 'Maximum failed login attempts before lockout', '5', false, false),
        ('security.lockout_duration_minutes', 'security', 'Lockout Duration (minutes)', '15', 'INTEGER', 'Duration of account lockout after max failed attempts', '15', false, false),
        ('backup.enabled', 'backup', 'Automated Backups Enabled', 'true', 'BOOLEAN', 'Enable automated database backups', 'true', false, false),
        ('backup.retention_days', 'backup', 'Backup Retention (days)', '30', 'INTEGER', 'Days to retain backups', '30', false, false),
        ('backup.schedule', 'backup', 'Backup Schedule (cron)', '"0 2 * * *"', 'STRING', 'Cron expression for backup schedule', '"0 2 * * *"', false, false),
        ('localization.default_language', 'localization', 'Default Language', '"it"', 'STRING', 'Default system language (it or en)', '"it"', true, false),
        ('localization.supported_languages', 'localization', 'Supported Languages', '["it", "en"]', 'ARRAY', 'List of supported languages', '["it", "en"]', true, true),
        ('localization.date_format', 'localization', 'Date Format', '"DD/MM/YYYY"', 'STRING', 'Date display format', '"DD/MM/YYYY"', false, false),
        ('localization.time_format', 'localization', 'Time Format', '"24h"', 'STRING', 'Time display format (12h or 24h)', '"24h"', false, false),
        ('system.maintenance_mode', 'system', 'Maintenance Mode', 'false', 'BOOLEAN', 'Enable maintenance mode (blocks access)', 'false', true, false),
        ('system.maintenance_message', 'system', 'Maintenance Message', '"System is under maintenance. Please try again later."', 'STRING', 'Message to show during maintenance', '"System is under maintenance."', true, false)
        ON CONFLICT (setting_key) DO NOTHING
        "#
    )
    .execute(pool)
    .await
    .ok();
}

/// Test user helper
pub struct TestUser {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub mfa_secret: Option<String>,
    pub backup_code_plaintext: Option<String>,
}

impl TestUser {
    /// Create an active ADMIN user in the database
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `username` - Username for the admin user
    /// * `password` - Plain text password (will be hashed)
    pub async fn create_admin_user(
        pool: &PgPool,
        username: &str,
        password: &str,
    ) -> Self {
        // Validate password complexity for test quality
        PasswordHasherUtil::validate_password_complexity(password, None)
            .expect("Test password must meet complexity requirements");

        let password_hash = PasswordHasherUtil::hash_password(password)
            .expect("Failed to hash password");

        let user_id = Uuid::new_v4();
        let email = format!("{}@test.com", username);

        sqlx::query(
            r#"
            INSERT INTO users (
                id, username, email, password_hash, role,
                first_name, last_name, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(&user_id)
        .bind(username)
        .bind(&email)
        .bind(&password_hash)
        .bind("ADMIN") // Admin role
        .bind("Admin")
        .bind("User")
        .bind(true)
        .execute(pool)
        .await
        .expect("Failed to create admin test user");

        Self {
            id: user_id,
            username: username.to_string(),
            email,
            role: UserRole::Admin,
            mfa_secret: None,
            backup_code_plaintext: None,
        }
    }

    /// Create an active DOCTOR user in the database
    ///
    /// # Arguments
    ///
    /// * `pool` - Database connection pool
    /// * `username` - Username for the test user
    /// * `password` - Plain text password (will be hashed)
    /// * `enable_mfa` - Whether to enable MFA for this user
    pub async fn create_active_user(
        pool: &PgPool,
        username: &str,
        password: &str,
        enable_mfa: bool,
    ) -> Self {
        // Validate password complexity for test quality
        PasswordHasherUtil::validate_password_complexity(password, None)
            .expect("Test password must meet complexity requirements");

        let password_hash = PasswordHasherUtil::hash_password(password)
            .expect("Failed to hash password");

        let mfa_secret = if enable_mfa {
            // Use a 32-character Base32 secret (160 bits / 20 bytes) which is the standard size
            Some("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP".to_string()) // Test TOTP secret
        } else {
            None
        };

        let user_id = Uuid::new_v4();
        let email = format!("{}@test.com", username);

        sqlx::query(
            r#"
            INSERT INTO users (
                id, username, email, password_hash, role,
                first_name, last_name, is_active,
                mfa_secret, mfa_enabled
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(&user_id)
        .bind(username)
        .bind(&email)
        .bind(&password_hash)
        .bind("DOCTOR")
        .bind("Test")
        .bind("User")
        .bind(true)
        .bind(&mfa_secret)
        .bind(enable_mfa)
        .execute(pool)
        .await
        .expect("Failed to create test user");

        Self {
            id: user_id,
            username: username.to_string(),
            email,
            role: UserRole::Doctor,
            mfa_secret,
            backup_code_plaintext: None,
        }
    }

    /// Create an inactive test user in the database
    pub async fn create_inactive_user(
        pool: &PgPool,
        username: &str,
        password: &str,
    ) -> Self {
        // Validate password complexity for test quality
        PasswordHasherUtil::validate_password_complexity(password, None)
            .expect("Test password must meet complexity requirements");

        let password_hash = PasswordHasherUtil::hash_password(password)
            .expect("Failed to hash password");

        let user_id = Uuid::new_v4();
        let email = format!("{}@test.com", username);

        sqlx::query(
            r#"
            INSERT INTO users (
                id, username, email, password_hash, role,
                first_name, last_name, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(&user_id)
        .bind(username)
        .bind(&email)
        .bind(&password_hash)
        .bind("DOCTOR")
        .bind("Test")
        .bind("User")
        .bind(false) // is_active = false
        .execute(pool)
        .await
        .expect("Failed to create inactive test user");

        Self {
            id: user_id,
            username: username.to_string(),
            email,
            role: UserRole::Doctor,
            mfa_secret: None,
            backup_code_plaintext: None,
        }
    }

    /// Generate a valid TOTP code for this user (for MFA testing)
    pub fn generate_totp_code(&self) -> String {
        use totp_rs::{Algorithm, Secret, TOTP};

        let mfa_secret = self
            .mfa_secret
            .as_ref()
            .expect("User does not have MFA enabled");

        // The secret is stored as a Base32-encoded string, so we need to decode it
        let secret = Secret::Encoded(mfa_secret.clone())
            .to_bytes()
            .expect("Failed to parse MFA secret");

        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret,
            Some("DocPat Medical".to_string()),
            self.username.clone(),
        )
        .expect("Failed to create TOTP");

        totp.generate_current().expect("Failed to generate TOTP code")
    }

    /// Create a test user with MFA and backup codes
    pub async fn create_user_with_backup_codes(
        pool: &PgPool,
        username: &str,
        password: &str,
    ) -> Self {
        // Validate password complexity
        PasswordHasherUtil::validate_password_complexity(password, None)
            .expect("Test password must meet complexity requirements");

        let password_hash = PasswordHasherUtil::hash_password(password)
            .expect("Failed to hash password");

        // Use a 32-character Base32 secret (160 bits / 20 bytes) which is the standard size
        let mfa_secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP".to_string(); // Test TOTP secret

        // Create a backup code
        let backup_code_plaintext = "TESTCODE".to_string();
        let backup_code_hashed = PasswordHasherUtil::hash_password(&backup_code_plaintext)
            .expect("Failed to hash backup code");

        let backup_codes = vec![backup_code_hashed];

        let user_id = Uuid::new_v4();
        let email = format!("{}@test.com", username);

        sqlx::query(
            r#"
            INSERT INTO users (
                id, username, email, password_hash, role,
                first_name, last_name, is_active,
                mfa_secret, mfa_enabled, backup_codes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            "#,
        )
        .bind(&user_id)
        .bind(username)
        .bind(&email)
        .bind(&password_hash)
        .bind("DOCTOR")
        .bind("Test")
        .bind("User")
        .bind(true)
        .bind(&mfa_secret)
        .bind(true)
        .bind(&backup_codes)
        .execute(pool)
        .await
        .expect("Failed to create test user with backup codes");

        Self {
            id: user_id,
            username: username.to_string(),
            email,
            role: UserRole::Doctor,
            mfa_secret: Some(mfa_secret),
            backup_code_plaintext: Some(backup_code_plaintext),
        }
    }

    /// Deactivate this user in the database
    pub async fn deactivate(&self, pool: &PgPool) {
        sqlx::query("UPDATE users SET is_active = false WHERE id = $1")
            .bind(&self.id)
            .execute(pool)
            .await
            .expect("Failed to deactivate user");
    }

    /// Lock this user account until a specific time
    pub async fn lock_until(&self, pool: &PgPool, until: chrono::DateTime<chrono::Utc>) {
        sqlx::query("UPDATE users SET locked_until = $1 WHERE id = $2")
            .bind(until)
            .bind(&self.id)
            .execute(pool)
            .await
            .expect("Failed to lock user");
    }
}

// Tests for test_utils module are disabled as they require a database connection
// and would duplicate the integration tests functionality
