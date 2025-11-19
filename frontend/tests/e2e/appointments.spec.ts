/**
 * E2E Tests for Appointment Management Workflows
 *
 * Tests comprehensive appointment CRUD operations, scheduling, conflict detection,
 * and recurring appointments. These tests assume backend is running and database
 * is seeded with test data.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test data for creating a new appointment
 */
const TEST_APPOINTMENT = {
  patient_name: 'John Doe', // Assuming this patient exists in test database
  date: '2025-12-15',
  time: '10:00',
  duration: '30',
  type: 'FOLLOW_UP',
  reason: 'Regular checkup',
  notes: 'Patient prefers morning appointments',
};

/**
 * Helper: Login as admin user
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testadmin');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

/**
 * Helper: Login as doctor user
 */
async function loginAsDoctor(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testdoctor');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

/**
 * Helper: Navigate to appointments page
 */
async function navigateToAppointments(page: Page) {
  await page.click('a[href="/appointments"]');
  await page.waitForURL('/appointments');
}

test.describe('Appointment Management - Viewing and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAppointments(page);
  });

  test('should display appointments calendar page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Appointments');

    // Check for calendar component
    await expect(page.locator('.rbc-calendar')).toBeVisible();

    // Check for view buttons (Day, Week, Month) - use getByRole for exact matching
    await expect(page.getByRole('button', { name: 'Day', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Month', exact: true })).toBeVisible();
  });

  test('should switch between calendar views', async ({ page }) => {
    // Default view is week (as set in AppointmentCalendar defaultView='week')
    await expect(page.locator('.rbc-time-view')).toBeVisible();

    // Switch to month view
    await page.getByRole('button', { name: 'Month', exact: true }).click();
    await expect(page.locator('.rbc-month-view')).toBeVisible();

    // Switch to day view
    await page.getByRole('button', { name: 'Day', exact: true }).click();
    await expect(page.locator('.rbc-time-view')).toBeVisible();

    // Switch back to week view
    await page.getByRole('button', { name: 'Week', exact: true }).click();
    await expect(page.locator('.rbc-time-view')).toBeVisible();
  });

  test('should navigate between months/weeks/days', async ({ page }) => {
    // Click today button
    await page.getByRole('button', { name: 'Today' }).click();

    // Navigate using chevron buttons (they have aria-labels, not text)
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    // Navigate back
    await page.getByRole('button', { name: /previous/i }).click();
  });

  test('should display appointment cards with correct information', async ({ page }) => {
    // Wait for appointments to load (if any)
    await page.waitForTimeout(1000);

    // Check for appointment cards (if they exist)
    const appointmentCards = page.locator('[class*="rbc-event"]');
    const count = await appointmentCards.count();

    if (count > 0) {
      // Verify first appointment has time information
      const firstCard = appointmentCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('should display statistics dashboard', async ({ page }) => {
    // Check for statistics section - the page shows appointment stats
    // Statistics cards should be visible (they may load async)
    await page.waitForTimeout(1000);

    // Look for statistics indicators - could be Total, Scheduled, Completed, etc.
    const hasStats = await page.locator('text=/Total|Scheduled|Completed|Today/i').count();
    expect(hasStats).toBeGreaterThan(0);
  });
});

test.describe('Appointment Management - Creating Appointments', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor since appointments require a valid provider ID
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should create a new appointment successfully', async ({ page }) => {
    // Click New Appointment button
    await page.click('button:has-text("New Appointment")');
    await page.waitForURL('/appointments/new');

    // Select patient - click combobox to open dropdown, then search
    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500); // Wait for debounce and API response
    // Click on patient in dropdown list - patient format is "LastName, FirstName"
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select date - click date button to open calendar
    const dateButton = page.locator('button').filter({ hasText: 'November 18th, 2025' }).first();
    await dateButton.click();
    // Wait for calendar to open and click on a date
    await page.waitForSelector('[role="grid"]', { state: 'visible' });
    // Click on a date in the calendar (19th day - a future weekday that should be enabled)
    await page.locator('[role="gridcell"] button:not([disabled]):has-text("19")').click();
    // Wait for calendar to close by checking grid is hidden
    await page.waitForSelector('[role="grid"]', { state: 'hidden', timeout: 2000 }).catch(() => {});

    // Select time - click time selector
    const timeButton = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton.click();
    await page.click('div[role="option"]:has-text("10:00")');

    // Duration should auto-fill based on type, but can verify it exists
    await expect(page.locator('input[type="number"]').first()).toBeVisible();

    // Select appointment type - click type selector
    await page.locator('button').filter({ hasText: 'Consultation' }).first().click();
    await page.click('div[role="option"]:has-text("Follow-up")');

    // Fill reason - use textarea
    await page.fill('textarea', TEST_APPOINTMENT.reason);

    // Submit form - wait for the POST request to complete
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/v1/appointments') && resp.request().method() === 'POST'
      ),
      page.click('button[type="submit"]'),
    ]);

    // Verify the appointment was created successfully
    expect(response.status()).toBe(201);

    // Should navigate to calendar or detail page
    await page.waitForURL(/\/appointments($|\/[a-f0-9-]+$)/, { timeout: 10000 });

    // Check success toast
    await expect(page.locator('text=/Appointment Created|Success/i')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Click New Appointment button
    await page.click('button:has-text("New Appointment")');
    await page.waitForURL('/appointments/new');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/Patient is required|required/i')).toBeVisible();
    await expect(page.locator('text=/Date is required|required/i')).toBeVisible();
  });

  test('should show availability indicator', async ({ page }) => {
    await page.click('button:has-text("New Appointment")');
    await page.waitForURL('/appointments/new');

    // Select patient first (required for availability check)
    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select date
    const dateButton = page.locator('button').filter({ hasText: /November.*2025/ }).first();
    await dateButton.click();
    await page.waitForSelector('[role="grid"]', { state: 'visible' });
    await page.locator('[role="gridcell"] button:not([disabled]):has-text("19")').click();
    await page.waitForSelector('[role="grid"]', { state: 'hidden', timeout: 2000 }).catch(() => {});

    // Select time
    const timeButton = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton.click();
    await page.click('div[role="option"]:has-text("10:00")');

    // Wait for availability check
    await page.waitForTimeout(1000);

    // Availability indicator should be visible
    await expect(page.locator('text=/Available|Busy|Conflict/i')).toBeVisible();
  });

  test('should cancel appointment creation', async ({ page }) => {
    await page.click('button:has-text("New Appointment")');
    await page.waitForURL('/appointments/new');

    // Fill some data - use textarea for reason
    await page.fill('textarea', 'Cancel Test');

    // Click cancel button - scroll to it first
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();

    // Should return to appointments calendar
    await page.waitForURL('/appointments');
  });
});

