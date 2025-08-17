export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
  meta?: ResponseMetadata;
}
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  success: boolean;
  timestamp: number;
  meta?: ResponseMetadata;
}
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}
export interface ResponseMetadata {
  source?: 'cache' | 'api' | 'database';
  cacheTtl?: number;
  rateLimit?: RateLimitInfo;
  performance?: PerformanceMetrics;
}
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  windowMs: number;
}
export interface PerformanceMetrics {
  responseTime: number;
  dbTime?: number;
  apiTime?: number;
  cacheTime?: number;
}
export interface ListRequestParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}
export interface TimeRangeParams {
  startDate?: string | number;
  endDate?: string | number;
  timeRange?: '1h' | '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';
}
export type Optional<T> = {
  [P in keyof T]?: T[P];
};
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type UpdatePayload<T> = Omit<
  Partial<T>,
  'id' | 'createdAt' | 'updatedAt'
>;
export type CreatePayload<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export declare function isErrorResponse(
  response: unknown
): response is ErrorResponse;
export declare function isApiResponse<T>(
  response: unknown
): response is ApiResponse<T>;
export declare function isPaginatedResponse<T>(
  response: unknown
): response is PaginatedResponse<T>;
//# sourceMappingURL=api.d.ts.map
