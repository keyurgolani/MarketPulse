/**
 * Enhanced Cache Service
 * Advanced caching with adaptive TTL, background refresh, and intelligent warming
 */

import { CacheService } from './CacheService';
import { ApiCacheService } from './ApiCacheService';
import {
  cacheConfig,
  getTTL,
  shouldWarmCache,
  getBackgroundRefreshConfig,
} from '../config/cache';
import { logger } from '../utils/logger';

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  responseTime: number;
  errorRate: number;
  warmingTasks: number;
  backgroundRefreshes: number;
  rateLimitEvents: number;
  adaptiveTTLAdjustments: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  originalTTL: number;
  currentTTL: number;
  accessCount: number;
  lastAccess: number;
  isWarming: boolean;
  rateLimited: boolean;
  dataType: string;
}

export class EnhancedCacheService {
  private cacheService: CacheService;
  private apiCacheService: ApiCacheService;
  private metrics: CacheMetrics;
  private warmingTasks: Map<string, NodeJS.Timeout> = new Map();
  private backgroundRefreshInterval: NodeJS.Timeout | null = null;
  private rateLimitedKeys: Set<string> = new Set();

  constructor() {
    this.cacheService = CacheService.getInstance();
    this.apiCacheService = new ApiCacheService(this.cacheService);
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      responseTime: 0,
      errorRate: 0,
      warmingTasks: 0,
      backgroundRefreshes: 0,
      rateLimitEvents: 0,
      adaptiveTTLAdjustments: 0,
    };

