// Base API response interface
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  code?: string;
  message?: string;
  timestamp: number;
  metadata?: Partial<PaginationMetadata>;
}

// Error response interface
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  timestamp: number;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Pagination metadata
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Search parameters
export interface SearchParams extends PaginationParams {
  q?: string;
}

// Date range parameters
export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

// Asset query parameters
export interface AssetQueryParams extends PaginationParams {
  search?: string;
  sector?: string;
}

// News query parameters
export interface NewsQueryParams extends PaginationParams, DateRangeParams {
  asset?: string;
  source?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// Timeframe parameter
export interface TimeframeParams {
  timeframe?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
}
