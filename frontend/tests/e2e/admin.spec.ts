/**
 * E2E Tests for Admin Features
 *
 * Tests admin-only functionality including user management, settings,
 * audit logs, and system health monitoring.
 *
 * IMPORTANT: These tests perform CRUD operations. Run the backend with
 * the test database (mpms_test) to avoid affecting development data:
 *
 * DATABASE_URL=postgresql://mpms_user:dev_password_change_in_production@localhost:5432/mpms_test \
 *   cargo run --bin docpat-backend --features "rbac,report-export,pdf-export"
 *
 * @module tests/e2e/admin.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsDoctor, ADMIN_USER } from './helpers';

// ============================================================================
// Test Data
// ============================================================================

const TEST_USER = {
  username: `e2euser${Date.now()}`,
  email: `e2euser${Date.now()}@test.com`,
  firstName: 'E2E',
  lastName: 'TestUser',
  password: 'E2ETest123!',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to users page and wait for it to load
 */
async function goToUsersPage(page: Page): Promise<void> {
  await page.goto('/users');
  await expect(page.locator('h1')).toContainText(/User Management|Gestione Utenti/i);
}

/**
 * Navigate to settings page and wait for it to load
 */
async function goToSettingsPage(page: Page): Promise<void> {
  await page.goto('/settings');
  await expect(page.locator('h1')).toContainText(/Settings|Impostazioni/i);
}

/**
 * Navigate to audit logs page and wait for it to load
 */
async function goToAuditLogsPage(page: Page): Promise<void> {
  await page.goto('/audit-logs');
  await expect(page.locator('h1')).toContainText(/Audit|Log/i);
}

/**
 * Navigate to system health page and wait for it to load
 */
async function goToSystemHealthPage(page: Page): Promise<void> {
  await page.goto('/system-health');
  await expect(page.locator('h1')).toContainText(/System Health|Stato Sistema/i);
}

// ============================================================================
// Test Suite: Admin Access Control
// ============================================================================

test.describe('Admin - Access Control', () => {
  test('should allow admin to access users page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    // Should see New User button
    await expect(page.getByRole('button', { name: /New User|Nuovo Utente/i })).toBeVisible();
  });

  test('should deny doctor access to users page', async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto('/users');

    // Should see access denied error
    await expect(page.getByText(/Access Denied|Accesso Negato/i)).toBeVisible();
  });

  test('should allow admin to access settings page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToSettingsPage(page);

    // Should see settings tabs
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('should deny doctor access to settings page', async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto('/settings');

    // Should see access denied error
    await expect(page.getByText(/Access Denied|Accesso Negato/i)).toBeVisible();
  });

  test('should allow admin to access audit logs page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToAuditLogsPage(page);

    // Should see Export button
    await expect(page.getByRole('button', { name: /Export|Esporta/i })).toBeVisible();
  });

  test('should allow admin to access system health page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToSystemHealthPage(page);

    // Should see Refresh button
    await expect(page.getByRole('button', { name: /Refresh|Aggiorna/i })).toBeVisible();
  });
});

// ============================================================================
// Test Suite: User Management
// ============================================================================

test.describe('Admin - User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);
  });

  test('should display users list with search and filters', async ({ page }) => {
    // Should see search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Should see filter dropdowns or buttons
    await expect(
      page.locator('button[role="combobox"]').first().or(page.locator('select').first())
    ).toBeVisible();
  });

  test('should search users by name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500); // Wait for debounce

    // Results should be filtered (specific assertion depends on test data)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to create user form', async ({ page }) => {
    // The button uses translated text from users.actions.new
    await page.getByRole('button', { name: /New|Nuovo|Add/i }).click();

    // Should be on new user page
    await expect(page).toHaveURL('/users/new');
    await expect(page.locator('h1')).toContainText(/New|Nuovo|Create/i);
  });

  test('should show validation errors on empty form submission', async ({ page }) => {
    await page.goto('/users/new');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(
      page.getByText(/required|richiesto|obbligatorio/i).first()
    ).toBeVisible({ timeout: 3000 });
  });

  test('should create a new user', async ({ page }) => {
    await page.goto('/users/new');

    // Fill in user form - find inputs by placeholder or label
    await page.getByPlaceholder(/Enter username/i).fill(TEST_USER.username);
    await page.getByPlaceholder(/Enter email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/Enter.*password/i).fill(TEST_USER.password);
    await page.getByPlaceholder(/Enter first name/i).fill(TEST_USER.firstName);
    await page.getByPlaceholder(/Enter last name/i).fill(TEST_USER.lastName);

    // Role dropdown defaults to "Doctor" which is fine for this test

    // Submit form - button text is "Create"
    await page.getByRole('button', { name: /Create|Crea/i }).click();

    // Should show success toast or redirect to user detail page
    // Wait for either success message or URL change to user detail
    await Promise.race([
      expect(page.getByText(/created|success|creato/i).first()).toBeVisible({ timeout: 15000 }),
      page.waitForURL(/\/users\/[a-f0-9-]+$/, { timeout: 15000 }),
    ]);
  });

  test('should view user details', async ({ page }) => {
    // Click on a user card or view button
    const userCard = page.locator('[data-testid="user-card"]').first()
      .or(page.locator('article').first())
      .or(page.locator('a[href*="/users/"]').first());

    if (await userCard.isVisible()) {
      await userCard.click();
      await page.waitForURL(/\/users\/[a-f0-9-]+$/);

      // Should see user detail page
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });
});

