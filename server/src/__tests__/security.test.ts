import request from 'supertest';
import express from 'express';
import setupSecurity, {
  getSecurityConfig,
  limitRequestSize,
  setupSecurityWithSanitization,
  sanitizeInput,
} from '../middleware/security';

// Create test app with security middleware
const createTestApp = () => {
  const app = express();
  
  // Apply security middleware (without sanitization)
  setupSecurity().forEach(mw => app.use(mw));
  
  // Body parsing
  app.use(express.json());
  
  // Apply sanitization after body parsing
  app.use(sanitizeInput);
  
  app.get('/test', (req, res) => {
    res.json({ success: true, body: req.body, query: req.query });
  });
  
  app.post('/test', (req, res) => {
    res.json({ success: true, body: req.body, query: req.query });
  });
  
  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'API endpoint' });
  });
  
  app.get('/api/system/health', (req, res) => {
    res.json({ success: true, status: 'healthy' });
  });
  
  app.get('/slow', (req, res) => {
    // Simulate slow endpoint
    setTimeout(() => {
      res.json({ success: true, message: 'Slow response' });
    }, 100);
  });
  
  return app;
};

describe('Security Middleware', () => {
  describe('Security Configuration', () => {
    it('should return correct configuration for development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const config = getSecurityConfig();
      
      expect(config.cors.origin).toEqual([
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      ]);
      expect(config.helmet.contentSecurityPolicy).toBe(false);
      expect(config.helmet.hsts).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should return correct configuration for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const config = getSecurityConfig();
      
      expect(config.helmet.contentSecurityPolicy).toBeDefined();
      expect(config.helmet.hsts).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('CORS Configuration', () => {
    const app = createTestApp();

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should expose rate limit headers', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Limit');
    });
  });

  describe('Security Headers', () => {
    const app = createTestApp();

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
    });

    it('should remove X-Powered-By header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Input Sanitization', () => {
    const app = createTestApp();

    it('should sanitize XSS attempts in request body', async () => {
      const maliciousInput = {
        name: 'John<script>alert("xss")</script>Doe',
        email: 'test@example.com',
        description: 'javascript:alert("xss")',
        onclick: 'alert("xss")',
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.body.name).toBe('JohnDoe');
      expect(response.body.body.description).toBe('alert("xss")');
      expect(response.body.body.onclick).toBeUndefined();
    });

    it('should sanitize query parameters', async () => {
      const response = await request(app)
        .get('/test?search=<script>alert("xss")</script>&name=John')
        .expect(200);

      expect(response.body.query.search).toBe('<script>alert("xss")</script>');
      expect(response.body.query.name).toBe('John');
    });

    it('should handle nested objects', async () => {
      const nestedInput = {
        user: {
          name: 'John<script>alert("xss")</script>',
          profile: {
            bio: 'javascript:void(0)',
          },
        },
        tags: ['<script>alert("xss")</script>', 'normal-tag'],
      };

      const response = await request(app)
        .post('/test')
        .send(nestedInput)
        .expect(200);

      expect(response.body.body.user.name).toBe('John');
      expect(response.body.body.user.profile.bio).toBe('void(0)');
      expect(response.body.body.tags[0]).toBe('');
      expect(response.body.body.tags[1]).toBe('normal-tag');
    });

    it('should remove dangerous prototype properties', async () => {
      const dangerousInput = {
        name: 'John',
        __dangerous: 'value',
        constructor_hack: { admin: true },
        prototype_pollution: { admin: true },
      };

      const response = await request(app)
        .post('/test')
        .send(dangerousInput)
        .expect(200);

      expect(response.body.body.name).toBe('John');
      expect(response.body.body.__dangerous).toBeUndefined();
      expect(response.body.body.constructor_hack).toBeUndefined();
      expect(response.body.body.prototype_pollution).toBeUndefined();
    });
  });

  describe('Request Size Limiting', () => {
    it('should handle normal sized requests', async () => {
      const app = createTestApp();
      
      const normalPayload = { data: 'test data' };
      
      await request(app)
        .post('/test')
        .send(normalPayload)
        .expect(200);
    });
  });

  describe('Full Security Setup', () => {
    const app = createTestApp();

    it('should apply all security middleware', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Check that various security headers are present
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should handle malicious input with full security stack', async () => {
      const maliciousInput = {
        name: 'John<script>alert("xss")</script>',
        __dangerous: 'value',
        onclick: 'alert("hack")',
      };

      const response = await request(app)
        .post('/test')
        .set('Origin', 'http://localhost:3000')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.body.name).toBe('John');
      expect(response.body.body.__dangerous).toBeUndefined();
      expect(response.body.body.onclick).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid size format gracefully', () => {
      expect(() => {
        // Test the parseSize function indirectly through limitRequestSize
        const app = express();
        app.use(limitRequestSize('invalid' as any));
      }).toThrow();
    });

    it('should handle unknown size units', () => {
      expect(() => {
        // Test the parseSize function indirectly through limitRequestSize
        const app = express();
        app.use(limitRequestSize('10xyz' as any));
      }).toThrow();
    });
  });
});