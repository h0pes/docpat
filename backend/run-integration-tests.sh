#!/usr/bin/env bash
#
# Integration Test Runner for DocPat Backend
#
# This script runs integration tests with proper database cleanup and serial execution
# to avoid test isolation issues.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== DocPat Backend Integration Tests ===${NC}\n"

# Check if PostgreSQL is running
if ! pg_isready -q -U postgres 2>/dev/null; then
    echo -e "${RED}Error: PostgreSQL is not running${NC}"
    echo "Please start PostgreSQL: sudo systemctl start postgresql"
    exit 1
fi

# Check if test database exists
if ! PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -c '\q' 2>/dev/null; then
    echo -e "${RED}Error: Test database 'mpms_test' not accessible${NC}"
    echo "Please ensure the test database is set up correctly"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL is running"
echo -e "${GREEN}✓${NC} Test database is accessible\n"

# Clean up test database before running tests
# Using TRUNCATE CASCADE to bypass RLS policies and cascade deletions
echo -e "${YELLOW}Cleaning up test database...${NC}"
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -q <<EOF
-- TRUNCATE bypasses RLS policies and is faster than DELETE
-- CASCADE ensures dependent records are also removed
TRUNCATE users, patients, patient_insurance, appointments,
         visits, visit_diagnoses, visit_templates, visit_versions,
         prescriptions, prescription_templates,
         document_templates, generated_documents,
         system_settings, default_working_hours, working_hours_overrides,
         holidays, uploaded_files, audit_logs CASCADE;

-- Re-seed default system settings after TRUNCATE
INSERT INTO system_settings (setting_key, setting_group, setting_name, setting_value, value_type, description, default_value, is_public, is_readonly) VALUES
-- Clinic Settings
('clinic.name', 'clinic', 'Clinic Name', '"Medical Practice"', 'STRING', 'Name of the medical practice', '"Medical Practice"', true, false),
('clinic.address', 'clinic', 'Clinic Address', '"123 Main St, City, State 12345"', 'STRING', 'Physical address of the clinic', '""', true, false),
('clinic.phone', 'clinic', 'Clinic Phone', '"+1-555-0100"', 'STRING', 'Main clinic phone number', '""', true, false),
('clinic.email', 'clinic', 'Clinic Email', '"info@clinic.com"', 'STRING', 'Main clinic email address', '""', true, false),
('clinic.timezone', 'clinic', 'Timezone', '"Europe/Rome"', 'STRING', 'Clinic timezone for appointments', '"Europe/Rome"', false, false),
-- Appointment Settings
('appointment.default_duration', 'appointment', 'Default Appointment Duration (minutes)', '30', 'INTEGER', 'Default duration for appointments in minutes', '30', false, false),
('appointment.booking_advance_days', 'appointment', 'Booking Advance (days)', '90', 'INTEGER', 'How many days in advance patients can book', '90', false, false),
('appointment.cancellation_hours', 'appointment', 'Cancellation Notice (hours)', '24', 'INTEGER', 'Minimum hours notice required for cancellation', '24', false, false),
('appointment.buffer_minutes', 'appointment', 'Buffer Between Appointments (minutes)', '0', 'INTEGER', 'Buffer time between appointments', '0', false, false),
('appointment.allow_double_booking', 'appointment', 'Allow Double Booking', 'false', 'BOOLEAN', 'Whether to allow double-booking appointments', 'false', false, false),
-- Notification Settings
('notification.reminder_hours_before', 'notification', 'Reminder Hours Before', '24', 'INTEGER', 'Hours before appointment to send reminder', '24', false, false),
('notification.email_enabled', 'notification', 'Email Notifications Enabled', 'false', 'BOOLEAN', 'Enable email notifications', 'false', false, false),
('notification.sms_enabled', 'notification', 'SMS Notifications Enabled', 'false', 'BOOLEAN', 'Enable SMS notifications', 'false', false, false),
('notification.whatsapp_enabled', 'notification', 'WhatsApp Notifications Enabled', 'false', 'BOOLEAN', 'Enable WhatsApp notifications', 'false', false, false),
-- Security Settings
('security.session_timeout_minutes', 'security', 'Session Timeout (minutes)', '30', 'INTEGER', 'Session inactivity timeout in minutes', '30', false, false),
('security.mfa_required', 'security', 'MFA Required', 'true', 'BOOLEAN', 'Require multi-factor authentication for all users', 'true', false, false),
('security.password_expiry_days', 'security', 'Password Expiry (days)', '90', 'INTEGER', 'Days until password expires (0 = never)', '90', false, false),
('security.max_login_attempts', 'security', 'Max Login Attempts', '5', 'INTEGER', 'Maximum failed login attempts before lockout', '5', false, false),
('security.lockout_duration_minutes', 'security', 'Lockout Duration (minutes)', '15', 'INTEGER', 'Duration of account lockout after max failed attempts', '15', false, false),
-- Backup Settings
('backup.enabled', 'backup', 'Automated Backups Enabled', 'true', 'BOOLEAN', 'Enable automated database backups', 'true', false, false),
('backup.retention_days', 'backup', 'Backup Retention (days)', '30', 'INTEGER', 'Days to retain backups', '30', false, false),
('backup.schedule', 'backup', 'Backup Schedule (cron)', '"0 2 * * *"', 'STRING', 'Cron expression for backup schedule', '"0 2 * * *"', false, false),
-- Localization Settings
('localization.default_language', 'localization', 'Default Language', '"it"', 'STRING', 'Default system language (it or en)', '"it"', true, false),
('localization.supported_languages', 'localization', 'Supported Languages', '["it", "en"]', 'ARRAY', 'List of supported languages', '["it", "en"]', true, true),
('localization.date_format', 'localization', 'Date Format', '"DD/MM/YYYY"', 'STRING', 'Date display format', '"DD/MM/YYYY"', false, false),
('localization.time_format', 'localization', 'Time Format', '"24h"', 'STRING', 'Time display format (12h or 24h)', '"24h"', false, false),
-- System Settings
('system.maintenance_mode', 'system', 'Maintenance Mode', 'false', 'BOOLEAN', 'Enable maintenance mode (blocks access)', 'false', true, false),
('system.maintenance_message', 'system', 'Maintenance Message', '"System is under maintenance. Please try again later."', 'STRING', 'Message to show during maintenance', '"System is under maintenance."', true, false);

