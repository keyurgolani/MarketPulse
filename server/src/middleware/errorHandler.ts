import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
  context?: any;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;
  public context?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    context?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    if (code !== undefined) this.code = code;
    if (details !== undefined) this.details = details;
    if (context !== undefined) this.context = context;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string, details?: any) {
    super(`External service error: ${service} - ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any,
  context?: any
): AppError => {
  return new CustomError(message, statusCode, code, details, context);
};

// Error type detection functions
const isJoiValidationError = (error: any): boolean => {
  return error.isJoi === true;
};

const isMongoError = (error: any): boolean => {
  return error.name === 'MongoError' || error.name === 'MongoServerError';
};

const isCastError = (error: any): boolean => {
  return error.name === 'CastError';
};

const isDuplicateKeyError = (error: any): boolean => {
  return error.code === 11000;
};

const isValidationError = (error: any): boolean => {
  return error.name === 'ValidationError';
};

// Error transformation functions
const handleJoiValidationError = (error: any): AppError => {
  const details = error.details?.map((detail: any) => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));

  return new CustomError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    { fields: details }
  );
};

const handleMongoError = (error: any): AppError => {
  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return new ConflictError(
      `Duplicate value for ${field}`,
      { field, value: error.keyValue?.[field] }
    );
  }

  return new DatabaseError(
    'Database operation failed',
    { originalError: error.message }
  );
};

const handleCastError = (error: any): AppError => {
  return new ValidationError(
    `Invalid ${error.path}: ${error.value}`,
    { field: error.path, value: error.value, expectedType: error.kind }
  );
};

const handleValidationError = (error: any): AppError => {
  const errors = error.errors ? Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: err.message,
    value: err.value,
  })) : [];

  return new ValidationError(
    'Validation failed',
    { fields: errors }
  );
};

// Main error handler
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError;

  // Transform known error types
  if (error instanceof CustomError) {
    appError = error;
  } else if (isJoiValidationError(error)) {
    appError = handleJoiValidationError(error);
  } else if (isMongoError(error)) {
    appError = handleMongoError(error);
  } else if (isCastError(error)) {
    appError = handleCastError(error);
  } else if (isValidationError(error)) {
    appError = handleValidationError(error);
  } else {
    // Unknown error - treat as internal server error
    appError = new CustomError(
      error.message || 'Internal Server Error',
      error.statusCode || 500,
      error.code || 'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? { originalError: error } : undefined
    );
  }

  // Ensure statusCode is always defined
  const statusCode = appError.statusCode || 500;

  // Log error with context
  const errorContext = {
    requestId: (req as any).id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: (req as any).user?.id || 'anonymous',
    body: req.body && Object.keys(req.body).length > 0 ? sanitizeBody(req.body) : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
  };

  // Log based on error severity
  if (statusCode >= 500) {
    logger.error('Server error occurred', {
      error: {
        name: appError.name,
        message: appError.message,
        code: appError.code,
        stack: appError.stack,
        details: appError.details,
      },
      context: errorContext,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred', {
      error: {
        name: appError.name,
        message: appError.message,
        code: appError.code,
        details: appError.details,
      },
      context: errorContext,
    });
  }

  // Prepare response
  const response: any = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: statusCode,
    },
    requestId: (req as any).id,
    timestamp: new Date().toISOString(),
  };

  // Add details in development or for client errors
  if (process.env.NODE_ENV === 'development' || statusCode < 500) {
    if (appError.details) {
      response.error.details = appError.details;
    }
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = appError.stack;
  }

  // Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    response.error.message = 'Internal Server Error';
    delete response.error.details;
  }

  res.status(statusCode).json(response);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};

// Unhandled promise rejection handler
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });
  // Graceful shutdown
  process.exit(1);
};

// Uncaught exception handler
export const uncaughtExceptionHandler = (error: Error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
  // Graceful shutdown
  process.exit(1);
};

// Utility function to sanitize request body for logging
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'cookie',
    'session',
    'apiKey',
    'accessToken',
    'refreshToken',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }

  return sanitized;
}

// Error reporting service integration
export class ErrorReporter {
  private static instance: ErrorReporter;

  private constructor() {}

  public static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  public async reportError(error: AppError, context?: any): Promise<void> {
    try {
      // In a real application, you would integrate with services like:
      // - Sentry
      // - Bugsnag
      // - Rollbar
      // - Custom error tracking service

      logger.error('Error reported to external service', {
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
          details: error.details,
        },
        context,
        timestamp: new Date().toISOString(),
      });

      // Simulate external service call
      // await externalErrorService.report(error, context);
    } catch (reportingError) {
      logger.error('Failed to report error to external service', {
        originalError: error.message,
        reportingError: reportingError instanceof Error ? reportingError.message : reportingError,
      });
    }
  }
}

export const errorReporter = ErrorReporter.getInstance();