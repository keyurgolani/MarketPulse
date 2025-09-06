import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger, loggerStream } from '../utils/logger';

// Custom token for user ID
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom token for request ID (if available)
morgan.token('request-id', (req: Request) => {
  return (req as any).requestId || 'unknown';
});

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, _res: Response) => {
  const startTime = (req as any).startTime;
  if (!startTime) return '0';
  return `${Date.now() - startTime}ms`;
});

// Development format - more verbose
const developmentFormat = ':method :url :status :response-time ms - :res[content-length] bytes - User: :user-id';

// Production format - structured for log aggregation
const productionFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  userId: ':user-id',
  requestId: ':request-id',
  remoteAddr: ':remote-addr',
  timestamp: ':date[iso]',
});

// Request timing middleware
export const requestTiming = (req: Request, _res: Response, next: NextFunction): void => {
  (req as any).startTime = Date.now();
  next();
};

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = Math.random().toString(36).substring(2, 15);
  (req as any).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// Morgan HTTP request logger
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    stream: loggerStream,
    skip: (req: Request) => {
      // Skip health check requests in production to reduce noise
      if (process.env.NODE_ENV === 'production' && req.url === '/api/system/health') {
        return true;
      }
      return false;
    },
  }
);

// Custom request logger for detailed logging
export const detailedRequestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request details
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: (req as any).user?.id,
    requestId: (req as any).requestId,
  });

  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      userId: (req as any).user?.id,
      requestId: (req as any).requestId,
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};