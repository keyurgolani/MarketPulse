// Jest globals are available without import
import { GoogleFinanceService } from '../services/GoogleFinanceService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as any;

// Mock the axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

describe('GoogleFinanceService', () => {
  let googleFinanceService: GoogleFinanceService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    googleFinanceService = new GoogleFinanceService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should create GoogleFinanceService instance', () => {
      expect(googleFinanceService).toBeDefined();
      expect(googleFinanceService).toBeInstanceOf(GoogleFinanceService);
    });

    it('should have required methods', () => {
      expect(typeof googleFinanceService.getQuote).toBe('function');
      expect(typeof googleFinanceService.getHistoricalData).toBe('function');
      expect(typeof googleFinanceService.searchSymbols).toBe('function');
      expect(typeof googleFinanceService.getMarketSummary).toBe('function');
      expect(typeof googleFinanceService.healthCheck).toBe('function');
      expect(typeof googleFinanceService.getStats).toBe('function');
    });
  });

  describe('getQuote', () => {
    it('should return quote data structure', async () => {
      // Mock successful API response
      const mockResponse = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.5,
          changePercent: 1.69,
          volume: 50000000,
          marketCap: 2500000000000,
          lastUpdated: new Date().toISOString(),
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const quote = await googleFinanceService.getQuote('AAPL');

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
      expect(quote.source).toBe('google-finance');
      expect(typeof quote.price).toBe('number');
      expect(typeof quote.change).toBe('number');
      expect(typeof quote.changePercent).toBe('number');
      expect(quote.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle invalid symbols', async () => {
      await expect(googleFinanceService.getQuote('')).rejects.toThrow();
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data structure', async () => {
      // Mock successful historical data response
      const mockResponse = {
        data: {
          symbol: 'AAPL',
          meta: {
            currency: 'USD',
            symbol: 'AAPL',
            exchangeName: 'NASDAQ',
            instrumentType: 'EQUITY',
            firstTradeDate: 345479400,
            regularMarketTime: Date.now(),
            gmtoffset: -18000,
            timezone: 'EST',
            exchangeTimezoneName: 'America/New_York',
          },
          data: [
            {
              timestamp: Date.now() - 86400000,
              open: 148.5,
              high: 152.3,
              low: 147.8,
              close: 150.25,
              volume: 45000000,
            },
            {
              timestamp: Date.now() - 172800000,
              open: 146.2,
              high: 149.1,
              low: 145.5,
              close: 148.5,
              volume: 42000000,
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const data = await googleFinanceService.getHistoricalData('AAPL', '1mo');

      expect(data).toBeDefined();
      expect(data.symbol).toBe('AAPL');
      expect(data.meta).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      const firstPoint = data.data[0];
      expect(firstPoint).toBeDefined();
      expect(typeof firstPoint?.timestamp).toBe('number');
      expect(typeof firstPoint?.open).toBe('number');
      expect(typeof firstPoint?.high).toBe('number');
      expect(typeof firstPoint?.low).toBe('number');
      expect(typeof firstPoint?.close).toBe('number');
      expect(typeof firstPoint?.volume).toBe('number');
    });

    it('should handle invalid symbols for historical data', async () => {
      await expect(
        googleFinanceService.getHistoricalData('', '1mo')
      ).rejects.toThrow();
    });
  });

  describe('searchSymbols', () => {
    it('should return search results structure', async () => {
      // Mock successful search response
      const mockResponse = {
        data: [
          ['Apple Inc.', 'AAPL', 'NASDAQ', 'Stock'],
          ['Apple Hospitality REIT Inc.', 'APLE', 'NYSE', 'REIT'],
          ['Applied Materials Inc.', 'AMAT', 'NASDAQ', 'Stock'],
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const results = await googleFinanceService.searchSymbols('Apple', 5);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      expect(firstResult?.symbol).toBeDefined();
      expect(firstResult?.name).toBeDefined();
      expect(firstResult?.exchange).toBeDefined();
      expect(firstResult?.type).toBeDefined();
      expect(firstResult?.source).toBe('google-finance');
    });

    it('should handle empty search queries', async () => {
      await expect(googleFinanceService.searchSymbols('')).rejects.toThrow();
    });
  });

  describe('getMarketSummary', () => {
    it('should return market summary data', async () => {
      // Mock successful market summary response
      const mockResponse = {
        data: [
          {
            symbol: 'SPY',
            name: 'SPDR S&P 500 ETF Trust',
            price: 445.2,
            change: 2.15,
            changePercent: 0.48,
            source: 'google-finance',
          },
          {
            symbol: 'QQQ',
            name: 'Invesco QQQ Trust',
            price: 375.8,
            change: -1.25,
            changePercent: -0.33,
            source: 'google-finance',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const summary = await googleFinanceService.getMarketSummary();

      expect(Array.isArray(summary)).toBe(true);
      expect(summary.length).toBeGreaterThan(0);

      const firstIndex = summary[0];
      expect(firstIndex).toBeDefined();
      expect(firstIndex?.symbol).toBeDefined();
      expect(firstIndex?.name).toBeDefined();
      expect(typeof firstIndex?.price).toBe('number');
      expect(firstIndex?.source).toBe('google-finance');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      // Mock successful health check response
      const mockResponse = {
        data: { status: 'ok' },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const health = await googleFinanceService.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|unhealthy/);
      expect(typeof health.latency).toBe('number');

      if (health.status === 'unhealthy') {
        expect(health.error).toBeDefined();
      }
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = googleFinanceService.getStats();

      expect(stats).toBeDefined();
      expect(stats.rateLimits).toBeDefined();
      expect(stats.apiKeys).toBeDefined();
    });
  });
});
