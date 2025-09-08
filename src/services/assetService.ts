import { ApiResponse, PaginationMetadata } from '@/types/api';
import {
  Asset,
  AssetPrice,
  AssetSearchResult,
  AssetListParams,
  AssetSearchParams,
} from '@/types/asset';

export class AssetApiError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AssetApiError';
  }
}

class AssetService {
  private baseURL: string;

  constructor() {
    this.baseURL =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new AssetApiError(
        response.status,
        data.error ?? `HTTP ${response.status}: ${response.statusText}`,
        data.code
      );
    }

    return data;
  }

  /**
   * Get asset information by symbol
   */
  async getAsset(symbol: string): Promise<Asset> {
    const response = await this.makeRequest<Asset>(
      `/assets/${symbol.toUpperCase()}`
    );

    if (!response.success || !response.data) {
      throw new AssetApiError(404, `Asset ${symbol} not found`);
    }

    return response.data;
  }

  /**
   * Get current price for an asset
   */
  async getAssetPrice(symbol: string): Promise<AssetPrice> {
    const response = await this.makeRequest<AssetPrice>(
      `/assets/${symbol.toUpperCase()}/price`
    );

    if (!response.success || !response.data) {
      throw new AssetApiError(404, `Price for ${symbol} not found`);
    }

    return response.data;
  }

  /**
   * Get multiple assets by symbols
   */
  async getAssets(symbols: string[]): Promise<Asset[]> {
    const response = await this.makeRequest<Asset[]>('/assets/batch', {
      method: 'POST',
      body: JSON.stringify({ symbols: symbols.map((s) => s.toUpperCase()) }),
    });

    if (!response.success || !response.data) {
      throw new AssetApiError(500, 'Failed to retrieve assets');
    }

    return response.data;
  }

  /**
   * Search for assets
   */
  async searchAssets(params: AssetSearchParams): Promise<AssetSearchResult[]> {
    const searchParams = new URLSearchParams({
      q: params.q,
      ...(params.limit && { limit: params.limit.toString() }),
    });

    const response = await this.makeRequest<AssetSearchResult[]>(
      `/assets/search?${searchParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw new AssetApiError(500, 'Failed to search assets');
    }

    return response.data;
  }

  /**
   * Get popular/trending assets
   */
  async getPopularAssets(): Promise<Asset[]> {
    const response = await this.makeRequest<Asset[]>('/assets/popular');

    if (!response.success || !response.data) {
      throw new AssetApiError(500, 'Failed to retrieve popular assets');
    }

    return response.data;
  }

  /**
   * Get asset list with pagination and filtering
   */
  async getAssetList(params: AssetListParams = {}): Promise<{
    assets: Asset[];
    metadata: PaginationMetadata;
  }> {
    const searchParams = new URLSearchParams({
      page: (params.page ?? 1).toString(),
      limit: (params.limit ?? 20).toString(),
      ...(params.search && { search: params.search }),
      ...(params.sector && { sector: params.sector }),
    });

    const response = await this.makeRequest<Asset[]>(
      `/assets?${searchParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw new AssetApiError(500, 'Failed to retrieve asset list');
    }

    const defaultMetadata = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: response.data.length,
      hasNext: false,
      hasPrev: false,
    };

    return {
      assets: response.data,
      metadata: response.metadata
        ? {
            page: response.metadata.page ?? defaultMetadata.page,
            limit: response.metadata.limit ?? defaultMetadata.limit,
            total: response.metadata.total ?? defaultMetadata.total,
            hasNext:
              (response.metadata as Partial<PaginationMetadata>).hasNext ??
              defaultMetadata.hasNext,
            hasPrev:
              (response.metadata as Partial<PaginationMetadata>).hasPrev ??
              defaultMetadata.hasPrev,
          }
        : defaultMetadata,
    };
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<{
    providers: Array<{
      name: string;
      healthy: boolean;
      apiKeys: string[];
    }>;
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
  }> {
    const response = await this.makeRequest<{
      providers: Array<{
        name: string;
        healthy: boolean;
        apiKeys: string[];
      }>;
      summary: {
        total: number;
        healthy: number;
        unhealthy: number;
      };
    }>('/assets/health');

    if (!response.success || !response.data) {
      throw new AssetApiError(500, 'Failed to retrieve provider health');
    }

    return response.data;
  }
}

// Export singleton instance
export const assetService = new AssetService();
export default assetService;
