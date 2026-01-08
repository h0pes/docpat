-- Migration: Create medications table for drug database
-- This table stores both AIFA imported medications and custom doctor-added medications

-- Medications master table
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug identification
    aic_code VARCHAR(20),                    -- Italian AIC code (Autorizzazione Immissione in Commercio)
    atc_code VARCHAR(10),                    -- ATC classification code (e.g., C09AA01)

    -- Names (support both Italian and English)
    name VARCHAR(255) NOT NULL,              -- Primary commercial/brand name
    name_en VARCHAR(255),                    -- English name (if available)
    generic_name VARCHAR(255),               -- Active ingredient / generic name
    generic_name_en VARCHAR(255),            -- English generic name

    -- Drug details
    form VARCHAR(100),                       -- Pharmaceutical form (tablet, capsule, injection, etc.)
    dosage_strength VARCHAR(100),            -- e.g., "100mg", "500mg/5ml"
    route VARCHAR(50),                       -- Route of administration
    package_description TEXT,                -- Full package description

    -- Manufacturer info
    manufacturer VARCHAR(255),               -- Pharmaceutical company

    -- Classification and metadata
    drug_class VARCHAR(100),                 -- AIFA class (A, H, C, etc.)
    is_generic BOOLEAN DEFAULT false,        -- Whether it's a generic medication
    is_prescription_required BOOLEAN DEFAULT true,

    -- Common dosages for quick selection (JSON array)
    common_dosages JSONB DEFAULT '[]'::jsonb,

    -- Source tracking
    source VARCHAR(20) NOT NULL DEFAULT 'CUSTOM'
        CHECK (source IN ('AIFA', 'CUSTOM', 'RXNORM')),
    source_updated_at TIMESTAMPTZ,           -- When source data was last updated

    -- Custom medication fields
    is_custom BOOLEAN DEFAULT false,         -- True if added by doctor
    created_by UUID REFERENCES users(id),    -- Who added this (for custom medications)
    notes TEXT,                              -- Doctor's notes about this medication

    -- Status
    is_active BOOLEAN DEFAULT true,          -- Soft delete for custom medications

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_aic_code UNIQUE NULLS NOT DISTINCT (aic_code),
    CONSTRAINT unique_custom_medication UNIQUE NULLS NOT DISTINCT (name, generic_name, form, dosage_strength, is_custom)
);

-- Indexes for fast searching
CREATE INDEX idx_medications_name ON medications USING gin (name gin_trgm_ops);
CREATE INDEX idx_medications_generic_name ON medications USING gin (generic_name gin_trgm_ops);
CREATE INDEX idx_medications_name_en ON medications USING gin (name_en gin_trgm_ops) WHERE name_en IS NOT NULL;
CREATE INDEX idx_medications_aic ON medications (aic_code) WHERE aic_code IS NOT NULL;
CREATE INDEX idx_medications_atc ON medications (atc_code) WHERE atc_code IS NOT NULL;
CREATE INDEX idx_medications_active ON medications (is_active) WHERE is_active = true;
CREATE INDEX idx_medications_custom ON medications (is_custom, created_by) WHERE is_custom = true;
CREATE INDEX idx_medications_source ON medications (source);

-- Full-text search index
CREATE INDEX idx_medications_fts ON medications USING gin (
    to_tsvector('italian', coalesce(name, '') || ' ' || coalesce(generic_name, '') || ' ' || coalesce(name_en, ''))
);

-- Enable trigram extension if not already enabled (for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ATC codes reference table for categorization
CREATE TABLE atc_codes (
    code VARCHAR(10) PRIMARY KEY,
    description VARCHAR(500) NOT NULL,
    description_en VARCHAR(500),
    level INT NOT NULL CHECK (level BETWEEN 1 AND 5),  -- ATC has 5 levels
    parent_code VARCHAR(10) REFERENCES atc_codes(code),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_atc_codes_parent ON atc_codes (parent_code);
CREATE INDEX idx_atc_codes_level ON atc_codes (level);
CREATE INDEX idx_atc_codes_description ON atc_codes USING gin (description gin_trgm_ops);

-- Row Level Security for medications
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE atc_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can read medications (no sensitive data)
CREATE POLICY medications_select_policy ON medications
    FOR SELECT
    USING (true);

-- Only admins and doctors can insert custom medications
CREATE POLICY medications_insert_policy ON medications
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_role', true) IN ('ADMIN', 'DOCTOR')
    );

-- Only the creator or admin can update custom medications
CREATE POLICY medications_update_policy ON medications
    FOR UPDATE
    USING (
        NOT is_custom OR
        created_by::text = current_setting('app.current_user_id', true) OR
        current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- Only admin can delete (soft delete via is_active)
CREATE POLICY medications_delete_policy ON medications
    FOR DELETE
    USING (
        current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- ATC codes are read-only for everyone
CREATE POLICY atc_codes_select_policy ON atc_codes
    FOR SELECT
    USING (true);

-- Only system/admin can modify ATC codes (via data import)
CREATE POLICY atc_codes_modify_policy ON atc_codes
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- Comments for documentation
COMMENT ON TABLE medications IS 'Master table for medications, combining AIFA imports and custom doctor entries';
COMMENT ON COLUMN medications.aic_code IS 'Italian AIC (Autorizzazione Immissione in Commercio) code';
COMMENT ON COLUMN medications.atc_code IS 'WHO ATC (Anatomical Therapeutic Chemical) classification code';
COMMENT ON COLUMN medications.source IS 'Data source: AIFA (Italian agency), CUSTOM (doctor-added), RXNORM (US database)';
COMMENT ON COLUMN medications.is_custom IS 'True if medication was manually added by a doctor';
COMMENT ON TABLE atc_codes IS 'WHO ATC classification codes for medication categorization';
