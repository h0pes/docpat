-- Add patient notification preferences and RLS policies for notification system
-- This migration extends the existing notification_queue table with RLS
-- and adds patient-specific notification preferences

-- ====================
-- PATIENT NOTIFICATION PREFERENCES
-- ====================

-- Create patient_notification_preferences table for per-patient settings
CREATE TABLE IF NOT EXISTS patient_notification_preferences (
    -- Primary key is patient_id (1:1 relationship)
    patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,

    -- Email preferences
    email_enabled BOOLEAN DEFAULT true NOT NULL,
    email_address_override VARCHAR(255), -- Optional: use different email than patient record

    -- Appointment reminder preferences
    reminder_enabled BOOLEAN DEFAULT true NOT NULL,
    reminder_days_before INT DEFAULT 1 NOT NULL CHECK (reminder_days_before BETWEEN 0 AND 7),

    -- Confirmation preferences
    confirmation_enabled BOOLEAN DEFAULT true NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quick lookups
CREATE INDEX idx_patient_notification_prefs_email_enabled
    ON patient_notification_preferences(email_enabled) WHERE email_enabled = true;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_patient_notification_preferences_updated_at
    BEFORE UPDATE ON patient_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE patient_notification_preferences IS 'Per-patient notification preferences for email reminders and confirmations';
COMMENT ON COLUMN patient_notification_preferences.patient_id IS 'Reference to patient - 1:1 relationship';
COMMENT ON COLUMN patient_notification_preferences.email_enabled IS 'Whether the patient wants to receive email notifications';
COMMENT ON COLUMN patient_notification_preferences.email_address_override IS 'Optional: alternative email for notifications (uses patient email if null)';
COMMENT ON COLUMN patient_notification_preferences.reminder_enabled IS 'Whether to send appointment reminders';
COMMENT ON COLUMN patient_notification_preferences.reminder_days_before IS 'Days before appointment to send reminder (0-7)';
COMMENT ON COLUMN patient_notification_preferences.confirmation_enabled IS 'Whether to send appointment confirmation emails';

-- ====================
-- ADD CREATED_BY TO NOTIFICATION_QUEUE (if not exists)
-- ====================

-- Add created_by column if it doesn't exist (for tracking who queued the notification)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notification_queue' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE notification_queue
        ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ====================
-- ENABLE RLS ON NOTIFICATION TABLES
-- ====================

-- Enable RLS on notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue FORCE ROW LEVEL SECURITY;

-- Enable RLS on patient_notification_preferences
ALTER TABLE patient_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notification_preferences FORCE ROW LEVEL SECURITY;

-- ====================
-- RLS POLICIES: NOTIFICATION_QUEUE
-- ====================

-- Doctors and admins can view all notifications
CREATE POLICY notification_queue_select_policy ON notification_queue
    FOR SELECT
    USING (is_doctor());

-- Doctors and admins can create notifications
CREATE POLICY notification_queue_insert_policy ON notification_queue
    FOR INSERT
    WITH CHECK (is_doctor());

-- Doctors and admins can update notifications (e.g., cancel, retry)
CREATE POLICY notification_queue_update_policy ON notification_queue
    FOR UPDATE
    USING (is_doctor())
    WITH CHECK (is_doctor());

-- Only admins can delete notifications (though usually we just cancel them)
CREATE POLICY notification_queue_delete_policy ON notification_queue
    FOR DELETE
    USING (is_admin());

-- ====================
-- RLS POLICIES: PATIENT_NOTIFICATION_PREFERENCES
-- ====================

-- Doctors and admins can view all patient preferences
CREATE POLICY patient_notification_prefs_select_policy ON patient_notification_preferences
    FOR SELECT
    USING (is_doctor());

-- Doctors and admins can insert patient preferences
CREATE POLICY patient_notification_prefs_insert_policy ON patient_notification_preferences
    FOR INSERT
    WITH CHECK (is_doctor());

-- Doctors and admins can update patient preferences
CREATE POLICY patient_notification_prefs_update_policy ON patient_notification_preferences
    FOR UPDATE
    USING (is_doctor())
    WITH CHECK (is_doctor());

-- Only admins can delete patient preferences
CREATE POLICY patient_notification_prefs_delete_policy ON patient_notification_preferences
    FOR DELETE
    USING (is_admin());

-- ====================
-- GRANT PERMISSIONS
-- ====================

-- Grant permissions on notification_queue
GRANT SELECT, INSERT, UPDATE ON notification_queue TO mpms_user;

-- Grant permissions on patient_notification_preferences
GRANT SELECT, INSERT, UPDATE ON patient_notification_preferences TO mpms_user;

-- ====================
-- HELPER FUNCTION: GET EFFECTIVE EMAIL FOR PATIENT
-- ====================

-- Function to get the effective email address for a patient's notifications
-- Uses preference override if set, otherwise falls back to patient email
CREATE OR REPLACE FUNCTION get_patient_notification_email(p_patient_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_email VARCHAR;
BEGIN
    -- First check for override in preferences
    SELECT email_address_override INTO v_email
    FROM patient_notification_preferences
    WHERE patient_id = p_patient_id
    AND email_address_override IS NOT NULL
    AND email_address_override != '';

    -- If no override, get from patient record
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM patients
        WHERE id = p_patient_id;
    END IF;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_patient_notification_email(UUID) IS
    'Returns the effective email for patient notifications (preference override or patient email)';
