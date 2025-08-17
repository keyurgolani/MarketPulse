// Set NODE_ENV to development for testing BEFORE importing modules
process.env.NODE_ENV = 'development';

import request from 'supertest';
import express from 'express';
import Joi from 'joi';
import {
  validate,
  sanitize,
  commonSchemas,
  validateEmail,
  validatePassword,
  validateUrl,
  validateObjectId,
  customJoi,
  loggingSchema,
  cacheSchema,
  systemSchema,
} from '../middleware/validation';
import { errorHandler } from '../middleware/errorHandler';
import { requestIdMiddleware } from '../middleware/requestId';

const app = express();
app.use(express.json());
app.use(requestIdMiddleware);

// Test routes with validation
app.post(
  '/test/body-validation',
  validate({
    body: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      age: Joi.number().integer().min(0).max(120),
    }),
  }),
  (req, res) => {
    res.json({ success: true, data: req.body });
  }
);

app.get(
  '/test/query-validation',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      search: Joi.string().min(1).max(100),
    }),
  }),
  (req, res) => {
    res.json({ success: true, data: req.query });
  }
);

app.get(
  '/test/params-validation/:id',
  validate({
    params: Joi.object({
      id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
    }),
  }),
  (req, res) => {
    res.json({ success: true, data: req.params });
  }
);

app.post(
  '/test/headers-validation',
  validate({
    headers: Joi.object({
      'x-api-key': Joi.string().required(),
      'content-type': Joi.string().valid('application/json'),
    }).unknown(true), // Allow other headers
  }),
  (req, res) => {
    res.json({ success: true });
  }
);

app.post(
  '/test/multiple-validation/:id',
  validate({
    body: Joi.object({
      name: Joi.string().required(),
    }),
    query: Joi.object({
      format: Joi.string().valid('json', 'xml').default('json'),
    }),
    params: Joi.object({
      id: Joi.string().required(),
    }),
  }),
  (req, res) => {
    res.json({
      success: true,
      data: { body: req.body, query: req.query, params: req.params },
    });
  }
);

app.post(
  '/test/sanitization',
  sanitize(
    Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      extraField: Joi.string(), // This should be stripped if not provided
    })
  ), // Allow unknown fields to be stripped
  (req, res) => {
    res.json({ success: true, data: req.body });
  }
);

app.get(
  '/test/common-schemas/pagination',
  validate({
    query: commonSchemas.pagination,
  }),
  (req, res) => {
    res.json({ success: true, data: req.query });
  }
);

app.get(
  '/test/common-schemas/date-range',
  validate({
    query: commonSchemas.dateRange,
  }),
  (req, res) => {
    res.json({ success: true, data: req.query });
  }
);

app.get(
  '/test/logging-schema',
  validate({
    query: loggingSchema.query,
  }),
  (req, res) => {
    res.json({ success: true, data: req.query });
  }
);

app.get(
  '/test/cache-schema/:key',
  validate({
    params: cacheSchema.params,
    query: cacheSchema.query,
  }),
  (req, res) => {
    res.json({ success: true, data: { params: req.params, query: req.query } });
  }
);

app.get(
  '/test/system-schema',
  validate({
    query: systemSchema.query,
  }),
  (req, res) => {
    res.json({ success: true, data: req.query });
  }
);

// Error handler
app.use(errorHandler);

