import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { cacheService } from '@/services/CacheService';
import { enhancedCacheService } from '@/services/EnhancedCacheService';
import { CacheMonitoringService } from '@/services/CacheMonitoringService';
import { getInvalidationPatterns } from '@/config/cache';
import { logger } from '@/utils/logger';

// Initialize monitoring service
const monitoringService = new CacheMonitoringService(
  cacheService,
  enhancedCacheService
);

export const getCacheStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await cacheService.getStats();

    logger.info('Cache stats requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }
);

export const getCacheHealth = asyncHandler(
  async (req: Request, res: Response) => {
    const health = await cacheService.healthCheck();

    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 206
          : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      status: health.status,
      details: health.details,
      timestamp: new Date().toISOString(),
    });
  }
);

export const clearCache = asyncHandler(async (req: Request, res: Response) => {
  const { pattern } = req.body;

  if (pattern) {
    // Clear specific pattern
    const deleted = await cacheService.deletePattern(pattern);

    logger.info(`Cache pattern cleared: ${pattern}, deleted ${deleted} keys`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      pattern,
      deleted,
    });

    res.json({
      success: true,
      message: `Cleared ${deleted} cache entries matching pattern: ${pattern}`,
      deleted,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Clear all cache
    await cacheService.clear();

    logger.warn('All cache cleared', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'All cache entries cleared',
      timestamp: new Date().toISOString(),
    });
  }
});

export const refreshCache = asyncHandler(
  async (req: Request, res: Response) => {
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys)) {
      res.status(400).json({
        success: false,
        error: 'Keys array is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const results = [];

    for (const key of keys) {
      try {
        const deleted = await cacheService.delete(key);
        results.push({ key, deleted });
      } catch (error) {
        results.push({
          key,
          deleted: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info(`Cache refresh requested for ${keys.length} keys`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      keys,
    });

    res.json({
      success: true,
      message: `Refreshed ${keys.length} cache keys`,
      results,
      timestamp: new Date().toISOString(),
    });
  }
);

export const getCacheKeys = asyncHandler(
  async (req: Request, res: Response) => {
    const { pattern = '*' } = req.query;

    if (typeof pattern !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Pattern must be a string',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const keys = await cacheService.keys(pattern);

    res.json({
      success: true,
      data: {
        pattern,
        keys,
        count: keys.length,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const getCacheValue = asyncHandler(
  async (req: Request, res: Response) => {
    const { key } = req.params;

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'Cache key is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const value = await cacheService.get(key);
    const exists = value !== null;
    const ttl = exists ? await cacheService.ttl(key) : -2;

    res.json({
      success: true,
      data: {
        key,
        value,
        exists,
        ttl,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const setCacheValue = asyncHandler(
  async (req: Request, res: Response) => {
    const { key } = req.params;
    const { value, ttl } = req.body;

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'Cache key is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (value === undefined) {
      res.status(400).json({
        success: false,
        error: 'Cache value is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await cacheService.set(key, value, ttl);

    logger.info(`Cache value set for key: ${key}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      key,
      ttl,
    });

    res.json({
      success: true,
      message: `Cache value set for key: ${key}`,
      data: {
        key,
        ttl: ttl || null,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const deleteCacheValue = asyncHandler(
  async (req: Request, res: Response) => {
    const { key } = req.params;

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'Cache key is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const deleted = await cacheService.delete(key);

    logger.info(`Cache delete requested for key: ${key}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      key,
      deleted,
    });

    res.json({
      success: true,
      message: deleted
        ? `Cache key deleted: ${key}`
        : `Cache key not found: ${key}`,
      data: {
        key,
        deleted,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const reconnectRedis = asyncHandler(
  async (req: Request, res: Response) => {
    const reconnected = await cacheService.reconnectRedis();

    logger.info('Redis reconnection attempted', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: reconnected,
    });

    res.json({
      success: reconnected,
      message: reconnected
        ? 'Successfully reconnected to Redis'
        : 'Failed to reconnect to Redis',
      timestamp: new Date().toISOString(),
    });
  }
);

export const getEnhancedStats = asyncHandler(
  async (req: Request, res: Response) => {
    const health = await enhancedCacheService.getHealth();
    const summary = monitoringService.getPerformanceSummary();

    res.json({
      success: true,
      data: {
        health,
        summary,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const getDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const dashboardData = await monitoringService.getDashboardData();

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  }
);

export const invalidateByType = asyncHandler(
  async (req: Request, res: Response) => {
    const { type } = req.params;
    const validTypes = ['assets', 'news', 'all'] as const;

    if (!validTypes.includes(type as 'assets' | 'news' | 'all')) {
      res.status(400).json({
        success: false,
        error: `Invalid invalidation type. Must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const patterns = getInvalidationPatterns(type as 'assets' | 'news' | 'all');
    const deleted = await enhancedCacheService.invalidateByPattern(patterns);

    logger.info(`Cache invalidated by type: ${type}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      type,
      patterns,
      deleted,
    });

    res.json({
      success: true,
      message: `Invalidated ${deleted} cache entries for type: ${type}`,
      data: {
        type,
        patterns,
        deleted,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const markRateLimited = asyncHandler(
  async (req: Request, res: Response) => {
    const { key, duration = 3600 } = req.body;

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'Cache key is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    enhancedCacheService.markRateLimited(key, duration);

    logger.info(`Key marked as rate limited: ${key}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      key,
      duration,
    });

    res.json({
      success: true,
      message: `Key marked as rate limited: ${key}`,
      data: {
        key,
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = enhancedCacheService.getMetrics();

  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
});
