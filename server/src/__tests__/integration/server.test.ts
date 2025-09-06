import request from 'supertest';
import express from 'express';
import { db } from '../../config/database';

// Simple test server setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Basic health endpoint
  app.get('/health', async (_req, res) => {
    try {
      const dbHealth = await db.healthCheck();
      res.json({
        success: true,
        data: {
          status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
          database: dbHealth.status,
          timestamp: new Date().toISOString(),
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        timestamp: Date.now(),
      });
    }
  });
  
  return app;
};

describe('Server Integration', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = createTestApp();
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBeDefined();
    expect(response.body.data.timestamp).toBeDefined();
  });

  it('should handle JSON requests', async () => {
    const response = await request(app)
      .post('/health')
      .send({ test: 'data' })
      .expect(404); // Should return 404 for POST to health endpoint

    expect(response.body).toBeDefined();
  });
});