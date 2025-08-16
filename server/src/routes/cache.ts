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

export { router as cacheRoutes };