/**
 * API Error Handler Middleware
 * Centralized error handling for external API integrations
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  source?: string;
  correlationId?: string;
  retryable?: boolean;
  rateLimited?: boolean;
}

export class ExternalApiError extends Error implements ApiError {
  public statusCode: number;
  public source: string;
  public correlationId?: string;
  public retryable: boolean;
  public rateLimited: boolean;

  constructor(
    message: string,
    statusCode = 500,
    source = 'unknown',
    correlationId?: string,
    retryable = false,
    rateLimited = false
  ) {
    super(message);
    this.name = 'ExternalApiError';
    this.statusCode = statusCode;
    this.source = source;
    this.correlationId = correlationId || '';
    this.retryable = retryable;
    this.rateLimited = rateLimited;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExternalApiError);
    }
  }
}

export class RateLimitError extends ExternalApiError {
  public retryAfter: number;

  constructor(
    message: string,
    source: string,
    retryAfter = 60,
    correlationId?: string
  ) {
    super(message, 429, source, correlationId, true, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class CircuitBreakerError extends ExternalApiError {
  public circuitState: 'open' | 'half-open' | 'closed';

  constructor(
    message: string,
    source: string,
    circuitState: 'open' | 'half-open' | 'closed' = 'open',
    correlationId?: string
  ) {
    super(message, 503, source, correlationId, false, false);
    this.name = 'CircuitBreakerError';
    this.circuitState = circuitState;
  }
}

/**
 * Circuit Breaker implementation for external APIs
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly serviceName: string,
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000, // 1 minute
    private readonly monitoringWindow = 300000 // 5 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        logger.info('Circuit breaker transitioning to half-open', {
          serviceName: this.serviceName,
        });
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is open for ${this.serviceName}`,
          this.serviceName,
          this.state
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.recoveryTimeout
    );
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed';

    logger.debug('Circuit breaker reset to closed state', {
      serviceName: this.serviceName,
    });
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';

      logger.warn('Circuit breaker opened due to failures', {
        serviceName: this.serviceName,
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });
    }
  }

  getState(): {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  constructor(
    private readonly maxRetries = 3,
    private readonly baseDelay = 1000,
    private readonly maxDelay = 30000,
    private readonly backoffMultiplier = 2
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: Error) => boolean = () => true
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt or if error is not retryable
        if (attempt === this.maxRetries || !shouldRetry(error as Error)) {
          break;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(this.backoffMultiplier, attempt),
          this.maxDelay
        );

        logger.debug('Retrying operation after delay', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Express middleware for handling API errors
 */
export const apiErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const correlationId =
    (req.headers['x-correlation-id'] as string) || 'unknown';

  // Log the error
  logger.error('API Error occurred', {
    correlationId,
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
  });

  // Handle different types of errors
  if (error instanceof RateLimitError) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: error.message,
      retryAfter: error.retryAfter,
      correlationId,
    });
    return;
  }

  if (error instanceof CircuitBreakerError) {
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      message: error.message,
      circuitState: error.circuitState,
      correlationId,
    });
    return;
  }

  if (error instanceof ExternalApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: 'External API error',
      message: error.message,
      source: error.source,
      retryable: error.retryable,
      correlationId,
    });
    return;
  }

  // Generic error handling
  const statusCode =
    (error as Error & { statusCode?: number }).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
    correlationId,
  });
};

/**
 * Utility function to determine if an error is retryable
 */
export const isRetryableError = (
  error: Error & { code?: string; response?: { status?: number } }
): boolean => {
  // Network errors are usually retryable
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND'
  ) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (
    error.response?.status &&
    retryableStatusCodes.includes(error.response.status)
  ) {
    return true;
  }

  // Custom retryable errors
  if (error instanceof ExternalApiError && error.retryable) {
    return true;
  }

  return false;
};

/**
 * Utility function to extract retry delay from error response
 */
export const getRetryDelay = (
  error: Error & {
    response?: {
      headers?: { 'retry-after'?: string; 'x-ratelimit-reset'?: string };
    };
  }
): number => {
  // Check for Retry-After header
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const delay = parseInt(retryAfter, 10);
    if (!isNaN(delay)) {
      return delay * 1000; // Convert to milliseconds
    }
  }

  // Check for rate limit specific headers
  const rateLimitReset = error.response?.headers?.['x-ratelimit-reset'];
  if (rateLimitReset) {
    const resetTime = parseInt(rateLimitReset, 10);
    if (!isNaN(resetTime)) {
      return Math.max(0, resetTime * 1000 - Date.now());
    }
  }

  // Default delay based on status code
  if (
    error.response &&
    'status' in error.response &&
    error.response.status === 429
  ) {
    return 60000; // 1 minute for rate limiting
  }

  return 1000; // 1 second default
};
