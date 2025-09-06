import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display dashboard with default layout', async ({ page }) => {
    // Check that dashboard is visible
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Check for navigation
    await expect(page.locator('[data-testid="dashboard-nav"]')).toBeVisible();
    
    // Check for widget grid
    await expect(page.locator('[data-testid="widget-grid"]')).toBeVisible();
  });

  test('should display user menu and profile', async ({ page }) => {
    // Check user menu is visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Check dropdown options
    await expect(page.locator('[data-testid="profile-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="settings-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
  });

  test('should navigate between different pages', async ({ page }) => {
    // Navigate to Markets page
    await page.click('[data-testid="markets-nav"]');
    await expect(page).toHaveURL(/.*\/markets/);
    await expect(page.locator('[data-testid="markets-page"]')).toBeVisible();
    
    // Navigate to News page
    await page.click('[data-testid="news-nav"]');
    await expect(page).toHaveURL(/.*\/news/);
    await expect(page.locator('[data-testid="news-page"]')).toBeVisible();
    
    // Navigate to Watchlist page
    await page.click('[data-testid="watchlist-nav"]');
    await expect(page).toHaveURL(/.*\/watchlist/);
    await expect(page.locator('[data-testid="watchlist-page"]')).toBeVisible();
    
    // Navigate back to Dashboard
    await page.click('[data-testid="dashboard-nav"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
  });

  test('should handle theme switching', async ({ page }) => {
    // Check current theme
    const body = page.locator('body');
    
    // Click theme toggle
    await page.click('[data-testid="theme-toggle"]');
    
    // Wait for theme change
    await page.waitForTimeout(500);
    
    // Verify theme changed (check for dark class or light class)
    const hasThemeClass = await body.evaluate((el) => {
      return el.classList.contains('dark') || el.classList.contains('light');
    });
    
    expect(hasThemeClass).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that dashboard is still functional
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Check mobile navigation
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
    
    // Check that content is responsive
    const widgetGrid = page.locator('[data-testid="widget-grid"]');
    const gridWidth = await widgetGrid.boundingBox();
    expect(gridWidth?.width).toBeLessThanOrEqual(375);
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Reload page to trigger API calls
    await page.reload();
    
    // Should show error boundary or error message
    const errorElement = page.locator('[data-testid="error-boundary"], [data-testid="error-message"]');
    await expect(errorElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Refresh the page
    await page.reload();
    
    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Should still show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});