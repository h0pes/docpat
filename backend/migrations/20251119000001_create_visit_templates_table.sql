-- Create visit_templates table for reusable visit note templates
-- Templates allow doctors to quickly create visits with pre-filled SOAP sections

CREATE TABLE IF NOT EXISTS visit_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template metadata
    template_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- SOAP sections (encrypted for consistency with visit data)
    -- These are nullable - template may only define some sections
    subjective TEXT,  -- Encrypted clinical notes template
    objective TEXT,   -- Encrypted clinical notes template
    assessment TEXT,  -- Encrypted clinical notes template
    plan TEXT,        -- Encrypted clinical notes template

    -- Optional default vitals (JSONB - not encrypted as these are just defaults)
    -- Example: {"blood_pressure_systolic": 120, "blood_pressure_diastolic": 80}
    default_vitals JSONB,

    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Ownership - templates are user-specific
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_visit_templates_created_by ON visit_templates(created_by);
CREATE INDEX idx_visit_templates_is_active ON visit_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_visit_templates_template_name ON visit_templates(template_name);

-- Composite index for common query: get active templates for a user
CREATE INDEX idx_visit_templates_user_active ON visit_templates(created_by, is_active) WHERE is_active = true;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_visit_templates_updated_at
    BEFORE UPDATE ON visit_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE visit_templates IS 'Reusable visit note templates with pre-filled SOAP sections';
COMMENT ON COLUMN visit_templates.template_name IS 'User-facing template name (e.g., "Annual Checkup", "Follow-up Visit")';
COMMENT ON COLUMN visit_templates.subjective IS 'Encrypted subjective (S) section template text';
COMMENT ON COLUMN visit_templates.objective IS 'Encrypted objective (O) section template text';
COMMENT ON COLUMN visit_templates.assessment IS 'Encrypted assessment (A) section template text';
COMMENT ON COLUMN visit_templates.plan IS 'Encrypted plan (P) section template text';
COMMENT ON COLUMN visit_templates.default_vitals IS 'Optional default vital signs as JSON (not encrypted)';
COMMENT ON COLUMN visit_templates.is_active IS 'Whether template is active and available for use';
COMMENT ON COLUMN visit_templates.created_by IS 'User who created this template (templates are user-specific)';
