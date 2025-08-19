// Jest globals are available without import

// Mock all external services with inline factory functions to avoid hoisting issues
jest.mock('../services/DataAggregationService', () => ({
  DataAggregationService: (jest.fn() as any).mockImplementation(() => ({
    getQuote: (jest.fn() as any as any).mockResolvedValue({
      symbol: 'AAPL',
      price: 150.25,
      change: 2.5,
      changePercent: 1.69,
      volume: 50000000,
      marketCap: 2500000000000,
      lastUpdated: new Date(),
      source: 'yahoo-finance',
    }),
    getHistoricalData: (jest.fn() as any).mockResolvedValue([]),
    searchSymbols: (jest.fn() as any).mockResolvedValue([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        type: 'stock',
      },
    ]),
    getMarketSummary: (jest.fn() as any).mockResolvedValue({}),
    healthCheck: (jest.fn() as any).mockResolvedValue({ status: 'healthy' }),
    getStats: (jest.fn() as any).mockReturnValue({
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 250,
    }),
    getHealthStatus: (jest.fn() as any).mockResolvedValue({
      isHealthy: true,
      status: 'healthy',
      lastCheck: new Date(),
    }),
  })),
}));

jest.mock('../services/NewsAggregationService', () => ({
  NewsAggregationService: (jest.fn() as any).mockImplementation(() => ({
    getNews: (jest.fn() as any).mockResolvedValue([
      {
        title: 'Apple Stock Rises',
        summary: 'Apple stock continues to climb',
        url: 'https://example.com/news/1',
        publishedAt: new Date(),
        source: 'reuters-business',
        category: 'finance',
        sentiment: 'positive',
      },
    ]),
    searchNews: (jest.fn() as any).mockResolvedValue([]),
    searchArticles: (jest.fn() as any).mockResolvedValue([
      {
        title: 'Apple Stock Rises',
        summary: 'Apple stock continues to climb',
        url: 'https://example.com/news/1',
        publishedAt: new Date(),
        source: 'reuters-business',
        category: 'finance',
        sentiment: 'positive',
      },
    ]),
    getArticlesByAssets: (jest.fn() as any).mockResolvedValue([
      {
        title: 'Apple Stock Rises',
        summary: 'Apple stock continues to climb',
        url: 'https://example.com/news/1',
        publishedAt: new Date(),
        source: 'reuters-business',
        category: 'finance',
        sentiment: 'positive',
      },
    ]),
    healthCheck: (jest.fn() as any).mockResolvedValue({ status: 'healthy' }),
    getStats: (jest.fn() as any).mockReturnValue({
      totalRequests: 50,
      successfulRequests: 48,
      failedRequests: 2,
      averageResponseTime: 180,
    }),
  })),
}));

jest.mock('../services/ContentFilterService', () => ({
  ContentFilterService: (jest.fn() as any).mockImplementation(() => ({
    filterArticles: (jest.fn() as any).mockReturnValue([
      {
        title: 'Apple Stock Rises',
        summary: 'Apple stock continues to climb',
        url: 'https://example.com/news/1',
        publishedAt: new Date(),
        source: 'reuters-business',
        category: 'finance',
        sentiment: 'positive',
      },
    ]),
    getStats: (jest.fn() as any).mockReturnValue({
      totalArticles: 1000,
      filteredArticles: 950,
      rejectedArticles: 50,
    }),
  })),
}));

jest.mock('../services/IntelligentCategorizationService', () => ({
  IntelligentCategorizationService: (jest.fn() as any).mockImplementation(
    () => ({
      categorizeArticles: (jest.fn() as any).mockResolvedValue(new Map()),
      getStats: (jest.fn() as any).mockReturnValue({
        totalCategorizations: 500,
        successfulCategorizations: 495,
        failedCategorizations: 5,
      }),
    })
  ),
}));

jest.mock('../services/CacheService', () => ({
  CacheService: {
    getInstance: (jest.fn() as any).mockReturnValue({
      get: (jest.fn() as any).mockResolvedValue(null),
      set: (jest.fn() as any).mockResolvedValue(undefined),
      delete: (jest.fn() as any).mockResolvedValue(undefined),
      clear: (jest.fn() as any).mockResolvedValue(undefined),
      getStats: (jest.fn() as any).mockReturnValue({
        totalRequests: 200,
        hits: 150,
        misses: 50,
        hitRate: 0.75,
        memoryUsage: 1024000,
      }),
    }),
  },
}));