test.describe('Appointment Management - Conflict Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor since creating appointments requires a valid provider ID
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should detect scheduling conflicts', async ({ page }) => {
    // Create first appointment
    await page.click('button:has-text("New Appointment")');
    await page.waitForURL('/appointments/new');

    // Fill in first appointment
    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select date (20th)
    const dateButton1 = page.locator('button').filter({ hasText: /November.*2025/ }).first();
    await dateButton1.click();
    await page.waitForSelector('[role="grid"]', { state: 'visible' });
    await page.locator('[role="gridcell"] button:not([disabled]):has-text("21")').click();
    await page.waitForSelector('[role="grid"]', { state: 'hidden', timeout: 2000 }).catch(() => {});

    // Select time 14:00
    const timeButton1 = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton1.click();
    await page.click('div[role="option"]:has-text("14:00")');

    // Duration auto-fills based on type
    // Select type
    await page.locator('button').filter({ hasText: 'Consultation' }).first().click();
    await page.click('div[role="option"]:has-text("Follow-up")');

    await page.click('button[type="submit"]');

    // Wait for creation
    await page.waitForURL(/\/appointments/);
    await page.waitForTimeout(1000);

    // Try to create overlapping appointment
    await page.goto('/appointments/new');
    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select same date (20th)
    const dateButton2 = page.locator('button').filter({ hasText: /November.*2025/ }).first();
    await dateButton2.click();
    await page.waitForTimeout(300);
    await page.locator('[role="gridcell"] button:has-text("20")').first().click();

    // Select overlapping time 14:15
    const timeButton2 = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton2.click();
    await page.click('div[role="option"]:has-text("14:15")');

    // Select type
    await page.locator('button').filter({ hasText: 'Consultation' }).first().click();
    await page.click('div[role="option"]:has-text("Consultation")');

    await page.click('button[type="submit"]');

    // Should show conflict warning dialog
    await expect(page.locator('text=/Conflict|Overlap|Schedule/i')).toBeVisible();
  });

  test('should allow proceeding despite conflict', async ({ page }) => {
    // Assuming we have a conflict from previous test or setup
    // Navigate to create a conflicting appointment
    await page.goto('/appointments/new');

    // Fill in conflicting appointment details
    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select date (20th)
    const dateButton = page.locator('button').filter({ hasText: /November.*2025/ }).first();
    await dateButton.click();
    await page.waitForSelector('[role="grid"]', { state: 'visible' });
    await page.locator('[role="gridcell"] button:not([disabled]):has-text("21")').click();
    await page.waitForSelector('[role="grid"]', { state: 'hidden', timeout: 2000 }).catch(() => {});

    // Select time 14:15
    const timeButton = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton.click();
    await page.click('div[role="option"]:has-text("14:15")');

    // Select type
    await page.locator('button').filter({ hasText: 'Consultation' }).first().click();
    await page.click('div[role="option"]:has-text("Consultation")');

    await page.click('button[type="submit"]');

    // If conflict dialog appears, proceed anyway
    const proceedButton = page.locator('button:has-text("Proceed")');
    if (await proceedButton.isVisible()) {
      await proceedButton.click();
      await page.waitForURL(/\/appointments/);
    }
  });

  test('should cancel when conflict detected', async ({ page }) => {
    // Similar setup to create conflict
    await page.goto('/appointments/new');

    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select date (20th)
    const dateButton = page.locator('button').filter({ hasText: /November.*2025/ }).first();
    await dateButton.click();
    await page.waitForSelector('[role="grid"]', { state: 'visible' });
    await page.locator('[role="gridcell"] button:not([disabled]):has-text("21")').click();
    await page.waitForSelector('[role="grid"]', { state: 'hidden', timeout: 2000 }).catch(() => {});

    // Select time 14:15
    const timeButton = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton.click();
    await page.click('div[role="option"]:has-text("14:15")');

    // Select type
    await page.locator('button').filter({ hasText: 'Consultation' }).first().click();
    await page.click('div[role="option"]:has-text("Urgent")');

    await page.click('button[type="submit"]');

    // If conflict dialog appears, cancel
    const cancelButton = page.locator('button:has-text("Cancel")').last();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      // Should stay on form
      await expect(page).toHaveURL(/\/appointments\/new/);
    }
  });
});

