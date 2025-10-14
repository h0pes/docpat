-- Configure PostgreSQL Row-Level Security (RLS) for HIPAA compliance
-- RLS ensures users can only access data they're authorized to see
-- This is critical for multi-tenant isolation and data protection

-- ====================
-- ENABLE ROW LEVEL SECURITY
-- ====================

-- Enable RLS on all sensitive tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================
-- HELPER FUNCTIONS FOR RLS
-- ====================

-- Function to get current user's ID from session variable
-- Set in application: SET LOCAL app.current_user_id = '<uuid>';
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if current user is admin
-- Set in application: SET LOCAL app.current_user_role = 'ADMIN';
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_role', TRUE) = 'ADMIN';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if current user is a doctor/provider
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_role', TRUE) IN ('ADMIN', 'DOCTOR');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ====================
-- RLS POLICIES: PATIENTS
-- ====================

-- Allow doctors to see all active patients
CREATE POLICY patients_select_policy ON patients
    FOR SELECT
    USING (is_doctor());

-- Allow doctors to insert new patients
CREATE POLICY patients_insert_policy ON patients
    FOR INSERT
    WITH CHECK (is_doctor());

-- Allow doctors to update patients
CREATE POLICY patients_update_policy ON patients
    FOR UPDATE
    USING (is_doctor())
    WITH CHECK (is_doctor());

-- Only admins can delete/deactivate patients
CREATE POLICY patients_delete_policy ON patients
    FOR DELETE
    USING (is_admin());

-- ====================
-- RLS POLICIES: PATIENT_INSURANCE
-- ====================

-- Doctors can see insurance for any patient
CREATE POLICY patient_insurance_select_policy ON patient_insurance
    FOR SELECT
    USING (is_doctor());

-- Doctors can add/update insurance
CREATE POLICY patient_insurance_insert_policy ON patient_insurance
    FOR INSERT
    WITH CHECK (is_doctor());

CREATE POLICY patient_insurance_update_policy ON patient_insurance
    FOR UPDATE
    USING (is_doctor())
    WITH CHECK (is_doctor());

-- ====================
-- RLS POLICIES: APPOINTMENTS
-- ====================

-- Doctors can see all appointments
CREATE POLICY appointments_select_policy ON appointments
    FOR SELECT
    USING (is_doctor());

-- Doctors can create appointments
CREATE POLICY appointments_insert_policy ON appointments
    FOR INSERT
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- Doctors can only update their own appointments
CREATE POLICY appointments_update_policy ON appointments
    FOR UPDATE
    USING (is_doctor() AND provider_id = get_current_user_id())
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- Doctors can only delete their own appointments
CREATE POLICY appointments_delete_policy ON appointments
    FOR DELETE
    USING (is_doctor() AND provider_id = get_current_user_id());

-- ====================
-- RLS POLICIES: VISITS
-- ====================

-- Doctors can see all visits
CREATE POLICY visits_select_policy ON visits
    FOR SELECT
    USING (is_doctor());

-- Doctors can create visits for their appointments
CREATE POLICY visits_insert_policy ON visits
    FOR INSERT
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- Doctors can only update their own draft/signed visits
-- Locked visits cannot be updated (enforced by trigger)
CREATE POLICY visits_update_policy ON visits
    FOR UPDATE
    USING (is_doctor() AND provider_id = get_current_user_id())
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- Only admins can delete visits
CREATE POLICY visits_delete_policy ON visits
    FOR DELETE
    USING (is_admin());

-- ====================
-- RLS POLICIES: VISIT_DIAGNOSES
-- ====================

-- Doctors can see all diagnoses
CREATE POLICY visit_diagnoses_select_policy ON visit_diagnoses
    FOR SELECT
    USING (is_doctor());

-- Doctors can add diagnoses
CREATE POLICY visit_diagnoses_insert_policy ON visit_diagnoses
    FOR INSERT
    WITH CHECK (is_doctor());

-- Doctors can update diagnoses
CREATE POLICY visit_diagnoses_update_policy ON visit_diagnoses
    FOR UPDATE
    USING (is_doctor())
    WITH CHECK (is_doctor());

