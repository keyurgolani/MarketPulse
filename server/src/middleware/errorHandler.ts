import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class ServiceError extends Error implements ApiError {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'SERVICE_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends ServiceError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error with context
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as Request & { user?: { id: string } }).user?.id,
    timestamp: new Date().toISOString(),
  });

  // Handle known API errors
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: Date.now(),
    });
    return;
  }

  // Handle validation errors from Zod or other validators
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: (error as ZodError).errors,
      timestamp: Date.now(),
    });
    return;
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      timestamp: Date.now(),
    });
    return;
  }

  // Handle database errors
  if (error.message.includes('SQLITE_')) {
    res.status(500).json({
      success: false,
      error: 'Database error occurred',
      code: 'DATABASE_ERROR',
      timestamp: Date.now(),
    });
    return;
  }

  // Handle unhandled errors
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: Date.now(),
  });
};

// Async error wrapper for route handlers
export const asyncHandler = (
  fn: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<Response | void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
