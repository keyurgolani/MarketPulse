/**
 * Request validation utilities for MarketPulse backend
 * Provides validation helpers and sanitization functions
 */

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import type { ValidationErrorResponse } from '../types/api-contracts';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    code: string;
  }>;

  constructor(errors: z.ZodError) {
    super('Request validation failed');
    this.name = 'ValidationError';
    this.validationErrors = errors.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }
}

/**
 * Request validation options
 */
export interface ValidationOptions {
  /** Skip validation if data is undefined */
  skipUndefined?: boolean;
  /** Strip unknown properties */
  stripUnknown?: boolean;
  /** Allow extra properties */
  allowExtra?: boolean;
  /** Transform data after validation */
  transform?: boolean;
}

/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Validation schema map
 */
export interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}

/**
 * Create validation middleware for request validation
 */
export function validateRequest(
  schemas: ValidationSchemas,
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: z.ZodError[] = [];

      // Validate each target
      for (const [target, schema] of Object.entries(schemas)) {
        if (!schema) continue;

        const data = req[target as ValidationTarget];

        if (options.skipUndefined && data === undefined) {
          continue;
        }

        try {
          const result = schema.parse(data);

          // Update request with validated/transformed data
          if (options.transform) {
            (req as unknown as Record<string, unknown>)[target] = result;
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(error);
          }
        }
      }

      // If there are validation errors, throw them
      if (errors.length > 0) {
        const combinedError = new z.ZodError(
          errors.flatMap(error => error.issues)
        );
        throw new ValidationError(combinedError);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate request body
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return validateRequest({ body: schema }, options);
}

/**
 * Validate request query parameters
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return validateRequest({ query: schema }, options);
}

/**
 * Validate request parameters
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return validateRequest({ params: schema }, options);
}

/**
 * Validate request headers
 */
export function validateHeaders<T>(
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return validateRequest({ headers: schema }, options);
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .slice(0, 10000); // Limit length
  }

  /**
   * Sanitize HTML content (basic)
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';

    // Allow only basic formatting tags
    const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br'];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

    return input.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return '';
    });
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w@.-]/g, '') // Keep only valid email characters
      .slice(0, 254); // RFC 5321 limit
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(input: string): string {
    if (typeof input !== 'string') return '';

    try {
      const url = new URL(input);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }

      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize file path
   */
  static sanitizeFilePath(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
      .replace(/^\/+/, '') // Remove leading slashes
      .slice(0, 255); // Limit length
  }

  /**
   * Sanitize SQL input (basic)
   */
  static sanitizeSql(input: string): string {
    if (typeof input !== 'string') return '';

    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
    ];

    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }
}

/**
 * Rate limiting validation
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * File upload validation
 */
export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFiles?: number;
}

/**
 * Validate file upload
 */
export function validateFileUpload(config: FileUploadConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const files = (req as Request & { files?: unknown[] }).files;

      if (!files || files.length === 0) {
        return next();
      }

      // Type guard for file objects
      const isFileObject = (
        obj: unknown
      ): obj is {
        size: number;
        mimetype: string;
        originalname: string;
      } => {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'size' in obj &&
          'mimetype' in obj &&
          'originalname' in obj &&
          typeof (obj as Record<string, unknown>).size === 'number' &&
          typeof (obj as Record<string, unknown>).mimetype === 'string' &&
          typeof (obj as Record<string, unknown>).originalname === 'string'
        );
      };

      // Check number of files
      if (config.maxFiles && files.length > config.maxFiles) {
        const error = new Error(
          `Too many files. Maximum allowed: ${config.maxFiles}`
        ) as Error & { statusCode: number };
        error.statusCode = 400;
        throw error;
      }

      // Validate each file
      for (const file of files) {
        if (!isFileObject(file)) {
          const error = new Error('Invalid file object') as Error & {
            statusCode: number;
          };
          error.statusCode = 400;
          throw error;
        }

        // Check file size
        if (file.size > config.maxFileSize) {
          const error = new Error(
            `File too large. Maximum size: ${config.maxFileSize} bytes`
          ) as Error & { statusCode: number };
          error.statusCode = 400;
          throw error;
        }

        // Check MIME type
        if (!config.allowedMimeTypes.includes(file.mimetype)) {
          const error = new Error(
            `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`
          ) as Error & { statusCode: number };
          error.statusCode = 400;
          throw error;
        }

        // Check file extension
        const extension = file.originalname.split('.').pop()?.toLowerCase();
        if (!extension || !config.allowedExtensions.includes(extension)) {
          const error = new Error(
            `Invalid file extension. Allowed extensions: ${config.allowedExtensions.join(', ')}`
          ) as Error & { statusCode: number };
          error.statusCode = 400;
          throw error;
        }

        // Sanitize filename
        (file as { originalname: string }).originalname =
          InputSanitizer.sanitizeFilePath(file.originalname);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const CommonValidationSchemas = {
  /** UUID parameter validation */
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  /** Pagination query validation */
  paginationQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** Search query validation */
  searchQuery: z.object({
    q: z.string().min(1).max(200).optional(),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  /** Date range query validation */
  dateRangeQuery: z
    .object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    })
    .refine(
      data => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
      },
      {
        message: 'Start date must be before end date',
        path: ['dateRange'],
      }
    ),

  /** Asset symbol validation */
  assetSymbol: z.object({
    symbol: z.string().regex(/^[A-Z]{1,10}$/, 'Invalid stock symbol format'),
  }),

  /** Refresh cache request validation */
  refreshCacheBody: z.object({
    symbols: z
      .array(z.string().regex(/^[A-Z]{1,10}$/))
      .max(100)
      .optional(),
    categories: z.array(z.string().max(50)).max(20).optional(),
    force: z.boolean().default(false),
  }),
};

/**
 * Validation error handler middleware
 */
export function validationErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof ValidationError) {
    const response: ValidationErrorResponse = {
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path: req.path,
      details: error.validationErrors,
      validationErrors: error.validationErrors,
    };

    res.status(400).json(response);
    return;
  }

  next(error);
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      const error = new Error(
        `Request too large. Maximum size: ${maxSize} bytes`
      );
      (error as unknown as { statusCode: number }).statusCode = 413;
      return next(error);
    }

    next();
  };
}

/**
 * Content type validation middleware
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('content-type');

    if (
      !contentType ||
      !allowedTypes.some(type => contentType.includes(type))
    ) {
      const error = new Error(
        `Invalid content type. Allowed types: ${allowedTypes.join(', ')}`
      );
      (error as unknown as { statusCode: number }).statusCode = 415;
      return next(error);
    }

    next();
  };
}
