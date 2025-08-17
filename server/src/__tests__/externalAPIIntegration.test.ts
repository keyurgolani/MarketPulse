import { ExternalAPIIntegrationService } from '../services/ExternalAPIIntegrationService';

describe('ExternalAPIIntegrationService', () => {
  let integrationService: ExternalAPIIntegrationService;

  beforeEach(() => {
    integrationService = new ExternalAPIIntegrationService();
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
      expect(typeof stats.performance.totalRequests).toBe('number');
      expect(typeof stats.performance.successfulRequests).toBe('number');
      expect(typeof stats.performance.failedRequests).toBe('number');
      expect(typeof stats.performance.averageResponseTime).toBe('number');
    });
  });

  describe('resetMetrics', () => {
    it('should reset performance metrics', () => {
      // Reset metrics
      integrationService.resetMetrics();

      // Get stats after reset
      const resetStats = integrationService.getStats();

      expect(resetStats.performance.totalRequests).toBe(0);
      expect(resetStats.performance.successfulRequests).toBe(0);
      expect(resetStats.performance.failedRequests).toBe(0);
      expect(resetStats.performance.averageResponseTime).toBe(0);
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
