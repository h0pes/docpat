-- Create prescription_templates table for reusable medication regimens
-- Templates allow doctors to quickly prescribe common medication combinations

CREATE TABLE IF NOT EXISTS prescription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template metadata
    template_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Medications (JSONB array - not encrypted as these are templates, not patient data)
    -- Example structure:
    -- [
    --   {
    --     "medication_name": "Lisinopril",
    --     "generic_name": "Lisinopril",
    --     "dosage": "10mg",
    --     "form": "TABLET",
    --     "route": "ORAL",
    --     "frequency": "Once daily",
    --     "duration": "30 days",
    --     "quantity": 30,
    --     "refills": 3,
    --     "instructions": "Take in the morning"
    --   }
    -- ]
    medications JSONB NOT NULL,

    -- Validation constraint - medications must be a non-empty array
    CONSTRAINT medications_not_empty CHECK (jsonb_array_length(medications) > 0),

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
CREATE INDEX idx_prescription_templates_created_by ON prescription_templates(created_by);
CREATE INDEX idx_prescription_templates_is_active ON prescription_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_prescription_templates_template_name ON prescription_templates(template_name);

-- Composite index for common query: get active templates for a user
CREATE INDEX idx_prescription_templates_user_active ON prescription_templates(created_by, is_active) WHERE is_active = true;

-- GIN index for JSONB medication search (if needed for advanced queries)
CREATE INDEX idx_prescription_templates_medications ON prescription_templates USING GIN (medications);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_prescription_templates_updated_at
    BEFORE UPDATE ON prescription_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE prescription_templates IS 'Reusable prescription templates for common medication regimens';
COMMENT ON COLUMN prescription_templates.template_name IS 'User-facing template name (e.g., "Hypertension Protocol", "Diabetes Standard")';
COMMENT ON COLUMN prescription_templates.medications IS 'Array of medication objects with dosage, frequency, etc. (not encrypted)';
COMMENT ON COLUMN prescription_templates.is_active IS 'Whether template is active and available for use';
COMMENT ON COLUMN prescription_templates.created_by IS 'User who created this template (templates are user-specific)';
