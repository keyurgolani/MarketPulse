import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// CORS configuration interface
interface CorsConfig {
  origins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

// Default CORS configuration
const defaultCorsConfig: CorsConfig = {
  origins: [
    process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    'http://localhost:3000', // Alternative frontend port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
};

// Add production origins if in production
if (process.env.NODE_ENV === 'production') {
  const productionOrigins = process.env.PRODUCTION_ORIGINS?.split(',') ?? [];
  defaultCorsConfig.origins.push(...productionOrigins);
}

// Dynamic origin validation
const originValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in allowed list
  if (defaultCorsConfig.origins.includes(origin)) {
    logger.debug('CORS: Origin allowed', { origin });
    return callback(null, true);
  }

  // In development, allow localhost with any port
  if (process.env.NODE_ENV === 'development') {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      logger.debug('CORS: Development localhost allowed', { origin });
      return callback(null, true);
    }
  }

  // Log rejected origins for debugging
  logger.warn('CORS: Origin rejected', {
    origin,
    allowedOrigins: defaultCorsConfig.origins,
  });

  callback(new Error(`Origin ${origin} not allowed by CORS policy`));
};

// CORS middleware configuration
export const corsMiddleware = cors({
  origin: originValidator,
  credentials: defaultCorsConfig.credentials,
  methods: defaultCorsConfig.methods,
  allowedHeaders: defaultCorsConfig.allowedHeaders,
  exposedHeaders: defaultCorsConfig.exposedHeaders,
  maxAge: defaultCorsConfig.maxAge,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
});

// Preflight handler for complex requests
export const preflightHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.method === 'OPTIONS') {
    logger.debug('CORS: Preflight request', {
      origin: req.get('Origin'),
      method: req.get('Access-Control-Request-Method'),
      headers: req.get('Access-Control-Request-Headers'),
    });
  }
  next();
};

// CORS error handler
export const corsErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.message.includes('CORS')) {
    logger.error('CORS Error', {
      error: err.message,
      origin: req.get('Origin'),
      method: req.method,
      url: req.url,
    });

    res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      code: 'CORS_ERROR',
      timestamp: Date.now(),
    });
    return;
  }
  next(err);
};
