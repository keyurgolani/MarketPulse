import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NewsService } from '../newsService';

// Mock apiClient
vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('NewsService', () => {
  let service: NewsService;
  let mockApiClient: any;

  beforeEach(async () => {
    const { apiClient } = await import('../apiClient');
    mockApiClient = apiClient;
    service = new NewsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNews', () => {
    it('should fetch news successfully', async () => {
      const mockResponseData = {
        articles: [
          {
            id: '1',
            title: 'Market Update',
            content: 'Stock market rises',
            publishedAt: '2024-01-01T00:00:00Z',
            source: 'Financial Times',
          },
        ],
        total: 1,
      };

      const mockResponse = {
        success: true,
        data: mockResponseData,
        timestamp: Date.now(),
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getNews();
      expect(result.articles).toEqual(mockResponseData.articles);
      expect(result.total).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/news', {});
    });

    it('should fetch news with category filter', async () => {
      const mockResponseData = {
        articles: [
          {
            id: '1',
            title: 'Tech News',
            content: 'Technology update',
            publishedAt: '2024-01-01T00:00:00Z',
            source: 'Tech Crunch',
          },
        ],
        total: 1,
      };

      const mockResponse = {
        success: true,
        data: mockResponseData,
        timestamp: Date.now(),
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getNews({ category: 'technology' });
      expect(result.articles).toEqual(mockResponseData.articles);
      expect(mockApiClient.get).toHaveBeenCalledWith('/news', {
        category: 'technology',
      });
    });

    it.skip('should handle fetch errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getNews()).rejects.toThrow('Network error');
    });
  });

  describe('getAssetNews', () => {
    it('should fetch asset-specific news', async () => {
      const mockResponseData = {
        articles: [
          {
            id: '1',
            title: 'Apple Earnings',
            content: 'Apple reports strong earnings',
            publishedAt: '2024-01-01T00:00:00Z',
            source: 'Reuters',
          },
        ],
        total: 1,
      };

      const mockResponse = {
        success: true,
        data: mockResponseData,
        timestamp: Date.now(),
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getAssetNews('AAPL');
      expect(result.articles).toEqual(mockResponseData.articles);
      expect(mockApiClient.get).toHaveBeenCalledWith('/news/AAPL', {});
    });

    it('should handle empty symbol', async () => {
      await expect(service.getAssetNews('')).rejects.toThrow(
        'Symbol is required'
      );
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });
});
