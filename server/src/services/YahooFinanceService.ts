/**
 * Yahoo Finance API Service
 * Handles all interactions with Yahoo Finance API including rate limiting and error handling
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { YAHOO_FINANCE_CONFIG, DataSourceConfig } from '../config/apiClients';
import { RateLimitService } from './RateLimitService';
import { ApiKeyManager } from '../utils/apiKeyManager';
import { logger } from '../utils/logger';

export interface YahooQuoteResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        instrumentType: string;
        firstTradeDate: number;
        regularMarketTime: number;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        previousClose: number;
        scale: number;
        priceHint: number;
        currentTradingPeriod: {
          pre: {
            timezone: string;
            start: number;
            end: number;
            gmtoffset: number;
          };
          regular: {
            timezone: string;
            start: number;
            end: number;
            gmtoffset: number;
          };
          post: {
            timezone: string;
            start: number;
            end: number;
            gmtoffset: number;
          };
        };
        tradingPeriods: Array<
          Array<{
            timezone: string;
            start: number;
            end: number;
            gmtoffset: number;
          }>
        >;
        dataGranularity: string;
        range: string;
        validRanges: string[];
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
        adjclose?: Array<{
          adjclose: number[];
        }>;
      };
    }>;
    error: null | {
      code: string;
      description: string;
    };
  };
}

export interface YahooSearchResponse {
  explains: unknown[];
  count: number;
  quotes: Array<{
    exchange: string;
    shortname: string;
    quoteType: string;
    symbol: string;
    index: string;
    score: number;
    typeDisp: string;
    longname: string;
    exchDisp: string;
    sector?: string;
    industry?: string;
  }>;
  news: Array<{
    uuid: string;
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: number;
    type: string;
    thumbnail?: {
      resolutions: Array<{
        url: string;
        width: number;
        height: number;
        tag: string;
      }>;
    };
  }>;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  currency: string;
  exchange: string;
  lastUpdated: Date;
  source: string;
  // Optional fields for additional data
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

// Type aliases for backward compatibility
export type QuoteData = MarketQuote;
export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
  industry?: string;
  source: string;
};

export interface HistoricalDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number | undefined;
}

export interface HistoricalData {
  symbol: string;
  data: HistoricalDataPoint[];
  meta: {
    currency: string;
    exchange: string;
    instrumentType: string;
    regularMarketPrice: number;
    timezone: string;
    // Optional additional fields from Yahoo Finance
    firstTradeDate?: number;
    regularMarketTime?: number;
    dataGranularity?: string;
    range?: string;
  };
  // Optional fields for compatibility
  period?: string;
  interval?: string;
  source?: string;
}

export class YahooFinanceService {
  private client: AxiosInstance;
  private rateLimiter: RateLimitService;
  private apiKeyManager: ApiKeyManager;
  private config: DataSourceConfig;
  private requestId = 0;

  constructor() {
    this.config = YAHOO_FINANCE_CONFIG;
    this.rateLimiter = new RateLimitService(
      'yahoo-finance',
      this.config.config.rateLimit
    );
    this.apiKeyManager = new ApiKeyManager(this.config.apiKeys);

    this.client = axios.create({
      baseURL: this.config.config.baseURL,
      timeout: this.config.config.timeout,
      headers: this.config.config.headers,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging and correlation IDs
    this.client.interceptors.request.use(
      config => {
        const correlationId = `yahoo-${++this.requestId}-${Date.now()}`;
        config.headers['X-Correlation-ID'] = correlationId;

        logger.debug('Yahoo Finance API Request', {
          correlationId,
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });

        return config;
      },
      error => {
        logger.error('Yahoo Finance Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const correlationId = response.config.headers['X-Correlation-ID'];

        logger.debug('Yahoo Finance API Response', {
          correlationId,
          status: response.status,
          statusText: response.statusText,
          dataSize: JSON.stringify(response.data).length,
        });

        return response;
      },
      error => {
        const correlationId = error.config?.headers['X-Correlation-ID'];

        logger.error('Yahoo Finance Response Error', {
          correlationId,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          data: error.response?.data,
        });

        // Handle rate limiting
        if (error.response?.status === 429) {
          logger.warn('Yahoo Finance rate limit hit, rotating API key');
          this.apiKeyManager.rotateKey();
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<MarketQuote> {
    await this.rateLimiter.checkLimit();

    try {
      const url = this.config.endpoints.quote.replace('{symbol}', symbol);
      const response = await this.client.get<YahooQuoteResponse>(url, {
        params: {
          interval: '1m',
          range: '1d',
          includePrePost: true,
        },
      });

      if (response.data.chart.error) {
        throw new Error(
          `Yahoo Finance API Error: ${response.data.chart.error.description}`
        );
      }

      const result = response.data.chart.result[0];
      if (!result) {
        throw new Error(`No data found for symbol: ${symbol}`);
      }

      const meta = result.meta;
      const quote = result.indicators.quote[0];

      if (!quote) {
        throw new Error(`No quote data found for symbol: ${symbol}`);
      }

      const lastIndex = quote.close.length - 1;

      const currentPrice = quote.close[lastIndex] || meta.regularMarketPrice;
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol: meta.symbol,
        name: meta.symbol, // Yahoo doesn't always provide company name in chart endpoint
        shortName: meta.symbol,
        price: currentPrice,
        change,
        changePercent,
        volume: quote.volume[lastIndex] || 0,
        marketCap: 0, // Not available in chart endpoint
        currency: meta.currency,
        exchange: meta.exchangeName,
        lastUpdated: new Date(meta.regularMarketTime * 1000),
        source: 'Yahoo Finance',
      };
    } catch (error) {
      logger.error('Failed to get quote from Yahoo Finance', {
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
    period:
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
      | 'max' = '1y',
    interval:
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
      | '3mo' = '1d'
  ): Promise<HistoricalData> {
    await this.rateLimiter.checkLimit();

    try {
      const url = this.config.endpoints.historical.replace('{symbol}', symbol);
      const response = await this.client.get<YahooQuoteResponse>(url, {
        params: {
          range: period,
          interval,
          includePrePost: false,
        },
      });

      if (response.data.chart.error) {
        throw new Error(
          `Yahoo Finance API Error: ${response.data.chart.error.description}`
        );
      }

      const result = response.data.chart.result[0];
      if (!result) {
        throw new Error(`No historical data found for symbol: ${symbol}`);
      }

      const meta = result.meta;
      const quote = result.indicators.quote[0];
      const adjClose = result.indicators.adjclose?.[0];

      if (!quote) {
        throw new Error(`No quote data found for symbol: ${symbol}`);
      }

      const data: HistoricalDataPoint[] = result.timestamp
        .map((timestamp, index) => ({
          timestamp,
          open: quote.open[index] ?? 0,
          high: quote.high[index] ?? 0,
          low: quote.low[index] ?? 0,
          close: quote.close[index] ?? 0,
          volume: quote.volume[index] ?? 0,
          adjClose: adjClose?.adjclose[index],
        }))
        .filter(
          point =>
            point.open !== null &&
            point.high !== null &&
            point.low !== null &&
            point.close !== null &&
            point.open !== 0 &&
            point.high !== 0 &&
            point.low !== 0 &&
            point.close !== 0
        );

      return {
        symbol: meta.symbol,
        data,
        meta: {
          currency: meta.currency,
          exchange: meta.exchangeName,
          instrumentType: meta.instrumentType,
          regularMarketPrice: meta.regularMarketPrice || 0,
          timezone: meta.timezone,
          firstTradeDate: meta.firstTradeDate,
          regularMarketTime: meta.regularMarketTime,
          dataGranularity: meta.dataGranularity,
          range: meta.range,
        },
      };
    } catch (error) {
      logger.error('Failed to get historical data from Yahoo Finance', {
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
    limit = 10
  ): Promise<
    Array<{
      symbol: string;
      name: string;
      exchange: string;
      type: string;
      source: string;
      sector?: string;
      industry?: string;
    }>
  > {
    await this.rateLimiter.checkLimit();

    try {
      const response = await this.client.get<YahooSearchResponse>(
        this.config.endpoints.search,
        {
          params: {
            q: query,
            quotesCount: limit,
            newsCount: 0,
          },
        }
      );

      return response.data.quotes.map(quote => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname,
        exchange: quote.exchDisp || quote.exchange,
        type: quote.typeDisp || quote.quoteType,
        source: 'yahoo-finance',
        ...(quote.sector && { sector: quote.sector }),
        ...(quote.industry && { industry: quote.industry }),
      }));
    } catch (error) {
      logger.error('Failed to search symbols in Yahoo Finance', {
        query,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get market summary (major indices)
   */
  async getMarketSummary(): Promise<MarketQuote[]> {
    const majorIndices = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow Jones, NASDAQ, Russell 2000

    try {
      const quotes = await Promise.allSettled(
        majorIndices.map(symbol => this.getQuote(symbol))
      );

      return quotes
        .filter(
          (result): result is PromiseFulfilledResult<MarketQuote> =>
            result.status === 'fulfilled'
        )
        .map(result => result.value);
    } catch (error) {
      logger.error('Failed to get market summary from Yahoo Finance', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.getQuote('AAPL'); // Test with a reliable symbol
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
}
