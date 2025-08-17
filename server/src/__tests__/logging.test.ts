import request from 'supertest';
import app from '../index';
import { loggingService } from '../services/LoggingService';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

describe('Logging Service', () => {
  const testLogsDir = path.join(process.cwd(), 'logs');

  beforeAll(() => {
    // Ensure logs directory exists
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test logs
    try {
      if (fs.existsSync(testLogsDir)) {
        const files = fs.readdirSync(testLogsDir);
        files.forEach(file => {
          if (file.endsWith('.log')) {
            fs.unlinkSync(path.join(testLogsDir, file));
          }
        });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('LoggingService', () => {
    beforeEach(() => {
      // Generate some test log entries
      logger.info('Test info message', { category: 'test', testId: 1 });
      logger.warn('Test warning message', { category: 'test', testId: 2 });
      logger.error('Test error message', { category: 'test', testId: 3 });
    });

    it('should get log files', async () => {
      const logFiles = await loggingService.getLogFiles();
      expect(Array.isArray(logFiles)).toBe(true);
      // In test environment, we might not have log files
      logFiles.forEach(
        (file: {
          name: string;
          path: string;
          size: number;
          modified: Date;
        }) => {
          expect(file).toHaveProperty('name');
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('modified');
          expect(file).toHaveProperty('lines');
        }
      );
    });

    it('should get log statistics', async () => {
      const stats = await loggingService.getLogStats();
      expect(stats).toHaveProperty('files');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('totalLines');
      expect(stats).toHaveProperty('levelCounts');
      expect(stats).toHaveProperty('categoryCounts');
      expect(typeof stats.files).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.totalLines).toBe('number');
    });

    it('should search logs with filters', async () => {
      const result = await loggingService.searchLogs({
        search: 'test',
        limit: 10,
      });
      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.entries)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should cleanup logs', async () => {
      const result = await loggingService.cleanupLogs({
        maxAge: 0, // Delete all logs
      });
      expect(result).toHaveProperty('deletedFiles');
      expect(result).toHaveProperty('freedSpace');
      expect(Array.isArray(result.deletedFiles)).toBe(true);
      expect(typeof result.freedSpace).toBe('number');
    });
  });

  describe('Logging API Endpoints', () => {
    describe('GET /api/logs', () => {
      it('should return list of log files', async () => {
        const response = await request(app)
          .get('/api/logs')
          .expect('Content-Type', /json/);

        expect([200, 404]).toContain(response.status); // 404 if no logs exist
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('files');
          expect(response.body.data).toHaveProperty('count');
          expect(Array.isArray(response.body.data.files)).toBe(true);
        }
      });
    });

    describe('GET /api/logs/search', () => {
      it('should search logs', async () => {
        const response = await request(app)
          .get('/api/logs/search?search=test&limit=5')
          .expect('Content-Type', /json/);

        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('entries');
          expect(response.body.data).toHaveProperty('total');
          expect(response.body.data).toHaveProperty('hasMore');
        }
      });

      it('should return error for invalid limit', async () => {
        const response = await request(app)
          .get('/api/logs/search?limit=invalid')
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/logs/stats', () => {
      it('should return log statistics', async () => {
        const response = await request(app)
          .get('/api/logs/stats')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('files');
        expect(response.body.data).toHaveProperty('totalSize');
        expect(response.body.data).toHaveProperty('totalLines');
        expect(response.body.data).toHaveProperty('levelCounts');
        expect(response.body.data).toHaveProperty('categoryCounts');
      });
    });

    describe('POST /api/logs/cleanup', () => {
      it('should cleanup old logs', async () => {
        const response = await request(app)
          .post('/api/logs/cleanup')
          .send({ maxAge: 0 })
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('deletedFiles');
        expect(response.body.data).toHaveProperty('freedSpace');
      });

      it('should return error for invalid maxAge', async () => {
        const response = await request(app)
          .post('/api/logs/cleanup')
          .send({ maxAge: 'invalid' })
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/logs/archive', () => {
      it('should archive old logs', async () => {
        const response = await request(app)
          .post('/api/logs/archive')
          .send({ maxAge: 0 })
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('archivedFiles');
        expect(response.body.data).toHaveProperty('archiveSize');
      });

      it('should return error for invalid maxAge', async () => {
        const response = await request(app)
          .post('/api/logs/archive')
          .send({ maxAge: 'invalid' })
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Logging Middleware', () => {
    it('should add request ID to responses', async () => {
      const response = await request(app)
        .get('/api/system/health')
        .expect('Content-Type', /json/);

      expect(response.headers).toHaveProperty('x-request-id');
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should add response time to responses', async () => {
      const response = await request(app)
        .get('/api/system/health')
        .expect('Content-Type', /json/);

      expect(response.headers).toHaveProperty('x-response-time');
      expect(typeof response.headers['x-response-time']).toBe('string');
    });

    it('should handle custom request ID header', async () => {
      const customId = 'test-request-123';
      const response = await request(app)
        .get('/api/system/health')
        .set('X-Request-ID', customId)
        .expect('Content-Type', /json/);

      expect(response.headers['x-request-id']).toBe(customId);
    });
  });
});
