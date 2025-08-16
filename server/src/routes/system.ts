import { Router } from 'express';
import { getHealth, getInfo, getMetrics } from '@/controllers/systemController';

const router = Router();

/**
 * @route GET /api/system/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', getHealth);

/**
 * @route GET /api/system/info
 * @desc System information endpoint
 * @access Public
 */
router.get('/info', getInfo);

/**
 * @route GET /api/system/metrics
 * @desc System metrics endpoint
 * @access Public
 */
router.get('/metrics', getMetrics);

export { router as systemRoutes };