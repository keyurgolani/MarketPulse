import { Router } from 'express';
import {
  getCacheStats,
  getCacheHealth,
  clearCache,
  refreshCache,
  getCacheKeys,
  getCacheValue,
  setCacheValue,
  deleteCacheValue,
  reconnectRedis,
  getEnhancedStats,
  getDashboard,
  invalidateByType,
  markRateLimited,
  getMetrics,
} from '@/controllers/cacheController';

const router = Router();

/**
 * @route GET /api/cache/stats
 * @desc Get cache statistics
 * @access Public
 */
router.get('/stats', getCacheStats);

/**
 * @route GET /api/cache/health
 * @desc Get cache health status
 * @access Public
 */
router.get('/health', getCacheHealth);

/**
 * @route POST /api/cache/clear
 * @desc Clear cache (all or by pattern)
 * @body { pattern?: string }
 * @access Public
 */
router.post('/clear', clearCache);

/**
 * @route POST /api/cache/refresh
 * @desc Refresh specific cache keys
 * @body { keys: string[] }
 * @access Public
 */
router.post('/refresh', refreshCache);

/**
 * @route GET /api/cache/keys
 * @desc Get cache keys by pattern
 * @query pattern - Pattern to match (default: *)
 * @access Public
 */
router.get('/keys', getCacheKeys);

/**
 * @route GET /api/cache/value/:key
 * @desc Get cache value by key
 * @access Public
 */
router.get('/value/:key', getCacheValue);

/**
 * @route POST /api/cache/value/:key
 * @desc Set cache value by key
 * @body { value: any, ttl?: number }
 * @access Public
 */
router.post('/value/:key', setCacheValue);

/**
 * @route DELETE /api/cache/value/:key
 * @desc Delete cache value by key
 * @access Public
 */
router.delete('/value/:key', deleteCacheValue);

/**
 * @route POST /api/cache/reconnect
 * @desc Attempt to reconnect to Redis
 * @access Public
 */
router.post('/reconnect', reconnectRedis);

/**
 * @route GET /api/cache/enhanced-stats
 * @desc Get enhanced cache statistics with performance metrics
 * @access Public
 */
router.get('/enhanced-stats', getEnhancedStats);

/**
 * @route GET /api/cache/dashboard
 * @desc Get cache monitoring dashboard data
 * @access Public
 */
router.get('/dashboard', getDashboard);

/**
 * @route POST /api/cache/invalidate/:type
 * @desc Invalidate cache by type (assets, news, all)
 * @access Public
 */
router.post('/invalidate/:type', invalidateByType);

/**
 * @route POST /api/cache/rate-limited
 * @desc Mark a key as rate limited for adaptive TTL
 * @body { key: string, duration?: number }
 * @access Public
 */
router.post('/rate-limited', markRateLimited);

/**
 * @route GET /api/cache/metrics
 * @desc Get current cache performance metrics
 * @access Public
 */
router.get('/metrics', getMetrics);

export { router as cacheRoutes };
