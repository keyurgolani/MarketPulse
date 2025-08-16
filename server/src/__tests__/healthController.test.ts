import request from 'supertest';
import app from '../index';
import { healthMonitor } from '../services/HealthMonitorService';

describe('Health Controller', () => {
  beforeEach(() => {
    healthMonitor.stopMonitoring();
    healthMonitor.destroy();
  });

  afterEach(() => {
    healthMonitor.stopMonitoring();
  });

  afterAll(() => {
    healthMonitor.destroy();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/health/metrics', () => {
    it('should return metrics history', async () => {
      // Collect some metrics first
      await healthMonitor.collectMetrics();
      await healthMonitor.collectMetrics();

      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.metrics)).toBe(true);
    });

    it('should return limited metrics when limit specified', async () => {
      // Collect some metrics first
      for (let i = 0; i < 5; i++) {
        await healthMonitor.collectMetrics();
      }

      const response = await request(app)
        .get('/api/health/metrics?limit=3')
        .expect(200);

      expect(response.body.data.metrics).toHaveLength(3);
      expect(response.body.data.limit).toBe(3);
    });

    it('should return error for invalid limit', async () => {
      const response = await request(app)
        .get('/api/health/metrics?limit=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/health/metrics/current', () => {
    it('should return current metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics/current')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('environment');
    });
  });

  describe('GET /api/health/alerts', () => {
    it('should return alerts', async () => {
      const response = await request(app)
        .get('/api/health/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('includeResolved');
      expect(Array.isArray(response.body.data.alerts)).toBe(true);
    });

    it('should return alerts with resolved included', async () => {
      const response = await request(app)
        .get('/api/health/alerts?includeResolved=true')
        .expect(200);

      expect(response.body.data.includeResolved).toBe(true);
    });
  });

  describe('POST /api/health/alerts/:alertId/resolve', () => {
    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .post('/api/health/alerts/non-existent/resolve')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/health/alerts/resolved', () => {
    it('should clear resolved alerts', async () => {
      const response = await request(app)
        .delete('/api/health/alerts/resolved')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('clearedCount');
    });
  });

  describe('GET /api/health/system', () => {
    it('should return system information', async () => {
      const response = await request(app)
        .get('/api/health/system')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('services');
    });
  });

  describe('POST /api/health/monitoring/start', () => {
    it('should start health monitoring', async () => {
      const response = await request(app)
        .post('/api/health/monitoring/start')
        .send({ interval: 5000 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('monitoring', true);
      expect(response.body.data).toHaveProperty('interval', 5000);
    });

    it('should return error for invalid interval', async () => {
      const response = await request(app)
        .post('/api/health/monitoring/start')
        .send({ interval: 1000 }) // Too short
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/health/monitoring/stop', () => {
    it('should stop health monitoring', async () => {
      const response = await request(app)
        .post('/api/health/monitoring/stop')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('monitoring', false);
    });
  });
});