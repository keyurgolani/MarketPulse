import { MarketDataService } from '../services/MarketDataService';

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;

  beforeEach(() => {
    marketDataService = new MarketDataService();
  });

  describe('initialization', () => {
    it('should create MarketDataService instance', () => {
      expect(marketDataService).toBeDefined();
      expect(marketDataService).toBeInstanceOf(MarketDataService);
    });

    it('should have required methods', () => {
      expect(typeof marketDataService.getQuote).toBe('function');
      expect(typeof marketDataService.getHistoricalData).toBe('function');
      expect(typeof marketDataService.searchSymbols).toBe('function');
      expect(typeof marketDataService.getMarketSummary).toBe('function');
      expect(typeof marketDataService.getHealthStatus).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle invalid symbols gracefully', async () => {
      await expect(marketDataService.getQuote('')).rejects.toThrow();
    });

    it('should handle invalid historical data requests', async () => {
      await expect(
        marketDataService.getHistoricalData('', '1mo')
      ).rejects.toThrow();
    });

    it('should handle empty search queries', async () => {
      await expect(marketDataService.searchSymbols('')).rejects.toThrow();
    });
  });
});
