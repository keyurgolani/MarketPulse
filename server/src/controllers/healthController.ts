import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { healthMonitor } from '@/services/HealthMonitorService';
import { logger } from '@/utils/logger';

export const getHealth = asyncHandler(async (req: Request, res: Response) => {
  try {
    const healthStatus = await healthMonitor.getHealthStatus();
    const alerts = healthMonitor.getAlerts(false); // Get only active alerts
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json({
      success: true,
      status: healthStatus.status,
      metrics: healthStatus.metrics,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.query;
  
  let limitNum: number | undefined;
  if (limit) {
    limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a positive integer between 1 and 1000',
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  const history = healthMonitor.getMetricsHistory(limitNum);
  
  return res.json({
    success: true,
    data: {
      metrics: history,
      count: history.length,
      limit: limitNum,
    },
    timestamp: new Date().toISOString(),
  });
});

export const getCurrentMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await healthMonitor.collectMetrics();
  
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
});

export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { includeResolved } = req.query;
  const includeResolvedBool = includeResolved === 'true';
  
  const alerts = healthMonitor.getAlerts(includeResolvedBool);
  
  res.json({
    success: true,
    data: {
      alerts,
      count: alerts.length,
      includeResolved: includeResolvedBool,
    },
    timestamp: new Date().toISOString(),
  });
});

export const resolveAlert = asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  
  if (!alertId) {
    return res.status(400).json({
      success: false,
      error: 'Alert ID is required',
      timestamp: new Date().toISOString(),
    });
  }
  
  const resolved = healthMonitor.resolveAlert(alertId);
  
  if (!resolved) {
    return res.status(404).json({
      success: false,
      error: `Alert ${alertId} not found`,
      timestamp: new Date().toISOString(),
    });
  }
  
  return res.json({
    success: true,
    message: `Alert ${alertId} resolved`,
    data: { alertId, resolved: true },
    timestamp: new Date().toISOString(),
  });
});

export const clearResolvedAlerts = asyncHandler(async (req: Request, res: Response) => {
  const clearedCount = healthMonitor.clearResolvedAlerts();
  
  res.json({
    success: true,
    message: `Cleared ${clearedCount} resolved alerts`,
    data: { clearedCount },
    timestamp: new Date().toISOString(),
  });
});

export const getSystemInfo = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await healthMonitor.collectMetrics();
  
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
});

export const startMonitoring = asyncHandler(async (req: Request, res: Response) => {
  const { interval } = req.body;
  const intervalNum = interval ? parseInt(interval, 10) : 30000;
  
  if (isNaN(intervalNum) || intervalNum < 5000) {
    return res.status(400).json({
      success: false,
      error: 'Interval must be at least 5000ms (5 seconds)',
      timestamp: new Date().toISOString(),
    });
  }
  
  healthMonitor.startMonitoring(intervalNum);
  
  return res.json({
    success: true,
    message: `Health monitoring started with ${intervalNum}ms interval`,
    data: {
      monitoring: true,
      interval: intervalNum,
    },
    timestamp: new Date().toISOString(),
  });
});

export const stopMonitoring = asyncHandler(async (req: Request, res: Response) => {
  healthMonitor.stopMonitoring();
  
  res.json({
    success: true,
    message: 'Health monitoring stopped',
    data: {
      monitoring: false,
    },
    timestamp: new Date().toISOString(),
  });
});