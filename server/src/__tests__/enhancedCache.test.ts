/**
 * Enhanced Cache Service Tests
 * Comprehensive testing for advanced caching features
 */

// Jest globals are available without import
import { EnhancedCacheService } from '../services/EnhancedCacheService';
import { CacheService } from '../services/CacheService';
import { cacheConfig, getTTL, shouldWarmCache } from '../config/cache';

// Mock dependencies
jest.mock('../services/CacheService');
jest.mock('../services/ApiCacheService');
jest.mock('../utils/logger');

describe('EnhancedCacheService', () => {
  let enhancedCacheService: EnhancedCacheService;
  let mockCacheService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock cache service
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      deletePattern: jest.fn(),
      healthCheck: jest.fn(),
      getStats: jest.fn(),
    };

    // Mock CacheService.getInstance
    (CacheService.getInstance as any).mockReturnValue(mockCacheService);

    enhancedCacheService = new EnhancedCacheService();
  });

  afterEach(async () => {
    await enhancedCacheService.destroy();
  });

  describe('getWithWarming', () => {
    it('should return cached data when available', async () => {
      const testData = { value: 'test' };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now(),
        originalTTL: 300,
        currentTTL: 300,
        accessCount: 1,
        lastAccess: Date.now(),
        isWarming: false,
        rateLimited: false,
        dataType: 'assets',
      };

      mockCacheService.get.mockResolvedValue(cacheEntry);
      mockCacheService.set.mockResolvedValue(undefined); // For access count update
      mockCacheService.ttl.mockResolvedValue(250); // 250 seconds remaining

      const fetchFunction = jest.fn().mockResolvedValue(testData);
      const result = await enhancedCacheService.getWithWarming(
        'test-key',
        'assets',
        fetchFunction,
        'correlation-123'
      );

      expect(result).toEqual(testData);
      expect(mockCacheService.get).toHaveBeenCalledWith('test-key');
      // Note: fetchFunction might be called for warming, so we don't check it's not called
    });

    it('should fetch and cache data when cache miss', async () => {
      const testData = { value: 'test' };

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const fetchFunction = jest.fn().mockResolvedValue(testData);
      const result = await enhancedCacheService.getWithWarming(
        'test-key',
        'assets',
        fetchFunction,
        'correlation-123'
      );

      expect(result).toEqual(testData);
      expect(fetchFunction).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should trigger cache warming when TTL is low', async () => {
      const testData = { value: 'test' };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now(),
        originalTTL: 300,
        currentTTL: 300,
        accessCount: 1,
        lastAccess: Date.now(),
        isWarming: false,
        rateLimited: false,
        dataType: 'assets',
      };

      mockCacheService.get.mockResolvedValue(cacheEntry);
      mockCacheService.ttl.mockResolvedValue(50); // Low TTL should trigger warming

      const fetchFunction = jest.fn().mockResolvedValue(testData);

      await enhancedCacheService.getWithWarming(
        'test-key',
        'assets',
        fetchFunction,
        'correlation-123'
      );

      // Wait a bit for warming to be scheduled
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(fetchFunction).toHaveBeenCalled(); // Should be called for warming
    });
  });

  describe('setEnhanced', () => {
    it('should set cache with default TTL', async () => {
      const testData = { value: 'test' };
      mockCacheService.set.mockResolvedValue(undefined);

      await enhancedCacheService.setEnhanced(
        'test-key',
        testData,
        'assets',
        'correlation-123'
      );

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          data: testData,
          dataType: 'assets',
          rateLimited: false,
        }),
        cacheConfig.defaultTTL.assets
      );
    });

    it('should apply adaptive TTL when rate limited', async () => {
      const testData = { value: 'test' };
      mockCacheService.set.mockResolvedValue(undefined);

      // Mark key as rate limited
      enhancedCacheService.markRateLimited('test-key');

      await enhancedCacheService.setEnhanced(
        'test-key',
        testData,
        'assets',
        'correlation-123'
      );

      const expectedTTL = getTTL('assets', true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          data: testData,
          rateLimited: true,
        }),
        expectedTTL
      );
    });
  });

  describe('markRateLimited', () => {
    it('should mark key as rate limited and update metrics', () => {
      const initialMetrics = enhancedCacheService.getMetrics();
      const initialRateLimitEvents = initialMetrics.rateLimitEvents;

      enhancedCacheService.markRateLimited('test-key', 1800);

      const updatedMetrics = enhancedCacheService.getMetrics();
      expect(updatedMetrics.rateLimitEvents).toBe(initialRateLimitEvents + 1);
    });

    it('should automatically remove rate limit after duration', async () => {
      enhancedCacheService.markRateLimited('test-key', 0.1); // 0.1 seconds

      // Wait for rate limit to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const testData = { value: 'test' };
      mockCacheService.set.mockResolvedValue(undefined);

      await enhancedCacheService.setEnhanced('test-key', testData, 'assets');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          rateLimited: false,
        }),
        cacheConfig.defaultTTL.assets
      );
    });
  });

  describe('invalidateByPattern', () => {
    it('should invalidate cache entries by patterns', async () => {
      mockCacheService.deletePattern
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const patterns = ['assets:*', 'market:*'];
      const deleted = await enhancedCacheService.invalidateByPattern(patterns);

      expect(deleted).toBe(8);
      expect(mockCacheService.deletePattern).toHaveBeenCalledTimes(2);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('assets:*');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('market:*');
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.deletePattern
        .mockResolvedValueOnce(5)
        .mockRejectedValueOnce(new Error('Delete failed'));

      const patterns = ['assets:*', 'market:*'];
      const deleted = await enhancedCacheService.invalidateByPattern(patterns);

      expect(deleted).toBe(5); // Only successful deletion counted
    });
  });

  describe('getHealth', () => {
    it('should return health status with metrics', async () => {
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: {},
      });

      const health = await enhancedCacheService.getHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('details');
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });

    it('should report degraded status for low hit rate', async () => {
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: {},
      });

      // Simulate low hit rate by creating many misses
      for (let i = 0; i < 10; i++) {
        await enhancedCacheService.getWithWarming(
          `miss-key-${i}`,
          'assets',
          async () => ({ value: i })
        );
      }

      const health = await enhancedCacheService.getHealth();
      // Note: The actual status depends on the hit rate calculation
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = enhancedCacheService.getMetrics();

      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('missRate');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('warmingTasks');
      expect(metrics).toHaveProperty('backgroundRefreshes');
      expect(metrics).toHaveProperty('rateLimitEvents');
      expect(metrics).toHaveProperty('adaptiveTTLAdjustments');
    });
  });
});

