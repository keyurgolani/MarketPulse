/**
 * API Cache Service
 * Specialized caching for external API responses with TTL management and cache warming
 */

import { CacheService } from './CacheService';
import { logger } from '../utils/logger';
import { apiLogger } from '../utils/apiLogger';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  totalSize: number;
  keyCount: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  compressed: boolean;
  size: number;
}

export class ApiCacheService {
  private cacheService: CacheService;
  private stats: CacheStats;
  private warmingTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      totalSize: 0,
      keyCount: 0,
    };
  }

  /**
   * Get data from cache with fallback to API call
   */
  async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {},
    correlationId?: string
  ): Promise<T> {
    const cacheKey = this.buildCacheKey(key);

    try {
      // Try to get from cache first
      const cached = await this.get<T>(cacheKey, correlationId);
      if (cached !== null) {
        return cached;
      }

      // Cache miss - fetch from API
      const data = await fetchFunction();

      // Store in cache
      await this.set(cacheKey, data, options, correlationId);

      return data;
    } catch (error) {
      logger.error('Cache get-or-fetch failed', {
        key: cacheKey,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // On cache error, still try to fetch from API
      return await fetchFunction();
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string, correlationId?: string): Promise<T | null> {
    const cacheKey = this.buildCacheKey(key);

    try {
      const entry = await this.cacheService.get<CacheEntry<T>>(cacheKey);

      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();

        if (correlationId) {
          apiLogger.logCache('cache', correlationId, false, cacheKey);
        }

        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        await this.cacheService.delete(cacheKey);
        this.stats.misses++;
        this.updateHitRate();

        if (correlationId) {
          apiLogger.logCache('cache', correlationId, false, cacheKey);
        }

        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      if (correlationId) {
        apiLogger.logCache('cache', correlationId, true, cacheKey);
      }

      return entry.data;
    } catch (error) {
      logger.error('Cache get failed', {
        key: cacheKey,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
    correlationId?: string
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(key);
    const ttl = options.ttl || 3600; // Default 1 hour

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        tags: options.tags || [],
        compressed: options.compress || false,
        size: this.calculateSize(data),
      };

      await this.cacheService.set(cacheKey, entry, ttl);

      this.stats.sets++;
      this.stats.totalSize += entry.size;
      this.stats.keyCount++;

      logger.debug('Cache set successful', {
        key: cacheKey,
        ttl,
        size: entry.size,
        correlationId,
      });
    } catch (error) {
      logger.error('Cache set failed', {
        key: cacheKey,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string, correlationId?: string): Promise<void> {
    const cacheKey = this.buildCacheKey(key);

    try {
      await this.cacheService.delete(cacheKey);
      this.stats.deletes++;
      this.stats.keyCount = Math.max(0, this.stats.keyCount - 1);

      logger.debug('Cache delete successful', {
        key: cacheKey,
        correlationId,
      });
    } catch (error) {
      logger.error('Cache delete failed', {
        key: cacheKey,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  async invalidate(pattern?: string, tags?: string[]): Promise<number> {
    try {
      let deletedCount = 0;

      if (pattern) {
        deletedCount += await this.cacheService.deletePattern(pattern);
      }

      if (tags && tags.length > 0) {
        // For tag-based invalidation, we need to scan all keys
        // This is a simplified implementation - in production, consider using Redis sets for tags
        // Note: Getting all keys not implemented in current CacheService
        // TODO: Implement tag-based invalidation when CacheService supports key enumeration
        /*
        for (const key of keys) {
          const entry = await this.cacheService.get<CacheEntry<any>>(key);
          if (entry && entry.tags.some(tag => tags.includes(tag))) {
            await this.cacheService.delete(key);
            deletedCount++;
          }
        }
        */
      }

      this.stats.deletes += deletedCount;
      this.stats.keyCount = Math.max(0, this.stats.keyCount - deletedCount);

      logger.info('Cache invalidation completed', {
        pattern,
        tags,
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Cache invalidation failed', {
        pattern,
        tags,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Warm cache with data
   */
  async warmCache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(key);

    try {
      // Cancel existing warming task for this key
      const existingTask = this.warmingTasks.get(cacheKey);
      if (existingTask) {
        clearTimeout(existingTask);
      }

      // Fetch and cache data
      const data = await fetchFunction();
      await this.set(cacheKey, data, options);

      // Schedule next warming if TTL is specified
      if (options.ttl && options.ttl > 0) {
        const warmingInterval = Math.max(options.ttl * 0.8 * 1000, 60000); // Warm at 80% of TTL, minimum 1 minute

        const task = setTimeout(async () => {
          try {
            await this.warmCache(key, fetchFunction, options);
          } catch (error) {
            logger.error('Cache warming failed', {
              key: cacheKey,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }, warmingInterval);

        this.warmingTasks.set(cacheKey, task);
      }

      logger.debug('Cache warming completed', {
        key: cacheKey,
        ttl: options.ttl,
      });
    } catch (error) {
      logger.error('Cache warming failed', {
        key: cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Stop cache warming for a specific key
   */
  stopWarming(key: string): void {
    const cacheKey = this.buildCacheKey(key);
    const task = this.warmingTasks.get(cacheKey);

    if (task) {
      clearTimeout(task);
      this.warmingTasks.delete(cacheKey);

      logger.debug('Cache warming stopped', { key: cacheKey });
    }
  }

  /**
   * Stop all cache warming tasks
   */
  stopAllWarming(): void {
    this.warmingTasks.forEach((task, key) => {
      clearTimeout(task);
      logger.debug('Cache warming stopped', { key });
    });

    this.warmingTasks.clear();
    logger.info('All cache warming tasks stopped');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      totalSize: 0,
      keyCount: 0,
    };

    logger.info('Cache statistics reset');
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    hitRate: number;
    keyCount: number;
    totalSize: number;
    warmingTasks: number;
  }> {
    const hitRate = this.stats.hitRate;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (hitRate < 50) {
      status = 'degraded';
    }
    if (hitRate < 20) {
      status = 'unhealthy';
    }

    return {
      status,
      hitRate,
      keyCount: this.stats.keyCount,
      totalSize: this.stats.totalSize,
      warmingTasks: this.warmingTasks.size,
    };
  }

  /**
   * Build cache key with prefix
   */
  private buildCacheKey(key: string): string {
    return `api:${key}`;
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}
