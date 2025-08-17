/**
 * Error handling types and interfaces for MarketPulse application
 * Provides comprehensive error classification, handling, and recovery mechanisms
 */

import type { RateLimitInfo } from './api';

/**
 * Base error interface for all application errors
 */
export interface BaseError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Additional error context */
  context?: ErrorContext;
  /** Stack trace (for debugging) */
  stack?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** User ID (if applicable) */
  userId?: string;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'api'
  | 'database'
  | 'cache'
  | 'external-service'
  | 'rate-limit'
  | 'timeout'
  | 'configuration'
  | 'business-logic'
  | 'system'
  | 'user-input'
  | 'data-integrity'
  | 'security';

/**
 * Error context for additional information
 */
export interface ErrorContext {
  /** Component where error occurred */
  component?: string;
  /** Function/method where error occurred */
  function?: string;
  /** Request URL (for API errors) */
  url?: string;
  /** HTTP method (for API errors) */
  method?: string;
  /** Request parameters */
  params?: Record<string, unknown>;
  /** User agent */
  userAgent?: string;
  /** IP address */
  ipAddress?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * API error response
 */
export interface ApiError extends BaseError {
  /** HTTP status code */
  statusCode: number;
  /** API endpoint that failed */
  endpoint: string;
  /** Request method */
  method: string;
  /** Response headers */
  headers?: Record<string, string>;
  /** Response body */
  responseBody?: unknown;
  /** Retry information */
  retryInfo?: RetryInfo;
}

/**
 * Validation error details
 */
export interface ValidationError extends BaseError {
  /** Field that failed validation */
  field: string;
  /** Validation rule that failed */
  rule: string;
  /** Expected value or format */
  expected?: unknown;
  /** Actual value received */
  actual?: unknown;
  /** All validation errors (for multiple fields) */
  errors?: FieldError[];
}

/**
 * Individual field validation error
 */
export interface FieldError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Validation rule */
  rule: string;
  /** Field value */
  value?: unknown;
}

/**
 * Network error details
 */
export interface NetworkError extends BaseError {
  /** Network error type */
  type: NetworkErrorType;
  /** Target URL */
  url: string;
  /** Timeout duration (if applicable) */
  timeout?: number;
  /** Retry attempt number */
  retryAttempt?: number;
  /** Connection details */
  connection?: ConnectionInfo;
}

/**
 * Network error types
 */
export type NetworkErrorType =
  | 'connection-refused'
  | 'timeout'
  | 'dns-resolution'
  | 'ssl-error'
  | 'proxy-error'
  | 'network-unreachable'
  | 'connection-reset'
  | 'unknown';

/**
 * Connection information
 */
export interface ConnectionInfo {
  /** Host name */
  host: string;
  /** Port number */
  port: number;
  /** Protocol used */
  protocol: string;
  /** Connection timeout */
  timeout: number;
  /** Whether using proxy */
  proxy?: boolean;
}

/**
 * Database error details
 */
export interface DatabaseError extends BaseError {
  /** Database operation type */
  operation: DatabaseOperation;
  /** Table/collection name */
  table?: string;
  /** Query that failed */
  query?: string;
  /** Database error code */
  dbErrorCode?: string;
  /** Connection information */
  connection?: string;
}

/**
 * Database operation types
 */
export type DatabaseOperation =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'create'
  | 'drop'
  | 'alter'
  | 'index'
  | 'transaction'
  | 'connection';

/**
 * Cache error details
 */
export interface CacheError extends BaseError {
  /** Cache operation type */
  operation: CacheOperation;
  /** Cache key */
  key?: string;
  /** Cache provider */
  provider: string;
  /** TTL information */
  ttl?: number;
}

/**
 * Cache operation types
 */
export type CacheOperation =
  | 'get'
  | 'set'
  | 'delete'
  | 'clear'
  | 'exists'
  | 'expire';

/**
 * External service error details
 */
export interface ExternalServiceError extends BaseError {
  /** Service name */
  service: string;
  /** Service endpoint */
  endpoint: string;
  /** HTTP status code */
  statusCode?: number;
  /** Service response */
  response?: unknown;
  /** Rate limit information */
  rateLimit?: RateLimitInfo;
  /** Circuit breaker state */
  circuitBreakerState?: CircuitBreakerState;
}

// RateLimitInfo is exported from api.ts to avoid conflicts

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Retry information
 */
export interface RetryInfo {
  /** Current attempt number */
  attempt: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** Delay before next retry */
  nextRetryDelay: number;
  /** Backoff strategy */
  backoffStrategy: BackoffStrategy;
  /** Whether retries are exhausted */
  exhausted: boolean;
}

