import { cacheService } from '../services/CacheService';
import { MemoryCacheService } from '../services/MemoryCacheService';

describe('Cache Service', () => {
  // Cache service is initialized in testSetup.ts

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache values', async () => {
      const key = 'test:key';
      const value = { message: 'Hello, World!', number: 42 };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should set cache with TTL', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';

      await cacheService.set(key, value, 1); // 1 second TTL
      
      // Should exist immediately
      const exists = await cacheService.exists(key);
      expect(exists).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const expired = await cacheService.get(key);
      expect(expired).toBeNull();
    });

    it('should delete cache values', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      await cacheService.set(key, value);
      
      const existsBefore = await cacheService.exists(key);
      expect(existsBefore).toBe(true);

      const deleted = await cacheService.delete(key);
      expect(deleted).toBe(true);

      const existsAfter = await cacheService.exists(key);
      expect(existsAfter).toBe(false);
    });

    it('should check if keys exist', async () => {
      const key = 'test:exists';
      
      const existsBefore = await cacheService.exists(key);
      expect(existsBefore).toBe(false);

      await cacheService.set(key, 'exists');
      
      const existsAfter = await cacheService.exists(key);
      expect(existsAfter).toBe(true);
    });

    it('should get TTL for keys', async () => {
      const key = 'test:ttl-check';
      
      await cacheService.set(key, 'value', 60); // 60 seconds
      
      const ttl = await cacheService.ttl(key);
      expect(ttl).toBeGreaterThan(50);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should set expiry for existing keys', async () => {
      const key = 'test:expire';
      
      await cacheService.set(key, 'value');
      
      const success = await cacheService.expire(key, 30);
      expect(success).toBe(true);
      
      const ttl = await cacheService.ttl(key);
      expect(ttl).toBeGreaterThan(25);
      expect(ttl).toBeLessThanOrEqual(30);
    });
  });

  describe('Pattern Operations', () => {
    beforeEach(async () => {
      // Set up test data
      await cacheService.set('user:1:profile', { name: 'John' });
      await cacheService.set('user:2:profile', { name: 'Jane' });
      await cacheService.set('user:1:settings', { theme: 'dark' });
      await cacheService.set('product:1:info', { name: 'Widget' });
    });

    it('should get keys by pattern', async () => {
      const userKeys = await cacheService.keys('user:*');
      expect(userKeys).toHaveLength(3);
      expect(userKeys).toContain('user:1:profile');
      expect(userKeys).toContain('user:2:profile');
      expect(userKeys).toContain('user:1:settings');
    });

    it('should delete keys by pattern', async () => {
      const deleted = await cacheService.deletePattern('user:*:profile');
      expect(deleted).toBe(2);

      const remainingKeys = await cacheService.keys('user:*');
      expect(remainingKeys).toHaveLength(1);
      expect(remainingKeys[0]).toBe('user:1:settings');
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', async () => {
      // Add some test data
      await cacheService.set('stats:test1', 'value1');
      await cacheService.set('stats:test2', 'value2');
      await cacheService.get('stats:test1'); // Hit
      await cacheService.get('nonexistent'); // Miss

      const stats = await cacheService.getStats();
      
      expect(stats).toHaveProperty('memory');
      expect(stats.memory.available).toBe(true);
      expect(stats.memory.stats).toHaveProperty('hits');
      expect(stats.memory.stats).toHaveProperty('misses');
      expect(stats.memory.stats).toHaveProperty('sets');
      expect(stats.memory.stats).toHaveProperty('itemCount');
    });

    it('should provide health check', async () => {
      const health = await cacheService.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Data Types', () => {
    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', value: 'Hello World' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'array', value: [1, 2, 3, 'four'] },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'null', value: null },
      ];

      // Set all values
      for (const testCase of testCases) {
        await cacheService.set(testCase.key, testCase.value);
      }

      // Retrieve and verify all values
      for (const testCase of testCases) {
        const retrieved = await cacheService.get(testCase.key);
        expect(retrieved).toEqual(testCase.value);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent key operations gracefully', async () => {
      const nonExistentKey = 'does:not:exist';
      
      const value = await cacheService.get(nonExistentKey);
      expect(value).toBeNull();
      
      const exists = await cacheService.exists(nonExistentKey);
      expect(exists).toBe(false);
      
      const deleted = await cacheService.delete(nonExistentKey);
      expect(deleted).toBe(false);
      
      const ttl = await cacheService.ttl(nonExistentKey);
      expect(ttl).toBe(-2); // Key doesn't exist
    });
  });
});

describe('Memory Cache Service', () => {
  let memoryCache: MemoryCacheService;

  beforeEach(() => {
    memoryCache = new MemoryCacheService(1024 * 1024); // 1MB for testing
  });

  afterEach(() => {
    memoryCache.destroy();
  });

  describe('Memory Management', () => {
    it('should evict items when memory limit is reached', async () => {
      // Create a large value that will trigger eviction
      const largeValue = 'x'.repeat(500 * 1024); // 500KB

      // Fill cache with items
      await memoryCache.set('item1', largeValue);
      await memoryCache.set('item2', largeValue);
      
      // This should trigger eviction of item1
      await memoryCache.set('item3', largeValue);

      const stats = memoryCache.getStats();
      expect(stats.itemCount).toBeLessThanOrEqual(2);
    });

    it('should clean up expired items', async () => {
      await memoryCache.set('expires1', 'value1', 1);
      await memoryCache.set('expires2', 'value2', 1);
      await memoryCache.set('persistent', 'value3'); // No TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Access expired items to trigger cleanup
      await memoryCache.get('expires1');
      await memoryCache.get('expires2');
      await memoryCache.get('persistent');

      const stats = memoryCache.getStats();
      expect(stats.itemCount).toBe(1);
    });

    it('should provide accurate statistics', async () => {
      await memoryCache.set('test1', 'value1');
      await memoryCache.set('test2', 'value2');
      
      await memoryCache.get('test1'); // Hit
      await memoryCache.get('nonexistent'); // Miss
      
      await memoryCache.delete('test2');

      const stats = memoryCache.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
      expect(stats.itemCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('TTL Management', () => {
    it('should handle TTL correctly', async () => {
      await memoryCache.set('ttl-test', 'value', 2);
      
      // Should exist initially
      let ttl = await memoryCache.ttl('ttl-test');
      expect(ttl).toBeGreaterThan(1);
      expect(ttl).toBeLessThanOrEqual(2);
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      ttl = await memoryCache.ttl('ttl-test');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      ttl = await memoryCache.ttl('ttl-test');
      expect(ttl).toBe(-2); // Key expired
    });

    it('should update TTL with expire method', async () => {
      await memoryCache.set('expire-test', 'value');
      
      const success = await memoryCache.expire('expire-test', 5);
      expect(success).toBe(true);
      
      const ttl = await memoryCache.ttl('expire-test');
      expect(ttl).toBeGreaterThan(4);
      expect(ttl).toBeLessThanOrEqual(5);
    });
  });
});