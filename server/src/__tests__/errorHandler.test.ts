// Set NODE_ENV to development for testing BEFORE importing modules
process.env.NODE_ENV = 'development';

import request from 'supertest';
import express from 'express';
import {
  errorHandler,
  notFoundHandler,
  CustomError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  asyncHandler,
  createError,
} from '../middleware/errorHandler';
import { requestIdMiddleware } from '../middleware/requestId';

const app = express();
app.use(express.json());
app.use(requestIdMiddleware);

// Test routes
app.get('/test/success', (req, res) => {
  res.json({ success: true, message: 'Success' });
});

app.get('/test/custom-error', (req, res, next) => {
  const error = new CustomError('Custom error message', 400, 'CUSTOM_ERROR', { field: 'test' });
  next(error);
});

app.get('/test/validation-error', (req, res, next) => {
  const error = new ValidationError('Validation failed', {
    fields: [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is too short' },
    ],
  });
  next(error);
});

app.get('/test/auth-error', (req, res, next) => {
  const error = new AuthenticationError();
  next(error);
});

app.get('/test/authz-error', (req, res, next) => {
  const error = new AuthorizationError();
  next(error);
});

app.get('/test/not-found-error', (req, res, next) => {
  const error = new NotFoundError('User');
  next(error);
});

app.get('/test/conflict-error', (req, res, next) => {
  const error = new ConflictError('Email already exists', { field: 'email' });
  next(error);
});

app.get('/test/rate-limit-error', (req, res, next) => {
  const error = new RateLimitError();
  next(error);
});

app.get('/test/database-error', (req, res, next) => {
  const error = new DatabaseError('Connection failed', { host: 'localhost' });
  next(error);
});

app.get('/test/external-service-error', (req, res, next) => {
  const error = new ExternalServiceError('PaymentAPI', 'Service unavailable');
  next(error);
});

app.get('/test/generic-error', (req, res, next) => {
  const error = new Error('Generic error');
  next(error);
});

app.get('/test/async-error', asyncHandler(async (req: any, res: any) => {
  throw new Error('Async error');
}));

app.get('/test/create-error', (req, res, next) => {
  const error = createError('Created error', 422, 'CREATED_ERROR', { test: true });
  next(error);
});

// Joi validation error simulation
app.get('/test/joi-error', (req, res, next) => {
  const error = {
    isJoi: true,
    details: [
      {
        path: ['email'],
        message: '"email" is required',
        context: { value: undefined },
      },
      {
        path: ['age'],
        message: '"age" must be a number',
        context: { value: 'invalid' },
      },
    ],
  };
  next(error);
});

// MongoDB error simulation
app.get('/test/mongo-duplicate', (req, res, next) => {
  const error = {
    name: 'MongoError',
    code: 11000,
    keyPattern: { email: 1 },
    keyValue: { email: 'test@example.com' },
  };
  next(error);
});

app.get('/test/mongo-cast', (req, res, next) => {
  const error = {
    name: 'CastError',
    path: 'userId',
    value: 'invalid-id',
    kind: 'ObjectId',
  };
  next(error);
});

app.get('/test/mongo-validation', (req, res, next) => {
  const error = {
    name: 'ValidationError',
    errors: {
      email: {
        path: 'email',
        message: 'Email is required',
        value: undefined,
      },
      age: {
        path: 'age',
        message: 'Age must be a number',
        value: 'invalid',
      },
    },
  };
  next(error);
});

// Apply error handlers
app.use(notFoundHandler);
app.use(errorHandler);

