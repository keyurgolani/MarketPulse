/**
 * Rate Limiting Service
 * Manages API rate limits with configurable strategies and automatic backoff
 */

import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from '../utils/logger';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface RateLimitStatus {
  remainingPoints: number;
  msBeforeNext: number;
  totalHits: number;
}

export class RateLimitService {
  private minuteLimiter: RateLimiterMemory | RateLimiterRedis;
  private hourLimiter: RateLimiterMemory | RateLimiterRedis;
  private serviceName: string;
  private config: RateLimitConfig;

  constructor(serviceName: string, config: RateLimitConfig) {
    this.serviceName = serviceName;
    this.config = config;

    // Create minute-based rate limiter
    this.minuteLimiter = new RateLimiterMemory({
      keyPrefix: `${serviceName}_minute`,
      points: config.requestsPerMinute,
      duration: 60, // 60 seconds
      blockDuration: 60, // Block for 60 seconds if limit exceeded
    });

    // Create hour-based rate limiter
    this.hourLimiter = new RateLimiterMemory({
      keyPrefix: `${serviceName}_hour`,
      points: config.requestsPerHour,
      duration: 3600, // 3600 seconds (1 hour)
      blockDuration: 3600, // Block for 1 hour if limit exceeded
    });

    logger.info('Rate limiter initialized', {
      serviceName,
      requestsPerMinute: config.requestsPerMinute,
      requestsPerHour: config.requestsPerHour,
    });
  }

  /**
   * Check if request is allowed under current rate limits
   */
  async checkLimit(key = 'default'): Promise<void> {
    const limitKey = `${this.serviceName}_${key}`;

    try {
      // Check both minute and hour limits
      await Promise.all([
        this.minuteLimiter.consume(limitKey),
        this.hourLimiter.consume(limitKey),
      ]);

      logger.debug('Rate limit check passed', {
        serviceName: this.serviceName,
        key: limitKey,
      });
    } catch (rateLimiterRes) {
      const error = rateLimiterRes as {
        msBeforeNext?: number;
        remainingPoints?: number;
      };
      const msBeforeNext = error.msBeforeNext || 0;
      const remainingPoints = error.remainingPoints || 0;

      logger.warn('Rate limit exceeded', {
        serviceName: this.serviceName,
        key: limitKey,
        msBeforeNext,
        remainingPoints,
      });

      // Throw a more descriptive error
      const waitTimeSeconds = Math.ceil(msBeforeNext / 1000);
      throw new Error(
        `Rate limit exceeded for ${this.serviceName}. Please wait ${waitTimeSeconds} seconds before retrying.`
      );
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(key = 'default'): Promise<{
    minute: RateLimitStatus;
    hour: RateLimitStatus;
  }> {
    const limitKey = `${this.serviceName}_${key}`;

    try {
      const [minuteRes, hourRes] = await Promise.all([
        this.minuteLimiter.get(limitKey),
        this.hourLimiter.get(limitKey),
      ]);

      return {
        minute: {
          remainingPoints:
            minuteRes?.remainingPoints || this.config.requestsPerMinute,
          msBeforeNext: minuteRes?.msBeforeNext || 0,
          totalHits: (minuteRes as { totalHits?: number })?.totalHits || 0,
        },
        hour: {
          remainingPoints:
            hourRes?.remainingPoints || this.config.requestsPerHour,
          msBeforeNext: hourRes?.msBeforeNext || 0,
          totalHits: (hourRes as { totalHits?: number })?.totalHits || 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', {
        serviceName: this.serviceName,
        key: limitKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return default status on error
      return {
        minute: {
          remainingPoints: this.config.requestsPerMinute,
          msBeforeNext: 0,
          totalHits: 0,
        },
        hour: {
          remainingPoints: this.config.requestsPerHour,
          msBeforeNext: 0,
          totalHits: 0,
        },
      };
    }
  }

  /**
   * Reset rate limits for a specific key
   */
  async reset(key = 'default'): Promise<void> {
    const limitKey = `${this.serviceName}_${key}`;

    try {
      await Promise.all([
        this.minuteLimiter.delete(limitKey),
        this.hourLimiter.delete(limitKey),
      ]);

      logger.info('Rate limits reset', {
        serviceName: this.serviceName,
        key: limitKey,
      });
    } catch (error) {
      logger.error('Failed to reset rate limits', {
        serviceName: this.serviceName,
        key: limitKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if request would be allowed without consuming points
   */
  async canMakeRequest(key = 'default'): Promise<boolean> {
    const limitKey = `${this.serviceName}_${key}`;

    try {
      const [minuteRes, hourRes] = await Promise.all([
        this.minuteLimiter.get(limitKey),
        this.hourLimiter.get(limitKey),
      ]);

      const minuteRemaining =
        minuteRes?.remainingPoints || this.config.requestsPerMinute;
      const hourRemaining =
        hourRes?.remainingPoints || this.config.requestsPerHour;

      return minuteRemaining > 0 && hourRemaining > 0;
    } catch (error) {
      logger.error('Failed to check rate limit availability', {
        serviceName: this.serviceName,
        key: limitKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get time until next request is allowed
   */
  async getTimeUntilReset(key = 'default'): Promise<number> {
    const limitKey = `${this.serviceName}_${key}`;

    try {
      const [minuteRes, hourRes] = await Promise.all([
        this.minuteLimiter.get(limitKey),
        this.hourLimiter.get(limitKey),
      ]);

      const minuteWait = minuteRes?.msBeforeNext || 0;
      const hourWait = hourRes?.msBeforeNext || 0;

      // Return the longer wait time
      return Math.max(minuteWait, hourWait);
    } catch (error) {
      logger.error('Failed to get time until reset', {
        serviceName: this.serviceName,
        key: limitKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Recreate limiters with new configuration
    if (newConfig.requestsPerMinute) {
      this.minuteLimiter = new RateLimiterMemory({
        keyPrefix: `${this.serviceName}_minute`,
        points: this.config.requestsPerMinute,
        duration: 60,
        blockDuration: 60,
      });
    }

    if (newConfig.requestsPerHour) {
      this.hourLimiter = new RateLimiterMemory({
        keyPrefix: `${this.serviceName}_hour`,
        points: this.config.requestsPerHour,
        duration: 3600,
        blockDuration: 3600,
      });
    }

    logger.info('Rate limiter configuration updated', {
      serviceName: this.serviceName,
      newConfig: this.config,
    });
  }

  /**
   * Get service statistics
   */
  getStats(): {
    serviceName: string;
    config: RateLimitConfig;
  } {
    return {
      serviceName: this.serviceName,
      config: { ...this.config },
    };
  }
}
