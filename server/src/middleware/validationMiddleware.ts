import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler';
import { logger } from '../utils/logger';

// Validation target types
type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

// Validation middleware options
interface ValidationOptions {
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  abortEarly?: boolean;
}

// Create validation middleware for a specific schema and target
export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = 'body',
  _options: ValidationOptions = {}
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      
      // Parse and validate the data
      const result = schema.parse(data);
      
      // Replace the original data with validated/transformed data
      (req as any)[target] = result;
      
      logger.debug('Validation successful', {
        target,
        url: req.url,
        method: req.method,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation failed', {
          target,
          url: req.url,
          method: req.method,
          errors: error.errors,
        });
        
        // Transform Zod errors into a more user-friendly format
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined,
        }));
        
        throw new ValidationError('Validation failed', validationErrors);
      }
      
      // Re-throw other errors
      throw error;
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional(),
  }),
  
  // Asset symbol validation
  assetSymbol: z.object({
    symbol: z.string()
      .regex(/^[A-Z]{1,5}$/, 'Symbol must be 1-5 uppercase letters')
      .transform(s => s.toUpperCase()),
  }),
  
  // ID parameter validation
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  
  // Search query validation
  searchQuery: z.object({
    q: z.string().min(1).max(100).trim(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  
  // Date range validation
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(
    (data) => {
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
  
  // Timeframe validation for charts
  timeframe: z.object({
    timeframe: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']).default('1D'),
  }),
};

// Validation middleware for common patterns
export const validatePagination = validate(commonSchemas.pagination, 'query');
export const validateAssetSymbol = validate(commonSchemas.assetSymbol, 'params');
export const validateIdParam = validate(commonSchemas.idParam, 'params');
export const validateSearchQuery = validate(commonSchemas.searchQuery, 'query');
export const validateDateRange = validate(commonSchemas.dateRange, 'query');
export const validateTimeframe = validate(commonSchemas.timeframe, 'query');

// Body validation helpers
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
export const validateHeaders = (schema: ZodSchema) => validate(schema, 'headers');

// Sanitization middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Basic XSS prevention - remove script tags and javascript: protocols
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return value;
  };

  // Sanitize request data
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};