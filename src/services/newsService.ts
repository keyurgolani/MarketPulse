/**
 * News Service
 * Handles news and content-related API calls
 */

import { apiClient } from './apiClient';
import type { NewsArticle } from '@/types/news';
import type { ApiResponse } from '@/types/api';

export interface NewsParams {
  symbols?: string[];
  category?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export class NewsService {
  /**
   * Get news articles
   */
  async getNews(category?: string): Promise<NewsArticle[]> {
    const queryParams: Record<string, string | number> = {};

    if (category) {
      queryParams.category = category;
    }

    const response = await apiClient.get<NewsArticle[]>('/news', queryParams);
    return response.data;
  }

  /**
   * Get news for specific asset
   */
  async getAssetNews(symbol: string, limit = 10): Promise<NewsArticle[]> {
    if (!symbol || symbol.trim() === '') {
      throw new Error('Symbol is required');
    }

    const response = await apiClient.get<NewsArticle[]>(
      `/news/assets/${encodeURIComponent(symbol)}`,
      {
        limit,
      }
    );
    return response.data;
  }

  /**
   * Get news article by ID
   */
  async getArticle(id: string): Promise<ApiResponse<NewsArticle>> {
    return apiClient.get<NewsArticle>(
      `/news/article/${encodeURIComponent(id)}`
    );
  }

  /**
   * Search news articles
   */
  async searchNews(
    query: string,
    limit = 20
  ): Promise<ApiResponse<NewsArticle[]>> {
    return apiClient.get<NewsArticle[]>('/news/search', { q: query, limit });
  }
}

/**
 * Default news service instance
 */
export const newsService = new NewsService();
