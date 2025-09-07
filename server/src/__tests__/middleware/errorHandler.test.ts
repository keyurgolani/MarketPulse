import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  ServiceError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  asyncHandler,
} from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('ServiceError handling', () => {
    it('should handle ServiceError with correct status and message', () => {
      const error = new ServiceError('Test error', 400, 'TEST_ERROR');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        code: 'TEST_ERROR',
        details: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Validation failed', {
        field: 'email',
      });

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
        timestamp: expect.any(Number),
      });
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
        details: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError();

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        details: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should handle ForbiddenError', () => {
      const error = new ForbiddenError();

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('should handle RateLimitError', () => {
      const error = new RateLimitError();

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(429);
    });
  });

  describe('ZodError handling', () => {
    it('should handle Zod validation errors', () => {
      const zodError = {
        name: 'ZodError',
        errors: [
          { path: ['email'], message: 'Invalid email' },
          { path: ['password'], message: 'Password too short' },
        ],
      };

      errorHandler(
        zodError as unknown as Error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: zodError.errors,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('JSON parsing errors', () => {
    it('should handle JSON syntax errors', () => {
      const syntaxError = new SyntaxError('Unexpected token');
      (syntaxError as SyntaxError & { body: boolean }).body = true;

      errorHandler(
        syntaxError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Database errors', () => {
    it('should handle SQLite errors', () => {
      const dbError = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');

      errorHandler(
        dbError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Database error occurred',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Generic errors', () => {
    it('should handle unknown errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Unknown error');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should handle unknown errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Unknown error');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Logging', () => {
    it('should log error details', () => {
      const error = new Error('Test error');
      (mockRequest as Request).user = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hash',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(logger.error).toHaveBeenCalledWith('API Error', {
        error: 'Test error',
        stack: error.stack,
        url: '/test',
        method: 'GET',
        userAgent: 'test-user-agent',
        ip: '127.0.0.1',
        userId: 'user123',
        timestamp: expect.any(String),
      });
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
