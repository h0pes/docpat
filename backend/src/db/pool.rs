/*!
 * Database Connection Pool
 *
 * Creates and manages PostgreSQL connection pools using SQLx.
 */

use crate::config::DatabaseConfig;
use sqlx::postgres::{PgPool, PgPoolOptions};
use sqlx::Error as SqlxError;

/// Create a PostgreSQL connection pool with the provided configuration
///
/// # Arguments
///
/// * `config` - Database configuration containing connection parameters
///
/// # Returns
///
/// A configured `PgPool` instance
///
/// # Errors
///
/// Returns an error if the connection to the database fails or if the
/// connection parameters are invalid.
///
/// # Example
///
/// ```no_run
/// use docpat_backend::config::DatabaseConfig;
/// use docpat_backend::db::create_pool;
/// use std::time::Duration;
///
/// # async fn example() -> Result<(), sqlx::Error> {
/// let config = DatabaseConfig {
///     url: "postgres://user:pass@localhost/db".to_string(),
///     max_connections: 50,
///     min_connections: 10,
///     acquire_timeout: Duration::from_secs(30),
///     idle_timeout: Duration::from_secs(600),
///     max_lifetime: Duration::from_secs(1800),
/// };
///
/// let pool = create_pool(&config).await?;
/// # Ok(())
/// # }
/// ```
pub async fn create_pool(config: &DatabaseConfig) -> Result<PgPool, SqlxError> {
    tracing::info!("Creating database connection pool...");
    tracing::debug!("Max connections: {}", config.max_connections);
    tracing::debug!("Min connections: {}", config.min_connections);

    let pool = PgPoolOptions::new()
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .acquire_timeout(config.acquire_timeout)
        .idle_timeout(Some(config.idle_timeout))
        .max_lifetime(Some(config.max_lifetime))
        .connect(&config.url)
        .await?;

    tracing::info!("Database connection pool created successfully");

    // Test the connection
    test_connection(&pool).await?;

    Ok(pool)
}

/// Test the database connection by executing a simple query
///
/// # Arguments
///
/// * `pool` - Database connection pool
///
/// # Errors
///
/// Returns an error if the test query fails
async fn test_connection(pool: &PgPool) -> Result<(), SqlxError> {
    tracing::debug!("Testing database connection...");

    sqlx::query("SELECT 1")
        .execute(pool)
        .await?;

    tracing::info!("Database connection test successful");
    Ok(())
}

/// Set PostgreSQL row-level security session variables
///
/// These variables are required for row-level security policies to work correctly.
/// They should be set at the beginning of each transaction or request.
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `user_id` - UUID of the current authenticated user
/// * `user_role` - Role of the current user (ADMIN or DOCTOR)
///
/// # Errors
///
/// Returns an error if setting the session variables fails
pub async fn set_rls_context(
    pool: &PgPool,
    user_id: &uuid::Uuid,
    user_role: &str,
) -> Result<(), SqlxError> {
    sqlx::query("SET LOCAL app.current_user_id = $1")
        .bind(user_id.to_string())
        .execute(pool)
        .await?;

    sqlx::query("SET LOCAL app.current_user_role = $1")
        .bind(user_role)
        .execute(pool)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    /// Helper function to create test database config
    fn test_db_config() -> DatabaseConfig {
        DatabaseConfig {
            url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://mpms_user:dev_password_change_in_production@localhost:5432/mpms_dev".to_string()),
            max_connections: 5,
            min_connections: 1,
            acquire_timeout: Duration::from_secs(5),
            idle_timeout: Duration::from_secs(60),
            max_lifetime: Duration::from_secs(300),
        }
    }

    #[tokio::test]
    #[ignore] // Requires database to be running
    async fn test_create_pool_success() {
        let config = test_db_config();
        let result = create_pool(&config).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires database to be running
    async fn test_connection_test() {
        let config = test_db_config();
        let pool = create_pool(&config).await.unwrap();
        let result = test_connection(&pool).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires database to be running
    async fn test_set_rls_context() {
        let config = test_db_config();
        let pool = create_pool(&config).await.unwrap();
        let user_id = uuid::Uuid::new_v4();
        let result = set_rls_context(&pool, &user_id, "DOCTOR").await;
        assert!(result.is_ok());
    }
}
