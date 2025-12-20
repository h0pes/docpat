-- Fix RLS on audit_logs partitions and parent table
--
-- Problem 1: RLS policies on parent partitioned table don't automatically
-- apply to child partitions. The partitions have RLS enabled but no policies,
-- which blocks all access by default.
--
-- Problem 2: FORCE ROW LEVEL SECURITY on the parent table blocks INSERT
-- operations even when the INSERT policy has WITH CHECK (TRUE), due to
-- interaction with partitioning.
--
-- Solution:
-- 1. Disable RLS on partitions
-- 2. Remove FORCE RLS from parent (keep RLS enabled for SELECT protection)
--
-- Security consideration: audit_logs are INSERT-only from application.
-- RLS SELECT policy (is_admin) still protects reads. No need to FORCE RLS
-- for the table owner since all inserts come from the application.

-- Disable RLS on existing partitions
ALTER TABLE audit_logs_202510 DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_202511 DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_202512 DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_202601 DISABLE ROW LEVEL SECURITY;

-- Remove FORCE RLS from parent table to allow application INSERTs
-- (RLS is still enabled, just not forced for table owner)
ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY;

-- Add comment explaining the design decision
COMMENT ON TABLE audit_logs IS 'Immutable audit trail - RLS enabled (not forced) to allow app inserts while protecting reads';
COMMENT ON TABLE audit_logs_202510 IS 'October 2025 partition - RLS disabled, use parent table for access control';
COMMENT ON TABLE audit_logs_202511 IS 'November 2025 partition - RLS disabled, use parent table for access control';
COMMENT ON TABLE audit_logs_202512 IS 'December 2025 partition - RLS disabled, use parent table for access control';
COMMENT ON TABLE audit_logs_202601 IS 'January 2026 partition - RLS disabled, use parent table for access control';

-- Note: Future partitions should be created WITHOUT RLS enabled.
-- Example for creating new partitions:
-- CREATE TABLE audit_logs_YYYYMM PARTITION OF audit_logs
--     FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');
-- (No need to explicitly disable RLS if not enabled during creation)
