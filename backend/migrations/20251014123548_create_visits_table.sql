-- Create visits table for clinical documentation with SOAP notes
-- NOTE: Partitioned by year for performance and retention management
-- All clinical data fields (🔒) must be encrypted at application layer

CREATE TABLE IF NOT EXISTS visits (
    id UUID DEFAULT gen_random_uuid(),

    -- References
    appointment_id UUID REFERENCES appointments(id),  -- Optional, can document visit without appointment
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Visit metadata
    visit_date DATE NOT NULL,
    visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visit_type VARCHAR(50) NOT NULL CHECK (
        visit_type IN ('NEW_PATIENT', 'FOLLOW_UP', 'URGENT', 'CONSULTATION', 'ROUTINE_CHECKUP', 'ACUPUNCTURE')
    ),

    -- Vitals (🔒 Encrypted as PHI)
    vitals JSONB,  -- 🔒 ENCRYPT
    -- Structure: {
    --   "blood_pressure_systolic": 120,
    --   "blood_pressure_diastolic": 80,
    --   "heart_rate": 72,
    --   "temperature_celsius": 36.6,
    --   "weight_kg": 75,
    --   "height_cm": 175,
    --   "oxygen_saturation": 98,
    --   "bmi": 24.5
    -- }

    -- SOAP Notes (🔒 All encrypted as PHI)
    subjective TEXT,      -- 🔒 ENCRYPT - Patient's description of symptoms
    objective TEXT,       -- 🔒 ENCRYPT - Provider's observations and findings
    assessment TEXT,      -- 🔒 ENCRYPT - Provider's diagnosis and evaluation
    plan TEXT,           -- 🔒 ENCRYPT - Treatment plan and next steps

    -- Additional clinical documentation (🔒 Encrypted)
    chief_complaint TEXT,      -- 🔒 ENCRYPT
    history_present_illness TEXT,  -- 🔒 ENCRYPT
    review_of_systems JSONB,   -- 🔒 ENCRYPT
    physical_exam TEXT,        -- 🔒 ENCRYPT
    clinical_notes TEXT,       -- 🔒 ENCRYPT - Additional notes

    -- Diagnoses stored in separate visit_diagnoses table
    -- Prescriptions stored in separate prescriptions table

    -- Status workflow: DRAFT → SIGNED → LOCKED
    status VARCHAR(20) DEFAULT 'DRAFT' NOT NULL CHECK (
        status IN ('DRAFT', 'SIGNED', 'LOCKED')
    ),

    -- Digital signature
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES users(id),
    signature_hash TEXT,  -- Hash of document content at signing time

    -- Version control
    version INT DEFAULT 1 NOT NULL,
    previous_version_id UUID,  -- Links to previous version if edited

    -- Auto-save tracking
    last_autosave_at TIMESTAMPTZ,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT,  -- 🔒 ENCRYPT

    -- Attachments/Documents
    has_attachments BOOLEAN DEFAULT false,
    attachment_urls TEXT[],  -- URLs to attached files

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_visit_date CHECK (visit_date <= CURRENT_DATE),
    CONSTRAINT valid_signature CHECK (
        (status IN ('SIGNED', 'LOCKED') AND signed_at IS NOT NULL AND signed_by IS NOT NULL) OR
        (status = 'DRAFT')
    ),
    CONSTRAINT valid_follow_up CHECK (
        (follow_up_required = true AND follow_up_date IS NOT NULL) OR
        (follow_up_required = false)
    ),

    -- Primary key includes visit_date for partitioning
    PRIMARY KEY (id, visit_date)
) PARTITION BY RANGE (visit_date);

