import { DataAggregationService } from '../services/DataAggregationService';
// Types imported for potential future use in test data

describe('DataAggregationService', () => {
  let dataAggregationService: DataAggregationService;

  beforeEach(() => {
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
      const quote = await dataAggregationService.getQuote('AAPL');

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
      expect(quote.source).toMatch(/yahoo-finance|google-finance/);
      expect(typeof quote.price).toBe('number');
      expect(typeof quote.change).toBe('number');
      expect(typeof quote.changePercent).toBe('number');
      expect(quote.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle invalid symbols gracefully', async () => {
      await expect(dataAggregationService.getQuote('')).rejects.toThrow();
    });

    it('should respect preferred source option', async () => {
      const quote = await dataAggregationService.getQuote('AAPL', {
        preferredSource: 'google-finance',
      });

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });

    it('should handle fallback disabled option', async () => {
      const quote = await dataAggregationService.getQuote('AAPL', {
        fallbackEnabled: false,
      });

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data with fallback capability', async () => {
      const data = await dataAggregationService.getHistoricalData(
        'AAPL',
        '1mo'
      );

      expect(data).toBeDefined();
      expect(data.symbol).toBe('AAPL');
      expect(data.meta).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should handle invalid symbols for historical data', async () => {
      await expect(
        dataAggregationService.getHistoricalData('', '1mo')
      ).rejects.toThrow();
    });

    it('should support different periods and intervals', async () => {
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
      const results = await dataAggregationService.searchSymbols('Apple', 5);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      expect(firstResult?.symbol).toBeDefined();
      expect(firstResult?.name).toBeDefined();
      expect(firstResult?.source).toMatch(/yahoo-finance|google-finance/);
    });

    it('should handle empty search queries', async () => {
      await expect(dataAggregationService.searchSymbols('')).rejects.toThrow();
    });
  });

  describe('getMarketSummary', () => {
    it('should return market summary with fallback capability', async () => {
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
        expect(typeof stat.priority).toBe('number');
        expect(typeof stat.isActive).toBe('boolean');
        expect(typeof stat.healthScore).toBe('number');
        expect(typeof stat.errorCount).toBe('number');
        expect(typeof stat.successCount).toBe('number');
      }
    });

    it('should allow manual source status control', () => {
      dataAggregationService.setSourceStatus('yahoo-finance', false);
      const stats = dataAggregationService.getStats();
      expect(stats['yahoo-finance'].isActive).toBe(false);

      dataAggregationService.setSourceStatus('yahoo-finance', true);
      const updatedStats = dataAggregationService.getStats();
      expect(updatedStats['yahoo-finance'].isActive).toBe(true);
    });

    it('should allow resetting source statistics', () => {
      dataAggregationService.resetSourceStats('yahoo-finance');
      const stats = dataAggregationService.getStats();

      expect(stats['yahoo-finance'].errorCount).toBe(0);
      expect(stats['yahoo-finance'].successCount).toBe(0);
      expect(stats['yahoo-finance'].healthScore).toBe(100);
      expect(stats['yahoo-finance'].isActive).toBe(true);
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
