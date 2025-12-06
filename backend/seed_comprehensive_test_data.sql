-- ============================================
-- DocPat Comprehensive Test Data Seed Script
-- ============================================
-- This script inserts comprehensive test data for ALL functionality in the application.
-- It populates all tables respecting foreign keys, constraints, triggers, and RLS.
--
-- Run from the project root:
--   PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_dev -h localhost -f backend/seed_comprehensive_test_data.sql
--   PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -h localhost -f backend/seed_comprehensive_test_data.sql
-- ============================================

BEGIN;

-- ============================================
-- 1. USERS - Ensure test users exist
-- ============================================
-- Password hash for 'Test123!' generated with Argon2
-- Note: In production, use proper password hashing. This is for testing only.

INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, phone, is_active, mfa_enabled, created_at, updated_at)
VALUES
    ('c0c53f8d-e643-434c-a802-5cbc764185a3', 'testdoctor', 'testdoctor@docpat.local',
     '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG',
     'DOCTOR', 'Dr. Marco', 'Rossi', '+39 333 1234567', true, false, NOW() - INTERVAL '1 year', NOW()),
    ('0bd21b8d-b27c-452e-a4a8-1e2f020d880a', 'testadmin', 'testadmin@docpat.local',
     '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG',
     'ADMIN', 'Admin', 'User', '+39 333 7654321', true, false, NOW() - INTERVAL '1 year', NOW())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active;

-- Store user IDs for later use
DO $$
DECLARE
    v_doctor_id UUID := 'c0c53f8d-e643-434c-a802-5cbc764185a3';
    v_admin_id UUID := '0bd21b8d-b27c-452e-a4a8-1e2f020d880a';

    -- Patient IDs (fixed UUIDs for reproducibility)
    v_patient1_id UUID := 'a1111111-1111-1111-1111-111111111111';
    v_patient2_id UUID := 'a2222222-2222-2222-2222-222222222222';
    v_patient3_id UUID := 'a3333333-3333-3333-3333-333333333333';
    v_patient4_id UUID := 'a4444444-4444-4444-4444-444444444444';
    v_patient5_id UUID := 'a5555555-5555-5555-5555-555555555555';
    v_patient6_id UUID := 'a6666666-6666-6666-6666-666666666666';
    v_patient7_id UUID := 'a7777777-7777-7777-7777-777777777777';
    v_patient8_id UUID := 'a8888888-8888-8888-8888-888888888888';
    v_patient9_id UUID := 'a9999999-9999-9999-9999-999999999999';
    v_patient10_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_patient11_id UUID := 'b1111111-1111-1111-1111-111111111111';
    v_patient12_id UUID := 'b2222222-2222-2222-2222-222222222222';

    -- Template IDs
    v_template_med_cert_it UUID;
    v_template_referral_it UUID;
    v_template_lab_request UUID;
    v_template_visit_summary UUID;
    v_template_prescription UUID;

