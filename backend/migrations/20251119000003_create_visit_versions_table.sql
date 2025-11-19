-- Create visit_versions table for visit note version history
-- Automatically captures snapshots of visit data on every update

CREATE TABLE IF NOT EXISTS visit_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to the visit
    -- NOTE: No FK constraint because visits table is partitioned with composite PK (id, visit_date)
    -- Application layer ensures referential integrity
    visit_id UUID NOT NULL,

    -- Version tracking
    version_number INT NOT NULL,

    -- Snapshot of visit data at this version (JSONB)
    -- Contains the complete visit object before the update was applied
    -- Structure mirrors the Visit model with all fields serialized
    visit_data JSONB NOT NULL,

    -- Change metadata
    changed_by UUID NOT NULL,  -- User who made the change (no FK due to partitioned visits table)
    change_reason TEXT,  -- Optional description of what changed

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure unique version numbers per visit
    UNIQUE(visit_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_visit_versions_visit_id ON visit_versions(visit_id, version_number DESC);
CREATE INDEX idx_visit_versions_changed_by ON visit_versions(changed_by);
CREATE INDEX idx_visit_versions_created_at ON visit_versions(created_at DESC);

-- GIN index for JSONB queries (if needed for searching within historical data)
CREATE INDEX idx_visit_versions_visit_data ON visit_versions USING GIN (visit_data);

-- Comments for documentation
COMMENT ON TABLE visit_versions IS 'Version history for visit notes - captures snapshots on every update';
COMMENT ON COLUMN visit_versions.visit_id IS 'Reference to the visit being versioned';
COMMENT ON COLUMN visit_versions.version_number IS 'Sequential version number (1, 2, 3, ...)';
COMMENT ON COLUMN visit_versions.visit_data IS 'Complete snapshot of visit data before update (JSONB)';
COMMENT ON COLUMN visit_versions.changed_by IS 'User who made the change that created this version';
COMMENT ON COLUMN visit_versions.change_reason IS 'Optional description of what changed';