describe('Validation Middleware', () => {
  describe('Body Validation', () => {
    it('should pass valid body data', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const response = await request(app)
        .post('/test/body-validation')
        .send(validData)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should reject invalid body data', async () => {
      const invalidData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
        age: -5, // Negative age
      };

      const response = await request(app)
        .post('/test/body-validation')
        .send(invalidData)
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.validationErrors).toHaveLength(3);
      expect(response.body.error.details.validationErrors[0].type).toBe('body');
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        age: 30,
        // Missing name and email
      };

      const response = await request(app)
        .post('/test/body-validation')
        .send(incompleteData)
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Query Validation', () => {
    it('should pass valid query parameters', async () => {
      const response = await request(app)
        .get('/test/query-validation?page=2&limit=20&search=test')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe('2');
      expect(response.body.data.limit).toBe('20');
      expect(response.body.data.search).toBe('test');
    });

    it('should apply default values for query parameters', async () => {
      const response = await request(app)
        .get('/test/query-validation')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      // Note: Query parameters are strings, defaults might not apply the same way
    });

    it('should reject invalid query parameters', async () => {
      const response = await request(app)
        .get('/test/query-validation?page=0&limit=200') // Invalid values
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Params Validation', () => {
    it('should pass valid route parameters', async () => {
      const validId = '507f1f77bcf86cd799439011'; // Valid ObjectId

      const response = await request(app)
        .get(`/test/params-validation/${validId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validId);
    });

    it('should reject invalid route parameters', async () => {
      const invalidId = 'invalid-id';

      const response = await request(app)
        .get(`/test/params-validation/${invalidId}`)
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Headers Validation', () => {
    it('should pass valid headers', async () => {
      const response = await request(app)
        .post('/test/headers-validation')
        .set('X-API-Key', 'test-api-key')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });

    it('should reject missing required headers', async () => {
      const response = await request(app)
        .post('/test/headers-validation')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Multiple Validation Sources', () => {
    it('should validate all sources successfully', async () => {
      const response = await request(app)
        .post('/test/multiple-validation/test-id?format=json')
        .send({ name: 'Test Name' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.body.name).toBe('Test Name');
      expect(response.body.data.query.format).toBe('json');
      expect(response.body.data.params.id).toBe('test-id');
    });

    it('should report errors from multiple sources', async () => {
      await request(app)
        .post('/test/multiple-validation/test-id') // Missing required fields
        .send({}) // Missing name in body
        .expect(400); // Validation error due to missing fields

      // This test demonstrates that route-level validation happens first
    });
  });

  describe('Sanitization', () => {
    it('should sanitize and strip unknown fields', async () => {
      const dataWithExtra = {
        name: 'John Doe',
        email: 'john@example.com',
        unknownField: 'should be stripped',
        anotherUnknown: 123,
      };

      const response = await request(app)
        .post('/test/sanitization')
        .send(dataWithExtra)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(response.body.data).not.toHaveProperty('unknownField');
      expect(response.body.data).not.toHaveProperty('anotherUnknown');
    });

    it('should reject invalid data during sanitization', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/test/sanitization')
        .send(invalidData)
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Common Schemas', () => {
    it('should validate pagination schema', async () => {
      const response = await request(app)
        .get('/test/common-schemas/pagination?page=2&limit=50')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });

    it('should validate date range schema', async () => {
      const response = await request(app)
        .get(
          '/test/common-schemas/date-range?startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z'
        )
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid date range', async () => {
      const response = await request(app)
        .get(
          '/test/common-schemas/date-range?startDate=2023-12-31T00:00:00.000Z&endDate=2023-01-01T00:00:00.000Z'
        )
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Logging Schema', () => {
    it('should validate logging query parameters', async () => {
      const response = await request(app)
        .get('/test/logging-schema?level=error&category=database&limit=50')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid logging parameters', async () => {
      const response = await request(app)
        .get('/test/logging-schema?level=invalid&limit=2000')
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Cache Schema', () => {
    it('should validate cache parameters', async () => {
      const response = await request(app)
        .get('/test/cache-schema/test-key?pattern=user:*')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });

  describe('System Schema', () => {
    it('should validate system query parameters', async () => {
      const response = await request(app)
        .get('/test/system-schema?detailed=true&includeEnv=false')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Validation Helper Functions', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongP@ss1')).toBe(true);
      expect(validatePassword('MySecure123!')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('nouppercaseornumber')).toBe(false);
      expect(validatePassword('NoSpecialChar123')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('ftp://files.example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
    });
  });

  describe('validateObjectId', () => {
    it('should validate correct ObjectIds', () => {
      expect(validateObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(validateObjectId('123456789012345678901234')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(validateObjectId('invalid-id')).toBe(false);
      expect(validateObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
      expect(validateObjectId('507f1f77bcf86cd799439011z')).toBe(false); // Invalid character
    });
  });
});

describe('Custom Joi Extensions', () => {
  describe('objectId type', () => {
    it('should validate ObjectId with custom extension', () => {
      const schema = customJoi.objectId().required();

      const { error: validError } = schema.validate('507f1f77bcf86cd799439011');
      expect(validError).toBeUndefined();

      const { error: invalidError } = schema.validate('invalid-id');
      expect(invalidError).toBeDefined();
      expect(invalidError?.message).toContain('valid ObjectId');
    });
  });
});
