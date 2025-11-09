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
TRUNCATE users, patients, patient_insurance, audit_logs CASCADE;
EOF

echo -e "${GREEN}✓${NC} Test database cleaned\n"

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

# Summary
echo -e "\n${YELLOW}=== Test Results Summary ===${NC}"
[ $AUTH_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Authentication tests passed" || echo -e "${RED}✗${NC} Authentication tests failed"
[ $USER_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} User management tests passed" || echo -e "${RED}✗${NC} User management tests failed"
[ $MFA_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} MFA tests passed" || echo -e "${RED}✗${NC} MFA tests failed"
[ $PATIENT_RESULT -eq 0 ] && echo -e "${GREEN}✓${NC} Patient management tests passed" || echo -e "${RED}✗${NC} Patient management tests failed"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}✓ All integration tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
