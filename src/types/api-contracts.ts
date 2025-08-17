/**
 * API contracts and endpoint definitions for MarketPulse application
 * Defines request/response types for all API endpoints
 */

import type {
  ApiResponse,
  PaginatedResponse,
  ListRequestParams,
  TimeRangeParams,
} from './api';
import type { Dashboard } from './dashboard';
import type { Widget } from './widget';
import type {
  Asset,
  HistoricalData,
  MarketSummary,
  Watchlist,
  PriceAlert,
} from './market';
import type { NewsArticle, NewsSearchResult } from './news';
import type { User, UserPreferences } from './user';

// =============================================================================
// Dashboard API Contracts
// =============================================================================

/**
 * Dashboard endpoints
 */
export interface DashboardApiContracts {
  // GET /api/dashboards
  getDashboards: {
    query: ListRequestParams & {
      isPublic?: boolean;
      isDefault?: boolean;
      tags?: string[];
    };
    response: PaginatedResponse<Dashboard>;
  };

  // GET /api/dashboards/:id
  getDashboard: {
    params: { id: string };
    response: ApiResponse<Dashboard>;
  };

  // POST /api/dashboards
  createDashboard: {
    body: {
      name: string;
      description?: string;
      isPublic?: boolean;
      widgets?: Partial<Widget>[];
      layout?: Record<string, unknown>;
      tags?: string[];
    };
    response: ApiResponse<Dashboard>;
  };

  // PUT /api/dashboards/:id
  updateDashboard: {
    params: { id: string };
    body: Partial<{
      name: string;
      description: string;
      isPublic: boolean;
      widgets: Widget[];
      layout: Record<string, unknown>;
      tags: string[];
    }>;
    response: ApiResponse<Dashboard>;
  };

  // DELETE /api/dashboards/:id
  deleteDashboard: {
    params: { id: string };
    response: ApiResponse<{ deleted: boolean }>;
  };

  // POST /api/dashboards/:id/share
  shareDashboard: {
    params: { id: string };
    body: {
      permissions: Array<{
        userId: string;
        permission: 'view' | 'edit' | 'admin';
      }>;
      publicLink?: boolean;
      expiresAt?: string;
      requireAuth?: boolean;
    };
    response: ApiResponse<{ shareLink?: string }>;
  };

  // POST /api/dashboards/:id/duplicate
  duplicateDashboard: {
    params: { id: string };
    body: {
      name: string;
      description?: string;
    };
    response: ApiResponse<Dashboard>;
  };
}

// =============================================================================
// Asset API Contracts
// =============================================================================

/**
 * Asset endpoints
 */
export interface AssetApiContracts {
  // GET /api/assets
  getAssets: {
    query: {
      symbols: string | string[];
      includeExtendedHours?: boolean;
      includeIndicators?: boolean;
      forceRefresh?: boolean;
    };
    response: ApiResponse<Asset[]>;
  };

  // GET /api/assets/:symbol
  getAsset: {
    params: { symbol: string };
    query: {
      includeExtendedHours?: boolean;
      includeIndicators?: boolean;
      forceRefresh?: boolean;
    };
    response: ApiResponse<Asset>;
  };

  // GET /api/assets/:symbol/history
  getAssetHistory: {
    params: { symbol: string };
    query: {
      timeframe: string;
      startDate?: string;
      endDate?: string;
      indicators?: string[];
      adjustForSplits?: boolean;
      adjustForDividends?: boolean;
    };
    response: ApiResponse<HistoricalData>;
  };

  // GET /api/assets/search
  searchAssets: {
    query: {
      query?: string;
      types?: string[];
      exchanges?: string[];
      sectors?: string[];
      industries?: string[];
      countries?: string[];
      priceRange?: { min?: number; max?: number };
      marketCapRange?: { min?: number; max?: number };
      volumeRange?: { min?: number; max?: number };
    } & ListRequestParams;
    response: PaginatedResponse<Asset>;
  };

  // GET /api/market/summary
  getMarketSummary: {
    query: {
      indices?: string[];
      includeGainers?: boolean;
      includeLosers?: boolean;
      includeMostActive?: boolean;
    };
    response: ApiResponse<MarketSummary>;
  };
}

