/**
 * API Logger Utility
 * Specialized logging for external API interactions with structured data
 */

import { logger } from './logger';

export interface ApiRequestLog {
  correlationId: string;
  service: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: unknown;
  timestamp: number;
  apiKey?: string; // Masked
}

export interface ApiResponseLog {
  correlationId: string;
  service: string;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  responseTime: number;
  dataSize: number;
  timestamp: number;
  cached?: boolean;
}

export interface ApiErrorLog {
  correlationId: string;
  service: string;
  error: string;
  errorCode?: string;
  status?: number;
  responseTime: number;
  timestamp: number;
  retryAttempt?: number;
  rateLimited?: boolean;
}

export interface ApiMetrics {
  service: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  cacheHits: number;
  cacheMisses: number;
  lastRequestTime: number;
  errorRate: number;
}

export class ApiLogger {
  private metrics: Map<string, ApiMetrics> = new Map();
  private requestTimes: Map<string, number> = new Map();

  /**
   * Log API request
   */
  logRequest(requestLog: Omit<ApiRequestLog, 'timestamp'>): void {
    const log: ApiRequestLog = {
      ...requestLog,
      timestamp: Date.now(),
    };

    // Store request time for response time calculation
    this.requestTimes.set(log.correlationId, log.timestamp);

    // Mask sensitive headers
    const maskedHeaders = this.maskSensitiveHeaders(log.headers);

    logger.info('API Request', {
      correlationId: log.correlationId,
      service: log.service,
      method: log.method,
      url: this.maskUrl(log.url),
      headers: maskedHeaders,
      params: log.params,
      apiKey: log.apiKey,
    });

    // Update metrics
    this.updateRequestMetrics(log.service);
  }

  /**
   * Log API response
   */
  logResponse(
    responseLog: Omit<ApiResponseLog, 'timestamp' | 'responseTime'>
  ): void {
    const requestTime =
      this.requestTimes.get(responseLog.correlationId) || Date.now();
    const responseTime = Date.now() - requestTime;

    const log: ApiResponseLog = {
      ...responseLog,
      responseTime,
      timestamp: Date.now(),
    };

    // Clean up request time tracking
    this.requestTimes.delete(responseLog.correlationId);

    const logLevel = log.status >= 400 ? 'warn' : 'info';

    logger[logLevel]('API Response', {
      correlationId: log.correlationId,
      service: log.service,
      status: log.status,
      statusText: log.statusText,
      responseTime: log.responseTime,
      dataSize: log.dataSize,
      cached: log.cached,
    });

    // Update metrics
    this.updateResponseMetrics(
      log.service,
      log.status,
      log.responseTime,
      log.cached
    );
  }

  /**
   * Log API error
   */
  logError(errorLog: Omit<ApiErrorLog, 'timestamp' | 'responseTime'>): void {
    const requestTime =
      this.requestTimes.get(errorLog.correlationId) || Date.now();
    const responseTime = Date.now() - requestTime;

    const log: ApiErrorLog = {
      ...errorLog,
      responseTime,
      timestamp: Date.now(),
    };

    // Clean up request time tracking
    this.requestTimes.delete(errorLog.correlationId);

    logger.error('API Error', {
      correlationId: log.correlationId,
      service: log.service,
      error: log.error,
      errorCode: log.errorCode,
      status: log.status,
      responseTime: log.responseTime,
      retryAttempt: log.retryAttempt,
      rateLimited: log.rateLimited,
    });

    // Update metrics
    this.updateErrorMetrics(log.service, log.rateLimited);
  }

  /**
   * Log rate limit hit
   */
  logRateLimit(
    service: string,
    correlationId: string,
    retryAfter?: number
  ): void {
    logger.warn('API Rate Limit Hit', {
      correlationId,
      service,
      retryAfter,
      timestamp: Date.now(),
    });

    // Update metrics
    const metrics = this.getOrCreateMetrics(service);
    metrics.rateLimitHits++;
    this.metrics.set(service, metrics);
  }

