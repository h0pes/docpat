/*!
 * Session Timeout Middleware
 *
 * Tracks user activity and enforces inactivity-based session timeouts.
 * Sessions are invalidated after 30 minutes of inactivity.
 */

use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use crate::utils::AppError;

/// Session activity tracker
#[derive(Clone)]
pub struct SessionManager {
    /// Map of user_id to last activity timestamp
    sessions: Arc<RwLock<HashMap<Uuid, DateTime<Utc>>>>,
    /// Inactivity timeout in seconds
    timeout_seconds: i64,
}

impl SessionManager {
    /// Create a new session manager
    ///
    /// # Arguments
    ///
    /// * `timeout_seconds` - Number of seconds before a session is considered inactive
    pub fn new(timeout_seconds: i64) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            timeout_seconds,
        }
    }

    /// Track activity for a user
    ///
    /// # Arguments
    ///
    /// * `user_id` - UUID of the user
    ///
    /// Updates the last activity timestamp to now
    pub fn track_activity(&self, user_id: &Uuid) {
        let mut sessions = self.sessions.write().unwrap();
        sessions.insert(*user_id, Utc::now());
    }

    /// Check if a user's session is active
    ///
    /// # Arguments
    ///
    /// * `user_id` - UUID of the user
    ///
    /// # Returns
    ///
    /// `true` if session is active (within timeout), `false` otherwise
    pub fn is_session_active(&self, user_id: &Uuid) -> bool {
        let sessions = self.sessions.read().unwrap();

        if let Some(last_activity) = sessions.get(user_id) {
            let now = Utc::now();
            let inactive_duration = now.signed_duration_since(*last_activity);
            inactive_duration < Duration::seconds(self.timeout_seconds)
        } else {
            // No session found - not active
            false
        }
    }

    /// Invalidate a user's session
    ///
    /// # Arguments
    ///
    /// * `user_id` - UUID of the user
    pub fn invalidate_session(&self, user_id: &Uuid) {
        let mut sessions = self.sessions.write().unwrap();
        sessions.remove(user_id);
    }

    /// Clean up expired sessions (call periodically)
    ///
    /// Removes sessions that have been inactive for longer than the timeout
    pub fn cleanup_expired_sessions(&self) {
        let mut sessions = self.sessions.write().unwrap();
        let now = Utc::now();
        let timeout = Duration::seconds(self.timeout_seconds);

        sessions.retain(|_, last_activity| {
            now.signed_duration_since(*last_activity) < timeout
        });
    }

    /// Get count of active sessions
    pub fn active_session_count(&self) -> usize {
        let sessions = self.sessions.read().unwrap();
        sessions.len()
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        // Default to 30 minutes (1800 seconds)
        Self::new(1800)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration as StdDuration;

    #[test]
    fn test_track_activity() {
        let manager = SessionManager::new(1800);
        let user_id = Uuid::new_v4();

        // Initially no session
        assert!(!manager.is_session_active(&user_id));

        // Track activity
        manager.track_activity(&user_id);

        // Now session is active
        assert!(manager.is_session_active(&user_id));
    }

    #[test]
    fn test_session_timeout() {
        let manager = SessionManager::new(1); // 1 second timeout
        let user_id = Uuid::new_v4();

        // Track activity
        manager.track_activity(&user_id);
        assert!(manager.is_session_active(&user_id));

        // Wait for timeout
        sleep(StdDuration::from_secs(2));

        // Session should be inactive
        assert!(!manager.is_session_active(&user_id));
    }

    #[test]
    fn test_invalidate_session() {
        let manager = SessionManager::new(1800);
        let user_id = Uuid::new_v4();

        // Track activity
        manager.track_activity(&user_id);
        assert!(manager.is_session_active(&user_id));

        // Invalidate
        manager.invalidate_session(&user_id);
        assert!(!manager.is_session_active(&user_id));
    }

    #[test]
    fn test_cleanup_expired_sessions() {
        let manager = SessionManager::new(1); // 1 second timeout
        let user1 = Uuid::new_v4();
        let user2 = Uuid::new_v4();

        // Track activity for both users
        manager.track_activity(&user1);
        manager.track_activity(&user2);
        assert_eq!(manager.active_session_count(), 2);

        // Wait for timeout
        sleep(StdDuration::from_secs(2));

        // Cleanup expired sessions
        manager.cleanup_expired_sessions();
        assert_eq!(manager.active_session_count(), 0);
    }

    #[test]
    fn test_multiple_users() {
        let manager = SessionManager::new(1800);
        let user1 = Uuid::new_v4();
        let user2 = Uuid::new_v4();

        // Track activity for both
        manager.track_activity(&user1);
        manager.track_activity(&user2);

        assert!(manager.is_session_active(&user1));
        assert!(manager.is_session_active(&user2));
        assert_eq!(manager.active_session_count(), 2);

        // Invalidate one
        manager.invalidate_session(&user1);
        assert!(!manager.is_session_active(&user1));
        assert!(manager.is_session_active(&user2));
        assert_eq!(manager.active_session_count(), 1);
    }
}
