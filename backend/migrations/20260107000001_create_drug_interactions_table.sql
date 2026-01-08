-- Migration: Create drug_interactions table
-- Description: Stores drug-drug interactions from DDInter 2.0 database
-- Author: Claude Code
-- Date: 2026-01-07

-- =============================================================================
-- Drug-Drug Interactions Table
-- Primary source: DDInter 2.0 (https://ddinter2.scbdd.com/)
-- =============================================================================
CREATE TABLE IF NOT EXISTS drug_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug A identification (ATC code based)
    drug_a_atc_code VARCHAR(10) NOT NULL,
    drug_a_name VARCHAR(500),

    -- Drug B identification (ATC code based)
    drug_b_atc_code VARCHAR(10) NOT NULL,
    drug_b_name VARCHAR(500),

    -- Interaction details
    -- Severity levels: contraindicated (avoid completely), major (serious),
    --                  moderate (caution), minor (low risk), unknown
    severity VARCHAR(30) NOT NULL
        CHECK (severity IN ('contraindicated', 'major', 'moderate', 'minor', 'unknown')),

    -- Clinical effect description
    effect TEXT,

    -- Pharmacological mechanism (not available in DDInter basic export)
    mechanism TEXT,

    -- Clinical management recommendations (not available in DDInter basic export)
    management TEXT,

    -- Source tracking
    source VARCHAR(50) NOT NULL DEFAULT 'DDINTER',
    source_id VARCHAR(100),      -- Original ID from source database (e.g., DDInterID)
    source_updated_at TIMESTAMPTZ,

    -- Status flag for admin control
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one interaction per drug pair per source
    -- Note: Drugs are stored in alphabetical order (drug_a < drug_b) to ensure uniqueness
    CONSTRAINT unique_drug_interaction UNIQUE (drug_a_atc_code, drug_b_atc_code, source)
);

-- =============================================================================
-- Indexes for fast lookup
-- =============================================================================

-- Fast lookup by ATC code (primary use case: check if new drug interacts with existing)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug_a ON drug_interactions (drug_a_atc_code);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug_b ON drug_interactions (drug_b_atc_code);

-- Composite index for pair lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_pair ON drug_interactions (drug_a_atc_code, drug_b_atc_code);

-- Filter by severity (for displaying high-risk interactions first)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions (severity);

-- Filter active only (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_active ON drug_interactions (is_active)
    WHERE is_active = true;

-- Combined severity + active filter (common query pattern)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity_active ON drug_interactions (severity, is_active)
    WHERE is_active = true;

-- Source filtering (for multi-source scenarios, e.g., DDINTER vs TWOSIDES)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_source ON drug_interactions (source);

-- =============================================================================
-- Trigger for automatic updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_drug_interactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_drug_interactions_updated_at ON drug_interactions;
CREATE TRIGGER trigger_drug_interactions_updated_at
    BEFORE UPDATE ON drug_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_drug_interactions_timestamp();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;

-- Everyone can read (this is reference data needed for prescription checking)
DROP POLICY IF EXISTS drug_interactions_select_policy ON drug_interactions;
CREATE POLICY drug_interactions_select_policy ON drug_interactions
    FOR SELECT USING (true);

-- Only admin can insert (via import tools)
DROP POLICY IF EXISTS drug_interactions_insert_policy ON drug_interactions;
CREATE POLICY drug_interactions_insert_policy ON drug_interactions
    FOR INSERT
    WITH CHECK (current_setting('app.current_user_role', true) = 'ADMIN');

-- Only admin can update
DROP POLICY IF EXISTS drug_interactions_update_policy ON drug_interactions;
CREATE POLICY drug_interactions_update_policy ON drug_interactions
    FOR UPDATE
    USING (current_setting('app.current_user_role', true) = 'ADMIN');

-- Only admin can delete
DROP POLICY IF EXISTS drug_interactions_delete_policy ON drug_interactions;
CREATE POLICY drug_interactions_delete_policy ON drug_interactions
    FOR DELETE
    USING (current_setting('app.current_user_role', true) = 'ADMIN');

-- =============================================================================
-- Comments for documentation
-- =============================================================================
COMMENT ON TABLE drug_interactions IS 'Drug-drug interactions imported from DDInter 2.0 and optionally TwoSIDES databases';
COMMENT ON COLUMN drug_interactions.drug_a_atc_code IS 'ATC code for first drug (alphabetically sorted)';
COMMENT ON COLUMN drug_interactions.drug_b_atc_code IS 'ATC code for second drug (alphabetically sorted)';
COMMENT ON COLUMN drug_interactions.severity IS 'Clinical severity: contraindicated (avoid), major (serious), moderate (caution), minor (low risk), unknown';
COMMENT ON COLUMN drug_interactions.effect IS 'Description of the clinical effect of the interaction';
COMMENT ON COLUMN drug_interactions.mechanism IS 'Pharmacological mechanism of the interaction';
COMMENT ON COLUMN drug_interactions.management IS 'Clinical management recommendations';
COMMENT ON COLUMN drug_interactions.source IS 'Data source: DDINTER or TWOSIDES';
COMMENT ON COLUMN drug_interactions.source_id IS 'Original identifier from the source database';
COMMENT ON COLUMN drug_interactions.is_active IS 'Admin can deactivate specific interactions if needed';
