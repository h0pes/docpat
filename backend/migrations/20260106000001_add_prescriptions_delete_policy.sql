-- Add DELETE policy for prescriptions table
-- This was missing from the original RLS configuration
-- Only ADMIN users can delete prescriptions (consistent with backend handler and frontend)

CREATE POLICY prescriptions_delete_policy ON prescriptions
    FOR DELETE
    USING (is_admin());

-- Also grant DELETE permission to mpms_user role
GRANT DELETE ON prescriptions TO mpms_user;

COMMENT ON POLICY prescriptions_delete_policy ON prescriptions IS 'Only administrators can delete prescriptions';
