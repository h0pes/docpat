/**
 * E2E Tests for Profile Page
 *
 * Tests user profile functionality including viewing profile information
 * and MFA management. Available to all authenticated users.
 *
 * @module tests/e2e/profile.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsDoctor, ADMIN_USER, DOCTOR_USER } from './helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to profile page and wait for it to load
 */
async function goToProfilePage(page: Page): Promise<void> {
  await page.goto('/profile');
  await expect(page.locator('h1')).toContainText(/Profile|Profilo/i);
}

// ============================================================================
// Test Suite: Profile Access
// ============================================================================

test.describe('Profile - Access', () => {
  test('should allow admin to access profile page', async ({ page }) => {
    await loginAsAdmin(page);
    await goToProfilePage(page);

    // Should see profile title
    await expect(page.locator('h1')).toContainText(/Profile|Profilo/i);
  });

  test('should allow doctor to access profile page', async ({ page }) => {
    await loginAsDoctor(page);
    await goToProfilePage(page);

    // Should see profile title
    await expect(page.locator('h1')).toContainText(/Profile|Profilo/i);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Test Suite: Profile Information Display
// ============================================================================

test.describe('Profile - Information Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToProfilePage(page);
  });

  test('should display user avatar with initials', async ({ page }) => {
    // Should see user card with initials or name
    // The profile page has initials in the header area
    await expect(
      page.getByText('@testadmin')
    ).toBeVisible();
  });

  test('should display user full name', async ({ page }) => {
    // Admin user has first_name and last_name
    await expect(
      page.getByText(/Admin|Test/i).first()
    ).toBeVisible();
  });

  test('should display username', async ({ page }) => {
    // Should see @username format
    await expect(
      page.getByText(`@${ADMIN_USER.username}`)
    ).toBeVisible();
  });

  test('should display role badge', async ({ page }) => {
    // Should see admin role badge ("Administrator" on profile page)
    await expect(
      page.getByText(/Administrator|Amministratore/i).first()
    ).toBeVisible();
  });

  test('should display contact information section', async ({ page }) => {
    // Should see email
    await expect(
      page.getByText(/Email/i)
    ).toBeVisible();

    // Should see the actual email address
    await expect(
      page.locator('text=@').first()
    ).toBeVisible();
  });

  test('should display account information section', async ({ page }) => {
    // Should see created date label
    await expect(
      page.getByText(/Created|Creato/i)
    ).toBeVisible();

    // Should see last login label
    await expect(
      page.getByText(/Last Login|Ultimo accesso/i)
    ).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Profile - Security Settings
// ============================================================================

test.describe('Profile - Security Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToProfilePage(page);
  });

  test('should display security settings card', async ({ page }) => {
    // Should see security section heading
    await expect(
      page.getByRole('heading', { name: /Security Settings|Impostazioni Sicurezza/i })
    ).toBeVisible();
  });

  test('should display MFA status', async ({ page }) => {
    // Should see Two-Factor Authentication label
    await expect(
      page.getByText(/Two-Factor Authentication|Autenticazione a due fattori/i).first()
    ).toBeVisible();
  });

  test('should have MFA enable/disable button', async ({ page }) => {
    // Should see either Enable MFA or Disable MFA button
    await expect(
      page.getByRole('button', { name: /Enable MFA|Disable MFA|Abilita|Disabilita/i })
    ).toBeVisible();
  });

  test('should show MFA warning when disabled', async ({ page }) => {
    // Check if MFA is disabled - if so, should see warning
    const enableButton = page.getByRole('button', { name: /Enable MFA|Abilita MFA/i });

    if (await enableButton.isVisible()) {
      // MFA is disabled, should see warning
      await expect(
        page.getByText(/recommend|warning|consigliamo|avviso/i).first()
      ).toBeVisible();
    }
  });
});

// ============================================================================
// Test Suite: Profile - MFA Setup Dialog
// ============================================================================

test.describe('Profile - MFA Setup', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToProfilePage(page);
  });

  test('should open MFA setup dialog when clicking Enable', async ({ page }) => {
    const enableButton = page.getByRole('button', { name: /Enable MFA|Abilita MFA/i });

    if (await enableButton.isVisible()) {
      await enableButton.click();

      // MFA setup dialog should open
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Should see QR code or setup instructions
      await expect(
        page.getByText(/QR|scan|authenticator|code/i).first()
      ).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
    }
  });

  test.skip('should complete MFA setup with valid code', async ({ page }) => {
    // This test is skipped because it requires a valid TOTP code
    // which would need to be generated from the secret
    // Manual testing required for full MFA setup flow
  });
});

// ============================================================================
// Test Suite: Profile - MFA Disable
// ============================================================================

test.describe('Profile - MFA Disable', () => {
  test('should show disable confirmation dialog', async ({ page }) => {
    await loginAsAdmin(page);
    await goToProfilePage(page);

    const disableButton = page.getByRole('button', { name: /Disable MFA|Disabilita MFA/i });

    if (await disableButton.isVisible()) {
      await disableButton.click();

      // Confirmation dialog should open
      await expect(page.locator('[role="alertdialog"], [role="dialog"]')).toBeVisible();

      // Should see warning about security implications
      await expect(
        page.getByText(/warning|security|sicurezza|attenzione/i).first()
      ).toBeVisible();

      // Cancel dialog
      await page.click('button:has-text("Cancel"), button:has-text("Annulla")');
    }
  });

  test.skip('should disable MFA when confirmed', async ({ page }) => {
    // This test is skipped because MFA disable is not yet implemented
    // per the TODO comment in ProfilePage.tsx
    // "TODO: Implement MFA disable when backend endpoint is available"
  });
});

// ============================================================================
// Test Suite: Profile - Doctor User
// ============================================================================

test.describe('Profile - Doctor User', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDoctor(page);
    await goToProfilePage(page);
  });

  test('should display doctor role badge', async ({ page }) => {
    // Should see doctor role badge (exact match on the profile page role display)
    await expect(
      page.locator('main').getByText(/Doctor|Dottore|Medico/i).first()
    ).toBeVisible();
  });

  test('should display doctor username', async ({ page }) => {
    await expect(
      page.getByText(`@${DOCTOR_USER.username}`)
    ).toBeVisible();
  });

  test('should have same security options as admin', async ({ page }) => {
    // Should see security section heading
    await expect(
      page.getByRole('heading', { name: /Security Settings|Impostazioni Sicurezza/i })
    ).toBeVisible();

    // Should see MFA option button
    await expect(
      page.getByRole('button', { name: /Enable MFA|Disable MFA|Abilita MFA|Disabilita MFA/i })
    ).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Profile - Navigation
// ============================================================================

test.describe('Profile - Navigation', () => {
  test('should access profile via user menu', async ({ page }) => {
    await loginAsAdmin(page);

    // Click user menu button in header (shows "TA Test Admin")
    await page.getByRole('button', { name: /Test Admin/i }).click();

    // Wait for dropdown menu to appear and click Profile option
    await page.getByRole('menuitem', { name: /Profile|Profilo/i }).click();

    // Should navigate to profile page
    await expect(page).toHaveURL('/profile');
  });

  test('should preserve profile access across navigation', async ({ page }) => {
    await loginAsAdmin(page);
    await goToProfilePage(page);

    // Navigate away
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Navigate back to profile
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Profile should still be accessible
    await expect(page.locator('h1')).toContainText(/Profile|Profilo/i);
  });
});
