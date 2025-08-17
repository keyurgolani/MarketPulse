import { YahooFinanceService } from './YahooFinanceService';
import { GoogleFinanceService } from './GoogleFinanceService';
import { logger } from '../utils/logger';
import {
  MarketQuote,
  HistoricalData,
  SymbolSearchResult,
  HealthCheckResult,
} from '../types/api-contracts';

/**
 * Data source configuration
 */
interface DataSource {
  name: string;
  service: YahooFinanceService | GoogleFinanceService;
  priority: number;
  isActive: boolean;
  healthScore: number;
  lastHealthCheck: Date;
  errorCount: number;
  successCount: number;
}

/**
 * Aggregation options
 */
interface AggregationOptions {
  maxRetries?: number;
  timeoutMs?: number;
  fallbackEnabled?: boolean;
  preferredSource?: string;
}

/**
 * Data Aggregation Service
 * Manages multiple data sources with automatic fallback mechanisms
 */
export class DataAggregationService {
  private dataSources: Map<string, DataSource> = new Map();
  private readonly defaultOptions: AggregationOptions = {
    maxRetries: 3,
    timeoutMs: 10000,
    fallbackEnabled: true,
  };

  constructor() {
    this.initializeDataSources();
  }

  /**
   * Initialize data sources with priority order
   */
  private initializeDataSources(): void {
    // Yahoo Finance as primary source
    this.dataSources.set('yahoo-finance', {
      name: 'yahoo-finance',
      service: new YahooFinanceService(),
      priority: 1,
      isActive: true,
      healthScore: 100,
      lastHealthCheck: new Date(),
      errorCount: 0,
      successCount: 0,
    });

    // Google Finance as fallback source
    this.dataSources.set('google-finance', {
      name: 'google-finance',
      service: new GoogleFinanceService(),
      priority: 2,
      isActive: true,
      healthScore: 100,
      lastHealthCheck: new Date(),
      errorCount: 0,
      successCount: 0,
    });

    logger.info('Data aggregation service initialized', {
      sources: Array.from(this.dataSources.keys()),
      primarySource: this.getPrimarySource()?.name,
    });
  }

  /**
   * Normalize period string to valid Yahoo Finance period
   */
  private normalizeYahooPeriod(
    period: string
  ):
    | '1d'
    | '5d'
    | '1mo'
    | '3mo'
    | '6mo'
    | '1y'
    | '2y'
    | '5y'
    | '10y'
    | 'ytd'
    | 'max' {
    const validPeriods = [
      '1d',
      '5d',
      '1mo',
      '3mo',
      '6mo',
      '1y',
      '2y',
      '5y',
      '10y',
      'ytd',
      'max',
    ] as const;
    const normalizedPeriod = period.toLowerCase();

    if (
      validPeriods.includes(normalizedPeriod as (typeof validPeriods)[number])
    ) {
      return normalizedPeriod as (typeof validPeriods)[number];
    }

    // Default fallback
    return '1y';
  }

  /**
   * Normalize interval string to valid Yahoo Finance interval
   */
  private normalizeYahooInterval(
    interval: string
  ):
    | '1m'
    | '2m'
    | '5m'
    | '15m'
    | '30m'
    | '60m'
    | '90m'
    | '1h'
    | '1d'
    | '5d'
    | '1wk'
    | '1mo'
    | '3mo' {
    const validIntervals = [
      '1m',
      '2m',
      '5m',
      '15m',
      '30m',
      '60m',
      '90m',
      '1h',
      '1d',
      '5d',
      '1wk',
      '1mo',
      '3mo',
    ] as const;
    const normalizedInterval = interval.toLowerCase();

    if (
      validIntervals.includes(
        normalizedInterval as (typeof validIntervals)[number]
      )
    ) {
      return normalizedInterval as (typeof validIntervals)[number];
    }

    // Default fallback
    return '1d';
  }

