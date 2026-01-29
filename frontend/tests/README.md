# Frontend E2E Tests

**Testing Framework**: Playwright 1.50.1
**Test Directory**: `frontend/tests/e2e/`

---

## Overview

End-to-end tests verify complete user workflows by automating browser interactions. These tests run against the full application stack (frontend + backend + database).

---

## Test Suites

### Current E2E Tests

| Suite        | File                   | Tests | Description                      |
| ------------ | ---------------------- | ----- | -------------------------------- |
| Patients     | `patients.spec.ts`     | ~30   | Complete patient CRUD workflows  |
| Appointments | `appointments.spec.ts` | ~20   | Appointment scheduling workflows |
| Visits       | `visits.spec.ts`       | ~15   | Clinical visit documentation     |

### Test Coverage by Workflow

#### Patients (`patients.spec.ts`)

- View patients list page
- Display patient cards with information
- Navigate to patient detail
- Show pagination controls
- Create new patient successfully
- Validation errors for required fields
- Duplicate patient warning
- Cancel patient creation
- Edit patient information
- Cancel editing
- Delete patient (admin only)
- Hide delete button for non-admin
- Filter by name search
- Clear search
- Show "No results" message
- Filter by status
- Filter by gender
- Filter by age range
- Clear all filters
- Sort by name
- Sort by date of birth
- Quick actions menu
- Navigate from quick actions
- Change page size
- Navigate pagination

#### Appointments (`appointments.spec.ts`)

- View calendar
- Navigate between views
- Create appointment
- Edit appointment
- Cancel appointment
- Check availability
- View appointment details
- Conflict detection
- Recurring appointments

#### Visits (`visits.spec.ts`)

- Create new visit
- Edit visit notes
- Add vitals
- Add diagnoses
- Sign visit
- Lock visit
- View visit history
- SOAP note templates

---

## Running Tests

### Prerequisites

1. **Backend running**: The backend server must be running
2. **Test database**: Use the test database with seeded data
3. **Test users**: Ensure test users exist (testadmin, testdoctor)

### Commands

```bash
# Run all E2E tests (starts dev server automatically)
npm run test:e2e
# Example
npm run test:e2e -- --project=chromium --workers=1 tests/e2e/admin.spec.ts tests/e2e/profile.spec.ts --reporter=list 2>&1 | head -80
# Run specific test file
npx playwright test patients.spec.ts
npx playwright test tests/e2e/admin.spec.ts --reporter=list 2>&1 | head -100

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run mobile tests only
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"

# Run tests with UI (interactive mode)
npx playwright test --ui

# Run tests in debug mode
npx playwright test --debug

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Generate and view HTML report
npx playwright show-report
```

### Environment Variables

```bash
# CI mode (runs with retries, single worker)
CI=true npm run test:e2e

# Custom base URL
BASE_URL=http://localhost:3000 npm run test:e2e
```

---

## Browser Configuration

### Supported Browsers

| Project       | Browser | Device    |
| ------------- | ------- | --------- |
| chromium      | Chrome  | Desktop   |
| firefox       | Firefox | Desktop   |
| webkit        | Safari  | Desktop   |
| Mobile Chrome | Chrome  | Pixel 5   |
| Mobile Safari | Safari  | iPhone 12 |

### Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

---

## Writing E2E Tests

### Test Structure

