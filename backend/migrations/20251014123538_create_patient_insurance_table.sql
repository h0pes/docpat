-- Create patient_insurance table for insurance information
-- NOTE: All insurance fields are sensitive PHI and must be encrypted at application layer
-- Fields marked with 🔒 require encryption

CREATE TABLE IF NOT EXISTS patient_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Patient reference
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    -- Insurance type (primary, secondary, tertiary)
    insurance_type VARCHAR(20) DEFAULT 'PRIMARY' NOT NULL CHECK (insurance_type IN ('PRIMARY', 'SECONDARY', 'TERTIARY')),

    -- Insurance Provider Information (🔒 Encrypted)
    provider_name TEXT NOT NULL,           -- 🔒 ENCRYPT (e.g., "Blue Cross Blue Shield")
    policy_number TEXT NOT NULL,           -- 🔒 ENCRYPT
    group_number TEXT,                     -- 🔒 ENCRYPT
    plan_name TEXT,                        -- 🔒 ENCRYPT

    -- Policyholder Information (🔒 Encrypted)
    policyholder_name TEXT,                -- 🔒 ENCRYPT (if different from patient)
    policyholder_relationship VARCHAR(20) CHECK (policyholder_relationship IN ('SELF', 'SPOUSE', 'PARENT', 'CHILD', 'OTHER')),
    policyholder_dob DATE,                 -- 🔒 ENCRYPT

    -- Coverage Details (🔒 Encrypted)
    effective_date DATE NOT NULL,
    expiration_date DATE,
    coverage_type VARCHAR(50),             -- e.g., "PPO", "HMO", "EPO"

    -- Contact Information (🔒 Encrypted)
    provider_phone VARCHAR(20),            -- 🔒 ENCRYPT
    provider_address JSONB,                -- 🔒 ENCRYPT (provider address as JSON)

    -- Additional Information
    notes TEXT,                            -- 🔒 ENCRYPT (additional insurance notes)

    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_effective_date CHECK (expiration_date IS NULL OR expiration_date >= effective_date),
    CONSTRAINT unique_patient_insurance_type UNIQUE (patient_id, insurance_type)
);

-- Indexes for performance
CREATE INDEX idx_patient_insurance_patient_id ON patient_insurance(patient_id);
CREATE INDEX idx_patient_insurance_policy_number ON patient_insurance(policy_number);  -- Encrypted, index on ciphertext
CREATE INDEX idx_patient_insurance_expiration_date ON patient_insurance(expiration_date);
CREATE INDEX idx_patient_insurance_is_active ON patient_insurance(is_active);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_patient_insurance_updated_at
    BEFORE UPDATE ON patient_insurance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to validate only one primary insurance
CREATE OR REPLACE FUNCTION validate_primary_insurance()
RETURNS TRIGGER AS $$
BEGIN
    -- When setting as active PRIMARY, deactivate other PRIMARY insurances for this patient
    IF NEW.is_active = true AND NEW.insurance_type = 'PRIMARY' THEN
        UPDATE patient_insurance
        SET is_active = false
        WHERE patient_id = NEW.patient_id
        AND insurance_type = 'PRIMARY'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_primary_insurance
    BEFORE INSERT OR UPDATE ON patient_insurance
    FOR EACH ROW
    EXECUTE FUNCTION validate_primary_insurance();

-- Comments for documentation
COMMENT ON TABLE patient_insurance IS 'Patient insurance information (all fields encrypted at application layer)';
COMMENT ON COLUMN patient_insurance.id IS 'Unique insurance record identifier';
COMMENT ON COLUMN patient_insurance.patient_id IS 'Reference to patient';
COMMENT ON COLUMN patient_insurance.insurance_type IS 'PRIMARY, SECONDARY, or TERTIARY insurance';
COMMENT ON COLUMN patient_insurance.provider_name IS '🔒 ENCRYPTED - Insurance provider name';
COMMENT ON COLUMN patient_insurance.policy_number IS '🔒 ENCRYPTED - Insurance policy number';
COMMENT ON COLUMN patient_insurance.group_number IS '🔒 ENCRYPTED - Insurance group number';
COMMENT ON COLUMN patient_insurance.policyholder_name IS '🔒 ENCRYPTED - Policyholder name if different from patient';
COMMENT ON COLUMN patient_insurance.policyholder_dob IS '🔒 ENCRYPTED - Policyholder date of birth';
COMMENT ON COLUMN patient_insurance.provider_phone IS '🔒 ENCRYPTED - Insurance provider phone number';
COMMENT ON COLUMN patient_insurance.is_active IS 'Whether this insurance is currently active';
