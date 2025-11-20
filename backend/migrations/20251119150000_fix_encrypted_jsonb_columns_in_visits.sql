-- Fix encrypted JSONB columns in visits table
-- Change encrypted JSONB columns to TEXT since encrypted data is stored as base64 strings

-- Change vitals from JSONB to TEXT
ALTER TABLE visits ALTER COLUMN vitals TYPE TEXT USING vitals::TEXT;

-- Change review_of_systems from JSONB to TEXT  
ALTER TABLE visits ALTER COLUMN review_of_systems TYPE TEXT USING review_of_systems::TEXT;

-- Update comments to reflect TEXT storage
COMMENT ON COLUMN visits.vitals IS '🔒 ENCRYPTED (TEXT) - Vital signs stored as encrypted JSON string';
COMMENT ON COLUMN visits.review_of_systems IS '🔒 ENCRYPTED (TEXT) - Review of systems stored as encrypted JSON string';