```typescript
import { test, expect, Page } from '@playwright/test'

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="username"]', 'testadmin')
  await page.fill('input[name="password"]', 'Test123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/feature')

    // Interact
    await page.click('button')
    await page.fill('input', 'value')

    // Assert
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

### Best Practices

1. **Use stable selectors**

   ```typescript
   // Prefer
   await page.click('button[type="submit"]')
   await page.getByRole('button', { name: 'Submit' })
   await page.getByLabel('Email')

   // Avoid
   await page.click('.btn-primary')
   await page.click('#submit-btn')
   ```

2. **Wait for navigation**

   ```typescript
   await page.click('a[href="/patients"]')
   await page.waitForURL('/patients')
   ```

3. **Wait for elements**

   ```typescript
   await expect(page.locator('text=Loading')).not.toBeVisible()
   await expect(page.locator('text=Data')).toBeVisible()
   ```

4. **Handle dialogs**

   ```typescript
   // Listen for dialog before action that triggers it
   page.on('dialog', (dialog) => dialog.accept())
   await page.click('button:text("Delete")')
   ```

5. **Use test isolation**
   ```typescript
   // Each test should be independent
   test.beforeEach(async ({ page }) => {
     await loginAsAdmin(page)
     // Navigate to starting point
   })
   ```

---

## Test Users

### Admin User

- **Username**: `testadmin`
- **Password**: `Test123!`
- **Role**: ADMIN
- **Permissions**: Full access to all features

### Doctor User

- **Username**: `testdoctor`
- **Password**: `Test123!`
- **Role**: DOCTOR
- **Permissions**: Limited admin features (no delete)

---

## Debugging

### Debug Mode

```bash
# Run single test in debug mode
npx playwright test patients.spec.ts --debug

# Run with headed browser
npx playwright test --headed
```

### Trace Viewer

Traces are automatically captured on test failure. View them:

```bash
npx playwright show-trace trace.zip
```

### Screenshots and Videos

On test failure:

- Screenshots: `test-results/[test-name]/screenshot.png`
- Videos: `test-results/[test-name]/video.webm`

---

## Test Data Management

### Seed Data

E2E tests expect the following seed data:

1. **Users**: testadmin, testdoctor
2. **Patients**: At least 5 test patients
3. **Working Hours**: Default Mon-Fri 9:00-18:00
4. **Holidays**: Italian national holidays

### Database Reset

For CI environments, reset the database before E2E tests:

```bash
# Reset test database (from backend directory)
cd ../backend
sqlx database reset --database-url="postgres://..." -y
sqlx migrate run --database-url="postgres://..."
# Run seed script
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install dependencies
      run: cd frontend && npm ci

    - name: Install Playwright browsers
      run: cd frontend && npx playwright install --with-deps

    - name: Start backend
      run: |
        cd backend
        cargo run --release &
        sleep 10

    - name: Run E2E tests
      run: cd frontend && CI=true npm run test:e2e

    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: frontend/playwright-report/
