import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

// Extend Request interface for custom properties
interface ExtendedRequest extends Request {
  id?: string;
  user?: { id: string };
}

// Create a stream for Morgan HTTP logging
export const logStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Custom token for request ID
morgan.token('id', (req: Request): string => {
  return (req as ExtendedRequest).id || 'unknown';
});

// Custom token for user ID
morgan.token('user', (req: Request) => {
  return (req as ExtendedRequest).user?.id || 'anonymous';
});

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom token for request body size
morgan.token('req-size', (req: Request) => {
  return req.get('content-length') || '0';
});

// Custom token for response body size
morgan.token('res-size', (req: Request, res: Response) => {
  return res.get('content-length') || '0';
});

// Define different log formats
const formats = {
  development:
    ':id :method :url :status :response-time-ms - :req-size/:res-size bytes - :user-agent',
  production: JSON.stringify({
    id: ':id',
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time-ms',
    requestSize: ':req-size',
    responseSize: ':res-size',
    userAgent: ':user-agent',
    remoteAddr: ':remote-addr',
    user: ':user',
    timestamp: ':date[iso]',
  }),
  combined:
    ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms',
};

// Create Morgan middleware
export const httpLogger = morgan(
  config.nodeEnv === 'production' ? formats.production : formats.development,
  {
    stream: logStream,
    skip: (req: Request, res: Response) => {
      // Skip logging for health checks in production
      if (config.nodeEnv === 'production' && req.path === '/api/health') {
        return true;
      }
      // Skip successful requests in test environment
      if (config.nodeEnv === 'test') {
        return res.statusCode < 400;
      }
      return false;
    },
  }
);

// Request ID middleware
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id =
    req.get('X-Request-ID') ||
    req.get('X-Correlation-ID') ||
    generateRequestId();
  (req as ExtendedRequest).id = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// Response time middleware
export const responseTime = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Set response time header before response is sent
  const originalSend = res.send;
  res.send = function (body: unknown): Response {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', duration);
    }

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: (req as ExtendedRequest).id,
        method: req.method,
        url: req.url,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

// Request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: (req as ExtendedRequest).id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
  });

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    if (
      sanitizedBody &&
      typeof sanitizedBody === 'object' &&
      Object.keys(sanitizedBody).length > 0
    ) {
      logger.debug('Request body', {
        requestId: (req as ExtendedRequest).id,
        body: sanitizedBody,
      });
    }
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body: unknown): Response {
    const duration = Date.now() - startTime;

    // Log response
    logger.info('Outgoing response', {
      requestId: (req as ExtendedRequest).id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentType: res.get('Content-Type'),
      contentLength: res.get('Content-Length'),
    });

    // Log response body for errors or debug mode
    if (res.statusCode >= 400 || config.nodeEnv === 'development') {
      const sanitizedResponse = sanitizeResponseBody(body);
      if (sanitizedResponse) {
        logger.debug('Response body', {
          requestId: (req as ExtendedRequest).id,
          statusCode: res.statusCode,
          body: sanitizedResponse,
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
};

// Error logging middleware
export const errorLogger = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Request error', {
    requestId: (req as ExtendedRequest).id,
    method: req.method,
    url: req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body ? sanitizeRequestBody(req.body) : undefined,
  });
  next(error);
};

// Security event logging middleware
export const securityLogger = (
  event: string,
  req: Request,
  details?: Record<string, unknown>
): void => {
  logger.warn(`Security event: ${event}`, {
    requestId: (req as ExtendedRequest).id,
    event,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Audit logging middleware
export const auditLogger = (
  action: string,
  req: Request,
  details?: Record<string, unknown>
): void => {
  logger.info(`Audit event: ${action}`, {
    requestId: (req as ExtendedRequest).id,
    action,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: (req as ExtendedRequest).user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeRequestBody(body: unknown): unknown {
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
  ];

  const sanitized = { ...(body as Record<string, unknown>) };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key]);
    }
  }

  return sanitized;
}

function sanitizeResponseBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // Don't log large response bodies
  const bodyString = JSON.stringify(body);
  if (bodyString.length > 10000) {
    return {
      message: '[Response body too large to log]',
      size: bodyString.length,
    };
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
  ];

  const sanitized = { ...(body as Record<string, unknown>) };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Export types for TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
      user?: { id: string };
    }
  }
}
