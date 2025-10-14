-- Create patients table with comprehensive demographics and medical information
-- NOTE: Sensitive fields must be encrypted at the application layer using AES-256
-- Fields marked with 🔒 require encryption (PII/PHI)

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Medical Record Number (MRN) - Auto-generated, unique identifier
    medical_record_number VARCHAR(50) UNIQUE NOT NULL,

    -- Demographics (🔒 Encrypted fields)
    first_name TEXT NOT NULL,          -- 🔒 ENCRYPT
    last_name TEXT NOT NULL,           -- 🔒 ENCRYPT
    middle_name TEXT,                  -- 🔒 ENCRYPT
    date_of_birth DATE NOT NULL,       -- 🔒 ENCRYPT (PHI)
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F', 'OTHER', 'UNKNOWN')),
    fiscal_code VARCHAR(16),           -- 🔒 ENCRYPT (Italian tax code)

    -- Contact Information (🔒 Encrypted)
    phone_primary VARCHAR(20),         -- 🔒 ENCRYPT
    phone_secondary VARCHAR(20),       -- 🔒 ENCRYPT
    email VARCHAR(255),                -- 🔒 ENCRYPT
    preferred_contact_method VARCHAR(20) DEFAULT 'PHONE' CHECK (preferred_contact_method IN ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP')),

    -- Address (🔒 Encrypted - stored as JSONB)
    -- Structure: { "street": "", "city": "", "state": "", "zip": "", "country": "" }
    address JSONB,                     -- 🔒 ENCRYPT

    -- Emergency Contact (🔒 Encrypted - stored as JSONB)
    -- Structure: { "name": "", "relationship": "", "phone": "" }
    emergency_contact JSONB,           -- 🔒 ENCRYPT

    -- Medical Information (🔒 Encrypted)
    blood_type VARCHAR(5),
    allergies TEXT[],                  -- 🔒 ENCRYPT (array of allergy strings)
    chronic_conditions TEXT[],         -- 🔒 ENCRYPT (array of condition strings)
    current_medications JSONB,         -- 🔒 ENCRYPT (array of medication objects)

    -- Health Card & Insurance
    health_card_expire DATE,
    -- Insurance stored in separate patient_insurance table

    -- Patient Photo
    photo_url TEXT,                    -- URL/path to patient photo

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'DECEASED')),
    deceased_date DATE,

    -- Notes
    notes TEXT,                        -- 🔒 ENCRYPT (general patient notes)

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_date_of_birth CHECK (date_of_birth <= CURRENT_DATE),
    CONSTRAINT valid_health_card_expire CHECK (health_card_expire >= CURRENT_DATE OR health_card_expire IS NULL),
    CONSTRAINT deceased_date_valid CHECK (deceased_date IS NULL OR (status = 'DECEASED' AND deceased_date >= date_of_birth))
);

-- Indexes for performance
CREATE INDEX idx_patients_medical_record_number ON patients(medical_record_number);
CREATE INDEX idx_patients_last_name ON patients(last_name);           -- Will be encrypted, index on ciphertext
CREATE INDEX idx_patients_date_of_birth ON patients(date_of_birth);   -- Will be encrypted, index on ciphertext
CREATE INDEX idx_patients_phone_primary ON patients(phone_primary);   -- Will be encrypted, index on ciphertext
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- Full-text search index on names (will work on encrypted data using hash tokens)
CREATE INDEX idx_patients_search ON patients USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- Trigger to auto-generate medical record number if not provided
CREATE OR REPLACE FUNCTION generate_medical_record_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_part VARCHAR(6);
BEGIN
    IF NEW.medical_record_number IS NULL OR NEW.medical_record_number = '' THEN
        year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

        -- Get next sequence number for this year
        SELECT LPAD(
            (COUNT(*) + 1)::TEXT,
            4,
            '0'
        ) INTO seq_part
        FROM patients
        WHERE medical_record_number LIKE 'MRN-' || year_part || '-%';

        NEW.medical_record_number := 'MRN-' || year_part || '-' || seq_part;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_mrn
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION generate_medical_record_number();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to validate deceased status
CREATE OR REPLACE FUNCTION validate_deceased_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'DECEASED' AND NEW.deceased_date IS NULL THEN
        NEW.deceased_date := CURRENT_DATE;
    END IF;

    IF NEW.status != 'DECEASED' AND NEW.deceased_date IS NOT NULL THEN
        RAISE EXCEPTION 'deceased_date can only be set when status is DECEASED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_deceased
    BEFORE INSERT OR UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION validate_deceased_status();

-- Comments for documentation
COMMENT ON TABLE patients IS 'Patient demographic and medical information (sensitive fields encrypted at application layer)';
COMMENT ON COLUMN patients.id IS 'Unique patient identifier (UUID)';
COMMENT ON COLUMN patients.medical_record_number IS 'Auto-generated unique medical record number (MRN-YYYY-####)';
COMMENT ON COLUMN patients.first_name IS '🔒 ENCRYPTED - Patient first name';
COMMENT ON COLUMN patients.last_name IS '🔒 ENCRYPTED - Patient last name';
COMMENT ON COLUMN patients.date_of_birth IS '🔒 ENCRYPTED - Patient date of birth (PHI)';
COMMENT ON COLUMN patients.fiscal_code IS '🔒 ENCRYPTED - Italian tax code (Codice Fiscale)';
COMMENT ON COLUMN patients.phone_primary IS '🔒 ENCRYPTED - Primary contact phone number';
COMMENT ON COLUMN patients.email IS '🔒 ENCRYPTED - Email address';
COMMENT ON COLUMN patients.address IS '🔒 ENCRYPTED - Patient address stored as JSONB';
COMMENT ON COLUMN patients.emergency_contact IS '🔒 ENCRYPTED - Emergency contact information stored as JSONB';
COMMENT ON COLUMN patients.allergies IS '🔒 ENCRYPTED - Array of known allergies';
COMMENT ON COLUMN patients.chronic_conditions IS '🔒 ENCRYPTED - Array of chronic medical conditions';
COMMENT ON COLUMN patients.current_medications IS '🔒 ENCRYPTED - Current medications as JSONB array';
COMMENT ON COLUMN patients.status IS 'Patient status: ACTIVE, INACTIVE, DECEASED';
COMMENT ON COLUMN patients.photo_url IS 'URL or file path to patient photo';