```

---

## E2E Test Implementation Plan

### Application Coverage Analysis

This section maps all application routes/pages to E2E test coverage.

#### Public Routes (Authentication)

| Route              | Page               | E2E Coverage             |
| ------------------ | ------------------ | ------------------------ |
| `/login`           | LoginPage          | 🔴 Planned: auth.spec.ts |
| `/forgot-password` | ForgotPasswordPage | 🔴 Planned: auth.spec.ts |
| `/reset-password`  | ResetPasswordPage  | 🔴 Planned: auth.spec.ts |

#### Main Section (Clinical Features)

| Route                      | Page                      | E2E Coverage                         |
| -------------------------- | ------------------------- | ------------------------------------ |
| `/dashboard`               | DashboardPage             | ✅ dashboard.spec.ts (14 tests)      |
| `/patients/*`              | Patients CRUD             | ✅ patients.spec.ts (27 tests)       |
| `/patients/:id/visits`     | PatientVisitsPage         | 🟡 Partial: visits.spec.ts           |
| `/appointments/*`          | Appointments CRUD         | ✅ appointments.spec.ts (19 tests)   |
| `/visits/*`                | Visits CRUD               | ✅ visits.spec.ts (19 tests)         |
| `/visits/templates`        | VisitTemplatesPage        | ✅ templates.spec.ts (22 tests)      |
| `/prescriptions/*`         | Prescriptions CRUD        | ✅ prescriptions.spec.ts (24 tests)  |
| `/prescriptions/templates` | PrescriptionTemplatesPage | ✅ templates.spec.ts (22 tests)      |
| `/documents`               | DocumentsPage             | ✅ documents.spec.ts (16 tests)      |
| `/reports`                 | ReportsPage               | ✅ reports.spec.ts (14 tests)        |
| `/notifications`           | NotificationsPage         | ✅ notifications.spec.ts (15 tests)  |

#### Admin Section (ADMIN only)

| Route                 | Page                  | E2E Coverage                    |
| --------------------- | --------------------- | ------------------------------- |
| `/document-templates` | DocumentTemplatesPage | 🔴 Planned: documents.spec.ts   |
| `/users/*`            | Users CRUD            | ✅ admin.spec.ts (28 tests)     |
| `/settings`           | SettingsPage          | ✅ admin.spec.ts (28 tests)     |
| `/audit-logs`         | AuditLogsPage         | ✅ admin.spec.ts (28 tests)     |
| `/system-health`      | SystemHealthPage      | ✅ admin.spec.ts (28 tests)     |

#### Personal Section

| Route      | Page        | E2E Coverage                    |
| ---------- | ----------- | ------------------------------- |
| `/profile` | ProfilePage | ✅ profile.spec.ts (20 tests)   |

**Legend**: ✅ Complete | 🟡 Partial | 🔴 Not Started

---

### Current Status

| Suite                 | File                     | Tests   | Status      |
| --------------------- | ------------------------ | ------- | ----------- |
| Patients              | `patients.spec.ts`       | 27      | ✅ Complete |
| Appointments          | `appointments.spec.ts`   | 19      | ✅ Complete |
| Visits                | `visits.spec.ts`         | 19      | ✅ Complete |
| Auth                  | `auth.spec.ts`           | 22      | ✅ Complete |
| Admin                 | `admin.spec.ts`          | 28      | ✅ Complete |
| Profile               | `profile.spec.ts`        | 20      | ✅ Complete |
| Dashboard             | `dashboard.spec.ts`      | 14      | ✅ Complete |
| Prescriptions         | `prescriptions.spec.ts`  | 24      | ✅ Complete |
| Documents             | `documents.spec.ts`      | 16      | ✅ Complete |
| Notifications         | `notifications.spec.ts`  | 15      | ✅ Complete |
| Reports               | `reports.spec.ts`        | 14      | ✅ Complete |
| Templates             | `templates.spec.ts`      | 22      | ✅ Complete |
| **Total Implemented** | -                        | **240** | ✅          |

---

### Planned E2E Tests

#### P0 - Critical: Authentication (`auth.spec.ts`) - 22 tests ✅ COMPLETE

| Test                                | Description                                    | Status     |
| ----------------------------------- | ---------------------------------------------- | ---------- |
| Display login page elements         | All form elements, buttons, switchers visible  | ✅         |
| Login - valid admin credentials     | Login as admin with correct username/password  | ✅         |
| Login - valid doctor credentials    | Login as doctor with correct username/password | ✅         |
| Login - invalid username            | Show error for non-existent user               | ✅         |
| Login - invalid password            | Stay on login page for wrong password          | ✅         |
| Login - empty username validation   | Show validation error for empty username       | ✅         |
| Login - empty password validation   | Show validation error for empty password       | ✅         |
| Login - toggle password visibility  | Show/hide password with eye icon               | ✅         |
| Login - account lockout             | Lock account after 5 failed attempts           | ⏸️ Skipped |
| Password reset - navigate to forgot | Navigate from login to forgot password         | ✅         |
| Password reset - request link       | Submit email and get response                  | ✅         |
| Password reset - invalid email      | Show validation error for invalid email        | ✅         |
| Password reset - back to login      | Navigate back to login from forgot password    | ✅         |
| Password reset - without token      | Show error for missing token                   | ✅         |
| Password reset - with token         | Display form when token provided               | ✅         |
| Logout - redirect to login          | Clear session and redirect                     | ✅         |
| Logout - protected route access     | Cannot access protected routes after logout    | ✅         |
| Session timeout - warning           | Show warning dialog before timeout             | ⏸️ Skipped |
| Session timeout - extend            | Extend session from warning dialog             | ⏸️ Skipped |
| Session timeout - logout            | Auto-logout when timeout expires               | ⏸️ Skipped |
| MFA - input when enabled            | Show MFA input for MFA-enabled users           | ⏸️ Skipped |
| MFA - invalid code                  | Show error for wrong TOTP code                 | ⏸️ Skipped |
| MFA - backup codes                  | Allow backup code usage                        | ⏸️ Skipped |
| Remember me - checkbox exists       | Verify remember me checkbox is present         | ✅         |
| Remember me - toggle state          | Check and uncheck remember me                  | ✅         |
| Protected routes - redirect         | Redirect to login when unauthenticated         | ✅         |
| Protected routes - preserve dest    | Redirect to original destination after login   | ✅         |
| Language switching                  | Switch language on login page                  | ✅         |
| Theme switching                     | Toggle theme on login page                     | ✅         |

**File**: `tests/e2e/auth.spec.ts`
**Lines**: ~550
**Status**: ✅ 22 passed, 7 skipped (MFA/timeout/lockout require special setup)

---

#### P1 - High: Admin Workflows (`admin.spec.ts`) - 28 tests ✅ COMPLETE

| Test                                             | Description                               | Status |
| ------------------------------------------------ | ----------------------------------------- | ------ |
| **Access Control**                               |                                           |        |
| should allow admin to access users page          | Admin can access /users                   | ✅     |
| should deny doctor access to users page          | Doctor sees access denied on /users       | ✅     |
| should allow admin to access settings page       | Admin can access /settings                | ✅     |
| should deny doctor access to settings page       | Doctor sees access denied on /settings    | ✅     |
| should allow admin to access audit logs page     | Admin can access /audit-logs              | ✅     |
| should allow admin to access system health page  | Admin can access /system-health           | ✅     |
| **User Management**                              |                                           |        |
| should display users list with search/filters    | Display user list with search and filters | ✅     |
| should search users by name                      | Search functionality works                | ✅     |
| should navigate to create user form              | Navigate to /users/new                    | ✅     |
| should show validation errors on empty form      | Form validation works                     | ✅     |
| should create a new user                         | Create new user with role assignment      | ✅     |
| should view user details                         | Navigate to user detail page              | ✅     |
| **Settings Navigation**                          |                                           |        |
| should display all 9 settings tabs               | All settings tabs visible                 | ✅     |
| should switch between settings tabs              | Tab navigation works                      | ✅     |
| should load practice settings by default         | Practice tab active on load               | ✅     |
| **Working Hours Settings**                       |                                           |        |
| should display working hours for all days        | Show weekly schedule                      | ✅     |
| should have toggle switches for each day         | Day enable/disable switches               | ✅     |
| **Holidays Settings**                            |                                           |        |
| should display holidays list                     | Show holidays list with add button        | ✅     |
| should open add holiday dialog                   | Dialog opens on click                     | ✅     |
| **Audit Logs**                                   |                                           |        |
| should display audit logs with filters           | Show logs with date presets               | ✅     |
| should switch between logs and statistics tabs   | Tab switching works                       | ✅     |
| should open export dialog                        | Export dialog opens                       | ✅     |
| should refresh audit logs                        | Refresh button works                      | ✅     |
| **System Health**                                |                                           |        |
| should display system health dashboard           | Show health status badges                 | ✅     |
| should display database status card              | Database status visible                   | ✅     |
| should display storage usage card                | Storage info visible                      | ✅     |
| should have auto-refresh toggle                  | Auto-refresh switch works                 | ✅     |
| should refresh system health data                | Manual refresh works                      | ✅     |

**File**: `tests/e2e/admin.spec.ts`
**Lines**: ~410
**Status**: ✅ 28 passed

---

#### P1 - High: Profile (`profile.spec.ts`) - 20 tests ✅ COMPLETE

| Test                                               | Description                         | Status     |
| -------------------------------------------------- | ----------------------------------- | ---------- |
| **Access**                                         |                                     |            |
| should allow admin to access profile page          | Admin can access /profile           | ✅         |
| should allow doctor to access profile page         | Doctor can access /profile          | ✅         |
| should redirect unauthenticated user to login      | Redirect to login when not authed   | ✅         |
| **Information Display**                            |                                     |            |
| should display user avatar with initials           | Show user initials/username         | ✅         |
| should display user full name                      | Show user's full name               | ✅         |
| should display username                            | Show @username                      | ✅         |
| should display role badge                          | Show Administrator/Doctor badge     | ✅         |
| should display contact information section         | Show email section                  | ✅         |
| should display account information section         | Show account created/last login     | ✅         |
| **Security Settings**                              |                                     |            |
| should display security settings card              | Show Security Settings heading      | ✅         |
| should display MFA status                          | Show Two-Factor Authentication      | ✅         |
| should have MFA enable/disable button              | MFA action button visible           | ✅         |
| should show MFA warning when disabled              | Warning when MFA not enabled        | ✅         |
| **MFA Setup**                                      |                                     |            |
| should open MFA setup dialog when clicking Enable  | Dialog opens on click               | ✅         |
| should complete MFA setup with valid code          | Complete setup with TOTP            | ⏸️ Skipped |
| **MFA Disable**                                    |                                     |            |
| should show disable confirmation dialog            | Confirmation dialog opens           | ✅         |
| should disable MFA when confirmed                  | Disable MFA flow                    | ⏸️ Skipped |
| **Doctor User**                                    |                                     |            |
| should display doctor role badge                   | Show Doctor badge for doctor user   | ✅         |
| should display doctor username                     | Show @testdoctor                    | ✅         |
| should have same security options as admin         | Security options same for doctor    | ✅         |
| **Navigation**                                     |                                     |            |
| should access profile via user menu                | Navigate from header dropdown       | ✅         |
| should preserve profile access across navigation   | Profile still accessible after nav  | ✅         |

**File**: `tests/e2e/profile.spec.ts`
**Lines**: ~300
**Status**: ✅ 20 passed, 2 skipped (MFA TOTP tests require actual codes)

---

#### P2 - Medium: Prescriptions (`prescriptions.spec.ts`) - 24 tests ✅ COMPLETE

| Test                                              | Description                            | Status |
| ------------------------------------------------- | -------------------------------------- | ------ |
| **Access**                                        |                                        |        |
| should allow admin to access prescriptions page   | Admin can access /prescriptions        | ✅     |
| should allow doctor to access prescriptions page  | Doctor can access /prescriptions       | ✅     |
| should redirect unauthenticated user to login     | Redirect to login when not authed      | ✅     |
| **Statistics**                                    |                                        |        |
| should display statistics cards                   | Show total, active, needs refill stats | ✅     |
| should show active prescriptions count            | Active prescriptions visible           | ✅     |
| should show needs refill count                    | Needs refill indicator visible         | ✅     |
| **List**                                          |                                        |        |
| should display prescription list or empty state   | Show list or empty message             | ✅     |
| should have new prescription button               | New Prescription button visible        | ✅     |
| should have manage templates button               | Manage Templates button visible        | ✅     |
| should have custom medication button              | Custom Medication button visible       | ✅     |
| **Filtering**                                     |                                        |        |
| should display filters section                    | Filters heading visible                | ✅     |
| should have patient filter                        | Patient search/combobox visible        | ✅     |
| should have status filter                         | Status filter present                  | ✅     |
| should have expired filter checkbox               | Expired filter toggle present          | ✅     |
| should display status legend                      | Status legend visible                  | ✅     |
| **New Prescription Flow**                         |                                        |        |
| should open patient selector dialog               | Dialog opens on new prescription       | ✅     |
| **Custom Medication**                             |                                        |        |
| should open custom medication dialog              | Dialog opens on custom medication      | ✅     |
| **Templates Navigation**                          |                                        |        |
| should navigate to templates page                 | Navigate to /prescriptions/templates   | ✅     |
| **Actions**                                       |                                        |        |
| should show actions on prescription cards         | Action buttons visible on cards        | ✅     |
| should have discontinue option                    | Discontinue option present             | ✅     |
| should have renew option                          | Renew option present                   | ✅     |
| should have print option                          | Print option present                   | ✅     |
| **Drug Interactions**                             |                                        |        |
| should show interaction warnings                  | Interaction badge/text when present    | ✅     |

**File**: `tests/e2e/prescriptions.spec.ts`
**Lines**: ~350
**Status**: ✅ 24 passed

---

#### P2 - Medium: Documents (`documents.spec.ts`) - 16 tests ✅ COMPLETE

| Test                                              | Description                           | Status |
| ------------------------------------------------- | ------------------------------------- | ------ |
| **Access**                                        |                                       |        |
| should allow admin to access documents page       | Admin can access /documents           | ✅     |
| should allow doctor to access documents page      | Doctor can access /documents          | ✅     |
| should hide manage templates button for doctor    | Manage Templates hidden for doctors   | ✅     |
| should redirect unauthenticated user to login     | Redirect to login when not authed     | ✅     |
| **List**                                          |                                       |        |
| should display document list or empty state       | Show list or empty message            | ✅     |
| should have search functionality                  | Search input visible                  | ✅     |
| should show page description                      | Page description text visible         | ✅     |
| **Filtering**                                     |                                       |        |
| should have document type filter                  | Type combobox/filter visible          | ✅     |
| should have date range filter                     | Date filter present                   | ✅     |
| should filter by patient name search              | Search updates results                | ✅     |
| **Actions**                                       |                                       |        |
| should have download action for documents         | Download button visible when data     | ✅     |
| should have view action for documents             | View button/link present              | ✅     |
| should have email action for documents            | Email button visible when data        | ✅     |
| **Templates Navigation**                          |                                       |        |
| admin should navigate to templates page           | Navigate to /document-templates       | ✅     |
| **Email Dialog**                                  |                                       |        |
| should open email dialog when clicking email      | Dialog opens with email input         | ✅     |
| **Pagination**                                    |                                       |        |
| should have pagination controls if many documents | Pagination present when needed        | ✅     |

**File**: `tests/e2e/documents.spec.ts`
**Lines**: ~270
**Status**: ✅ 16 passed

---

#### P2 - Medium: Dashboard (`dashboard.spec.ts`) - 14 tests ✅ COMPLETE

| Test                                                 | Description                          | Status |
| ---------------------------------------------------- | ------------------------------------ | ------ |
| **Access**                                           |                                      |        |
| should allow admin to access dashboard               | Admin can access /dashboard          | ✅     |
| should allow doctor to access dashboard              | Doctor can access /dashboard         | ✅     |
| should redirect unauthenticated user to login        | Redirect to login when not authed    | ✅     |
| **Statistics Cards**                                 |                                      |        |
| should display statistics grid with 4 cards          | Patients, Appointments, Visits, Rx   | ✅     |
| should navigate to patients page when clicking card  | Click patients card goes to /patients| ✅     |
| should navigate to appointments when clicking card   | Click appointments goes to /appts    | ✅     |
| **Quick Actions**                                    |                                      |        |
| should display quick actions section                 | Quick Actions heading visible        | ✅     |
| should have new appointment quick action button      | New Appointment button works         | ✅     |
| should have new patient quick action button          | New Patient button works             | ✅     |
| should have new visit quick action button            | New Visit button works               | ✅     |
| should have new prescription quick action button     | New Prescription button works        | ✅     |
| **Recent Activity**                                  |                                      |        |
| should display recent activity section               | Recent Activity heading visible      | ✅     |
| should have view all activity button                 | View All button navigates            | ✅     |
| should show empty state when no recent activity      | Empty state or activity visible      | ✅     |

**File**: `tests/e2e/dashboard.spec.ts`
**Lines**: ~220
**Status**: ✅ 14 passed

---

#### P2 - Medium: Notifications (`notifications.spec.ts`) - 15 tests ✅ COMPLETE

| Test                                                 | Description                          | Status |
| ---------------------------------------------------- | ------------------------------------ | ------ |
| **Access**                                           |                                      |        |
| should allow admin to access notifications page      | Admin can access /notifications      | ✅     |
| should allow doctor to access notifications page     | Doctor can access /notifications     | ✅     |
| should redirect unauthenticated user to login        | Redirect to login when not authed    | ✅     |
| **Statistics**                                       |                                      |        |
| should display statistics cards                      | Show pending/total statistics        | ✅     |
| should show sent notifications count                 | Sent count visible                   | ✅     |
| should show failed notifications count               | Failed count visible                 | ✅     |
| **List**                                             |                                      |        |
| should display notification list or empty state      | Show list or empty message           | ✅     |
| should have refresh button                           | Refresh button works                 | ✅     |
| **Filtering**                                        |                                      |        |
| should have status filter options                    | Status combobox/filter visible       | ✅     |
| should have notification type filter                 | Type filter present                  | ✅     |
| should filter by status when clicking pending        | Filter by pending status             | ✅     |
| **Actions**                                          |                                      |        |
| should show retry button for failed notifications    | Retry button visible when failed     | ✅     |
| should show cancel button for pending notifications  | Cancel button visible when pending   | ✅     |
| should show confirmation dialog when cancelling      | Confirmation dialog on cancel        | ✅     |
| **Pagination**                                       |                                      |        |
| should show load more button when there are more     | Load more present when needed        | ✅     |

**File**: `tests/e2e/notifications.spec.ts`
**Lines**: ~240
**Status**: ✅ 15 passed

---

#### P3 - Low: Reports (`reports.spec.ts`) - 14 tests ✅ COMPLETE

| Test                                              | Description                          | Status |
| ------------------------------------------------- | ------------------------------------ | ------ |
| **Access**                                        |                                      |        |
| should allow admin to access reports page         | Admin can access /reports            | ✅     |
| should allow doctor to access reports page        | Doctor can access /reports           | ✅     |
| should redirect unauthenticated user to login     | Redirect to login when not authed    | ✅     |
| **Tabs Navigation**                               |                                      |        |
| should display 4 report tabs                      | All 4 tabs visible                   | ✅     |
| should default to appointments tab                | Appointments tab active on load      | ✅     |
| should switch to patients tab                     | Tab switching works                  | ✅     |
| should switch to diagnoses tab                    | Tab switching works                  | ✅     |
| should switch to productivity tab                 | Tab switching works                  | ✅     |
| **Date Filtering**                                |                                      |        |
| should have date range picker                     | Date range picker visible            | ✅     |
| should have refresh button                        | Refresh button works                 | ✅     |
| **Export**                                        |                                      |        |
| should have export dropdown button                | Export button visible                | ✅     |
| should show export format options when clicking   | JSON, CSV, PDF, Excel options        | ✅     |
| **Content**                                       |                                      |        |
| should display appointments report content        | Content area visible                 | ✅     |
| should display patients report content            | Content updates on tab switch        | ✅     |

**File**: `tests/e2e/reports.spec.ts`
**Lines**: ~220
**Status**: ✅ 14 passed

---

#### P3 - Low: Templates (`templates.spec.ts`) - 22 tests ✅ COMPLETE

| Test                                              | Description                          | Status |
| ------------------------------------------------- | ------------------------------------ | ------ |
| **Visit Templates Access**                        |                                      |        |
| should allow admin to access visit templates      | Admin can access /visits/templates   | ✅     |
| should allow doctor to access visit templates     | Doctor can access /visits/templates  | ✅     |
| should redirect unauthenticated user to login     | Redirect to login when not authed    | ✅     |
| **Visit Templates List**                          |                                      |        |
| should display template list or empty state       | Show list or empty message           | ✅     |
| should have create template button                | Create Template button visible       | ✅     |
| should open create dialog when clicking button    | Dialog opens with form fields        | ✅     |
| **Visit Templates Actions**                       |                                      |        |
| should have preview button on template cards      | Preview button visible when data     | ✅     |
| should have edit button on template cards         | Edit button visible when data        | ✅     |
| should have delete button on template cards       | Delete button visible when data      | ✅     |
| **Prescription Templates Access**                 |                                      |        |
| should allow admin to access prescription templates | Admin can access /prescriptions/templates | ✅ |
| should allow doctor to access prescription templates | Doctor can access templates        | ✅     |
| should redirect unauthenticated user to login     | Redirect to login when not authed    | ✅     |
| **Prescription Templates List**                   |                                      |        |
| should display template list or empty state       | Show list or empty message           | ✅     |
| should have create template button                | Create Template button visible       | ✅     |
| should open create dialog when clicking button    | Dialog opens with medication fields  | ✅     |
| **Prescription Templates Actions**                |                                      |        |
| should have preview button on template cards      | Preview button visible when data     | ✅     |
| should have edit button on template cards         | Edit button visible when data        | ✅     |
| should have delete button on template cards       | Delete button visible when data      | ✅     |
| should show delete confirmation dialog            | Confirmation dialog on delete click  | ✅     |

**File**: `tests/e2e/templates.spec.ts`
**Lines**: ~300
**Status**: ✅ 22 passed

---

### Implementation Summary

| Priority          | Suite         | Tests   | Lines   | Status         |
| ----------------- | ------------- | ------- | ------- | -------------- |
| **Existing**      |               |         |         |                |
| -                 | patients      | 27      | 563     | ✅ Complete    |
| -                 | appointments  | 19      | 613     | ✅ Complete    |
| -                 | visits        | 19      | 698     | ✅ Complete    |
| **P0 - Critical** |               |         |         |                |
| P0                | auth          | 22      | 550     | ✅ Complete    |
| **P1 - High**     |               |         |         |                |
| P1                | admin         | 28      | 410     | ✅ Complete    |
| P1                | profile       | 20      | 300     | ✅ Complete    |
| **P2 - Medium**   |               |         |         |                |
| P2                | prescriptions | 24      | 350     | ✅ Complete    |
| P2                | documents     | 16      | 270     | ✅ Complete    |
| P2                | dashboard     | 14      | 220     | ✅ Complete    |
| P2                | notifications | 15      | 240     | ✅ Complete    |
| **P3 - Low**      |               |         |         |                |
| P3                | reports       | 14      | 220     | ✅ Complete    |
| P3                | templates     | 22      | 300     | ✅ Complete    |
| **Totals**        |               |         |         |                |
| **Grand Total**   | **12 suites** | **240** | **~4,734** | ✅ ALL COMPLETE |

### Test Helper Functions

Common helpers to create in `tests/e2e/helpers.ts`:

```typescript
// Authentication helpers
async function loginAsAdmin(page: Page): Promise<void>
async function loginAsDoctor(page: Page): Promise<void>
async function logout(page: Page): Promise<void>

// Navigation helpers
async function navigateTo(page: Page, path: string): Promise<void>
async function waitForPageLoad(page: Page): Promise<void>

// Form helpers
async function fillForm(page: Page, fields: Record<string, string>): Promise<void>
async function submitForm(page: Page): Promise<void>
async function expectFormError(page: Page, field: string, message: string): Promise<void>

// Dialog helpers
async function confirmDialog(page: Page): Promise<void>
async function cancelDialog(page: Page): Promise<void>
async function expectToastMessage(page: Page, message: string): Promise<void>

// Table helpers
async function searchInTable(page: Page, query: string): Promise<void>
async function sortTableBy(page: Page, column: string): Promise<void>
async function expectRowCount(page: Page, count: number): Promise<void>
```

### Accessibility Testing

Integrate `@axe-core/playwright` for accessibility testing:

```typescript
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/dashboard')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

Add accessibility checks to critical pages:

- [ ] Login page
- [ ] Dashboard
- [ ] Patient list
- [ ] Appointment calendar
- [ ] Visit form

### Responsive Design Testing

Test on configured mobile viewports:

- **Mobile Chrome** (Pixel 5): 393 x 851
- **Mobile Safari** (iPhone 12): 390 x 844

Key responsive tests:

- [ ] Mobile navigation (hamburger menu)
- [ ] Form layouts on mobile
- [ ] Table responsiveness
- [ ] Calendar mobile view
- [ ] Touch interactions

---

## Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Frontend TESTING.md](../TESTING.md)
- [Backend Tests README](../../backend/tests/README.md)