/**
 * Backoff strategies for retries
 */
export type BackoffStrategy = 'linear' | 'exponential' | 'fixed' | 'random';

/**
 * Error recovery action
 */
export interface ErrorRecoveryAction {
  /** Action type */
  type: RecoveryActionType;
  /** Action description */
  description: string;
  /** Action handler function name */
  handler?: string;
  /** Action parameters */
  params?: Record<string, unknown>;
  /** Whether action is automatic */
  automatic: boolean;
}

/**
 * Recovery action types
 */
export type RecoveryActionType =
  | 'retry'
  | 'fallback'
  | 'refresh'
  | 'redirect'
  | 'logout'
  | 'reload'
  | 'contact-support'
  | 'ignore'
  | 'custom';

/**
 * Error notification configuration
 */
export interface ErrorNotification {
  /** Whether to show user notification */
  showToUser: boolean;
  /** Notification message */
  message?: string;
  /** Notification type */
  type: NotificationType;
  /** Auto-dismiss timeout */
  timeout?: number;
  /** Recovery actions to show */
  actions?: ErrorRecoveryAction[];
}

/**
 * Notification types
 */
export type NotificationType = 'error' | 'warning' | 'info' | 'success';

/**
 * Error reporting configuration
 */
export interface ErrorReporting {
  /** Whether to report to error tracking service */
  report: boolean;
  /** Error tracking service */
  service?: string;
  /** Additional tags */
  tags?: string[];
  /** User feedback prompt */
  promptUserFeedback?: boolean;
  /** Include user context */
  includeUserContext?: boolean;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Error notification settings */
  notification: ErrorNotification;
  /** Error reporting settings */
  reporting: ErrorReporting;
  /** Recovery actions */
  recoveryActions: ErrorRecoveryAction[];
  /** Whether to log error */
  log: boolean;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Error boundary state for React components
 */
export interface ErrorBoundaryState {
  /** Whether error boundary has caught an error */
  hasError: boolean;
  /** The error that was caught */
  error?: Error;
  /** Error info from React */
  errorInfo?: Record<string, unknown>;
  /** Error ID for tracking */
  errorId?: string;
  /** Recovery actions available */
  recoveryActions?: ErrorRecoveryAction[];
}

/**
 * User-friendly error messages
 */
export interface UserErrorMessage {
  /** Error code */
  code: string;
  /** User-friendly title */
  title: string;
  /** User-friendly description */
  description: string;
  /** Suggested actions */
  suggestions?: string[];
  /** Help link */
  helpLink?: string;
}

/**
 * Error analytics data
 */
export interface ErrorAnalytics {
  /** Error code */
  code: string;
  /** Error count */
  count: number;
  /** First occurrence */
  firstOccurrence: Date;
  /** Last occurrence */
  lastOccurrence: Date;
  /** Affected users */
  affectedUsers: number;
  /** Error rate */
  errorRate: number;
  /** Resolution rate */
  resolutionRate: number;
  /** Average resolution time */
  avgResolutionTime: number;
}

/**
 * Type guard to check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const obj = error as Record<string, unknown>;
  return typeof obj.statusCode === 'number' && typeof obj.endpoint === 'string';
}

/**
 * Type guard to check if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const obj = error as Record<string, unknown>;
  return typeof obj.field === 'string' && typeof obj.rule === 'string';
}

/**
 * Type guard to check if error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const obj = error as Record<string, unknown>;
  return typeof obj.type === 'string' && typeof obj.url === 'string';
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: BaseError): boolean {
  const retryableCategories: ErrorCategory[] = [
    'network',
    'timeout',
    'rate-limit',
    'external-service',
  ];
  return retryableCategories.includes(error.category);
}

/**
 * Type guard to check if error is critical
 */
export function isCriticalError(error: BaseError): boolean {
  return error.severity === 'critical';
}

/**
 * Utility function to create error from unknown value
 */
export function createErrorFromUnknown(
  error: unknown,
  context?: Partial<ErrorContext>
): BaseError {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      severity: 'medium',
      category: 'system',
      timestamp: new Date(),
      stack: error.stack,
      context,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
    severity: 'medium',
    category: 'system',
    timestamp: new Date(),
    context,
  };
}

/**
 * Utility function to sanitize error for client
 */
export function sanitizeErrorForClient(error: BaseError): Partial<BaseError> {
  return {
    code: error.code,
    message: error.message,
    severity: error.severity,
    category: error.category,
    timestamp: error.timestamp,
    requestId: error.requestId,
    // Exclude stack trace and sensitive context
  };
}