// =============================================================================
// News API Contracts
// =============================================================================

/**
 * News endpoints
 */
export interface NewsApiContracts {
  // GET /api/news
  getNews: {
    query: {
      sources?: string[];
      categories?: string[];
      assets?: string[];
      sentiment?: string[];
      languages?: string[];
      breakingOnly?: boolean;
      minReliability?: number;
      keywords?: string[];
      excludeKeywords?: string[];
    } & ListRequestParams &
      TimeRangeParams;
    response: PaginatedResponse<NewsArticle>;
  };

  // GET /api/news/:id
  getNewsArticle: {
    params: { id: string };
    response: ApiResponse<NewsArticle>;
  };

  // GET /api/news/search
  searchNews: {
    query: {
      query: string;
      sources?: string[];
      categories?: string[];
      assets?: string[];
      sentiment?: string[];
    } & ListRequestParams &
      TimeRangeParams;
    response: ApiResponse<NewsSearchResult>;
  };

  // GET /api/news/trending
  getTrendingNews: {
    query: {
      timeframe?: '1h' | '6h' | '1d' | '1w';
      categories?: string[];
      limit?: number;
    };
    response: ApiResponse<{
      articles: NewsArticle[];
      trendingTopics: Array<{
        topic: string;
        mentions: number;
        sentiment: string;
      }>;
    }>;
  };
}

// =============================================================================
// User API Contracts
// =============================================================================

/**
 * User endpoints
 */
export interface UserApiContracts {
  // GET /api/user/profile
  getUserProfile: {
    response: ApiResponse<User>;
  };

  // PUT /api/user/profile
  updateUserProfile: {
    body: {
      displayName?: string;
      preferences?: Partial<UserPreferences>;
    };
    response: ApiResponse<User>;
  };

  // GET /api/user/preferences
  getUserPreferences: {
    response: ApiResponse<UserPreferences>;
  };

  // PUT /api/user/preferences
  updateUserPreferences: {
    body: Partial<UserPreferences>;
    response: ApiResponse<UserPreferences>;
  };

  // POST /api/user/change-password
  changePassword: {
    body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };
    response: ApiResponse<{ success: boolean }>;
  };
}

// =============================================================================
// Watchlist API Contracts
// =============================================================================

/**
 * Watchlist endpoints
 */
export interface WatchlistApiContracts {
  // GET /api/watchlists
  getWatchlists: {
    query: ListRequestParams & {
      isPublic?: boolean;
      tags?: string[];
    };
    response: PaginatedResponse<Watchlist>;
  };

  // GET /api/watchlists/:id
  getWatchlist: {
    params: { id: string };
    response: ApiResponse<Watchlist>;
  };

  // POST /api/watchlists
  createWatchlist: {
    body: {
      name: string;
      description?: string;
      symbols?: string[];
      isPublic?: boolean;
      tags?: string[];
    };
    response: ApiResponse<Watchlist>;
  };

  // PUT /api/watchlists/:id
  updateWatchlist: {
    params: { id: string };
    body: Partial<{
      name: string;
      description: string;
      symbols: string[];
      isPublic: boolean;
      tags: string[];
    }>;
    response: ApiResponse<Watchlist>;
  };

  // DELETE /api/watchlists/:id
  deleteWatchlist: {
    params: { id: string };
    response: ApiResponse<{ deleted: boolean }>;
  };

  // POST /api/watchlists/:id/assets
  addAssetToWatchlist: {
    params: { id: string };
    body: { symbol: string };
    response: ApiResponse<Watchlist>;
  };

  // DELETE /api/watchlists/:id/assets/:symbol
  removeAssetFromWatchlist: {
    params: { id: string; symbol: string };
    response: ApiResponse<Watchlist>;
  };
}

// =============================================================================
// Alerts API Contracts
// =============================================================================

/**
 * Price alerts endpoints
 */
export interface AlertsApiContracts {
  // GET /api/alerts
  getAlerts: {
    query: ListRequestParams & {
      symbol?: string;
      type?: string;
      isActive?: boolean;
    };
    response: PaginatedResponse<PriceAlert>;
  };

  // GET /api/alerts/:id
  getAlert: {
    params: { id: string };
    response: ApiResponse<PriceAlert>;
  };

