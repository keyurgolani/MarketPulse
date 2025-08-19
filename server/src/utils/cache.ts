import { cacheService } from '../services/CacheService';

/**
 * Cache utility wrapper
 * Provides a simplified interface to the cache service
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await cacheService.get<T>(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await cacheService.set(key, value, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await cacheService.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      await cacheService.deletePattern(pattern);
    } catch (error) {
      console.error('Cache deletePattern error:', error);
    }
  },

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await cacheService.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await cacheService.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },
};
