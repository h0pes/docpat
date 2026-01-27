# Frontend E2E Tests

**Testing Framework**: Playwright 1.50.1
**Test Directory**: `frontend/tests/e2e/`

---

## Overview

End-to-end tests verify complete user workflows by automating browser interactions. These tests run against the full application stack (frontend + backend + database).

---

## Test Suites

### Current E2E Tests

| Suite | File | Tests | Description |
|-------|------|-------|-------------|
| Patients | `patients.spec.ts` | ~30 | Complete patient CRUD workflows |
| Appointments | `appointments.spec.ts` | ~20 | Appointment scheduling workflows |
| Visits | `visits.spec.ts` | ~15 | Clinical visit documentation |

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

# Run specific test file
npx playwright test patients.spec.ts

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

| Project | Browser | Device |
|---------|---------|--------|
| chromium | Chrome | Desktop |
| firefox | Firefox | Desktop |
| webkit | Safari | Desktop |
| Mobile Chrome | Chrome | Pixel 5 |
| Mobile Safari | Safari | iPhone 12 |

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
});
```

---

## Writing E2E Tests

### Test Structure

```typescript
import { test, expect, Page } from '@playwright/test';

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testadmin');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/feature');

    // Interact
    await page.click('button');
    await page.fill('input', 'value');

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use stable selectors**
   ```typescript
   // Prefer
   await page.click('button[type="submit"]');
   await page.getByRole('button', { name: 'Submit' });
   await page.getByLabel('Email');

   // Avoid
   await page.click('.btn-primary');
   await page.click('#submit-btn');
   ```

2. **Wait for navigation**
   ```typescript
   await page.click('a[href="/patients"]');
   await page.waitForURL('/patients');
   ```

3. **Wait for elements**
   ```typescript
   await expect(page.locator('text=Loading')).not.toBeVisible();
   await expect(page.locator('text=Data')).toBeVisible();
   ```

4. **Handle dialogs**
   ```typescript
   // Listen for dialog before action that triggers it
   page.on('dialog', dialog => dialog.accept());
   await page.click('button:text("Delete")');
   ```

5. **Use test isolation**
   ```typescript
   // Each test should be independent
   test.beforeEach(async ({ page }) => {
     await loginAsAdmin(page);
     // Navigate to starting point
   });
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

## Planned E2E Tests

### P0: Authentication Workflows
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Account lockout after failed attempts
- [ ] MFA setup and verification
- [ ] Password reset flow
- [ ] Session timeout warning
- [ ] Logout

### P1: Admin Workflows
- [ ] User management (create, edit, deactivate)
- [ ] Settings modification
- [ ] Working hours configuration
- [ ] Holiday management
- [ ] Audit log viewing and export
- [ ] System health monitoring

### P2: Document Workflows
- [ ] Generate medical certificate
- [ ] Generate referral letter
- [ ] Generate lab request
- [ ] Export document as PDF
- [ ] Email document

### P3: Report Workflows
- [ ] View appointment statistics
- [ ] View patient demographics
- [ ] View diagnosis trends
- [ ] Export reports

---

## Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Frontend TESTING.md](../TESTING.md)
- [Backend Tests README](../../backend/tests/README.md)
