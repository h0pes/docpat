/**
 * E2E Tests for Reports Page
 *
 * Tests reporting and analytics functionality including tab navigation,
 * date filtering, chart display, and export functionality.
 *
 * @module tests/e2e/reports.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsDoctor } from './helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to reports page and wait for it to load
 */
async function goToReportsPage(page: Page): Promise<void> {
  await page.goto('/reports');
  await expect(page.locator('h1')).toContainText(/Reports|Report/i);
}

// ============================================================================
// Test Suite: Reports Access
// ============================================================================

test.describe('Reports - Access', () => {
  test('should allow admin to access reports page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToReportsPage(page);

    // Should see reports title
    await expect(page.locator('h1')).toContainText(/Reports|Report/i);
  });

  test('should allow doctor to access reports page', async ({ page }) => {
    await loginAsDoctor(page);
    await goToReportsPage(page);

    // Should see reports title
    await expect(page.locator('h1')).toContainText(/Reports|Report/i);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/reports');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Test Suite: Reports Tabs
// ============================================================================

test.describe('Reports - Tabs Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToReportsPage(page);
  });

  test('should display 4 report tabs', async ({ page }) => {
    // Should see all 4 tabs
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();

    // Appointments tab
    await expect(
      page.getByRole('tab', { name: /Appointments|Appuntamenti/i })
    ).toBeVisible();

    // Patients tab
    await expect(
      page.getByRole('tab', { name: /Patients|Pazienti/i })
    ).toBeVisible();

    // Diagnoses tab
    await expect(
      page.getByRole('tab', { name: /Diagnoses|Diagnosi/i })
    ).toBeVisible();

    // Productivity tab
    await expect(
      page.getByRole('tab', { name: /Productivity|Produttività/i })
    ).toBeVisible();
  });

  test('should default to appointments tab', async ({ page }) => {
    // Appointments tab should be selected by default
    const appointmentsTab = page.getByRole('tab', { name: /Appointments|Appuntamenti/i });
    await expect(appointmentsTab).toHaveAttribute('data-state', 'active');
  });

  test('should switch to patients tab', async ({ page }) => {
    // Click patients tab
    const patientsTab = page.getByRole('tab', { name: /Patients|Pazienti/i });
    await patientsTab.click();

    // Should be active
    await expect(patientsTab).toHaveAttribute('data-state', 'active');
  });

  test('should switch to diagnoses tab', async ({ page }) => {
    // Click diagnoses tab
    const diagnosesTab = page.getByRole('tab', { name: /Diagnoses|Diagnosi/i });
    await diagnosesTab.click();

    // Should be active
    await expect(diagnosesTab).toHaveAttribute('data-state', 'active');
  });

  test('should switch to productivity tab', async ({ page }) => {
    // Click productivity tab
    const productivityTab = page.getByRole('tab', { name: /Productivity|Produttività/i });
    await productivityTab.click();

    // Should be active
    await expect(productivityTab).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================================
// Test Suite: Reports Date Filtering
// ============================================================================

test.describe('Reports - Date Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToReportsPage(page);
  });

  test('should have date range picker', async ({ page }) => {
    // Should see date range picker button
    const dateRangePicker = page.getByRole('button', { name: /Pick a date|Seleziona data|Select date|Date/i })
      .or(page.locator('button').filter({ hasText: /Today|Oggi|This week|Last 7|Last 30/i }).first());

    await expect(dateRangePicker).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    // Should see refresh button
    const refreshBtn = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    await expect(refreshBtn).toBeVisible();

    // Click should not throw error
    await refreshBtn.click();
    await expect(refreshBtn).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Reports Export
// ============================================================================

test.describe('Reports - Export', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToReportsPage(page);
  });

  test('should have export dropdown button', async ({ page }) => {
    // Should see export button
    const exportBtn = page.getByRole('button', { name: /Export|Esporta/i });
    await expect(exportBtn).toBeVisible();
  });

  test('should show export format options when clicking export', async ({ page }) => {
    // Click export button
    const exportBtn = page.getByRole('button', { name: /Export|Esporta/i });
    await exportBtn.click();

    // Should show dropdown with format options
    await expect(page.getByRole('menuitem', { name: /JSON/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /CSV/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /PDF/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Excel/i })).toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');
  });
});

// ============================================================================
// Test Suite: Reports Content
// ============================================================================

test.describe('Reports - Content', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToReportsPage(page);
  });

  test('should display appointments report content', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(500);

    // Should see some chart or statistics content
    // The content area should have cards or charts
    const contentArea = page.locator('[role="tabpanel"]').first();
    await expect(contentArea).toBeVisible();
  });

  test('should display patients report content when switching tabs', async ({ page }) => {
    // Switch to patients tab
    const patientsTab = page.getByRole('tab', { name: /Patients|Pazienti/i });
    await patientsTab.click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Content should update
    const contentArea = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(contentArea).toBeVisible();
  });
});
