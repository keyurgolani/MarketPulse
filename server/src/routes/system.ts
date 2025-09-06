import { Router } from 'express';
import { SystemHealthService } from '../services/SystemHealthService';
import { db } from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const healthService = new SystemHealthService(db);

// Health check endpoint - comprehensive system status
router.get('/health', asyncHandler(async (_req, res) => {
  try {
    const health = await healthService.getSystemHealth();
    
    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    return successResponse(res, health, statusCode);
  } catch (error) {
    logger.error('Health check failed', { error });
    return errorResponse(res, 'Health check failed', 503, 'HEALTH_CHECK_FAILED');
  }
}));

// Simple health check for load balancers
router.get('/health/simple', asyncHandler(async (_req, res) => {
  const isHealthy = await healthService.isHealthy();
  
  if (isHealthy) {
    return successResponse(res, { status: 'ok' });
  } else {
    return errorResponse(res, 'System unhealthy', 503, 'SYSTEM_UNHEALTHY');
  }
}));

// Readiness check - checks if system is ready to serve traffic
router.get('/ready', asyncHandler(async (_req, res) => {
  try {
    // Check database connectivity
    const dbHealth = await db.healthCheck();
    
    if (dbHealth.status === 'healthy') {
      return successResponse(res, { 
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      return errorResponse(res, 'System not ready', 503, 'NOT_READY');
    }
  } catch (error) {
    logger.error('Readiness check failed', { error });
    return errorResponse(res, 'Readiness check failed', 503, 'READINESS_CHECK_FAILED');
  }
}));

// Liveness check - simple check that the service is running
router.get('/live', (_req, res) => {
  return successResponse(res, { 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// System information endpoint
router.get('/info', (_req, res) => {
  const info = {
    name: 'MarketPulse API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Financial dashboard platform backend API',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  
  return successResponse(res, info);
});

// System metrics endpoint
router.get('/metrics', asyncHandler(async (_req, res) => {
  try {
    const health = await healthService.getSystemHealth();
    
    const metrics = {
      uptime: health.uptime,
      memory: health.metrics.memoryUsage,
      activeConnections: health.metrics.activeConnections,
      timestamp: health.timestamp,
      services: Object.entries(health.services).map(([name, service]) => ({
        name,
        status: service.status,
        responseTime: service.responseTime,
        lastCheck: service.lastCheck,
      })),
    };
    
    return successResponse(res, metrics);
  } catch (error) {
    logger.error('Metrics collection failed', { error });
    return errorResponse(res, 'Metrics collection failed', 500, 'METRICS_FAILED');
  }
}));

// System status endpoint (aggregated view)
router.get('/status', asyncHandler(async (_req, res) => {
  try {
    const health = await healthService.getSystemHealth();
    
    const status = {
      status: health.status,
      version: health.version,
      environment: health.environment,
      uptime: health.uptime,
      timestamp: health.timestamp,
      services: Object.keys(health.services).reduce((acc, key) => {
        acc[key] = health.services[key as keyof typeof health.services].status;
        return acc;
      }, {} as Record<string, string>),
    };
    
    return successResponse(res, status);
  } catch (error) {
    logger.error('Status check failed', { error });
    return errorResponse(res, 'Status check failed', 500, 'STATUS_CHECK_FAILED');
  }
}));

export default router;