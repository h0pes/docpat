/**
 * Seed Test Data Script
 *
 * Creates test patients and appointments for E2E testing and development.
 * Run with: psql -U mpms_user -d mpms_dev -f seed_test_data.sql
 */

-- Temporarily disable RLS for data seeding
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Get test user IDs (we'll use these as created_by)
DO $$
DECLARE
    v_testdoctor_id UUID;
    v_testadmin_id UUID;
    v_patient1_id UUID;
    v_patient2_id UUID;
    v_patient3_id UUID;
    v_patient4_id UUID;
    v_patient5_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO v_testdoctor_id FROM users WHERE username = 'testdoctor';
    SELECT id INTO v_testadmin_id FROM users WHERE username = 'testadmin';

    -- Check if users exist
    IF v_testdoctor_id IS NULL OR v_testadmin_id IS NULL THEN
        RAISE EXCEPTION 'Test users not found. Please create testdoctor and testadmin first.';
    END IF;

    RAISE NOTICE 'Using testdoctor ID: %', v_testdoctor_id;
    RAISE NOTICE 'Using testadmin ID: %', v_testadmin_id;

    -- Delete existing test data (cascade will handle related records)
    DELETE FROM patients WHERE email LIKE '%@test.docpat%';

    RAISE NOTICE 'Creating test patients...';

    -- Insert test patients
    -- Patient 1: John Doe (referenced in E2E tests)
    INSERT INTO patients (
        medical_record_number, first_name, last_name, date_of_birth, gender,
        phone_primary, email, status, created_by, updated_by
    ) VALUES (
        'MRN-2025-0001', 'John', 'Doe', '1985-03-15', 'M',
        '+39 333 1234567', 'john.doe@test.docpat', 'ACTIVE',
        v_testdoctor_id, v_testdoctor_id
    ) RETURNING id INTO v_patient1_id;

    -- Patient 2: Jane Smith
    INSERT INTO patients (
        medical_record_number, first_name, last_name, date_of_birth, gender,
        phone_primary, email, status, created_by, updated_by
    ) VALUES (
        'MRN-2025-0002', 'Jane', 'Smith', '1990-07-22', 'F',
        '+39 333 2345678', 'jane.smith@test.docpat', 'ACTIVE',
        v_testdoctor_id, v_testdoctor_id
    ) RETURNING id INTO v_patient2_id;

    -- Patient 3: Robert Johnson
    INSERT INTO patients (
        medical_record_number, first_name, last_name, date_of_birth, gender,
        phone_primary, email, status, created_by, updated_by
    ) VALUES (
        'MRN-2025-0003', 'Robert', 'Johnson', '1978-11-08', 'M',
        '+39 333 3456789', 'robert.johnson@test.docpat', 'ACTIVE',
        v_testdoctor_id, v_testdoctor_id
    ) RETURNING id INTO v_patient3_id;

    -- Patient 4: Maria Garcia
    INSERT INTO patients (
        medical_record_number, first_name, last_name, date_of_birth, gender,
        phone_primary, email, status, created_by, updated_by
    ) VALUES (
        'MRN-2025-0004', 'Maria', 'Garcia', '1995-01-30', 'F',
        '+39 333 4567890', 'maria.garcia@test.docpat', 'ACTIVE',
        v_testdoctor_id, v_testdoctor_id
    ) RETURNING id INTO v_patient4_id;

    -- Patient 5: William Brown
    INSERT INTO patients (
        medical_record_number, first_name, last_name, date_of_birth, gender,
        phone_primary, email, status, created_by, updated_by
    ) VALUES (
        'MRN-2025-0005', 'William', 'Brown', '1982-06-12', 'M',
        '+39 333 5678901', 'william.brown@test.docpat', 'ACTIVE',
        v_testdoctor_id, v_testdoctor_id
    ) RETURNING id INTO v_patient5_id;

    RAISE NOTICE 'Created 5 test patients';
    RAISE NOTICE 'Creating test appointments...';

    -- Insert test appointments
    -- Future appointments for testing

    -- Appointment 1: John Doe - Future appointment
    INSERT INTO appointments (
        patient_id, provider_id,
        scheduled_start, scheduled_end, duration_minutes,
        type, status, reason,
        created_by, updated_by
    ) VALUES (
        v_patient1_id, v_testdoctor_id,
        '2025-12-15 10:00:00+00', '2025-12-15 10:30:00+00', 30,
        'FOLLOW_UP', 'SCHEDULED', 'Regular checkup',
        v_testdoctor_id, v_testdoctor_id
    );

    -- Appointment 2: Jane Smith - Future appointment
    INSERT INTO appointments (
        patient_id, provider_id,
        scheduled_start, scheduled_end, duration_minutes,
        type, status, reason,
        created_by, updated_by
    ) VALUES (
        v_patient2_id, v_testdoctor_id,
        '2025-12-15 14:00:00+00', '2025-12-15 14:45:00+00', 45,
        'CONSULTATION', 'SCHEDULED', 'Initial consultation',
        v_testdoctor_id, v_testdoctor_id
    );

    -- Appointment 3: Robert Johnson - Past appointment (completed)
    INSERT INTO appointments (
        patient_id, provider_id,
        scheduled_start, scheduled_end, duration_minutes,
        type, status, reason, confirmed_at, checked_in_at, checked_out_at,
        created_by, updated_by
    ) VALUES (
        v_patient3_id, v_testdoctor_id,
        '2025-11-10 09:00:00+00', '2025-11-10 09:30:00+00', 30,
        'FOLLOW_UP', 'COMPLETED', 'Follow-up visit',
        '2025-11-09 10:00:00+00', '2025-11-10 09:05:00+00', '2025-11-10 09:35:00+00',
        v_testdoctor_id, v_testdoctor_id
    );

    -- Appointment 4: Maria Garcia - Cancelled appointment
    INSERT INTO appointments (
        patient_id, provider_id,
        scheduled_start, scheduled_end, duration_minutes,
        type, status, reason, cancellation_reason, cancelled_by, cancelled_at,
        created_by, updated_by
    ) VALUES (
        v_patient4_id, v_testdoctor_id,
        '2025-12-20 11:00:00+00', '2025-12-20 11:30:00+00', 30,
        'CONSULTATION', 'CANCELLED', 'New patient consultation',
        'Patient requested reschedule', v_testdoctor_id, '2025-11-15 14:30:00+00',
        v_testdoctor_id, v_testdoctor_id
    );

    -- Appointment 5: William Brown - Confirmed appointment
    INSERT INTO appointments (
        patient_id, provider_id,
        scheduled_start, scheduled_end, duration_minutes,
        type, status, reason, confirmed_at, reminder_sent_email,
        created_by, updated_by
    ) VALUES (
        v_patient5_id, v_testdoctor_id,
        '2025-12-18 15:30:00+00', '2025-12-18 16:00:00+00', 30,
        'FOLLOW_UP', 'CONFIRMED', 'Follow-up checkup',
        NOW(), true,
        v_testdoctor_id, v_testdoctor_id
    );

    RAISE NOTICE 'Created 5 test appointments';
    RAISE NOTICE 'Test data seeded successfully!';

    -- Display summary
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE 'Test Data Summary:';
    RAISE NOTICE '  Patients: 5';
    RAISE NOTICE '    - John Doe (MRN-2025-0001)';
    RAISE NOTICE '    - Jane Smith (MRN-2025-0002)';
    RAISE NOTICE '    - Robert Johnson (MRN-2025-0003)';
    RAISE NOTICE '    - Maria Garcia (MRN-2025-0004)';
    RAISE NOTICE '    - William Brown (MRN-2025-0005)';
    RAISE NOTICE '  Appointments: 5';
    RAISE NOTICE '    - 2 Scheduled (John, Jane)';
    RAISE NOTICE '    - 1 Completed (Robert)';
    RAISE NOTICE '    - 1 Cancelled (Maria)';
    RAISE NOTICE '    - 1 Confirmed (William)';
    RAISE NOTICE '═══════════════════════════════════════';

END $$;

-- Re-enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
