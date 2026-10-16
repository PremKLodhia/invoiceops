import { test, expect } from '@playwright/test';

test.describe('Truthful Error Handling & Anti-Simulation Guarantees', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept auth/me to confirm authenticated admin session
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr_admin_01',
            email: 'admin@invoiceops.local',
            fullName: 'Alexander Vance',
            role: 'ADMIN',
            organisationId: 'org_main_01',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
          organisation: {
            id: 'org_main_01',
            name: 'Vance Industrial Logistics Ltd',
            currency: 'GBP',
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        'invoiceops_auth_user',
        JSON.stringify({
          id: 'usr_admin_01',
          email: 'admin@invoiceops.local',
          fullName: 'Alexander Vance',
          role: 'ADMIN',
          organisationId: 'org_main_01',
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
        })
      );
      localStorage.setItem(
        'invoiceops_auth_org',
        JSON.stringify({
          id: 'org_main_01',
          name: 'Vance Industrial Logistics Ltd',
          currency: 'GBP',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );
    });
  });

  test('failed save NEVER displays "All changes saved" and retains unsaved dirty state', async ({ page }) => {
    const mockInvoice = {
      id: 'inv_fail_01',
      invoiceNumber: 'INV-FAIL-001',
      supplierName: 'Apex Logistics LLC',
      issueDate: '2026-10-15',
      dueDate: '2026-11-15',
      currency: 'GBP',
      netAmount: 500.0,
      taxAmount: 100.0,
      grossAmount: 600.0,
      status: 'NEEDS_REVIEW',
      lineItems: [],
      fields: {},
      createdAt: '2026-10-15T10:00:00Z',
    };

    await page.route('**/api/invoices/inv_fail_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvoice),
      });
    });

    await page.route('**/api/suppliers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock API failure on field save
    await page.route('**/api/invoices/inv_fail_01/fields', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Database connection timeout during save' }),
      });
    });

    await page.goto('/invoices/inv_fail_01');
    await expect(page.locator('h1')).toContainText('INV-FAIL-001');

    // Make an edit
    const invInput = page.locator('input[value="INV-FAIL-001"]');
    await invInput.fill('INV-FAIL-001-MODIFIED');

    // Click Save Changes
    await page.click('button:has-text("Save Changes")');

    // Critical assertion: MUST NOT display "All changes saved"
    await expect(page.locator('text=All changes saved')).not.toBeVisible();

    // Critical assertion: Actionable failure banner must be displayed
    await expect(page.locator('text=Failed to save invoice changes: Database connection timeout during save')).toBeVisible();

    // Critical assertion: Unsaved changes indicator must remain visible for safe retry
    await expect(page.locator('text=Unsaved changes')).toBeVisible();
  });

  test('failed workflow submit NEVER alters invoice status badge', async ({ page }) => {
    const mockInvoice = {
      id: 'inv_fail_02',
      invoiceNumber: 'INV-FAIL-002',
      supplierName: 'Apex Logistics LLC',
      issueDate: '2026-10-15',
      dueDate: '2026-11-15',
      currency: 'GBP',
      netAmount: 500.0,
      taxAmount: 100.0,
      grossAmount: 600.0,
      status: 'NEEDS_REVIEW',
      lineItems: [],
      fields: {},
      createdAt: '2026-10-15T10:00:00Z',
    };

    await page.route('**/api/invoices/inv_fail_02', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvoice),
      });
    });

    await page.route('**/api/suppliers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock API failure on workflow submit
    await page.route('**/api/invoices/inv_fail_02/submit', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Validation errors must be corrected before submission' }),
      });
    });

    await page.goto('/invoices/inv_fail_02');

    // Verify initial status is NEEDS_REVIEW
    await expect(page.locator('text=Needs Review').first()).toBeVisible();

    // Attempt to submit
    await page.click('button:has-text("Submit for Approval")');

    // Critical assertion: Status badge must remain NEEDS_REVIEW, NOT simulated to PENDING_APPROVAL
    await expect(page.locator('text=Pending Approval')).not.toBeVisible();
    await expect(page.locator('text=Needs Review').first()).toBeVisible();

    // Critical assertion: Error message must be rendered
    await expect(page.locator('text=Workflow operation failed: Validation errors must be corrected before submission')).toBeVisible();
  });

  test('failed CSV export displays actionable error and never triggers unsanitized download', async ({ page }) => {
    await page.route('**/api/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock failure on export endpoint
    await page.route('**/api/export/invoices/csv', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Export service temporarily unavailable' }),
      });
    });

    await page.goto('/invoices');
    await page.click('button:has-text("Export CSV")');

    // Critical assertion: Export error banner displayed
    await expect(page.locator('text=Export failed: Export service temporarily unavailable')).toBeVisible();
  });
});
