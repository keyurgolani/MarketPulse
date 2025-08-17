/**
 * Server-side type definition tests for MarketPulse backend
 * Tests API contracts, validation middleware, and error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { z } from 'zod';

// Import server-side types and utilities
import {
  ApiHandler,
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  createSuccessResponse,
  createPaginatedResponse,
  createErrorResponse,
  asyncHandler,
  createHandler,
  createPaginatedHandler,
} from '../types/api-contracts';

import {
  CreateDashboardRequestSchema,
  AssetDataRequestSchema,
  NewsRequestSchema,
  UpdateUserPreferencesSchema,
  UUIDParamSchema,
  SymbolParamSchema,
  PaginationQuerySchema,
  validateBody,
  validateParams,
  validateQuery,
  sanitizeHtml,
  sanitizeSql,
  validateAssetSymbol,
  validateEmail,
  validateFileUpload,
  validateIpAddress,
  validateUserAgent,
  createValidationErrorResponse,
  containsMaliciousContent,
} from '../utils/validation';

// =============================================================================
// Mock Setup
// =============================================================================

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    body: {},
    query: {},
    params: {},
    headers: {},
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    get: vi.fn(),
    ...overrides,
  }) as Request;

const createMockResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    success: vi.fn(),
    error: vi.fn(),
    paginated: vi.fn(),
  };
  return res as unknown as Response;
};

// =============================================================================
// API Contract Types Tests
// =============================================================================

describe('API Contract Types', () => {
  describe('TypedRequest', () => {
    it('should extend Express Request with typed properties', () => {
      const req: TypedRequest<
        { name: string },
        { page: number },
        { id: string }
      > = {
        ...createMockRequest(),
        body: { name: 'test' },
        query: { page: 1 },
        params: { id: '123' },
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
        },
      };

      expect(req.body.name).toBe('test');
      expect(req.query.page).toBe(1);
      expect(req.params.id).toBe('123');
      expect(req.user?.id).toBe('user-123');
    });
  });

  describe('Error Classes', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError(400, 'Bad Request', 'INVALID_INPUT');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.name).toBe('ApiError');
    });

    it('should create ValidationError with field errors', () => {
      const fieldErrors = [
        { field: 'email', message: 'Invalid email', code: 'invalid_email' },
      ];
      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual(fieldErrors);
      expect(error.name).toBe('ValidationError');
    });

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create AuthorizationError', () => {
      const error = new AuthorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Insufficient permissions');
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('Dashboard');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Dashboard not found');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create RateLimitError', () => {
      const resetTime = new Date();
      const error = new RateLimitError(resetTime, 100);

      expect(error.statusCode).toBe(429);
      expect(error.resetTime).toBe(resetTime);
      expect(error.limit).toBe(100);
      expect(error.name).toBe('RateLimitError');
    });

    it('should create ExternalServiceError', () => {
      const originalError = new Error('Connection failed');
      const error = new ExternalServiceError('Yahoo Finance', originalError);

      expect(error.statusCode).toBe(502);
      expect(error.service).toBe('Yahoo Finance');
      expect(error.details).toBe(originalError);
      expect(error.name).toBe('ExternalServiceError');
    });
  });

  describe('Response Helpers', () => {
    it('should create success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(typeof response.timestamp).toBe('number');
    });

    it('should create paginated response', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const pagination = { page: 1, limit: 10, total: 2, totalPages: 1 };
      const response = createPaginatedResponse(data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(false);
    });

    it('should create error response', () => {
      const response = createErrorResponse('Test error', 400, {
        field: 'email',
      });

      expect(response.error).toBe('Test error');
      expect(response.statusCode).toBe(400);
      expect(response.details).toEqual({ field: 'email' });
    });
  });

  describe('Handler Helpers', () => {
    it('should wrap async handlers', async () => {
      const mockHandler: ApiHandler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = asyncHandler(mockHandler);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await wrappedHandler(req as Request, res as Response, next);

      expect(mockHandler).toHaveBeenCalledWith(req, res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch async handler errors', async () => {
      const error = new Error('Test error');
      const mockHandler: ApiHandler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(mockHandler);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await wrappedHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should create typed handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ id: '123' });
      const typedHandler = createHandler(mockHandler);
      const req = createMockRequest();
      const res = createMockResponse();
      (res as Response & { success: (data: unknown) => void }).success =
        vi.fn();

      await typedHandler(req as Request, res as Response, vi.fn());

      expect(mockHandler).toHaveBeenCalledWith(req, res);
      expect(
        (res as Response & { success: (data: unknown) => void }).success
      ).toHaveBeenCalledWith({ id: '123' });
    });

    it('should create paginated handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        total: 1,
        page: 1,
        limit: 10,
      });
      const paginatedHandler = createPaginatedHandler(mockHandler);
      const req = createMockRequest();
      const res = createMockResponse();
      (
        res as Response & {
          paginated: (data: unknown[], meta: unknown) => void;
        }
      ).paginated = vi.fn();

      await paginatedHandler(req as Request, res as Response, vi.fn());

      expect(
        (
          res as Response & {
            paginated: (data: unknown[], meta: unknown) => void;
          }
        ).paginated
      ).toHaveBeenCalledWith(
        [{ id: '1' }],
        expect.objectContaining({
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        })
      );
    });
  });
});

// =============================================================================
// Validation Schema Tests
// =============================================================================

describe('Validation Schemas', () => {
  describe('Request Schemas', () => {
    it('should validate dashboard creation request', () => {
      const validRequest = {
        name: 'My Dashboard',
        description: 'A test dashboard',
        isPublic: false,
        tags: ['test', 'demo'],
      };

      const result = CreateDashboardRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe('My Dashboard');
        expect(result.data.tags).toEqual(['test', 'demo']);
      }
    });

    it('should validate asset data request', () => {
      const validRequest = {
        symbols: 'AAPL,GOOGL,MSFT',
        includeExtendedHours: true,
        forceRefresh: false,
      };

      const result = AssetDataRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.symbols).toEqual(['AAPL', 'GOOGL', 'MSFT']);
        expect(result.data.includeExtendedHours).toBe(true);
      }
    });

    it('should validate news request', () => {
      const validRequest = {
        categories: ['market-news', 'earnings'],
        assets: ['AAPL'],
        limit: 25,
        sortBy: 'publishedAt',
      };

      const result = NewsRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.categories).toEqual(['market-news', 'earnings']);
        expect(result.data.assets).toEqual(['AAPL']);
      }
    });

    it('should validate user preferences update', () => {
      const validRequest = {
        theme: 'dark',
        refreshInterval: 30000,
        notifications: {
          priceAlerts: false,
        },
      };

      const result = UpdateUserPreferencesSchema.safeParse(validRequest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.theme).toBe('dark');
        expect(result.data.refreshInterval).toBe(30000);
      }
    });
  });

  describe('Parameter Schemas', () => {
    it('should validate UUID parameters', () => {
      const validUuid = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const invalidUuid = { id: 'not-a-uuid' };

      expect(UUIDParamSchema.safeParse(validUuid).success).toBe(true);
      expect(UUIDParamSchema.safeParse(invalidUuid).success).toBe(false);
    });

    it('should validate symbol parameters', () => {
      const validSymbol = { symbol: 'AAPL' };
      const invalidSymbol = { symbol: 'invalid symbol' };

      const validResult = SymbolParamSchema.safeParse(validSymbol);
      const invalidResult = SymbolParamSchema.safeParse(invalidSymbol);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);

      if (validResult.success) {
        expect(validResult.data.symbol).toBe('AAPL');
      }
    });

    it('should validate pagination query', () => {
      const validQuery = {
        page: '2',
        limit: '50',
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = PaginationQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe('asc');
      }
    });
  });
});

// =============================================================================
// Validation Middleware Tests
// =============================================================================

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    it('should validate request body successfully', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validateBody(schema);
      const req = createMockRequest({ body: { name: 'test' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next);

      expect(req.body).toEqual({ name: 'test' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid body', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validateBody(schema);
      const req = createMockRequest({ body: { name: 123 } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should validate request parameters successfully', () => {
      const schema = z.object({ id: z.string().uuid() });
      const middleware = validateParams(schema);
      const req = createMockRequest({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid parameters', () => {
      const schema = z.object({ id: z.string().uuid() });
      const middleware = validateParams(schema);
      const req = createMockRequest({ params: { id: 'invalid-uuid' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid parameters',
        })
      );
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters successfully', () => {
      const schema = z.object({
        page: z
          .string()
          .transform(val => parseInt(val, 10))
          .pipe(z.number().min(1)),
      });
      const middleware = validateQuery(schema);
      const req = createMockRequest({ query: { page: '2' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Security and Sanitization Tests
// =============================================================================

describe('Security and Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove HTML tags and dangerous content', () => {
      const maliciousInput = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('Safe content');
    });

    it('should remove event handlers', () => {
      const maliciousInput = '<div onclick="alert(1)">Click me</div>';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).toContain('Click me');
    });
  });

  describe('sanitizeSql', () => {
    it('should remove SQL injection patterns', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = sanitizeSql(maliciousInput);

      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain('DROP');
    });
  });

  describe('validateAssetSymbol', () => {
    it('should validate correct asset symbols', () => {
      const result = validateAssetSymbol('AAPL');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('AAPL');
    });

    it('should reject invalid symbols', () => {
      const result = validateAssetSymbol('invalid symbol');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject empty symbols', () => {
      const result = validateAssetSymbol('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject symbols that are too long', () => {
      const result = validateAssetSymbol('VERYLONGSYMBOL');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should reject invalid email formats', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should reject empty emails', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct file uploads', () => {
      const mockFile = {
        size: 1024 * 1024, // 1MB
        mimetype: 'image/jpeg',
      };

      const result = validateFileUpload(mockFile);
      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const mockFile = {
        size: 10 * 1024 * 1024, // 10MB
        mimetype: 'image/jpeg',
      };

      const result = validateFileUpload(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject invalid file types', () => {
      const mockFile = {
        size: 1024,
        mimetype: 'application/javascript',
      };

      const result = validateFileUpload(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject missing files', () => {
      const result = validateFileUpload(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No file provided');
    });
  });

  describe('validateIpAddress', () => {
    it('should validate IPv4 addresses', () => {
      expect(validateIpAddress('192.168.1.1')).toBe(true);
      expect(validateIpAddress('10.0.0.1')).toBe(true);
      expect(validateIpAddress('255.255.255.255')).toBe(true);
    });

    it('should validate IPv6 addresses', () => {
      expect(validateIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(
        true
      );
    });

    it('should reject invalid IP addresses', () => {
      expect(validateIpAddress('256.256.256.256')).toBe(false);
      expect(validateIpAddress('not-an-ip')).toBe(false);
      expect(validateIpAddress('')).toBe(false);
    });
  });

  describe('validateUserAgent', () => {
    it('should validate normal user agents', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(validateUserAgent(userAgent)).toBe(true);
    });

    it('should reject suspicious user agents', () => {
      expect(validateUserAgent('<script>alert(1)</script>')).toBe(false);
      expect(validateUserAgent('javascript:void(0)')).toBe(false);
      expect(validateUserAgent('eval(malicious_code)')).toBe(false);
    });

    it('should reject empty or too long user agents', () => {
      expect(validateUserAgent('')).toBe(false);
      expect(validateUserAgent('a'.repeat(600))).toBe(false);
    });
  });

  describe('containsMaliciousContent', () => {
    it('should detect malicious scripts', () => {
      const maliciousData = {
        content: '<script>alert("xss")</script>',
        description: 'Safe content',
      };

      expect(containsMaliciousContent(maliciousData)).toBe(true);
    });

    it('should detect javascript protocols', () => {
      const maliciousData = {
        url: 'javascript:alert(1)',
        title: 'Safe title',
      };

      expect(containsMaliciousContent(maliciousData)).toBe(true);
    });

    it('should detect event handlers', () => {
      const maliciousData = {
        html: '<div onclick="malicious()">Click</div>',
      };

      expect(containsMaliciousContent(maliciousData)).toBe(true);
    });

    it('should allow safe content', () => {
      const safeData = {
        title: 'Safe Title',
        description: 'This is safe content',
        url: 'https://example.com',
      };

      expect(containsMaliciousContent(safeData)).toBe(false);
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create standardized validation error response', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
          input: 123,
        },
      ]);

      const response = createValidationErrorResponse(zodError);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Validation failed');
      expect(response.details).toHaveLength(1);
      expect(
        (response.details as Array<{ field: string; message: string }>)[0].field
      ).toBe('name');
      expect(
        (response.details as Array<{ field: string; message: string }>)[0]
          .message
      ).toBe('Expected string, received number');
    });
  });
});