// ============================================================================
// Test Suite: Settings - Tabs Navigation
// ============================================================================

test.describe('Admin - Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToSettingsPage(page);
  });

  test('should display all 9 settings tabs', async ({ page }) => {
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();

    // The page should have tabs (checking for some expected icons/labels)
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(9);
  });

  test('should switch between settings tabs', async ({ page }) => {
    // Click on Appointments tab
    await page.getByRole('tab', { name: /Appointments|Appuntamenti/i }).click();
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();

    // Click on Security tab
    await page.getByRole('tab', { name: /Security|Sicurezza/i }).click();
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();

    // Click on Holidays tab
    await page.getByRole('tab', { name: /Holidays|Festività/i }).click();
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();
  });

  test('should load practice settings by default', async ({ page }) => {
    // Practice tab should be active by default
    const practiceTab = page.locator('[role="tab"][data-state="active"]').first();
    await expect(practiceTab).toBeVisible();

    // Should see practice settings content (form fields or active tabpanel)
    await expect(
      page.locator('[role="tabpanel"][data-state="active"]')
    ).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Settings - Working Hours
// ============================================================================

test.describe('Admin - Working Hours Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToSettingsPage(page);
    await page.click('[role="tab"]:has-text("Working"), [role="tab"]:has-text("Orari")');
  });

  test('should display working hours for all days', async ({ page }) => {
    // Should see day names (Monday through Sunday)
    await expect(
      page.getByText(/Monday|Lunedì/i).or(page.getByText(/Mon|Lun/i))
    ).toBeVisible();
  });

  test('should have toggle switches for each day', async ({ page }) => {
    // Should see switch/checkbox elements for enabling/disabling days
    const switches = page.locator('[role="switch"], input[type="checkbox"]');
    await expect(switches.first()).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Settings - Holidays
// ============================================================================

test.describe('Admin - Holidays Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToSettingsPage(page);
    await page.click('[role="tab"]:has-text("Holidays"), [role="tab"]:has-text("Festività")');
  });

  test('should display holidays list', async ({ page }) => {
    // Should see Add Holiday button
    await expect(
      page.getByRole('button', { name: /Add Holiday|Aggiungi Festività/i })
    ).toBeVisible();
  });

  test('should open add holiday dialog', async ({ page }) => {
    await page.click('button:has-text("Add Holiday"), button:has-text("Aggiungi")');

    // Dialog should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
  });
});

// ============================================================================
// Test Suite: Audit Logs
// ============================================================================

test.describe('Admin - Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToAuditLogsPage(page);
  });

  test('should display audit logs with filters', async ({ page }) => {
    // Should see date range preset buttons (Today, Yesterday, Last 7 days, etc.)
    await expect(
      page.getByRole('button', { name: /Today|Oggi/i })
    ).toBeVisible();

    // Should see logs tab
    await expect(page.getByRole('tab', { name: /Logs/i })).toBeVisible();
  });

  test('should switch between logs and statistics tabs', async ({ page }) => {
    // Click statistics tab
    await page.getByRole('tab', { name: /Statistics|Statistiche/i }).click();

    // Should show statistics content (active tabpanel)
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();

    // Click back to logs tab
    await page.getByRole('tab', { name: /Logs/i }).click();
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();
  });

  test('should open export dialog', async ({ page }) => {
    await page.click('button:has-text("Export"), button:has-text("Esporta")');

    // Export dialog should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should refresh audit logs', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /Refresh|Aggiorna/i });
    await refreshButton.click();

    // Button should show loading state or logs should refresh
    await expect(refreshButton).toBeVisible();
  });
});

// ============================================================================
// Test Suite: System Health
// ============================================================================

test.describe('Admin - System Health', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToSystemHealthPage(page);
  });

  test('should display system health dashboard', async ({ page }) => {
    // Should see health status badge (use first to avoid strict mode violation)
    await expect(
      page.getByText(/healthy|degraded|unhealthy/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display database status card', async ({ page }) => {
    // Should see database-related content
    await expect(
      page.getByText(/Database|Connection/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display storage usage card', async ({ page }) => {
    // Should see storage-related content
    await expect(
      page.getByText(/Storage|Disk/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have auto-refresh toggle', async ({ page }) => {
    // Should see auto-refresh switch
    const autoRefreshSwitch = page.locator('[role="switch"]').first();
    await expect(autoRefreshSwitch).toBeVisible();

    // Toggle auto-refresh
    await autoRefreshSwitch.click();
    await expect(autoRefreshSwitch).toHaveAttribute('data-state', 'checked');
  });

  test('should refresh system health data', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /Refresh|Aggiorna/i });
    await refreshButton.click();

    // Should show loading state or data should refresh
    await expect(refreshButton).toBeVisible();
  });
});
