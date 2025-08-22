/**
 * Market Data Service
 * Unified service for fetching market data with caching, rate limiting, and fallback mechanisms
 */

import {
  YahooFinanceService,
  QuoteData,
  HistoricalData,
  SearchResult,
} from './YahooFinanceService';
import { RateLimitService } from './RateLimitService';
import { ApiKeyManager } from '../utils/apiKeyManager';
import { CacheService } from './CacheService';
import { YAHOO_FINANCE_CONFIG } from '../config/apiClients';
import { logger } from '../utils/logger';

export interface MarketDataOptions {
  useCache?: boolean;
  cacheTTL?: number;
  forceRefresh?: boolean;
  timeout?: number;
}

export interface BatchQuoteRequest {
  symbols: string[];
  options?: MarketDataOptions;
}

export interface BatchQuoteResponse {
  data: QuoteData[];
  errors: Array<{ symbol: string; error: string }>;
  fromCache: string[];
  fromApi: string[];
  timestamp: Date;
}

export class MarketDataService {
  private yahooFinanceService: YahooFinanceService;
  private cacheService: CacheService;
  private apiKeyManager: ApiKeyManager;
  private rateLimitService: RateLimitService;
  private readonly defaultCacheTTL = 60; // 1 minute default cache

  constructor(
    yahooFinanceService?: YahooFinanceService,
    cacheService?: CacheService
  ) {
    this.yahooFinanceService = yahooFinanceService || new YahooFinanceService();
    this.cacheService = cacheService || CacheService.getInstance();

    // Initialize with multiple API keys from environment
    const apiKeys = this.getApiKeysFromEnvironment();
    this.apiKeyManager = new ApiKeyManager(apiKeys, 3, 5); // Rotate after 3 rate limits, disable after 5 errors

    this.rateLimitService = new RateLimitService('MarketDataService', {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    });
  }

  /**
   * Get API keys from environment variables
   */
  private getApiKeysFromEnvironment(): string[] {
    const keys: string[] = [];

    // Primary API key
    if (process.env.YAHOO_FINANCE_API_KEY) {
      keys.push(process.env.YAHOO_FINANCE_API_KEY);
    }

    // Additional API keys (YAHOO_FINANCE_API_KEY_2, YAHOO_FINANCE_API_KEY_3, etc.)
    for (let i = 2; i <= 10; i++) {
      const key = process.env[`YAHOO_FINANCE_API_KEY_${i}`];
      if (key) {
        keys.push(key);
      }
    }

    // Fallback to demo keys for development
    if (keys.length === 0) {
      keys.push('demo-key-1', 'demo-key-2', 'demo-key-3');
      logger.warn('No API keys found in environment, using demo keys');
    }

    logger.info(`Initialized with ${keys.length} API keys`);
    return keys;
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    const statusCode =
      (error as { status?: number; statusCode?: number }).status ||
      (error as { status?: number; statusCode?: number }).statusCode;

    // Check for common rate limit indicators
    return (
      statusCode === 429 ||
      statusCode === 403 ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded') ||
      message.includes('throttled') ||
      message.includes('rate exceeded')
    );
  }