  // POST /api/alerts
  createAlert: {
    body: {
      symbol: string;
      type: 'price' | 'volume' | 'change' | 'technical';
      condition: {
        operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
        field: 'price' | 'change' | 'changePercent' | 'volume';
        value: number;
      };
      targetValue: number;
      message?: string;
      expiresAt?: string;
    };
    response: ApiResponse<PriceAlert>;
  };

  // PUT /api/alerts/:id
  updateAlert: {
    params: { id: string };
    body: Partial<{
      condition: Record<string, unknown>;
      targetValue: number;
      message: string;
      isActive: boolean;
      expiresAt: string;
    }>;
    response: ApiResponse<PriceAlert>;
  };

  // DELETE /api/alerts/:id
  deleteAlert: {
    params: { id: string };
    response: ApiResponse<{ deleted: boolean }>;
  };

  // POST /api/alerts/:id/test
  testAlert: {
    params: { id: string };
    response: ApiResponse<{ triggered: boolean; message: string }>;
  };
}

// =============================================================================
// System API Contracts
// =============================================================================

/**
 * System endpoints
 */
export interface SystemApiContracts {
  // GET /api/system/health
  getSystemHealth: {
    response: ApiResponse<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      timestamp: string;
      uptime: number;
      version: string;
      services: Array<{
        name: string;
        status: 'up' | 'down' | 'degraded';
        responseTime?: number;
        lastCheck: string;
      }>;
    }>;
  };

  // GET /api/system/cache/stats
  getCacheStats: {
    response: ApiResponse<{
      redis: {
        connected: boolean;
        memory: number;
        keys: number;
        hitRate: number;
      };
      memory: {
        used: number;
        total: number;
        hitRate: number;
      };
    }>;
  };

  // POST /api/system/cache/refresh
  refreshCache: {
    body: {
      symbols?: string[];
      categories?: string[];
      force?: boolean;
    };
    response: ApiResponse<{
      refreshed: string[];
      failed: string[];
      duration: number;
    }>;
  };

  // GET /api/system/metrics
  getSystemMetrics: {
    query: TimeRangeParams;
    response: ApiResponse<{
      requests: Array<{ timestamp: string; count: number }>;
      errors: Array<{ timestamp: string; count: number }>;
      responseTime: Array<{ timestamp: string; avg: number; p95: number }>;
      cacheHitRate: Array<{ timestamp: string; rate: number }>;
    }>;
  };
}

// =============================================================================
// WebSocket API Contracts
// =============================================================================

/**
 * WebSocket message types
 */
export interface WebSocketContracts {
  // Client to Server messages
  clientMessages: {
    subscribe: {
      type: 'subscribe';
      payload: {
        symbols?: string[];
        dashboards?: string[];
        news?: boolean;
        alerts?: boolean;
      };
    };

    unsubscribe: {
      type: 'unsubscribe';
      payload: {
        symbols?: string[];
        dashboards?: string[];
        news?: boolean;
        alerts?: boolean;
      };
    };

    ping: {
      type: 'ping';
      payload?: { timestamp: number };
    };
  };

  // Server to Client messages
  serverMessages: {
    priceUpdate: {
      type: 'priceUpdate';
      payload: {
        symbol: string;
        price: number;
        change: number;
        changePercent: number;
        volume: number;
        timestamp: string;
      };
    };

    newsUpdate: {
      type: 'newsUpdate';
      payload: {
        article: NewsArticle;
        relatedSymbols: string[];
      };
    };

    alertTriggered: {
      type: 'alertTriggered';
      payload: {
        alert: PriceAlert;
        currentValue: number;
        message: string;
      };
    };

    dashboardUpdate: {
      type: 'dashboardUpdate';
      payload: {
        dashboardId: string;
        changes: Partial<Dashboard>;
        updatedBy: string;
      };
    };

    error: {
      type: 'error';
      payload: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };

    pong: {
      type: 'pong';
      payload: { timestamp: number };
    };
  };
}

// =============================================================================
// Combined API Contracts
// =============================================================================

/**
 * All API contracts combined
 */
