/**
 * Enhanced Cache Service
 * Implements intelligent client-side caching with request deduplication,
 * performance monitoring, and automatic cache management
 */

import { logger } from '@/utils/logger';
import { localStorageService } from './localStorageService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  etag?: string;
  compressed?: boolean;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  maxEntries: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  cleanupInterval: number;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  entryCount: number;
  averageAccessTime: number;
  compressionRatio: number;
}

export interface RequestDeduplicationEntry {
  promise: Promise<unknown>;
  timestamp: number;
  requestCount: number;
}

export class CacheService {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private requestDeduplication = new Map<string, RequestDeduplicationEntry>();
  private stats: CacheStats = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    totalSize: 0,
    entryCount: 0,
    averageAccessTime: 0,
    compressionRatio: 0,
  };
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      enablePersistence: true,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanupTimer();
    this.loadPersistedCache();
  }

  /**
   * Get data from cache with intelligent fallback
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        this.updateAccessStats(memoryEntry);
        this.stats.totalHits++;
        this.updateHitRate();

        const accessTime = performance.now() - startTime;
        this.updateAverageAccessTime(accessTime);

        logger.debug('Cache hit (memory)', {
          key,
          accessTime,
          accessCount: memoryEntry.accessCount,
        });

        return memoryEntry.data as T;
      }

      // Check persistent cache if enabled
      if (this.config.enablePersistence) {
        const persistedEntry = await localStorageService.get<T>(`cache_${key}`);
        if (persistedEntry && this.isPersistedEntryValid(persistedEntry)) {
          // Restore to memory cache
          const cacheEntry: CacheEntry<T> = {
            data: persistedEntry.data,
            timestamp: persistedEntry.timestamp,
            ttl: this.config.defaultTTL,
            accessCount: 1,
            lastAccessed: Date.now(),
            size: this.calculateSize(persistedEntry.data),
          };

          this.memoryCache.set(key, cacheEntry);
          this.stats.totalHits++;
          this.updateHitRate();

          const accessTime = performance.now() - startTime;
          this.updateAverageAccessTime(accessTime);

          logger.debug('Cache hit (persistent)', {
            key,
            accessTime,
            restored: true,
          });

          return persistedEntry.data;
        }
      }

      // Cache miss
      this.stats.totalMisses++;
      this.updateHitRate();

      const accessTime = performance.now() - startTime;
      this.updateAverageAccessTime(accessTime);

      logger.debug('Cache miss', { key, accessTime });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Set data in cache with intelligent compression and persistence
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    try {
      const size = this.calculateSize(data);
      const timestamp = Date.now();

      // Check if we need to make space
      await this.ensureSpace(size);

      const entry: CacheEntry<T> = {
        data,
        timestamp,
        ttl,
        accessCount: 0,
        lastAccessed: timestamp,
        size,
      };

      // Compress if enabled and data is large enough
      if (
        this.config.enableCompression &&
        size > this.config.compressionThreshold
      ) {
        try {
          const compressed = await this.compressData(data);
          if (compressed.length < size * 0.8) {
            // Only use if 20% smaller
            entry.data = compressed as T;
            entry.compressed = true;
            entry.size = compressed.length;
            this.updateCompressionRatio(size, compressed.length);
          }
        } catch (error) {
          logger.warn('Compression failed, storing uncompressed', {
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Store in memory cache
      this.memoryCache.set(key, entry);
      this.updateCacheStats();

      // Persist if enabled
      if (this.config.enablePersistence) {
        try {
          await localStorageService.set(`cache_${key}`, data, timestamp);
        } catch (error) {
          logger.warn('Failed to persist cache entry', {
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.debug('Cache set', {
        key,
        size: entry.size,
        ttl,
        compressed: entry.compressed,
      });
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Request deduplication - prevents duplicate requests
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if request is already in progress
    const existingRequest = this.requestDeduplication.get(key);
    if (existingRequest) {
      existingRequest.requestCount++;
      logger.debug('Request deduplicated', {
        key,
        requestCount: existingRequest.requestCount,
      });
      return existingRequest.promise as Promise<T>;
    }

    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Create new request
    const promise = requestFn()
      .then(async result => {
        // Cache the result
        await this.set(key, result, ttl);
        // Remove from deduplication map
        this.requestDeduplication.delete(key);
        return result;
      })
      .catch(error => {
        // Remove from deduplication map on error
        this.requestDeduplication.delete(key);
        throw error;
      });

    // Store in deduplication map
    this.requestDeduplication.set(key, {
      promise,
      timestamp: Date.now(),
      requestCount: 1,
    });

    return promise;
  }

  /**
   * Batch get multiple keys
   */
  async getBatch<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    await Promise.all(
      keys.map(async key => {
        const value = await this.get<T>(key);
        results.set(key, value);
      })
    );

    return results;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async setBatch<T>(
    entries: Array<{ key: string; data: T; ttl?: number }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, ttl }) => this.set(key, data, ttl))
    );
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string | RegExp): Promise<number> {
    let invalidatedCount = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Invalidate memory cache
    for (const [key] of this.memoryCache) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidate persistent cache if enabled
    if (this.config.enablePersistence) {
      try {
        const keys = await localStorageService.keys();
        for (const key of keys) {
          if (key.startsWith('cache_') && regex.test(key.substring(6))) {
            await localStorageService.remove(key);
            invalidatedCount++;
          }
        }
      } catch (error) {
        logger.warn('Failed to invalidate persistent cache', {
          pattern: pattern.toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.updateCacheStats();

    logger.info('Cache invalidated', {
      pattern: pattern.toString(),
      invalidatedCount,
    });

    return invalidatedCount;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.requestDeduplication.clear();

    if (this.config.enablePersistence) {
      try {
        const keys = await localStorageService.keys();
        for (const key of keys) {
          if (key.startsWith('cache_')) {
            await localStorageService.remove(key);
          }
        }
      } catch (error) {
        logger.warn('Failed to clear persistent cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.resetStats();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval !== undefined) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }

    logger.info('Cache configuration updated', { newConfig });
  }

  /**
   * Force cleanup of expired entries
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (!this.isEntryValid(entry)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean request deduplication map
    for (const [key, request] of this.requestDeduplication) {
      if (now - request.timestamp > 30000) {
        // 30 seconds timeout
        this.requestDeduplication.delete(key);
      }
    }

    // Clean persistent cache if enabled
    if (this.config.enablePersistence) {
      try {
        const keys = await localStorageService.keys();
        for (const key of keys) {
          if (key.startsWith('cache_')) {
            const entry = await localStorageService.get(key.substring(6));
            if (entry && !this.isPersistedEntryValid(entry)) {
              await localStorageService.remove(key);
              cleanedCount++;
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to cleanup persistent cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.updateCacheStats();

    if (cleanedCount > 0) {
      logger.debug('Cache cleanup completed', { cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Check if persisted entry is valid
   */
  private isPersistedEntryValid(entry: { timestamp: number }): boolean {
    return Date.now() - entry.timestamp < this.config.defaultTTL;
  }

  /**
   * Update access statistics for cache entry
   */
  private updateAccessStats(entry: CacheEntry<unknown>): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Calculate size of data in bytes
   */
  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough estimate for UTF-16
    }
  }

  /**
   * Compress data using built-in compression
   */
  private async compressData(data: unknown): Promise<Uint8Array> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);

    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      const compressionStream = new CompressionStream('gzip');
      const writer = compressionStream.writable.getWriter();
      const reader = compressionStream.readable.getReader();

      writer.write(uint8Array);
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    // Fallback: return original data (no compression)
    return uint8Array;
  }

  /**
   * Ensure there's enough space in cache
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check if we're over limits
    if (
      this.stats.totalSize + requiredSize > this.config.maxSize ||
      this.stats.entryCount >= this.config.maxEntries
    ) {
      await this.evictEntries(requiredSize);
    }
  }

  /**
   * Evict cache entries using LRU strategy
   */
  private async evictEntries(requiredSize: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by last accessed time (LRU)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedSize = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      this.memoryCache.delete(key);
      freedSize += entry.size;
      evictedCount++;

      // Stop when we have enough space
      if (
        freedSize >= requiredSize &&
        this.memoryCache.size < this.config.maxEntries
      ) {
        break;
      }
    }

    this.updateCacheStats();

    logger.debug('Cache entries evicted', {
      evictedCount,
      freedSize,
      requiredSize,
    });
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(): void {
    this.stats.entryCount = this.memoryCache.size;
    this.stats.totalSize = Array.from(this.memoryCache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    this.stats.hitRate =
      this.stats.totalRequests > 0
        ? this.stats.totalHits / this.stats.totalRequests
        : 0;
    this.stats.missRate = 1 - this.stats.hitRate;
  }

  /**
   * Update average access time
   */
  private updateAverageAccessTime(accessTime: number): void {
    const totalTime =
      this.stats.averageAccessTime * (this.stats.totalRequests - 1);
    this.stats.averageAccessTime =
      (totalTime + accessTime) / this.stats.totalRequests;
  }

  /**
   * Update compression ratio
   */
  private updateCompressionRatio(
    originalSize: number,
    compressedSize: number
  ): void {
    const ratio = compressedSize / originalSize;
    this.stats.compressionRatio =
      this.stats.compressionRatio === 0
        ? ratio
        : (this.stats.compressionRatio + ratio) / 2;
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      totalSize: 0,
      entryCount: 0,
      averageAccessTime: 0,
      compressionRatio: 0,
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Scheduled cleanup failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Load persisted cache entries into memory
   */
  private async loadPersistedCache(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      const keys = await localStorageService.keys();
      let loadedCount = 0;

      for (const key of keys) {
        if (key.startsWith('cache_')) {
          const cacheKey = key.substring(6);
          const entry = await localStorageService.get(cacheKey);

          if (entry && this.isPersistedEntryValid(entry)) {
            const cacheEntry: CacheEntry<unknown> = {
              data: entry.data,
              timestamp: entry.timestamp,
              ttl: this.config.defaultTTL,
              accessCount: 0,
              lastAccessed: entry.timestamp,
              size: this.calculateSize(entry.data),
            };

            this.memoryCache.set(cacheKey, cacheEntry);
            loadedCount++;
          }
        }
      }

      this.updateCacheStats();

      if (loadedCount > 0) {
        logger.info('Persisted cache loaded', { loadedCount });
      }
    } catch (error) {
      logger.warn('Failed to load persisted cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Destroy cache service and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.memoryCache.clear();
    this.requestDeduplication.clear();
    this.resetStats();

    logger.info('Cache service destroyed');
  }
}

// Export singleton instance
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  compressionThreshold: 1024, // 1KB
  enableCompression: true,
  enablePersistence: true,
  cleanupInterval: 60 * 1000, // 1 minute
});
