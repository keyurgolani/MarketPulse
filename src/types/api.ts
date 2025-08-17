/**
 * Core API response types and interfaces for MarketPulse application
 * Provides standardized response formats and error handling
 */

/**
 * Standard API response wrapper for all endpoints
 * @template T - The type of data being returned
 */
export interface ApiResponse<T> {
  /** The actual data payload */
  data: T;
  /** Indicates if the request was successful */
  success: boolean;
  /** Error message if success is false */
  error?: string;
  /** Unix timestamp when the response was generated */
  timestamp: number;
  /** Optional metadata about the response */
  meta?: ResponseMetadata;
}

/**
 * Paginated response wrapper for list endpoints
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  /** Array of data items for the current page */
  data: T[];
  /** Pagination information */
  pagination: PaginationInfo;
  /** Indicates if the request was successful */
  success: boolean;
  /** Unix timestamp when the response was generated */
  timestamp: number;
  /** Optional metadata about the response */
  meta?: ResponseMetadata;
}

/**
 * Pagination information for paginated responses
 */
export interface PaginationInfo {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  /** Error type or code */
  error: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** ISO timestamp when the error occurred */
  timestamp: string;
  /** Request path that caused the error */
  path?: string;
  /** Additional error details for debugging */
  details?: Record<string, unknown>;
  /** Request ID for tracking */
  requestId?: string;
}

/**
 * Optional metadata that can be included in responses
 */
export interface ResponseMetadata {
  /** Source of the data (cache, api, database) */
  source?: 'cache' | 'api' | 'database';
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Rate limit information */
  rateLimit?: RateLimitInfo;
  /** Performance metrics */
  performance?: PerformanceMetrics;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the time window */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  resetTime: number;
  /** Time window in seconds */
  windowMs: number;
}

/**
 * Performance metrics for API responses
 */
export interface PerformanceMetrics {
  /** Total response time in milliseconds */
  responseTime: number;
  /** Database query time in milliseconds */
  dbTime?: number;
  /** External API call time in milliseconds */
  apiTime?: number;
  /** Cache lookup time in milliseconds */
  cacheTime?: number;
}

/**
 * Generic request parameters for list endpoints
 */
export interface ListRequestParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Search query */
  search?: string;
  /** Filters to apply */
  filters?: Record<string, unknown>;
}

/**
 * Generic request parameters for time-based queries
 */
export interface TimeRangeParams {
  /** Start date (ISO string or Unix timestamp) */
  startDate?: string | number;
  /** End date (ISO string or Unix timestamp) */
  endDate?: string | number;
  /** Predefined time range */
  timeRange?: '1h' | '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';
}

/**
 * Utility type for making all properties optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for making specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for creating update payloads (excludes id, timestamps)
 */
export type UpdatePayload<T> = Omit<
  Partial<T>,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Utility type for creating create payloads (excludes id, timestamps)
 */
export type CreatePayload<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    'error' in response &&
    'statusCode' in response &&
    typeof (response as Record<string, unknown>).error === 'string' &&
    typeof (response as Record<string, unknown>).statusCode === 'number'
  );
}

/**
 * Type guard to check if a response is a successful API response
 */
export function isApiResponse<T>(
  response: unknown
): response is ApiResponse<T> {
  return (
    response !== null &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response &&
    typeof (response as Record<string, unknown>).success === 'boolean' &&
    (response as Record<string, unknown>).data !== undefined
  );
}

/**
 * Type guard to check if a response is a paginated response
 */
export function isPaginatedResponse<T>(
  response: unknown
): response is PaginatedResponse<T> {
  if (response === null || typeof response !== 'object') {
    return false;
  }

  const obj = response as Record<string, unknown>;

  return (
    'data' in obj &&
    'pagination' in obj &&
    Array.isArray(obj.data) &&
    obj.pagination !== null &&
    typeof obj.pagination === 'object' &&
    'page' in (obj.pagination as Record<string, unknown>) &&
    typeof (obj.pagination as Record<string, unknown>).page === 'number'
  );
}
