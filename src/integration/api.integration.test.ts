import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { marketDataService } from '@/services/marketDataService';
import { newsService } from '@/services/newsService';

// Mock the API client to avoid actual network calls during integration tests
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Setup for integration tests
    console.log('Setting up API integration tests...');
  });

  afterAll(async () => {
    // Cleanup after integration tests
    console.log('Cleaning up API integration tests...');
  });

  describe('Market Data Service Integration', () => {
    it('should have correct service methods available', () => {
      expect(typeof marketDataService.getAsset).toBe('function');
      expect(typeof marketDataService.getAssets).toBe('function');
      expect(typeof marketDataService.getHistoricalData).toBe('function');
      expect(typeof marketDataService.searchAssets).toBe('function');
      expect(typeof marketDataService.getMarketSummary).toBe('function');
    });

    it('should call getAsset with correct parameters', async () => {
      const { apiClient } = await import('@/services/apiClient');
      const mockResponse = {
        success: true,
        data: {
          symbol: 'AAPL',
          price: 150.0,
          change: 2.5,
          changePercent: 1.69,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await marketDataService.getAsset('AAPL');

      expect(apiClient.get).toHaveBeenCalledWith('/assets/AAPL');
      expect(result).toEqual(mockResponse);
    });

    it('should call searchAssets with correct parameters', async () => {
      const { apiClient } = await import('@/services/apiClient');
      const mockResponse = {
        success: true,
        data: [
          { symbol: 'AAPL', name: 'Apple Inc.' },
          { symbol: 'AMZN', name: 'Amazon.com Inc.' },
        ],
        timestamp: Date.now(),
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await marketDataService.searchAssets('apple', 5);

      expect(apiClient.get).toHaveBeenCalledWith('/assets/search', {
        q: 'apple',
        limit: 5,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('News Service Integration', () => {
    it('should have correct service methods available', () => {
      expect(typeof newsService.getNews).toBe('function');
      expect(typeof newsService.getAssetNews).toBe('function');
      expect(typeof newsService.getTrendingTopics).toBe('function');
      expect(typeof newsService.searchNews).toBe('function');
    });

    it('should call getAssetNews with correct parameters', async () => {
      const { apiClient } = await import('@/services/apiClient');
      const mockResponseData = {
        articles: [
          {
            id: '1',
            title: 'Apple Reports Strong Quarterly Results',
            url: 'https://example.com/news/1',
            publishedAt: new Date().toISOString(),
            summary: 'Apple exceeded expectations...',
          },
        ],
        total: 1,
      };

      const mockResponse = {
        success: true,
        data: mockResponseData,
        timestamp: Date.now(),
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await newsService.getAssetNews('AAPL', { limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/news/AAPL', {
        limit: 10,
      });
      expect(result).toEqual(mockResponseData);
    });

    it('should call searchNews with correct parameters', async () => {
      const { apiClient } = await import('@/services/apiClient');
      const mockResponseData = {
        articles: [],
        total: 0,
      };

      const mockResponse = {
        success: true,
        data: mockResponseData,
        timestamp: Date.now(),
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await newsService.searchNews('earnings', {}, 20, 1);

      expect(apiClient.get).toHaveBeenCalledWith('/news', {
        search: 'earnings',
        limit: 20,
        page: 1,
      });
      expect(result).toEqual(mockResponseData);
    });
  });
});
