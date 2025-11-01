/*!
 * DocPat Backend - Library Interface
 *
 * This module exposes the backend application's internal modules
 * for use in integration tests and potential future use as a library.
 *
 * The actual binary entry point is in main.rs.
 */

// Public module declarations
pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod services;
pub mod utils;
