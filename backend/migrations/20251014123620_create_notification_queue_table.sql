-- Create notification_queue table for managing outbound notifications
-- Supports email, SMS, and WhatsApp notifications with retry logic

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References (optional - can send notifications without specific context)
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Notification details
    notification_type VARCHAR(50) NOT NULL CHECK (
        notification_type IN ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'APPOINTMENT_CANCELLATION',
                             'VISIT_SUMMARY', 'PRESCRIPTION_READY', 'FOLLOW_UP_REMINDER', 'CUSTOM')
    ),

    -- Delivery method
    delivery_method VARCHAR(20) NOT NULL CHECK (
        delivery_method IN ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH')
    ),

    -- Recipient information
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_name VARCHAR(255),

    -- Message content
    subject VARCHAR(255),  -- For email
    message_body TEXT NOT NULL,
    message_template VARCHAR(100),  -- Template key if using templates

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    priority INT DEFAULT 5 NOT NULL CHECK (priority BETWEEN 1 AND 10),  -- 1 = highest, 10 = lowest

    -- Status tracking
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (
        status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')
    ),

    -- Retry logic
    retry_count INT DEFAULT 0 NOT NULL,
    max_retries INT DEFAULT 3 NOT NULL,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,

    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_status VARCHAR(50),  -- Provider-specific delivery status
    delivery_receipt TEXT,  -- Provider delivery receipt/ID

    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(50),

    -- Provider details
    provider_name VARCHAR(50),  -- e.g., "SendGrid", "Twilio", "WhatsApp Business"
    provider_message_id VARCHAR(255),  -- External provider message ID

    -- Metadata
    metadata JSONB,  -- Additional data for the notification

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT valid_recipient CHECK (
        (delivery_method = 'EMAIL' AND recipient_email IS NOT NULL) OR
        (delivery_method IN ('SMS', 'WHATSAPP') AND recipient_phone IS NOT NULL) OR
        (delivery_method = 'PUSH')
    ),
    CONSTRAINT valid_retry CHECK (retry_count <= max_retries),
    CONSTRAINT valid_scheduled_time CHECK (scheduled_for IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_notification_queue_patient_id ON notification_queue(patient_id);
CREATE INDEX idx_notification_queue_appointment_id ON notification_queue(appointment_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for) WHERE status = 'PENDING';
CREATE INDEX idx_notification_queue_delivery_method ON notification_queue(delivery_method);
CREATE INDEX idx_notification_queue_notification_type ON notification_queue(notification_type);
CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at DESC);

-- Composite indexes for queue processing
CREATE INDEX idx_notification_queue_pending ON notification_queue(scheduled_for, priority)
    WHERE status = 'PENDING';
CREATE INDEX idx_notification_queue_retry ON notification_queue(next_retry_at)
    WHERE status = 'FAILED' AND next_retry_at IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_notification_queue_updated_at
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to validate status transitions
CREATE OR REPLACE FUNCTION validate_notification_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- PENDING can go to: PROCESSING, CANCELLED
    IF OLD.status = 'PENDING' AND NEW.status NOT IN ('PENDING', 'PROCESSING', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid status transition from PENDING to %', NEW.status;
    END IF;

    -- PROCESSING can go to: SENT, FAILED
    IF OLD.status = 'PROCESSING' AND NEW.status NOT IN ('PROCESSING', 'SENT', 'FAILED') THEN
        RAISE EXCEPTION 'Invalid status transition from PROCESSING to %', NEW.status;
    END IF;

    -- SENT is final (but can be updated for delivery confirmation)
    IF OLD.status = 'SENT' AND NEW.status != 'SENT' THEN
        RAISE EXCEPTION 'Cannot change status from SENT';
    END IF;

    -- FAILED can go to: PROCESSING (retry), CANCELLED
    IF OLD.status = 'FAILED' AND NEW.status NOT IN ('FAILED', 'PROCESSING', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid status transition from FAILED to %', NEW.status;
    END IF;

    -- CANCELLED is final
    IF OLD.status = 'CANCELLED' AND NEW.status != 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot change status from CANCELLED';
    END IF;

    -- Auto-set sent_at when moving to SENT
    IF NEW.status = 'SENT' AND OLD.status != 'SENT' AND NEW.sent_at IS NULL THEN
        NEW.sent_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_notification_status
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_notification_status_transition();

-- Trigger to handle retry logic
CREATE OR REPLACE FUNCTION handle_notification_retry()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to FAILED, schedule next retry
    IF NEW.status = 'FAILED' AND NEW.retry_count < NEW.max_retries THEN
        NEW.last_retry_at := NOW();
        -- Exponential backoff: 5 min, 15 min, 45 min
        NEW.next_retry_at := NOW() + (POWER(3, NEW.retry_count) * INTERVAL '5 minutes');
    END IF;

    -- When retrying (moving from FAILED to PROCESSING), increment retry count
    IF OLD.status = 'FAILED' AND NEW.status = 'PROCESSING' THEN
        NEW.retry_count := OLD.retry_count + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_notification_retry
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_notification_retry();

-- Function to clean up old processed notifications (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete SENT notifications older than 90 days
    DELETE FROM notification_queue
    WHERE status = 'SENT'
    AND sent_at < NOW() - INTERVAL '90 days';

    -- Delete FAILED notifications older than 30 days (after max retries)
    DELETE FROM notification_queue
    WHERE status = 'FAILED'
    AND retry_count >= max_retries
    AND updated_at < NOW() - INTERVAL '30 days';

    -- Delete CANCELLED notifications older than 30 days
    DELETE FROM notification_queue
    WHERE status = 'CANCELLED'
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE notification_queue IS 'Queue for outbound notifications (email, SMS, WhatsApp) with retry logic';
COMMENT ON COLUMN notification_queue.id IS 'Unique notification identifier';
COMMENT ON COLUMN notification_queue.notification_type IS 'Type of notification (appointment reminder, confirmation, etc.)';
COMMENT ON COLUMN notification_queue.delivery_method IS 'Delivery channel (EMAIL, SMS, WHATSAPP, PUSH)';
COMMENT ON COLUMN notification_queue.scheduled_for IS 'When to send the notification';
COMMENT ON COLUMN notification_queue.priority IS 'Notification priority (1=highest, 10=lowest)';
COMMENT ON COLUMN notification_queue.status IS 'Notification status: PENDING → PROCESSING → SENT (or FAILED/CANCELLED)';
COMMENT ON COLUMN notification_queue.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN notification_queue.next_retry_at IS 'When to attempt next retry (exponential backoff)';
COMMENT ON COLUMN notification_queue.provider_message_id IS 'External provider message ID for tracking';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Cleanup function to remove old processed notifications (call periodically)';
