import { test } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('Homepage should be accessible', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Dashboard should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Markets page should be accessible', async ({ page }) => {
    await page.goto('/markets');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });
});