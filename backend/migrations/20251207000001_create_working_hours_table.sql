-- Create working_hours tables for clinic operating hours management
-- Supports default weekly schedule with per-day overrides for specific dates
-- Uses ISO 8601 convention: Monday = 1, Sunday = 7

-- Store default weekly working hours (baseline schedule)
CREATE TABLE IF NOT EXISTS default_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Day of week (ISO 8601: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday)
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),

    -- Working hours for this day (null means closed)
    start_time TIME,
    end_time TIME,

    -- Break/lunch time (optional)
    break_start TIME,
    break_end TIME,

    -- Whether this day is enabled/working
    is_working_day BOOLEAN DEFAULT true NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES users(id),

    -- Each day of week should only have one entry
    CONSTRAINT unique_day_of_week UNIQUE (day_of_week),

    -- End time must be after start time if both are set
    CONSTRAINT valid_working_hours CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),

    -- Break times must be within working hours and valid
    CONSTRAINT valid_break_hours CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start
         AND start_time IS NOT NULL AND end_time IS NOT NULL
         AND break_start >= start_time AND break_end <= end_time)
    )
);

-- Store date-specific overrides (for future dates only in practice)
CREATE TABLE IF NOT EXISTS working_hours_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Specific date for the override
    override_date DATE NOT NULL,

    -- Override can be: custom hours, closed day, or extended hours
    override_type VARCHAR(20) NOT NULL CHECK (
        override_type IN ('CLOSED', 'CUSTOM_HOURS', 'EXTENDED_HOURS')
    ),

    -- Working hours for this specific date (null if closed)
    start_time TIME,
    end_time TIME,

    -- Break/lunch time (optional)
    break_start TIME,
    break_end TIME,

    -- Reason for the override
    reason TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Each date should only have one override
    CONSTRAINT unique_override_date UNIQUE (override_date),

    -- End time must be after start time for custom hours
    CONSTRAINT valid_override_hours CHECK (
        override_type = 'CLOSED' OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),

    -- Break times must be valid
    CONSTRAINT valid_override_break CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start
         AND start_time IS NOT NULL AND end_time IS NOT NULL
         AND break_start >= start_time AND break_end <= end_time)
    )
);

-- Indexes for performance
CREATE INDEX idx_working_hours_overrides_date ON working_hours_overrides(override_date);

-- Trigger for updated_at
CREATE TRIGGER update_default_working_hours_updated_at
    BEFORE UPDATE ON default_working_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_hours_overrides_updated_at
    BEFORE UPDATE ON working_hours_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE default_working_hours IS 'Default weekly working hours schedule (baseline)';
COMMENT ON TABLE working_hours_overrides IS 'Date-specific overrides for working hours';
COMMENT ON COLUMN default_working_hours.day_of_week IS 'ISO 8601: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday';
COMMENT ON COLUMN working_hours_overrides.override_type IS 'CLOSED (day off), CUSTOM_HOURS (different schedule), EXTENDED_HOURS (longer hours)';

-- Insert default working hours: Monday-Friday 9:00-18:00, closed on weekends
-- No lunch break by default (can be configured later)
INSERT INTO default_working_hours (day_of_week, start_time, end_time, is_working_day) VALUES
    (1, '09:00', '18:00', true),      -- Monday - 9:00-18:00
    (2, '09:00', '18:00', true),      -- Tuesday - 9:00-18:00
    (3, '09:00', '18:00', true),      -- Wednesday - 9:00-18:00
    (4, '09:00', '18:00', true),      -- Thursday - 9:00-18:00
    (5, '09:00', '18:00', true),      -- Friday - 9:00-18:00
    (6, NULL, NULL, false),           -- Saturday - closed
    (7, NULL, NULL, false)            -- Sunday - closed
ON CONFLICT (day_of_week) DO NOTHING;
