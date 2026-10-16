import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('renders login page correctly with finance branding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('InvoiceOps');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('displays actionable error on invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    // Mock API failure for login
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials or user is inactive' }),
      });
    });

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    const alert = page.locator('[role="alert"], .errorBanner, div[style*="background"]');
    await expect(alert.filter({ hasText: /Invalid credentials/i })).toBeVisible();
  });

  test('successfully signs in and navigates to workbench dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'jwt-test-token-2026',
          user: {
            id: 'usr_admin',
            email: 'admin@invoiceops.local',
            fullName: 'Sarah Jenkins',
            role: 'ADMIN',
            organisationId: 'org_01',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
          organisation: {
            id: 'org_01',
            name: 'Acme Logistics UK Ltd',
            currency: 'GBP',
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });
    });

    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalInvoices: 10,
          needsReview: 3,
          pendingApproval: 2,
          approved: 4,
          rejected: 1,
          failed: 0,
          duplicateWarnings: 1,
          poMismatches: 0,
          currencyBreakdown: [{ currency: 'GBP', totalAmount: 14250.0, count: 5 }],
          recentInvoices: [],
        }),
      });
    });

    await page.fill('input[type="email"]', 'admin@invoiceops.local');
    await page.fill('input[type="password"]', 'DemoAdmin2026!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(#.*)?$/);
    await expect(page.locator('h1')).toContainText('Accounts Payable Workbench');
  });
});
