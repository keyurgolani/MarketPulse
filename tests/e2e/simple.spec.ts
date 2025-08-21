import { test, expect } from '@playwright/test';

test('simple page load test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MarketPulse/);
});
