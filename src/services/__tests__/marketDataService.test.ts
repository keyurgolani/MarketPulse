import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketDataService } from '../marketDataService';

// Mock fetch
global.fetch = vi.fn();

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAssetData', () => {
    it('should fetch asset data successfully', async () => {
      const mockData = {
        symbol: 'AAPL',
        price: 150.0,
        change: 2.5,
        changePercent: 1.69,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getAssetData('AAPL');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/assets/AAPL',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it.skip('should handle fetch errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getAssetData('AAPL')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle non-ok responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getAssetData('INVALID')).rejects.toThrow();
    });
  });

  describe('getMultipleAssets', () => {
    it('should fetch multiple assets successfully', async () => {
      const mockData = [
        { symbol: 'AAPL', price: 150.0 },
        { symbol: 'GOOGL', price: 2500.0 },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getMultipleAssets(['AAPL', 'GOOGL']);
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/assets/batch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: ['AAPL', 'GOOGL'] }),
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('should handle empty symbols array', async () => {
      const result = await service.getMultipleAssets([]);
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('searchAssets', () => {
    it('should search assets successfully', async () => {
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchAssets('A');
      expect(result).toEqual(mockResults);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/assets/search?q=A&limit=10',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('should handle empty search query', async () => {
      const result = await service.searchAssets('');
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
