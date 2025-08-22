/**
 * Services index file
 * Provides centralized access to all service modules
 */

// API Client
export { apiClient, ApiClient, ApiError, checkApiHealth } from './apiClient';
export type { ApiClientConfig, RequestConfig } from './apiClient';

// Market Data Service
export { marketDataService, MarketDataService } from './marketDataService';
export type {
  MarketDataParams,
  HistoricalDataParams,
} from './marketDataService';

// Dashboard Service
export {
  dashboardService,
  userService,
  DashboardService,
  UserService,
} from './dashboardService';

export { authService, AuthService } from './authService';

// News Service
export { newsService, NewsService } from './newsService';
export type { NewsParams } from './newsService';

// Performance Services
export { cacheService } from './cacheService';
export { performanceService } from './performanceService';
export type { CacheEntry, CacheConfig, CacheStats } from './cacheService';
export type {
  PerformanceMetrics,
  PerformanceReport,
} from './performanceService';

// Service utilities
import { ApiError } from './apiClient';

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message: unknown };
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }
  return 'An unknown error occurred';
}

export function getErrorStatus(error: unknown): number | null {
  if (isApiError(error)) {
    return error.status;
  }
  return null;
}
