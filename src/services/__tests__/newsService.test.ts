import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NewsService } from '../newsService';

// Mock fetch
global.fetch = vi.fn();

describe('NewsService', () => {
  let service: NewsService;

  beforeEach(() => {
    service = new NewsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNews', () => {
    it('should fetch news successfully', async () => {
      const mockNews = [
        {
          id: '1',
          title: 'Market Update',
          content: 'Stock market rises',
          publishedAt: '2024-01-01T00:00:00Z',
          source: 'Financial Times',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNews,
      });

      const result = await service.getNews();
      expect(result).toEqual(mockNews);
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/news', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('should fetch news with category filter', async () => {
      const mockNews = [
        {
          id: '1',
          title: 'Tech News',
          content: 'Technology update',
          publishedAt: '2024-01-01T00:00:00Z',
          source: 'Tech Crunch',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNews,
      });

      const result = await service.getNews('technology');
      expect(result).toEqual(mockNews);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/news?category=technology',
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

      await expect(service.getNews()).rejects.toThrow('Network error');
    });
  });

  describe('getAssetNews', () => {
    it('should fetch asset-specific news', async () => {
      const mockNews = [
        {
          id: '1',
          title: 'Apple Earnings',
          content: 'Apple reports strong earnings',
          publishedAt: '2024-01-01T00:00:00Z',
          source: 'Reuters',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNews,
      });

      const result = await service.getAssetNews('AAPL');
      expect(result).toEqual(mockNews);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/news/assets/AAPL?limit=10',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('should handle empty symbol', async () => {
      await expect(service.getAssetNews('')).rejects.toThrow(
        'Symbol is required'
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
