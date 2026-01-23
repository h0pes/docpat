# Integration Tests

This directory contains comprehensive integration tests for the DocPat backend medical practice management system.

> **Last Updated**: January 2026
> **Total Tests**: 381 integration tests across 21 test suites
> **Coverage**: ~98% of API endpoints

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Test Coverage Summary](#test-coverage-summary)
- [Test Suites Detail](#test-suites-detail)
- [Coverage Gaps & Priorities](#coverage-gaps--priorities)
- [Test Architecture](#test-architecture)
- [Adding New Tests](#adding-new-tests)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Prerequisites

1. **PostgreSQL 17** must be running
2. **Test database** must be created and accessible:
   - Database: `mpms_test`
   - User: `mpms_user`
   - Password: `dev_password_change_in_production`

### Initial Setup

```bash
# Create test database (from project root)
psql -U postgres -c "CREATE DATABASE mpms_test OWNER mpms_user;"

# Run migrations on test database
export DATABASE_URL="postgresql://mpms_user:dev_password_change_in_production@localhost:5432/mpms_test"
sqlx migrate run
```

---

## Running Tests

### Using the Test Runner Script (Recommended)

```bash
# From backend directory - runs ALL integration tests
./run-integration-tests.sh
```

This script:
- Verifies PostgreSQL is running
- Checks test database accessibility
- Runs tests serially with `--test-threads=1`
- Uses required features: `rbac,report-export,pdf-export`
- Provides colored output with pass/fail summary

### Using Cargo Directly

```bash
# Run a specific test suite
cargo test --test patient_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1

# Run a specific test
cargo test --test auth_integration_tests test_login_success --features "rbac,report-export,pdf-export" -- --test-threads=1

# Run with output visible
cargo test --test visit_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1 --nocapture
```

> **Important**: Always use `--test-threads=1` to prevent database conflicts between parallel tests.

---

## Test Coverage Summary

### By Test Suite (368 Total Tests)

| Test Suite | Tests | Handler | Endpoints | Status |
|------------|-------|---------|-----------|--------|
| `patient_integration_tests` | 31 | Patients | 12 | ✅ Full |
| `user_management_integration_tests` | 25 | Users | 9 | ✅ Full |
| `appointment_integration_tests` | 25 | Appointments | 10 | ✅ Full |
| `holidays_integration_tests` | 23 | Holidays | 8 | ✅ Full |
| `visit_integration_tests` | 22 | Visits | 13 | ✅ Full |
| `notification_integration_tests` | 21 | Notifications | 9 | ✅ Full |
| `prescription_integration_tests` | 20 | Prescriptions | 12 | ✅ Full |
| `report_integration_tests` | 19 | Reports | 7 | ✅ Full |
| `working_hours_integration_tests` | 19 | Working Hours | 10 | ✅ Full |
| `file_upload_integration_tests` | 18 | Files | 11 | ✅ Full |
| `document_integration_tests` | 17 | Documents | 14 | ✅ Full |
| `diagnosis_integration_tests` | 17 | Diagnoses | 5 | ✅ Full |
| `audit_logs_integration_tests` | 16 | Audit Logs | 6 | ✅ Full |
| `drug_interaction_integration_tests` | 16 | Drug Interactions | 5 | ✅ Full |
| `auth_integration_tests` | 17 | Authentication | 5 | ✅ Full **SECURITY** |
| `settings_integration_tests` | 13 | Settings | 7 | ✅ Full |
| `prescription_template_integration_tests` | 12 | Prescription Templates | 5 | ✅ Full |
| `system_health_integration_tests` | 12 | System Health | 4 | ✅ Full |
| `visit_template_integration_tests` | 11 | Visit Templates | 5 | ✅ Full |
| `visit_version_integration_tests` | 10 | Visit Versions | 3 | ✅ Full |
| `mfa_integration_tests` | 17 | MFA | 2 | ✅ Full **IMPROVED** |

### Coverage by HTTP Method

| Method | Estimated Coverage |
|--------|-------------------|
| GET | ~98% |
| POST | ~98% |
| PUT/PATCH | ~98% |
| DELETE | ~95% |

---

## Test Suites Detail

### Authentication (`auth_integration_tests.rs`) - 17 tests

**Login Flow (7 tests)**
- `test_login_success` - Successful login with valid credentials
- `test_login_invalid_password` - Invalid password rejection
- `test_login_user_not_found` - Non-existent user handling
- `test_login_inactive_account` - Inactive account rejection
- `test_account_lockout_after_failed_attempts` - Account lockout after 5 failed attempts
- `test_login_malformed_json` - Malformed JSON request handling
- `test_login_missing_fields` - Missing required fields validation

**MFA Tests (3 tests)**
- `test_login_mfa_enabled_missing_code` - MFA code required when enabled
- `test_login_mfa_enabled_invalid_code` - Invalid MFA code rejection
- `test_login_mfa_enabled_valid_code` - Successful login with valid MFA

**Token & Logout (4 tests)**
- `test_refresh_token_success` - Successful token refresh
- `test_refresh_token_invalid` - Invalid refresh token rejection
- `test_refresh_token_inactive_user` - Inactive user cannot refresh
- `test_logout_success` - Successful logout

**Token Security (3 tests) NEW**
- `test_expired_access_token_rejected` - Expired token returns 401
- `test_expired_token_cannot_perform_operations` - Expired token cannot create resources
- `test_tampered_token_rejected` - Modified token payload rejected

### Patient Management (`patient_integration_tests.rs`) - 31 tests

**CRUD Operations**
- Create, read, update, delete patients
- List with pagination and filtering
- Search by name, fiscal code, phone

**RBAC & Security**
- Doctor vs Admin permissions
- Unauthenticated access rejection
- Row-level security enforcement

**Validation**
- Fiscal code validation
- Required field validation
- Duplicate prevention

### Appointments (`appointment_integration_tests.rs`) - 25 tests

**Scheduling**
- Create, reschedule, cancel appointments
- Status workflow (scheduled → confirmed → completed)
- Conflict detection

**Calendar**
- Day/week/month views
- Availability checking
- Working hours integration

### Visits (`visit_integration_tests.rs`) - 22 tests

**Clinical Workflow**
- Create visit from appointment
- Add clinical data (vital signs, notes)
- Sign and lock visits

**Versioning**
- Version history tracking
- Audit trail

### Prescriptions (`prescription_integration_tests.rs`) - 20 tests

**CRUD Operations**
- Create prescription with/without visit
- Custom medication support
- Medication search

**Status Workflow**
- Hold/Resume/Complete/Cancel/Discontinue
- Status transition validation

**RBAC**
- Doctor create/update permissions
- Admin-only delete

### Diagnoses (`diagnosis_integration_tests.rs`) - 17 tests

**CRUD Operations**
- Create diagnosis linked to visit
- ICD-10 code search and validation
- Multiple diagnoses per visit

**Diagnosis Types**
- PROVISIONAL, CONFIRMED, DIFFERENTIAL, RULE_OUT
- Primary diagnosis designation

**Patient History**
- Active vs resolved diagnoses
- Diagnosis resolution workflow

### Drug Interactions (`drug_interaction_integration_tests.rs`) - 16 tests

**Interaction Checking**
- Check interactions between medications
- Patient medication interaction check
- New medication safety check

**Severity Levels**
- HIGH, MODERATE, LOW risk detection
- Clinical recommendations

### Documents (`document_integration_tests.rs`) - 17 tests

**Generation**
- Generate from templates
- PDF export
- Document signing

**Management**
- List, update, delete documents
- Delivery tracking

### Reports (`report_integration_tests.rs`) - 19 tests

**Report Types**
- Patient statistics
- Appointment analytics
- Diagnosis distribution
- Prescription summaries

**Export**
- PDF, Excel, CSV formats
- Date range filtering

### Other Test Suites

- **`user_management_integration_tests.rs`** (25 tests) - User CRUD, role management, password reset
- **`holidays_integration_tests.rs`** (23 tests) - Holiday CRUD, recurring holidays, working hour integration
- **`working_hours_integration_tests.rs`** (19 tests) - Schedule management, exceptions, availability
- **`file_upload_integration_tests.rs`** (18 tests) - File upload, download, virus scanning
- **`audit_logs_integration_tests.rs`** (16 tests) - Audit trail, filtering, export
- **`settings_integration_tests.rs`** (13 tests) - System settings, practice info
- **`system_health_integration_tests.rs`** (12 tests) - Health checks, database status
- **`mfa_integration_tests.rs`** (17 tests) - MFA setup, enrollment, edge cases (**IMPROVED**)

---

## Coverage Gaps & Priorities

### ✅ Completed Integration Tests (January 2026)

| Handler | Tests | Priority | Status |
|---------|-------|----------|--------|
| **Notifications** | 21 | ~~🔴 HIGH~~ | ✅ **DONE** |
| **Prescription Templates** | 12 | ~~🟡 MEDIUM~~ | ✅ **DONE** |
| **Visit Templates** | 11 | ~~🟡 MEDIUM~~ | ✅ **DONE** |
| **Visit Versions** | 10 | ~~🟢 LOW~~ | ✅ **DONE** |

### Remaining Gaps

All major handlers now have comprehensive integration test coverage. ✅

### Priority Plan

#### ✅ Phase 1 - Critical - COMPLETED
- [x] Create `notification_integration_tests.rs` (21 tests)
  - [x] Test email notification creation
  - [x] Test notification status updates
  - [x] Test delivery retry mechanism
  - [x] Test patient notification preferences
  - [x] Test appointment reminder workflow
  - [x] Test RBAC permissions
  - [x] Test admin-only test email endpoint

#### ✅ Phase 2 - Important - COMPLETED
- [x] Create `prescription_template_integration_tests.rs` (12 tests)
  - [x] CRUD operations
  - [x] Multiple medications support
  - [x] Doctor ownership permissions
  - [x] Admin delete capability

- [x] Create `visit_template_integration_tests.rs` (11 tests)
  - [x] CRUD operations
  - [x] SOAP note templates
  - [x] Doctor ownership permissions
  - [x] Admin delete capability

#### ✅ Phase 3 - Nice to Have - COMPLETED
- [x] Create `visit_version_integration_tests.rs` (10 tests)
  - [x] List versions for new visit and after updates
  - [x] Get specific version and non-existent version (404)
  - [x] Restore to previous version
  - [x] Cannot restore locked visit
  - [x] RBAC: unauthenticated/admin access

#### ✅ Phase 4 - MFA Edge Cases - COMPLETED
- [x] Expand MFA test coverage (10 new edge case tests)
  - [x] Non-existent user handling (setup/enroll returns 404)
  - [x] Inactive user handling (setup/enroll returns 403)
  - [x] Invalid secret format (returns 400 Bad Request)
  - [x] Wrong length MFA codes (too short/too long)
  - [x] Invalid backup code (correct format, wrong value)
  - [x] Unique secret generation verification
  - [x] Empty backup codes array handling

#### Phase 5 - Future Improvements (Backlog)
- [ ] Add more negative test cases across all suites

### Test Quality Improvements

- [ ] Add property-based testing for complex validations
- [ ] Add performance benchmarks for critical endpoints
- [ ] Improve test isolation (per-test database schemas)
- [ ] Add chaos testing for resilience

---

## Test Architecture

### Directory Structure

```
tests/
├── README.md                                  # This file
├── test_utils/
│   └── mod.rs                                 # Shared test utilities
├── auth_integration_tests.rs                  # Authentication (17 tests) SECURITY
├── user_management_integration_tests.rs       # User management (25 tests)
├── mfa_integration_tests.rs                   # MFA (17 tests) IMPROVED
├── patient_integration_tests.rs               # Patients (31 tests)
├── appointment_integration_tests.rs           # Appointments (25 tests)
├── visit_integration_tests.rs                 # Visits (22 tests)
├── notification_integration_tests.rs          # Notifications (21 tests)
├── prescription_integration_tests.rs          # Prescriptions (20 tests)
├── prescription_template_integration_tests.rs # Prescription Templates (12 tests)
├── visit_template_integration_tests.rs        # Visit Templates (11 tests)
├── visit_version_integration_tests.rs         # Visit Versions (10 tests) NEW
├── diagnosis_integration_tests.rs             # Diagnoses (17 tests)
├── drug_interaction_integration_tests.rs      # Drug interactions (16 tests)
├── document_integration_tests.rs              # Documents (17 tests)
├── report_integration_tests.rs                # Reports (19 tests)
├── file_upload_integration_tests.rs           # File uploads (18 tests)
├── settings_integration_tests.rs              # Settings (13 tests)
├── holidays_integration_tests.rs              # Holidays (23 tests)
├── working_hours_integration_tests.rs         # Working hours (19 tests)
├── audit_logs_integration_tests.rs            # Audit logs (16 tests)
└── system_health_integration_tests.rs         # Health checks (12 tests)
```

### Test Utilities (`test_utils/mod.rs`)

| Component | Purpose |
|-----------|---------|
| `TestApp` | Creates test application instance with all routes |
| `TestUser` | Helper for creating test users (active, inactive, MFA) |
| `setup_test_db()` | Initializes database connection with RLS context |
| `teardown_test_db()` | Cleans up test data using TRUNCATE CASCADE |
| `create_test_patient()` | Creates patient for testing |
| `create_test_visit()` | Creates visit linked to patient and appointment |

### Key Patterns

**RLS Context Setup**
```rust
// Set Row-Level Security context for each request
sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
    .bind(user_id.to_string())
    .execute(&pool)
    .await?;
```

**Date Constraints**
```rust
// Database constraints require dates <= CURRENT_DATE
let today = Utc::now().format("%Y-%m-%d").to_string();
```

**Test Isolation**
```rust
async fn teardown_test_db(pool: &PgPool) {
    sqlx::query("TRUNCATE TABLE users, patients, appointments, visits CASCADE")
        .execute(pool)
        .await
        .expect("Failed to cleanup test data");
}
```

---

## Adding New Tests

### Template

```rust
use axum::{body::Body, http::{Request, StatusCode}};
use tower::ServiceExt;
use serde_json::json;

mod test_utils;
use test_utils::{setup_test_db, teardown_test_db, TestApp, TestUser};

#[tokio::test]
async fn test_feature_scenario() {
    // Setup
    let (app, pool) = TestApp::new().await;
    let test_user = TestUser::create_active_doctor(&pool).await;
    let token = test_user.get_auth_token(&app).await;

    // Execute
    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/resource")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::from(json!({
            "field": "value"
        }).to_string()))
        .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();

    // Assert
    assert_eq!(response.status(), StatusCode::CREATED);

    // Cleanup
    teardown_test_db(&pool).await;
}
```

### Naming Convention

```
test_<action>_<resource>_<scenario>

Examples:
- test_create_patient_success
- test_create_patient_duplicate_fiscal_code_fails
- test_delete_patient_as_doctor_forbidden
- test_get_patient_unauthenticated_fails
```

### Checklist for New Tests

- [ ] Use `TestApp::new()` for application instance
- [ ] Use `TestUser` helpers for authentication
- [ ] Always call `teardown_test_db(&pool)` at end
- [ ] Test both success and failure scenarios
- [ ] Test RBAC (DOCTOR vs ADMIN permissions)
- [ ] Test unauthenticated access
- [ ] Respect database constraints (dates, foreign keys)
- [ ] Add test to appropriate test file or create new suite

---

## Debugging & Troubleshooting

### View Test Output

```bash
cargo test --test auth_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1 --nocapture
```

### Run with Backtrace

```bash
RUST_BACKTRACE=1 cargo test --test patient_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1
```

### Check Test Database

```bash
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "duplicate key" error | Leftover test data | Run `./run-integration-tests.sh` or manually truncate tables |
| "connection refused" | PostgreSQL not running | `sudo systemctl start postgresql` |
| "database does not exist" | Test DB not created | Create with `psql -U postgres -c "CREATE DATABASE mpms_test OWNER mpms_user;"` |
| Tests fail together but pass individually | Parallel execution | Always use `--test-threads=1` |
| 403 Forbidden | Missing RBAC permission | Check `casbin/policy.csv` for resource permissions |
| 500 Internal Error | Check server logs | Run with `--nocapture` and check database constraints |
| Constraint violation | Date in future or invalid FK | Use `Utc::now()` for dates, ensure referenced records exist |

### Manual Database Cleanup

```bash
PGPASSWORD='dev_password_change_in_production' psql -U mpms_user -d mpms_test -c "
TRUNCATE TABLE
    audit_logs, notifications, generated_documents, document_templates,
    prescriptions, visit_diagnoses, visits, appointments,
    patients, users, holidays, working_hours, system_settings
CASCADE;
"
```

---

## Performance

| Metric | Value |
|--------|-------|
| Total tests | 381 |
| Execution time | ~35-45 seconds |
| Tests per second | ~10-12 |
| Database operations | ~2800+ per full run |

> Tests run serially for reliability. Each test includes database setup, execution, and cleanup.

---

## Related Documentation

- **[TESTING.md](../TESTING.md)** - Overall testing strategy (unit + integration)
- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines
- **[db.md](../db.md)** - Database schema documentation

---

## Changelog

### January 2026 (Latest)
- **Added 10 new MFA edge case tests** completing Phase 4:
  - Non-existent user handling (setup/enroll)
  - Inactive user handling (setup/enroll)
  - Invalid secret format validation
  - Wrong length MFA codes
  - Invalid backup code handling
  - Unique secret generation
  - Empty backup codes array
- Updated MFA tests: 7 → 17
- Updated total to **378 tests across 21 suites**
- **Added 54 new integration tests** completing ALL priorities (P1, P2 & P3):
  - `notification_integration_tests.rs` (21 tests) - Full notification system coverage
  - `prescription_template_integration_tests.rs` (12 tests) - Template CRUD & permissions
  - `visit_template_integration_tests.rs` (11 tests) - SOAP template CRUD & permissions
  - `visit_version_integration_tests.rs` (10 tests) - Version history, restore, RBAC
- Added RBAC permissions for `visit_templates` resource
- Updated `run-integration-tests.sh` to include visit version tests
- Previously at **368 total tests across 21 suites**
- Endpoint coverage improved from ~85% to ~98%

### January 2026 (Earlier)
- Added prescription, diagnosis, drug interaction tests (53 new tests)
- Fixed DiagnosisType serialization bug (RULE_OUT)
- Updated to 314 total tests across 17 suites

### December 2025
- Added notification system handlers
- Added prescription template handlers
- Expanded RBAC coverage

### November 2025
- Initial comprehensive test suite
- 225+ tests across 14 suites
