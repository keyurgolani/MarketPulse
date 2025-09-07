import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../middleware/errorHandler';
import {
  SystemHealth,
  ServiceStatus,
} from '../../services/SystemHealthService';

// Mock the database
const mockDb = {
  healthCheck: jest.fn(),
};

// Mock SystemHealthService
const mockHealthService = {
  getSystemHealth: jest.fn(),
  isHealthy: jest.fn(),
};

// Create a test router that mimics the system routes
const createTestRouter = () => {
  const router = Router();

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      try {
        const health = await mockHealthService.getSystemHealth();
        const statusCode =
          health.status === 'healthy'
            ? 200
            : health.status === 'degraded'
              ? 200
              : 503;
        return successResponse(res, health, statusCode);
      } catch {
        return errorResponse(
          res,
          'Health check failed',
          503,
          'HEALTH_CHECK_FAILED'
        );
      }
    })
  );

  router.get(
    '/health/simple',
    asyncHandler(async (_req, res) => {
      const isHealthy = await mockHealthService.isHealthy();
      if (isHealthy) {
        return successResponse(res, { status: 'ok' });
      } else {
        return errorResponse(res, 'System unhealthy', 503, 'SYSTEM_UNHEALTHY');
      }
    })
  );

  router.get(
    '/ready',
    asyncHandler(async (_req, res) => {
      try {
        const dbHealth = await mockDb.healthCheck();
        if (dbHealth.status === 'healthy') {
          return successResponse(res, {
            status: 'ready',
            timestamp: new Date().toISOString(),
          });
        } else {
          return errorResponse(res, 'System not ready', 503, 'NOT_READY');
        }
      } catch {
        return errorResponse(
          res,
          'Readiness check failed',
          503,
          'READINESS_CHECK_FAILED'
        );
      }
    })
  );

  router.get('/live', (_req, res) => {
    return successResponse(res, {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  router.get('/info', (_req, res) => {
    const info = {
      name: 'MarketPulse API',
      version: process.env.npm_package_version ?? '1.0.0',
      description: 'Financial dashboard platform backend API',
      environment: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    return successResponse(res, info);
  });

  router.get(
    '/metrics',
    asyncHandler(async (_req, res) => {
      try {
        const health = await mockHealthService.getSystemHealth();
        const metrics = {
          uptime: health.uptime,
          memory: health.metrics.memoryUsage,
          activeConnections: health.metrics.activeConnections,
          timestamp: health.timestamp,
          services: Object.entries(health.services).map(([name, service]) => ({
            name,
            status: (service as ServiceStatus).status,
            responseTime: (service as ServiceStatus).responseTime,
            lastCheck: (service as ServiceStatus).lastCheck,
          })),
        };
        return successResponse(res, metrics);
      } catch {
        return errorResponse(
          res,
          'Metrics collection failed',
          500,
          'METRICS_FAILED'
        );
      }
    })
  );

  router.get(
    '/status',
    asyncHandler(async (_req, res) => {
      try {
        const health = await mockHealthService.getSystemHealth();
        const status = {
          status: health.status,
          version: health.version,
          environment: health.environment,
          uptime: health.uptime,
          timestamp: health.timestamp,
          services: Object.keys(health.services).reduce(
            (acc, key) => {
              acc[key] = health.services[key].status;
              return acc;
            },
            {} as Record<string, string>
          ),
        };
        return successResponse(res, status);
      } catch {
        return errorResponse(
          res,
          'Status check failed',
          500,
          'STATUS_CHECK_FAILED'
        );
      }
    })
  );

  return router;
};

const app = express();
app.use(express.json());
app.use('/api/system', createTestRouter());

describe('System Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to ensure clean state
    mockHealthService.getSystemHealth.mockReset();
    mockHealthService.isHealthy.mockReset();
    mockDb.healthCheck.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status with 200', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: {
            status: 'healthy',
            responseTime: 10,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          memory: {
            status: 'healthy',
            responseTime: 5,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          disk: {
            status: 'healthy',
            responseTime: 15,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
        },
        metrics: {
          memoryUsage: { used: 100, total: 1000, percentage: 10 },
          activeConnections: 5,
        },
      };

      mockHealthService.getSystemHealth.mockResolvedValue(mockHealth);

      const response = await request(app).get('/api/system/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHealth);
      expect(mockHealthService.getSystemHealth).toHaveBeenCalled();
    });

    it('should return degraded status with 200', async () => {
      const mockHealth = {
        status: 'degraded' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: {
            status: 'healthy',
            responseTime: 10,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          memory: {
            status: 'degraded',
            responseTime: 5,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          disk: {
            status: 'healthy',
            responseTime: 15,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
        },
        metrics: {
          memoryUsage: { used: 800, total: 1000, percentage: 80 },
          activeConnections: 10,
        },
      };

      mockHealthService.getSystemHealth.mockResolvedValue(mockHealth);

      const response = await request(app).get('/api/system/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('degraded');
    });

    it('should return unhealthy status with 503', async () => {
      const mockHealth = {
        status: 'unhealthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: {
            status: 'unhealthy',
            responseTime: 5000,
            lastCheck: '2024-01-01T00:00:00.000Z',
            error: 'Connection failed',
          },
          memory: {
            status: 'healthy',
            responseTime: 5,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          disk: {
            status: 'healthy',
            responseTime: 15,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
        },
        metrics: {
          memoryUsage: { used: 100, total: 1000, percentage: 10 },
          activeConnections: 0,
        },
      };

      mockHealthService.getSystemHealth.mockResolvedValue(mockHealth);

      const response = await request(app).get('/api/system/health').expect(503);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('unhealthy');
    });

    it('should handle health check errors', async () => {
      mockHealthService.getSystemHealth.mockRejectedValue(
        new Error('Health check failed')
      );

      const response = await request(app).get('/api/system/health').expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Health check failed');
      expect(response.body.code).toBe('HEALTH_CHECK_FAILED');
    });
  });

  describe('GET /health/simple', () => {
    it('should return ok when system is healthy', async () => {
      mockHealthService.isHealthy.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/system/health/simple')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });

    it('should return error when system is unhealthy', async () => {
      mockHealthService.isHealthy.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/system/health/simple')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('System unhealthy');
      expect(response.body.code).toBe('SYSTEM_UNHEALTHY');
    });
  });

  describe('GET /ready', () => {
    it('should return ready when database is healthy', async () => {
      mockDb.healthCheck.mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });

      const response = await request(app).get('/api/system/ready').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return not ready when database is unhealthy', async () => {
      mockDb.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        responseTime: 5000,
        error: 'Connection failed',
      });

      const response = await request(app).get('/api/system/ready').expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('System not ready');
      expect(response.body.code).toBe('NOT_READY');
    });

    it('should handle readiness check errors', async () => {
      mockDb.healthCheck.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/system/ready').expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Readiness check failed');
      expect(response.body.code).toBe('READINESS_CHECK_FAILED');
    });
  });

  describe('GET /live', () => {
    it('should always return alive status', async () => {
      const response = await request(app).get('/api/system/live').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /info', () => {
    it('should return system information', async () => {
      const response = await request(app).get('/api/system/info').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('MarketPulse API');
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.description).toBeDefined();
      expect(response.body.data.environment).toBeDefined();
      expect(response.body.data.nodeVersion).toBeDefined();
      expect(response.body.data.platform).toBeDefined();
      expect(response.body.data.architecture).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /metrics', () => {
    it('should return system metrics', async () => {
      const mockHealth = {
        uptime: 3600,
        timestamp: '2024-01-01T00:00:00.000Z',
        metrics: {
          memoryUsage: { used: 100, total: 1000, percentage: 10 },
          activeConnections: 5,
        },
        services: {
          database: {
            status: 'healthy',
            responseTime: 10,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          memory: {
            status: 'healthy',
            responseTime: 5,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          disk: {
            status: 'healthy',
            responseTime: 15,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      mockHealthService.getSystemHealth.mockResolvedValue(
        mockHealth as SystemHealth
      );

      const response = await request(app)
        .get('/api/system/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uptime).toBe(3600);
      expect(response.body.data.memory).toEqual({
        used: 100,
        total: 1000,
        percentage: 10,
      });
      expect(response.body.data.activeConnections).toBe(5);
      expect(response.body.data.services).toHaveLength(3);
    });

    it('should handle metrics collection errors', async () => {
      mockHealthService.getSystemHealth.mockRejectedValue(
        new Error('Metrics failed')
      );

      const response = await request(app)
        .get('/api/system/metrics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Metrics collection failed');
      expect(response.body.code).toBe('METRICS_FAILED');
    });
  });

  describe('GET /status', () => {
    it('should return aggregated system status', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        version: '1.0.0',
        environment: 'test',
        uptime: 3600,
        timestamp: '2024-01-01T00:00:00.000Z',
        services: {
          database: {
            status: 'healthy',
            responseTime: 10,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          memory: {
            status: 'healthy',
            responseTime: 5,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
          disk: {
            status: 'healthy',
            responseTime: 15,
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      mockHealthService.getSystemHealth.mockResolvedValue(
        mockHealth as SystemHealth
      );

      const response = await request(app).get('/api/system/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.environment).toBe('test');
      expect(response.body.data.uptime).toBe(3600);
      expect(response.body.data.services).toEqual({
        database: 'healthy',
        memory: 'healthy',
        disk: 'healthy',
      });
    });

    it('should handle status check errors', async () => {
      mockHealthService.getSystemHealth.mockRejectedValue(
        new Error('Status failed')
      );

      const response = await request(app).get('/api/system/status').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status check failed');
      expect(response.body.code).toBe('STATUS_CHECK_FAILED');
    });
  });
});
