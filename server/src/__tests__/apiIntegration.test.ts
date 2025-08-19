/**
 * API Integration Tests
 * Tests for external API integration components
 */

import { RateLimitService } from '../services/RateLimitService';
import { ApiKeyManager } from '../utils/apiKeyManager';
import { ApiCacheService } from '../services/ApiCacheService';
import {
  ExternalApiError,
  RateLimitError,
  CircuitBreakerError,
  CircuitBreaker,
  RetryManager,
  isRetryableError,
  getRetryDelay,
} from '../middleware/apiErrorHandler';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RateLimitService', () => {
  let rateLimiter: RateLimitService;

  beforeEach(() => {
    rateLimiter = new RateLimitService('test-service', {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within limits', async () => {
      await expect(rateLimiter.checkLimit()).resolves.not.toThrow();
    });

    it('should track different keys separately', async () => {
      await expect(rateLimiter.checkLimit('key1')).resolves.not.toThrow();
      await expect(rateLimiter.checkLimit('key2')).resolves.not.toThrow();
    });

    it('should provide rate limit status', async () => {
      const status = await rateLimiter.getStatus();

      expect(status).toHaveProperty('minute');
      expect(status).toHaveProperty('hour');
      expect(status.minute).toHaveProperty('remainingPoints');
      expect(status.minute).toHaveProperty('msBeforeNext');
      expect(status.minute).toHaveProperty('totalHits');
    });

    it('should check if request can be made', async () => {
      const canMake = await rateLimiter.canMakeRequest();
      expect(canMake).toBe(true);
    });

    it('should reset rate limits', async () => {
      await rateLimiter.reset();
      const status = await rateLimiter.getStatus();
      expect(status.minute.totalHits).toBe(0);
    });

    it('should update configuration', () => {
      rateLimiter.updateConfig({ requestsPerMinute: 20 });
      const stats = rateLimiter.getStats();
      expect(stats.config.requestsPerMinute).toBe(20);
    });
  });
});

describe('ApiKeyManager', () => {
  let keyManager: ApiKeyManager;
  const testKeys = [
    'test-key-12345678',
    'test-key-87654321',
    'test-key-11223344',
  ];

  beforeEach(() => {
    keyManager = new ApiKeyManager(testKeys, 3, 5);
  });

  describe('constructor', () => {
    it('should initialize with provided keys', () => {
      const stats = keyManager.getStats();
      expect(stats.totalKeys).toBe(3);
      expect(stats.activeKeys).toBe(3);
    });

    it('should throw error with no keys', () => {
      expect(() => new ApiKeyManager([])).toThrow(
        'At least one API key must be provided'
      );
    });

    it('should filter out demo keys in production', () => {
      const keysWithDemo = ['demo-key-1', 'real-key-12345678', 'demo-key-2'];
      const manager = new ApiKeyManager(keysWithDemo);
      const stats = manager.getStats();
      expect(stats.totalKeys).toBe(1); // Only real-key-12345678 should remain
    });
  });

  describe('getCurrentKey', () => {
    it('should return current active key', () => {
      const key = keyManager.getCurrentKey();
      expect(testKeys).toContain(key);
    });

    it('should update last used timestamp', () => {
      const key = keyManager.getCurrentKey();
      const statuses = keyManager.getKeyStatuses();
      const keyStatus = statuses.find(s => s.key.includes(key.substring(0, 4)));
      expect(keyStatus?.lastUsed).toBeTruthy();
    });
  });

  describe('rotateKey', () => {
    it('should rotate to next available key', () => {
      const firstKey = keyManager.getCurrentKey();
      const secondKey = keyManager.rotateKey();
      expect(secondKey).not.toBe(firstKey);
    });

    it('should record rate limit hit', () => {
      const initialKey = keyManager.getCurrentKey();
      keyManager.rotateKey();

      const statuses = keyManager.getKeyStatuses();
      const keyStatus = statuses.find(s =>
        s.key.includes(initialKey.substring(0, 4))
      );
      expect(keyStatus?.rateLimitHits).toBeGreaterThan(0);
    });
  });

  describe('recordError', () => {
    it('should increment error count', () => {
      keyManager.recordError('Test error');

      const statuses = keyManager.getKeyStatuses();
      const currentKeyStatus = statuses[0];
      expect(currentKeyStatus?.errorCount).toBeGreaterThan(0);
      expect(currentKeyStatus?.lastError).toBe('Test error');
    });

    it('should disable key after max errors', () => {
      // Record max errors + 1
      for (let i = 0; i <= 5; i++) {
        keyManager.recordError(`Error ${i}`);
      }

      const statuses = keyManager.getKeyStatuses();
      const currentKeyStatus = statuses[0];
      expect(currentKeyStatus?.isActive).toBe(false);
    });
  });

  describe('recordSuccess', () => {
    it('should reset error count on success', () => {
      keyManager.recordError('Test error');
      keyManager.recordSuccess();

      const statuses = keyManager.getKeyStatuses();
      const currentKeyStatus = statuses[0];
      expect(currentKeyStatus?.errorCount).toBe(0);
      expect(currentKeyStatus?.lastError).toBeNull();
    });

    it('should improve health score', () => {
      const initialStatuses = keyManager.getKeyStatuses();
      const initialScore = initialStatuses[0]?.healthScore ?? 0;

      keyManager.recordSuccess();

      const updatedStatuses = keyManager.getKeyStatuses();
      const updatedScore = updatedStatuses[0]?.healthScore ?? 0;
      expect(updatedScore).toBeGreaterThanOrEqual(initialScore);
    });
  });

  describe('key management', () => {
    it('should manually disable key', () => {
      const key = keyManager.getCurrentKey();
      keyManager.disableKey(key);

      const statuses = keyManager.getKeyStatuses();
      const keyStatus = statuses.find(s => s.key.includes(key.substring(0, 4)));
      expect(keyStatus?.isActive).toBe(false);
    });

    it('should manually enable key', () => {
      const key = keyManager.getCurrentKey();
      keyManager.disableKey(key);
      keyManager.enableKey(key);

      const statuses = keyManager.getKeyStatuses();
      const keyStatus = statuses.find(s => s.key.includes(key.substring(0, 4)));
      expect(keyStatus?.isActive).toBe(true);
      expect(keyStatus?.healthScore).toBe(100);
    });
  });
});

