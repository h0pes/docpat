/**
 * Create Test User Utility
 *
 * Creates a test user in the database for development purposes.
 * Usage: cargo run --bin create_test_user
 */

use docpat_backend::utils::password::PasswordHasherUtil;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment
    dotenv::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    println!("🔧 Creating test user...\n");

    // Connect to database
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("✅ Connected to database");

    // Test user credentials
    let username = "testdoctor";
    let email = "test@docpat.local";
    let password = "Test123!";
    let role = "DOCTOR";
    let first_name = "Test";
    let last_name = "Doctor";

    // Hash password
    println!("🔐 Hashing password...");
    let password_hash = PasswordHasherUtil::hash_password(password)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    println!("✅ Password hashed");

    // Insert or update user
    println!("💾 Inserting user into database...");

    let result = sqlx::query!(
        r#"
        INSERT INTO users (
            username, email, password_hash, role,
            first_name, last_name, is_active, mfa_enabled
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, false)
        ON CONFLICT (username)
        DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            email = EXCLUDED.email,
            is_active = true
        RETURNING id, username, email, role
        "#,
        username,
        email,
        password_hash,
        role,
        first_name,
        last_name
    )
    .fetch_one(&pool)
    .await?;

    println!("\n✅ Test user created successfully!\n");
    println!("═══════════════════════════════════════");
    println!("  ID:       {}", result.id);
    println!("  Username: {}", result.username);
    println!("  Email:    {}", result.email);
    println!("  Password: {}", password);
    println!("  Role:     {}", result.role);
    println!("═══════════════════════════════════════\n");
    println!("You can now log in with these credentials.");

    Ok(())
}