// Create a mock ApiCacheService class
const mockApiCacheService = {
  get: (jest.fn() as any).mockResolvedValue(null),
  set: (jest.fn() as any).mockResolvedValue(undefined),
  delete: (jest.fn() as any).mockResolvedValue(undefined),
  clear: (jest.fn() as any).mockResolvedValue(undefined),
  getStats: (jest.fn() as any).mockReturnValue({
    hits: 100,
    misses: 25,
    sets: 125,
    deletes: 5,
    hitRate: 0.8,
    totalSize: 2048000,
    keyCount: 120,
  }),
};

jest.mock('../services/ApiCacheService', () => ({
  ApiCacheService: (jest.fn() as any).mockImplementation(
    () => mockApiCacheService
  ),
}));

// Import the service AFTER all mocks are set up
import { ExternalAPIIntegrationService } from '../services/ExternalAPIIntegrationService';

describe('ExternalAPIIntegrationService', () => {
  let integrationService: ExternalAPIIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create the service instance - mocks are already set up in vi.mock calls
    integrationService = new ExternalAPIIntegrationService();

    // Manually assign mocked services to the instance since constructor creates new instances
    // We need to access the private properties to replace them with mocks
    (
      integrationService as unknown as { dataAggregationService: unknown }
    ).dataAggregationService = {
      getQuote: (jest.fn() as any).mockResolvedValue({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        marketCap: 2500000000000,
        lastUpdated: new Date(),
        source: 'yahoo-finance',
      }),
      getHistoricalData: (jest.fn() as any).mockResolvedValue([]),
      searchSymbols: (jest.fn() as any).mockResolvedValue([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'stock',
        },
      ]),
      getMarketSummary: (jest.fn() as any).mockResolvedValue({}),
      healthCheck: (jest.fn() as any).mockResolvedValue({ status: 'healthy' }),
      getStats: (jest.fn() as any).mockReturnValue({
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 250,
      }),
      getHealthStatus: (jest.fn() as any).mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        lastCheck: new Date(),
      }),
    };

    (
      integrationService as unknown as { newsAggregationService: unknown }
    ).newsAggregationService = {
      getNews: (jest.fn() as any).mockResolvedValue([
        {
          title: 'Apple Stock Rises',
          summary: 'Apple stock continues to climb',
          url: 'https://example.com/news/1',
          publishedAt: new Date(),
          source: 'reuters-business',
          category: 'finance',
          sentiment: 'positive',
        },
      ]),
      searchNews: (jest.fn() as any).mockResolvedValue([]),
      searchArticles: (jest.fn() as any).mockResolvedValue([
        {
          title: 'Apple Stock Rises',
          summary: 'Apple stock continues to climb',
          url: 'https://example.com/news/1',
          publishedAt: new Date(),
          source: 'reuters-business',
          category: 'finance',
          sentiment: 'positive',
        },
      ]),
      getArticlesByAssets: (jest.fn() as any).mockResolvedValue([
        {
          title: 'Apple Stock Rises',
          summary: 'Apple stock continues to climb',
          url: 'https://example.com/news/1',
          publishedAt: new Date(),
          source: 'reuters-business',
          category: 'finance',
          sentiment: 'positive',
        },
      ]),
      healthCheck: (jest.fn() as any).mockResolvedValue({ status: 'healthy' }),
      getStats: (jest.fn() as any).mockReturnValue({
        totalRequests: 50,
        successfulRequests: 48,
        failedRequests: 2,
        averageResponseTime: 180,
      }),
    };

    (
      integrationService as unknown as { contentFilterService: unknown }
    ).contentFilterService = {
      filterArticles: (jest.fn() as any).mockReturnValue([
        {
          title: 'Apple Stock Rises',
          summary: 'Apple stock continues to climb',
          url: 'https://example.com/news/1',
          publishedAt: new Date(),
          source: 'reuters-business',
          category: 'finance',
          sentiment: 'positive',
        },
      ]),
      getStats: (jest.fn() as any).mockReturnValue({
        totalArticles: 1000,
        filteredArticles: 950,
        rejectedArticles: 50,
      }),
    };

    (
      integrationService as unknown as { categorizationService: unknown }
    ).categorizationService = {
      categorizeArticles: (jest.fn() as any).mockResolvedValue(new Map()),
      getStats: (jest.fn() as any).mockReturnValue({
        totalCategorizations: 500,
        successfulCategorizations: 495,
        failedCategorizations: 5,
      }),
    };

    (integrationService as unknown as { cacheService: unknown }).cacheService =
      {
        get: (jest.fn() as any).mockResolvedValue(null),
        set: (jest.fn() as any).mockResolvedValue(undefined),
        delete: (jest.fn() as any).mockResolvedValue(undefined),
        clear: (jest.fn() as any).mockResolvedValue(undefined),
        getStats: (jest.fn() as any).mockReturnValue({
          totalRequests: 200,
          hits: 150,
          misses: 50,
          hitRate: 0.75,
          memoryUsage: 1024000,
        }),
      };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should create ExternalAPIIntegrationService instance', () => {
      expect(integrationService).toBeDefined();
      expect(integrationService).toBeInstanceOf(ExternalAPIIntegrationService);
    });

    it('should have required methods', () => {
      expect(typeof integrationService.getMarketData).toBe('function');
      expect(typeof integrationService.searchSymbolsWithNews).toBe('function');
      expect(typeof integrationService.getHealthStatus).toBe('function');
      expect(typeof integrationService.getStats).toBe('function');
      expect(typeof integrationService.resetMetrics).toBe('function');
    });
  });

  describe('getMarketData', () => {
    it('should return comprehensive market data', async () => {
      const symbols = ['AAPL', 'GOOGL'];
      const result = await integrationService.getMarketData(symbols);

      expect(result).toBeDefined();
      expect(Array.isArray(result.quotes)).toBe(true);
      expect(Array.isArray(result.news)).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(result.metadata.sources)).toBe(true);
      expect(typeof result.metadata.cacheHit).toBe('boolean');
      expect(typeof result.metadata.processingTime).toBe('number');
    });

    it('should handle empty symbol list', async () => {
      const result = await integrationService.getMarketData([]);

      expect(result).toBeDefined();
      expect(result.quotes).toEqual([]);
      expect(Array.isArray(result.news)).toBe(true);
    });

    it('should respect integration options', async () => {
      const symbols = ['AAPL'];
      const options = {
        enableCaching: false,
        enableFiltering: false,
        enableCategorization: false,
        maxRetries: 1,
        timeoutMs: 5000,
      };

      const result = await integrationService.getMarketData(symbols, options);

      expect(result).toBeDefined();
      expect(result.metadata.cacheHit).toBe(false);
      expect(result.categorization).toBeUndefined();
    });
  });

  describe('searchSymbolsWithNews', () => {
    it('should return symbols and related news', async () => {
      const query = 'Apple';
      const result = await integrationService.searchSymbolsWithNews(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.symbols)).toBe(true);
      expect(Array.isArray(result.news)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const query = 'nonexistentcompany12345';
      const result = await integrationService.searchSymbolsWithNews(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.symbols)).toBe(true);
      expect(Array.isArray(result.news)).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('should return comprehensive health status', async () => {
      const health = await integrationService.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.overall).toMatch(/healthy|degraded|unhealthy/);
      expect(health.services).toBeDefined();
      expect(health.performance).toBeDefined();

      // Check performance metrics
      expect(typeof health.performance.averageResponseTime).toBe('number');
      expect(typeof health.performance.successRate).toBe('number');
      expect(typeof health.performance.errorRate).toBe('number');
    });
  });

  describe('getStats', () => {
    it('should return comprehensive service statistics', () => {
      const stats = integrationService.getStats();

      expect(stats).toBeDefined();
      expect(stats.performance).toBeDefined();
      expect(stats.services).toBeDefined();

      // Check performance stats
      const performance = stats.performance as any;
      expect(typeof performance.totalRequests).toBe('number');
      expect(typeof performance.successfulRequests).toBe('number');
      expect(typeof performance.failedRequests).toBe('number');
      expect(typeof performance.averageResponseTime).toBe('number');
    });
  });

  describe('resetMetrics', () => {
    it('should reset performance metrics', () => {
      // Reset metrics
      integrationService.resetMetrics();

      // Get stats after reset
      const resetStats = integrationService.getStats();

      const resetPerformance = resetStats.performance as any;
      expect(resetPerformance.totalRequests).toBe(0);
      expect(resetPerformance.successfulRequests).toBe(0);
      expect(resetPerformance.failedRequests).toBe(0);
      expect(resetPerformance.averageResponseTime).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle service failures gracefully', async () => {
      // Test with invalid symbols
      const result = await integrationService.getMarketData(['INVALID']);

      expect(result).toBeDefined();
      expect(Array.isArray(result.quotes)).toBe(true);
      expect(Array.isArray(result.news)).toBe(true);
    });
  });
});
