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

// Re-export main application modules for testing
use docpat_backend::{
    config::{DatabaseConfig, JwtConfig, SecurityConfig},
    handlers::auth::AppState,
    middleware::session_timeout::SessionManager,
    models::UserRole,
    routes::create_api_v1_routes,
    services::AuthService,
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
        // Load environment variables from .env file
        dotenv::dotenv().ok();

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

        // Create application state
        let app_state = AppState {
            pool: pool.clone(),
            auth_service,
            session_manager,
            encryption_key: Some(encryption_key),
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
/// Removes all test data from the database
/// Uses a transaction with admin RLS context to bypass RLS policies during cleanup
pub async fn teardown_test_db(pool: &PgPool) {
    // Start a transaction to set RLS context
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            eprintln!("Failed to begin teardown transaction: {}", e);
            return;
        }
    };

    // Set RLS context as ADMIN to allow DELETE operations
    // Use a dummy UUID for teardown operations
    let admin_id = uuid::Uuid::nil();
    sqlx::query(&format!("SET LOCAL app.current_user_id = '{}'", admin_id))
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("SET LOCAL app.current_user_role = 'ADMIN'")
        .execute(&mut *tx)
        .await
        .ok();

    // Clean up all tables in reverse order of dependencies
    sqlx::query("DELETE FROM audit_logs")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM generated_documents")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM document_templates")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM prescription_templates")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM prescriptions")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM visit_versions")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM visit_diagnoses")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM visit_templates")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM visits")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM appointments")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM patient_insurance")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM patients")
        .execute(&mut *tx)
        .await
        .ok();

    sqlx::query("DELETE FROM users")
        .execute(&mut *tx)
        .await
        .ok();

    // Commit the transaction
    tx.commit().await.ok();
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