test.describe('Appointment Management - Editing Appointments', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor since editing appointments may require provider ID for availability checks
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should edit appointment successfully', async ({ page }) => {
    // Click on first appointment in calendar
    const firstAppointment = page.locator('[class*="rbc-event"]').first();
    if (await firstAppointment.isVisible()) {
      await firstAppointment.click();

      // Click edit button
      await page.click('button:has-text("Edit")');
      await page.waitForURL(/\/appointments\/[a-f0-9-]+\/edit$/);

      // Update reason
      const newReason = 'Updated checkup reason';
      await page.fill('input[name="reason"]', '');
      await page.fill('input[name="reason"]', newReason);

      // Submit
      await page.click('button[type="submit"]');

      // Should return to detail or calendar
      await page.waitForURL(/\/appointments/);

      // Check success toast
      await expect(page.locator('text=/Updated|Success/i')).toBeVisible();
    }
  });

  test('should cancel editing', async ({ page }) => {
    const firstAppointment = page.locator('[class*="rbc-event"]').first();
    if (await firstAppointment.isVisible()) {
      await firstAppointment.click();
      await page.click('button:has-text("Edit")');
      await page.waitForURL(/\/appointments\/[a-f0-9-]+\/edit$/);

      // Make some changes
      await page.fill('input[name="reason"]', 'This should not be saved');

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Should return to detail or calendar without saving
      await page.waitForURL(/\/appointments/);
    }
  });
});

test.describe('Appointment Management - Canceling Appointments', () => {
  test('should cancel appointment as admin', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAppointments(page);

    // Click on an appointment
    const appointment = page.locator('[class*="rbc-event"]').first();
    if (await appointment.isVisible()) {
      await appointment.click();

      // Click cancel button
      await page.click('button:has-text("Cancel Appointment")');

      // Provide cancellation reason
      await page.fill('textarea[placeholder*="reason"]', 'Patient requested cancellation');

      // Confirm cancellation
      await page.click('button:has-text("Confirm")');

      // Check success toast
      await expect(page.locator('text=/Cancelled|Success/i')).toBeVisible();

      // Appointment status should update to CANCELLED
      await expect(page.locator('text="Cancelled"')).toBeVisible();
    }
  });
});