  /**
   * Log cache hit/miss
   */
  logCache(
    service: string,
    correlationId: string,
    hit: boolean,
    key: string
  ): void {
    logger.debug('API Cache', {
      correlationId,
      service,
      hit,
      key: this.maskCacheKey(key),
      timestamp: Date.now(),
    });

    // Update metrics
    const metrics = this.getOrCreateMetrics(service);
    if (hit) {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
    }
    this.metrics.set(service, metrics);
  }

  /**
   * Log circuit breaker state change
   */
  logCircuitBreaker(
    service: string,
    state: 'open' | 'closed' | 'half-open',
    failureCount?: number
  ): void {
    logger.warn('Circuit Breaker State Change', {
      service,
      state,
      failureCount,
      timestamp: Date.now(),
    });
  }

  /**
   * Get metrics for a specific service
   */
  getMetrics(service: string): ApiMetrics | null {
    return this.metrics.get(service) || null;
  }

  /**
   * Get metrics for all services
   */
  getAllMetrics(): Record<string, ApiMetrics> {
    const result: Record<string, ApiMetrics> = {};
    this.metrics.forEach((metrics, service) => {
      result[service] = { ...metrics };
    });
    return result;
  }

  /**
   * Reset metrics for a specific service
   */
  resetMetrics(service: string): void {
    this.metrics.delete(service);
    logger.info('API metrics reset', { service });
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.metrics.clear();
    logger.info('All API metrics reset');
  }

  /**
   * Get or create metrics for a service
   */
  private getOrCreateMetrics(service: string): ApiMetrics {
    let metrics = this.metrics.get(service);

    if (!metrics) {
      metrics = {
        service,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        rateLimitHits: 0,
        cacheHits: 0,
        cacheMisses: 0,
        lastRequestTime: 0,
        errorRate: 0,
      };
      this.metrics.set(service, metrics);
    }

    return metrics;
  }

  /**
   * Update request metrics
   */
  private updateRequestMetrics(service: string): void {
    const metrics = this.getOrCreateMetrics(service);
    metrics.totalRequests++;
    metrics.lastRequestTime = Date.now();
    this.metrics.set(service, metrics);
  }

  /**
   * Update response metrics
   */
  private updateResponseMetrics(
    service: string,
    status: number,
    responseTime: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cached?: boolean
  ): void {
    const metrics = this.getOrCreateMetrics(service);

    if (status >= 200 && status < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update average response time
    const totalResponseTime =
      metrics.averageResponseTime * (metrics.totalRequests - 1);
    metrics.averageResponseTime =
      (totalResponseTime + responseTime) / metrics.totalRequests;

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    this.metrics.set(service, metrics);
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(service: string, rateLimited?: boolean): void {
    const metrics = this.getOrCreateMetrics(service);
    metrics.failedRequests++;

    if (rateLimited) {
      metrics.rateLimitHits++;
    }

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    this.metrics.set(service, metrics);
  }

  /**
   * Mask sensitive headers
   */
  private maskSensitiveHeaders(
    headers?: Record<string, string>
  ): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'x-auth-token',
    ];
    const masked: Record<string, string> = {};

    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        masked[key] = this.maskValue(value);
      } else {
        masked[key] = value;
      }
    });

    return masked;
  }

  /**
   * Mask URL parameters that might contain sensitive data
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['api_key', 'apikey', 'token', 'auth'];

      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          const value = urlObj.searchParams.get(param);
          if (value) {
            urlObj.searchParams.set(param, this.maskValue(value));
          }
        }
      });

      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original URL
      return url;
    }
  }

  /**
   * Mask cache key to avoid exposing sensitive data
   */
  private maskCacheKey(key: string): string {
    // Only show first and last few characters of long keys
    if (key.length > 20) {
      return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
    }
    return key;
  }

  /**
   * Mask sensitive values
   */
  private maskValue(value: string): string {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    return `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
  }
}

// Export singleton instance
export const apiLogger = new ApiLogger();