describe('ApiCacheService', () => {
  let cacheService: ApiCacheService;
  let mockCacheService: {
    get: any;
    set: any;
    delete: any;
    deletePattern: any;
    getKeys: any;
  };

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn().mockResolvedValue(0),
      getKeys: jest.fn().mockResolvedValue([]),
    } as any;

    cacheService = new ApiCacheService(mockCacheService as any);
  });

  describe('getOrFetch', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        data: 'test',
        timestamp: Date.now(),
        ttl: 3600,
        tags: [],
        compressed: false,
        size: 10,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const fetchFunction = jest.fn().mockResolvedValue('fresh data');
      const result = await cacheService.getOrFetch('test-key', fetchFunction);

      expect(result).toBe('test');
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should fetch and cache data when not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const fetchFunction = jest.fn().mockResolvedValue('fresh data');
      const result = await cacheService.getOrFetch('test-key', fetchFunction);

      expect(result).toBe('fresh data');
      expect(fetchFunction).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle expired cache entries', async () => {
      const expiredData = {
        data: 'test',
        timestamp: Date.now() - 7200000, // 2 hours ago
        ttl: 3600, // 1 hour TTL
        tags: [],
        compressed: false,
        size: 10,
      };
      mockCacheService.get.mockResolvedValue(expiredData);
      mockCacheService.delete.mockResolvedValue(undefined);
      mockCacheService.set.mockResolvedValue(undefined);

      const fetchFunction = jest.fn().mockResolvedValue('fresh data');
      const result = await cacheService.getOrFetch('test-key', fetchFunction);

      expect(result).toBe('fresh data');
      expect(fetchFunction).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalled();
    });
  });

  describe('cache operations', () => {
    it('should set data with options', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      await cacheService.set('test-key', 'test data', {
        ttl: 1800,
        tags: ['tag1'],
      });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'api:test-key',
        expect.objectContaining({
          data: 'test data',
          ttl: 1800,
          tags: ['tag1'],
        }),
        1800
      );
    });

    it('should delete data', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await cacheService.delete('test-key');

      expect(mockCacheService.delete).toHaveBeenCalledWith('api:test-key');
    });

    it('should invalidate by pattern', async () => {
      mockCacheService.deletePattern.mockResolvedValue(5);

      const deletedCount = await cacheService.invalidate('test:*');

      expect(deletedCount).toBe(5);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('test:*');
    });
  });

  describe('cache warming', () => {
    it('should warm cache with data', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      const fetchFunction = jest.fn().mockResolvedValue('warmed data');

      await cacheService.warmCache('warm-key', fetchFunction, { ttl: 3600 });

      expect(fetchFunction).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should stop warming for specific key', () => {
      cacheService.stopWarming('warm-key');
      // Should not throw error
    });

    it('should stop all warming tasks', () => {
      cacheService.stopAllWarming();
      // Should not throw error
    });
  });

  describe('statistics', () => {
    it('should return cache statistics', () => {
      const stats = cacheService.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should reset statistics', () => {
      cacheService.resetStats();
      const stats = cacheService.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });

    it('should return health status', async () => {
      const health = await cacheService.getHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('hitRate');
      expect(health).toHaveProperty('keyCount');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

describe('Error Handling', () => {
  describe('ExternalApiError', () => {
    it('should create error with correct properties', () => {
      const error = new ExternalApiError(
        'Test error',
        500,
        'test-api',
        'corr-123',
        true,
        false
      );

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.source).toBe('test-api');
      expect(error.correlationId).toBe('corr-123');
      expect(error.retryable).toBe(true);
      expect(error.rateLimited).toBe(false);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError(
        'Rate limited',
        'test-api',
        60,
        'corr-123'
      );

      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.rateLimited).toBe(true);
      expect(error.retryable).toBe(true);
    });
  });

  describe('CircuitBreakerError', () => {
    it('should create circuit breaker error', () => {
      const error = new CircuitBreakerError(
        'Circuit open',
        'test-api',
        'open',
        'corr-123'
      );

      expect(error.statusCode).toBe(503);
      expect(error.circuitState).toBe('open');
      expect(error.retryable).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable network errors', () => {
      const networkError = Object.assign(new Error('Network error'), {
        code: 'ECONNRESET',
      });
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should identify retryable HTTP status codes', () => {
      const httpError = Object.assign(new Error('HTTP error'), {
        response: { status: 503 },
      });
      expect(isRetryableError(httpError)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const clientError = Object.assign(new Error('Client error'), {
        response: { status: 400 },
      });
      expect(isRetryableError(clientError)).toBe(false);
    });

    it('should identify retryable custom errors', () => {
      const customError = new ExternalApiError(
        'Test',
        500,
        'test',
        undefined,
        true
      );
      expect(isRetryableError(customError)).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('should extract delay from Retry-After header', () => {
      const error = Object.assign(new Error('Retry error'), {
        response: { headers: { 'retry-after': '30' } },
      });
      expect(getRetryDelay(error)).toBe(30000);
    });

    it('should use default delay for rate limiting', () => {
      const error = Object.assign(new Error('Rate limit error'), {
        response: { status: 429, headers: {} },
      });
      expect(getRetryDelay(error)).toBe(60000);
    });

    it('should use default delay for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(getRetryDelay(error)).toBe(1000);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service', 3, 1000);
  });

  describe('execute', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {
          // Expected failures
        }
      }

      const state = circuitBreaker.getState();
      expect(state.state).toBe('open');
      expect(state.failureCount).toBe(3);
    });

    it('should throw CircuitBreakerError when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {
          // Expected failures
        }
      }

      // Next call should throw CircuitBreakerError
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        CircuitBreakerError
      );
    });

    it('should reset circuit on successful operation', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValue('success');

      // One failure
      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Expected failure
      }

      // Success should reset
      await circuitBreaker.execute(operation);

      const state = circuitBreaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
    });
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager(3, 100, 1000, 2);
  });

  describe('execute', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('failure 1'))
        .mockRejectedValueOnce(new Error('failure 2'))
        .mockResolvedValue('success');

      const result = await retryManager.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error('persistent failure'));

      await expect(retryManager.execute(operation)).rejects.toThrow(
        'persistent failure'
      );
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should respect shouldRetry function', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('non-retryable'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        retryManager.execute(operation, shouldRetry)
      ).rejects.toThrow('non-retryable');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
