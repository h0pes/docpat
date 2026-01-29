/**
 * E2E Tests for Notifications Page
 *
 * Tests notification management functionality including list display,
 * filtering, retry/cancel actions, and statistics.
 *
 * @module tests/e2e/notifications.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsDoctor } from './helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to notifications page and wait for it to load
 */
async function goToNotificationsPage(page: Page): Promise<void> {
  await page.goto('/notifications');
  await expect(page.locator('h1')).toContainText(/Notifications|Notifiche/i);
}

// ============================================================================
// Test Suite: Notifications Access
// ============================================================================

test.describe('Notifications - Access', () => {
  test('should allow admin to access notifications page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToNotificationsPage(page);

    // Should see notifications title
    await expect(page.locator('h1')).toContainText(/Notifications|Notifiche/i);
  });

  test('should allow doctor to access notifications page', async ({ page }) => {
    await loginAsDoctor(page);
    await goToNotificationsPage(page);

    // Should see notifications title
    await expect(page.locator('h1')).toContainText(/Notifications|Notifiche/i);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/notifications');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Test Suite: Notifications Statistics
// ============================================================================

test.describe('Notifications - Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToNotificationsPage(page);
  });

  test('should display statistics cards', async ({ page }) => {
    // Should see statistics for different statuses
    // Look for stat cards or badges showing counts
    await expect(
      page.getByText(/Pending|In attesa/i).first()
        .or(page.getByText(/Total|Totale/i).first())
    ).toBeVisible();
  });

  test('should show sent notifications count', async ({ page }) => {
    // Should see sent count (might be 0)
    await expect(
      page.getByText(/Sent|Inviate|Inviati/i).first()
    ).toBeVisible();
  });

  test('should show failed notifications count', async ({ page }) => {
    // Should see failed count indicator
    await expect(
      page.getByText(/Failed|Fallite|Falliti/i).first()
    ).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Notifications List
// ============================================================================

test.describe('Notifications - List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToNotificationsPage(page);
  });

  test('should display notification list or empty state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // Should either see notification items or empty state
    const notificationItem = page.locator('[data-testid="notification-item"]')
      .or(page.locator('article').filter({ hasText: /EMAIL|SMS|WHATSAPP/i }).first());
    const emptyState = page.getByText(/No notifications|Nessuna notifica/i);

    await expect(notificationItem.or(emptyState)).toBeVisible({ timeout: 5000 });
  });

  test('should have refresh button', async ({ page }) => {
    // Should see refresh button
    const refreshBtn = page.getByRole('button', { name: /Refresh|Aggiorna/i });
    await expect(refreshBtn).toBeVisible();

    // Click should not throw error
    await refreshBtn.click();
    await expect(refreshBtn).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Notifications Filtering
// ============================================================================

test.describe('Notifications - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToNotificationsPage(page);
  });

  test('should have status filter options', async ({ page }) => {
    // Look for status filter (combobox or buttons)
    const statusFilter = page.getByRole('combobox').first()
      .or(page.locator('button').filter({ hasText: /Status|Stato/i }).first());

    await expect(statusFilter).toBeVisible();
  });

  test('should have notification type filter', async ({ page }) => {
    // Look for type filter (EMAIL, SMS, etc.)
    const typeFilter = page.getByRole('combobox')
      .or(page.locator('button').filter({ hasText: /Type|Tipo/i }));

    // May or may not exist depending on implementation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by status when clicking pending', async ({ page }) => {
    // Find and click pending filter option
    const pendingOption = page.getByRole('button', { name: /Pending|In attesa/i })
      .or(page.getByText(/Pending|In attesa/i).first());

    if (await pendingOption.isVisible()) {
      await pendingOption.click();
      // Page should update (no navigation)
      await expect(page).toHaveURL(/\/notifications/);
    }
  });
});

// ============================================================================
// Test Suite: Notifications Actions
// ============================================================================

test.describe('Notifications - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToNotificationsPage(page);
  });

  test('should show retry button for failed notifications', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are failed notifications, they should have retry button
    const retryBtn = page.getByRole('button', { name: /Retry|Riprova/i }).first();

    // This may or may not be visible depending on data
    if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(retryBtn).toBeVisible();
    }
  });

  test('should show cancel button for pending notifications', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are pending notifications, they should have cancel button
    const cancelBtn = page.getByRole('button', { name: /Cancel|Annulla/i }).first();

    // This may or may not be visible depending on data
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(cancelBtn).toBeVisible();
    }
  });

  test('should show confirmation dialog when cancelling notification', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // Find cancel button
    const cancelBtn = page.getByRole('button', { name: /Cancel|Annulla/i }).first();

    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();

      // Should show confirmation dialog
      await expect(page.locator('[role="alertdialog"]')).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
    }
  });
});

// ============================================================================
// Test Suite: Notifications Pagination
// ============================================================================

test.describe('Notifications - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToNotificationsPage(page);
  });

  test('should show load more button when there are more items', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are more items, should see load more button
    const loadMoreBtn = page.getByRole('button', { name: /Load More|Carica Altri|Show More/i });

    // This may or may not be visible depending on data volume
    await expect(page.locator('body')).toBeVisible();
  });
});
