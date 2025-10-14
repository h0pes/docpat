-- Create system_settings table for application-wide configuration
-- Key-value store for system settings with grouping

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Setting identification
    setting_key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "clinic.name", "appointment.default_duration"
    setting_group VARCHAR(50) NOT NULL,        -- e.g., "clinic", "appointment", "notification", "security"
    setting_name VARCHAR(255) NOT NULL,        -- Human-readable name

    -- Setting value (stored as JSONB for flexibility)
    -- Can store: string, number, boolean, array, object
    setting_value JSONB NOT NULL,

    -- Value type hint for validation
    value_type VARCHAR(20) NOT NULL CHECK (
        value_type IN ('STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'ARRAY')
    ),

    -- Description and constraints
    description TEXT,
    default_value JSONB,  -- Default value if reset
    validation_rules JSONB,  -- JSON schema or validation rules

    -- Status
    is_public BOOLEAN DEFAULT false NOT NULL,  -- Whether setting is visible to non-admin users
    is_encrypted BOOLEAN DEFAULT false NOT NULL,  -- Whether value should be encrypted (for secrets)
    is_readonly BOOLEAN DEFAULT false NOT NULL,  -- Whether setting can be modified via UI

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_setting_key CHECK (setting_key ~ '^[a-z0-9_.]+$')  -- Only lowercase, numbers, dots, underscores
);

-- Indexes for performance
CREATE INDEX idx_system_settings_setting_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_setting_group ON system_settings(setting_group);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to prevent modification of readonly settings
CREATE OR REPLACE FUNCTION prevent_readonly_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_readonly = true AND (
        OLD.setting_value IS DISTINCT FROM NEW.setting_value OR
        OLD.is_readonly IS DISTINCT FROM NEW.is_readonly
    ) THEN
        RAISE EXCEPTION 'Cannot modify readonly setting: %', OLD.setting_key;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_readonly_modification
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION prevent_readonly_modification();

-- Comments for documentation
COMMENT ON TABLE system_settings IS 'System-wide configuration settings stored as key-value pairs';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique dot-notation key (e.g., clinic.name, appointment.default_duration)';
COMMENT ON COLUMN system_settings.setting_group IS 'Setting group for organization (clinic, appointment, notification, security)';
COMMENT ON COLUMN system_settings.setting_value IS 'Setting value stored as JSONB (supports any type)';
COMMENT ON COLUMN system_settings.value_type IS 'Type hint for value validation and parsing';
COMMENT ON COLUMN system_settings.is_public IS 'Whether setting is visible to non-admin users';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Whether value contains secrets and should be encrypted';
COMMENT ON COLUMN system_settings.is_readonly IS 'Whether setting can be modified via UI (prevents accidental changes)';

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_group, setting_name, setting_value, value_type, description, default_value, is_public, is_readonly) VALUES
-- Clinic Settings
('clinic.name', 'clinic', 'Clinic Name', '"Medical Practice"', 'STRING', 'Name of the medical practice', '"Medical Practice"', true, false),
('clinic.address', 'clinic', 'Clinic Address', '"123 Main St, City, State 12345"', 'STRING', 'Physical address of the clinic', '""', true, false),
('clinic.phone', 'clinic', 'Clinic Phone', '"+1-555-0100"', 'STRING', 'Main clinic phone number', '""', true, false),
('clinic.email', 'clinic', 'Clinic Email', '"info@clinic.com"', 'STRING', 'Main clinic email address', '""', true, false),
('clinic.timezone', 'clinic', 'Timezone', '"Europe/Rome"', 'STRING', 'Clinic timezone for appointments', '"Europe/Rome"', false, false),

-- Appointment Settings
('appointment.default_duration', 'appointment', 'Default Appointment Duration (minutes)', '30', 'INTEGER', 'Default duration for appointments in minutes', '30', false, false),
('appointment.booking_advance_days', 'appointment', 'Booking Advance (days)', '90', 'INTEGER', 'How many days in advance patients can book', '90', false, false),
('appointment.cancellation_hours', 'appointment', 'Cancellation Notice (hours)', '24', 'INTEGER', 'Minimum hours notice required for cancellation', '24', false, false),
('appointment.buffer_minutes', 'appointment', 'Buffer Between Appointments (minutes)', '0', 'INTEGER', 'Buffer time between appointments', '0', false, false),
('appointment.allow_double_booking', 'appointment', 'Allow Double Booking', 'false', 'BOOLEAN', 'Whether to allow double-booking appointments', 'false', false, false),

-- Notification Settings
('notification.reminder_hours_before', 'notification', 'Reminder Hours Before', '24', 'INTEGER', 'Hours before appointment to send reminder', '24', false, false),
('notification.email_enabled', 'notification', 'Email Notifications Enabled', 'false', 'BOOLEAN', 'Enable email notifications', 'false', false, false),
('notification.sms_enabled', 'notification', 'SMS Notifications Enabled', 'false', 'BOOLEAN', 'Enable SMS notifications', 'false', false, false),
('notification.whatsapp_enabled', 'notification', 'WhatsApp Notifications Enabled', 'false', 'BOOLEAN', 'Enable WhatsApp notifications', 'false', false, false),

-- Security Settings
('security.session_timeout_minutes', 'security', 'Session Timeout (minutes)', '30', 'INTEGER', 'Session inactivity timeout in minutes', '30', false, false),
('security.mfa_required', 'security', 'MFA Required', 'true', 'BOOLEAN', 'Require multi-factor authentication for all users', 'true', false, false),
('security.password_expiry_days', 'security', 'Password Expiry (days)', '90', 'INTEGER', 'Days until password expires (0 = never)', '90', false, false),
('security.max_login_attempts', 'security', 'Max Login Attempts', '5', 'INTEGER', 'Maximum failed login attempts before lockout', '5', false, false),
('security.lockout_duration_minutes', 'security', 'Lockout Duration (minutes)', '15', 'INTEGER', 'Duration of account lockout after max failed attempts', '15', false, false),

-- Backup Settings
('backup.enabled', 'backup', 'Automated Backups Enabled', 'true', 'BOOLEAN', 'Enable automated database backups', 'true', false, false),
('backup.retention_days', 'backup', 'Backup Retention (days)', '30', 'INTEGER', 'Days to retain backups', '30', false, false),
('backup.schedule', 'backup', 'Backup Schedule (cron)', '"0 2 * * *"', 'STRING', 'Cron expression for backup schedule', '"0 2 * * *"', false, false),

-- Localization Settings
('localization.default_language', 'localization', 'Default Language', '"it"', 'STRING', 'Default system language (it or en)', '"it"', true, false),
('localization.supported_languages', 'localization', 'Supported Languages', '["it", "en"]', 'ARRAY', 'List of supported languages', '["it", "en"]', true, true),
('localization.date_format', 'localization', 'Date Format', '"DD/MM/YYYY"', 'STRING', 'Date display format', '"DD/MM/YYYY"', false, false),
('localization.time_format', 'localization', 'Time Format', '"24h"', 'STRING', 'Time display format (12h or 24h)', '"24h"', false, false),

-- System Settings
('system.maintenance_mode', 'system', 'Maintenance Mode', 'false', 'BOOLEAN', 'Enable maintenance mode (blocks access)', 'false', true, false),
('system.maintenance_message', 'system', 'Maintenance Message', '"System is under maintenance. Please try again later."', 'STRING', 'Message to show during maintenance', '"System is under maintenance."', true, false)
ON CONFLICT (setting_key) DO NOTHING;