  /**
   * Retry quote request with new API key
   */
  private async retryQuoteWithNewKey(
    symbol: string,
    options: MarketDataOptions
  ): Promise<QuoteData> {
    const { timeout = 10000 } = options;

    // Get new API key
    const newApiKey = this.apiKeyManager.getCurrentKey();

    // Check rate limits with new key
    try {
      await this.rateLimitService.checkLimit();
    } catch {
      throw new Error('Rate limit exceeded for all API keys');
    }

    try {
      // Fetch data from API with new key
      const quoteData = await Promise.race([
        this.yahooFinanceService.getQuote(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      // Record success
      this.apiKeyManager.recordSuccess();

      logger.info('Quote retry successful with new API key', {
        symbol,
        newApiKey: newApiKey.substring(0, 8) + '...',
      });

      return quoteData;
    } catch (retryError) {
      // Don't rotate again on retry failure
      this.apiKeyManager.recordError((retryError as Error).message);
      throw retryError;
    }
  }

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(
    symbol: string,
    options: MarketDataOptions = {}
  ): Promise<QuoteData> {
    const {
      useCache = true,
      cacheTTL = this.defaultCacheTTL,
      forceRefresh = false,
      timeout = 10000,
    } = options;

    const cacheKey = `quote:${symbol.toUpperCase()}`;

    // Try cache first if enabled and not forcing refresh
    if (useCache && !forceRefresh) {
      try {
        const cachedData = await this.cacheService.get<QuoteData>(cacheKey);
        if (cachedData) {
          logger.debug('Quote served from cache', { symbol, cacheKey });
          return cachedData;
        }
      } catch (error) {
        logger.warn('Cache read failed for quote', {
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get current API key and check rate limits

    const apiKey = this.apiKeyManager.getCurrentKey();

    // Check rate limits
    await this.rateLimitService.checkLimit('yahoo-finance');

    try {
      const startTime = Date.now();

      // Fetch data from API
      const quoteData = await Promise.race([
        this.yahooFinanceService.getQuote(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // Record success
      this.apiKeyManager.recordSuccess();

      // Cache the result if caching is enabled
      if (useCache) {
        try {
          await this.cacheService.set(cacheKey, quoteData, cacheTTL);
          logger.debug('Quote cached successfully', {
            symbol,
            cacheKey,
            cacheTTL,
          });
        } catch (error) {
          logger.warn('Failed to cache quote', {
            symbol,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Quote fetched successfully', {
        symbol,
        price: quoteData.price,
        source: quoteData.source,
        responseTime,
        apiKey: apiKey.substring(0, 8) + '...',
      });

      return quoteData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check if this is a rate limit error
      if (this.isRateLimitError(error)) {
        logger.warn('Rate limit detected, rotating API key', {
          symbol,
          error: errorMessage,
          apiKey: apiKey.substring(0, 8) + '...',
        });

        try {
          // Rotate to next API key
          const newKey = this.apiKeyManager.rotateKey();
          logger.info('Rotated to new API key', {
            newKey: newKey.substring(0, 8) + '...',
          });

          // Retry with new key (one time only)
          return await this.retryQuoteWithNewKey(symbol, options);
        } catch (retryError) {
          logger.error('Retry with new API key failed', {
            symbol,
            retryError:
              retryError instanceof Error
                ? retryError.message
                : 'Unknown error',
          });
          throw retryError;
        }
      } else {
        // Record failure for non-rate-limit errors
        this.apiKeyManager.recordError(errorMessage);
      }

      logger.error('Failed to fetch quote', {
        symbol,
        error: errorMessage,
        apiKey: apiKey.substring(0, 8) + '...',
      });

      throw error;
    }
  }

  /**
   * Get quotes for multiple symbols in batch
   */
  async getBatchQuotes(
    request: BatchQuoteRequest
  ): Promise<BatchQuoteResponse> {
    const { symbols, options = {} } = request;
    const results: QuoteData[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];
    const fromCache: string[] = [];
    const fromApi: string[] = [];

    logger.info('Starting batch quote request', {
      symbolCount: symbols.length,
      symbols: symbols.slice(0, 10), // Log first 10 symbols
      useCache: options.useCache !== false,
    });

    // Process symbols in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(symbols, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async symbol => {
        try {
          const quote = await this.getQuote(symbol, options);
          results.push(quote);

          // Determine if data came from cache or API
          const cacheKey = `quote:${symbol.toUpperCase()}`;
          const wasFromCache = await this.cacheService.exists(cacheKey);

          if (wasFromCache && !options.forceRefresh) {
            fromCache.push(symbol);
          } else {
            fromApi.push(symbol);
          }
        } catch (error) {
          errors.push({
            symbol,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          logger.warn('Failed to fetch quote in batch', {
            symbol,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Wait for current chunk to complete before processing next chunk
      await Promise.all(chunkPromises);

      // Add small delay between chunks to be respectful to APIs
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(100);
      }
    }

    const response: BatchQuoteResponse = {
      data: results,
      errors,
      fromCache,
      fromApi,
      timestamp: new Date(),
    };

    logger.info('Batch quote request completed', {
      totalSymbols: symbols.length,
      successCount: results.length,
      errorCount: errors.length,
      fromCacheCount: fromCache.length,
      fromApiCount: fromApi.length,
    });

    return response;
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
   * Get historical data for a symbol
   */
  async getHistoricalData(
    symbol: string,
    period: string = '1y',
    interval: string = '1d',
    options: MarketDataOptions = {}
  ): Promise<HistoricalData> {
    const {
      useCache = true,
      cacheTTL = YAHOO_FINANCE_CONFIG.cacheTTL.historical,
      forceRefresh = false,
      timeout = 15000,
    } = options;

    const cacheKey = `historical:${symbol.toUpperCase()}:${period}:${interval}`;

    // Try cache first
    if (useCache && !forceRefresh) {
      try {
        const cachedData =
          await this.cacheService.get<HistoricalData>(cacheKey);
        if (cachedData) {
          logger.debug('Historical data served from cache', {
            symbol,
            period,
            interval,
          });
          return cachedData;
        }
      } catch (error) {
        logger.warn('Cache read failed for historical data', {
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get current API key and check rate limits
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiKey = this.apiKeyManager.getCurrentKey();

    // Check rate limits
    await this.rateLimitService.checkLimit('yahoo-finance');

    try {
      const startTime = Date.now();

      // Convert period and interval to valid Yahoo Finance values
      const validPeriod = this.normalizeYahooPeriod(period);
      const validInterval = this.normalizeYahooInterval(interval);

      const historicalData = await Promise.race([
        this.yahooFinanceService.getHistoricalData(
          symbol,
          validPeriod,
          validInterval
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // Record success
      this.apiKeyManager.recordSuccess();

      // Cache the result
      if (useCache) {
        try {
          await this.cacheService.set(cacheKey, historicalData, cacheTTL);
          logger.debug('Historical data cached successfully', {
            symbol,
            period,
            interval,
          });
        } catch (error) {
          logger.warn('Failed to cache historical data', {
            symbol,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Historical data fetched successfully', {
        symbol,
        period,
        interval,
        dataPoints: historicalData.data.length,
        responseTime,
      });

      return historicalData;
    } catch (error) {
      this.apiKeyManager.recordError((error as Error).message);

      logger.error('Failed to fetch historical data', {
        symbol,
        period,
        interval,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(
    query: string,
    options: MarketDataOptions = {}
  ): Promise<SearchResult[]> {
    const {
      useCache = true,
      cacheTTL = YAHOO_FINANCE_CONFIG.cacheTTL.search,
      forceRefresh = false,
      timeout = 10000,
    } = options;

    const cacheKey = `search:${query.toLowerCase()}`;

    // Try cache first
    if (useCache && !forceRefresh) {
      try {
        const cachedData =
          await this.cacheService.get<SearchResult[]>(cacheKey);
        if (cachedData) {
          logger.debug('Search results served from cache', { query });
          return cachedData;
        }
      } catch (error) {
        logger.warn('Cache read failed for search', {
          query,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get current API key and check rate limits
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiKey = this.apiKeyManager.getCurrentKey();

    // Check rate limits
    await this.rateLimitService.checkLimit('yahoo-finance');

    try {
      const startTime = Date.now();

      const searchResults = await Promise.race([
        this.yahooFinanceService.searchSymbols(query),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // Record success
      this.apiKeyManager.recordSuccess();

      // Cache the result
      if (useCache) {
        try {
          await this.cacheService.set(cacheKey, searchResults, cacheTTL);
          logger.debug('Search results cached successfully', { query });
        } catch (error) {
          logger.warn('Failed to cache search results', {
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Symbol search completed successfully', {
        query,
        resultCount: searchResults.length,
        responseTime,
      });

      return searchResults;
    } catch (error) {
      this.apiKeyManager.recordError((error as Error).message);

      logger.error('Failed to search symbols', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get market summary (major indices)
   */
  async getMarketSummary(
    options: MarketDataOptions = {}
  ): Promise<QuoteData[]> {
    const cacheKey = 'market:summary';
    const {
      useCache = true,
      cacheTTL = 300, // 5 minutes for market summary
      forceRefresh = false,
    } = options;

    // Try cache first
    if (useCache && !forceRefresh) {
      try {
        const cachedData = await this.cacheService.get<QuoteData[]>(cacheKey);
        if (cachedData) {
          logger.debug('Market summary served from cache');
          return cachedData;
        }
      } catch (error) {
        logger.warn('Cache read failed for market summary', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    try {
      const marketSummary = await this.yahooFinanceService.getMarketSummary();

      // Cache the result
      if (useCache) {
        try {
          await this.cacheService.set(cacheKey, marketSummary, cacheTTL);
          logger.debug('Market summary cached successfully');
        } catch (error) {
          logger.warn('Failed to cache market summary', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Market summary fetched successfully', {
        indicesCount: marketSummary.length,
      });

      return marketSummary;
    } catch (error) {
      logger.error('Failed to fetch market summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Refresh cache for specific symbols
   */
  async refreshCache(symbols: string[]): Promise<{
    success: string[];
    errors: Array<{ symbol: string; error: string }>;
  }> {
    logger.info('Starting cache refresh', { symbolCount: symbols.length });

    const success: string[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    for (const symbol of symbols) {
      try {
        // Force refresh from API
        await this.getQuote(symbol, { forceRefresh: true });
        success.push(symbol);

        logger.debug('Cache refreshed for symbol', { symbol });
      } catch (error) {
        errors.push({
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.warn('Failed to refresh cache for symbol', {
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Cache refresh completed', {
      totalSymbols: symbols.length,
      successCount: success.length,
      errorCount: errors.length,
    });

    return { success, errors };
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, unknown>;
  }> {
    try {
      // Test basic functionality
      await this.getQuote('AAPL', { useCache: false });

      const yahooHealth = await this.yahooFinanceService.healthCheck();
      const rateLimitHealth = await this.rateLimitService.getStatus();
      const apiKeyHealth = this.apiKeyManager.getStats();
      const cacheHealth = await this.cacheService.healthCheck();

      const allHealthy =
        [yahooHealth, cacheHealth].every(h => h.status === 'healthy') &&
        rateLimitHealth.minute.remainingPoints > 0 &&
        apiKeyHealth.activeKeys > 0;

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details: {
          service: 'Market Data Service',
          components: {
            yahooFinance: yahooHealth,
            rateLimit: rateLimitHealth,
            apiKeyManager: apiKeyHealth,
            cache: cacheHealth,
          },
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'Market Data Service',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
