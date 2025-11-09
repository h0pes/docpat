/*!
 * Database Module
 *
 * Handles PostgreSQL database connection pooling and provides
 * database access utilities.
 */

pub mod pool;

pub use pool::{create_pool, set_rls_context};
