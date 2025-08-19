/**
 * Yahoo Finance Service Tests
 * Comprehensive tests for Yahoo Finance API integration
 */

// Jest globals are available without import
import axios from 'axios';
import {
  YahooFinanceService,
  YahooQuoteResponse,
  YahooSearchResponse,
} from '../services/YahooFinanceService';
import { RateLimitService } from '../services/RateLimitService';
import { ApiKeyManager } from '../utils/apiKeyManager';

// Mock dependencies
jest.mock('axios');
jest.mock('../services/RateLimitService');
jest.mock('../utils/apiKeyManager');
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedAxios = axios as any;
const MockedRateLimitService = RateLimitService as any;
const MockedApiKeyManager = ApiKeyManager as any;

describe('YahooFinanceService', () => {
  let service: YahooFinanceService;
  let mockAxiosInstance: any;
  let mockRateLimiter: any;
  let mockApiKeyManager: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock rate limiter
    mockRateLimiter = {
      checkLimit: jest.fn().mockImplementation(() => Promise.resolve()),
    };
    MockedRateLimitService.mockImplementation(() => mockRateLimiter);

    // Mock API key manager
    mockApiKeyManager = {
      rotateKey: jest.fn(),
    };
    MockedApiKeyManager.mockImplementation(() => mockApiKeyManager);

    service = new YahooFinanceService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://query1.finance.yahoo.com',
        timeout: 10000,
        headers: {
          'User-Agent': 'MarketPulse/1.0.0 (Financial Dashboard)',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getQuote', () => {
    const mockQuoteResponse: YahooQuoteResponse = {
      chart: {
        result: [
          {
            meta: {
              currency: 'USD',
              symbol: 'AAPL',
              exchangeName: 'NMS',
              instrumentType: 'EQUITY',
              firstTradeDate: 345479400,
              regularMarketTime: 1640995200,
              gmtoffset: -18000,
              timezone: 'EST',
              exchangeTimezoneName: 'America/New_York',
              regularMarketPrice: 150.0,
              chartPreviousClose: 148.0,
              previousClose: 148.0,
              scale: 3,
              priceHint: 2,
              currentTradingPeriod: {
                pre: {
                  timezone: 'EST',
                  start: 1640995200,
                  end: 1640995200,
                  gmtoffset: -18000,
                },
                regular: {
                  timezone: 'EST',
                  start: 1640995200,
                  end: 1640995200,
                  gmtoffset: -18000,
                },
                post: {
                  timezone: 'EST',
                  start: 1640995200,
                  end: 1640995200,
                  gmtoffset: -18000,
                },
              },
              tradingPeriods: [
                [
                  {
                    timezone: 'EST',
                    start: 1640995200,
                    end: 1640995200,
                    gmtoffset: -18000,
                  },
                ],
              ],
              dataGranularity: '1m',
              range: '1d',
              validRanges: ['1d', '5d', '1mo'],
            },
            timestamp: [1640995200],
            indicators: {
              quote: [
                {
                  open: [149.0],
                  high: [151.0],
                  low: [148.5],
                  close: [150.0],
                  volume: [1000000],
                },
              ],
            },
          },
        ],
        error: null,
      },
    };

    it('should successfully get quote for valid symbol', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockQuoteResponse });

      const result = await service.getQuote('AAPL');

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v8/finance/chart/AAPL',
        {
          params: {
            interval: '1m',
            range: '1d',
            includePrePost: true,
          },
        }
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'AAPL',
        shortName: 'AAPL',
        price: 150.0,
        change: 2.0,
        changePercent: (2.0 / 148.0) * 100,
        volume: 1000000,
        marketCap: 0,
        currency: 'USD',
        exchange: 'NMS',
        lastUpdated: new Date(1640995200 * 1000),
        source: 'Yahoo Finance',
      });
    });

    it('should handle API error response', async () => {
      const errorResponse: YahooQuoteResponse = {
        chart: {
          result: [],
          error: {
            code: 'Not Found',
            description: 'No data found, symbol may be delisted',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: errorResponse });

      await expect(service.getQuote('INVALID')).rejects.toThrow(
        'Yahoo Finance API Error: No data found, symbol may be delisted'
      );
    });

    it('should handle empty result', async () => {
      const emptyResponse: YahooQuoteResponse = {
        chart: {
          result: [],
          error: null,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: emptyResponse });

      await expect(service.getQuote('EMPTY')).rejects.toThrow(
        'No data found for symbol: EMPTY'
      );
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getQuote('AAPL')).rejects.toThrow('Network error');
    });

    it('should handle rate limiting', async () => {
      mockRateLimiter.checkLimit.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(service.getQuote('AAPL')).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });

  describe('getHistoricalData', () => {
    const mockHistoricalResponse: YahooQuoteResponse = {
      chart: {
        result: [
          {
            meta: {
              currency: 'USD',
              symbol: 'AAPL',
              exchangeName: 'NMS',
              instrumentType: 'EQUITY',
              firstTradeDate: 345479400,
              regularMarketTime: 1640995200,
              gmtoffset: -18000,
              timezone: 'EST',
              exchangeTimezoneName: 'America/New_York',
              regularMarketPrice: 150.0,
              chartPreviousClose: 148.0,
              previousClose: 148.0,
              scale: 3,
              priceHint: 2,
              currentTradingPeriod: {
                pre: {
                  timezone: 'EST',
                  start: 1640995200,
                  end: 1640995200,
                  gmtoffset: -18000,
                },
                regular: {
                  timezone: 'EST',
                  start: 1640995200,
                  end: 1640995200,
                  gmtoffset: -18000,
                },
                post: {
                  timezone: 'EST',
                  start: 1640995200,
                  end: 1640995200,
                  gmtoffset: -18000,
                },
              },
              tradingPeriods: [
                [
                  {
                    timezone: 'EST',
                    start: 1640995200,
                    end: 1640995200,
                    gmtoffset: -18000,
                  },
                ],
              ],
              dataGranularity: '1d',
              range: '1y',
              validRanges: ['1d', '5d', '1mo', '1y'],
            },
            timestamp: [1640995200, 1641081600],
            indicators: {
              quote: [
                {
                  open: [149.0, 150.5],
                  high: [151.0, 152.0],
                  low: [148.5, 149.0],
                  close: [150.0, 151.5],
                  volume: [1000000, 1100000],
                },
              ],
              adjclose: [
                {
                  adjclose: [150.0, 151.5],
                },
              ],
            },
          },
        ],
        error: null,
      },
    };

    it('should successfully get historical data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockHistoricalResponse });

      const result = await service.getHistoricalData('AAPL', '1y', '1d');

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v8/finance/chart/AAPL',
        {
          params: {
            range: '1y',
            interval: '1d',
            includePrePost: false,
          },
        }
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        data: [
          {
            timestamp: 1640995200,
            open: 149.0,
            high: 151.0,
            low: 148.5,
            close: 150.0,
            volume: 1000000,
            adjClose: 150.0,
          },
          {
            timestamp: 1641081600,
            open: 150.5,
            high: 152.0,
            low: 149.0,
            close: 151.5,
            volume: 1100000,
            adjClose: 151.5,
          },
        ],
        meta: {
          currency: 'USD',
          exchange: 'NMS',
          instrumentType: 'EQUITY',
          regularMarketPrice: 150,
          firstTradeDate: 345479400,
          regularMarketTime: 1640995200,
          timezone: 'EST',
          dataGranularity: '1d',
          range: '1y',
        },
      });
    });

    it('should use default parameters', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockHistoricalResponse });

      await service.getHistoricalData('AAPL');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v8/finance/chart/AAPL',
        {
          params: {
            range: '1y',
            interval: '1d',
            includePrePost: false,
          },
        }
      );
    });

    it('should filter out null data points', async () => {
      const responseWithNulls: YahooQuoteResponse = {
        chart: {
          result: [
            {
              meta: mockHistoricalResponse.chart.result[0]!.meta,
              timestamp: [1640995200, 1641081600, 1641168000],
              indicators: {
                quote: [
                  {
                    open: [149.0, null as any, 150.5],
                    high: [151.0, null as any, 152.0],
                    low: [148.5, null as any, 149.0],
                    close: [150.0, null as any, 151.5],
                    volume: [1000000, null as any, 1100000],
                  },
                ],
                adjclose: [
                  {
                    adjclose: [150.0, null as any, 151.5],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: responseWithNulls });

      const result = await service.getHistoricalData('AAPL');

      expect(result.data).toHaveLength(2); // Null entry should be filtered out
    });
  });

  describe('searchSymbols', () => {
    const mockSearchResponse: YahooSearchResponse = {
      explains: [],
      count: 2,
      quotes: [
        {
          exchange: 'NMS',
          shortname: 'Apple Inc.',
          quoteType: 'EQUITY',
          symbol: 'AAPL',
          index: 'quotes',
          score: 1000000,
          typeDisp: 'Equity',
          longname: 'Apple Inc.',
          exchDisp: 'NASDAQ',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        },
        {
          exchange: 'NMS',
          shortname: 'Microsoft Corporation',
          quoteType: 'EQUITY',
          symbol: 'MSFT',
          index: 'quotes',
          score: 999999,
          typeDisp: 'Equity',
          longname: 'Microsoft Corporation',
          exchDisp: 'NASDAQ',
          sector: 'Technology',
          industry: 'Software',
        },
      ],
      news: [],
    };

    it('should successfully search symbols', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSearchResponse });

      const result = await service.searchSymbols('tech', 5);

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/finance/search', {
        params: {
          q: 'tech',
          quotesCount: 5,
          newsCount: 0,
        },
      });

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'Equity',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          source: 'yahoo-finance',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          exchange: 'NASDAQ',
          type: 'Equity',
          sector: 'Technology',
          industry: 'Software',
          source: 'yahoo-finance',
        },
      ]);
    });

    it('should use default limit', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSearchResponse });

      await service.searchSymbols('tech');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/finance/search', {
        params: {
          q: 'tech',
          quotesCount: 10,
          newsCount: 0,
        },
      });
    });
  });

  describe('getMarketSummary', () => {
    it('should get market summary for major indices', async () => {
      const mockQuote = {
        symbol: '^GSPC',
        name: '^GSPC',
        shortName: 'S&P 500',
        price: 4000.0,
        change: 50.0,
        changePercent: 1.27,
        volume: 1000000,
        marketCap: 0,
        currency: 'USD',
        exchange: 'SNP',
        lastUpdated: new Date(),
        source: 'Yahoo Finance',
      };

      // Mock the getQuote method
      jest.spyOn(service, 'getQuote').mockResolvedValue(mockQuote);

      const result = await service.getMarketSummary();

      expect(result).toHaveLength(4); // Should return 4 major indices
      expect(service.getQuote).toHaveBeenCalledTimes(4);
      expect(service.getQuote).toHaveBeenCalledWith('^GSPC');
      expect(service.getQuote).toHaveBeenCalledWith('^DJI');
      expect(service.getQuote).toHaveBeenCalledWith('^IXIC');
      expect(service.getQuote).toHaveBeenCalledWith('^RUT');
    });

    it('should handle partial failures in market summary', async () => {
      const mockQuote = {
        symbol: '^GSPC',
        name: '^GSPC',
        shortName: 'S&P 500',
        price: 4000.0,
        change: 50.0,
        changePercent: 1.27,
        volume: 1000000,
        marketCap: 0,
        currency: 'USD',
        exchange: 'SNP',
        lastUpdated: new Date(),
        source: 'Yahoo Finance',
      };

      // Mock some successes and some failures
      jest
        .spyOn(service, 'getQuote')
        .mockResolvedValueOnce(mockQuote)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockQuote)
        .mockResolvedValueOnce(mockQuote);

      const result = await service.getMarketSummary();

      expect(result).toHaveLength(3); // Should return only successful quotes
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status on successful API call', async () => {
      jest.spyOn(service, 'getQuote').mockResolvedValue({
        symbol: 'AAPL',
        name: 'AAPL',
        shortName: 'Apple Inc.',
        price: 150.0,
        change: 2.0,
        changePercent: 1.35,
        volume: 1000000,
        marketCap: 2500000000000,
        currency: 'USD',
        exchange: 'NMS',
        lastUpdated: new Date(),
        source: 'Yahoo Finance',
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status on API failure', async () => {
      jest.spyOn(service, 'getQuote').mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBe('API Error');
    });
  });
});
