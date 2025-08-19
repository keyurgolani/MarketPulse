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
  async getNews(params: NewsParams = {}): Promise<ApiResponse<NewsArticle[]>> {
    const queryParams: Record<string, string | number> = {};

    if (params.symbols?.length) {
      queryParams.symbols = params.symbols.join(',');
    }
    if (params.category) {
      queryParams.category = params.category;
    }
    if (params.search) {
      queryParams.search = params.search;
    }
    if (params.limit) {
      queryParams.limit = params.limit;
    }
    if (params.offset) {
      queryParams.offset = params.offset;
    }

    return apiClient.get<NewsArticle[]>('/news', queryParams);
  }

  /**
   * Get news for specific asset
   */
  async getAssetNews(
    symbol: string,
    limit = 10
  ): Promise<ApiResponse<NewsArticle[]>> {
    return apiClient.get<NewsArticle[]>(`/news/${encodeURIComponent(symbol)}`, {
      limit,
    });
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
