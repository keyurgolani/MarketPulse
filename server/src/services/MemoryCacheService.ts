import { logger } from '@/utils/logger';

export interface CacheItem<T = any> {
  value: T;
  expiry: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  itemCount: number;
  hitRate: number;
}

export class MemoryCacheService {
  private cache = new Map<string, CacheItem>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs = 60000; // 1 minute

  constructor(maxSize: number = 100 * 1024 * 1024) { // 100MB default
    this.maxSize = maxSize;
    this.startCleanupInterval();
    
    logger.info(`Memory cache initialized with max size: ${this.formatBytes(maxSize)}`);
  }

  /**
   * Get value from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  public async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');
    
    // Check if this single item exceeds max size
    if (size > this.maxSize) {
      logger.warn(`Cache item too large: ${key} (${this.formatBytes(size)})`);
      return;
    }

    // Calculate expiry time
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Date.now() + (24 * 60 * 60 * 1000); // Default 24 hours

    // Ensure we have space
    await this.ensureSpace(size);

    // Store the item
    this.cache.set(key, {
      value,
      expiry,
      size,
    });

    this.stats.sets++;
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Set expiry for existing key
   */
  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    item.expiry = Date.now() + (ttlSeconds * 1000);
    return true;
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    
    if (!item) {
      return -2; // Key doesn't exist
    }

    const remaining = item.expiry - Date.now();
    
    if (remaining <= 0) {
      this.cache.delete(key);
      return -2; // Key expired
    }

    return Math.ceil(remaining / 1000); // Return seconds
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    this.resetStats();
    logger.info('Memory cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      size: totalSize,
      itemCount: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
    };
  }

  /**
   * Get all keys matching pattern
   */
  public async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        // Check if not expired
        const item = this.cache.get(key);
        if (item && Date.now() <= item.expiry) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  /**
   * Delete all keys matching pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    let deleted = 0;

    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Ensure we have enough space for new item
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
    
    if (currentSize + requiredSize <= this.maxSize) {
      return; // We have enough space
    }

    // Need to free up space - use LRU eviction
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      item,
      lastAccess: item.expiry - (24 * 60 * 60 * 1000), // Approximate last access
    }));

    // Sort by last access (oldest first)
    items.sort((a, b) => a.lastAccess - b.lastAccess);

    let freedSize = 0;
    let evicted = 0;

    for (const { key, item } of items) {
      this.cache.delete(key);
      freedSize += item.size;
      evicted++;

      if (currentSize - freedSize + requiredSize <= this.maxSize) {
        break;
      }
    }

    if (evicted > 0) {
      logger.info(`Memory cache evicted ${evicted} items to free ${this.formatBytes(freedSize)}`);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      logger.debug(`Memory cache cleanup removed ${expired} expired items`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop cleanup interval
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Format bytes for human readable output
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Destroy the cache and cleanup resources
   */
  public destroy(): void {
    this.stopCleanupInterval();
    this.cache.clear();
    this.resetStats();
    logger.info('Memory cache destroyed');
  }
}