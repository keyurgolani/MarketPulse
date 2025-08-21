import request from 'supertest';
import express from 'express';
import {
  rateLimiter,
  generalLimiter,
  apiLimiter,
  strictLimiter,
  RateLimiter,
} from '../middleware/rateLimiter';

// Create test app
const createTestApp = (
  limiter?: express.RequestHandler
): express.Application => {
  const app = express();
  app.use(express.json());

  if (limiter) {
    app.use(limiter);
  } else {
    app.use(rateLimiter);
  }

  app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test endpoint' });
  });

  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'API test endpoint' });
  });

  app.get('/logs/test', (req, res) => {
    res.json({ success: true, message: 'Logs test endpoint' });
  });

  app.get('/system/test', (req, res) => {
    res.json({ success: true, message: 'System test endpoint' });
  });

  return app;
};

describe('Rate Limiter Middleware', () => {
  // Enable rate limiting for tests
  const originalEnv = process.env.TEST_RATE_LIMITING;

  beforeAll(() => {
    process.env.TEST_RATE_LIMITING = 'true';
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.TEST_RATE_LIMITING = originalEnv;
    } else {
      delete process.env.TEST_RATE_LIMITING;
    }

    // Clean up limiter instances
    generalLimiter.destroy();
    apiLimiter.destroy();
    strictLimiter.destroy();
  });

  describe('General Rate Limiting', () => {
    const app = createTestApp();

    it('should allow requests within limit', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('100');
      expect(
        parseInt(response.headers['x-ratelimit-remaining'] as string)
      ).toBeLessThan(100);
      expect(response.headers['x-ratelimit-reset']).toMatch(/^\d+$/);
    });

    it('should apply different limits to different endpoints', async () => {
      // Test general endpoint
      const generalResponse = await request(app).get('/test').expect(200);

      // Small delay to prevent connection issues
      await new Promise(resolve => setTimeout(resolve, 10));

      // Test API endpoint (should have higher limit)
      const apiResponse = await request(app).get('/api/test').expect(200);

      // Small delay to prevent connection issues
      await new Promise(resolve => setTimeout(resolve, 10));

      // Test strict endpoint (should have lower limit)
      const strictResponse = await request(app).get('/logs/test').expect(200);

      expect(generalResponse.headers['x-ratelimit-limit']).toBe('100');
      expect(apiResponse.headers['x-ratelimit-limit']).toBe('1000');
      expect(strictResponse.headers['x-ratelimit-limit']).toBe('10');
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should block requests when limit exceeded', async () => {
      // Create a limiter with very low limit for testing
      const testLimiter = new RateLimiter(1000, 2); // 2 requests per second
      const app = createTestApp(testLimiter.middleware());

      // First request should succeed
      await request(app).get('/test').expect(200);

      // Second request should succeed
      await request(app).get('/test').expect(200);

      // Third request should be rate limited
      const response = await request(app).get('/test').expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Too many requests');
      expect(response.body.retryAfter).toBeDefined();

      testLimiter.destroy();
    });

    it('should reset limit after window expires', async () => {
      // Create a limiter with very short window for testing
      const testLimiter = new RateLimiter(100, 1); // 1 request per 100ms
      const app = createTestApp(testLimiter.middleware());

      // First request should succeed
      await request(app).get('/test').expect(200);

      // Second request should be rate limited
      await request(app).get('/test').expect(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Request should succeed again
      await request(app).get('/test').expect(200);

      testLimiter.destroy();
    }, 15000);
  });

  describe('Rate Limiter Class', () => {
    it('should handle different IPs separately', async () => {
      const testLimiter = new RateLimiter(1000, 1);
      const app = createTestApp(testLimiter.middleware());

      // Request from first IP
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      // Second request from same IP should be limited
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // Request from different IP should succeed
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200);

      testLimiter.destroy();
    });

    it('should clean up expired entries', async () => {
      const testLimiter = new RateLimiter(50, 1);
      const app = createTestApp(testLimiter.middleware());

      // Make request to create entry
      await request(app).get('/test').expect(200);

      // Check that store has entry
      expect(Object.keys(testLimiter.store).length).toBeGreaterThan(0);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger cleanup manually
      testLimiter.cleanup();

      // Store should be cleaned up
      expect(Object.keys(testLimiter.store).length).toBe(0);

      testLimiter.destroy();
    });

    it('should handle missing IP gracefully', async () => {
      const testLimiter = new RateLimiter(1000, 1);
      const app = express();

      // Override the getKey method to simulate missing IP
      const originalGetKey = testLimiter['getKey'];
      testLimiter['getKey'] = (): string => 'unknown';

      app.use(testLimiter.middleware());

      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      // Should still work with 'unknown' key
      await request(app).get('/test').expect(200);

      // Restore original method
      testLimiter['getKey'] = originalGetKey;
      testLimiter.destroy();
    });
  });

  describe('Environment-based Behavior', () => {
    it('should skip rate limiting in test environment when not explicitly enabled', async () => {
      // Temporarily disable test rate limiting
      delete process.env.TEST_RATE_LIMITING;

      const app = createTestApp();

      // Multiple requests should all succeed quickly (no rate limiting)
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(app).get('/test').expect(200));
      }

      // All requests should complete within reasonable time
      await Promise.all(promises);

      // Re-enable for other tests
      process.env.TEST_RATE_LIMITING = 'true';
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Limiter Instance Management', () => {
    it('should properly destroy limiter instances', () => {
      const testLimiter = new RateLimiter(1000, 10);

      // Add some data to store
      testLimiter.store['test'] = { count: 1, resetTime: Date.now() + 1000 };

      expect(Object.keys(testLimiter.store).length).toBe(1);
      expect(testLimiter.cleanupInterval).toBeDefined();

      // Destroy should clean up
      testLimiter.destroy();

      expect(Object.keys(testLimiter.store).length).toBe(0);
    });

    it('should handle concurrent requests correctly', async () => {
      const testLimiter = new RateLimiter(1000, 3);
      const app = createTestApp(testLimiter.middleware());

      // Make concurrent requests
      const promises = Array(5)
        .fill(0)
        .map(() => request(app).get('/test'));

      const responses = await Promise.all(promises);

      // Some should succeed, some should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBe(3);
      expect(rateLimitedCount).toBe(2);

      testLimiter.destroy();
    });
  });

  describe('Header Validation', () => {
    it('should set correct rate limit headers', async () => {
      const testLimiter = new RateLimiter(60000, 10);
      const app = createTestApp(testLimiter.middleware());

      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('10');
      expect(
        parseInt(response.headers['x-ratelimit-remaining'] as string)
      ).toBe(9);
      expect(
        parseInt(response.headers['x-ratelimit-reset'] as string)
      ).toBeGreaterThan(0);

      testLimiter.destroy();
    });

    it('should update remaining count correctly', async () => {
      const testLimiter = new RateLimiter(60000, 5);
      const app = createTestApp(testLimiter.middleware());

      // First request
      let response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('4');

      // Second request
      response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('3');

      testLimiter.destroy();
    });
  });
});
