/**
 * E2E Tests for Dashboard Page
 *
 * Tests dashboard functionality including statistics cards,
 * recent activity display, and quick action buttons.
 *
 * @module tests/e2e/dashboard.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsDoctor } from './helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to dashboard page and wait for it to load
 */
async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText(/Dashboard/i);
}

// ============================================================================
// Test Suite: Dashboard Access
// ============================================================================

test.describe('Dashboard - Access', () => {
  test('should allow admin to access dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await goToDashboard(page);

    // Should see welcome message
    await expect(page.getByText(/Welcome/i).or(page.getByText(/Benvenuto/i))).toBeVisible();
  });

  test('should allow doctor to access dashboard', async ({ page }) => {
    await loginAsDoctor(page);
    await goToDashboard(page);

    // Should see dashboard title
    await expect(page.locator('h1')).toContainText(/Dashboard/i);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Test Suite: Dashboard Statistics
// ============================================================================

test.describe('Dashboard - Statistics Cards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToDashboard(page);
  });

  test('should display statistics grid with 4 cards', async ({ page }) => {
    // Wait for skeleton loading to finish
    await page.waitForTimeout(500);

    // Should see patients card
    await expect(
      page.getByText(/Patients|Pazienti/i).first()
    ).toBeVisible();

    // Should see appointments card
    await expect(
      page.getByText(/Appointments|Appuntamenti/i).first()
    ).toBeVisible();

    // Should see visits card
    await expect(
      page.getByText(/Visits|Visite/i).first()
    ).toBeVisible();

    // Should see prescriptions card
    await expect(
      page.getByText(/Prescriptions|Ricette/i).first()
    ).toBeVisible();
  });

  test('should navigate to patients page when clicking patients card', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(500);

    // Click on patients stat card - find the clickable parent of the h3 Patients heading
    const patientsHeading = page.getByRole('heading', { name: /^Patients$|^Pazienti$/i, level: 3 });
    // Click the parent div which has cursor=pointer
    await patientsHeading.locator('..').locator('..').click();

    // Should navigate to patients page
    await expect(page).toHaveURL('/patients');
  });

  test('should navigate to appointments page when clicking appointments card', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(500);

    // Click on appointments stat card - find the clickable parent of the h3 Appointments heading
    const appointmentsHeading = page.getByRole('heading', { name: /^Appointments$|^Appuntamenti$/i, level: 3 });
    // Click the parent div which has cursor=pointer
    await appointmentsHeading.locator('..').locator('..').click();

    // Should navigate to appointments page
    await expect(page).toHaveURL('/appointments');
  });
});

// ============================================================================
// Test Suite: Dashboard Quick Actions
// ============================================================================

test.describe('Dashboard - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToDashboard(page);
  });

  test('should display quick actions section', async ({ page }) => {
    // Should see quick actions heading
    await expect(
      page.getByText(/Quick Actions|Azioni Rapide/i)
    ).toBeVisible();
  });

  test('should have new appointment quick action button', async ({ page }) => {
    // Should see new appointment button
    const newAppointmentBtn = page.getByRole('button', { name: /New Appointment|Nuovo Appuntamento/i });
    await expect(newAppointmentBtn).toBeVisible();

    // Click and verify navigation
    await newAppointmentBtn.click();
    await expect(page).toHaveURL('/appointments/new');
  });

  test('should have new patient quick action button', async ({ page }) => {
    // Should see new patient button
    const newPatientBtn = page.getByRole('button', { name: /New Patient|Nuovo Paziente/i });
    await expect(newPatientBtn).toBeVisible();

    // Click and verify navigation
    await newPatientBtn.click();
    await expect(page).toHaveURL('/patients/new');
  });

  test('should have new visit quick action button', async ({ page }) => {
    // Should see new visit button
    const newVisitBtn = page.getByRole('button', { name: /New Visit|Nuova Visita/i });
    await expect(newVisitBtn).toBeVisible();

    // Click and verify navigation
    await newVisitBtn.click();
    await expect(page).toHaveURL('/visits/new');
  });

  test('should have new prescription quick action button', async ({ page }) => {
    // Should see new prescription button
    const newPrescriptionBtn = page.getByRole('button', { name: /New Prescription|Nuova Ricetta/i });
    await expect(newPrescriptionBtn).toBeVisible();

    // Click and verify navigation
    await newPrescriptionBtn.click();
    await expect(page).toHaveURL('/prescriptions/new');
  });
});

// ============================================================================
// Test Suite: Dashboard Recent Activity
// ============================================================================

test.describe('Dashboard - Recent Activity', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToDashboard(page);
  });

  test('should display recent activity section', async ({ page }) => {
    // Should see recent activity heading
    await expect(
      page.getByText(/Recent Activity|Attività Recente/i)
    ).toBeVisible();
  });

  test('should have view all activity button', async ({ page }) => {
    // Should see view all button
    const viewAllBtn = page.getByRole('button', { name: /View All|Vedi Tutto|View all activity/i });
    await expect(viewAllBtn).toBeVisible();

    // Click and verify navigation
    await viewAllBtn.click();
    await expect(page).toHaveURL('/appointments');
  });

  test('should show empty state when no recent activity', async ({ page }) => {
    // If there's no recent activity, should show empty state message
    // This test checks that the page handles the empty state gracefully
    const emptyMessage = page.getByText(/No recent activity|Nessuna attività recente/i);
    const activityContent = page.locator('article, [class*="card"]').filter({ hasText: /Recent Activity/i });

    // Either we see activity items or the empty message
    await expect(activityContent.or(emptyMessage)).toBeVisible();
  });
});
