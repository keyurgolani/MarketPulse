import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import { assetService, AssetApiError } from '@/services/assetService';
import {
  Asset,
  AssetPrice,
  AssetSearchResult,
  AssetListParams,
  AssetSearchParams,
} from '@/types/asset';
import { PaginationMetadata } from '@/types/api';

// Query keys for consistent caching
export const assetQueryKeys = {
  all: ['assets'] as const,
  lists: () => [...assetQueryKeys.all, 'list'] as const,
  list: (params: AssetListParams) =>
    [...assetQueryKeys.lists(), params] as const,
  details: () => [...assetQueryKeys.all, 'detail'] as const,
  detail: (symbol: string) => [...assetQueryKeys.details(), symbol] as const,
  prices: () => [...assetQueryKeys.all, 'price'] as const,
  price: (symbol: string) => [...assetQueryKeys.prices(), symbol] as const,
  search: (params: AssetSearchParams) =>
    [...assetQueryKeys.all, 'search', params] as const,
  popular: () => [...assetQueryKeys.all, 'popular'] as const,
  health: () => [...assetQueryKeys.all, 'health'] as const,
};

/**
 * Hook to get asset information by symbol
 */
export const useAsset = (
  symbol: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): UseQueryResult<Asset, AssetApiError> => {
  return useQuery({
    queryKey: assetQueryKeys.detail(symbol),
    queryFn: () => assetService.getAsset(symbol),
    enabled: options?.enabled !== false && !!symbol,
    ...(options?.refetchInterval && {
      refetchInterval: options.refetchInterval,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error instanceof AssetApiError && error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to get asset price by symbol
 */
export const useAssetPrice = (
  symbol: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): UseQueryResult<AssetPrice, AssetApiError> => {
  return useQuery({
    queryKey: assetQueryKeys.price(symbol),
    queryFn: () => assetService.getAssetPrice(symbol),
    enabled: options?.enabled !== false && !!symbol,
    refetchInterval: options?.refetchInterval ?? 30 * 1000, // Default 30 seconds for prices
    staleTime: 10 * 1000, // 10 seconds
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error instanceof AssetApiError && error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to get multiple assets by symbols
 */
export const useAssets = (
  symbols: string[],
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): UseQueryResult<Asset[], AssetApiError> => {
  return useQuery({
    queryKey: [...assetQueryKeys.all, 'batch', symbols.sort()],
    queryFn: () => assetService.getAssets(symbols),
    enabled: options?.enabled !== false && symbols.length > 0,
    ...(options?.refetchInterval && {
      refetchInterval: options.refetchInterval,
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to get multiple asset prices by symbols
 */
export const useAssetPrices = (
  symbols: string[],
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): Array<UseQueryResult<AssetPrice, AssetApiError>> => {
  return useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: assetQueryKeys.price(symbol),
      queryFn: () => assetService.getAssetPrice(symbol),
      enabled: options?.enabled !== false && !!symbol,
      refetchInterval: options?.refetchInterval ?? 30 * 1000,
      staleTime: 10 * 1000,
      retry: (failureCount: number, error: unknown): boolean => {
        if (error instanceof AssetApiError && error.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    })),
  });
};

/**
 * Hook to search for assets
 */
export const useAssetSearch = (
  params: AssetSearchParams,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<AssetSearchResult[], AssetApiError> => {
  return useQuery({
    queryKey: assetQueryKeys.search(params),
    queryFn: () => assetService.searchAssets(params),
    enabled: options?.enabled !== false && !!params.q && params.q.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get popular/trending assets
 */
export const usePopularAssets = (options?: {
  enabled?: boolean;
  refetchInterval?: number;
}): UseQueryResult<Asset[], AssetApiError> => {
  return useQuery({
    queryKey: assetQueryKeys.popular(),
    queryFn: () => assetService.getPopularAssets(),
    enabled: options?.enabled !== false,
    ...(options?.refetchInterval && {
      refetchInterval: options.refetchInterval,
    }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get asset list with pagination and filtering
 */
export const useAssetList = (
  params: AssetListParams = {},
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): UseQueryResult<
  {
    assets: Asset[];
    metadata: PaginationMetadata;
  },
  AssetApiError
> => {
  return useQuery({
    queryKey: assetQueryKeys.list(params),
    queryFn: () => assetService.getAssetList(params),
    enabled: options?.enabled !== false,
    ...(options?.refetchInterval && {
      refetchInterval: options.refetchInterval,
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to get provider health status
 */
export const useProviderHealth = (options?: {
  enabled?: boolean;
  refetchInterval?: number;
}): UseQueryResult<
  {
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
  },
  AssetApiError
> => {
  return useQuery({
    queryKey: assetQueryKeys.health(),
    queryFn: () => assetService.getProviderHealth(),
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 60 * 1000, // 1 minute
    staleTime: 30 * 1000, // 30 seconds
  });
};
