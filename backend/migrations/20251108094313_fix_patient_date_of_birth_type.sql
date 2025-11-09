-- Fix patient date_of_birth column type for encryption
-- The field needs to be TEXT to store encrypted date strings, not DATE

-- Drop constraints that reference date_of_birth (can't validate/compare encrypted data)
ALTER TABLE patients DROP CONSTRAINT IF EXISTS valid_date_of_birth;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS deceased_date_valid;

-- Drop indexes on date_of_birth (encrypted data can't be meaningfully indexed for queries)
DROP INDEX IF EXISTS idx_patients_date_of_birth;
DROP INDEX IF EXISTS idx_patients_dob;

-- Change date_of_birth from DATE to TEXT to support encryption
ALTER TABLE patients ALTER COLUMN date_of_birth TYPE TEXT;

-- Re-add deceased_date constraint without date_of_birth comparison
-- (can only check that deceased patients have a deceased_date)
ALTER TABLE patients ADD CONSTRAINT deceased_date_valid
    CHECK (deceased_date IS NULL OR (status = 'DECEASED' AND deceased_date IS NOT NULL));

-- Update comment to reflect encryption
COMMENT ON COLUMN patients.date_of_birth IS '🔒 ENCRYPTED - Patient date of birth (stored as encrypted TEXT, not DATE)';