BEGIN
    -- ============================================
    -- 2. PATIENTS - 12 diverse patients
    -- ============================================

    -- Patient 1: Elderly male with hypertension and diabetes (active, complex case)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, phone_secondary, email, preferred_contact_method,
                          address, emergency_contact, blood_type, allergies, chronic_conditions,
                          current_medications, health_card_expire, status, notes,
                          created_by, updated_by, created_at)
    VALUES (v_patient1_id, 'MRN-2024-0001', 'Mario', 'Rossi', '1945-03-15', 'M', 'RSSMRA45C15H501Z',
            '+39 333 1234567', '+39 333 1234568', 'mario.rossi@email.it', 'PHONE',
            '{"street": "Via Roma 123", "city": "Roma", "state": "RM", "zip": "00100", "country": "IT"}',
            '{"name": "Lucia Rossi", "relationship": "SPOUSE", "phone": "+39 333 9876543"}',
            'A+', ARRAY['Penicillin', 'Sulfa drugs'], ARRAY['Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia'],
            '[{"name": "Lisinopril", "dosage": "10mg", "frequency": "daily"}, {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"}]',
            '2026-12-31', 'ACTIVE', 'Long-term patient. Requires regular follow-up for chronic conditions.',
            v_doctor_id, v_doctor_id, NOW() - INTERVAL '8 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 2: Middle-aged female with asthma (active)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, emergency_contact, blood_type, allergies, chronic_conditions,
                          health_card_expire, status, created_by, updated_by, created_at)
    VALUES (v_patient2_id, 'MRN-2024-0002', 'Giulia', 'Bianchi', '1975-07-22', 'F', 'BNCGLI75L62H501W',
            '+39 333 2345678', 'giulia.bianchi@email.it', 'EMAIL',
            '{"street": "Via Milano 45", "city": "Milano", "state": "MI", "zip": "20100", "country": "IT"}',
            '{"name": "Paolo Bianchi", "relationship": "SPOUSE", "phone": "+39 333 8765432"}',
            'O-', ARRAY['Aspirin'], ARRAY['Asthma - mild persistent'],
            '2027-06-30', 'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '6 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 3: Young adult male (healthy, minimal history)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, blood_type, status, created_by, updated_by, created_at)
    VALUES (v_patient3_id, 'MRN-2024-0003', 'Luca', 'Ferrari', '1992-11-08', 'M', 'FRRLCU92S08H501Y',
            '+39 333 3456789', 'luca.ferrari@email.it', 'WHATSAPP',
            '{"street": "Via Napoli 78", "city": "Napoli", "state": "NA", "zip": "80100", "country": "IT"}',
            'B+', 'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '5 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 4: Elderly female with multiple conditions (complex geriatric case)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, emergency_contact, blood_type, allergies, chronic_conditions,
                          current_medications, health_card_expire, status, notes,
                          created_by, updated_by, created_at)
    VALUES (v_patient4_id, 'MRN-2024-0004', 'Anna', 'Colombo', '1938-01-30', 'F', 'CLMANN38A70H501X',
            '+39 333 4567890', 'anna.colombo@email.it', 'PHONE',
            '{"street": "Via Firenze 12", "city": "Firenze", "state": "FI", "zip": "50100", "country": "IT"}',
            '{"name": "Marco Colombo", "relationship": "CHILD", "phone": "+39 333 7654321"}',
            'AB+', ARRAY['Iodine', 'Codeine'], ARRAY['Osteoarthritis', 'COPD', 'Hypertension', 'Atrial Fibrillation'],
            '[{"name": "Warfarin", "dosage": "5mg", "frequency": "daily"}, {"name": "Tiotropium", "dosage": "18mcg", "frequency": "daily"}]',
            '2025-12-31', 'ACTIVE', 'Geriatric patient requiring careful medication management. INR monitoring needed.',
            v_doctor_id, v_doctor_id, NOW() - INTERVAL '10 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 5: Middle-aged male with chronic pain (acupuncture candidate)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, blood_type, chronic_conditions, status,
                          created_by, updated_by, created_at)
    VALUES (v_patient5_id, 'MRN-2024-0005', 'Giuseppe', 'Romano', '1968-05-12', 'M', 'RMNGSP68E12H501V',
            '+39 333 5678901', 'giuseppe.romano@email.it', 'SMS',
            '{"street": "Via Torino 56", "city": "Torino", "state": "TO", "zip": "10100", "country": "IT"}',
            'A-', ARRAY['Chronic Lower Back Pain', 'Migraine without aura', 'Anxiety'],
            'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '4 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 6: Young adult female (anxiety, new patient)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, blood_type, allergies, chronic_conditions, status,
                          created_by, updated_by, created_at)
    VALUES (v_patient6_id, 'MRN-2024-0006', 'Sara', 'Ricci', '1995-09-25', 'F', 'RCCSRA95P65H501U',
            '+39 333 6789012', 'sara.ricci@email.it', 'EMAIL',
            '{"street": "Via Bologna 89", "city": "Bologna", "state": "BO", "zip": "40100", "country": "IT"}',
            'O+', ARRAY['Latex'], ARRAY['Generalized Anxiety Disorder'],
            'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '3 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 7: Elderly male with Alzheimer's (dementia care)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, emergency_contact, blood_type, chronic_conditions, current_medications,
                          status, notes, created_by, updated_by, created_at)
    VALUES (v_patient7_id, 'MRN-2024-0007', 'Franco', 'Marino', '1940-12-05', 'M', 'MRNFNC40T05H501T',
            '+39 333 7890123', 'franco.marino.caregiver@email.it', 'PHONE',
            '{"street": "Via Genova 34", "city": "Genova", "state": "GE", "zip": "16100", "country": "IT"}',
            '{"name": "Maria Marino", "relationship": "SPOUSE", "phone": "+39 333 6543210"}',
            'B-', ARRAY['Alzheimer disease - early onset', 'Hypertension'],
            '[{"name": "Donepezil", "dosage": "5mg", "frequency": "daily at bedtime"}, {"name": "Amlodipine", "dosage": "5mg", "frequency": "daily"}]',
            'ACTIVE', 'Primary caregiver is spouse Maria. Requires supervision for appointments.',
            v_doctor_id, v_doctor_id, NOW() - INTERVAL '9 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 8: Middle-aged female (healthy, with insurance)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, blood_type, health_card_expire, status,
                          created_by, updated_by, created_at)
    VALUES (v_patient8_id, 'MRN-2024-0008', 'Elena', 'Greco', '1972-04-18', 'F', 'GRCELN72D58H501S',
            '+39 333 8901234', 'elena.greco@email.it', 'EMAIL',
            '{"street": "Via Palermo 67", "city": "Palermo", "state": "PA", "zip": "90100", "country": "IT"}',
            'A+', '2027-03-31', 'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '2 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 9: Young male (recent acute illness)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, blood_type, status, created_by, updated_by, created_at)
    VALUES (v_patient9_id, 'MRN-2024-0009', 'Andrea', 'Bruno', '1988-08-14', 'M', 'BRNNDR88M14H501R',
            '+39 333 9012345', 'andrea.bruno@email.it', 'WHATSAPP',
            '{"street": "Via Venezia 23", "city": "Venezia", "state": "VE", "zip": "30100", "country": "IT"}',
            'AB-', 'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '45 days')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 10: Elderly female (atrial fibrillation, osteoporosis)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, emergency_contact, blood_type, chronic_conditions, current_medications,
                          status, created_by, updated_by, created_at)
    VALUES (v_patient10_id, 'MRN-2025-0001', 'Maria', 'Conti', '1935-02-28', 'F', 'CNTMRA35B68H501Q',
            '+39 333 0123456', 'maria.conti@email.it', 'PHONE',
            '{"street": "Via Verona 90", "city": "Verona", "state": "VR", "zip": "37100", "country": "IT"}',
            '{"name": "Giovanni Conti", "relationship": "CHILD", "phone": "+39 333 5432109"}',
            'O+', ARRAY['Atrial Fibrillation', 'Osteoporosis', 'Hypothyroidism'],
            '[{"name": "Apixaban", "dosage": "5mg", "frequency": "twice daily"}, {"name": "Alendronate", "dosage": "70mg", "frequency": "weekly"}, {"name": "Levothyroxine", "dosage": "50mcg", "frequency": "daily"}]',
            'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '20 days')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 11: Inactive patient (moved away)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, blood_type, status, notes,
                          created_by, updated_by, created_at)
    VALUES (v_patient11_id, 'MRN-2024-0010', 'Paolo', 'Villa', '1960-06-20', 'M', 'VLLPLA60H20H501P',
            '+39 333 1122334', 'paolo.villa@email.it', 'A+', 'INACTIVE',
            'Patient relocated to another city. Records transferred.',
            v_doctor_id, v_doctor_id, NOW() - INTERVAL '11 months')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 12: New patient (just registered)
    INSERT INTO patients (id, medical_record_number, first_name, last_name, date_of_birth, gender, fiscal_code,
                          phone_primary, email, preferred_contact_method,
                          address, blood_type, health_card_expire, status,
                          created_by, updated_by, created_at)
    VALUES (v_patient12_id, 'MRN-2025-0002', 'Chiara', 'Moretti', '1998-10-10', 'F', 'MRTCHR98R50H501O',
            '+39 333 2233445', 'chiara.moretti@email.it', 'EMAIL',
            '{"street": "Via Trieste 45", "city": "Trieste", "state": "TS", "zip": "34100", "country": "IT"}',
            'B+', '2028-06-30', 'ACTIVE', v_doctor_id, v_doctor_id, NOW() - INTERVAL '5 days')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Inserted 12 patients';

    -- ============================================
    -- 3. PATIENT INSURANCE
    -- ============================================

    INSERT INTO patient_insurance (patient_id, insurance_type, provider_name, policy_number, group_number,
                                    plan_name, policyholder_name, policyholder_relationship,
                                    effective_date, expiration_date, coverage_type, is_active,
                                    created_by, created_at)
    VALUES
        (v_patient1_id, 'PRIMARY', 'UniSalute', 'POL-2024-001234', 'GRP-5678',
         'Piano Base Famiglia', 'Mario Rossi', 'SELF',
         '2024-01-01', '2025-12-31', 'PPO', true, v_doctor_id, NOW() - INTERVAL '8 months'),
        (v_patient4_id, 'PRIMARY', 'Generali Welion', 'POL-2024-005678', 'GRP-9012',
         'Senior Care Plus', 'Anna Colombo', 'SELF',
         '2024-01-01', '2025-12-31', 'HMO', true, v_doctor_id, NOW() - INTERVAL '10 months'),
        (v_patient8_id, 'PRIMARY', 'Allianz Care', 'POL-2024-009012', 'GRP-3456',
         'Individual Premium', 'Elena Greco', 'SELF',
         '2024-06-01', '2026-05-31', 'PPO', true, v_doctor_id, NOW() - INTERVAL '2 months'),
        (v_patient10_id, 'PRIMARY', 'Intesa Sanpaolo Assicura', 'POL-2024-003456', 'GRP-7890',
         'Over 80 Protection', 'Maria Conti', 'SELF',
         '2024-01-01', '2025-12-31', 'EPO', true, v_doctor_id, NOW() - INTERVAL '20 days')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted patient insurance records';

    -- ============================================
    -- 4. APPOINTMENTS - Various statuses and types
    -- ============================================

    -- October 2025 appointments (completed)
    INSERT INTO appointments (patient_id, provider_id, scheduled_start, scheduled_end, duration_minutes, type,
                              status, reason, confirmed_at, checked_in_at, checked_out_at, created_by, created_at)
    VALUES
        (v_patient1_id, v_doctor_id, '2025-10-06 09:00:00+02', '2025-10-06 09:30:00+02', 30, 'FOLLOW_UP',
         'COMPLETED', 'Blood pressure check and medication review', '2025-10-05 10:00:00+02', '2025-10-06 08:55:00+02', '2025-10-06 09:32:00+02', v_doctor_id, '2025-10-03 10:00:00+02'),
        (v_patient2_id, v_doctor_id, '2025-10-07 10:00:00+02', '2025-10-07 11:00:00+02', 60, 'NEW_PATIENT',
         'COMPLETED', 'Initial consultation and health assessment', '2025-10-06 11:00:00+02', '2025-10-07 09:58:00+02', '2025-10-07 11:05:00+02', v_doctor_id, '2025-10-04 11:00:00+02'),
        (v_patient3_id, v_doctor_id, '2025-10-08 11:00:00+02', '2025-10-08 11:30:00+02', 30, 'ROUTINE_CHECKUP',
         'COMPLETED', 'Annual wellness exam', '2025-10-07 09:00:00+02', '2025-10-08 10:57:00+02', '2025-10-08 11:33:00+02', v_doctor_id, '2025-10-05 09:00:00+02'),
        (v_patient4_id, v_doctor_id, '2025-10-09 09:30:00+02', '2025-10-09 10:30:00+02', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Pain management - knee arthritis', '2025-10-08 14:00:00+02', '2025-10-09 09:28:00+02', '2025-10-09 10:35:00+02', v_doctor_id, '2025-10-06 14:00:00+02'),
        (v_patient5_id, v_doctor_id, '2025-10-10 14:00:00+02', '2025-10-10 15:00:00+02', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Chronic back pain treatment', '2025-10-09 09:00:00+02', '2025-10-10 13:58:00+02', '2025-10-10 15:05:00+02', v_doctor_id, '2025-10-07 09:00:00+02'),
        (v_patient6_id, v_doctor_id, '2025-10-13 10:00:00+02', '2025-10-13 10:30:00+02', 30, 'CONSULTATION',
         'COMPLETED', 'Anxiety management follow-up', '2025-10-12 16:00:00+02', '2025-10-13 09:58:00+02', '2025-10-13 10:35:00+02', v_doctor_id, '2025-10-10 16:00:00+02'),
        (v_patient7_id, v_doctor_id, '2025-10-14 09:00:00+02', '2025-10-14 09:30:00+02', 30, 'FOLLOW_UP',
         'COMPLETED', 'Cognitive status assessment', '2025-10-13 10:00:00+02', '2025-10-14 08:58:00+02', '2025-10-14 09:33:00+02', v_doctor_id, '2025-10-11 10:00:00+02'),
        (v_patient8_id, v_doctor_id, '2025-10-15 11:00:00+02', '2025-10-15 11:30:00+02', 30, 'ROUTINE_CHECKUP',
         'COMPLETED', 'General health checkup', '2025-10-14 09:00:00+02', '2025-10-15 10:57:00+02', '2025-10-15 11:32:00+02', v_doctor_id, '2025-10-12 09:00:00+02'),
        (v_patient9_id, v_doctor_id, '2025-10-16 15:00:00+02', '2025-10-16 15:30:00+02', 30, 'URGENT',
         'COMPLETED', 'Acute respiratory symptoms', '2025-10-16 09:00:00+02', '2025-10-16 14:55:00+02', '2025-10-16 15:40:00+02', v_doctor_id, '2025-10-16 08:00:00+02'),
        (v_patient10_id, v_doctor_id, '2025-10-17 10:00:00+02', '2025-10-17 11:00:00+02', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Arthritis pain management', '2025-10-16 11:00:00+02', '2025-10-17 09:58:00+02', '2025-10-17 11:05:00+02', v_doctor_id, '2025-10-14 11:00:00+02'),
        (v_patient1_id, v_doctor_id, '2025-10-20 09:00:00+02', '2025-10-20 09:30:00+02', 30, 'FOLLOW_UP',
         'COMPLETED', 'Diabetes management check', '2025-10-19 10:00:00+02', '2025-10-20 08:58:00+02', '2025-10-20 09:33:00+02', v_doctor_id, '2025-10-17 10:00:00+02'),
        (v_patient2_id, v_doctor_id, '2025-10-21 10:00:00+02', '2025-10-21 10:30:00+02', 30, 'FOLLOW_UP',
         'COMPLETED', 'Asthma control assessment', '2025-10-20 11:00:00+02', '2025-10-21 09:58:00+02', '2025-10-21 10:35:00+02', v_doctor_id, '2025-10-18 11:00:00+02'),
        (v_patient3_id, v_doctor_id, '2025-10-22 11:00:00+02', '2025-10-22 12:00:00+02', 60, 'CONSULTATION',
         'COMPLETED', 'Sports medicine consultation', '2025-10-21 14:00:00+02', '2025-10-22 10:58:00+02', '2025-10-22 12:05:00+02', v_doctor_id, '2025-10-19 14:00:00+02'),
        (v_patient4_id, v_doctor_id, '2025-10-23 09:30:00+02', '2025-10-23 10:00:00+02', 30, 'FOLLOW_UP',
         'COMPLETED', 'INR check - Warfarin monitoring', '2025-10-22 09:00:00+02', '2025-10-23 09:28:00+02', '2025-10-23 10:02:00+02', v_doctor_id, '2025-10-20 09:00:00+02'),
        (v_patient5_id, v_doctor_id, '2025-10-24 14:00:00+02', '2025-10-24 15:00:00+02', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Weekly acupuncture session', '2025-10-23 10:00:00+02', '2025-10-24 13:58:00+02', '2025-10-24 15:05:00+02', v_doctor_id, '2025-10-21 10:00:00+02')
    ON CONFLICT DO NOTHING;

    -- November 2025 appointments (completed)
    INSERT INTO appointments (patient_id, provider_id, scheduled_start, scheduled_end, duration_minutes, type,
                              status, reason, confirmed_at, checked_in_at, checked_out_at, created_by, created_at)
    VALUES
        (v_patient1_id, v_doctor_id, '2025-11-03 09:00:00+01', '2025-11-03 09:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Monthly BP and glucose check', '2025-11-02 10:00:00+01', '2025-11-03 08:55:00+01', '2025-11-03 09:35:00+01', v_doctor_id, '2025-11-01 10:00:00+01'),
        (v_patient2_id, v_doctor_id, '2025-11-03 10:00:00+01', '2025-11-03 10:45:00+01', 45, 'FOLLOW_UP',
         'COMPLETED', 'Asthma action plan review', '2025-11-02 11:00:00+01', '2025-11-03 09:58:00+01', '2025-11-03 10:50:00+01', v_doctor_id, '2025-11-01 11:00:00+01'),
        (v_patient3_id, v_doctor_id, '2025-11-04 11:00:00+01', '2025-11-04 11:30:00+01', 30, 'ROUTINE_CHECKUP',
         'COMPLETED', 'Fitness clearance for gym', '2025-11-03 09:00:00+01', '2025-11-04 10:55:00+01', '2025-11-04 11:35:00+01', v_doctor_id, '2025-11-02 09:00:00+01'),
        (v_patient4_id, v_doctor_id, '2025-11-05 09:30:00+01', '2025-11-05 10:00:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Medication review - multiple meds', '2025-11-04 14:00:00+01', '2025-11-05 09:28:00+01', '2025-11-05 10:05:00+01', v_doctor_id, '2025-11-03 14:00:00+01'),
        (v_patient5_id, v_doctor_id, '2025-11-06 14:00:00+01', '2025-11-06 15:00:00+01', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Migraine prevention treatment', '2025-11-05 09:00:00+01', '2025-11-06 13:55:00+01', '2025-11-06 15:05:00+01', v_doctor_id, '2025-11-04 09:00:00+01'),
        (v_patient6_id, v_doctor_id, '2025-11-07 10:30:00+01', '2025-11-07 11:00:00+01', 30, 'CONSULTATION',
         'COMPLETED', 'Anxiety medication adjustment', '2025-11-06 16:00:00+01', '2025-11-07 10:28:00+01', '2025-11-07 11:02:00+01', v_doctor_id, '2025-11-05 16:00:00+01'),
        (v_patient7_id, v_doctor_id, '2025-11-10 09:00:00+01', '2025-11-10 09:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Alzheimer progression check', '2025-11-09 10:00:00+01', '2025-11-10 08:58:00+01', '2025-11-10 09:32:00+01', v_doctor_id, '2025-11-08 10:00:00+01'),
        (v_patient8_id, v_doctor_id, '2025-11-11 11:00:00+01', '2025-11-11 11:30:00+01', 30, 'ROUTINE_CHECKUP',
         'COMPLETED', 'Annual wellness visit', '2025-11-10 09:00:00+01', '2025-11-11 10:57:00+01', '2025-11-11 11:33:00+01', v_doctor_id, '2025-11-09 09:00:00+01'),
        (v_patient1_id, v_doctor_id, '2025-11-12 10:00:00+01', '2025-11-12 10:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Lab results discussion', '2025-11-11 14:00:00+01', '2025-11-12 09:58:00+01', '2025-11-12 10:35:00+01', v_doctor_id, '2025-11-10 14:00:00+01'),
        (v_patient9_id, v_doctor_id, '2025-11-13 15:00:00+01', '2025-11-13 16:00:00+01', 60, 'NEW_PATIENT',
         'COMPLETED', 'New patient comprehensive exam', '2025-11-12 09:00:00+01', '2025-11-13 14:55:00+01', '2025-11-13 16:10:00+01', v_doctor_id, '2025-11-11 09:00:00+01'),
        (v_patient10_id, v_doctor_id, '2025-11-14 09:30:00+01', '2025-11-14 10:30:00+01', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Joint pain management', '2025-11-13 11:00:00+01', '2025-11-14 09:25:00+01', '2025-11-14 10:35:00+01', v_doctor_id, '2025-11-12 11:00:00+01'),
        (v_patient2_id, v_doctor_id, '2025-11-17 09:00:00+01', '2025-11-17 09:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Spirometry results review', '2025-11-16 10:00:00+01', '2025-11-17 08:57:00+01', '2025-11-17 09:33:00+01', v_doctor_id, '2025-11-15 10:00:00+01'),
        (v_patient3_id, v_doctor_id, '2025-11-18 10:00:00+01', '2025-11-18 10:30:00+01', 30, 'URGENT',
         'COMPLETED', 'Acute ankle injury', '2025-11-18 08:00:00+01', '2025-11-18 09:55:00+01', '2025-11-18 10:40:00+01', v_doctor_id, '2025-11-18 07:00:00+01'),
        (v_patient4_id, v_doctor_id, '2025-11-19 11:00:00+01', '2025-11-19 12:00:00+01', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Bi-weekly acupuncture session', '2025-11-18 14:00:00+01', '2025-11-19 10:58:00+01', '2025-11-19 12:05:00+01', v_doctor_id, '2025-11-17 14:00:00+01'),
        (v_patient5_id, v_doctor_id, '2025-11-20 14:30:00+01', '2025-11-20 15:00:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Pain level assessment', '2025-11-19 10:00:00+01', '2025-11-20 14:28:00+01', '2025-11-20 15:03:00+01', v_doctor_id, '2025-11-18 10:00:00+01'),
        (v_patient6_id, v_doctor_id, '2025-11-21 09:00:00+01', '2025-11-21 10:00:00+01', 60, 'CONSULTATION',
         'COMPLETED', 'Mental health comprehensive', '2025-11-20 16:00:00+01', '2025-11-21 08:58:00+01', '2025-11-21 10:08:00+01', v_doctor_id, '2025-11-19 16:00:00+01'),
        (v_patient7_id, v_doctor_id, '2025-11-24 10:00:00+01', '2025-11-24 10:30:00+01', 30, 'ROUTINE_CHECKUP',
         'COMPLETED', 'Quarterly evaluation', '2025-11-23 09:00:00+01', '2025-11-24 09:58:00+01', '2025-11-24 10:32:00+01', v_doctor_id, '2025-11-22 09:00:00+01'),
        (v_patient8_id, v_doctor_id, '2025-11-25 11:30:00+01', '2025-11-25 12:00:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Vaccination follow-up', '2025-11-24 14:00:00+01', '2025-11-25 11:28:00+01', '2025-11-25 12:02:00+01', v_doctor_id, '2025-11-23 14:00:00+01'),
        (v_patient1_id, v_doctor_id, '2025-11-26 09:00:00+01', '2025-11-26 09:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Routine monitoring', '2025-11-25 09:00:00+01', '2025-11-26 08:58:00+01', '2025-11-26 09:35:00+01', v_doctor_id, '2025-11-24 09:00:00+01'),
        (v_patient9_id, v_doctor_id, '2025-11-27 15:00:00+01', '2025-11-27 15:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Post-treatment check', '2025-11-26 10:00:00+01', '2025-11-27 14:58:00+01', '2025-11-27 15:35:00+01', v_doctor_id, '2025-11-25 10:00:00+01'),
        (v_patient10_id, v_doctor_id, '2025-11-28 10:00:00+01', '2025-11-28 11:00:00+01', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Maintenance treatment', '2025-11-27 11:00:00+01', '2025-11-28 09:58:00+01', '2025-11-28 11:05:00+01', v_doctor_id, '2025-11-26 11:00:00+01')
    ON CONFLICT DO NOTHING;

    -- December 2025 appointments (mix of completed, cancelled, no-show, scheduled)
    INSERT INTO appointments (patient_id, provider_id, scheduled_start, scheduled_end, duration_minutes, type,
                              status, reason, confirmed_at, checked_in_at, checked_out_at,
                              cancellation_reason, cancelled_at, created_by, created_at)
    VALUES
        -- Completed
        (v_patient2_id, v_doctor_id, '2025-12-01 09:00:00+01', '2025-12-01 09:30:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Inhaler technique review', '2025-11-30 10:00:00+01', '2025-12-01 08:57:00+01', '2025-12-01 09:33:00+01', NULL, NULL, v_doctor_id, '2025-11-29 10:00:00+01'),
        (v_patient3_id, v_doctor_id, '2025-12-01 10:00:00+01', '2025-12-01 10:30:00+01', 30, 'ROUTINE_CHECKUP',
         'COMPLETED', 'Pre-travel health check', '2025-11-30 11:00:00+01', '2025-12-01 09:58:00+01', '2025-12-01 10:35:00+01', NULL, NULL, v_doctor_id, '2025-11-29 11:00:00+01'),
        (v_patient4_id, v_doctor_id, '2025-12-02 11:00:00+01', '2025-12-02 12:00:00+01', 60, 'ACUPUNCTURE',
         'COMPLETED', 'Pain flare management', '2025-12-01 14:00:00+01', '2025-12-02 10:58:00+01', '2025-12-02 12:05:00+01', NULL, NULL, v_doctor_id, '2025-11-30 14:00:00+01'),
        (v_patient5_id, v_doctor_id, '2025-12-03 09:30:00+01', '2025-12-03 10:00:00+01', 30, 'FOLLOW_UP',
         'COMPLETED', 'Medication efficacy check', '2025-12-02 09:00:00+01', '2025-12-03 09:28:00+01', '2025-12-03 10:02:00+01', NULL, NULL, v_doctor_id, '2025-12-01 09:00:00+01'),
        (v_patient6_id, v_doctor_id, '2025-12-04 14:00:00+01', '2025-12-04 14:30:00+01', 30, 'CONSULTATION',
         'COMPLETED', 'Therapy progress review', '2025-12-03 10:00:00+01', '2025-12-04 13:58:00+01', '2025-12-04 14:35:00+01', NULL, NULL, v_doctor_id, '2025-12-02 10:00:00+01'),

        -- Cancelled
        (v_patient7_id, v_doctor_id, '2025-12-02 09:00:00+01', '2025-12-02 09:30:00+01', 30, 'FOLLOW_UP',
         'CANCELLED', 'Quarterly check', NULL, NULL, NULL, 'Caregiver sick - will reschedule', '2025-12-01 18:00:00+01', v_doctor_id, '2025-11-28 10:00:00+01'),
        (v_patient8_id, v_doctor_id, '2025-12-03 11:00:00+01', '2025-12-03 11:30:00+01', 30, 'ROUTINE_CHECKUP',
         'CANCELLED', 'Annual check', NULL, NULL, NULL, 'Patient rescheduled - work conflict', '2025-12-02 14:00:00+01', v_doctor_id, '2025-11-29 09:00:00+01'),
        (v_patient1_id, v_doctor_id, '2025-12-04 10:00:00+01', '2025-12-04 10:30:00+01', 30, 'FOLLOW_UP',
         'CANCELLED', 'Monthly review', NULL, NULL, NULL, 'Bad weather - will reschedule', '2025-12-03 20:00:00+01', v_doctor_id, '2025-11-30 10:00:00+01'),

        -- No-show
        (v_patient9_id, v_doctor_id, '2025-12-02 15:00:00+01', '2025-12-02 15:30:00+01', 30, 'FOLLOW_UP',
         'NO_SHOW', 'Post-illness follow-up', '2025-12-01 09:00:00+01', NULL, NULL, NULL, NULL, v_doctor_id, '2025-11-28 09:00:00+01'),
        (v_patient10_id, v_doctor_id, '2025-12-04 09:00:00+01', '2025-12-04 10:00:00+01', 60, 'ACUPUNCTURE',
         'NO_SHOW', 'Regular treatment', '2025-12-03 11:00:00+01', NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-01 11:00:00+01'),

        -- Future scheduled/confirmed
        (v_patient1_id, v_doctor_id, '2025-12-08 09:00:00+01', '2025-12-08 09:30:00+01', 30, 'FOLLOW_UP',
         'CONFIRMED', 'Blood pressure and medication review', '2025-12-05 10:00:00+01', NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-03 10:00:00+01'),
        (v_patient2_id, v_doctor_id, '2025-12-08 10:00:00+01', '2025-12-08 10:30:00+01', 30, 'ROUTINE_CHECKUP',
         'CONFIRMED', 'Quarterly asthma review', '2025-12-05 11:00:00+01', NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-03 11:00:00+01'),
        (v_patient3_id, v_doctor_id, '2025-12-09 11:00:00+01', '2025-12-09 12:00:00+01', 60, 'ACUPUNCTURE',
         'SCHEDULED', 'First acupuncture session', NULL, NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-04 09:00:00+01'),
        (v_patient4_id, v_doctor_id, '2025-12-10 09:30:00+01', '2025-12-10 10:00:00+01', 30, 'FOLLOW_UP',
         'SCHEDULED', 'INR monitoring', NULL, NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-04 14:00:00+01'),
        (v_patient5_id, v_doctor_id, '2025-12-10 14:00:00+01', '2025-12-10 15:00:00+01', 60, 'ACUPUNCTURE',
         'SCHEDULED', 'Chronic pain treatment', NULL, NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-05 09:00:00+01'),
        (v_patient6_id, v_doctor_id, '2025-12-11 10:00:00+01', '2025-12-11 10:30:00+01', 30, 'FOLLOW_UP',
         'SCHEDULED', 'Anxiety management check', NULL, NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-05 10:00:00+01'),
        (v_patient7_id, v_doctor_id, '2025-12-12 09:00:00+01', '2025-12-12 09:30:00+01', 30, 'ROUTINE_CHECKUP',
         'SCHEDULED', 'Cognitive assessment', NULL, NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-05 11:00:00+01'),
        (v_patient12_id, v_doctor_id, '2025-12-15 10:00:00+01', '2025-12-15 11:00:00+01', 60, 'NEW_PATIENT',
         'SCHEDULED', 'New patient intake', NULL, NULL, NULL, NULL, NULL, v_doctor_id, '2025-12-05 14:00:00+01')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted appointments';

    -- ============================================
    -- 5. VISITS - Clinical documentation for completed appointments
    -- ============================================

    INSERT INTO visits (id, appointment_id, patient_id, provider_id, visit_date, visit_time, visit_type,
                        vitals, subjective, objective, assessment, plan, chief_complaint,
                        status, signed_at, signed_by, signature_hash, created_by, created_at)
    SELECT
        gen_random_uuid(),
        a.id,
        a.patient_id,
        a.provider_id,
        a.scheduled_start::DATE,
        a.scheduled_start,
        a.type,
        jsonb_build_object(
            'blood_pressure_systolic', 110 + (random() * 40)::int,
            'blood_pressure_diastolic', 65 + (random() * 25)::int,
            'heart_rate', 60 + (random() * 30)::int,
            'temperature_celsius', round((36.2 + random() * 1.0)::numeric, 1),
            'weight_kg', 55 + (random() * 40)::int,
            'height_cm', 155 + (random() * 35)::int,
            'oxygen_saturation', 95 + (random() * 4)::int
        ),
        CASE
            WHEN a.patient_id = v_patient1_id THEN 'Patient reports stable blood pressure control. Occasional mild headaches in the morning. Blood glucose levels have been within target range.'
            WHEN a.patient_id = v_patient2_id THEN 'Reports good control of asthma symptoms. Using rescue inhaler 1-2 times per week. No nocturnal symptoms. Sleeping well.'
            WHEN a.patient_id = v_patient3_id THEN 'No current complaints. Seeking routine checkup. Exercises regularly, no pain or discomfort during activity.'
            WHEN a.patient_id = v_patient4_id THEN 'Reports moderate knee pain, worse in the morning. Difficulty with stairs. Breathing stable. Taking medications as prescribed.'
            WHEN a.patient_id = v_patient5_id THEN 'Chronic lower back pain continues, level 5/10 today. Some relief after last acupuncture session. Migraines less frequent this month.'
            WHEN a.patient_id = v_patient6_id THEN 'Anxiety symptoms somewhat improved. Reports better sleep. Still experiencing occasional panic episodes, about twice weekly.'
            WHEN a.patient_id = v_patient7_id THEN 'Caregiver reports patient is stable. Minor increase in confusion in the evening (sundowning). Medication compliance good with supervision.'
            WHEN a.patient_id = v_patient8_id THEN 'No complaints. Here for routine wellness check. Active lifestyle, no concerns.'
            WHEN a.patient_id = v_patient9_id THEN 'Initially presented with fever, cough, and sore throat. Now improved after treatment. Finishing antibiotic course.'
            WHEN a.patient_id = v_patient10_id THEN 'Reports occasional palpitations, usually brief. Bone pain in hips. Taking all medications as prescribed.'
            ELSE 'Patient presents for scheduled visit.'
        END,
        CASE
            WHEN a.patient_id = v_patient1_id THEN 'Vital signs stable. BP well controlled. Lungs clear. Heart regular rhythm. Peripheral pulses normal. No edema.'
            WHEN a.patient_id = v_patient2_id THEN 'Respiratory exam: no wheezing on auscultation. Peak flow at 85% predicted. Oxygen saturation 98% on room air.'
            WHEN a.patient_id = v_patient3_id THEN 'General appearance: healthy young male. All systems examination unremarkable. Normal musculoskeletal exam.'
            WHEN a.patient_id = v_patient4_id THEN 'Joint examination: bilateral knee crepitus, mild swelling left knee. Lungs with diminished breath sounds at bases. Heart irregular irregularly.'
            WHEN a.patient_id = v_patient5_id THEN 'Spine examination: paraspinal muscle tenderness L4-L5. Limited lumbar flexion. Straight leg raise negative bilaterally.'
            WHEN a.patient_id = v_patient6_id THEN 'Mental status: alert and oriented x3. Affect anxious but appropriate. No suicidal ideation. Cognition intact.'
            WHEN a.patient_id = v_patient7_id THEN 'Cognitive screen: MMSE 22/30, stable from last visit. Physical exam unremarkable. Gait stable with walker.'
            WHEN a.patient_id = v_patient8_id THEN 'Complete physical examination performed. All findings within normal limits. No concerns identified.'
            WHEN a.patient_id = v_patient9_id THEN 'Afebrile today. Throat mildly erythematous, no exudate. Lungs clear. Hydration status improved.'
            WHEN a.patient_id = v_patient10_id THEN 'Cardiac exam: irregularly irregular rhythm. Lungs clear. DEXA scan ordered for osteoporosis monitoring.'
            ELSE 'Physical examination performed. Findings documented.'
        END,
        CASE
            WHEN a.patient_id = v_patient1_id THEN 'Essential hypertension - well controlled on current regimen. Type 2 diabetes mellitus - HbA1c pending. Hyperlipidemia - stable.'
            WHEN a.patient_id = v_patient2_id THEN 'Asthma, mild persistent - well controlled. Continue current maintenance therapy. Consider step-down if control maintained.'
            WHEN a.patient_id = v_patient3_id THEN 'Healthy young adult. No acute or chronic medical conditions identified. Cleared for sports activity.'
            WHEN a.patient_id = v_patient4_id THEN 'Primary generalized osteoarthritis - bilateral knees most affected. COPD - stable on current therapy. Atrial fibrillation - anticoagulated with warfarin.'
            WHEN a.patient_id = v_patient5_id THEN 'Chronic low back pain - likely mechanical. Migraine without aura - frequency decreasing. Generalized anxiety disorder - secondary.'
            WHEN a.patient_id = v_patient6_id THEN 'Generalized anxiety disorder - partially controlled on current SSRI. No evidence of major depression. Therapy beneficial.'
            WHEN a.patient_id = v_patient7_id THEN 'Alzheimer disease, early onset - stable. Hypertension - controlled. Caregiver coping well. No behavioral issues currently.'
            WHEN a.patient_id = v_patient8_id THEN 'Well woman visit. Health maintenance current. No concerns identified. Preventive care up to date.'
            WHEN a.patient_id = v_patient9_id THEN 'Acute upper respiratory infection - viral, resolving. Completed antibiotic course for secondary bacterial component.'
            WHEN a.patient_id = v_patient10_id THEN 'Paroxysmal atrial fibrillation - rate controlled. Osteoporosis - on bisphosphonate. Hypothyroidism - TSH pending.'
            ELSE 'Assessment documented based on examination findings.'
        END,
        CASE
            WHEN a.patient_id = v_patient1_id THEN 'Continue Lisinopril 10mg daily. Continue Metformin 500mg BID. Order HbA1c and lipid panel. Follow up in 4 weeks.'
            WHEN a.patient_id = v_patient2_id THEN 'Continue current maintenance inhaler. Keep rescue inhaler available. Review asthma action plan. Follow up in 3 months.'
            WHEN a.patient_id = v_patient3_id THEN 'No medications needed. Continue healthy lifestyle. Return for next annual checkup or as needed.'
            WHEN a.patient_id = v_patient4_id THEN 'Continue current medications. Physical therapy referral for knee OA. INR check next week. Follow up in 2 weeks.'
            WHEN a.patient_id = v_patient5_id THEN 'Continue acupuncture sessions weekly. Consider adding topical NSAID. Physical therapy for core strengthening. Follow up in 2 weeks.'
            WHEN a.patient_id = v_patient6_id THEN 'Continue Escitalopram 10mg daily. Continue cognitive behavioral therapy. Sleep hygiene counseling provided. Follow up in 4 weeks.'
            WHEN a.patient_id = v_patient7_id THEN 'Continue Donepezil 5mg at bedtime. Caregiver education provided. Safety assessment at home recommended. Follow up in 3 months.'
            WHEN a.patient_id = v_patient8_id THEN 'Routine preventive care: mammogram ordered, immunizations current. Follow up annually or as needed.'
            WHEN a.patient_id = v_patient9_id THEN 'Symptomatic treatment: rest, fluids, OTC analgesics. Return if symptoms worsen or new symptoms develop.'
            WHEN a.patient_id = v_patient10_id THEN 'Continue Apixaban, Alendronate, Levothyroxine. Order TSH and vitamin D levels. DEXA scan in 6 months. Follow up in 8 weeks.'
            ELSE 'Treatment plan documented. Follow up as scheduled.'
        END,
        a.reason,
        'SIGNED',
        a.checked_out_at + INTERVAL '5 minutes',
        v_doctor_id,
        encode(digest(a.id::text || a.scheduled_start::text, 'sha256'), 'hex'),
        v_doctor_id,
        a.scheduled_start - INTERVAL '1 day'
    FROM appointments a
    WHERE a.status = 'COMPLETED'
    AND a.provider_id = v_doctor_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted visits for completed appointments';

    -- ============================================
    -- 6. VISIT DIAGNOSES - ICD-10 codes for visits
    -- ============================================

    -- Primary diagnoses
    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id,
        CASE
            WHEN v.patient_id = v_patient1_id THEN 'I10'
            WHEN v.patient_id = v_patient2_id THEN 'J45.20'
            WHEN v.patient_id = v_patient3_id THEN 'Z00.00'
            WHEN v.patient_id = v_patient4_id THEN 'M15.0'
            WHEN v.patient_id = v_patient5_id THEN 'M54.5'
            WHEN v.patient_id = v_patient6_id THEN 'F41.1'
            WHEN v.patient_id = v_patient7_id THEN 'G30.0'
            WHEN v.patient_id = v_patient8_id THEN 'Z00.00'
            WHEN v.patient_id = v_patient9_id THEN 'J06.9'
            WHEN v.patient_id = v_patient10_id THEN 'I48.0'
            ELSE 'Z00.00'
        END,
        CASE
            WHEN v.patient_id = v_patient1_id THEN 'Essential (primary) hypertension'
            WHEN v.patient_id = v_patient2_id THEN 'Mild intermittent asthma, uncomplicated'
            WHEN v.patient_id = v_patient3_id THEN 'Encounter for general adult medical examination without abnormal findings'
            WHEN v.patient_id = v_patient4_id THEN 'Primary generalized (osteo)arthritis'
            WHEN v.patient_id = v_patient5_id THEN 'Low back pain, unspecified'
            WHEN v.patient_id = v_patient6_id THEN 'Generalized anxiety disorder'
            WHEN v.patient_id = v_patient7_id THEN 'Alzheimer disease with early onset'
            WHEN v.patient_id = v_patient8_id THEN 'Encounter for general adult medical examination without abnormal findings'
            WHEN v.patient_id = v_patient9_id THEN 'Acute upper respiratory infection, unspecified'
            WHEN v.patient_id = v_patient10_id THEN 'Paroxysmal atrial fibrillation'
            ELSE 'Encounter for general adult medical examination without abnormal findings'
        END,
        true, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.provider_id = v_doctor_id
    ON CONFLICT DO NOTHING;

    -- Secondary diagnoses for patients with multiple conditions
    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'E11.9', 'Type 2 diabetes mellitus without complications',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient1_id
    ON CONFLICT DO NOTHING;

    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'J44.9', 'Chronic obstructive pulmonary disease, unspecified',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient4_id
    ON CONFLICT DO NOTHING;

    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'I48.91', 'Unspecified atrial fibrillation',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient4_id
    ON CONFLICT DO NOTHING;

    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'G43.909', 'Migraine, unspecified, not intractable, without status migrainosus',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient5_id
    ON CONFLICT DO NOTHING;

    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'I10', 'Essential (primary) hypertension',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient7_id
    ON CONFLICT DO NOTHING;

    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'M81.0', 'Age-related osteoporosis without current pathological fracture',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient10_id
    ON CONFLICT DO NOTHING;

    INSERT INTO visit_diagnoses (visit_id, visit_date, patient_id, icd10_code, icd10_description,
                                  is_primary, diagnosis_type, is_active, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, 'E03.9', 'Hypothyroidism, unspecified',
           false, 'CONFIRMED', true, v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient10_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted visit diagnoses';

    -- ============================================
    -- 7. PRESCRIPTIONS
    -- ============================================

    -- Active prescriptions for chronic conditions
    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Lisinopril', 'Lisinopril', '10mg', 'Tablet', 'Oral',
           'Once daily in the morning', '90 days', 90, 3,
           'Take with or without food. Monitor blood pressure regularly. Report any persistent cough.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient1_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Metformin ER', 'Metformin Extended-Release', '500mg', 'Tablet', 'Oral',
           'Twice daily with meals', '90 days', 180, 3,
           'Take with food to reduce stomach upset. Monitor blood glucose. Report any unusual symptoms.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient1_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Ventolin HFA', 'Albuterol Sulfate', '90mcg/actuation', 'Inhaler', 'Inhalation',
           'As needed for shortness of breath', 'Ongoing', 1, 5,
           'Shake well before use. 1-2 puffs every 4-6 hours as needed. Rinse mouth after use.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient2_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Warfarin', 'Warfarin Sodium', '5mg', 'Tablet', 'Oral',
           'Once daily', '30 days', 30, 0,
           'Take at the same time each day. Regular INR monitoring required. Avoid vitamin K rich foods.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient4_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Voltaren Gel', 'Diclofenac Sodium Topical Gel', '1%', 'Gel', 'Topical',
           'Apply to affected area three times daily', '30 days', 1, 2,
           'Apply thin layer and rub in gently. Wash hands after application. Avoid eyes and mucous membranes.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient5_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Lexapro', 'Escitalopram Oxalate', '10mg', 'Tablet', 'Oral',
           'Once daily', '90 days', 90, 3,
           'Take at the same time each day. Do not stop suddenly. Report any mood changes.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient6_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Aricept', 'Donepezil Hydrochloride', '5mg', 'Tablet', 'Oral',
           'Once daily at bedtime', '90 days', 90, 3,
           'Take at bedtime to reduce nausea. Caregiver should supervise medication administration.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient7_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Eliquis', 'Apixaban', '5mg', 'Tablet', 'Oral',
           'Twice daily', '90 days', 180, 3,
           'Take at the same times each day. Do not miss doses. Report any unusual bleeding.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient10_id LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO prescriptions (visit_id, visit_date, patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, created_by, created_at)
    SELECT v.id, v.visit_date, v.patient_id, v_doctor_id,
           'Fosamax', 'Alendronate Sodium', '70mg', 'Tablet', 'Oral',
           'Once weekly', '52 weeks', 4, 3,
           'Take first thing in morning with full glass of water. Remain upright for 30 minutes. Do not eat for 30 minutes.',
           v.visit_date, 'ACTIVE', v_doctor_id, v.created_at
    FROM visits v WHERE v.patient_id = v_patient10_id LIMIT 1
    ON CONFLICT DO NOTHING;

    -- Completed prescriptions (historical)
    INSERT INTO prescriptions (patient_id, provider_id, medication_name, generic_name,
                               dosage, form, route, frequency, duration, quantity, refills, instructions,
                               prescribed_date, status, refills_remaining, created_by, created_at)
    VALUES
        (v_patient9_id, v_doctor_id, 'Amoxicillin', 'Amoxicillin', '500mg', 'Capsule', 'Oral',
         'Three times daily', '10 days', 30, 0, 'Complete entire course. Take with or without food.',
         '2025-10-16', 'COMPLETED', 0, v_doctor_id, '2025-10-16 16:00:00+02'),
        (v_patient3_id, v_doctor_id, 'Ibuprofen', 'Ibuprofen', '400mg', 'Tablet', 'Oral',
         'Every 6 hours as needed', '7 days', 28, 0, 'Take with food. Do not exceed 1600mg per day.',
         '2025-11-18', 'COMPLETED', 0, v_doctor_id, '2025-11-18 11:00:00+01')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted prescriptions';

    -- ============================================
    -- 8. VISIT TEMPLATES
    -- ============================================

    INSERT INTO visit_templates (template_name, description, subjective, objective, assessment, plan,
                                  is_active, created_by, created_at)
    VALUES
        ('Annual Wellness Visit', 'Template for comprehensive annual checkup',
         'Patient presents for annual wellness examination. No new complaints.',
         'Complete physical examination performed. Vital signs recorded.',
         'Health maintenance. Preventive care discussed.',
         'Continue current medications. Schedule routine screenings. Follow up in 1 year.',
         true, v_doctor_id, NOW() - INTERVAL '6 months'),
        ('Hypertension Follow-up', 'Template for blood pressure management visits',
         'Patient presents for blood pressure follow-up. Reports [compliance/symptoms].',
         'BP measured. Heart and lung examination performed.',
         'Essential hypertension - [controlled/uncontrolled].',
         'Continue/adjust antihypertensive therapy. Lifestyle modifications discussed. Follow up in [X] weeks.',
         true, v_doctor_id, NOW() - INTERVAL '6 months'),
        ('Diabetes Management', 'Template for diabetes follow-up visits',
         'Patient presents for diabetes management. Reports blood glucose levels have been [status].',
         'Weight recorded. Foot examination performed. Review of home glucose log.',
         'Type 2 diabetes mellitus - [control status]. HbA1c: [value].',
         'Continue/adjust diabetic medications. Diet and exercise counseling. Order labs. Follow up in [X] weeks.',
         true, v_doctor_id, NOW() - INTERVAL '6 months'),
        ('Acupuncture Session', 'Template for acupuncture treatment visits',
         'Patient presents for acupuncture treatment. Current pain level: [X/10]. Location: [area].',
         'Acupuncture points selected based on diagnosis. [X] needles placed. Treatment duration: [X] minutes.',
         'Chronic pain management with acupuncture therapy.',
         'Continue weekly/bi-weekly sessions. Home care instructions provided. Next session scheduled.',
         true, v_doctor_id, NOW() - INTERVAL '6 months')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted visit templates';

    -- ============================================
    -- 9. PRESCRIPTION TEMPLATES
    -- ============================================

    INSERT INTO prescription_templates (template_name, description, medications, is_active, created_by, created_at)
    VALUES
        ('Hypertension Standard', 'First-line treatment for essential hypertension',
         '[{"medication_name": "Lisinopril", "generic_name": "Lisinopril", "dosage": "10mg", "form": "Tablet", "route": "Oral", "frequency": "Once daily", "duration": "90 days", "quantity": 90, "refills": 3, "instructions": "Take in the morning with or without food"}]',
         true, v_doctor_id, NOW() - INTERVAL '6 months'),
        ('Type 2 Diabetes Initial', 'First-line treatment for new type 2 diabetes diagnosis',
         '[{"medication_name": "Metformin", "generic_name": "Metformin HCl", "dosage": "500mg", "form": "Tablet", "route": "Oral", "frequency": "Twice daily with meals", "duration": "90 days", "quantity": 180, "refills": 3, "instructions": "Take with meals to reduce GI upset"}]',
         true, v_doctor_id, NOW() - INTERVAL '6 months'),
        ('Anxiety Management', 'SSRI therapy for generalized anxiety disorder',
         '[{"medication_name": "Escitalopram", "generic_name": "Escitalopram Oxalate", "dosage": "10mg", "form": "Tablet", "route": "Oral", "frequency": "Once daily", "duration": "90 days", "quantity": 90, "refills": 3, "instructions": "Take at the same time each day. Do not stop abruptly"}]',
         true, v_doctor_id, NOW() - INTERVAL '6 months'),
        ('Pain Management NSAIDs', 'Topical and oral NSAIDs for chronic pain',
         '[{"medication_name": "Diclofenac Gel", "generic_name": "Diclofenac Sodium", "dosage": "1%", "form": "Gel", "route": "Topical", "frequency": "Apply 3 times daily", "duration": "30 days", "quantity": 1, "refills": 2, "instructions": "Apply to affected area. Wash hands after application"}, {"medication_name": "Naproxen", "generic_name": "Naproxen Sodium", "dosage": "500mg", "form": "Tablet", "route": "Oral", "frequency": "Twice daily as needed", "duration": "30 days", "quantity": 60, "refills": 1, "instructions": "Take with food. Max 1000mg/day"}]',
         true, v_doctor_id, NOW() - INTERVAL '6 months')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted prescription templates';

    -- ============================================
    -- 10. DOCUMENT TEMPLATES (ensure they exist)
    -- ============================================

    -- Get template IDs for later use
    SELECT id INTO v_template_med_cert_it FROM document_templates WHERE template_key = 'medical_certificate_it' LIMIT 1;
    SELECT id INTO v_template_referral_it FROM document_templates WHERE template_key = 'referral_letter_it' LIMIT 1;
    SELECT id INTO v_template_lab_request FROM document_templates WHERE template_key = 'lab_request_it' LIMIT 1;
    SELECT id INTO v_template_visit_summary FROM document_templates WHERE template_key = 'visit_summary_it' LIMIT 1;
    SELECT id INTO v_template_prescription FROM document_templates WHERE template_key = 'prescription_it' LIMIT 1;

    -- ============================================
    -- 11. GENERATED DOCUMENTS
    -- ============================================

    IF v_template_med_cert_it IS NOT NULL THEN
        INSERT INTO generated_documents (template_id, patient_id, visit_id, visit_date, provider_id,
                                          document_type, document_title, document_filename, file_path,
                                          file_size_bytes, template_version, status, is_signed,
                                          signed_at, signed_by, created_by, created_at)
        SELECT
            v_template_med_cert_it, v.patient_id, v.id, v.visit_date, v_doctor_id,
            'MEDICAL_CERTIFICATE',
            'Certificato Medico - ' || p.first_name || ' ' || p.last_name || ' - ' || to_char(v.visit_date, 'DD/MM/YYYY'),
            'med_cert_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            '/uploads/documents/med_cert_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            (50000 + random() * 100000)::bigint, 1, 'GENERATED', true,
            v.signed_at, v_doctor_id, v_doctor_id, v.created_at + INTERVAL '1 hour'
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.patient_id IN (v_patient1_id, v_patient3_id, v_patient8_id)
        AND v.status = 'SIGNED'
        LIMIT 3
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_template_referral_it IS NOT NULL THEN
        INSERT INTO generated_documents (template_id, patient_id, visit_id, visit_date, provider_id,
                                          document_type, document_title, document_filename, file_path,
                                          file_size_bytes, template_version, status, is_signed,
                                          signed_at, signed_by, delivered_to, delivered_at, created_by, created_at)
        SELECT
            v_template_referral_it, v.patient_id, v.id, v.visit_date, v_doctor_id,
            'REFERRAL_LETTER',
            'Lettera di Riferimento - ' || p.first_name || ' ' || p.last_name,
            'referral_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            '/uploads/documents/referral_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            (40000 + random() * 80000)::bigint, 1, 'DELIVERED', true,
            v.signed_at, v_doctor_id, p.email, v.created_at + INTERVAL '3 hours', v_doctor_id, v.created_at + INTERVAL '2 hours'
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.patient_id IN (v_patient4_id, v_patient7_id, v_patient10_id)
        AND v.status = 'SIGNED'
        LIMIT 3
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_template_lab_request IS NOT NULL THEN
        INSERT INTO generated_documents (template_id, patient_id, visit_id, visit_date, provider_id,
                                          document_type, document_title, document_filename, file_path,
                                          file_size_bytes, template_version, status, created_by, created_at)
        SELECT
            v_template_lab_request, v.patient_id, v.id, v.visit_date, v_doctor_id,
            'LAB_REQUEST',
            'Richiesta Esami - ' || p.first_name || ' ' || p.last_name,
            'lab_req_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            '/uploads/documents/lab_req_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            (30000 + random() * 50000)::bigint, 1, 'GENERATED', v_doctor_id, v.created_at + INTERVAL '30 minutes'
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.patient_id IN (v_patient1_id, v_patient2_id, v_patient4_id, v_patient10_id)
        AND v.status = 'SIGNED'
        LIMIT 4
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_template_visit_summary IS NOT NULL THEN
        INSERT INTO generated_documents (template_id, patient_id, visit_id, visit_date, provider_id,
                                          document_type, document_title, document_filename, file_path,
                                          file_size_bytes, template_version, status, is_signed,
                                          signed_at, signed_by, created_by, created_at)
        SELECT
            v_template_visit_summary, v.patient_id, v.id, v.visit_date, v_doctor_id,
            'VISIT_SUMMARY',
            'Riepilogo Visita - ' || p.first_name || ' ' || p.last_name || ' - ' || to_char(v.visit_date, 'DD/MM/YYYY'),
            'visit_sum_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            '/uploads/documents/visit_sum_' || to_char(v.visit_date, 'YYYYMMDD') || '_' || left(v.id::text, 8) || '.pdf',
            (60000 + random() * 120000)::bigint, 1, 'GENERATED', true,
            v.signed_at, v_doctor_id, v_doctor_id, v.created_at + INTERVAL '45 minutes'
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.status = 'SIGNED'
        LIMIT 10
        ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Inserted generated documents';

    -- ============================================
    -- 12. NOTIFICATION QUEUE (sample notifications)
    -- ============================================

    -- Sent appointment reminders
    INSERT INTO notification_queue (patient_id, appointment_id, notification_type, delivery_method,
                                     recipient_email, recipient_phone, recipient_name,
                                     subject, message_body, scheduled_for, status, sent_at, created_at)
    SELECT
        a.patient_id, a.id, 'APPOINTMENT_REMINDER', 'EMAIL',
        p.email, p.phone_primary, p.first_name || ' ' || p.last_name,
        'Promemoria Appuntamento - DocPat',
        'Gentile ' || p.first_name || ', le ricordiamo il suo appuntamento previsto per ' || to_char(a.scheduled_start, 'DD/MM/YYYY alle HH24:MI') || '. Cordiali saluti, Dr. Marco Rossi',
        a.scheduled_start - INTERVAL '24 hours',
        'SENT',
        a.scheduled_start - INTERVAL '23 hours',
        a.scheduled_start - INTERVAL '48 hours'
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status = 'COMPLETED'
    AND a.scheduled_start < NOW()
    LIMIT 15
    ON CONFLICT DO NOTHING;

    -- Pending appointment reminders for future appointments
    INSERT INTO notification_queue (patient_id, appointment_id, notification_type, delivery_method,
                                     recipient_email, recipient_phone, recipient_name,
                                     subject, message_body, scheduled_for, status, created_at)
    SELECT
        a.patient_id, a.id, 'APPOINTMENT_REMINDER', 'EMAIL',
        p.email, p.phone_primary, p.first_name || ' ' || p.last_name,
        'Promemoria Appuntamento - DocPat',
        'Gentile ' || p.first_name || ', le ricordiamo il suo appuntamento previsto per ' || to_char(a.scheduled_start, 'DD/MM/YYYY alle HH24:MI') || '. Cordiali saluti, Dr. Marco Rossi',
        a.scheduled_start - INTERVAL '24 hours',
        'PENDING',
        NOW()
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status IN ('SCHEDULED', 'CONFIRMED')
    AND a.scheduled_start > NOW()
    LIMIT 5
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted notification queue items';

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Seed data insertion completed successfully!';
    RAISE NOTICE '============================================';

END $$;

COMMIT;

-- ============================================
-- Summary Statistics
-- ============================================
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Patients', COUNT(*) FROM patients
UNION ALL SELECT 'Patient Insurance', COUNT(*) FROM patient_insurance
UNION ALL SELECT 'Appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'Visits', COUNT(*) FROM visits
UNION ALL SELECT 'Visit Diagnoses', COUNT(*) FROM visit_diagnoses
UNION ALL SELECT 'Prescriptions', COUNT(*) FROM prescriptions
UNION ALL SELECT 'Visit Templates', COUNT(*) FROM visit_templates
UNION ALL SELECT 'Prescription Templates', COUNT(*) FROM prescription_templates
UNION ALL SELECT 'Document Templates', COUNT(*) FROM document_templates
UNION ALL SELECT 'Generated Documents', COUNT(*) FROM generated_documents
UNION ALL SELECT 'Notification Queue', COUNT(*) FROM notification_queue
UNION ALL SELECT 'System Settings', COUNT(*) FROM system_settings
ORDER BY table_name;
