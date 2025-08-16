import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { databaseManager } from '@/config/database';
import { cacheService } from '@/services/CacheService';

export const getHealth = asyncHandler(async (req: Request, res: Response) => {
  // Check database health
  const dbHealth = await databaseManager.healthCheck();
  
  // Check cache health
  const cacheHealth = await cacheService.healthCheck();

  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    },
    services: {
      database: dbHealth.status,
      cache: cacheHealth.status,
    },
    details: {
      database: dbHealth.details,
      cache: cacheHealth.details,
    },
  };

  // Determine overall status
  if (dbHealth.status === 'unhealthy' || cacheHealth.status === 'unhealthy') {
    healthCheck.status = 'unhealthy';
  } else if (dbHealth.status === 'degraded' || cacheHealth.status === 'degraded') {
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 
                    healthCheck.status === 'degraded' ? 206 : 503;

  logger.info('Health check requested', { 
    ip: req.ip, 
    userAgent: req.get('User-Agent'),
    status: healthCheck.status,
  });

  res.status(statusCode).json(healthCheck);
});

export const getInfo = asyncHandler(async (req: Request, res: Response) => {
  const info = {
    name: 'MarketPulse API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Financial dashboard backend API',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    timestamp: new Date().toISOString(),
  };

  res.json(info);
});

export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    platform: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(metrics);
});