// Test setup file
import { logger } from '@/utils/logger';

// Suppress logs during testing
logger.silent = true;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.DATABASE_URL = ':memory:';
process.env.LOG_LEVEL = 'error';

// Global test cleanup to prevent hanging processes
afterAll(async () => {
  // Clean up any singleton services that might have timers
  try {
    // Import services dynamically to avoid circular dependencies
    const { CacheService } = await import('@/services/CacheService');
    const { enhancedCacheService } = await import(
      '@/services/EnhancedCacheService'
    );

    // Get instances and destroy them
    const cacheService = CacheService.getInstance();
    if (cacheService && typeof cacheService.destroy === 'function') {
      await cacheService.destroy();
    }

    // Clean up enhanced cache service (singleton instance)
    if (
      enhancedCacheService &&
      typeof enhancedCacheService.destroy === 'function'
    ) {
      await enhancedCacheService.destroy();
    }

    // Clean up rate limiters - they are created as module-level instances
    const rateLimiterModule = await import('@/middleware/rateLimiter');
    if (
      rateLimiterModule.generalLimiter &&
      typeof rateLimiterModule.generalLimiter.destroy === 'function'
    ) {
      rateLimiterModule.generalLimiter.destroy();
    }
    if (
      rateLimiterModule.strictLimiter &&
      typeof rateLimiterModule.strictLimiter.destroy === 'function'
    ) {
      rateLimiterModule.strictLimiter.destroy();
    }
    if (
      rateLimiterModule.apiLimiter &&
      typeof rateLimiterModule.apiLimiter.destroy === 'function'
    ) {
      rateLimiterModule.apiLimiter.destroy();
    }
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn('Test cleanup warning:', error);
  }
});
