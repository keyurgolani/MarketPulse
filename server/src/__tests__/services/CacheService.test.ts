import { CacheService } from '../../services/CacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    cacheService = new CacheService({
      memory: { maxSize: 100, ttl: 300 },
    });

    // Wait a bit for initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('get', () => {
    it('should get value from memory cache', async () => {
      const testValue = { test: 'data' };

      // Set value first
      await cacheService.set('test-key', testValue);

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testValue);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle expired keys', async () => {
      const testValue = { test: 'data' };

      // Set with very short TTL
      await cacheService.set('test-key', testValue, 0.001);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in memory cache', async () => {
      const testValue = { test: 'data' };
      const ttl = 300;

      await cacheService.set('test-key', testValue, ttl);

      // Verify by getting the value back
      const result = await cacheService.get('test-key');
      expect(result).toEqual(testValue);
    });

    it('should evict old items when memory cache is full', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 100; i++) {
        await cacheService.set(`key-${i}`, { value: i });
      }

      // Add one more item to trigger eviction
      await cacheService.set('new-key', { value: 'new' });

      // The new key should exist
      const newResult = await cacheService.get('new-key');
      expect(newResult).toEqual({ value: 'new' });

      // Some old keys should have been evicted
      const stats = await cacheService.getStats();
      expect(stats.memory.keyCount).toBeLessThanOrEqual(100);
    });
  });

  describe('del', () => {
    it('should delete from memory cache', async () => {
      const testValue = { test: 'data' };

      // Set value first
      await cacheService.set('test-key', testValue);

      // Verify it exists
      let result = await cacheService.get('test-key');
      expect(result).toEqual(testValue);

      // Delete it
      await cacheService.del('test-key');

      // Verify it's gone
      result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle deletion of non-existent key', async () => {
      // Should not throw error
      await expect(cacheService.del('non-existent-key')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should check existence in memory cache', async () => {
      const testValue = { test: 'data' };

      // Initially should not exist
      let exists = await cacheService.exists('test-key');
      expect(exists).toBe(false);

      // Set value
      await cacheService.set('test-key', testValue);

      // Now should exist
      exists = await cacheService.exists('test-key');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await cacheService.exists('non-existent-key');
      expect(exists).toBe(false);
    });
  });

  describe('flush', () => {
    it('should flush memory cache', async () => {
      // Set some values
      await cacheService.set('key1', { value: 1 });
      await cacheService.set('key2', { value: 2 });

      // Verify they exist
      expect(await cacheService.exists('key1')).toBe(true);
      expect(await cacheService.exists('key2')).toBe(true);

      // Flush cache
      await cacheService.flush();

      // Verify they're gone
      expect(await cacheService.exists('key1')).toBe(false);
      expect(await cacheService.exists('key2')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // Set some values
      await cacheService.set('key1', { value: 1 });
      await cacheService.set('key2', { value: 2 });

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        redis: { connected: false },
        memory: { keyCount: 2, maxSize: 100 },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for memory-only cache', async () => {
      const health = await cacheService.healthCheck();

      expect(health.status).toBe('degraded'); // degraded because Redis is not available
      expect(health.redis.status).toBe('down');
      expect(health.memory.status).toBe('up');
    });
  });

  describe('TTL and expiration', () => {
    it('should respect TTL settings', async () => {
      const testValue = { test: 'data' };

      // Set with 1 second TTL
      await cacheService.set('test-key', testValue, 1);

      // Should exist immediately
      let result = await cacheService.get('test-key');
      expect(result).toEqual(testValue);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired now
      result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const testValue = { test: 'data' };

      // Set without TTL (should use default 300 seconds)
      await cacheService.set('test-key', testValue);

      // Should exist
      const result = await cacheService.get('test-key');
      expect(result).toEqual(testValue);
    });
  });

  describe('memory management', () => {
    it('should clean up expired items', async () => {
      // Set items with very short TTL
      for (let i = 0; i < 5; i++) {
        await cacheService.set(`key-${i}`, { value: i }, 0.001);
      }

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to get expired items - this should trigger cleanup
      for (let i = 0; i < 5; i++) {
        await cacheService.get(`key-${i}`);
      }

      // Set a new item
      await cacheService.set('new-key', { value: 'new' });

      const stats = await cacheService.getStats();
      // The expired items should be cleaned up when accessed
      expect(stats.memory.keyCount).toBeLessThanOrEqual(1);
    });
  });
});
