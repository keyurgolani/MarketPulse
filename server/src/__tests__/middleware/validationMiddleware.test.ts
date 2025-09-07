import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validate,
  validatePagination,
  validateAssetSymbol,
  validateIdParam,
  validateSearchQuery,
  validateDateRange,
  validateTimeframe,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  sanitizeInput,
} from '../../middleware/validationMiddleware';
import { ValidationError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger');

const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('ValidationMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'POST',
      body: {},
      query: {},
      params: {},
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock logger methods
    mockedLogger.debug = jest.fn();
    mockedLogger.warn = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate function', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    it('should validate and pass valid data', () => {
      mockReq.body = { name: 'John', age: 25 };
      const middleware = validate(testSchema, 'body');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({ name: 'John', age: 25 });
      expect(mockNext).toHaveBeenCalled();
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Validation successful',
        expect.objectContaining({
          target: 'body',
          url: '/test',
          method: 'POST',
        })
      );
    });

    it('should transform data according to schema', () => {
      const transformSchema = z.object({
        name: z.string().trim().toLowerCase(),
        count: z.coerce.number(),
      });

      mockReq.body = { name: '  JOHN  ', count: '42' };
      const middleware = validate(transformSchema, 'body');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({ name: 'john', count: 42 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid data', () => {
      mockReq.body = { name: '', age: -1 };
      const middleware = validate(testSchema, 'body');

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          target: 'body',
          errors: expect.any(Array),
        })
      );
    });

    it('should validate different targets (query, params, headers)', () => {
      const querySchema = z.object({ search: z.string() });
      const paramsSchema = z.object({ id: z.string().uuid() });
      const headersSchema = z.object({ 'x-api-key': z.string() });

      // Test query validation
      mockReq.query = { search: 'test' };
      const queryMiddleware = validate(querySchema, 'query');
      queryMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      jest.clearAllMocks();

      // Test params validation
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const paramsMiddleware = validate(paramsSchema, 'params');
      paramsMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      jest.clearAllMocks();

      // Test headers validation
      mockReq.headers = { 'x-api-key': 'secret-key' };
      const headersMiddleware = validate(headersSchema, 'headers');
      headersMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should re-throw non-Zod errors', () => {
      const errorSchema = z.object({}).transform(() => {
        throw new Error('Custom error');
      });

      mockReq.body = {};
      const middleware = validate(errorSchema, 'body');

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow('Custom error');
    });
  });

  describe('common schemas', () => {
    describe('pagination schema', () => {
      it('should validate and set defaults for pagination', () => {
        mockReq.query = {};
        validatePagination(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query).toEqual({
          page: 1,
          limit: 20,
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should validate custom pagination values', () => {
        mockReq.query = { page: '3', limit: '50' };
        validatePagination(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query).toEqual({
          page: 3,
          limit: 50,
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid pagination values', () => {
        mockReq.query = { page: '0', limit: '200' };

        expect(() => {
          validatePagination(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(ValidationError);
      });
    });

    describe('assetSymbol schema', () => {
      it('should validate and transform asset symbol', () => {
        mockReq.params = { symbol: 'AAPL' };

        validateAssetSymbol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.params).toEqual({ symbol: 'AAPL' });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid symbols', () => {
        mockReq.params = { symbol: 'TOOLONG' };

        expect(() => {
          validateAssetSymbol(
            mockReq as Request,
            mockRes as Response,
            mockNext
          );
        }).toThrow(ValidationError);
      });
    });

    describe('idParam schema', () => {
      it('should validate UUID format', () => {
        mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
        validateIdParam(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid UUID format', () => {
        mockReq.params = { id: 'invalid-uuid' };

        expect(() => {
          validateIdParam(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(ValidationError);
      });
    });

    describe('searchQuery schema', () => {
      it('should validate search query', () => {
        mockReq.query = { q: 'apple', limit: '5' };
        validateSearchQuery(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query).toEqual({ q: 'apple', limit: 5 });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should set default limit', () => {
        mockReq.query = { q: 'apple' };
        validateSearchQuery(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query).toEqual({ q: 'apple', limit: 10 });
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('dateRange schema', () => {
      it('should validate valid date range', () => {
        mockReq.query = {
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-12-31T23:59:59Z',
        };
        validateDateRange(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid date range (start after end)', () => {
        mockReq.query = {
          startDate: '2023-12-31T23:59:59Z',
          endDate: '2023-01-01T00:00:00Z',
        };

        expect(() => {
          validateDateRange(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(ValidationError);
      });
    });

    describe('timeframe schema', () => {
      it('should validate timeframe values', () => {
        mockReq.query = { timeframe: '1M' };
        validateTimeframe(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query).toEqual({ timeframe: '1M' });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should set default timeframe', () => {
        mockReq.query = {};
        validateTimeframe(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query).toEqual({ timeframe: '1D' });
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('validation helpers', () => {
    const testSchema = z.object({ test: z.string() });

    it('should create body validation middleware', () => {
      const middleware = validateBody(testSchema);
      mockReq.body = { test: 'value' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should create query validation middleware', () => {
      const middleware = validateQuery(testSchema);
      mockReq.query = { test: 'value' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should create params validation middleware', () => {
      const middleware = validateParams(testSchema);
      mockReq.params = { test: 'value' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should create headers validation middleware', () => {
      const middleware = validateHeaders(testSchema);
      mockReq.headers = { test: 'value' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeInput middleware', () => {
    it('should sanitize script tags from strings', () => {
      mockReq.body = {
        name: 'John<script>alert("xss")</script>',
        description: 'Safe content',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        name: 'John',
        description: 'Safe content',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize javascript: protocols', () => {
      mockReq.body = {
        url: 'javascript:alert("xss")',
        link: 'https://example.com',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        url: 'alert("xss")',
        link: 'https://example.com',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: 'John<script>alert("xss")</script>',
          profile: {
            bio: 'javascript:alert("nested")',
          },
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        user: {
          name: 'John',
          profile: {
            bio: 'alert("nested")',
          },
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize arrays', () => {
      mockReq.body = {
        items: [
          'safe',
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
        ],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        items: ['safe', '', 'alert("xss")'],
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query and params', () => {
      mockReq.query = { search: '<script>alert("xss")</script>' };
      mockReq.params = { id: 'javascript:alert("xss")' };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query).toEqual({ search: '' });
      expect(mockReq.params).toEqual({ id: 'alert("xss")' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-string values correctly', () => {
      mockReq.body = {
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.number).toBe(42);
      expect(mockReq.body.boolean).toBe(true);
      expect(mockReq.body.null).toBe(null);
      expect(mockReq.body.undefined).toBe(undefined);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim whitespace from strings', () => {
      mockReq.body = {
        name: '  John Doe  ',
        description: '\t\nTest content\n\t',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        name: 'John Doe',
        description: 'Test content',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