-- Re-seed default working hours (Mon-Fri 9:00-18:00, weekends closed)
INSERT INTO default_working_hours (day_of_week, start_time, end_time, is_working_day) VALUES
    (1, '09:00', '18:00', true),      -- Monday
    (2, '09:00', '18:00', true),      -- Tuesday
    (3, '09:00', '18:00', true),      -- Wednesday
    (4, '09:00', '18:00', true),      -- Thursday
    (5, '09:00', '18:00', true),      -- Friday
    (6, NULL, NULL, false),           -- Saturday
    (7, NULL, NULL, false)            -- Sunday
ON CONFLICT (day_of_week) DO NOTHING;
EOF

echo -e "${GREEN}✓${NC} Test database cleaned and default settings seeded\n"

# Run integration tests
echo -e "${YELLOW}Running integration tests...${NC}\n"

# Run tests with serial execution to avoid conflicts
# --test-threads=1 ensures tests run one at a time for proper database isolation
TEST_RESULT=0

echo -e "${YELLOW}Running authentication tests...${NC}"
cargo test --test auth_integration_tests --features rbac -- --test-threads=1 "$@"
AUTH_RESULT=$?
TEST_RESULT=$((TEST_RESULT + AUTH_RESULT))

echo -e "\n${YELLOW}Running user management tests...${NC}"
cargo test --test user_management_integration_tests --features rbac -- --test-threads=1 "$@"
USER_RESULT=$?
TEST_RESULT=$((TEST_RESULT + USER_RESULT))

echo -e "\n${YELLOW}Running MFA tests...${NC}"
cargo test --test mfa_integration_tests --features rbac -- --test-threads=1 "$@"
MFA_RESULT=$?
TEST_RESULT=$((TEST_RESULT + MFA_RESULT))

echo -e "\n${YELLOW}Running patient management tests...${NC}"
cargo test --test patient_integration_tests --features rbac -- --test-threads=1 "$@"
PATIENT_RESULT=$?
TEST_RESULT=$((TEST_RESULT + PATIENT_RESULT))

echo -e "\n${YELLOW}Running appointment scheduling tests...${NC}"
cargo test --test appointment_integration_tests --features rbac -- --test-threads=1 "$@"
APPOINTMENT_RESULT=$?
TEST_RESULT=$((TEST_RESULT + APPOINTMENT_RESULT))

