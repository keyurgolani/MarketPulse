/**
 * API Client for MarketPulse application
 * Provides centralized HTTP client with error handling, retries, and interceptors
 */

import type { ApiResponse } from '@/types/api';

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

export class ApiClient {
  private config: ApiClientConfig;
  private abortController: AbortController | null = null;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    // Debug logging (development only)
    if (import.meta.env.DEV) {
      console.log('API Client initialized with baseURL:', this.config.baseURL);
    }
  }

  /**
   * Make HTTP request with error handling and retries
   */
  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const {
      method,
      url,
      data,
      params,
      headers = {},
      timeout = this.config.timeout,
    } = config;

    // Build URL with query parameters
    // Properly construct URL by joining base URL and path
    const baseUrl = this.config.baseURL.endsWith('/')
      ? this.config.baseURL.slice(0, -1)
      : this.config.baseURL;
    const path = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = new URL(`${baseUrl}${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        fullUrl.searchParams.append(key, String(value));
      });
    }

    // Debug logging (development only)
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API) {
      console.log(`API Request: ${method} ${fullUrl.toString()}`);
    }

    // Setup request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(timeout),
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    // Implement retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(fullUrl.toString(), requestOptions);

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new ApiError(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code,
            errorData.details
          );
        }

        const responseData = await response.json();
        return {
          data: responseData,
          success: true,
          timestamp: Date.now(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on client errors (4xx) or abort errors
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          break;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.config.retries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * GET request
   */
  async get<T>(
    url: string,
    params?: Record<string, string | number | boolean>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, data });
  }

  /**
   * Cancel ongoing requests
   */
  cancelRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Parse error response from API
   */
  private async parseErrorResponse(response: Response): Promise<{
    message: string;
    code?: string;
    details?: unknown;
  }> {
    try {
      const errorData = await response.json();
      return {
        message: errorData.message || errorData.error || 'An error occurred',
        code: errorData.code,
        details: errorData.details,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient({
  baseURL: 'http://localhost:3001/api',
});

/**
 * Health check endpoint
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
}