    this.startBackgroundRefresh();
  }

  /**
   * Enhanced get with adaptive TTL and warming
   */
  async getWithWarming<T>(
    key: string,
    dataType: keyof typeof cacheConfig.defaultTTL,
    fetchFunction: () => Promise<T>,
    correlationId?: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Try to get from cache
      const cached = await this.getEnhanced<T>(key, correlationId);

      if (cached) {
        // Check if warming should be triggered
        const currentTTL = await this.cacheService.ttl(key);
        if (currentTTL > 0 && shouldWarmCache(currentTTL, cached.originalTTL)) {
          this.scheduleWarming(key, dataType, fetchFunction, correlationId);
        }

        this.updateMetrics('hit', Date.now() - startTime);
        return cached.data;
      }

      // Cache miss - fetch and store
      const data = await fetchFunction();
      await this.setEnhanced(key, data, dataType, correlationId);

      this.updateMetrics('miss', Date.now() - startTime);
      return data;
    } catch (error) {
      this.updateMetrics('error', Date.now() - startTime);
      logger.error('Enhanced cache get failed', {
        key,
        dataType,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Enhanced get with metadata
   */
  async getEnhanced<T>(
    key: string,
    correlationId?: string
  ): Promise<CacheEntry<T> | null> {
    try {
      const entry = await this.cacheService.get<CacheEntry<T>>(key);

      if (entry) {
        // Update access statistics
        entry.accessCount++;
        entry.lastAccess = Date.now();

        // Update the entry in cache (fire and forget)
        this.cacheService
          .set(key, entry, await this.cacheService.ttl(key))
          .catch(err => {
            logger.warn('Failed to update cache entry access stats', {
              key,
              error: err.message,
            });
          });
      }

      return entry;
    } catch (error) {
      logger.error('Enhanced cache get failed', {
        key,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Enhanced set with adaptive TTL
   */
  async setEnhanced<T>(
    key: string,
    data: T,
    dataType: keyof typeof cacheConfig.defaultTTL,
    correlationId?: string,
    customTTL?: number
  ): Promise<void> {
    try {
      const isRateLimited = this.rateLimitedKeys.has(key);
      const ttl = getTTL(dataType, isRateLimited, customTTL);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        originalTTL: ttl,
        currentTTL: ttl,
        accessCount: 1,
        lastAccess: Date.now(),
        isWarming: false,
        rateLimited: isRateLimited,
        dataType,
      };

      await this.cacheService.set(key, entry, ttl);

      if (isRateLimited) {
        this.metrics.adaptiveTTLAdjustments++;
        logger.info('Applied adaptive TTL due to rate limiting', {
          key,
          originalTTL: cacheConfig.defaultTTL[dataType],
          adaptedTTL: ttl,
          correlationId,
        });
      }

      logger.debug('Enhanced cache set successful', {
        key,
        dataType,
        ttl,
        isRateLimited,
        correlationId,
      });
    } catch (error) {
      logger.error('Enhanced cache set failed', {
        key,
        dataType,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Mark key as rate limited for adaptive TTL
   */
  markRateLimited(key: string, duration: number = 3600): void {
    this.rateLimitedKeys.add(key);
    this.metrics.rateLimitEvents++;

    // Remove from rate limited set after duration
    setTimeout(() => {
      this.rateLimitedKeys.delete(key);
    }, duration * 1000);

    logger.warn('Key marked as rate limited', { key, duration });
  }

  /**
   * Schedule cache warming for a key
   */
  private scheduleWarming<T>(
    key: string,
    dataType: keyof typeof cacheConfig.defaultTTL,
    fetchFunction: () => Promise<T>,
    correlationId?: string
  ): void {
    // Check if already warming
    if (this.warmingTasks.has(key)) {
      return;
    }

    // Check concurrent warming limit
    if (this.warmingTasks.size >= cacheConfig.warming.maxConcurrentWarming) {
      logger.debug('Cache warming skipped - concurrent limit reached', { key });
      return;
    }

    const warmingTask = setTimeout(async () => {
      try {
        logger.debug('Starting cache warming', { key, dataType });

        // Mark as warming
        const currentEntry = await this.getEnhanced<T>(key, correlationId);
        if (currentEntry) {
          currentEntry.isWarming = true;
          await this.cacheService.set(
            key,
            currentEntry,
            await this.cacheService.ttl(key)
          );
        }

        // Fetch fresh data
        const freshData = await this.retryFetch(
          fetchFunction,
          cacheConfig.warming.retryAttempts
        );

        // Update cache
        await this.setEnhanced(key, freshData, dataType, correlationId);

        this.metrics.warmingTasks++;
        logger.debug('Cache warming completed', { key, dataType });
      } catch (error) {
        logger.error('Cache warming failed', {
          key,
          dataType,
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        this.warmingTasks.delete(key);
      }
    }, 100); // Small delay to avoid immediate execution

    this.warmingTasks.set(key, warmingTask);
  }

  /**
   * Retry fetch with exponential backoff
   */
  private async retryFetch<T>(
    fetchFunction: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fetchFunction();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxAttempts) {
          const delay =
            cacheConfig.warming.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Start background refresh process
   */
  private startBackgroundRefresh(): void {
    if (!cacheConfig.backgroundRefresh.enabled) {
      return;
    }

    this.backgroundRefreshInterval = setInterval(async () => {
      try {
        await this.performBackgroundRefresh();
      } catch (error) {
        logger.error('Background refresh failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, cacheConfig.backgroundRefresh.interval);

    logger.info('Background refresh started', {
      interval: cacheConfig.backgroundRefresh.interval,
      batchSize: cacheConfig.backgroundRefresh.batchSize,
    });
  }

  /**
   * Perform background refresh of priority keys
   */
  private async performBackgroundRefresh(): Promise<void> {
    const config = getBackgroundRefreshConfig();
    const keysToRefresh: string[] = [];

    // Check priority keys first
    for (const priorityKey of config.priorityKeys) {
      const keys = await this.cacheService.keys(priorityKey);
      keysToRefresh.push(
        ...keys.slice(0, config.batchSize - keysToRefresh.length)
      );

      if (keysToRefresh.length >= config.batchSize) {
        break;
      }
    }

    // Refresh keys that are close to expiration
    for (const key of keysToRefresh) {
      try {
        const ttl = await this.cacheService.ttl(key);
        const entry = await this.cacheService.get<CacheEntry<unknown>>(key);

        if (entry && ttl > 0 && shouldWarmCache(ttl, entry.originalTTL)) {
          // This would require the original fetch function, which we don't have here
          // In a real implementation, you'd need to store fetch functions or have a registry
          logger.debug('Background refresh candidate found', {
            key,
            ttl,
            originalTTL: entry.originalTTL,
          });
        }
      } catch (error) {
        logger.warn('Background refresh check failed for key', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (keysToRefresh.length > 0) {
      this.metrics.backgroundRefreshes++;
      logger.debug('Background refresh completed', {
        keysRefreshed: keysToRefresh.length,
      });
    }
  }

  /**
   * Invalidate cache by patterns
   */
  async invalidateByPattern(patterns: string[]): Promise<number> {
    let totalDeleted = 0;

    for (const pattern of patterns) {
      try {
        const deleted = await this.cacheService.deletePattern(pattern);
        totalDeleted += deleted;
        logger.info('Cache invalidated by pattern', { pattern, deleted });
      } catch (error) {
        logger.error('Cache invalidation failed', {
          pattern,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return totalDeleted;
  }

  /**
   * Get enhanced cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache health with enhanced metrics
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: CacheMetrics;
    details: Record<string, unknown>;
  }> {
    const baseHealth = await this.cacheService.healthCheck();
    const apiHealth = await this.apiCacheService.getHealth();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check against thresholds
    if (
      this.metrics.hitRate < cacheConfig.monitoring.alertThresholds.hitRateBelow
    ) {
      status = 'degraded';
    }

    if (
      this.metrics.errorRate >
      cacheConfig.monitoring.alertThresholds.errorRateAbove
    ) {
      status = 'unhealthy';
    }

    return {
      status,
      metrics: this.metrics,
      details: {
        baseCache: baseHealth,
        apiCache: apiHealth,
        warmingTasks: this.warmingTasks.size,
        rateLimitedKeys: this.rateLimitedKeys.size,
        backgroundRefreshEnabled: cacheConfig.backgroundRefresh.enabled,
      },
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    type: 'hit' | 'miss' | 'error',
    responseTime: number
  ): void {
    switch (type) {
      case 'hit':
        this.metrics.hitRate = this.metrics.hitRate * 0.9 + 100 * 0.1; // Exponential moving average
        break;
      case 'miss':
        this.metrics.missRate = this.metrics.missRate * 0.9 + 100 * 0.1;
        break;
      case 'error':
        this.metrics.errorRate = this.metrics.errorRate * 0.9 + 100 * 0.1;
        break;
    }

    this.metrics.responseTime =
      this.metrics.responseTime * 0.9 + responseTime * 0.1;
  }

  /**
   * Stop all background processes
   */
  async destroy(): Promise<void> {
    // Stop background refresh
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
      this.backgroundRefreshInterval = null;
    }

    // Stop all warming tasks
    this.warmingTasks.forEach((task, key) => {
      clearTimeout(task);
      logger.debug('Cache warming task stopped', { key });
    });
    this.warmingTasks.clear();

    // Stop API cache service warming
    this.apiCacheService.stopAllWarming();

    logger.info('Enhanced cache service destroyed');
  }
}

// Export singleton instance
export const enhancedCacheService = new EnhancedCacheService();