echo -e "\n${YELLOW}Running visit management tests...${NC}"
cargo test --test visit_integration_tests --features rbac -- --test-threads=1 "$@"
VISIT_RESULT=$?
TEST_RESULT=$((TEST_RESULT + VISIT_RESULT))

echo -e "\n${YELLOW}Running document generation tests...${NC}"
cargo test --test document_integration_tests --features "rbac,pdf-export" -- --test-threads=1 "$@"
DOCUMENT_RESULT=$?
TEST_RESULT=$((TEST_RESULT + DOCUMENT_RESULT))

echo -e "\n${YELLOW}Running reporting & analytics tests...${NC}"
cargo test --test report_integration_tests --features rbac -- --test-threads=1 "$@"
REPORT_RESULT=$?
TEST_RESULT=$((TEST_RESULT + REPORT_RESULT))

echo -e "\n${YELLOW}Running settings management tests...${NC}"
cargo test --test settings_integration_tests --features rbac -- --test-threads=1 "$@"
SETTINGS_RESULT=$?
TEST_RESULT=$((TEST_RESULT + SETTINGS_RESULT))

echo -e "\n${YELLOW}Running working hours tests...${NC}"
cargo test --test working_hours_integration_tests --features rbac -- --test-threads=1 "$@"
WORKING_HOURS_RESULT=$?
TEST_RESULT=$((TEST_RESULT + WORKING_HOURS_RESULT))

echo -e "\n${YELLOW}Running holidays tests...${NC}"
cargo test --test holidays_integration_tests --features rbac -- --test-threads=1 "$@"
HOLIDAYS_RESULT=$?
TEST_RESULT=$((TEST_RESULT + HOLIDAYS_RESULT))

echo -e "\n${YELLOW}Running audit logs tests...${NC}"
cargo test --test audit_logs_integration_tests --features rbac -- --test-threads=1 "$@"
AUDIT_LOGS_RESULT=$?
TEST_RESULT=$((TEST_RESULT + AUDIT_LOGS_RESULT))

echo -e "\n${YELLOW}Running system health tests...${NC}"
cargo test --test system_health_integration_tests --features rbac -- --test-threads=1 "$@"
SYSTEM_HEALTH_RESULT=$?
TEST_RESULT=$((TEST_RESULT + SYSTEM_HEALTH_RESULT))

echo -e "\n${YELLOW}Running file upload tests...${NC}"
cargo test --test file_upload_integration_tests --features rbac -- --test-threads=1 "$@"
FILE_UPLOAD_RESULT=$?
TEST_RESULT=$((TEST_RESULT + FILE_UPLOAD_RESULT))

# Summary
echo -e "\n${YELLOW}=== Test Results Summary ===${NC}"
[ $AUTH_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Authentication tests passed" || echo -e "${RED}✗${NC} Authentication tests failed"
[ $USER_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} User management tests passed" || echo -e "${RED}✗${NC} User management tests failed"
[ $MFA_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} MFA tests passed" || echo -e "${RED}✗${NC} MFA tests failed"
[ $PATIENT_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Patient management tests passed" || echo -e "${RED}✗${NC} Patient management tests failed"
[ $APPOINTMENT_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Appointment scheduling tests passed" || echo -e "${RED}✗${NC} Appointment scheduling tests failed"
[ $VISIT_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Visit management tests passed" || echo -e "${RED}✗${NC} Visit management tests failed"
[ $DOCUMENT_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Document generation tests passed" || echo -e "${RED}✗${NC} Document generation tests failed"
[ $REPORT_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Reporting & analytics tests passed" || echo -e "${RED}✗${NC} Reporting & analytics tests failed"
[ $SETTINGS_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Settings management tests passed" || echo -e "${RED}✗${NC} Settings management tests failed"
[ $WORKING_HOURS_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Working hours tests passed" || echo -e "${RED}✗${NC} Working hours tests failed"
[ $HOLIDAYS_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Holidays tests passed" || echo -e "${RED}✗${NC} Holidays tests failed"
[ $AUDIT_LOGS_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Audit logs tests passed" || echo -e "${RED}✗${NC} Audit logs tests failed"
[ $SYSTEM_HEALTH_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} System health tests passed" || echo -e "${RED}✗${NC} System health tests failed"
[ $FILE_UPLOAD_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} File upload tests passed" || echo -e "${RED}✗${NC} File upload tests failed"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}✓ All integration tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
