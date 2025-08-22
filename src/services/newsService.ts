/**
 * News Service
 * Handles news and content-related API calls
 */

import { apiClient } from './apiClient';
import type { NewsArticle, NewsFilter, SentimentLabel } from '@/types/news';

export interface NewsParams {
  symbols?: string[];
  category?: string;
  sentiment?: SentimentLabel;
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
  search?: string;
  include_analysis?: boolean;
}

export interface NewsResponse {
  articles: NewsArticle[];
  total: number;
  analysis?: {
    message: string;
    symbols?: string[];
  };
}

export interface TrendingTopicsResponse {
  topics: string[];
  timeframe: string;
  total: number;
}

export class NewsService {
  /**
   * Get news articles with comprehensive filtering
   */
  async getNews(params: NewsParams = {}): Promise<NewsResponse> {
    const queryParams: Record<string, string | number | boolean> = {};

    // Map parameters to API format
    if (params.symbols && params.symbols.length > 0) {
      queryParams.symbols = params.symbols.join(',');
    }
    if (params.category) queryParams.category = params.category;
    if (params.sentiment) queryParams.sentiment = params.sentiment;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.from_date) queryParams.from_date = params.from_date;
    if (params.to_date) queryParams.to_date = params.to_date;
    if (params.search) queryParams.search = params.search;
    if (params.include_analysis !== undefined) {
      queryParams.include_analysis = params.include_analysis;
    }

    const response = await apiClient.get<NewsResponse>('/news', queryParams);
    return response.data;
  }

  /**
   * Get news for specific asset symbol
   */
  async getAssetNews(
    symbol: string,
    params: Omit<NewsParams, 'symbols'> = {}
  ): Promise<NewsResponse> {
    if (!symbol || symbol.trim() === '') {
      throw new Error('Symbol is required');
    }

    const queryParams: Record<string, string | number | boolean> = {};

    // Map parameters to API format
    if (params.category) queryParams.category = params.category;
    if (params.sentiment) queryParams.sentiment = params.sentiment;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.from_date) queryParams.from_date = params.from_date;
    if (params.to_date) queryParams.to_date = params.to_date;
    if (params.search) queryParams.search = params.search;
    if (params.include_analysis !== undefined) {
      queryParams.include_analysis = params.include_analysis;
    }

    const response = await apiClient.get<NewsResponse>(
      `/news/${encodeURIComponent(symbol)}`,
      queryParams
    );
    return response.data;
  }

  /**
   * Get trending news topics
   */
  async getTrendingTopics(
    timeframe: '1h' | '6h' | '1d' | '1w' = '1d',
    limit = 10
  ): Promise<TrendingTopicsResponse> {
    const response = await apiClient.get<TrendingTopicsResponse>(
      '/news/trending',
      { timeframe, limit }
    );
    return response.data;
  }

  /**
   * Get market analysis
   */
  async getMarketAnalysis(
    symbols?: string[],
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d',
    analysisType: 'technical' | 'fundamental' | 'sentiment' | 'all' = 'all'
  ): Promise<unknown> {
    const queryParams: Record<string, string> = {
      timeframe,
      analysis_type: analysisType,
    };

    if (symbols && symbols.length > 0) {
      queryParams.symbols = symbols.join(',');
    }

    const response = await apiClient.get<unknown>(
      '/news/analysis',
      queryParams
    );
    return response.data;
  }

  /**
   * Search news articles with advanced filtering
   */
  async searchNews(
    query: string,
    filters: NewsFilter = {},
    limit = 20,
    page = 1
  ): Promise<NewsResponse> {
    const params: NewsParams = {
      search: query,
      limit,
      page,
      symbols: filters.assets,
      category: filters.categories?.[0], // API supports single category
      sentiment: filters.sentiment?.[0], // API supports single sentiment
    };

    // Add date range if provided
    if (filters.dateRange) {
      params.from_date = filters.dateRange.start.toISOString().split('T')[0];
      params.to_date = filters.dateRange.end.toISOString().split('T')[0];
    }

    return this.getNews(params);
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(
    category: string,
    limit = 20,
    page = 1
  ): Promise<NewsResponse> {
    return this.getNews({ category, limit, page });
  }

  /**
   * Get news by sentiment
   */
  async getNewsBySentiment(
    sentiment: SentimentLabel,
    limit = 20,
    page = 1
  ): Promise<NewsResponse> {
    return this.getNews({ sentiment, limit, page });
  }

  /**
   * Get news for multiple assets
   */
  async getMultiAssetNews(
    symbols: string[],
    limit = 20,
    page = 1
  ): Promise<NewsResponse> {
    return this.getNews({ symbols, limit, page, include_analysis: true });
  }

  /**
   * Clear news cache (admin only)
   */
  async clearCache(symbol?: string): Promise<void> {
    const endpoint = symbol
      ? `/news/${encodeURIComponent(symbol)}/cache`
      : '/news/cache';
    await apiClient.delete(endpoint);
  }
}

/**
 * Default news service instance
 */
export const newsService = new NewsService();