-- Create initial partitions for current year and next 2 years
-- 2025
CREATE TABLE IF NOT EXISTS visits_2025 PARTITION OF visits
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- 2026
CREATE TABLE IF NOT EXISTS visits_2026 PARTITION OF visits
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- 2027
CREATE TABLE IF NOT EXISTS visits_2027 PARTITION OF visits
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Indexes for performance (created on parent table, automatically on partitions)
CREATE INDEX idx_visits_patient_id ON visits(patient_id, visit_date DESC);
CREATE INDEX idx_visits_provider_id ON visits(provider_id, visit_date DESC);
CREATE INDEX idx_visits_appointment_id ON visits(appointment_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_visit_date ON visits(visit_date DESC);
CREATE INDEX idx_visits_signed_by ON visits(signed_by);
CREATE INDEX idx_visits_follow_up ON visits(follow_up_required, follow_up_date) WHERE follow_up_required = true;

-- Composite indexes for common queries
CREATE INDEX idx_visits_patient_status ON visits(patient_id, status, visit_date DESC);
CREATE INDEX idx_visits_provider_date_status ON visits(provider_id, visit_date DESC, status);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to prevent editing signed/locked visits
CREATE OR REPLACE FUNCTION prevent_signed_visit_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow status transitions from DRAFT to SIGNED
    IF OLD.status = 'DRAFT' AND NEW.status = 'SIGNED' THEN
        RETURN NEW;
    END IF;

    -- Allow status transitions from SIGNED to LOCKED
    IF OLD.status = 'SIGNED' AND NEW.status = 'LOCKED' THEN
        RETURN NEW;
    END IF;

    -- Prevent any changes to SIGNED visits except locking
    IF OLD.status = 'SIGNED' AND NEW.status != 'LOCKED' THEN
        RAISE EXCEPTION 'Cannot modify signed visit. Create a new version or lock it.';
    END IF;

    -- Prevent any changes to LOCKED visits
    IF OLD.status = 'LOCKED' THEN
        RAISE EXCEPTION 'Cannot modify locked visit. Visit is permanently locked.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_signed_modification
    BEFORE UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION prevent_signed_visit_modification();

-- Trigger to validate status transitions
CREATE OR REPLACE FUNCTION validate_visit_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- DRAFT can go to: SIGNED
    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'SIGNED') THEN
        RAISE EXCEPTION 'Invalid status transition from DRAFT to %. Must sign first.', NEW.status;
    END IF;

    -- SIGNED can go to: LOCKED
    IF OLD.status = 'SIGNED' AND NEW.status NOT IN ('SIGNED', 'LOCKED') THEN
        RAISE EXCEPTION 'Invalid status transition from SIGNED to %. Can only lock.', NEW.status;
    END IF;

    -- LOCKED is final
    IF OLD.status = 'LOCKED' AND NEW.status != 'LOCKED' THEN
        RAISE EXCEPTION 'Cannot change status from LOCKED';
    END IF;

    -- Auto-set signature fields when signing
    IF NEW.status = 'SIGNED' AND OLD.status != 'SIGNED' THEN
        IF NEW.signed_at IS NULL THEN
            NEW.signed_at := NOW();
        END IF;
        IF NEW.signed_by IS NULL THEN
            NEW.signed_by := NEW.updated_by;
        END IF;
        -- Generate signature hash from content using SHA-256 (cryptographically secure)
        IF NEW.signature_hash IS NULL THEN
            NEW.signature_hash := encode(
                digest(
                    COALESCE(NEW.subjective, '') ||
                    COALESCE(NEW.objective, '') ||
                    COALESCE(NEW.assessment, '') ||
                    COALESCE(NEW.plan, ''),
                    'sha256'
                ),
                'hex'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_visit_status
    BEFORE UPDATE ON visits
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_visit_status_transition();

-- Trigger to auto-increment version on edits (for draft only)
CREATE OR REPLACE FUNCTION increment_visit_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version for DRAFT visits when content changes
    IF NEW.status = 'DRAFT' AND (
        OLD.subjective IS DISTINCT FROM NEW.subjective OR
        OLD.objective IS DISTINCT FROM NEW.objective OR
        OLD.assessment IS DISTINCT FROM NEW.assessment OR
        OLD.plan IS DISTINCT FROM NEW.plan
    ) THEN
        NEW.version := OLD.version + 1;
        NEW.last_autosave_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_version
    BEFORE UPDATE ON visits
    FOR EACH ROW
    WHEN (OLD.status = 'DRAFT')
    EXECUTE FUNCTION increment_visit_version();

-- Comments for documentation
COMMENT ON TABLE visits IS 'Clinical visit documentation partitioned by year (all clinical data encrypted at application layer)';
COMMENT ON COLUMN visits.id IS 'Unique visit identifier (UUID)';
COMMENT ON COLUMN visits.visit_date IS 'Date of visit (used for partitioning)';
COMMENT ON COLUMN visits.vitals IS '🔒 ENCRYPTED - Vital signs as JSONB';
COMMENT ON COLUMN visits.subjective IS '🔒 ENCRYPTED - SOAP: Subjective (patient description)';
COMMENT ON COLUMN visits.objective IS '🔒 ENCRYPTED - SOAP: Objective (provider observations)';
COMMENT ON COLUMN visits.assessment IS '🔒 ENCRYPTED - SOAP: Assessment (diagnosis)';
COMMENT ON COLUMN visits.plan IS '🔒 ENCRYPTED - SOAP: Plan (treatment)';
COMMENT ON COLUMN visits.status IS 'Visit status: DRAFT → SIGNED → LOCKED';
COMMENT ON COLUMN visits.signed_at IS 'Timestamp when visit was digitally signed';
COMMENT ON COLUMN visits.signature_hash IS 'MD5 hash of SOAP notes at signing time for integrity';
COMMENT ON COLUMN visits.version IS 'Version number for draft tracking (increments on each edit)';
COMMENT ON COLUMN visits.last_autosave_at IS 'Last auto-save timestamp for draft recovery';