export interface ApiContracts
  extends DashboardApiContracts,
    AssetApiContracts,
    NewsApiContracts,
    UserApiContracts,
    WatchlistApiContracts,
    AlertsApiContracts,
    SystemApiContracts {}

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extract request type from API contract
 */
export type ApiRequest<T extends keyof ApiContracts> = ApiContracts[T] extends {
  body: infer B;
  query: infer Q;
  params: infer P;
}
  ? { body: B; query: Q; params: P }
  : ApiContracts[T] extends { body: infer B; query: infer Q }
    ? { body: B; query: Q }
    : ApiContracts[T] extends { body: infer B; params: infer P }
      ? { body: B; params: P }
      : ApiContracts[T] extends { query: infer Q; params: infer P }
        ? { query: Q; params: P }
        : ApiContracts[T] extends { body: infer B }
          ? { body: B }
          : ApiContracts[T] extends { query: infer Q }
            ? { query: Q }
            : ApiContracts[T] extends { params: infer P }
              ? { params: P }
              : Record<string, never>;

/**
 * Extract response type from API contract
 */
export type ApiResponseType<T extends keyof ApiContracts> =
  ApiContracts[T] extends {
    response: infer R;
  }
    ? R
    : never;

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true } {
  return response.success === true;
}

// isPaginatedResponse is exported from api.ts to avoid conflicts

/**
 * Create typed API client method
 */
export type ApiMethod<T extends keyof ApiContracts> = (
  request: ApiRequest<T>
) => Promise<ApiResponseType<T>>;

/**
 * API client interface
 */
export interface ApiClient {
  dashboards: {
    getDashboards: ApiMethod<'getDashboards'>;
    getDashboard: ApiMethod<'getDashboard'>;
    createDashboard: ApiMethod<'createDashboard'>;
    updateDashboard: ApiMethod<'updateDashboard'>;
    deleteDashboard: ApiMethod<'deleteDashboard'>;
    shareDashboard: ApiMethod<'shareDashboard'>;
    duplicateDashboard: ApiMethod<'duplicateDashboard'>;
  };

  assets: {
    getAssets: ApiMethod<'getAssets'>;
    getAsset: ApiMethod<'getAsset'>;
    getAssetHistory: ApiMethod<'getAssetHistory'>;
    searchAssets: ApiMethod<'searchAssets'>;
    getMarketSummary: ApiMethod<'getMarketSummary'>;
  };

  news: {
    getNews: ApiMethod<'getNews'>;
    getNewsArticle: ApiMethod<'getNewsArticle'>;
    searchNews: ApiMethod<'searchNews'>;
    getTrendingNews: ApiMethod<'getTrendingNews'>;
  };

  user: {
    getUserProfile: ApiMethod<'getUserProfile'>;
    updateUserProfile: ApiMethod<'updateUserProfile'>;
    getUserPreferences: ApiMethod<'getUserPreferences'>;
    updateUserPreferences: ApiMethod<'updateUserPreferences'>;
    changePassword: ApiMethod<'changePassword'>;
  };

  watchlists: {
    getWatchlists: ApiMethod<'getWatchlists'>;
    getWatchlist: ApiMethod<'getWatchlist'>;
    createWatchlist: ApiMethod<'createWatchlist'>;
    updateWatchlist: ApiMethod<'updateWatchlist'>;
    deleteWatchlist: ApiMethod<'deleteWatchlist'>;
    addAssetToWatchlist: ApiMethod<'addAssetToWatchlist'>;
    removeAssetFromWatchlist: ApiMethod<'removeAssetFromWatchlist'>;
  };

  alerts: {
    getAlerts: ApiMethod<'getAlerts'>;
    getAlert: ApiMethod<'getAlert'>;
    createAlert: ApiMethod<'createAlert'>;
    updateAlert: ApiMethod<'updateAlert'>;
    deleteAlert: ApiMethod<'deleteAlert'>;
    testAlert: ApiMethod<'testAlert'>;
  };

  system: {
    getSystemHealth: ApiMethod<'getSystemHealth'>;
    getCacheStats: ApiMethod<'getCacheStats'>;
    refreshCache: ApiMethod<'refreshCache'>;
    getSystemMetrics: ApiMethod<'getSystemMetrics'>;
  };
}
