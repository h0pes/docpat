-- Add strategic indexes for performance optimization
-- These indexes support common query patterns and improve search/filter operations

-- ====================
-- PATIENTS TABLE
-- ====================

-- Composite index for name-based searches (last name + first name)
-- Supports queries like: WHERE last_name LIKE 'Rossi%' ORDER BY last_name, first_name
CREATE INDEX IF NOT EXISTS idx_patients_name_composite
    ON patients(last_name, first_name);

-- Index on date_of_birth for age filtering and birthday reminders
CREATE INDEX IF NOT EXISTS idx_patients_dob
    ON patients(date_of_birth);

-- Index on fiscal_code for fast lookup (Italian tax ID)
CREATE INDEX IF NOT EXISTS idx_patients_fiscal_code
    ON patients(fiscal_code)
    WHERE fiscal_code IS NOT NULL;

-- Composite index for phone search
CREATE INDEX IF NOT EXISTS idx_patients_phone
    ON patients(phone_primary)
    WHERE phone_primary IS NOT NULL;

-- Composite index for active patients filtering
CREATE INDEX IF NOT EXISTS idx_patients_status_created
    ON patients(status, created_at DESC)
    WHERE status = 'ACTIVE';

-- ====================
-- APPOINTMENTS TABLE
-- ====================

-- Index for finding appointments by date range (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_appointments_date_range
    ON appointments(scheduled_start, scheduled_end)
    WHERE status NOT IN ('CANCELLED', 'NO_SHOW');

-- Composite index for patient's future appointments
-- Note: Cannot use NOW() in index predicate (not immutable), filter in application query
CREATE INDEX IF NOT EXISTS idx_appointments_patient_scheduled
    ON appointments(patient_id, scheduled_start)
    WHERE status IN ('SCHEDULED', 'CONFIRMED');

-- ====================
-- VISITS TABLE
-- ====================

-- Note: Visits is partitioned, indexes created on parent apply to all partitions

-- Index for finding visits by date range
CREATE INDEX IF NOT EXISTS idx_visits_patient_date
    ON visits(patient_id, visit_date DESC);

-- Index on status for filtering drafts vs signed visits
CREATE INDEX IF NOT EXISTS idx_visits_status_date
    ON visits(status, visit_date DESC);

-- ====================
-- PRESCRIPTIONS TABLE
-- ====================

-- Index for active prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_active
    ON prescriptions(patient_id, status, prescribed_date DESC)
    WHERE status = 'ACTIVE';

-- Index for finding prescriptions needing refill
CREATE INDEX IF NOT EXISTS idx_prescriptions_refills
    ON prescriptions(refills_remaining, status)
    WHERE status = 'ACTIVE' AND refills_remaining <= 1;

-- ====================
-- AUDIT_LOGS TABLE
-- ====================

-- Composite index for audit log queries by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup
    ON audit_logs(entity_type, entity_id, created_at DESC);

-- Index for finding user actions
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_actions
    ON audit_logs(user_id, action, created_at DESC);

-- ====================
-- GENERATED_DOCUMENTS TABLE
-- ====================

-- Index for finding documents by patient and type
CREATE INDEX IF NOT EXISTS idx_generated_docs_patient_type
    ON generated_documents(patient_id, document_type, created_at DESC);

-- Index for finding documents by visit
CREATE INDEX IF NOT EXISTS idx_generated_docs_visit
    ON generated_documents(visit_id, created_at DESC)
    WHERE visit_id IS NOT NULL;

-- ====================
-- NOTIFICATION_QUEUE TABLE
-- ====================

-- Index for processing notifications by priority and scheduled time
CREATE INDEX IF NOT EXISTS idx_notification_priority_queue
    ON notification_queue(priority ASC, scheduled_for ASC)
    WHERE status = 'PENDING';

-- Index for retry processing
CREATE INDEX IF NOT EXISTS idx_notification_retry_queue
    ON notification_queue(next_retry_at ASC, priority ASC)
    WHERE status = 'FAILED' AND next_retry_at IS NOT NULL;

-- ====================
-- PATIENT_INSURANCE TABLE
-- ====================

-- Index for active insurance policies
CREATE INDEX IF NOT EXISTS idx_patient_insurance_active
    ON patient_insurance(patient_id, insurance_type)
    WHERE is_active = true;

-- Index for expiring policies (for renewal reminders)
CREATE INDEX IF NOT EXISTS idx_patient_insurance_expiring
    ON patient_insurance(expiration_date)
    WHERE is_active = true AND expiration_date IS NOT NULL;

-- ====================
-- VISIT_DIAGNOSES TABLE
-- ====================

-- Index for finding all diagnoses for a patient
CREATE INDEX IF NOT EXISTS idx_visit_diagnoses_patient
    ON visit_diagnoses(patient_id, created_at DESC);

-- Index for active diagnoses
CREATE INDEX IF NOT EXISTS idx_visit_diagnoses_active
    ON visit_diagnoses(patient_id, is_active)
    WHERE is_active = true;

-- Index for ICD-10 code lookup (for reporting)
CREATE INDEX IF NOT EXISTS idx_visit_diagnoses_icd10
    ON visit_diagnoses(icd10_code, created_at DESC);

-- Comments for documentation
COMMENT ON INDEX idx_patients_name_composite IS 'Composite index for fast name-based patient search';
COMMENT ON INDEX idx_patients_dob IS 'Index for age filtering and birthday reminders';
COMMENT ON INDEX idx_appointments_date_range IS 'Index for date range queries on active appointments';
COMMENT ON INDEX idx_visits_patient_date IS 'Index for patient visit history queries';
COMMENT ON INDEX idx_prescriptions_active IS 'Index for finding active prescriptions by patient';
COMMENT ON INDEX idx_audit_logs_entity_lookup IS 'Index for audit trail queries by entity';
COMMENT ON INDEX idx_notification_priority_queue IS 'Index for notification queue processing';
