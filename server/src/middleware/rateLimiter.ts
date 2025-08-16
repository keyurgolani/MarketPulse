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
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private getKey(req: Request): string {
    // Use IP address as the key, with fallback to socket address
    // Check for forwarded IP first
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0]!.trim();
    }
    return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
  }

  public cleanup(): void { // Made public for testing
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
      logger.debug(`Rate limiter cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
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

          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${resetTime} seconds.`,
            retryAfter: resetTime,
            timestamp: new Date().toISOString(),
          });
        }

        return next();
      } catch (error) {
        logger.error('Rate limiter error', { error });
        // Allow request to proceed if rate limiting fails
        return next();
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
const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const apiLimiter = new RateLimiter(15 * 60 * 1000, 1000); // 1000 requests per 15 minutes for API
const strictLimiter = new RateLimiter(60 * 1000, 10); // 10 requests per minute for sensitive endpoints

// Middleware function that applies appropriate rate limiting based on path
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting in test environment only for specific tests
  if (config.nodeEnv === 'test' && !process.env.TEST_RATE_LIMITING) {
    return next();
  }

  // Apply strict limiting to sensitive endpoints
  if (req.path.includes('/logs') || req.path.includes('/system')) {
    return strictLimiter.middleware()(req, res, next);
  }

  // Apply API limiting to API endpoints
  if (req.path.startsWith('/api/')) {
    return apiLimiter.middleware()(req, res, next);
  }

  // Apply general limiting to all other endpoints
  return generalLimiter.middleware()(req, res, next);
};

// Export limiter instances for testing
export { generalLimiter, apiLimiter, strictLimiter };