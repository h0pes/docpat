-- Migration: Add Scheduler Settings for Notification Automation
-- Date: 2026-01-13
-- Milestone 15, Phase 5.1

-- Add scheduler-related settings to system_settings table
INSERT INTO system_settings (
    setting_key, setting_group, setting_name, setting_value,
    value_type, description, default_value, is_public, is_encrypted, is_readonly
) VALUES
(
    'scheduler_reminder_time',
    'notification',
    'Scheduler Reminder Time',
    '"08:00"',
    'STRING',
    'Time of day (HH:MM format, 24-hour) when automatic appointment reminders are sent. Default is 8:00 AM.',
    '"08:00"',
    false,
    false,
    false
),
(
    'scheduler_enabled',
    'notification',
    'Scheduler Enabled',
    'true',
    'BOOLEAN',
    'Enable or disable the automatic notification scheduler. When disabled, no automatic reminders will be sent.',
    'true',
    false,
    false,
    false
),
(
    'scheduler_batch_size',
    'notification',
    'Scheduler Batch Size',
    '50',
    'INTEGER',
    'Maximum number of notifications to process per scheduler run. Prevents overwhelming the email service.',
    '50',
    false,
    false,
    false
),
(
    'scheduler_retry_failed_enabled',
    'notification',
    'Auto-Retry Failed Notifications',
    'true',
    'BOOLEAN',
    'Automatically retry failed notifications during scheduler runs. If disabled, failed notifications must be retried manually.',
    'true',
    false,
    false,
    false
)
ON CONFLICT (setting_key) DO NOTHING;

-- Down migration (for rollback)
-- DELETE FROM system_settings WHERE setting_key IN (
--     'scheduler_reminder_time',
--     'scheduler_enabled',
--     'scheduler_batch_size',
--     'scheduler_retry_failed_enabled'
-- );
