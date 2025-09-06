import { CacheService } from '../../services/CacheService';

// Mock Redis
const mockRedisInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();

    cacheService = new CacheService({
      redis: { url: 'redis://localhost:6379' },
      memory: { maxSize: 100, ttl: 300 },
    });
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('get', () => {
    it('should get value from Redis cache', async () => {
      const testValue = { test: 'data' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(testValue));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testValue);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('should fallback to memory cache when Redis fails', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

      // Set value in memory cache first
      await cacheService.set('test-key', { test: 'data' }, 300);

      const result = await cacheService.get('test-key');

      expect(result).toEqual({ test: 'data' });
    });

    it('should return null for cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should handle expired memory cache items', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      // Set item with very short TTL
      await cacheService.set('test-key', { test: 'data' }, 0.001);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in both Redis and memory cache', async () => {
      const testValue = { test: 'data' };
      const ttl = 300;

      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheService.set('test-key', testValue, ttl);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        ttl,
        JSON.stringify(testValue)
      );

      // Verify memory cache
      mockRedisInstance.get.mockRejectedValue(new Error('Redis down'));
      const result = await cacheService.get('test-key');
      expect(result).toEqual(testValue);
    });

    it('should use memory cache when Redis fails', async () => {
      const testValue = { test: 'data' };
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'));

      await cacheService.set('test-key', testValue, 300);

      // Should still be available in memory cache
      mockRedisInstance.get.mockResolvedValue(null);
      const result = await cacheService.get('test-key');
      expect(result).toEqual(testValue);
    });

    it('should evict old items when memory cache is full', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue(null);

      // Fill cache beyond max size
      for (let i = 0; i < 105; i++) {
        await cacheService.set(`key-${i}`, { value: i }, 300);
      }

      // First items should be evicted
      const result = await cacheService.get('key-0');
      expect(result).toBeNull();

      // Recent items should still exist
      const recentResult = await cacheService.get('key-104');
      expect(recentResult).toEqual({ value: 104 });
    });
  });

  describe('del', () => {
    it('should delete from both Redis and memory cache', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await cacheService.del('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis deletion errors gracefully', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.del('test-key')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should check existence in Redis first', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedisInstance.exists).toHaveBeenCalledWith('test-key');
    });

    it('should fallback to memory cache when Redis fails', async () => {
      mockRedisInstance.exists.mockRejectedValue(new Error('Redis error'));

      // Set in memory cache
      await cacheService.set('test-key', { test: 'data' }, 300);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent-key');

      expect(result).toBe(false);
    });
  });

  describe('flush', () => {
    it('should flush both Redis and memory cache', async () => {
      mockRedisInstance.flushdb.mockResolvedValue('OK');

      await cacheService.flush();

      expect(mockRedisInstance.flushdb).toHaveBeenCalled();
    });

    it('should handle Redis flush errors gracefully', async () => {
      mockRedisInstance.flushdb.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.flush()).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedisInstance.info.mockResolvedValue(
        'db0:keys=5,expires=2,avg_ttl=300'
      );

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        redis: { connected: true, keyCount: 5 },
        memory: { keyCount: 0, maxSize: 100 },
      });
    });

    it('should handle Redis stats errors', async () => {
      mockRedisInstance.info.mockRejectedValue(new Error('Redis error'));

      const stats = await cacheService.getStats();

      expect(stats.redis.connected).toBe(false);
      expect(stats.memory).toEqual({ keyCount: 0, maxSize: 100 });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Redis is up', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.redis.status).toBe('up');
      expect(health.redis.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.memory.status).toBe('up');
    });

    it('should return degraded status when Redis is down', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis error'));

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.redis.status).toBe('down');
      expect(health.memory.status).toBe('up');
    });
  });

  describe('memory-only mode', () => {
    it('should work without Redis configuration', async () => {
      const memoryOnlyCache = new CacheService({
        memory: { maxSize: 50, ttl: 300 },
      });

      await memoryOnlyCache.set('test-key', { test: 'data' }, 300);
      const result = await memoryOnlyCache.get('test-key');

      expect(result).toEqual({ test: 'data' });

      const health = await memoryOnlyCache.healthCheck();
      expect(health.status).toBe('degraded');
      expect(health.redis.status).toBe('down');

      await memoryOnlyCache.disconnect();
    });
  });

  describe('cleanup', () => {
    it('should clean up expired memory cache items', async () => {
      // Mock timer functions
      jest.useFakeTimers();

      const shortTtlCache = new CacheService({
        memory: { maxSize: 100, ttl: 1 }, // 1 second TTL
      });

      await shortTtlCache.set('test-key', { test: 'data' }, 1);

      // Fast-forward time to trigger cleanup
      jest.advanceTimersByTime(61000); // 61 seconds

      const result = await shortTtlCache.get('test-key');
      expect(result).toBeNull();

      await shortTtlCache.disconnect();
      jest.useRealTimers();
    });
  });
});
