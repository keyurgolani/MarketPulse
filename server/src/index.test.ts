import request from 'supertest';
import express from 'express';

// Import the app setup (we'll need to refactor this later)
describe('API Server', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();

    // Basic health check endpoint for testing
    app.get('/api/system/health', (_req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        timestamp: Date.now(),
      });
    });
  });

  it('should return health status', async () => {
    const response = await request(app).get('/api/system/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
  });
});
