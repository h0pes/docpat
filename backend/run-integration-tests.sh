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
echo -e "${YELLOW}Cleaning up test database...${NC}"
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -q <<EOF
DELETE FROM audit_logs;
DELETE FROM generated_documents;
DELETE FROM document_templates;
DELETE FROM prescriptions;
DELETE FROM visit_diagnoses;
DELETE FROM visits;
DELETE FROM appointments;
DELETE FROM patient_insurance;
DELETE FROM patients;
DELETE FROM users;
EOF

echo -e "${GREEN}✓${NC} Test database cleaned\n"

# Run integration tests
echo -e "${YELLOW}Running integration tests...${NC}\n"

# Run tests with serial execution to avoid conflicts
# --test-threads=1 ensures tests run one at a time for proper database isolation
cargo test --test auth_integration_tests -- --test-threads=1 "$@"

TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}✓ All integration tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
