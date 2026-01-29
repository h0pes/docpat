/**
 * E2E Test Helpers
 *
 * Common helper functions and utilities for Playwright E2E tests.
 * Provides authentication helpers, navigation utilities, form interactions,
 * and assertion helpers used across all test suites.
 */

import { Page, expect } from '@playwright/test';

// ============================================================================
// Test Data
// ============================================================================

/**
 * Test user credentials for admin user
 */
export const ADMIN_USER = {
  username: 'testadmin',
  password: 'Test123!',
  role: 'ADMIN',
};

/**
 * Test user credentials for doctor user
 */
export const DOCTOR_USER = {
  username: 'testdoctor',
  password: 'Test123!',
  role: 'DOCTOR',
};

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Login as admin user
 *
 * @param page - Playwright page object
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="username"]', ADMIN_USER.username);
  await page.fill('input[name="password"]', ADMIN_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

/**
 * Login as doctor user
 *
 * @param page - Playwright page object
 */
export async function loginAsDoctor(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="username"]', DOCTOR_USER.username);
  await page.fill('input[name="password"]', DOCTOR_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

/**
 * Login with custom credentials
 *
 * @param page - Playwright page object
 * @param username - Username to login with
 * @param password - Password to login with
 * @param expectSuccess - Whether login is expected to succeed (default: true)
 */
export async function loginWithCredentials(
  page: Page,
  username: string,
  password: string,
  expectSuccess = true
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  if (expectSuccess) {
    await page.waitForURL('/dashboard');
  }
}

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu button (avatar or profile icon in header)
  const userMenuButton = page.locator('[data-testid="user-menu"]').or(
    page.locator('button:has([data-testid="avatar"])').or(
      page.locator('header button').last()
    )
  );
  await userMenuButton.click();

  // Click logout option
  await page.click('text="Logout"');

  // Wait for redirect to login
  await page.waitForURL('/login');
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to a specific route
 *
 * @param page - Playwright page object
 * @param path - Route path to navigate to
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Wait for page to finish loading
 *
 * @param page - Playwright page object
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate using sidebar link
 *
 * @param page - Playwright page object
 * @param linkText - Text of the sidebar link
 * @param expectedUrl - Expected URL after navigation
 */
export async function navigateViaSidebar(
  page: Page,
  linkText: string,
  expectedUrl: string
): Promise<void> {
  await page.click(`nav a:has-text("${linkText}")`);
  await page.waitForURL(expectedUrl);
}

// ============================================================================
// Form Helpers
// ============================================================================

/**
 * Fill a form with field values
 *
 * @param page - Playwright page object
 * @param fields - Object with field names and values
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    await input.fill(value);
  }
}

/**
 * Submit a form
 *
 * @param page - Playwright page object
 */
export async function submitForm(page: Page): Promise<void> {
  await page.click('button[type="submit"]');
}

/**
 * Expect a form validation error message
 *
 * @param page - Playwright page object
 * @param message - Error message to expect (partial match)
 */
export async function expectFormError(
  page: Page,
  message: string
): Promise<void> {
  await expect(page.locator(`text=${message}`)).toBeVisible();
}

/**
 * Select an option from a select/combobox
 *
 * @param page - Playwright page object
 * @param labelOrName - Label text or input name
 * @param optionText - Option text to select
 */
export async function selectOption(
  page: Page,
  labelOrName: string,
  optionText: string
): Promise<void> {
  // Try by name attribute first
  const selectByName = page.locator(`select[name="${labelOrName}"]`);
  if (await selectByName.isVisible()) {
    await selectByName.selectOption({ label: optionText });
    return;
  }

  // Try combobox
  const combobox = page.locator(`button[role="combobox"]:near(:text("${labelOrName}"))`);
  if (await combobox.isVisible()) {
    await combobox.click();
    await page.click(`text="${optionText}"`);
    return;
  }
}

// ============================================================================
// Dialog Helpers
// ============================================================================

/**
 * Confirm a dialog
 *
 * @param page - Playwright page object
 */
export async function confirmDialog(page: Page): Promise<void> {
  // Look for common confirm button patterns
  const confirmButton = page
    .locator('button:has-text("Confirm")')
    .or(page.locator('button:has-text("Delete")').last())
    .or(page.locator('button:has-text("Yes")'))
    .or(page.locator('[role="dialog"] button[type="submit"]'));

  await confirmButton.click();
}

/**
 * Cancel a dialog
 *
 * @param page - Playwright page object
 */
export async function cancelDialog(page: Page): Promise<void> {
  const cancelButton = page
    .locator('button:has-text("Cancel")')
    .or(page.locator('button:has-text("No")'))
    .or(page.locator('[role="dialog"] button:has-text("Close")'));

  await cancelButton.click();
}

/**
 * Expect a toast message
 *
 * @param page - Playwright page object
 * @param message - Toast message to expect (partial match)
 */
export async function expectToast(
  page: Page,
  message: string
): Promise<void> {
  // Toast messages appear in a toast container
  await expect(
    page.locator(`[role="status"]:has-text("${message}")`)
      .or(page.locator(`[data-state="open"]:has-text("${message}")`))
      .or(page.locator(`text="${message}"`))
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Expect a destructive/error toast message
 *
 * @param page - Playwright page object
 * @param message - Error message to expect
 */
export async function expectErrorToast(
  page: Page,
  message: string
): Promise<void> {
  await expectToast(page, message);
}

// ============================================================================
// Table Helpers
// ============================================================================

/**
 * Search in a table
 *
 * @param page - Playwright page object
 * @param query - Search query
 */
export async function searchInTable(
  page: Page,
  query: string
): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"]');
  await searchInput.fill(query);
  // Wait for debounce
  await page.waitForTimeout(500);
}

/**
 * Clear table search
 *
 * @param page - Playwright page object
 */
export async function clearTableSearch(page: Page): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"]');
  await searchInput.clear();
  await page.waitForTimeout(300);
}

/**
 * Sort table by column
 *
 * @param page - Playwright page object
 * @param columnName - Column header text
 */
export async function sortTableBy(
  page: Page,
  columnName: string
): Promise<void> {
  await page.click(`th:has-text("${columnName}")`);
  await page.waitForTimeout(300);
}

/**
 * Expect a certain number of rows in a table/list
 *
 * @param page - Playwright page object
 * @param count - Expected row count
 * @param selector - Row selector (default: table row or list item)
 */
export async function expectRowCount(
  page: Page,
  count: number,
  selector = 'tbody tr, [role="button"]'
): Promise<void> {
  await expect(page.locator(selector)).toHaveCount(count);
}

// ============================================================================
// Pagination Helpers
// ============================================================================

/**
 * Go to next page
 *
 * @param page - Playwright page object
 */
export async function goToNextPage(page: Page): Promise<void> {
  const nextButton = page.locator('button:has-text("Next")');
  if (await nextButton.isEnabled()) {
    await nextButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Go to previous page
 *
 * @param page - Playwright page object
 */
export async function goToPreviousPage(page: Page): Promise<void> {
  const prevButton = page.locator('button:has-text("Previous")');
  if (await prevButton.isEnabled()) {
    await prevButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Change page size
 *
 * @param page - Playwright page object
 * @param size - New page size
 */
export async function changePageSize(
  page: Page,
  size: number
): Promise<void> {
  const pageSizeSelector = page.locator('button[role="combobox"]').last();
  await pageSizeSelector.click();
  await page.click(`text="${size}"`);
  await page.waitForTimeout(300);
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for an element to appear
 *
 * @param page - Playwright page object
 * @param selector - Element selector
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.locator(selector).waitFor({ state: 'visible', timeout });
}

/**
 * Wait for an element to disappear
 *
 * @param page - Playwright page object
 * @param selector - Element selector
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.locator(selector).waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for loading to complete
 *
 * @param page - Playwright page object
 */
export async function waitForLoadingToComplete(page: Page): Promise<void> {
  // Wait for any loading spinners to disappear
  const loadingIndicators = [
    'text="Loading"',
    '[role="status"][aria-label*="loading"]',
    '.animate-spin',
  ];

  for (const selector of loadingIndicators) {
    const element = page.locator(selector);
    if (await element.isVisible().catch(() => false)) {
      await element.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }
  }
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Wait for a specific API request to complete
 *
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 * @param action - Action to perform that triggers the request
 */
export async function waitForApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>
): Promise<void> {
  const responsePromise = page.waitForResponse(urlPattern);
  await action();
  await responsePromise;
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Check if element has focus
 *
 * @param page - Playwright page object
 * @param selector - Element selector
 */
export async function expectFocused(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeFocused();
}

/**
 * Press Tab to move focus
 *
 * @param page - Playwright page object
 */
export async function pressTab(page: Page): Promise<void> {
  await page.keyboard.press('Tab');
}

/**
 * Press Escape to close dialog/menu
 *
 * @param page - Playwright page object
 */
export async function pressEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
}

/**
 * Press Enter to submit/confirm
 *
 * @param page - Playwright page object
 */
export async function pressEnter(page: Page): Promise<void> {
  await page.keyboard.press('Enter');
}