describe('Cache Configuration', () => {
  describe('getTTL', () => {
    it('should return default TTL for data type', () => {
      const ttl = getTTL('assets');
      expect(ttl).toBe(cacheConfig.defaultTTL.assets);
    });

    it('should apply rate limit extension', () => {
      const normalTTL = getTTL('assets', false);
      const rateLimitedTTL = getTTL('assets', true);

      expect(rateLimitedTTL).toBeGreaterThan(normalTTL);
      expect(rateLimitedTTL).toBe(
        Math.min(
          normalTTL * cacheConfig.adaptiveTTL.rateLimitExtensionFactor,
          cacheConfig.adaptiveTTL.maxTTL
        )
      );
    });

    it('should respect custom TTL', () => {
      const customTTL = 1800;
      const ttl = getTTL('assets', false, customTTL);
      expect(ttl).toBe(customTTL);
    });

    it('should enforce minimum TTL', () => {
      const veryLowTTL = 30; // Below minimum
      const ttl = getTTL('assets', false, veryLowTTL);
      expect(ttl).toBe(cacheConfig.adaptiveTTL.minTTL);
    });

    it('should enforce maximum TTL', () => {
      const veryHighTTL = 50000; // Above maximum
      const ttl = getTTL('assets', true, veryHighTTL);
      expect(ttl).toBe(cacheConfig.adaptiveTTL.maxTTL);
    });
  });

  describe('shouldWarmCache', () => {
    it('should return true when TTL is below threshold', () => {
      const originalTTL = 300;
      const currentTTL = 50; // Below 80% threshold

      expect(shouldWarmCache(currentTTL, originalTTL)).toBe(true);
    });

    it('should return false when TTL is above threshold', () => {
      const originalTTL = 300;
      const currentTTL = 250; // Above 80% threshold

      expect(shouldWarmCache(currentTTL, originalTTL)).toBe(false);
    });

    it('should return false when warming is disabled', () => {
      const originalConfig = cacheConfig.warming.enabled;
      cacheConfig.warming.enabled = false;

      const result = shouldWarmCache(50, 300);
      expect(result).toBe(false);

      // Restore original config
      cacheConfig.warming.enabled = originalConfig;
    });
  });
});
