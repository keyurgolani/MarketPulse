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
  /** Timestamp when the response was generated */
  timestamp: number;
  /** Optional metadata about the response */
  meta?: ResponseMetadata;
}

/**
 * Paginated response wrapper for list endpoints
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  /** Array of data items */
  data: T[];
  /** Pagination information */
  pagination: PaginationInfo;
  /** Indicates if the request was successful */
  success: boolean;
  /** Timestamp when the response was generated */
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
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Request path that caused the error */
  path?: string;
  /** Additional error details for debugging */
  details?: Record<string, unknown>;
  /** Validation errors for form submissions */
  validationErrors?: ValidationError[];
}

/**
 * Validation error for form fields
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Error message for the field */
  message: string;
  /** The invalid value that was provided */
  value?: unknown;
  /** Validation rule that was violated */
  rule?: string;
}

/**
 * Optional metadata that can be included in responses
 */
export interface ResponseMetadata {
  /** Source of the data (cache, database, external API) */
  source?: 'cache' | 'database' | 'external-api';
  /** Time taken to process the request in milliseconds */
  processingTime?: number;
  /** Cache TTL in seconds if data is cached */
  cacheTtl?: number;
  /** API version used */
  version?: string;
  /** Rate limiting information */
  rateLimit?: RateLimitInfo;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the time window */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Time when the rate limit window resets (Unix timestamp) */
  resetTime: number;
  /** Duration of the rate limit window in seconds */
  windowSize: number;
}

/**
 * Generic request parameters for API endpoints
 */
export interface RequestParams {
  /** Optional request ID for tracking */
  requestId?: string;
  /** Client timestamp when request was made */
  clientTimestamp?: number;
  /** Client version making the request */
  clientVersion?: string;
}

/**
 * Common query parameters for list endpoints
 */
export interface ListQueryParams extends RequestParams {
  /** Page number for pagination (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Search query string */
  search?: string;
  /** Filters to apply */
  filters?: Record<string, unknown>;
}

/**
 * Utility type for making all properties optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for making specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making all properties required
 */
export type RequiredAll<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Utility type for deep partial (makes nested objects optional too)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Utility type for extracting the data type from an ApiResponse
 */
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Utility type for extracting the item type from a PaginatedResponse
 */
export type ExtractPaginatedData<T> =
  T extends PaginatedResponse<infer U> ? U : never;
