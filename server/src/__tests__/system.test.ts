import request from 'supertest';
import app from '../index';

describe('System Controller', () => {
  describe('GET /api/system/health', () => {
    it('should return comprehensive health information', async () => {
      const response = await request(app)
        .get('/api/system/health');

      const { body } = response;

      // Check status code
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Check required fields
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('version');

      // Check memory information
      expect(body.memory).toHaveProperty('used');
      expect(body.memory).toHaveProperty('total');
      expect(typeof body.memory.used).toBe('number');
      expect(typeof body.memory.total).toBe('number');

      // Check services status
      expect(body.services).toHaveProperty('database');
      expect(body.services).toHaveProperty('cache');

      // Validate timestamp format
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
      expect(isNaN(new Date(body.timestamp).getTime())).toBe(false);
    });

    it('should return consistent uptime values', async () => {
      const response1 = await request(app).get('/api/system/health');
      
      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response2 = await request(app).get('/api/system/health');

      expect(response2.body.uptime).toBeGreaterThan(response1.body.uptime);
    });
  });

  describe('GET /api/system/info', () => {
    it('should return system information', async () => {
      const response = await request(app)
        .get('/api/system/info')
        .expect(200);

      const { body } = response;

      expect(body.name).toBe('MarketPulse API');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('nodeVersion');
      expect(body).toHaveProperty('platform');
      expect(body).toHaveProperty('architecture');
      expect(body).toHaveProperty('timestamp');

      // Validate Node.js version format
      expect(body.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('GET /api/system/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/system/metrics')
        .expect(200);

      const { body } = response;

      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('memory');
      expect(body).toHaveProperty('cpu');
      expect(body).toHaveProperty('platform');
      expect(body).toHaveProperty('environment');

      // Check memory metrics structure
      expect(body.memory).toHaveProperty('rss');
      expect(body.memory).toHaveProperty('heapTotal');
      expect(body.memory).toHaveProperty('heapUsed');
      expect(body.memory).toHaveProperty('external');

      // Check CPU metrics structure
      expect(body.cpu).toHaveProperty('user');
      expect(body.cpu).toHaveProperty('system');

      // Check platform information
      expect(body.platform).toHaveProperty('node');
      expect(body.platform).toHaveProperty('platform');
      expect(body.platform).toHaveProperty('arch');
    });
  });
});