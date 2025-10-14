-- Create audit_logs table for HIPAA compliance and security tracking
-- This table records all access and modifications to medical data
-- NOTE: Partitioned by month for performance and retention management

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,  -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entity_type VARCHAR(50) NOT NULL,  -- PATIENT, VISIT, PRESCRIPTION, USER, etc.
    entity_id VARCHAR(100),

    -- Change tracking (stores before/after values for UPDATE actions)
    changes JSONB,

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id UUID,

    -- Timestamp (used for partitioning)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Primary key includes created_at for partitioning
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create initial partitions for current and next 3 months
-- October 2025
CREATE TABLE IF NOT EXISTS audit_logs_202510 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- November 2025
CREATE TABLE IF NOT EXISTS audit_logs_202511 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- December 2025
CREATE TABLE IF NOT EXISTS audit_logs_202512 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- January 2026
CREATE TABLE IF NOT EXISTS audit_logs_202601 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Security: Prevent updates and deletes on audit logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for HIPAA compliance';
