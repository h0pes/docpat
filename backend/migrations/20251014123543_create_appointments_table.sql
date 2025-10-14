-- Create appointments table with conflict detection
-- NOTE: Uses exclusion constraint to prevent double-booking at database level

-- First, ensure btree_gist extension is available for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Scheduling information
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 480),

    -- Appointment details
    type VARCHAR(50) NOT NULL CHECK (type IN ('NEW_PATIENT', 'FOLLOW_UP', 'URGENT', 'CONSULTATION', 'ROUTINE_CHECKUP', 'ACUPUNCTURE')),
    reason TEXT,
    notes TEXT,

    -- Status workflow: SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
    --                  ↓
    --                CANCELLED
    --                  ↓
    --                NO_SHOW
    status VARCHAR(20) DEFAULT 'SCHEDULED' NOT NULL CHECK (
        status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
    ),

    -- Cancellation information
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),

    -- Confirmation
    confirmation_code VARCHAR(20) UNIQUE,
    confirmed_at TIMESTAMPTZ,

    -- Recurring appointments support
    is_recurring BOOLEAN DEFAULT false NOT NULL,
    recurring_pattern JSONB,  -- e.g., { "frequency": "WEEKLY", "interval": 1, "end_date": "2024-12-31" }
    parent_appointment_id UUID REFERENCES appointments(id),  -- Links to parent if part of recurring series

    -- Reminders
    reminder_sent_email BOOLEAN DEFAULT false NOT NULL,
    reminder_sent_sms BOOLEAN DEFAULT false NOT NULL,
    reminder_sent_whatsapp BOOLEAN DEFAULT false NOT NULL,
    reminder_sent_at TIMESTAMPTZ,

    -- Check-in/out
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_time_range CHECK (scheduled_end > scheduled_start),
    CONSTRAINT valid_duration CHECK (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60 = duration_minutes),
    CONSTRAINT valid_cancellation CHECK (
        (status = 'CANCELLED' AND cancellation_reason IS NOT NULL AND cancelled_at IS NOT NULL) OR
        (status != 'CANCELLED' AND cancellation_reason IS NULL AND cancelled_at IS NULL)
    ),
    CONSTRAINT valid_confirmation CHECK (
        (status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') AND confirmed_at IS NOT NULL) OR
        (status NOT IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED'))
    )
);

-- CRITICAL: Exclusion constraint to prevent double-booking
-- Prevents overlapping appointments for the same provider
-- Uses the && operator to check for time range overlap
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments
ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
    provider_id WITH =,
    tstzrange(scheduled_start, scheduled_end) WITH &&
) WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));

-- Indexes for performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX idx_appointments_scheduled_start ON appointments(scheduled_start);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_type ON appointments(type);
CREATE INDEX idx_appointments_confirmation_code ON appointments(confirmation_code);
CREATE INDEX idx_appointments_parent_appointment ON appointments(parent_appointment_id);
CREATE INDEX idx_appointments_is_recurring ON appointments(is_recurring);

-- Composite index for common queries
CREATE INDEX idx_appointments_provider_start_status ON appointments(provider_id, scheduled_start, status);
CREATE INDEX idx_appointments_patient_upcoming ON appointments(patient_id, scheduled_start) WHERE status IN ('SCHEDULED', 'CONFIRMED');

-- Trigger to auto-generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_part VARCHAR(6);
BEGIN
    IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
        year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

        -- Get next sequence number for this year
        SELECT LPAD(
            (COUNT(*) + 1)::TEXT,
            4,
            '0'
        ) INTO seq_part
        FROM appointments
        WHERE confirmation_code LIKE 'APT-' || year_part || '-%';

        NEW.confirmation_code := 'APT-' || year_part || '-' || seq_part;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_confirmation_code
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_confirmation_code();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to validate status transitions
CREATE OR REPLACE FUNCTION validate_appointment_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- SCHEDULED can go to: CONFIRMED, CANCELLED, NO_SHOW
    IF OLD.status = 'SCHEDULED' AND NEW.status NOT IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW') THEN
        RAISE EXCEPTION 'Invalid status transition from SCHEDULED to %', NEW.status;
    END IF;

    -- CONFIRMED can go to: IN_PROGRESS, CANCELLED, NO_SHOW
    IF OLD.status = 'CONFIRMED' AND NEW.status NOT IN ('CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW') THEN
        RAISE EXCEPTION 'Invalid status transition from CONFIRMED to %', NEW.status;
    END IF;

    -- IN_PROGRESS can go to: COMPLETED, CANCELLED
    IF OLD.status = 'IN_PROGRESS' AND NEW.status NOT IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid status transition from IN_PROGRESS to %', NEW.status;
    END IF;

    -- COMPLETED cannot be changed
    IF OLD.status = 'COMPLETED' AND NEW.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Cannot change status from COMPLETED';
    END IF;

    -- CANCELLED and NO_SHOW are final states
    IF OLD.status IN ('CANCELLED', 'NO_SHOW') AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot change status from % to %', OLD.status, NEW.status;
    END IF;

    -- Automatically set confirmed_at when moving to CONFIRMED
    IF NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' AND NEW.confirmed_at IS NULL THEN
        NEW.confirmed_at := NOW();
    END IF;

    -- Automatically set cancelled_at when moving to CANCELLED
    IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_appointment_status
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_appointment_status_transition();

-- Trigger to auto-calculate scheduled_end from duration
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scheduled_end IS NULL OR NEW.duration_minutes IS NOT NULL THEN
        NEW.scheduled_end := NEW.scheduled_start + (NEW.duration_minutes || ' minutes')::INTERVAL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_end_time
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    WHEN (NEW.scheduled_start IS NOT NULL AND NEW.duration_minutes IS NOT NULL)
    EXECUTE FUNCTION calculate_appointment_end_time();

-- Comments for documentation
COMMENT ON TABLE appointments IS 'Appointment scheduling with automatic conflict detection via exclusion constraint';
COMMENT ON COLUMN appointments.id IS 'Unique appointment identifier';
COMMENT ON COLUMN appointments.patient_id IS 'Reference to patient';
COMMENT ON COLUMN appointments.provider_id IS 'Reference to provider (doctor)';
COMMENT ON COLUMN appointments.scheduled_start IS 'Appointment start time';
COMMENT ON COLUMN appointments.scheduled_end IS 'Appointment end time (auto-calculated from duration)';
COMMENT ON COLUMN appointments.status IS 'Appointment status: SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED (or CANCELLED/NO_SHOW)';
COMMENT ON COLUMN appointments.confirmation_code IS 'Unique auto-generated confirmation code (APT-YYYY-####)';
COMMENT ON COLUMN appointments.is_recurring IS 'Whether this appointment is part of a recurring series';
COMMENT ON COLUMN appointments.recurring_pattern IS 'JSON pattern for recurring appointments (frequency, interval, end date)';
COMMENT ON COLUMN appointments.parent_appointment_id IS 'Links to parent appointment if part of recurring series';
COMMENT ON CONSTRAINT appointments_no_overlap ON appointments IS 'CRITICAL: Prevents double-booking by detecting time range overlaps for same provider';
