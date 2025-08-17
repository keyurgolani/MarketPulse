/**
 * Server-side validation utilities for MarketPulse backend
 * Provides request validation, sanitization, and security checks
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ParsedQs } from 'qs';

// =============================================================================
// Request Validation Schemas
// =============================================================================

/**
 * Dashboard creation request schema
 */
export const CreateDashboardRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform(val => val.trim()),
  description: z
    .string()
    .max(500)
    .optional()
    .transform(val => val?.trim()),
  isPublic: z.boolean().default(false),
  widgets: z.array(z.any()).default([]),
  layout: z
    .object({
      columns: z.number().min(1).max(12).default(4),
      rows: z.number().min(1).max(20).default(6),
      gap: z.number().min(0).max(50).default(16),
    })
    .default({
      columns: 4,
      rows: 6,
      gap: 16,
    }),
  tags: z
    .array(z.string())
    .default([])
    .transform(tags =>
      tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
    ),
});

/**
 * Dashboard update request schema
 */
export const UpdateDashboardRequestSchema =
  CreateDashboardRequestSchema.partial();

/**
 * Asset data request schema
 */
export const AssetDataRequestSchema = z.object({
  symbols: z.union([
    z
      .string()
      .transform(val => val.split(',').map(s => s.trim().toUpperCase())),
    z.array(z.string().transform(val => val.trim().toUpperCase())),
  ]),
  includeExtendedHours: z.boolean().default(false),
  includeIndicators: z.boolean().default(false),
  forceRefresh: z.boolean().default(false),
});

/**
 * Historical data request schema
 */
export const HistoricalDataRequestSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .transform(val => val.trim().toUpperCase()),
  timeframe: z.enum([
    '1m',
    '5m',
    '15m',
    '30m',
    '1h',
    '2h',
    '4h',
    '1d',
    '1w',
    '1M',
    '3M',
    '6M',
    '1y',
    '2y',
    '5y',
    'max',
  ]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  indicators: z.array(z.string()).default([]),
  adjustForSplits: z.boolean().default(true),
  adjustForDividends: z.boolean().default(true),
});

/**
 * News request schema
 */
export const NewsRequestSchema = z.object({
  sources: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  assets: z
    .array(z.string().transform(val => val.trim().toUpperCase()))
    .optional(),
  sentiment: z
    .array(
      z.enum([
        'very-negative',
        'negative',
        'neutral',
        'positive',
        'very-positive',
      ])
    )
    .optional(),
  languages: z.array(z.string().length(2)).default(['en']),
  breakingOnly: z.boolean().default(false),
  minReliability: z.number().min(0).max(100).default(0),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  sortBy: z
    .enum(['publishedAt', 'relevance', 'popularity', 'sentiment'])
    .default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * User preferences update schema
 */
export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultDashboard: z.string().uuid().optional(),
  refreshInterval: z.number().min(1000).max(300000).optional(),
  notifications: z
    .object({
      priceAlerts: z.boolean().optional(),
      newsUpdates: z.boolean().optional(),
      systemMessages: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
    })
    .optional(),
  accessibility: z
    .object({
      highContrast: z.boolean().optional(),
      reducedMotion: z.boolean().optional(),
      screenReaderOptimized: z.boolean().optional(),
      fontSize: z.enum(['small', 'medium', 'large', 'extra-large']).optional(),
    })
    .optional(),
  display: z
    .object({
      currency: z.string().length(3).optional(),
      timezone: z.string().optional(),
      dateFormat: z
        .enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'relative'])
        .optional(),
    })
    .optional(),
});

/**
 * Watchlist creation schema
 */
export const CreateWatchlistSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform(val => val.trim()),
  description: z
    .string()
    .max(500)
    .optional()
    .transform(val => val?.trim()),
  symbols: z
    .array(z.string().transform(val => val.trim().toUpperCase()))
    .default([]),
  isPublic: z.boolean().default(false),
  tags: z
    .array(z.string())
    .default([])
    .transform(tags =>
      tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
    ),
});

/**
 * Price alert creation schema
 */
export const CreatePriceAlertSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .transform(val => val.trim().toUpperCase()),
  type: z.enum(['price', 'volume', 'change', 'technical']),
  condition: z.object({
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
    field: z.enum(['price', 'change', 'changePercent', 'volume']),
    value: z.number(),
  }),
  targetValue: z.number(),
  message: z
    .string()
    .max(500)
    .optional()
    .transform(val => val?.trim()),
  expiresAt: z.string().datetime().optional(),
});

