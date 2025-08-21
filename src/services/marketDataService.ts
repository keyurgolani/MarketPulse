/**
 * Market Data Service
 * Handles all market data related API calls
 */

import { apiClient } from './apiClient';
import type { Asset, HistoricalData } from '@/types/market';
import type { ApiResponse } from '@/types/api';

export interface MarketDataParams {
  symbols?: string[];
  limit?: number;
  offset?: number;
}

export interface HistoricalDataParams {
  symbol: string;
  timeframe: '1D' | '1W' | '1M' | '3M' | '1Y';
  limit?: number;
}

export class MarketDataService {
  /**
   * Get asset data by symbol
   */
  async getAssetData(symbol: string): Promise<Asset> {
    const response = await apiClient.get<Asset>(
      `/assets/${encodeURIComponent(symbol)}`
    );
    return response.data;
  }

  /**
   * Get multiple assets data
   */
  async getMultipleAssets(symbols: string[]): Promise<Asset[]> {
    if (!symbols || symbols.length === 0) {
      return [];
    }

    const response = await apiClient.post<Asset[]>('/assets/batch', {
      symbols,
    });
    return response.data;
  }

  /**
   * Get real-time asset data
   */
  async getAssets(
    params: MarketDataParams = {}
  ): Promise<ApiResponse<Asset[]>> {
    const queryParams: Record<string, string | number> = {};

    if (params.symbols?.length) {
      queryParams.symbols = params.symbols.join(',');
    }
    if (params.limit) {
      queryParams.limit = params.limit;
    }
    if (params.offset) {
      queryParams.offset = params.offset;
    }

    return apiClient.get<Asset[]>('/assets', queryParams);
  }

  /**
   * Get asset data by symbol
   */
  async getAsset(symbol: string): Promise<ApiResponse<Asset>> {
    return apiClient.get<Asset>(`/assets/${encodeURIComponent(symbol)}`);
  }

  /**
   * Get historical data for an asset
   */
  async getHistoricalData(
    params: HistoricalDataParams
  ): Promise<ApiResponse<HistoricalData>> {
    const { symbol, ...queryParams } = params;
    return apiClient.get<HistoricalData>(
      `/assets/${encodeURIComponent(symbol)}/history`,
      queryParams
    );
  }

  /**
   * Search assets by query
   */
  async searchAssets(query: string, limit = 10): Promise<Asset[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const response = await apiClient.get<Asset[]>('/assets/search', {
      q: query,
      limit,
    });
    return response.data;
  }

  /**
   * Get market summary
   */
  async getMarketSummary(): Promise<
    ApiResponse<{
      indices: Asset[];
      movers: {
        gainers: Asset[];
        losers: Asset[];
      };
      volume: Asset[];
    }>
  > {
    return apiClient.get('/market/summary');
  }

  /**
   * Refresh cache for specific symbols
   */
  async refreshCache(
    symbols?: string[]
  ): Promise<ApiResponse<{ message: string }>> {
    const data = symbols ? { symbols } : undefined;
    return apiClient.post('/cache/refresh', data);
  }
}

/**
 * Default market data service instance
 */
export const marketDataService = new MarketDataService();
