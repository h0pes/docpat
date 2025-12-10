-- Migration: Create holidays table
-- Description: Holiday and vacation calendar for the practice
-- Date: 2025-12-08
--
-- This table stores holidays and vacation days that affect appointment scheduling.
-- Supports three types:
-- - NATIONAL: Public holidays (e.g., Christmas, New Year)
-- - PRACTICE_CLOSED: Practice-specific closures (e.g., staff training)
-- - VACATION: Doctor's vacation days
--
-- The is_recurring flag is used for annual holidays like Christmas that repeat every year.

-- Up Migration

-- Holiday types enum for documentation (stored as VARCHAR for flexibility)
-- NATIONAL - National/public holidays
-- PRACTICE_CLOSED - Practice-specific closures
-- VACATION - Doctor's vacation days

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The date of the holiday
    holiday_date DATE NOT NULL,

    -- Name/description of the holiday (e.g., "Christmas Day", "Doctor Vacation")
    name VARCHAR(200) NOT NULL,

    -- Type of holiday: NATIONAL, PRACTICE_CLOSED, VACATION
    holiday_type VARCHAR(20) NOT NULL DEFAULT 'PRACTICE_CLOSED'
        CHECK (holiday_type IN ('NATIONAL', 'PRACTICE_CLOSED', 'VACATION')),

    -- Is this a recurring annual holiday? (e.g., Christmas on Dec 25)
    -- For recurring holidays, only store the day/month, year is ignored during checks
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,

    -- Optional notes about the holiday
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Prevent duplicate entries for the same date
    CONSTRAINT unique_holiday_date UNIQUE (holiday_date)
);

-- Add comments for documentation
COMMENT ON TABLE holidays IS 'Holiday and vacation calendar for the practice';
COMMENT ON COLUMN holidays.holiday_date IS 'The date of the holiday';
COMMENT ON COLUMN holidays.name IS 'Name/description of the holiday';
COMMENT ON COLUMN holidays.holiday_type IS 'Type: NATIONAL, PRACTICE_CLOSED, or VACATION';
COMMENT ON COLUMN holidays.is_recurring IS 'If true, this holiday recurs annually (e.g., Christmas)';
COMMENT ON COLUMN holidays.notes IS 'Optional notes about the holiday';

-- Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays (holiday_date);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_holidays_date_range ON holidays (holiday_date, holiday_type);

-- Create index for recurring holiday lookups (by month and day)
CREATE INDEX IF NOT EXISTS idx_holidays_recurring ON holidays (is_recurring, EXTRACT(MONTH FROM holiday_date), EXTRACT(DAY FROM holiday_date))
    WHERE is_recurring = TRUE;

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then recreate (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_holidays_updated_at ON holidays;
CREATE TRIGGER trigger_update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_holidays_updated_at();

-- Seed Italian national holidays for 2025 and 2026
-- These are recurring holidays that happen every year
INSERT INTO holidays (holiday_date, name, holiday_type, is_recurring, notes) VALUES
    -- 2025 Italian National Holidays (as base year for recurring)
    ('2025-01-01', 'Capodanno', 'NATIONAL', TRUE, 'New Year''s Day - Recurring annually'),
    ('2025-01-06', 'Epifania', 'NATIONAL', TRUE, 'Epiphany - Recurring annually'),
    ('2025-04-25', 'Festa della Liberazione', 'NATIONAL', TRUE, 'Liberation Day - Recurring annually'),
    ('2025-05-01', 'Festa del Lavoro', 'NATIONAL', TRUE, 'Labour Day - Recurring annually'),
    ('2025-06-02', 'Festa della Repubblica', 'NATIONAL', TRUE, 'Republic Day - Recurring annually'),
    ('2025-08-15', 'Ferragosto', 'NATIONAL', TRUE, 'Assumption of Mary - Recurring annually'),
    ('2025-11-01', 'Ognissanti', 'NATIONAL', TRUE, 'All Saints'' Day - Recurring annually'),
    ('2025-12-08', 'Immacolata Concezione', 'NATIONAL', TRUE, 'Immaculate Conception - Recurring annually'),
    ('2025-12-25', 'Natale', 'NATIONAL', TRUE, 'Christmas Day - Recurring annually'),
    ('2025-12-26', 'Santo Stefano', 'NATIONAL', TRUE, 'St. Stephen''s Day - Recurring annually'),

    -- Variable holidays for 2025 (not recurring - depend on Easter calculation)
    ('2025-04-20', 'Pasqua 2025', 'NATIONAL', FALSE, 'Easter Sunday 2025'),
    ('2025-04-21', 'Lunedì dell''Angelo 2025', 'NATIONAL', FALSE, 'Easter Monday 2025'),

    -- Variable holidays for 2026 (not recurring - depend on Easter calculation)
    ('2026-04-05', 'Pasqua 2026', 'NATIONAL', FALSE, 'Easter Sunday 2026'),
    ('2026-04-06', 'Lunedì dell''Angelo 2026', 'NATIONAL', FALSE, 'Easter Monday 2026')
ON CONFLICT (holiday_date) DO NOTHING;

-- Down Migration (for rollback)
-- DROP TRIGGER IF EXISTS trigger_update_holidays_updated_at ON holidays;
-- DROP FUNCTION IF EXISTS update_holidays_updated_at();
-- DROP INDEX IF EXISTS idx_holidays_recurring;
-- DROP INDEX IF EXISTS idx_holidays_date_range;
-- DROP INDEX IF EXISTS idx_holidays_date;
-- DROP TABLE IF EXISTS holidays;
