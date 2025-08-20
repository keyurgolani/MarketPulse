import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('should load the application without errors', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/MarketPulse/);

    // Check that the root div is visible (more reliable than main)
    await expect(page.locator('#root')).toBeVisible();

    // Check that we don't have any obvious error messages
    const errorElements = page.locator('text=Error');
    const errorCount = await errorElements.count();
    expect(errorCount).toBe(0);
  });

  test('should display dashboard content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for dashboard-related content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check that we're redirected to /dashboard
    expect(page.url()).toContain('/dashboard');

    // Look for any content that indicates the app loaded
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    await expect(rootElement).not.toBeEmpty();
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test basic navigation functionality
    // This is a placeholder - actual navigation tests would depend on the UI
    const currentUrl = page.url();
    expect(currentUrl).toContain('localhost:5173');
  });
});
