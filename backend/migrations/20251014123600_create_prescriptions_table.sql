-- Create prescriptions table for medication prescriptions
-- NOTE: All prescription data (🔒) must be encrypted at application layer as PHI

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    visit_id UUID,
    visit_date DATE,  -- Required for partitioned foreign key to visits
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Foreign key to visits table (optional - can prescribe without visit)
    FOREIGN KEY (visit_id, visit_date) REFERENCES visits(id, visit_date) ON DELETE SET NULL,

    -- Medication Information (🔒 Encrypted as PHI)
    medication_name TEXT NOT NULL,     -- 🔒 ENCRYPT - Brand name
    generic_name TEXT,                 -- 🔒 ENCRYPT - Generic name
    dosage TEXT NOT NULL,              -- 🔒 ENCRYPT - e.g., "10mg", "500mg"
    form VARCHAR(50),                  -- e.g., "Tablet", "Capsule", "Liquid", "Injection"
    route VARCHAR(50),                 -- e.g., "Oral", "Topical", "IV", "IM"

    -- Dosing Instructions (🔒 Encrypted as PHI)
    frequency TEXT NOT NULL,           -- 🔒 ENCRYPT - e.g., "Once daily", "Twice daily", "Every 8 hours"
    duration TEXT,                     -- 🔒 ENCRYPT - e.g., "7 days", "30 days", "Ongoing"
    quantity INT,                      -- Number of units prescribed
    refills INT DEFAULT 0 CHECK (refills >= 0 AND refills <= 12),

    -- Patient Instructions (🔒 Encrypted as PHI)
    instructions TEXT,                 -- 🔒 ENCRYPT - e.g., "Take with food", "Avoid alcohol"
    pharmacy_notes TEXT,               -- 🔒 ENCRYPT - Notes for pharmacist

    -- Prescription Metadata
    prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    end_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (
        status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'DISCONTINUED', 'ON_HOLD')
    ),
    discontinuation_reason TEXT,  -- 🔒 ENCRYPT
    discontinued_at TIMESTAMPTZ,
    discontinued_by UUID REFERENCES users(id),

    -- Refill Tracking
    refills_remaining INT,
    last_refill_date DATE,

    -- Drug Interaction Warnings (future enhancement)
    has_interactions BOOLEAN DEFAULT false,
    interaction_warnings JSONB,  -- Store interaction warnings as JSON

    -- E-Prescription (future enhancement)
    e_prescription_id VARCHAR(100),  -- External e-prescription system ID
    e_prescription_sent_at TIMESTAMPTZ,
    e_prescription_status VARCHAR(50),

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_prescription_dates CHECK (
        start_date IS NULL OR end_date IS NULL OR end_date >= start_date
    ),
    CONSTRAINT valid_prescribed_date CHECK (prescribed_date <= CURRENT_DATE),
    CONSTRAINT valid_discontinuation CHECK (
        (status = 'DISCONTINUED' AND discontinuation_reason IS NOT NULL AND discontinued_at IS NOT NULL) OR
        (status != 'DISCONTINUED')
    ),
    CONSTRAINT valid_refills_remaining CHECK (
        refills_remaining IS NULL OR (refills_remaining >= 0 AND refills_remaining <= refills)
    )
);

-- Indexes for performance
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id, prescribed_date DESC);
CREATE INDEX idx_prescriptions_provider_id ON prescriptions(provider_id, prescribed_date DESC);
CREATE INDEX idx_prescriptions_visit_id ON prescriptions(visit_id, visit_date);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_prescribed_date ON prescriptions(prescribed_date DESC);
CREATE INDEX idx_prescriptions_medication_name ON prescriptions(medication_name);  -- Encrypted, index on ciphertext
CREATE INDEX idx_prescriptions_e_prescription_id ON prescriptions(e_prescription_id);

-- Composite indexes for common queries
CREATE INDEX idx_prescriptions_patient_active ON prescriptions(patient_id, status) WHERE status IN ('ACTIVE', 'ON_HOLD');
CREATE INDEX idx_prescriptions_patient_status_date ON prescriptions(patient_id, status, prescribed_date DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to initialize refills_remaining
CREATE OR REPLACE FUNCTION initialize_refills_remaining()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.refills_remaining IS NULL THEN
        NEW.refills_remaining := NEW.refills;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_refills
    BEFORE INSERT ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION initialize_refills_remaining();

-- Trigger to auto-set discontinued_at when status changes to DISCONTINUED
CREATE OR REPLACE FUNCTION set_discontinued_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'DISCONTINUED' AND OLD.status != 'DISCONTINUED' AND NEW.discontinued_at IS NULL THEN
        NEW.discontinued_at := NOW();
        IF NEW.discontinued_by IS NULL THEN
            NEW.discontinued_by := NEW.updated_by;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_discontinued
    BEFORE UPDATE ON prescriptions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION set_discontinued_timestamp();

-- Trigger to validate refill tracking
CREATE OR REPLACE FUNCTION validate_refill_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_refill_date when refills_remaining decreases
    IF OLD.refills_remaining IS NOT NULL AND NEW.refills_remaining < OLD.refills_remaining THEN
        NEW.last_refill_date := CURRENT_DATE;
    END IF;

    -- Auto-complete prescription when refills exhausted
    IF NEW.refills_remaining = 0 AND NEW.status = 'ACTIVE' THEN
        NEW.status := 'COMPLETED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_refills
    BEFORE UPDATE ON prescriptions
    FOR EACH ROW
    WHEN (OLD.refills_remaining IS DISTINCT FROM NEW.refills_remaining)
    EXECUTE FUNCTION validate_refill_tracking();

-- Comments for documentation
COMMENT ON TABLE prescriptions IS 'Medication prescriptions (all medication data encrypted at application layer)';
COMMENT ON COLUMN prescriptions.id IS 'Unique prescription identifier';
COMMENT ON COLUMN prescriptions.visit_id IS 'Optional reference to visit where prescribed';
COMMENT ON COLUMN prescriptions.patient_id IS 'Reference to patient';
COMMENT ON COLUMN prescriptions.provider_id IS 'Reference to prescribing provider';
COMMENT ON COLUMN prescriptions.medication_name IS '🔒 ENCRYPTED - Brand name of medication';
COMMENT ON COLUMN prescriptions.generic_name IS '🔒 ENCRYPTED - Generic name of medication';
COMMENT ON COLUMN prescriptions.dosage IS '🔒 ENCRYPTED - Dosage (e.g., 10mg, 500mg)';
COMMENT ON COLUMN prescriptions.frequency IS '🔒 ENCRYPTED - Frequency of administration';
COMMENT ON COLUMN prescriptions.instructions IS '🔒 ENCRYPTED - Patient instructions';
COMMENT ON COLUMN prescriptions.status IS 'Prescription status: ACTIVE, COMPLETED, CANCELLED, DISCONTINUED, ON_HOLD';
COMMENT ON COLUMN prescriptions.refills_remaining IS 'Number of refills remaining (decrements on each refill)';
COMMENT ON COLUMN prescriptions.has_interactions IS 'Whether drug interactions were detected';
COMMENT ON COLUMN prescriptions.e_prescription_id IS 'External e-prescription system ID (future enhancement)';
