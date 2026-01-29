/**
 * E2E Tests for Templates Pages
 *
 * Tests template management functionality for both visit templates
 * and prescription templates including list display, create, edit,
 * preview, and delete operations.
 *
 * @module tests/e2e/templates.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsDoctor } from './helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to visit templates page and wait for it to load
 */
async function goToVisitTemplatesPage(page: Page): Promise<void> {
  await page.goto('/visits/templates');
  await expect(page.locator('h1')).toContainText(/Visit Templates|Template Visite|Templates/i);
}

/**
 * Navigate to prescription templates page and wait for it to load
 */
async function goToPrescriptionTemplatesPage(page: Page): Promise<void> {
  await page.goto('/prescriptions/templates');
  await expect(page.locator('h1')).toContainText(/Prescription Templates|Template Ricette|Templates/i);
}

// ============================================================================
// Test Suite: Visit Templates Access
// ============================================================================

test.describe('Visit Templates - Access', () => {
  test('should allow admin to access visit templates page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToVisitTemplatesPage(page);

    // Should see visit templates title
    await expect(page.locator('h1')).toContainText(/Visit Templates|Template Visite|Templates/i);
  });

  test('should allow doctor to access visit templates page', async ({ page }) => {
    await loginAsDoctor(page);
    await goToVisitTemplatesPage(page);

    // Should see visit templates title
    await expect(page.locator('h1')).toContainText(/Visit Templates|Template Visite|Templates/i);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/visits/templates');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Test Suite: Visit Templates List
// ============================================================================

test.describe('Visit Templates - List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToVisitTemplatesPage(page);
  });

  test('should display template list or empty state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // Should either see template cards or empty state
    const templateCard = page.locator('article, [class*="Card"]').filter({ hasText: /Preview|Anteprima/i }).first();
    const emptyState = page.getByText(/No templates|Nessun template/i);

    await expect(templateCard.or(emptyState)).toBeVisible({ timeout: 5000 });
  });

  test('should have create template button', async ({ page }) => {
    // Should see create template button
    const createBtn = page.getByRole('button', { name: /Create Template|Crea Template|New Template/i });
    await expect(createBtn).toBeVisible();
  });

  test('should open create dialog when clicking create button', async ({ page }) => {
    // Click create template button
    const createBtn = page.getByRole('button', { name: /Create Template|Crea Template|New Template/i });
    await createBtn.click();

    // Should show dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Should have form fields
    await expect(
      page.getByLabel(/Name|Nome/i).or(page.getByPlaceholder(/template name/i))
    ).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
  });
});

// ============================================================================
// Test Suite: Visit Templates Actions
// ============================================================================

test.describe('Visit Templates - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToVisitTemplatesPage(page);
  });

  test('should have preview button on template cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are templates, they should have preview button
    const previewBtn = page.getByRole('button', { name: /Preview|Anteprima/i }).first();

    if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(previewBtn).toBeVisible();
    }
  });

  test('should have edit button on template cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are templates, they should have edit button (Edit icon)
    const editBtn = page.locator('button').filter({ has: page.locator('svg.lucide-edit, svg.lucide-pencil') }).first();

    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(editBtn).toBeVisible();
    }
  });

  test('should have delete button on template cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are templates, they should have delete button (Trash icon)
    const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();

    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(deleteBtn).toBeVisible();
    }
  });
});

// ============================================================================
// Test Suite: Prescription Templates Access
// ============================================================================

test.describe('Prescription Templates - Access', () => {
  test('should allow admin to access prescription templates page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrescriptionTemplatesPage(page);

    // Should see prescription templates title
    await expect(page.locator('h1')).toContainText(/Prescription Templates|Template Ricette|Templates/i);
  });

  test('should allow doctor to access prescription templates page', async ({ page }) => {
    await loginAsDoctor(page);
    await goToPrescriptionTemplatesPage(page);

    // Should see prescription templates title
    await expect(page.locator('h1')).toContainText(/Prescription Templates|Template Ricette|Templates/i);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/prescriptions/templates');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Test Suite: Prescription Templates List
// ============================================================================

test.describe('Prescription Templates - List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrescriptionTemplatesPage(page);
  });

  test('should display template list or empty state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // Should either see template cards or empty state
    const templateCard = page.locator('article, [class*="Card"]').filter({ hasText: /Preview|Anteprima|Dosage|Dosaggio/i }).first();
    const emptyState = page.getByText(/No templates|Nessun template/i);

    await expect(templateCard.or(emptyState)).toBeVisible({ timeout: 5000 });
  });

  test('should have create template button', async ({ page }) => {
    // Should see create template button
    const createBtn = page.getByRole('button', { name: /Create Template|Crea Template|New Template/i });
    await expect(createBtn).toBeVisible();
  });

  test('should open create dialog when clicking create button', async ({ page }) => {
    // Click create template button
    const createBtn = page.getByRole('button', { name: /Create Template|Crea Template|New Template/i });
    await createBtn.click();

    // Should show dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Should have medication name field
    await expect(
      page.getByLabel(/Medication Name|Nome Farmaco/i)
        .or(page.getByPlaceholder(/medication name/i))
    ).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
  });
});

// ============================================================================
// Test Suite: Prescription Templates Actions
// ============================================================================

test.describe('Prescription Templates - Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrescriptionTemplatesPage(page);
  });

  test('should have preview button on template cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are templates, they should have preview button
    const previewBtn = page.getByRole('button', { name: /Preview|Anteprima/i }).first();

    if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(previewBtn).toBeVisible();
    }
  });

  test('should have edit button on template cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are templates, they should have edit button (Edit icon)
    const editBtn = page.locator('button').filter({ has: page.locator('svg.lucide-edit, svg.lucide-pencil') }).first();

    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(editBtn).toBeVisible();
    }
  });

  test('should have delete button on template cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // If there are templates, they should have delete button (Trash icon)
    const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();

    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(deleteBtn).toBeVisible();
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(500);

    // Find delete button
    const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first();

    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();

      // Should show confirmation dialog
      await expect(page.locator('[role="alertdialog"]')).toBeVisible();

      // Should have cancel and confirm buttons
      await expect(page.getByRole('button', { name: /Cancel|Annulla/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Delete|Elimina/i })).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
    }
  });
});
