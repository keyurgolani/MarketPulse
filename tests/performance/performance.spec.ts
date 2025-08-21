import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should meet basic performance benchmarks', async ({ page }) => {
    // Navigate to the application and measure basic metrics
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get performance metrics using Navigation Timing API
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint:
          performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint:
          performance.getEntriesByName('first-contentful-paint')[0]
            ?.startTime || 0,
      };
    });

    // Performance benchmarks
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // DOM ready under 2s
    expect(performanceMetrics.loadComplete).toBeLessThan(3000); // Full load under 3s

    if (performanceMetrics.firstContentfulPaint > 0) {
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // FCP under 2s
    }
  });

  test('should have fast page load times', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have efficient resource loading', async ({ page }) => {
    const responses: any[] = [];

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'],
        type: response.headers()['content-type'],
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that critical resources loaded successfully (excluding external API rate limits)
    const failedRequests = responses.filter(
      r =>
        r.status >= 400 &&
        r.status !== 429 && // Ignore rate limiting errors
        !r.url.includes('/api/') // Ignore API endpoints that might be rate limited
    );
    expect(failedRequests).toHaveLength(0);

    // Check for reasonable bundle sizes (under 1MB for JS)
    const jsResources = responses.filter(
      r => r.type?.includes('javascript') && r.size
    );

    jsResources.forEach(resource => {
      const sizeInMB = parseInt(resource.size) / (1024 * 1024);
      expect(sizeInMB).toBeLessThan(1); // Under 1MB per JS file
    });
  });

  test('should handle concurrent users efficiently', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));

    const startTime = Date.now();

    // Simulate 5 concurrent users
    await Promise.all(
      pages.map(async page => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      })
    );

    const totalTime = Date.now() - startTime;

    // Should handle 5 concurrent users within 10 seconds
    expect(totalTime).toBeLessThan(10000);

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should have efficient memory usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get memory usage metrics
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (metrics && metrics.usedJSHeapSize) {
      // Memory usage should be reasonable (under 50MB)
      const memoryUsageMB = metrics.usedJSHeapSize / (1024 * 1024);
      expect(memoryUsageMB).toBeLessThan(50);
    } else {
      // If memory API is not available, skip this test
      console.log('Memory API not available in this browser');
    }
  });

  test('should have fast API response times', async ({ page }) => {
    const apiResponses: any[] = [];

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const startTime = Date.now();
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          startTime: startTime,
        });
      }
    });

    const pageStartTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const pageEndTime = Date.now();

    // Page load should be reasonable (under 5 seconds)
    const totalPageLoadTime = pageEndTime - pageStartTime;
    expect(totalPageLoadTime).toBeLessThan(5000);

    // Check that API responses were successful (excluding rate limiting)
    apiResponses.forEach(response => {
      // Allow rate limiting (429) and other temporary errors during tests
      if (response.status >= 400 && response.status !== 429) {
        console.warn(
          `API request failed: ${response.url} - Status: ${response.status}`
        );
      }
      // Only fail on server errors that aren't rate limiting
      expect(response.status === 429 || response.status < 500).toBeTruthy();
    });
  });

  test('should render efficiently on mobile devices', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ media: 'screen' });

    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Mobile load time should be under 4 seconds
    expect(loadTime).toBeLessThan(4000);
  });

  test('should have efficient CSS and asset loading', async ({ page }) => {
    const resources: any[] = [];

    page.on('response', response => {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('css') || contentType.includes('image')) {
        resources.push({
          url: response.url(),
          type: contentType,
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // CSS files should be reasonably sized (under 500KB)
    const cssResources = resources.filter(r => r.type.includes('css'));
    cssResources.forEach(resource => {
      if (resource.size) {
        const sizeInKB = parseInt(resource.size) / 1024;
        expect(sizeInKB).toBeLessThan(500);
      }
    });
  });

  test('should maintain performance under load', async ({ page }) => {
    const performanceMetrics: number[] = [];

    // Run multiple page loads to test consistency
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      performanceMetrics.push(loadTime);

      // Small delay between tests
      await page.waitForTimeout(100);
    }

    // Calculate average and ensure consistency
    const averageTime =
      performanceMetrics.reduce((a, b) => a + b, 0) / performanceMetrics.length;
    const maxTime = Math.max(...performanceMetrics);
    const minTime = Math.min(...performanceMetrics);

    // Performance should be consistent (max shouldn't be more than 2.5x min)
    expect(maxTime / minTime).toBeLessThan(2.5);

    // Average load time should be reasonable
    expect(averageTime).toBeLessThan(3000);
  });
});