  /**
   * Get quote data with automatic fallback
   */
  async getQuote(
    symbol: string,
    options: AggregationOptions = {}
  ): Promise<MarketQuote> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const correlationId = `agg-quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Starting quote aggregation', { symbol, correlationId });

    const sources = this.getOrderedSources(mergedOptions.preferredSource);
    let lastError: Error | null = null;

    for (const source of sources) {
      if (!source.isActive && mergedOptions.fallbackEnabled) {
        logger.debug('Skipping inactive source', {
          source: source.name,
          symbol,
          correlationId,
        });
        continue;
      }

      try {
        const startTime = Date.now();
        const rawQuote = await this.executeWithTimeout(
          () => source.service.getQuote(symbol),
          mergedOptions.timeoutMs!
        );

        // Ensure quote has all required properties
        const quote: MarketQuote = {
          ...rawQuote,
          shortName: rawQuote.shortName || rawQuote.name || symbol,
          marketCap: rawQuote.marketCap || 0,
          volume: rawQuote.volume || 0,
          ...(rawQuote.high !== undefined && { high: rawQuote.high }),
          ...(rawQuote.low !== undefined && { low: rawQuote.low }),
          ...(rawQuote.open !== undefined && { open: rawQuote.open }),
          ...(rawQuote.previousClose !== undefined && {
            previousClose: rawQuote.previousClose,
          }),
          ...(rawQuote.timestamp !== undefined && {
            timestamp: rawQuote.timestamp,
          }),
        };

        const latency = Date.now() - startTime;
        this.recordSuccess(source, latency);

        logger.info('Quote fetched successfully', {
          source: source.name,
          symbol,
          price: quote.price,
          latency,
          correlationId,
        });

        return quote;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordError(source, lastError);

        logger.warn('Quote fetch failed, trying next source', {
          source: source.name,
          symbol,
          error: lastError.message,
          correlationId,
        });

        if (!mergedOptions.fallbackEnabled) {
          break;
        }
      }
    }

    logger.error('All sources failed for quote', {
      symbol,
      sourcesAttempted: sources.length,
      lastError: lastError?.message,
      correlationId,
    });

    throw lastError || new Error('All data sources failed');
  }

  /**
   * Get historical data with automatic fallback
   */
  async getHistoricalData(
    symbol: string,
    period: string = '1mo',
    interval: string = '1d',
    options: AggregationOptions = {}
  ): Promise<HistoricalData> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const correlationId = `agg-historical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Starting historical data aggregation', {
      symbol,
      period,
      interval,
      correlationId,
    });

    const sources = this.getOrderedSources(mergedOptions.preferredSource);
    let lastError: Error | null = null;

    for (const source of sources) {
      if (!source.isActive && mergedOptions.fallbackEnabled) {
        continue;
      }

      try {
        const startTime = Date.now();
        // Convert period and interval to valid Yahoo Finance values
        const validPeriod = this.normalizeYahooPeriod(period);
        const validInterval = this.normalizeYahooInterval(interval);

        const rawData = await this.executeWithTimeout(
          () =>
            source.service.getHistoricalData(
              symbol,
              validPeriod,
              validInterval
            ),
          mergedOptions.timeoutMs!
        );

        // Ensure data has correct meta structure
        const data: HistoricalData = {
          ...rawData,
          meta: {
            currency: rawData.meta?.currency || 'USD',
            exchange: rawData.meta?.exchange || 'NASDAQ',
            instrumentType: rawData.meta?.instrumentType || 'EQUITY',
            regularMarketPrice:
              rawData.meta?.regularMarketPrice ||
              (rawData.data && rawData.data.length > 0
                ? rawData.data[rawData.data.length - 1]?.close || 0
                : 0),
            timezone: rawData.meta?.timezone || 'America/New_York',
          },
        };

        const latency = Date.now() - startTime;
        this.recordSuccess(source, latency);

        logger.info('Historical data fetched successfully', {
          source: source.name,
          symbol,
          period,
          interval,
          dataPoints: data.data.length,
          latency,
          correlationId,
        });

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordError(source, lastError);

        logger.warn('Historical data fetch failed, trying next source', {
          source: source.name,
          symbol,
          period,
          interval,
          error: lastError.message,
          correlationId,
        });

        if (!mergedOptions.fallbackEnabled) {
          break;
        }
      }
    }

    logger.error('All sources failed for historical data', {
      symbol,
      period,
      interval,
      sourcesAttempted: sources.length,
      lastError: lastError?.message,
      correlationId,
    });

    throw lastError || new Error('All data sources failed');
  }

  /**
   * Search symbols with automatic fallback
   */
  async searchSymbols(
    query: string,
    limit: number = 10,
    options: AggregationOptions = {}
  ): Promise<SymbolSearchResult[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const correlationId = `agg-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Starting symbol search aggregation', {
      query,
      limit,
      correlationId,
    });

    const sources = this.getOrderedSources(mergedOptions.preferredSource);
    let lastError: Error | null = null;

    for (const source of sources) {
      if (!source.isActive && mergedOptions.fallbackEnabled) {
        continue;
      }

      try {
        const startTime = Date.now();
        const rawResults = await this.executeWithTimeout(
          () => source.service.searchSymbols(query, limit),
          mergedOptions.timeoutMs!
        );

        // Ensure results have the source property
        const results = rawResults.map(result => ({
          ...result,
          source: source.name,
        }));

        const latency = Date.now() - startTime;
        this.recordSuccess(source, latency);

        logger.info('Symbol search completed successfully', {
          source: source.name,
          query,
          resultCount: results.length,
          latency,
          correlationId,
        });

        return results;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordError(source, lastError);

        logger.warn('Symbol search failed, trying next source', {
          source: source.name,
          query,
          error: lastError.message,
          correlationId,
        });

        if (!mergedOptions.fallbackEnabled) {
          break;
        }
      }
    }

    logger.error('All sources failed for symbol search', {
      query,
      sourcesAttempted: sources.length,
      lastError: lastError?.message,
      correlationId,
    });

    throw lastError || new Error('All data sources failed');
  }

  /**
   * Get market summary with automatic fallback
   */
  async getMarketSummary(
    options: AggregationOptions = {}
  ): Promise<MarketQuote[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const correlationId = `agg-summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Starting market summary aggregation', { correlationId });

    const sources = this.getOrderedSources(mergedOptions.preferredSource);
    let lastError: Error | null = null;

    for (const source of sources) {
      if (!source.isActive && mergedOptions.fallbackEnabled) {
        continue;
      }

      try {
        const startTime = Date.now();
        const rawSummary = await this.executeWithTimeout(
          () => source.service.getMarketSummary(),
          mergedOptions.timeoutMs!
        );

        // Ensure all quotes have required properties
        const summary = rawSummary.map(quote => ({
          ...quote,
          shortName: quote.shortName || quote.name || quote.symbol,
          marketCap: quote.marketCap || 0,
          volume: quote.volume || 0,
          ...(quote.high !== undefined && { high: quote.high }),
          ...(quote.low !== undefined && { low: quote.low }),
          ...(quote.open !== undefined && { open: quote.open }),
          ...(quote.previousClose !== undefined && {
            previousClose: quote.previousClose,
          }),
          ...(quote.timestamp !== undefined && { timestamp: quote.timestamp }),
        }));

        const latency = Date.now() - startTime;
        this.recordSuccess(source, latency);

        logger.info('Market summary fetched successfully', {
          source: source.name,
          indicesCount: summary.length,
          latency,
          correlationId,
        });

        return summary;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordError(source, lastError);

        logger.warn('Market summary fetch failed, trying next source', {
          source: source.name,
          error: lastError.message,
          correlationId,
        });

        if (!mergedOptions.fallbackEnabled) {
          break;
        }
      }
    }

    logger.error('All sources failed for market summary', {
      sourcesAttempted: sources.length,
      lastError: lastError?.message,
      correlationId,
    });

    throw lastError || new Error('All data sources failed');
  }

  /**
   * Get health status of all sources
   */
  async getHealthStatus(): Promise<{ [key: string]: HealthCheckResult }> {
    const healthResults: { [key: string]: HealthCheckResult } = {};

    for (const [name, source] of this.dataSources) {
      try {
        healthResults[name] = await source.service.healthCheck();
        this.updateHealthScore(source, healthResults[name]);
      } catch (error) {
        healthResults[name] = {
          status: 'unhealthy',
          latency: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        this.recordError(
          source,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    return healthResults;
  }

  /**
   * Get ordered sources based on priority and health
   */
  private getOrderedSources(preferredSource?: string): DataSource[] {
    const sources = Array.from(this.dataSources.values());

    // If preferred source is specified and available, put it first
    if (preferredSource && this.dataSources.has(preferredSource)) {
      const preferred = this.dataSources.get(preferredSource)!;
      const others = sources.filter(s => s.name !== preferredSource);
      return [preferred, ...others.sort(this.compareSourcePriority)];
    }

    // Sort by priority and health score
    return sources.sort(this.compareSourcePriority);
  }

  /**
   * Compare sources for sorting (priority and health)
   */
  private compareSourcePriority = (a: DataSource, b: DataSource): number => {
    // First by active status
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    // Then by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Finally by health score (higher = better)
    return b.healthScore - a.healthScore;
  };

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
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
   * Record successful operation
   */
  private recordSuccess(
    source: DataSource,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _latency: number
  ): void {
    source.successCount++;
    source.healthScore = Math.min(100, source.healthScore + 1);
    source.lastHealthCheck = new Date();

    // Reactivate source if it was inactive
    if (!source.isActive && source.healthScore > 50) {
      source.isActive = true;
      logger.info('Data source reactivated', { source: source.name });
    }
  }

  /**
   * Record failed operation
   */
  private recordError(
    source: DataSource,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _error: Error
  ): void {
    source.errorCount++;
    source.healthScore = Math.max(0, source.healthScore - 5);
    source.lastHealthCheck = new Date();

    // Deactivate source if health score is too low
    if (source.isActive && source.healthScore < 20) {
      source.isActive = false;
      logger.warn('Data source deactivated due to poor health', {
        source: source.name,
        healthScore: source.healthScore,
        errorCount: source.errorCount,
      });
    }
  }

  /**
   * Update health score based on health check result
   */
  private updateHealthScore(
    source: DataSource,
    healthResult: HealthCheckResult
  ): void {
    if (healthResult.status === 'healthy') {
      source.healthScore = Math.min(100, source.healthScore + 2);
    } else {
      source.healthScore = Math.max(0, source.healthScore - 10);
    }

    source.lastHealthCheck = new Date();
  }

  /**
   * Get primary source
   */
  private getPrimarySource(): DataSource | undefined {
    return Array.from(this.dataSources.values())
      .filter(s => s.isActive)
      .sort(this.compareSourcePriority)[0];
  }

  /**
   * Get service statistics
   */
  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};

    for (const [name, source] of this.dataSources) {
      stats[name] = {
        priority: source.priority,
        isActive: source.isActive,
        healthScore: source.healthScore,
        errorCount: source.errorCount,
        successCount: source.successCount,
        lastHealthCheck: source.lastHealthCheck,
        serviceStats:
          (source.service as { getStats?: () => unknown }).getStats?.() || {},
      };
    }

    return stats;
  }

  /**
   * Manually set source active/inactive status
   */
  setSourceStatus(sourceName: string, isActive: boolean): void {
    const source = this.dataSources.get(sourceName);
    if (source) {
      source.isActive = isActive;
      logger.info('Data source status changed', {
        source: sourceName,
        isActive,
      });
    }
  }

  /**
   * Reset source statistics
   */
  resetSourceStats(sourceName: string): void {
    const source = this.dataSources.get(sourceName);
    if (source) {
      source.errorCount = 0;
      source.successCount = 0;
      source.healthScore = 100;
      source.isActive = true;
      logger.info('Data source statistics reset', { source: sourceName });
    }
  }
}
