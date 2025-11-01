# Integration Tests

This directory contains comprehensive integration tests for the DocPat backend authentication system.

## Prerequisites

1. **PostgreSQL 17** must be running
2. **Test database** must be created and accessible:
   - Database: `mpms_test`
   - User: `mpms_user`
   - Password: `dev_password_change_in_production`

## Test Setup

The test database should already be configured if you followed the main setup guide. If not:

```bash
# Create test database (from project root)
psql -U postgres -c "CREATE DATABASE mpms_test OWNER mpms_user;"

# Run migrations on test database
export DATABASE_URL="postgresql://mpms_user:dev_password_change_in_production@localhost:5432/mpms_test"
sqlx migrate run
```

## Running Tests

### Using the Test Runner Script (Recommended)

```bash
# From backend directory
./run-integration-tests.sh
```

This script:
- Verifies PostgreSQL is running
- Checks test database accessibility
- Cleans up test data before running
- Runs tests serially to avoid conflicts
- Provides colored output

### Using Cargo Directly

```bash
# Run all authentication integration tests
cargo test --test auth_integration_tests -- --test-threads=1

# Run a specific test
cargo test --test auth_integration_tests test_login_success -- --test-threads=1

# Run with output
cargo test --test auth_integration_tests -- --test-threads=1 --nocapture
```

**Important**: Always use `--test-threads=1` to run tests serially. This prevents database conflicts between parallel tests.

## Test Coverage

### Authentication Tests (auth_integration_tests.rs)

#### Login Flow (7 tests)
- `test_login_success` - Successful login with valid credentials
- `test_login_invalid_password` - Invalid password rejection
- `test_login_user_not_found` - Non-existent user handling
- `test_login_inactive_account` - Inactive account rejection
- `test_account_lockout_after_failed_attempts` - Account lockout after 5 failed attempts
- `test_login_malformed_json` - Malformed JSON request handling
- `test_login_missing_fields` - Missing required fields validation

#### MFA Tests (3 tests)
- `test_login_mfa_enabled_missing_code` - MFA code required when MFA is enabled
- `test_login_mfa_enabled_invalid_code` - Invalid MFA code rejection
- `test_login_mfa_enabled_valid_code` - Successful login with valid MFA code

#### Token Refresh Tests (3 tests)
- `test_refresh_token_success` - Successful token refresh
- `test_refresh_token_invalid` - Invalid refresh token rejection
- `test_refresh_token_inactive_user` - Inactive user cannot refresh tokens

#### Logout Test (1 test)
- `test_logout_success` - Successful logout

**Total: 14 comprehensive integration tests**

## Test Structure

```
tests/
├── README.md                      # This file
├── auth_integration_tests.rs      # Authentication endpoint tests
└── test_utils/
    └── mod.rs                     # Test utilities and helpers
```

### Test Utilities

The `test_utils` module provides:

- **TestApp**: Creates a test application instance with all routes
- **TestUser**: Helper for creating test users (active, inactive, with/without MFA)
- **setup_test_db()**: Initializes database connection and runs migrations
- **teardown_test_db()**: Cleans up test data after each test

## Test Database Management

Each test:
1. Creates a fresh application instance
2. Creates necessary test users
3. Executes the test scenario
4. Cleans up by deleting all test data

### Manual Cleanup

If tests fail and leave data behind:

```bash
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -c "
DELETE FROM users;
DELETE FROM patients;
DELETE FROM appointments;
-- ... other tables as needed
"
```

Or use the test runner script which automatically cleans up before running.

## Debugging Tests

### View Test Output

```bash
cargo test --test auth_integration_tests -- --test-threads=1 --nocapture
```

### Run with Backtrace

```bash
RUST_BACKTRACE=1 cargo test --test auth_integration_tests -- --test-threads=1
```

### Run Specific Test with Details

```bash
cargo test --test auth_integration_tests test_login_success -- --test-threads=1 --nocapture
```

### Check Test Database

```bash
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test
```

## Common Issues

### Tests Fail with "duplicate key" Error

**Cause**: Test database has leftover data from previous failed runs

**Solution**: Run the test script which cleans up automatically, or manually clean:
```bash
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -c "DELETE FROM users;"
```

### Tests Fail with "connection refused"

**Cause**: PostgreSQL is not running

**Solution**:
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Tests Fail with "database does not exist"

**Cause**: Test database not created

**Solution**:
```bash
psql -U postgres -c "CREATE DATABASE mpms_test OWNER mpms_user;"
export DATABASE_URL="postgresql://mpms_user:dev_password_change_in_production@localhost:5432/mpms_test"
sqlx migrate run
```

### Tests Pass Individually but Fail When Run Together

**Cause**: Running tests in parallel causes database conflicts

**Solution**: Always use `--test-threads=1` or the provided test runner script

## Adding New Tests

When adding new integration tests:

1. Follow the existing test structure
2. Use `TestApp::new()` to create the application
3. Use `TestUser` helpers to create test users
4. Always call `teardown_test_db(&pool)` at the end
5. Use descriptive test names following the pattern `test_<feature>_<scenario>`
6. Add comprehensive assertions

Example:

```rust
#[tokio::test]
async fn test_your_new_feature() {
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_user(&pool, "testuser", "password", false).await;

    // Your test code here

    teardown_test_db(&pool).await;
}
```

## CI/CD Integration

For continuous integration pipelines:

```yaml
# Example GitHub Actions step
- name: Run Integration Tests
  env:
    TEST_DATABASE_URL: postgresql://mpms_user:dev_password_change_in_production@localhost:5432/mpms_test
  run: |
    cd backend
    ./run-integration-tests.sh
```

## Performance

Current test suite performance:
- **14 tests** run in approximately **0.7-0.8 seconds**
- Each test includes database setup, execution, and cleanup
- Serial execution ensures reliability over speed

## Future Enhancements

- [ ] Add test coverage reporting
- [ ] Add performance benchmarks
- [ ] Create test fixtures for common scenarios
- [ ] Add property-based testing for edge cases
- [ ] Integration with code coverage tools (tarpaulin)
