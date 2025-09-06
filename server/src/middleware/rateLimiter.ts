import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { RateLimitError } from './errorHandler';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key] && this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = { count: 1, resetTime };
    } else {
      this.store[key].count++;
    }

    return this.store[key];
  }

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.store[key];
    if (!entry || entry.resetTime <= Date.now()) {
      return null;
    }
    return entry;
  }

  reset(key: string): void {
    delete this.store[key];
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

// Global rate limit store
const rateLimitStore = new MemoryRateLimitStore();

// Default key generator - uses user ID if available, otherwise IP
const defaultKeyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${req.ip}`;
};

// Create rate limiter middleware
export const createRateLimiter = (config: RateLimitConfig) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const current = rateLimitStore.increment(key, windowMs);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));

    // Check if rate limit exceeded
    if (current.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        key,
        count: current.count,
        limit: maxRequests,
        resetTime: new Date(current.resetTime).toISOString(),
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - Date.now()) / 1000)} seconds.`);
    }

    // Track response to potentially skip counting
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): Response {
        const shouldSkip = 
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip) {
          // Decrement the count since we're skipping this request
          const entry = rateLimitStore.get(key);
          if (entry && entry.count > 0) {
            entry.count--;
          }
        }

        return originalEnd.call(this, chunk, encoding);
      };
    }

    next();
  };
};

// Default rate limiter - 100 requests per 15 minutes per user
export const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Strict rate limiter for sensitive endpoints (e.g., auth)
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Lenient rate limiter for read-only endpoints
export const lenientRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
});

// Rate limiter for WebSocket connections
export const websocketRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 connections per minute
  keyGenerator: (req: Request) => `ws:${req.ip}`,
});

// Cleanup function for graceful shutdown
export const cleanupRateLimiter = (): void => {
  rateLimitStore.destroy();
};