describe('Error Handler Middleware', () => {
  describe('Custom Error Classes', () => {
    it('should handle CustomError correctly', async () => {
      const response = await request(app)
        .get('/test/custom-error')
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Custom error message');
      expect(response.body.error.code).toBe('CUSTOM_ERROR');
      expect(response.body.error.statusCode).toBe(400);
      expect(response.body.error.details).toEqual({ field: 'test' });
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle ValidationError correctly', async () => {
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400)
        .expect('Content-Type', /json/);


      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.fields).toHaveLength(2);
    });

    it('should handle AuthenticationError correctly', async () => {
      const response = await request(app)
        .get('/test/auth-error')
        .expect(401)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Authentication required');
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle AuthorizationError correctly', async () => {
      const response = await request(app)
        .get('/test/authz-error')
        .expect(403)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Insufficient permissions');
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle NotFoundError correctly', async () => {
      const response = await request(app)
        .get('/test/not-found-error')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User not found');
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    it('should handle ConflictError correctly', async () => {
      const response = await request(app)
        .get('/test/conflict-error')
        .expect(409)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Email already exists');
      expect(response.body.error.code).toBe('CONFLICT_ERROR');
      expect(response.body.error.details).toEqual({ field: 'email' });
    });

    it('should handle RateLimitError correctly', async () => {
      const response = await request(app)
        .get('/test/rate-limit-error')
        .expect(429)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Rate limit exceeded');
      expect(response.body.error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should handle DatabaseError correctly', async () => {
      const response = await request(app)
        .get('/test/database-error')
        .expect(500)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Connection failed'); // Not masked in development
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });

    it('should handle ExternalServiceError correctly', async () => {
      const response = await request(app)
        .get('/test/external-service-error')
        .expect(502)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('External service error: PaymentAPI - Service unavailable');
      expect(response.body.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic Error correctly', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Generic error'); // Not masked in development
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    }, 15000);

    it('should handle async errors correctly', async () => {
      const response = await request(app)
        .get('/test/async-error')
        .expect(500)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Async error'); // Not masked in development
    });

    it('should handle createError function', async () => {
      const response = await request(app)
        .get('/test/create-error')
        .expect(422)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Created error');
      expect(response.body.error.code).toBe('CREATED_ERROR');
      expect(response.body.error.details).toEqual({ test: true });
    });
  });

  describe('External Library Error Transformation', () => {
    it('should transform Joi validation errors', async () => {
      const response = await request(app)
        .get('/test/joi-error')
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.fields).toHaveLength(2);
      expect(response.body.error.details.fields[0].field).toBe('email');
      expect(response.body.error.details.fields[1].field).toBe('age');
    });

    it('should transform MongoDB duplicate key errors', async () => {
      const response = await request(app)
        .get('/test/mongo-duplicate')
        .expect(409)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Duplicate value for email');
      expect(response.body.error.code).toBe('CONFLICT_ERROR');
      expect(response.body.error.details.field).toBe('email');
      expect(response.body.error.details.value).toBe('test@example.com');
    });

    it('should transform MongoDB cast errors', async () => {
      const response = await request(app)
        .get('/test/mongo-cast')
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid userId: invalid-id');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.field).toBe('userId');
      expect(response.body.error.details.expectedType).toBe('ObjectId');
    });

    it('should transform MongoDB validation errors', async () => {
      const response = await request(app)
        .get('/test/mongo-validation')
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.fields).toHaveLength(2);
    });
  });

  describe('Not Found Handler', () => {
    it('should handle 404 routes correctly', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Route GET /nonexistent-route not found');
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });
  });

  describe('Response Format', () => {
    it('should include required response fields', async () => {
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('statusCode');
    });

    it('should include stack trace in development', async () => {
      // This test assumes NODE_ENV is not 'production'
      const response = await request(app)
        .get('/test/custom-error')
        .expect(400);


      if (process.env.NODE_ENV !== 'production') {
        expect(response.body.error).toHaveProperty('stack');
      }
    });
  });

  describe('Success Route', () => {
    it('should handle successful requests normally', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Success');
    });
  });
});

describe('Error Utility Functions', () => {
  describe('asyncHandler', () => {
    it('should catch async errors and pass to next', (done) => {
      const mockReq = {} as any;
      const mockRes = {} as any;
      const mockNext = jest.fn();

      const asyncFn = async () => {
        throw new Error('Async error');
      };

      const wrappedFn = asyncHandler(asyncFn);
      wrappedFn(mockReq, mockRes, mockNext);

      // Give async operation time to complete
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Async error');
        done();
      }, 10);
    });
  });

  describe('createError', () => {
    it('should create error with all properties', () => {
      const error = createError('Test message', 422, 'TEST_CODE', { test: true }, { context: 'test' });

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ test: true });
      expect(error.context).toEqual({ context: 'test' });
      expect(error.isOperational).toBe(true);
    });

    it('should create error with default values', () => {
      const error = createError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });
});