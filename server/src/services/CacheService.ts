import { redisManager } from '@/config/redis';
import { MemoryCacheService } from './MemoryCacheService';
import { logger } from '@/utils/logger';

export interface CacheServiceStats {
  redis: {
    available: boolean;
    stats?: Record<string, unknown>;
  };
  memory: {
    available: boolean;
    stats: Record<string, unknown>;
  };
  fallbackMode: boolean;
}

export class CacheService {
  private static instance: CacheService;
  private memoryCache: MemoryCacheService;
  private fallbackMode = false;

  private constructor() {
    this.memoryCache = new MemoryCacheService();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize cache service
   */
  public async initialize(): Promise<void> {
    try {
      // Try to connect to Redis with timeout
      const connectPromise = redisManager.connect();
      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 3000); // 3 second timeout
      });

      const redisClient = await Promise.race([connectPromise, timeoutPromise]);

      if (redisClient) {
        this.fallbackMode = false;
        logger.info('Cache service initialized with Redis');
      } else {
        this.fallbackMode = true;
        if (process.env.NODE_ENV !== 'test') {
          logger.warn(
            'Cache service initialized in fallback mode (memory only)'
          );
        }
      }
    } catch (error) {
      this.fallbackMode = true;
      if (process.env.NODE_ENV !== 'test') {
        logger.warn('Redis unavailable, using memory cache fallback:', error);
      }
    }
  }

  /**
   * Get value from cache
   */
  public async get<T = unknown>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          const value = await redisClient.get(key);
          if (value !== null) {
            return JSON.parse(value) as T;
          }
        } else {
          // Redis became unavailable, switch to fallback mode
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Use memory cache as fallback
      return await this.memoryCache.get<T>(key);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        if (process.env.NODE_ENV !== 'test') {
          logger.warn('Redis error, switching to memory cache fallback');
        }
        return await this.memoryCache.get<T>(key);
      }

      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  public async set<T = unknown>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          if (ttlSeconds) {
            await redisClient.setex(key, ttlSeconds, serialized);
          } else {
            await redisClient.set(key, serialized);
          }

          // Also set in memory cache for faster access
          await this.memoryCache.set(key, value, ttlSeconds);
          return;
        } else {
          // Redis became unavailable, switch to fallback mode
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Use memory cache as fallback
      await this.memoryCache.set(key, value, ttlSeconds);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
        await this.memoryCache.set(key, value, ttlSeconds);
      }
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<boolean> {
    let deleted = false;

    try {
      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          const result = await redisClient.del(key);
          deleted = result > 0;
        } else {
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Also delete from memory cache
      const memoryDeleted = await this.memoryCache.delete(key);

      return deleted || memoryDeleted;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
      }

      return await this.memoryCache.delete(key);
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    try {
      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          const exists = await redisClient.exists(key);
          return exists > 0;
        } else {
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Use memory cache as fallback
      return await this.memoryCache.exists(key);
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
      }

      return await this.memoryCache.exists(key);
    }
  }

  /**
   * Set expiry for existing key
   */
  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          const result = await redisClient.expire(key, ttlSeconds);

          // Also update memory cache expiry
          await this.memoryCache.expire(key, ttlSeconds);

          return result === 1; // Redis returns 1 for success, 0 for failure
        } else {
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Use memory cache as fallback
      return await this.memoryCache.expire(key, ttlSeconds);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
      }

      return await this.memoryCache.expire(key, ttlSeconds);
    }
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          return await redisClient.ttl(key);
        } else {
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Use memory cache as fallback
      return await this.memoryCache.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
      }

      return await this.memoryCache.ttl(key);
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    try {
      // Clear Redis if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          await redisClient.flushall();
        }
      }

      // Clear memory cache
      await this.memoryCache.clear();

      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  public async keys(pattern: string): Promise<string[]> {
    try {
      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          return await redisClient.keys(pattern);
        } else {
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Use memory cache as fallback
      return await this.memoryCache.keys(pattern);
    } catch (error) {
      logger.error(`Cache keys error for pattern ${pattern}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
      }

      return await this.memoryCache.keys(pattern);
    }
  }

  /**
   * Delete all keys matching pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      let deleted = 0;

      // Try Redis first if available
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            deleted = await redisClient.del(keys);
          }
        } else {
          this.fallbackMode = true;
          logger.warn('Redis became unavailable, switching to memory cache');
        }
      }

      // Also delete from memory cache
      const memoryDeleted = await this.memoryCache.deletePattern(pattern);

      return Math.max(deleted, memoryDeleted);
    } catch (error) {
      logger.error(`Cache delete pattern error for pattern ${pattern}:`, error);

      // If Redis fails, try memory cache
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        logger.warn('Redis error, switching to memory cache fallback');
      }

      return await this.memoryCache.deletePattern(pattern);
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<CacheServiceStats> {
    const stats: CacheServiceStats = {
      redis: {
        available: false,
      },
      memory: {
        available: true,
        stats: this.memoryCache.getStats() as unknown as Record<
          string,
          unknown
        >,
      },
      fallbackMode: this.fallbackMode,
    };

    try {
      if (!this.fallbackMode) {
        const redisClient = redisManager.getClient();
        if (redisClient && redisManager.isHealthy()) {
          stats.redis.available = true;
          const info = await redisManager.getInfo();
          stats.redis.stats = info;
        }
      }
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
    }

    return stats;
  }

  /**
   * Health check for cache service
   */
  public async healthCheck(): Promise<{
    status: string;
    details: Record<string, unknown>;
  }> {
    try {
      const redisHealth = await redisManager.healthCheck();
      const memoryStats = this.memoryCache.getStats();

      return {
        status:
          redisHealth.status === 'healthy' || this.fallbackMode
            ? 'healthy'
            : 'degraded',
        details: {
          redis: redisHealth,
          memory: {
            status: 'healthy',
            stats: memoryStats,
          },
          fallbackMode: this.fallbackMode,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Attempt to reconnect to Redis
   */
  public async reconnectRedis(): Promise<boolean> {
    try {
      const redisClient = await redisManager.connect();
      if (redisClient) {
        this.fallbackMode = false;
        logger.info('Successfully reconnected to Redis');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to reconnect to Redis:', error);
      return false;
    }
  }

  /**
   * Destroy cache service and cleanup resources
   */
  public async destroy(): Promise<void> {
    try {
      await redisManager.disconnect();
      this.memoryCache.destroy();
      logger.info('Cache service destroyed');
    } catch (error) {
      logger.error('Error destroying cache service:', error);
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
