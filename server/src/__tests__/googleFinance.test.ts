import { GoogleFinanceService } from '../services/GoogleFinanceService';
// Types imported for potential future use in test data

describe('GoogleFinanceService', () => {
  let googleFinanceService: GoogleFinanceService;

  beforeEach(() => {
    googleFinanceService = new GoogleFinanceService();
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
