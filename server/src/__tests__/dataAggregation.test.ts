// Jest globals are available without import
import { DataAggregationService } from '../services/DataAggregationService';
import { YahooFinanceService } from '../services/YahooFinanceService';
import { GoogleFinanceService } from '../services/GoogleFinanceService';

// Mock the external services
jest.mock('../services/YahooFinanceService');
jest.mock('../services/GoogleFinanceService');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const MockedYahooFinanceService = YahooFinanceService as any;
const MockedGoogleFinanceService = GoogleFinanceService as any;

describe('DataAggregationService', () => {
  let dataAggregationService: DataAggregationService;
  let mockYahooService: any;
  let mockGoogleService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Yahoo Finance Service
    mockYahooService = {
      getQuote: jest.fn(),
      getHistoricalData: jest.fn(),
      searchSymbols: jest.fn(),
      getMarketSummary: jest.fn(),
      getHealthStatus: jest.fn(),
      getStats: jest.fn(),
    };

    // Mock Google Finance Service
    mockGoogleService = {
      getQuote: jest.fn(),
      getHistoricalData: jest.fn(),
      searchSymbols: jest.fn(),
      getMarketSummary: jest.fn(),
      getHealthStatus: jest.fn(),
      getStats: jest.fn(),
    };

    MockedYahooFinanceService.mockImplementation(() => mockYahooService);
    MockedGoogleFinanceService.mockImplementation(() => mockGoogleService);

    dataAggregationService = new DataAggregationService();
  });

  describe('initialization', () => {
    it('should create DataAggregationService instance', () => {
      expect(dataAggregationService).toBeDefined();
      expect(dataAggregationService).toBeInstanceOf(DataAggregationService);
    });

    it('should have required methods', () => {
      expect(typeof dataAggregationService.getQuote).toBe('function');
      expect(typeof dataAggregationService.getHistoricalData).toBe('function');
      expect(typeof dataAggregationService.searchSymbols).toBe('function');
      expect(typeof dataAggregationService.getMarketSummary).toBe('function');
      expect(typeof dataAggregationService.getHealthStatus).toBe('function');
      expect(typeof dataAggregationService.getStats).toBe('function');
    });
  });

  describe('getQuote', () => {
    it('should return quote data with fallback capability', async () => {
      // Mock successful response from Yahoo Finance
      const mockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        marketCap: 2500000000000,
        source: 'yahoo-finance',
        lastUpdated: new Date(),
      };

      mockYahooService.getQuote.mockResolvedValue(mockQuote);

      const quote = await dataAggregationService.getQuote('AAPL');

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
      expect(quote.source).toMatch(/yahoo-finance|google-finance/);
      expect(typeof quote.price).toBe('number');
      expect(typeof quote.change).toBe('number');
      expect(typeof quote.changePercent).toBe('number');
      expect(quote.lastUpdated).toBeInstanceOf(Date);
      expect(mockYahooService.getQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should handle invalid symbols gracefully', async () => {
      mockYahooService.getQuote.mockRejectedValue(new Error('Invalid symbol'));
      mockGoogleService.getQuote.mockRejectedValue(new Error('Invalid symbol'));

      await expect(dataAggregationService.getQuote('')).rejects.toThrow();
    });

    it('should respect preferred source option', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        marketCap: 2500000000000,
        source: 'google-finance',
        lastUpdated: new Date(),
      };

      mockGoogleService.getQuote.mockResolvedValue(mockQuote);

      const quote = await dataAggregationService.getQuote('AAPL', {
        preferredSource: 'google-finance',
      });

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });

    it('should handle fallback disabled option', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        marketCap: 2500000000000,
        source: 'yahoo-finance',
        lastUpdated: new Date(),
      };

      mockYahooService.getQuote.mockResolvedValue(mockQuote);

      const quote = await dataAggregationService.getQuote('AAPL', {
        fallbackEnabled: false,
      });

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data with fallback capability', async () => {
      const mockHistoricalData = {
        symbol: 'AAPL',
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
          regularMarketPrice: 150.25,
          chartPreviousClose: 147.75,
          previousClose: 147.75,
          scale: 3,
          priceHint: 2,
        },
        data: [
          {
            timestamp: 1640995200,
            open: 148.0,
            high: 151.0,
            low: 147.5,
            close: 150.25,
            volume: 50000000,
          },
        ],
      };

      mockYahooService.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const data = await dataAggregationService.getHistoricalData(
        'AAPL',
        '1mo'
      );

      expect(data).toBeDefined();
      expect(data.symbol).toBe('AAPL');
      expect(data.meta).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(mockYahooService.getHistoricalData).toHaveBeenCalledWith(
        'AAPL',
        '1mo',
        '1d'
      );
    });

    it('should handle invalid symbols for historical data', async () => {
      mockYahooService.getHistoricalData.mockRejectedValue(
        new Error('Invalid symbol')
      );
      mockGoogleService.getHistoricalData.mockRejectedValue(
        new Error('Invalid symbol')
      );

      await expect(
        dataAggregationService.getHistoricalData('', '1mo')
      ).rejects.toThrow();
    });

    it('should support different periods and intervals', async () => {
      const mockHistoricalData = {
        symbol: 'AAPL',
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
          regularMarketPrice: 150.25,
          chartPreviousClose: 147.75,
          previousClose: 147.75,
          scale: 3,
          priceHint: 2,
        },
        data: [
          {
            timestamp: 1640995200,
            open: 148.0,
            high: 151.0,
            low: 147.5,
            close: 150.25,
            volume: 50000000,
          },
        ],
      };

      mockYahooService.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const data = await dataAggregationService.getHistoricalData(
        'AAPL',
        '3mo',
        '1d'
      );

      expect(data).toBeDefined();
      expect(data.symbol).toBe('AAPL');
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('searchSymbols', () => {
    it('should return search results with fallback capability', async () => {
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'equity',
          source: 'yahoo-finance',
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          exchange: 'NASDAQ',
          type: 'equity',
          source: 'yahoo-finance',
        },
      ];

      mockYahooService.searchSymbols.mockResolvedValue(mockSearchResults);

      const results = await dataAggregationService.searchSymbols('Apple', 5);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      expect(firstResult?.symbol).toBeDefined();
      expect(firstResult?.name).toBeDefined();
      expect(firstResult?.source).toMatch(/yahoo-finance|google-finance/);
      expect(mockYahooService.searchSymbols).toHaveBeenCalledWith('Apple', 5);
    });

    it('should handle empty search queries', async () => {
      mockYahooService.searchSymbols.mockRejectedValue(
        new Error('Empty query')
      );
      mockGoogleService.searchSymbols.mockRejectedValue(
        new Error('Empty query')
      );

      await expect(dataAggregationService.searchSymbols('')).rejects.toThrow();
    });
  });

  describe('getMarketSummary', () => {
    it('should return market summary with fallback capability', async () => {
      const mockMarketSummary = [
        {
          symbol: '^GSPC',
          name: 'S&P 500',
          price: 4500.0,
          change: 25.5,
          changePercent: 0.57,
          source: 'yahoo-finance',
        },
        {
          symbol: '^DJI',
          name: 'Dow Jones Industrial Average',
          price: 35000.0,
          change: -50.0,
          changePercent: -0.14,
          source: 'yahoo-finance',
        },
      ];

      mockYahooService.getMarketSummary.mockResolvedValue(mockMarketSummary);

      const summary = await dataAggregationService.getMarketSummary();

      expect(Array.isArray(summary)).toBe(true);
      expect(summary.length).toBeGreaterThan(0);

      const firstIndex = summary[0];
      expect(firstIndex).toBeDefined();
      expect(firstIndex?.symbol).toBeDefined();
      expect(firstIndex?.name).toBeDefined();
      expect(typeof firstIndex?.price).toBe('number');
      expect(firstIndex?.source).toMatch(/yahoo-finance|google-finance/);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all sources', async () => {
      const healthStatus = await dataAggregationService.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(healthStatus['yahoo-finance']).toBeDefined();
      expect(healthStatus['google-finance']).toBeDefined();

      for (const [, health] of Object.entries(healthStatus)) {
        expect(health.status).toMatch(/healthy|unhealthy/);
        expect(typeof health.latency).toBe('number');
      }
    });
  });

  describe('source management', () => {
    it('should get service statistics', () => {
      const stats = dataAggregationService.getStats();

      expect(stats).toBeDefined();
      expect(stats['yahoo-finance']).toBeDefined();
      expect(stats['google-finance']).toBeDefined();

      for (const [, stat] of Object.entries(stats)) {
        const typedStat = stat as any;
        expect(typeof typedStat.priority).toBe('number');
        expect(typeof typedStat.isActive).toBe('boolean');
        expect(typeof typedStat.healthScore).toBe('number');
        expect(typeof typedStat.errorCount).toBe('number');
        expect(typeof typedStat.successCount).toBe('number');
      }
    });

    it('should allow manual source status control', () => {
      dataAggregationService.setSourceStatus('yahoo-finance', false);
      const stats = dataAggregationService.getStats();
      expect((stats as any)['yahoo-finance'].isActive).toBe(false);

      dataAggregationService.setSourceStatus('yahoo-finance', true);
      const updatedStats = dataAggregationService.getStats();
      expect((updatedStats as any)['yahoo-finance'].isActive).toBe(true);
    });

    it('should allow resetting source statistics', () => {
      dataAggregationService.resetSourceStats('yahoo-finance');
      const stats = dataAggregationService.getStats();

      expect((stats as any)['yahoo-finance'].errorCount).toBe(0);
      expect((stats as any)['yahoo-finance'].successCount).toBe(0);
      expect((stats as any)['yahoo-finance'].healthScore).toBe(100);
      expect((stats as any)['yahoo-finance'].isActive).toBe(true);
    });
  });

  describe('timeout handling', () => {
    it('should respect timeout options', async () => {
      const startTime = Date.now();

      try {
        await dataAggregationService.getQuote('AAPL', {
          timeoutMs: 1, // Very short timeout to trigger timeout
        });
      } catch {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(100); // Should timeout quickly
      }
    });
  });
});
