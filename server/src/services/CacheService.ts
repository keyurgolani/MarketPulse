import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  memory?: {
    maxSize?: number; // Maximum number of items in memory cache
    ttl?: number; // Default TTL in seconds
  };
}

export interface CacheItem<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class CacheService {
  private redisClient: Redis | null = null;
  private memoryCache: Map<string, CacheItem<unknown>> = new Map();
  private readonly maxMemorySize: number;
  private readonly defaultTtl: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig = {}) {
    this.maxMemorySize = config.memory?.maxSize ?? 1000;
    this.defaultTtl = config.memory?.ttl ?? 300; // 5 minutes default

    this.initializeRedis(config.redis);
    this.initializeMemoryCache();
  }

  private async initializeRedis(
    redisConfig?: CacheConfig['redis']
  ): Promise<void> {
    try {
      // Skip Redis initialization during tests
      if (process.env.NODE_ENV === 'test') {
        logger.info('Redis not configured, using memory cache only');
        return;
      }

      if (redisConfig?.url ?? process.env.REDIS_URL) {
        const redisUrl = redisConfig?.url ?? process.env.REDIS_URL;
        if (redisUrl) {
          this.redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
          });
        }
      } else if (redisConfig?.host ?? process.env.REDIS_HOST) {
        const redisOptions: Record<string, unknown> = {
          host: redisConfig?.host ?? process.env.REDIS_HOST,
          port: redisConfig?.port ?? parseInt(process.env.REDIS_PORT ?? '6379'),
          db: redisConfig?.db ?? parseInt(process.env.REDIS_DB ?? '0'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        };

        if (redisConfig?.password ?? process.env.REDIS_PASSWORD) {
          redisOptions.password =
            redisConfig?.password ?? process.env.REDIS_PASSWORD;
        }

        this.redisClient = new Redis(redisOptions);
      }

      if (this.redisClient) {
        await this.redisClient.connect();

        this.redisClient.on('connect', () => {
          logger.info('Redis cache connected successfully');
        });

        this.redisClient.on('error', (error) => {
          logger.error('Redis cache error', { error: error.message });
        });

        this.redisClient.on('close', () => {
          logger.warn(
            'Redis cache connection closed, falling back to memory cache'
          );
        });

        logger.info('Redis cache initialized');
      } else {
        logger.info('Redis not configured, using memory cache only');
      }
    } catch (error) {
      logger.error(
        'Failed to initialize Redis cache, falling back to memory cache',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      this.redisClient = null;
    }
  }

  private initializeMemoryCache(): void {
    // Clean up expired items every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
    }, 60000);

    logger.info('Memory cache initialized', {
      maxSize: this.maxMemorySize,
      defaultTtl: this.defaultTtl,
    });
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Memory cache cleanup completed', {
        cleanedItems: cleanedCount,
        remainingItems: this.memoryCache.size,
      });
    }
  }

  private evictOldestMemoryItems(): void {
    if (this.memoryCache.size <= this.maxMemorySize) {
      return;
    }

    // Sort by creation time and remove oldest items
    const sortedEntries = Array.from(this.memoryCache.entries()).sort(
      ([, a], [, b]) => a.createdAt - b.createdAt
    );

    const itemsToRemove = this.memoryCache.size - this.maxMemorySize;

    for (let i = 0; i < itemsToRemove; i++) {
      const entry = sortedEntries[i];
      if (entry) {
        const [key] = entry;
        this.memoryCache.delete(key);
      }
    }

    logger.debug('Memory cache eviction completed', {
      evictedItems: itemsToRemove,
      remainingItems: this.memoryCache.size,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.redisClient) {
        try {
          const redisValue = await this.redisClient.get(key);
          if (redisValue !== null) {
            const parsed = JSON.parse(redisValue);
            logger.debug('Cache hit (Redis)', { key });
            return parsed;
          }
        } catch (redisError) {
          logger.warn('Redis get failed, trying memory cache', {
            key,
            error:
              redisError instanceof Error
                ? redisError.message
                : 'Unknown error',
          });
        }
      }

      // Try memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem) {
        if (memoryItem.expiresAt > Date.now()) {
          logger.debug('Cache hit (Memory)', { key });
          return memoryItem.value as T;
        } else {
          // Remove expired item
          this.memoryCache.delete(key);
        }
      }

      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTtl = ttl ?? this.defaultTtl;
    const expiresAt = Date.now() + effectiveTtl * 1000;

    try {
      // Set in Redis
      if (this.redisClient) {
        try {
          await this.redisClient.setex(
            key,
            effectiveTtl,
            JSON.stringify(value)
          );
          logger.debug('Cache set (Redis)', { key, ttl: effectiveTtl });
        } catch (redisError) {
          logger.warn('Redis set failed, using memory cache only', {
            key,
            error:
              redisError instanceof Error
                ? redisError.message
                : 'Unknown error',
          });
        }
      }

      // Set in memory cache
      this.memoryCache.set(key, {
        value,
        expiresAt,
        createdAt: Date.now(),
      });

      // Evict old items if necessary
      this.evictOldestMemoryItems();

      logger.debug('Cache set (Memory)', { key, ttl: effectiveTtl });
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      // Delete from Redis
      if (this.redisClient) {
        try {
          await this.redisClient.del(key);
        } catch (redisError) {
          logger.warn('Redis delete failed', {
            key,
            error:
              redisError instanceof Error
                ? redisError.message
                : 'Unknown error',
          });
        }
      }

      // Delete from memory cache
      this.memoryCache.delete(key);

      logger.debug('Cache delete', { key });
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.redisClient) {
        try {
          const exists = await this.redisClient.exists(key);
          if (exists === 1) {
            return true;
          }
        } catch (redisError) {
          logger.warn('Redis exists check failed, checking memory cache', {
            key,
            error:
              redisError instanceof Error
                ? redisError.message
                : 'Unknown error',
          });
        }
      }

      // Check memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && memoryItem.expiresAt > Date.now()) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      // Flush Redis
      if (this.redisClient) {
        try {
          await this.redisClient.flushdb();
        } catch (redisError) {
          logger.warn('Redis flush failed', {
            error:
              redisError instanceof Error
                ? redisError.message
                : 'Unknown error',
          });
        }
      }

      // Flush memory cache
      this.memoryCache.clear();

      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getStats(): Promise<{
    redis: { connected: boolean; keyCount?: number };
    memory: { keyCount: number; maxSize: number };
  }> {
    const stats: {
      redis: { connected: boolean; keyCount?: number };
      memory: { keyCount: number; maxSize: number };
    } = {
      redis: { connected: false },
      memory: { keyCount: this.memoryCache.size, maxSize: this.maxMemorySize },
    };

    if (this.redisClient) {
      try {
        const info = await this.redisClient.info('keyspace');
        stats.redis.connected = true;

        // Parse keyspace info to get key count
        const dbMatch = info.match(/db0:keys=(\d+)/);
        if (dbMatch?.[1]) {
          stats.redis.keyCount = parseInt(dbMatch[1]);
        }
      } catch (error) {
        logger.warn('Failed to get Redis stats', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return stats;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: { status: 'up' | 'down'; responseTime?: number };
    memory: { status: 'up'; keyCount: number };
  }> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let redisStatus: 'up' | 'down' = 'down';
    let responseTime: number | undefined = undefined;

    // Test Redis
    if (this.redisClient) {
      try {
        await this.redisClient.ping();
        redisStatus = 'up';
        responseTime = Date.now() - startTime;
      } catch (error) {
        logger.warn('Redis health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        status = 'degraded';
      }
    } else {
      status = 'degraded';
    }

    const result: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      redis: { status: 'up' | 'down'; responseTime?: number };
      memory: { status: 'up'; keyCount: number };
    } = {
      status,
      redis: { status: redisStatus },
      memory: { status: 'up', keyCount: this.memoryCache.size },
    };

    if (responseTime !== undefined) {
      result.redis.responseTime = responseTime;
    }

    return result;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
      }

      this.memoryCache.clear();

      logger.info('Cache service disconnected');
    } catch (error) {
      logger.error('Error disconnecting cache service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Global cache service instance - lazily initialized
let globalCacheService: CacheService | null = null;

export const getCacheService = (): CacheService => {
  globalCacheService ??= new CacheService();
  return globalCacheService;
};

// For testing - allows cleanup of global instance
export const cleanupGlobalCacheService = async (): Promise<void> => {
  if (globalCacheService) {
    await globalCacheService.disconnect();
    globalCacheService = null;
  }
};

// Backward compatibility
export const cacheService = getCacheService();
