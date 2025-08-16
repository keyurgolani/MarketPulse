import { Router } from 'express';
import {
  getHealth,
  getMetrics,
  getCurrentMetrics,
  getAlerts,
  resolveAlert,
  clearResolvedAlerts,
  getSystemInfo,
  startMonitoring,
  stopMonitoring,
} from '@/controllers/healthController';

const router = Router();

/**
 * @route GET /api/health
 * @desc Get overall health status
 * @access Public
 */
router.get('/', getHealth);

/**
 * @route GET /api/health/metrics
 * @desc Get metrics history
 * @query limit - Number of metrics to return (max 1000)
 * @access Public
 */
router.get('/metrics', getMetrics);

/**
 * @route GET /api/health/metrics/current
 * @desc Get current metrics
 * @access Public
 */
router.get('/metrics/current', getCurrentMetrics);

/**
 * @route GET /api/health/alerts
 * @desc Get alerts
 * @query includeResolved - Include resolved alerts (default: false)
 * @access Public
 */
router.get('/alerts', getAlerts);

/**
 * @route POST /api/health/alerts/:alertId/resolve
 * @desc Resolve an alert
 * @access Public
 */
router.post('/alerts/:alertId/resolve', resolveAlert);

/**
 * @route DELETE /api/health/alerts/resolved
 * @desc Clear all resolved alerts
 * @access Public
 */
router.delete('/alerts/resolved', clearResolvedAlerts);

/**
 * @route GET /api/health/system
 * @desc Get system information
 * @access Public
 */
router.get('/system', getSystemInfo);

/**
 * @route POST /api/health/monitoring/start
 * @desc Start health monitoring
 * @body { interval?: number }
 * @access Public
 */
router.post('/monitoring/start', startMonitoring);

/**
 * @route POST /api/health/monitoring/stop
 * @desc Stop health monitoring
 * @access Public
 */
router.post('/monitoring/stop', stopMonitoring);

export { router as healthRoutes };