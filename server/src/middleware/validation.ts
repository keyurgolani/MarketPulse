import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@/middleware/errorHandler';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export const validate = (
  schema: ValidationSchema
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string; type: string }> = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push({
          location: 'body',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push({
          location: 'query',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, {
        abortEarly: false,
      });
      if (error) {
        errors.push({
          location: 'params',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error } = schema.headers.validate(req.headers, {
        abortEarly: false,
      });
      if (error) {
        errors.push({
          location: 'headers',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    if (errors.length > 0) {
      const validationError = new ValidationError('Request validation failed', {
        validationErrors: errors,
      });
      return next(validationError);
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0),
  }),

  // Sorting
  sorting: Joi.object({
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
  }),

  // Search
  search: Joi.object({
    q: Joi.string().min(1).max(100),
    search: Joi.string().min(1).max(100),
  }),

  // ID parameter
  idParam: Joi.object({
    id: Joi.string().required(),
  }),

  // MongoDB ObjectId
  objectIdParam: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),

  // Email
  email: Joi.string().email().required(),

  // Password
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    }),

  // URL
  url: Joi.string().uri().required(),

  // Phone number
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),

  // File upload
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number()
      .integer()
      .min(1)
      .max(10 * 1024 * 1024), // 10MB max
    buffer: Joi.binary().required(),
  }),
};

// Validation helpers
export const validateEmail = (email: string): boolean => {
  const { error } = commonSchemas.email.validate(email);
  return !error;
};

export const validatePassword = (password: string): boolean => {
  const { error } = commonSchemas.password.validate(password);
  return !error;
};

export const validateUrl = (url: string): boolean => {
  const { error } = commonSchemas.url.validate(url);
  return !error;
};

export const validateObjectId = (id: string): boolean => {
  const { error } = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .validate(id);
  return !error;
};

// Custom Joi extensions
export const customJoi = Joi.extend({
  type: 'objectId',
  base: Joi.string(),
  messages: {
    'objectId.base': '{{#label}} must be a valid ObjectId',
  },
  validate(value, helpers) {
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return { value, errors: helpers.error('objectId.base') };
    }
    return { value };
  },
});

// Sanitization middleware
export const sanitize = (
  schema: Joi.ObjectSchema
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      const validationError = new ValidationError(
        'Request sanitization failed',
        {
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        }
      );
      return next(validationError);
    }

    req.body = value;
    next();
  };
};

// Rate limiting validation
export const rateLimitSchema = Joi.object({
  windowMs: Joi.number()
    .integer()
    .min(1000)
    .max(24 * 60 * 60 * 1000)
    .default(15 * 60 * 1000), // 15 minutes
  max: Joi.number().integer().min(1).max(10000).default(100),
  message: Joi.string().max(200).default('Too many requests'),
});

// Health check validation
export const healthCheckSchema = {
  query: Joi.object({
    detailed: Joi.boolean().default(false),
    includeServices: Joi.boolean().default(true),
  }),
};

// Logging validation
export const loggingSchema = {
  query: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'http', 'debug'),
    category: Joi.string().max(50),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    search: Joi.string().min(1).max(200),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
  }),
  params: Joi.object({
    filename: Joi.string()
      .pattern(/^[\w\-. ]+\.log$/)
      .required(),
  }),
  cleanup: Joi.object({
    maxAge: Joi.number().integer().min(1).max(365),
    maxSize: Joi.number().integer().min(1024),
    maxFiles: Joi.number().integer().min(1).max(1000),
  }),
  archive: Joi.object({
    maxAge: Joi.number().integer().min(1).max(365).default(30),
  }),
};

// Cache validation
export const cacheSchema = {
  params: Joi.object({
    key: Joi.string().min(1).max(250).required(),
  }),
  body: Joi.object({
    value: Joi.any().required(),
    ttl: Joi.number().integer().min(1).max(86400).default(3600), // 1 hour default
  }),
  query: Joi.object({
    pattern: Joi.string().min(1).max(100),
  }),
};

// System validation
export const systemSchema = {
  query: Joi.object({
    detailed: Joi.boolean().default(false),
    includeEnv: Joi.boolean().default(false),
  }),
};