// =============================================================================
// Parameter Validation Schemas
// =============================================================================

/**
 * UUID parameter schema
 */
export const UUIDParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

/**
 * Symbol parameter schema
 */
export const SymbolParamSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9.-]+$/, 'Invalid symbol format')
    .transform(val => val.trim().toUpperCase()),
});

/**
 * Pagination query schema
 */
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(val => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('25')
    .transform(val => parseInt(val, 10)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z
    .string()
    .optional()
    .transform(val => val?.trim()),
});

/**
 * Date range query schema
 */
export const DateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timeRange: z
    .enum(['1h', '1d', '1w', '1m', '3m', '6m', '1y', 'all'])
    .optional(),
});

// =============================================================================
// Validation Middleware
// =============================================================================

/**
 * Create validation middleware for request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Request body validation failed',
          details: result.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: 'input' in err ? err.input : undefined,
          })),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      req.body = result.data;
      next();
    } catch {
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during validation',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Create validation middleware for request parameters
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          message: 'Request parameters validation failed',
          details: result.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: 'input' in err ? err.input : undefined,
          })),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      req.params = result.data as Record<string, string>;
      next();
    } catch {
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during parameter validation',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };
}

/**
 * Create validation middleware for query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          message: 'Query parameters validation failed',
          details: result.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: 'input' in err ? err.input : undefined,
          })),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      req.query = result.data as ParsedQs;
      next();
    } catch {
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
        message: 'An error occurred during query validation',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };
}

// =============================================================================
// Security and Sanitization Functions
// =============================================================================

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
}

/**
 * Sanitize SQL input to prevent injection
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/[';\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(
      /\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|SELECT)\b/gi,
      ''
    ) // Remove dangerous SQL keywords
    .trim();
}

/**
 * Validate and sanitize asset symbol
 */
export function validateAssetSymbol(symbol: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = symbol.trim().toUpperCase();

  if (!sanitized) {
    return { isValid: false, sanitized, error: 'Symbol cannot be empty' };
  }

  // Check for invalid characters first (before length check)
  if (!/^[A-Z0-9.-]+$/.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Symbol contains invalid characters',
    };
  }

  if (sanitized.length > 10) {
    return {
      isValid: false,
      sanitized,
      error: 'Symbol too long (max 10 characters)',
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate email format with additional security checks
 */
export function validateEmail(email: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = email.trim().toLowerCase();

  if (!sanitized) {
    return { isValid: false, sanitized, error: 'Email cannot be empty' };
  }

  if (sanitized.length > 254) {
    return { isValid: false, sanitized, error: 'Email too long' };
  }

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid email format' };
  }

  return { isValid: true, sanitized };
}

/**
 * Rate limiting validation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateRateLimit(_req: Request): {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
} {
  // This would integrate with your rate limiting service
  // For now, return a mock implementation
  return {
    allowed: true,
    remaining: 100,
    resetTime: new Date(Date.now() + 60000), // 1 minute from now
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: unknown): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Type guard for file object
  const isFileObject = (
    obj: unknown
  ): obj is { size: number; mimetype: string } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'size' in obj &&
      'mimetype' in obj &&
      typeof (obj as Record<string, unknown>).size === 'number' &&
      typeof (obj as Record<string, unknown>).mimetype === 'string'
    );
  };

  if (!isFileObject(file)) {
    return { isValid: false, error: 'Invalid file object' };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large (max 5MB)' };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return { isValid: false, error: 'Invalid file type' };
  }

  return { isValid: true };
}

/**
 * Validate IP address format
 */
export function validateIpAddress(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate user agent string
 */
export function validateUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.length > 500) {
    return false;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /<[^>]*>/,
    /eval\(/i,
    /expression\(/i,
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create standardized validation error response
 */
export function createValidationErrorResponse(
  errors: z.ZodError
): Record<string, unknown> {
  return {
    success: false,
    error: 'Validation failed',
    message: 'The request contains invalid data',
    details: errors.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: 'input' in err ? err.input : undefined,
    })),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log validation errors for monitoring
 */
export function logValidationError(req: Request, errors: z.ZodError): void {
  console.error('Validation Error:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    errors: errors.issues,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if request contains potentially malicious content
 */
export function containsMaliciousContent(data: unknown): boolean {
  const maliciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
  ];

  const dataString = JSON.stringify(data);
  return maliciousPatterns.some(pattern => pattern.test(dataString));
}