-- ====================
-- RLS POLICIES: PRESCRIPTIONS
-- ====================

-- Doctors can see all prescriptions
CREATE POLICY prescriptions_select_policy ON prescriptions
    FOR SELECT
    USING (is_doctor());

-- Doctors can create prescriptions for their patients
CREATE POLICY prescriptions_insert_policy ON prescriptions
    FOR INSERT
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- Doctors can only update their own prescriptions
CREATE POLICY prescriptions_update_policy ON prescriptions
    FOR UPDATE
    USING (is_doctor() AND provider_id = get_current_user_id())
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- ====================
-- RLS POLICIES: GENERATED_DOCUMENTS
-- ====================

-- Doctors can see all documents
CREATE POLICY generated_documents_select_policy ON generated_documents
    FOR SELECT
    USING (is_doctor());

-- Doctors can generate documents for their patients
CREATE POLICY generated_documents_insert_policy ON generated_documents
    FOR INSERT
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- Doctors can update documents they created
CREATE POLICY generated_documents_update_policy ON generated_documents
    FOR UPDATE
    USING (is_doctor() AND provider_id = get_current_user_id())
    WITH CHECK (is_doctor() AND provider_id = get_current_user_id());

-- ====================
-- RLS POLICIES: AUDIT_LOGS
-- ====================

-- Only admins can view audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
    FOR SELECT
    USING (is_admin());

-- System can insert audit logs (application level)
-- Note: Audit logs are insert-only, no updates/deletes allowed
CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (TRUE);  -- Allow all authenticated users to create audit logs

-- Prevent updates and deletes (enforced by trigger too)
-- No update/delete policies = no one can update/delete

-- ====================
-- FORCE RLS FOR OWNERS
-- ====================

-- Force RLS even for table owners (mpms_user)
-- This ensures RLS is always enforced, even in admin contexts
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE visits FORCE ROW LEVEL SECURITY;
ALTER TABLE visit_diagnoses FORCE ROW LEVEL SECURITY;
ALTER TABLE prescriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE generated_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- ====================
-- GRANT NECESSARY PERMISSIONS
-- ====================

-- Grant basic usage to application role
GRANT USAGE ON SCHEMA public TO mpms_user;

-- Grant SELECT permissions on tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mpms_user;

-- Grant INSERT/UPDATE permissions on tables
GRANT INSERT, UPDATE ON patients, patient_insurance, appointments, visits,
    visit_diagnoses, prescriptions, generated_documents TO mpms_user;

-- Grant INSERT-only on audit_logs
GRANT INSERT ON audit_logs TO mpms_user;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mpms_user;

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================

COMMENT ON FUNCTION get_current_user_id() IS 'Returns current user ID from session variable app.current_user_id';
COMMENT ON FUNCTION is_admin() IS 'Checks if current user has ADMIN role from session variable app.current_user_role';
COMMENT ON FUNCTION is_doctor() IS 'Checks if current user has DOCTOR or ADMIN role';

-- ====================
-- USAGE INSTRUCTIONS
-- ====================

-- In your Rust application, before executing queries, set session variables:
--
-- conn.execute("SET LOCAL app.current_user_id = $1", &[&user_id]).await?;
-- conn.execute("SET LOCAL app.current_user_role = $1", &[&user_role]).await?;
--
-- These settings are transaction-scoped (LOCAL), so they reset after transaction ends.
-- This ensures proper isolation between different user requests.

-- Example in SQLx:
--
-- let user_id = "123e4567-e89b-12d3-a456-426614174000";
-- let user_role = "DOCTOR";
--
-- sqlx::query("SET LOCAL app.current_user_id = $1")
--     .bind(user_id)
--     .execute(&mut *tx)
--     .await?;
--
-- sqlx::query("SET LOCAL app.current_user_role = $1")
--     .bind(user_role)
--     .execute(&mut *tx)
--     .await?;
--
-- // Now all subsequent queries in this transaction will be filtered by RLS
-- let patients = sqlx::query_as::<_, Patient>("SELECT * FROM patients")
--     .fetch_all(&mut *tx)
--     .await?;
