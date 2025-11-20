-- Add locked_at timestamp to visits table
-- This tracks when a visit was locked (SIGNED → LOCKED transition)

ALTER TABLE visits ADD COLUMN locked_at TIMESTAMPTZ;

COMMENT ON COLUMN visits.locked_at IS 'Timestamp when visit was locked (SIGNED → LOCKED)';
