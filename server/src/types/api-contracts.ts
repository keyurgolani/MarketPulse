/**
 * Server-side API contracts for MarketPulse backend
 * Defines Express request/response types and middleware interfaces
 */

import { Request, Response } from 'express';
// Define server-side API response types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ValidationErrorResponse extends ErrorResponse {
  details: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  validationErrors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// =============================================================================
// Extended Request/Response Types
// =============================================================================

/**
 * Extended Express Request with typed body, query, and params
 */
export interface TypedRequest<
  TBody = unknown,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TParams extends Record<string, string> = Record<string, string>,
> extends Request {
  body: TBody;
  query: TQuery;
  params: TParams;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  requestId?: string;
  startTime?: number;
}

/**
 * Extended Express Response with typed JSON methods
 */
export interface TypedResponse<TData = unknown> extends Response {
  success: (data: TData, meta?: Record<string, unknown>) => void;
  error: (
    error: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) => void;
  paginated: (
    data: TData[],
    pagination: Record<string, unknown>,
    meta?: Record<string, unknown>
  ) => void;
}

/**
 * API route handler type
 */
export type ApiHandler<
  TBody = unknown,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TParams extends Record<string, string> = Record<string, string>,
  TResponse = unknown,
> = (
  req: TypedRequest<TBody, TQuery, TParams>,
  res: TypedResponse<TResponse>
) => Promise<void> | void;

// =============================================================================
// Dashboard API Types
// =============================================================================

export type DashboardApiGetDashboardsQuery = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isPublic?: boolean;
  isDefault?: boolean;
  tags?: string[];
};

export type DashboardApiGetDashboardParams = {
  id: string;
};

export type DashboardApiCreateDashboardBody = {
  name: string;
  description?: string;
  isPublic?: boolean;
  widgets?: Record<string, unknown>[];
  layout?: Record<string, unknown>;
  tags?: string[];
};

export type DashboardApiUpdateDashboardParams = {
  id: string;
};

export type DashboardApiUpdateDashboardBody =
  Partial<DashboardApiCreateDashboardBody>;

export type DashboardApiDeleteDashboardParams = {
  id: string;
};

export type DashboardApiShareDashboardParams = {
  id: string;
};

export type DashboardApiShareDashboardBody = {
  permissions: Array<{
    userId: string;
    permission: 'view' | 'edit' | 'admin';
  }>;
  publicLink?: boolean;
  expiresAt?: string;
  requireAuth?: boolean;
};

export type DashboardApiDuplicateDashboardParams = {
  id: string;
};

export type DashboardApiDuplicateDashboardBody = {
  name: string;
  description?: string;
};

// =============================================================================
// Asset API Types
// =============================================================================

export type AssetApiGetAssetsQuery = {
  symbols: string | string[];
  includeExtendedHours?: boolean;
  includeIndicators?: boolean;
  forceRefresh?: boolean;
};

export type AssetApiGetAssetParams = {
  symbol: string;
};

export type AssetApiGetAssetQuery = {
  includeExtendedHours?: boolean;
  includeIndicators?: boolean;
  forceRefresh?: boolean;
};

export type AssetApiGetAssetHistoryParams = {
  symbol: string;
};

export type AssetApiGetAssetHistoryQuery = {
  timeframe: string;
  startDate?: string;
  endDate?: string;
  indicators?: string[];
  adjustForSplits?: boolean;
  adjustForDividends?: boolean;
};

export type AssetApiSearchAssetsQuery = {
  query?: string;
  types?: string[];
  exchanges?: string[];
  sectors?: string[];
  industries?: string[];
  countries?: string[];
  priceRange?: { min?: number; max?: number };
  marketCapRange?: { min?: number; max?: number };
  volumeRange?: { min?: number; max?: number };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type AssetApiGetMarketSummaryQuery = {
  indices?: string[];
  includeGainers?: boolean;
  includeLosers?: boolean;
  includeMostActive?: boolean;
};

// =============================================================================
// News API Types
// =============================================================================

export type NewsApiGetNewsQuery = {
  sources?: string[];
  categories?: string[];
  assets?: string[];
  sentiment?: string[];
  languages?: string[];
  breakingOnly?: boolean;
  minReliability?: number;
  keywords?: string[];
  excludeKeywords?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  timeRange?: string;
};

export type NewsApiGetNewsArticleParams = {
  id: string;
};

export type NewsApiSearchNewsQuery = {
  query: string;
  sources?: string[];
  categories?: string[];
  assets?: string[];
  sentiment?: string[];
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export type NewsApiGetTrendingNewsQuery = {
  timeframe?: '1h' | '6h' | '1d' | '1w';
  categories?: string[];
  limit?: number;
};

// =============================================================================
// User API Types
// =============================================================================

export type UserApiUpdateUserProfileBody = {
  displayName?: string;
  preferences?: Record<string, unknown>;
};

export type UserApiUpdateUserPreferencesBody = {
  theme?: 'light' | 'dark' | 'system';
  defaultDashboard?: string;
  refreshInterval?: number;
  notifications?: Record<string, unknown>;
  accessibility?: Record<string, unknown>;
  display?: Record<string, unknown>;
  trading?: Record<string, unknown>;
};

export type UserApiChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

// =============================================================================
// Watchlist API Types
// =============================================================================

export type WatchlistApiGetWatchlistsQuery = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isPublic?: boolean;
  tags?: string[];
};

export type WatchlistApiGetWatchlistParams = {
  id: string;
};

export type WatchlistApiCreateWatchlistBody = {
  name: string;
  description?: string;
  symbols?: string[];
  isPublic?: boolean;
  tags?: string[];
};

export type WatchlistApiUpdateWatchlistParams = {
  id: string;
};

export type WatchlistApiUpdateWatchlistBody =
  Partial<WatchlistApiCreateWatchlistBody>;

export type WatchlistApiDeleteWatchlistParams = {
  id: string;
};

export type WatchlistApiAddAssetToWatchlistParams = {
  id: string;
};

export type WatchlistApiAddAssetToWatchlistBody = {
  symbol: string;
};

export type WatchlistApiRemoveAssetFromWatchlistParams = {
  id: string;
  symbol: string;
};

// =============================================================================
// Alerts API Types
// =============================================================================

export type AlertsApiGetAlertsQuery = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  symbol?: string;
  type?: string;
  isActive?: boolean;
};

