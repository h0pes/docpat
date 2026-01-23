-- Fix MRN generation function to work with RLS
-- The trigger needs SECURITY DEFINER to bypass RLS policies when counting patients

CREATE OR REPLACE FUNCTION generate_medical_record_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_part VARCHAR(6);
BEGIN
    IF NEW.medical_record_number IS NULL OR NEW.medical_record_number = '' THEN
        year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

        -- Get next sequence number for this year
        -- This query needs to bypass RLS to count ALL patients, not just visible ones
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER makes the function run with the privileges of the function owner (postgres/mpms_user)
-- This allows it to bypass RLS and count all patients for accurate MRN sequence numbering

COMMENT ON FUNCTION generate_medical_record_number() IS
'Generates unique medical record numbers in format MRN-YYYY-####. Uses SECURITY DEFINER to bypass RLS for accurate counting.';
