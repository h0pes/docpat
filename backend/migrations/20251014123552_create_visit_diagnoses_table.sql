-- Create visit_diagnoses table to link visits with ICD-10 diagnosis codes
-- Supports multiple diagnoses per visit with primary diagnosis designation

CREATE TABLE IF NOT EXISTS visit_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    visit_id UUID NOT NULL,
    visit_date DATE NOT NULL,  -- Required for partition key in visits table
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,

    -- Foreign key to visits table (includes visit_date for partitioning)
    FOREIGN KEY (visit_id, visit_date) REFERENCES visits(id, visit_date) ON DELETE CASCADE,

    -- ICD-10 Diagnosis Code
    icd10_code VARCHAR(10) NOT NULL,  -- e.g., "I10", "E11.9"
    icd10_description TEXT NOT NULL,  -- e.g., "Essential (primary) hypertension"

    -- Diagnosis details
    is_primary BOOLEAN DEFAULT false NOT NULL,  -- Primary diagnosis for this visit
    diagnosis_type VARCHAR(20) CHECK (diagnosis_type IN ('PROVISIONAL', 'CONFIRMED', 'DIFFERENTIAL', 'RULE_OUT')),

    -- Clinical notes (🔒 Encrypted)
    clinical_notes TEXT,  -- 🔒 ENCRYPT - Additional notes about this diagnosis

    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Whether diagnosis is still active
    resolved_date DATE,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT unique_visit_diagnosis UNIQUE (visit_id, icd10_code),
    CONSTRAINT valid_resolved_date CHECK (resolved_date IS NULL OR resolved_date >= visit_date)
);

-- Indexes for performance
CREATE INDEX idx_visit_diagnoses_visit_id ON visit_diagnoses(visit_id, visit_date);
CREATE INDEX idx_visit_diagnoses_patient_id ON visit_diagnoses(patient_id);
CREATE INDEX idx_visit_diagnoses_icd10_code ON visit_diagnoses(icd10_code);
CREATE INDEX idx_visit_diagnoses_is_primary ON visit_diagnoses(is_primary) WHERE is_primary = true;
CREATE INDEX idx_visit_diagnoses_is_active ON visit_diagnoses(is_active) WHERE is_active = true;
CREATE INDEX idx_visit_diagnoses_patient_active ON visit_diagnoses(patient_id, is_active) WHERE is_active = true;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_visit_diagnoses_updated_at
    BEFORE UPDATE ON visit_diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure only one primary diagnosis per visit
CREATE OR REPLACE FUNCTION validate_primary_diagnosis()
RETURNS TRIGGER AS $$
BEGIN
    -- When setting as primary, unset other primary diagnoses for this visit
    IF NEW.is_primary = true THEN
        UPDATE visit_diagnoses
        SET is_primary = false
        WHERE visit_id = NEW.visit_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_primary_diagnosis
    BEFORE INSERT OR UPDATE ON visit_diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION validate_primary_diagnosis();

-- Comments for documentation
COMMENT ON TABLE visit_diagnoses IS 'Links visits to ICD-10 diagnosis codes (supports multiple diagnoses per visit)';
COMMENT ON COLUMN visit_diagnoses.id IS 'Unique diagnosis record identifier';
COMMENT ON COLUMN visit_diagnoses.visit_id IS 'Reference to visit';
COMMENT ON COLUMN visit_diagnoses.visit_date IS 'Visit date (required for partitioned foreign key)';
COMMENT ON COLUMN visit_diagnoses.icd10_code IS 'ICD-10 diagnosis code (e.g., I10, E11.9)';
COMMENT ON COLUMN visit_diagnoses.icd10_description IS 'Human-readable diagnosis description';
COMMENT ON COLUMN visit_diagnoses.is_primary IS 'Whether this is the primary diagnosis for the visit';
COMMENT ON COLUMN visit_diagnoses.is_active IS 'Whether this diagnosis is currently active for the patient';
COMMENT ON COLUMN visit_diagnoses.clinical_notes IS '🔒 ENCRYPTED - Additional clinical notes about this diagnosis';
