import { test, expect } from '@playwright/test';

test('simple page load test', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/MarketPulse/);
});
