import { logger } from './logger';

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
}

/**
 * Fallback execution result
 */
export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  source: string;
  attempt: number;
  latency: number;
}

/**
 * Source health status
 */
export interface SourceHealth {
  isHealthy: boolean;
  errorCount: number;
  successCount: number;
  lastError?: Error;
  lastSuccess?: Date;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenUntil?: Date;
}

/**
 * Fallback Manager
 * Manages fallback execution across multiple sources with circuit breaker pattern
 */
export class FallbackManager<T> {
  private sourceHealth: Map<string, SourceHealth> = new Map();
  private readonly strategy: FallbackStrategy;

  constructor(strategy: Partial<FallbackStrategy> = {}) {
    this.strategy = {
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeoutMs: 60000,
      ...strategy,
    };
  }

  /**
   * Execute operation with fallback sources
   */
  async execute(
    sources: Array<{
      name: string;
      operation: () => Promise<T>;
      priority?: number;
    }>
  ): Promise<FallbackResult<T>> {
    const sortedSources = sources.sort(
      (a, b) => (a.priority || 0) - (b.priority || 0)
    );
    let lastError: Error | null = null;

    for (const source of sortedSources) {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(source.name)) {
        logger.debug('Circuit breaker open, skipping source', {
          source: source.name,
        });
        continue;
      }

      const startTime = Date.now();
      let attempt = 0;

      while (attempt <= this.strategy.maxRetries) {
        try {
          const data = await source.operation();
          const latency = Date.now() - startTime;

          this.recordSuccess(source.name);

          logger.info('Fallback operation succeeded', {
            source: source.name,
            attempt: attempt + 1,
            latency,
          });

          return {
            success: true,
            data,
            source: source.name,
            attempt: attempt + 1,
            latency,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          attempt++;

          this.recordError(source.name, lastError);

          logger.warn('Fallback operation failed', {
            source: source.name,
            attempt,
            error: lastError.message,
            willRetry: attempt <= this.strategy.maxRetries,
          });

          if (attempt <= this.strategy.maxRetries) {
            const delay = this.calculateDelay(attempt);
            await this.sleep(delay);
          }
        }
      }

      // All retries exhausted for this source
      logger.error('All retries exhausted for source', {
        source: source.name,
        attempts: attempt,
        error: lastError?.message,
      });
    }

    // All sources failed
    const latency = Date.now();
    return {
      success: false,
      error: lastError || new Error('All fallback sources failed'),
      source: 'none',
      attempt: 0,
      latency,
    };
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(
    sources: Array<{
      name: string;
      operation: () => Promise<T>;
      priority?: number;
    }>,
    timeoutMs: number
  ): Promise<FallbackResult<T>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Fallback execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.execute(sources)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if circuit breaker is open for a source
   */
  private isCircuitBreakerOpen(sourceName: string): boolean {
    const health = this.getSourceHealth(sourceName);

    if (!health.circuitBreakerOpen) {
      return false;
    }

    // Check if circuit breaker timeout has expired
    if (
      health.circuitBreakerOpenUntil &&
      Date.now() > health.circuitBreakerOpenUntil.getTime()
    ) {
      health.circuitBreakerOpen = false;
      delete health.circuitBreakerOpenUntil;
      logger.info('Circuit breaker closed after timeout', {
        source: sourceName,
      });
      return false;
    }

    return true;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(sourceName: string): void {
    const health = this.getSourceHealth(sourceName);
    health.successCount++;
    health.lastSuccess = new Date();

    // Reset error count on success
    health.errorCount = 0;

    // Close circuit breaker if it was open
    if (health.circuitBreakerOpen) {
      health.circuitBreakerOpen = false;
      delete health.circuitBreakerOpenUntil;
      logger.info('Circuit breaker closed after successful operation', {
        source: sourceName,
      });
    }
  }

  /**
   * Record failed operation
   */
  private recordError(sourceName: string, error: Error): void {
    const health = this.getSourceHealth(sourceName);
    health.errorCount++;
    health.lastError = error;

    // Open circuit breaker if error threshold is reached
    if (
      health.errorCount >= this.strategy.circuitBreakerThreshold &&
      !health.circuitBreakerOpen
    ) {
      health.circuitBreakerOpen = true;
      health.circuitBreakerOpenUntil = new Date(
        Date.now() + this.strategy.circuitBreakerTimeoutMs
      );

      logger.warn('Circuit breaker opened due to error threshold', {
        source: sourceName,
        errorCount: health.errorCount,
        threshold: this.strategy.circuitBreakerThreshold,
        openUntil: health.circuitBreakerOpenUntil,
      });
    }
  }

  /**
   * Get or create source health status
   */
  private getSourceHealth(sourceName: string): SourceHealth {
    if (!this.sourceHealth.has(sourceName)) {
      this.sourceHealth.set(sourceName, {
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
        circuitBreakerOpen: false,
      });
    }
    return this.sourceHealth.get(sourceName)!;
  }

  /**
   * Calculate retry delay with optional exponential backoff
   */
  private calculateDelay(attempt: number): number {
    if (!this.strategy.exponentialBackoff) {
      return this.strategy.retryDelayMs;
    }

    // Exponential backoff: delay * (2 ^ (attempt - 1))
    return this.strategy.retryDelayMs * Math.pow(2, attempt - 1);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get health status for all sources
   */
  getHealthStatus(): { [key: string]: SourceHealth } {
    const status: { [key: string]: SourceHealth } = {};

    for (const [name, health] of this.sourceHealth) {
      status[name] = { ...health };
    }

    return status;
  }

  /**
   * Reset health status for a source
   */
  resetSourceHealth(sourceName: string): void {
    this.sourceHealth.delete(sourceName);
    logger.info('Source health status reset', { source: sourceName });
  }

  /**
   * Reset health status for all sources
   */
  resetAllHealth(): void {
    this.sourceHealth.clear();
    logger.info('All source health statuses reset');
  }

  /**
   * Manually open circuit breaker for a source
   */
  openCircuitBreaker(sourceName: string, timeoutMs?: number): void {
    const health = this.getSourceHealth(sourceName);
    health.circuitBreakerOpen = true;
    health.circuitBreakerOpenUntil = new Date(
      Date.now() + (timeoutMs || this.strategy.circuitBreakerTimeoutMs)
    );

    logger.info('Circuit breaker manually opened', {
      source: sourceName,
      openUntil: health.circuitBreakerOpenUntil,
    });
  }

  /**
   * Manually close circuit breaker for a source
   */
  closeCircuitBreaker(sourceName: string): void {
    const health = this.getSourceHealth(sourceName);
    health.circuitBreakerOpen = false;
    delete health.circuitBreakerOpenUntil;
    health.errorCount = 0;

    logger.info('Circuit breaker manually closed', { source: sourceName });
  }

  /**
   * Get strategy configuration
   */
  getStrategy(): FallbackStrategy {
    return { ...this.strategy };
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(newStrategy: Partial<FallbackStrategy>): void {
    Object.assign(this.strategy, newStrategy);
    logger.info('Fallback strategy updated', { strategy: this.strategy });
  }
}
