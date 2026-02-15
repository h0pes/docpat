-- Fix RLS SELECT policies to enforce provider-scoped access
--
-- Previously, SELECT policies on appointments, visits, prescriptions, and
-- generated_documents used only `is_doctor()`, allowing ANY doctor to read
-- ALL records. This was a HIPAA-violating horizontal access control failure.
--
-- This migration restricts doctor SELECT to own records only (via provider_id),
-- while preserving admin full visibility.
--
-- Findings addressed: AUTHZ-VULN-03, AUTHZ-VULN-04, AUTHZ-VULN-05, AUTHZ-VULN-06
-- (Chapter 2 items 2.1, 2.2, 2.3, 2.4 of CONSOLIDATED_SECURITY_ASSESSMENT.md)
--
-- Architecture: Patients remain shared (any doctor can view/edit any patient).
-- Clinical data (appointments, visits, prescriptions, documents) is provider-scoped.

-- ====================
-- APPOINTMENTS (AUTHZ-VULN-03)
-- ====================
DROP POLICY IF EXISTS appointments_select_policy ON appointments;
CREATE POLICY appointments_select_policy ON appointments
    FOR SELECT
    USING (
        is_admin()
        OR (is_doctor() AND provider_id = get_current_user_id())
    );

-- ====================
-- VISITS (AUTHZ-VULN-04)
-- ====================
DROP POLICY IF EXISTS visits_select_policy ON visits;
CREATE POLICY visits_select_policy ON visits
    FOR SELECT
    USING (
        is_admin()
        OR (is_doctor() AND provider_id = get_current_user_id())
    );

-- ====================
-- PRESCRIPTIONS (AUTHZ-VULN-05)
-- ====================
DROP POLICY IF EXISTS prescriptions_select_policy ON prescriptions;
CREATE POLICY prescriptions_select_policy ON prescriptions
    FOR SELECT
    USING (
        is_admin()
        OR (is_doctor() AND provider_id = get_current_user_id())
    );

-- ====================
-- GENERATED_DOCUMENTS (AUTHZ-VULN-06)
-- ====================
DROP POLICY IF EXISTS generated_documents_select_policy ON generated_documents;
CREATE POLICY generated_documents_select_policy ON generated_documents
    FOR SELECT
    USING (
        is_admin()
        OR (is_doctor() AND provider_id = get_current_user_id())
    );
