-- Update visits delete policy to allow doctors to delete their own DRAFT visits
-- This aligns RLS with RBAC permissions and business logic

-- Drop the old policy
DROP POLICY IF EXISTS visits_delete_policy ON visits;

-- Create new policy that allows:
-- 1. ADMINs to delete any visit
-- 2. DOCTORs to delete their own DRAFT visits (provider_id matches current_user_id)
CREATE POLICY visits_delete_policy ON visits
    FOR DELETE
    USING (
        is_admin()
        OR
        (is_doctor() AND provider_id = get_current_user_id() AND status = 'DRAFT')
    );
