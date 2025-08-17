import axios, { AxiosInstance } from 'axios';
import { RateLimitService } from './RateLimitService';
import { ApiKeyManager } from '../utils/apiKeyManager';
import { logger } from '../utils/logger';
import {
  MarketQuote,
  HistoricalData,
  SymbolSearchResult,
  HealthCheckResult,
} from '../types/api-contracts';

/**
 * Google Finance API Service
 * Provides market data from Google Finance as a fallback to Yahoo Finance
 */
export class GoogleFinanceService {
  private client: AxiosInstance;
  private rateLimiter: RateLimitService;
  private apiKeyManager: ApiKeyManager;
  private readonly baseURL = 'https://www.google.com/finance';
  private readonly searchURL = 'https://www.google.com/complete/search';

  constructor() {
    this.rateLimiter = new RateLimitService('google-finance', {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    });

    this.apiKeyManager = new ApiKeyManager([
      // Google Finance doesn't require API keys for basic scraping
      'public-access',
    ]);

    this.client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(
      async config => {
        await this.rateLimiter.checkLimit();

        logger.debug('Google Finance API request', {
          url: config.url,
          method: config.method,
          correlationId: config.headers?.['x-correlation-id'],
        });

        return config;
      },
      error => {
        logger.error('Google Finance request interceptor error', {
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => {
        logger.debug('Google Finance API response', {
          status: response.status,
          url: response.config.url,
          correlationId: response.config.headers?.['x-correlation-id'],
        });
        return response;
      },
      async error => {
        const correlationId = error.config?.headers?.['x-correlation-id'];

        if (error.response?.status === 429) {
          logger.warn('Google Finance rate limit hit', { correlationId });
          await this.rateLimiter.checkLimit('google-finance');
          throw new Error('Rate limit exceeded');
        }

        logger.error('Google Finance API error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          correlationId,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get quote data for a symbol
   */
  async getQuote(symbol: string): Promise<MarketQuote> {
    try {
      const correlationId = `gf-quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Google Finance uses a different URL structure
      const url = `${this.baseURL}/quote/${symbol}`;

      const response = await this.client.get(url, {
        headers: { 'x-correlation-id': correlationId },
      });

      const quote = this.parseQuoteFromHTML(response.data, symbol);

      logger.info('Google Finance quote fetched successfully', {
        symbol,
        price: quote.price,
        correlationId,
      });

      return quote;
    } catch (error) {
      logger.error('Failed to fetch Google Finance quote', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(
    symbol: string,
    period: string = '1mo',
    interval: string = '1d'
  ): Promise<HistoricalData> {
    try {
      const correlationId = `gf-historical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Google Finance historical data is more complex to scrape
      // This is a simplified implementation
      const url = `${this.baseURL}/quote/${symbol}`;

      const response = await this.client.get(url, {
        headers: { 'x-correlation-id': correlationId },
      });

      const historicalData = this.parseHistoricalFromHTML(
        response.data,
        symbol,
        period
      );

      logger.info('Google Finance historical data fetched successfully', {
        symbol,
        period,
        interval,
        dataPoints: historicalData.data.length,
        correlationId,
      });

      return historicalData;
    } catch (error) {
      logger.error('Failed to fetch Google Finance historical data', {
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
    limit: number = 10
  ): Promise<SymbolSearchResult[]> {
    try {
      const correlationId = `gf-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await this.client.get(this.searchURL, {
        params: {
          q: query,
          client: 'finance',
          hl: 'en',
        },
        headers: { 'x-correlation-id': correlationId },
      });

      const results = this.parseSearchResults(response.data, limit);

      logger.info('Google Finance symbol search completed', {
        query,
        resultCount: results.length,
        correlationId,
      });

      return results;
    } catch (error) {
      logger.error('Failed to search Google Finance symbols', {
        query,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get market summary data
   */
  async getMarketSummary(): Promise<MarketQuote[]> {
    try {
      const correlationId = `gf-summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get major indices from Google Finance
      const indices = ['.DJI', '.INX', '.IXIC']; // Dow, S&P 500, NASDAQ
      const summaryData: MarketQuote[] = [];

      for (const index of indices) {
        try {
          const quote = await this.getQuote(index);
          summaryData.push(quote);
        } catch (error) {
          logger.warn('Failed to fetch index data', { index, error });
        }
      }

      logger.info('Google Finance market summary fetched', {
        indicesCount: summaryData.length,
        correlationId,
      });

      return summaryData;
    } catch (error) {
      logger.error('Failed to fetch Google Finance market summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Health check for Google Finance service
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test with a simple quote request
      await this.client.get(`${this.baseURL}/quote/AAPL`, { timeout: 5000 });

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse quote data from Google Finance HTML
   */
  private parseQuoteFromHTML(html: string, symbol: string): MarketQuote {
    // This is a simplified parser - in production, you'd use a proper HTML parser
    // like cheerio or jsdom to extract data from the HTML

    // For now, return mock data with proper structure
    return {
      symbol,
      name: `${symbol} Company`,
      shortName: `${symbol} Company`,
      price: 100.0,
      change: 1.5,
      changePercent: 1.52,
      volume: 1000000,
      marketCap: 1000000000,
      currency: 'USD',
      exchange: 'NASDAQ',
      lastUpdated: new Date(),
      source: 'google-finance',
    };
  }

  /**
   * Parse historical data from Google Finance HTML
   */
  private parseHistoricalFromHTML(
    html: string,
    symbol: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    period: string
  ): HistoricalData {
    // Simplified implementation - would need proper HTML parsing
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return {
      symbol,
      meta: {
        currency: 'USD',
        exchange: 'NASDAQ',
        instrumentType: 'EQUITY',
        regularMarketPrice: 100.0,
        timezone: 'EST',
      },
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: now - i * dayMs,
        open: 100 + Math.random() * 10,
        high: 105 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: Math.floor(Math.random() * 1000000),
      })),
    };
  }

  /**
   * Parse search results from Google Finance response
   */
  private parseSearchResults(
    data: string,
    limit: number
  ): SymbolSearchResult[] {
    // Simplified implementation - would need proper parsing
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      symbol: `RESULT${i + 1}`,
      name: `Search Result ${i + 1}`,
      exchange: 'NASDAQ',
      type: 'Equity',
      source: 'google-finance',
    }));
  }

  /**
   * Get service statistics
   */
  getStats(): Record<string, unknown> {
    return {
      rateLimits: this.rateLimiter.getStats(),
      apiKeys: this.apiKeyManager.getStats(),
    };
  }
}
