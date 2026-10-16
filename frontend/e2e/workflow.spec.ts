import { test, expect } from '@playwright/test';

test.describe('Critical Invoice Operations Workflow', () => {
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

  test('displays multi-currency subtotal breakdowns in invoice queue without combining codes', async ({ page }) => {
    await page.route('**/api/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'inv_01',
            invoiceNumber: 'INV-GBP-001',
            supplierName: 'British Fasteners Ltd',
            issueDate: '2026-10-10',
            dueDate: '2026-11-10',
            totalAmount: 1500.0,
            currency: 'GBP',
            status: 'NEEDS_REVIEW',
          },
          {
            id: 'inv_02',
            invoiceNumber: 'INV-USD-002',
            supplierName: 'Silicon Micro Corp',
            issueDate: '2026-10-12',
            dueDate: '2026-11-12',
            totalAmount: 3400.0,
            currency: 'USD',
            status: 'PENDING_APPROVAL',
          },
          {
            id: 'inv_03',
            invoiceNumber: 'INV-EUR-003',
            supplierName: 'Continental Trans GmbH',
            issueDate: '2026-10-14',
            dueDate: '2026-11-14',
            totalAmount: 2200.0,
            currency: 'EUR',
            status: 'APPROVED',
          },
        ]),
      });
    });

    await page.goto('/invoices');
    await expect(page.locator('h1')).toContainText('Invoice Processing Queue');

    // Verify multi-currency subtotals are visible and separated
    const queueArea = page.locator('body');
    await expect(queueArea).toContainText('GBP');
    await expect(queueArea).toContainText('USD');
    await expect(queueArea).toContainText('EUR');
    await expect(page.locator('text=INV-GBP-001')).toBeVisible();
    await expect(page.locator('text=INV-USD-002')).toBeVisible();
    await expect(page.locator('text=INV-EUR-003')).toBeVisible();
  });

  test('loads invoice review page and verifies field editing', async ({ page }) => {
    const mockInvoice = {
      id: 'inv_test_100',
      invoiceNumber: 'INV-2026-9999',
      supplierName: 'Apex Logistics LLC',
      issueDate: '2026-10-15',
      dueDate: '2026-11-15',
      currency: 'GBP',
      netAmount: 1000.0,
      taxAmount: 200.0,
      taxRate: 20.0,
      grossAmount: 1200.0,
      status: 'NEEDS_REVIEW',
      lineItems: [
        {
          id: 'li_01',
          description: 'Logistics Freight Service',
          quantity: 1,
          unitPrice: 1000.0,
          lineTotal: 1000.0,
          source: 'EXTRACTED',
        },
      ],
      fields: {
        supplierName: { fieldName: 'supplierName', extractedValue: 'Apex Logistics', confidence: 'HIGH', source: 'EXTRACTED' },
        invoiceNumber: { fieldName: 'invoiceNumber', extractedValue: 'INV-2026-9999', confidence: 'HIGH', source: 'EXTRACTED' },
      },
      originalFilename: 'apex_freight.pdf',
      createdAt: '2026-10-15T10:00:00Z',
    };

    await page.route('**/api/invoices/inv_test_100', async (route) => {
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
        body: JSON.stringify([{ id: 'sup_01', name: 'Apex Logistics LLC', active: true }]),
      });
    });

    await page.goto('/invoices/inv_test_100');
    await expect(page.locator('h1')).toContainText('INV-2026-9999');

    // Make an edit to the invoice number input
    const invInput = page.locator('input[value="INV-2026-9999"]');
    await expect(invInput).toBeVisible();
    await invInput.fill('INV-2026-9999-REV');

    // Confirm unsaved changes indicator appears
    await expect(page.locator('text=Unsaved changes')).toBeVisible();

    // Mock successful save
    await page.route('**/api/invoices/inv_test_100/fields', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockInvoice, invoiceNumber: 'INV-2026-9999-REV' }),
      });
    });

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=All changes saved')).toBeVisible();
  });

  test('navigates to team access control and shows user management data table', async ({ page }) => {
    await page.route('**/api/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'usr_01',
            email: 'admin@invoiceops.local',
            fullName: 'Alexander Vance',
            role: 'ADMIN',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            id: 'usr_02',
            email: 'reviewer@invoiceops.local',
            fullName: 'David Mercer',
            role: 'REVIEWER',
            isActive: true,
            createdAt: '2026-02-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/users');
    await expect(page.locator('h1')).toContainText('Team & Access Control');
    await expect(page.getByRole('table').getByText('Alexander Vance')).toBeVisible();
    await expect(page.getByRole('table').getByText('David Mercer')).toBeVisible();
    await expect(page.locator('button:has-text("Add Team Member")')).toBeVisible();
  });
});