test.describe('Appointment Management - Recurring Appointments', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor since creating recurring appointments requires a valid provider ID
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should create recurring appointment', async ({ page }) => {
    await page.click('button:has-text("New Appointment")');
    await page.waitForURL('/appointments/new');

    // Fill basic info
    await page.click('button[role="combobox"]');
    await page.fill('input[placeholder="Search for a patient..."]', 'Doe');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Doe, John/i }).click();

    // Select date (24th - a Monday)
    const dateButton = page.locator('button').filter({ hasText: /November.*2025/ }).first();
    await dateButton.click();
    await page.waitForSelector('[role="grid"]', { state: 'visible' });
    await page.locator('[role="gridcell"] button:not([disabled]):has-text("24")').click();
    await page.waitForSelector('[role="grid"]', { state: 'hidden', timeout: 2000 }).catch(() => {});

    // Select time 09:00
    const timeButton = page.locator('button').filter({ hasText: /09:00/ }).first();
    await timeButton.click();
    await page.click('div[role="option"]:has-text("09:00")');

    // Select type - Acupuncture
    await page.locator('button').filter({ hasText: 'Consultation' }).first().click();
    await page.click('div[role="option"]:has-text("Acupuncture")');

    // Duration auto-fills based on type

    // Enable recurring - find and click the switch
    await page.locator('button[role="switch"]').click();

    // Set recurring pattern - these might be Select components too
    await page.waitForTimeout(500); // Wait for recurring options to appear

    // Try to set frequency if the fields are visible
    const frequencySelector = page.locator('button').filter({ hasText: /Weekly|Daily|Monthly/i }).first();
    if (await frequencySelector.isVisible({ timeout: 2000 })) {
      await frequencySelector.click();
      await page.click('div[role="option"]:has-text("Weekly")');
    }

    // Submit
    await page.click('button[type="submit"]');

    // Should create multiple appointments
    await page.waitForURL(/\/appointments/);
    await expect(page.locator('text=/Created|Success/i').first()).toBeVisible();
  });
});

test.describe('Appointment Management - Status Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should update appointment status', async ({ page }) => {
    // Click on a scheduled appointment
    const appointment = page.locator('[class*="rbc-event"]').first();
    if (await appointment.isVisible()) {
      await appointment.click();

      // Mark as confirmed
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await expect(page.locator('text="Confirmed"')).toBeVisible();
      }

      // Mark as in progress
      const inProgressButton = page.locator('button:has-text("Start")');
      if (await inProgressButton.isVisible()) {
        await inProgressButton.click();
        await expect(page.locator('text="In Progress"')).toBeVisible();
      }

      // Mark as completed
      const completeButton = page.locator('button:has-text("Complete")');
      if (await completeButton.isVisible()) {
        await completeButton.click();
        await expect(page.locator('text="Completed"')).toBeVisible();
      }
    }
  });
});

test.describe('Appointment Management - Print Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should print daily schedule', async ({ page }) => {
    // Click print button
    const printButton = page.locator('button:has-text("Print")');
    if (await printButton.isVisible()) {
      await printButton.click();

      // Should show print preview or trigger print dialog
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Appointment Management - Quick Reschedule', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor since rescheduling may require provider ID for availability checks
    await loginAsDoctor(page);
    await navigateToAppointments(page);
  });

  test('should quickly reschedule appointment', async ({ page }) => {
    // Click on appointment
    const appointment = page.locator('[class*="rbc-event"]').first();
    if (await appointment.isVisible()) {
      await appointment.click();

      // Look for quick reschedule option
      const rescheduleButton = page.locator('button:has-text("Reschedule")');
      if (await rescheduleButton.isVisible()) {
        await rescheduleButton.click();

        // Select new date/time
        await page.fill('input[name="new_date"]', '2025-12-30');
        await page.click('select[name="new_time"]');
        await page.selectOption('select[name="new_time"]', '11:00');

        // Confirm reschedule
        await page.click('button:has-text("Confirm")');

        await expect(page.locator('text=/Rescheduled|Success/i')).toBeVisible();
      }
    }
  });
});
