-- Fix encrypted field types to TEXT (no length limits for encrypted data)
-- Encrypted data is base64-encoded and much longer than the original plaintext

-- Drop the generated search_vector column (references fiscal_code, email, phone_primary)
ALTER TABLE patients DROP COLUMN IF EXISTS search_vector;

-- Drop indexes on fields that will change type (to be re-created after type change)
DROP INDEX IF EXISTS idx_patients_fiscal_code;
DROP INDEX IF EXISTS idx_patients_fiscal_code_trgm;
DROP INDEX IF EXISTS idx_patients_phone;
DROP INDEX IF EXISTS idx_patients_phone_primary;
DROP INDEX IF EXISTS idx_patients_fulltext_search;

-- Change all encrypted VARCHAR fields to TEXT to accommodate encrypted data
ALTER TABLE patients ALTER COLUMN fiscal_code TYPE TEXT;
ALTER TABLE patients ALTER COLUMN phone_primary TYPE TEXT;
ALTER TABLE patients ALTER COLUMN phone_secondary TYPE TEXT;
ALTER TABLE patients ALTER COLUMN email TYPE TEXT;

-- Recreate search_vector as a generated column
-- NOTE: This indexes ENCRYPTED data (ciphertext), not plaintext - not useful for searching
-- We keep it for schema consistency but it won't be useful for actual searches
ALTER TABLE patients ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('medical_italian', COALESCE(first_name, '')), 'A') ||
        setweight(to_tsvector('medical_italian', COALESCE(last_name, '')), 'A') ||
        setweight(to_tsvector('medical_italian', COALESCE(fiscal_code, '')), 'B') ||
        setweight(to_tsvector('medical_italian', COALESCE(email, '')), 'C') ||
        setweight(to_tsvector('medical_italian', COALESCE(phone_primary, '')), 'C')
    ) STORED;

-- Recreate indexes on encrypted fields (note: these index encrypted ciphertext, not plaintext)
CREATE INDEX IF NOT EXISTS idx_patients_fiscal_code ON patients(fiscal_code) WHERE fiscal_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_phone_primary ON patients(phone_primary) WHERE phone_primary IS NOT NULL;

-- Update comments
COMMENT ON COLUMN patients.fiscal_code IS '🔒 ENCRYPTED - Italian tax code (stored as encrypted TEXT)';
COMMENT ON COLUMN patients.phone_primary IS '🔒 ENCRYPTED - Primary phone (stored as encrypted TEXT)';
COMMENT ON COLUMN patients.phone_secondary IS '🔒 ENCRYPTED - Secondary phone (stored as encrypted TEXT)';
COMMENT ON COLUMN patients.email IS '🔒 ENCRYPTED - Email address (stored as encrypted TEXT)';
