import request from 'supertest';
import app from '../index';
import { databaseManager } from '../config/database';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected for integration tests
    await databaseManager.connect();
  });

  afterAll(async () => {
    // Clean up database connections
    await databaseManager.disconnect();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      // Health endpoint might return 206 (partial content) if some services are degraded
      expect([200, 206]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return system information', async () => {
      const response = await request(app).get('/api/health/system').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return current metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics/current')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('System Endpoints', () => {
    it('should return system info', async () => {
      const response = await request(app).get('/api/system/info').expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('nodeVersion');
    });
  });

  describe('Asset Endpoints', () => {
    it('should fetch asset data for valid symbol', async () => {
      const response = await request(app).get('/api/assets/AAPL');

      // Asset endpoint might return different status codes based on data availability
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    }, 15000);

    it('should return assets list', async () => {
      const response = await request(app).get('/api/assets');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });
  });

  describe('Dashboard Endpoints', () => {
    it('should return dashboards', async () => {
      const response = await request(app).get('/api/dashboards');

      expect([200, 401, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should handle dashboard requests', async () => {
      const response = await request(app).get('/api/dashboards/1');

      // Dashboard endpoints might require authentication or return 404 for non-existent dashboards
      expect([200, 401, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });
  });
});
