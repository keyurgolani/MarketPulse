import { Router } from 'express';
import {
  getLogFiles,
  getLogFile,
  searchLogs,
  getLogStats,
  cleanupLogs,
  archiveLogs,
  downloadLogFile,
} from '@/controllers/loggingController';

const router = Router();

/**
 * @route GET /api/logs
 * @desc Get list of available log files
 * @access Public
 */
router.get('/', getLogFiles);

/**
 * @route GET /api/logs/search
 * @desc Search across all log files
 * @query level - Log level filter
 * @query category - Category filter
 * @query startDate - Start date filter (ISO string)
 * @query endDate - End date filter (ISO string)
 * @query search - Text search
 * @query limit - Number of entries to return (max 1000)
 * @query offset - Number of entries to skip
 * @access Public
 */
router.get('/search', searchLogs);

/**
 * @route GET /api/logs/stats
 * @desc Get log statistics
 * @access Public
 */
router.get('/stats', getLogStats);

/**
 * @route GET /api/logs/:filename
 * @desc Get entries from a specific log file
 * @query level - Log level filter
 * @query category - Category filter
 * @query startDate - Start date filter (ISO string)
 * @query endDate - End date filter (ISO string)
 * @query search - Text search
 * @query limit - Number of entries to return (max 1000)
 * @query offset - Number of entries to skip
 * @access Public
 */
router.get('/:filename', getLogFile);

/**
 * @route GET /api/logs/:filename/download
 * @desc Download a log file
 * @access Public
 */
router.get('/:filename/download', downloadLogFile);

/**
 * @route POST /api/logs/cleanup
 * @desc Clean up old log files
 * @body { maxAge?: number, maxSize?: number, maxFiles?: number }
 * @access Public
 */
router.post('/cleanup', cleanupLogs);

/**
 * @route POST /api/logs/archive
 * @desc Archive old log files
 * @body { maxAge?: number }
 * @access Public
 */
router.post('/archive', archiveLogs);

export { router as loggingRoutes };