export type AlertsApiGetAlertParams = {
  id: string;
};

export type AlertsApiCreateAlertBody = {
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

export type AlertsApiUpdateAlertParams = {
  id: string;
};

export type AlertsApiUpdateAlertBody = Partial<{
  condition: Record<string, unknown>;
  targetValue: number;
  message: string;
  isActive: boolean;
  expiresAt: string;
}>;

export type AlertsApiDeleteAlertParams = {
  id: string;
};

export type AlertsApiTestAlertParams = {
  id: string;
};

// =============================================================================
// System API Types
// =============================================================================

export type SystemApiRefreshCacheBody = {
  symbols?: string[];
  categories?: string[];
  force?: boolean;
};

export type SystemApiGetSystemMetricsQuery = {
  startDate?: string;
  endDate?: string;
  timeRange?: string;
};

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Authentication middleware request extension
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin' | 'moderator';
    permissions: string[];
  };
}

/**
 * Rate limiting middleware request extension
 */
export interface RateLimitedRequest extends Request {
  rateLimit: {
    limit: number;
    remaining: number;
    resetTime: Date;
    windowMs: number;
  };
}

/**
 * Request logging middleware extension
 */
export interface LoggedRequest extends Request {
  requestId: string;
  startTime: number;
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
}

/**
 * Validation middleware extension
 */
export interface ValidatedRequest<T = unknown> extends Request {
  validatedData: T;
  validationErrors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// =============================================================================
// Error Handling Types
// =============================================================================

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  constructor(
    public override message: string,
    public errors: Array<{
      field: string;
      message: string;
      code: string;
    }>
  ) {
    super(400, message, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends ApiError {
  constructor(
    public resetTime: Date,
    public limit: number
  ) {
    super(429, 'Rate limit exceeded', 'RATE_LIMIT_ERROR', {
      resetTime,
      limit,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends ApiError {
  constructor(
    public service: string,
    public originalError?: Error | Record<string, unknown>
  ) {
    super(
      502,
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      originalError
    );
    this.name = 'ExternalServiceError';
  }
}

// =============================================================================
// Response Helper Types
// =============================================================================

/**
 * Success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
    meta,
  };
}

/**
 * Paginated response helper
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  meta?: Record<string, unknown>
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
    timestamp: Date.now(),
    meta,
  };
}

/**
 * Error response helper
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  details?: Record<string, unknown>,
  path?: string
): ErrorResponse {
  return {
    error,
    message: error,
    statusCode,
    timestamp: new Date().toISOString(),
    path: path || '',
    details,
  };
}

// =============================================================================
// Route Handler Helpers
// =============================================================================

/**
 * Async route handler wrapper
 */
export function asyncHandler<
  TBody = unknown,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TParams extends Record<string, string> = Record<string, string>,
  TResponse = unknown,
>(
  handler: ApiHandler<TBody, TQuery, TParams, TResponse>
): (
  req: TypedRequest<TBody, TQuery, TParams>,
  res: TypedResponse<TResponse>,
  next: (error?: Error) => void
) => void {
  return (
    req: TypedRequest<TBody, TQuery, TParams>,
    res: TypedResponse<TResponse>,
    next: (error?: Error) => void
  ) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

/**
 * Create typed route handler
 */
export function createHandler<
  TBody = unknown,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TParams extends Record<string, string> = Record<string, string>,
  TResponse = unknown,
>(
  handler: (
    req: TypedRequest<TBody, TQuery, TParams>,
    res: TypedResponse<TResponse>
  ) => Promise<TResponse>
): (req: Request, res: Response, next: NextFunction) => void {
  return asyncHandler(async (req, res) => {
    const result = await handler(req, res);
    res.success(result);
  });
}

/**
 * Create paginated route handler
 */
export function createPaginatedHandler<
  TBody = unknown,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TParams extends Record<string, string> = Record<string, string>,
  TResponse = unknown,
>(
  handler: (
    req: TypedRequest<TBody, TQuery, TParams>,
    res: TypedResponse<TResponse[]>
  ) => Promise<{
    data: TResponse[];
    total: number;
    page: number;
    limit: number;
  }>
): (req: Request, res: Response, next: NextFunction) => void {
  return asyncHandler(async (req, res) => {
    const result = await handler(req, res);
    const totalPages = Math.ceil(result.total / result.limit);

    res.paginated(result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages,
      hasNext: result.page < totalPages,
      hasPrev: result.page > 1,
    });
  });
}
