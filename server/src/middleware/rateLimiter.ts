import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  public store: RateLimitStore = {}; // Made public for testing
  private windowMs: number;
  private maxRequests: number;
  public cleanupInterval: NodeJS.Timeout; // Made public for testing

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  private getKey(req: Request): string {
    // Use IP address as the key, with fallback to socket address
    // Check for forwarded IP first
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0]!.trim();
    }
    return (
      req.ip ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      'unknown'
    );
  }

  public cleanup(): void {
    // Made public for testing
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, data] of Object.entries(this.store)) {
      if (now > data.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      delete this.store[key];
    });

    if (keysToDelete.length > 0) {
      logger.debug(
        `Rate limiter cleanup: removed ${keysToDelete.length} expired entries`
      );
    }
  }

  public middleware(): (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const key = this.getKey(req);
        const now = Date.now();

        // Initialize or reset if window has passed
        if (!this.store[key] || now > this.store[key].resetTime) {
          this.store[key] = {
            count: 0,
            resetTime: now + this.windowMs,
          };
        }

        // Increment request count
        this.store[key].count++;

        // Set rate limit headers
        const remaining = Math.max(0, this.maxRequests - this.store[key].count);
        const resetTime = Math.ceil((this.store[key].resetTime - now) / 1000);

        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);

        // Check if limit exceeded
        if (this.store[key].count > this.maxRequests) {
          logger.warn('Rate limit exceeded', {
            ip: key,
            count: this.store[key].count,
            limit: this.maxRequests,
            userAgent: req.get('User-Agent'),
            path: req.path,
          });

          res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${resetTime} seconds.`,
            retryAfter: resetTime,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Rate limiter error', { error });
        // Allow request to proceed if rate limiting fails
        next();
      }
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
  }
}

// Create rate limiter instances for different endpoints
// Use more lenient limits during E2E testing (when running production mode with test data)
const isE2ETesting =
  process.env.NODE_ENV === 'production' &&
  (process.env.USE_MOCK_DATA === 'true' ||
    process.env.DATABASE_URL?.includes('test') ||
    process.env.PORT === '3001'); // Default test port

const generalLimiter = new RateLimiter(
  isE2ETesting ? 60 * 1000 : 15 * 60 * 1000, // 1 minute vs 15 minutes
  isE2ETesting ? 500 : 100 // 500 vs 100 requests
);
const apiLimiter = new RateLimiter(
  isE2ETesting ? 60 * 1000 : 15 * 60 * 1000, // 1 minute vs 15 minutes
  isE2ETesting ? 5000 : 1000 // 5000 vs 1000 requests
);
const strictLimiter = new RateLimiter(
  60 * 1000, // 1 minute
  isE2ETesting ? 100 : 10 // 100 vs 10 requests per minute
);

// Middleware function that applies appropriate rate limiting based on path
export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip rate limiting in test environment only for specific tests
  if (config.nodeEnv === 'test' && !process.env.TEST_RATE_LIMITING) {
    next();
    return;
  }

  // Apply strict limiting to sensitive endpoints
  if (req.path.includes('/logs') || req.path.includes('/system')) {
    strictLimiter.middleware()(req, res, next);
    return;
  }

  // Apply API limiting to API endpoints
  if (req.path.startsWith('/api/')) {
    apiLimiter.middleware()(req, res, next);
    return;
  }

  // Apply general limiting to all other endpoints
  generalLimiter.middleware()(req, res, next);
};

// Export limiter instances for testing
export { generalLimiter, apiLimiter, strictLimiter };
