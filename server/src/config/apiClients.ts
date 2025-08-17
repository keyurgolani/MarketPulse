/**
 * API Client Configuration
 * Centralized configuration for external API clients
 */

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  headers: Record<string, string>;
}

export interface DataSourceConfig {
  name: string;
  apiKeys: string[];
  config: ApiClientConfig;
  endpoints: {
    quote: string;
    historical: string;
    search: string;
    news: string;
  };
  cacheTTL: {
    quote: number;
    historical: number;
    search: number;
    news: number;
  };
}

export const YAHOO_FINANCE_CONFIG: DataSourceConfig = {
  name: 'Yahoo Finance',
  apiKeys: [
    process.env.YAHOO_FINANCE_API_KEY_1 || 'demo-key-1',
    process.env.YAHOO_FINANCE_API_KEY_2 || 'demo-key-2',
    process.env.YAHOO_FINANCE_API_KEY_3 || 'demo-key-3',
  ],
  config: {
    baseURL: 'https://query1.finance.yahoo.com',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
    },
    headers: {
      'User-Agent': 'MarketPulse/1.0.0 (Financial Dashboard)',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
  },
  endpoints: {
    quote: '/v8/finance/chart/{symbol}',
    historical: '/v8/finance/chart/{symbol}',
    search: '/v1/finance/search',
    news: '/v1/finance/news',
  },
  cacheTTL: {
    quote: 60, // 1 minute for real-time quotes
    historical: 3600, // 1 hour for historical data
    search: 86400, // 24 hours for search results
    news: 900, // 15 minutes for news
  },
};

export const GOOGLE_FINANCE_CONFIG: DataSourceConfig = {
  name: 'Google Finance',
  apiKeys: [
    process.env.GOOGLE_FINANCE_API_KEY_1 || 'demo-key-1',
    process.env.GOOGLE_FINANCE_API_KEY_2 || 'demo-key-2',
  ],
  config: {
    baseURL: 'https://www.googleapis.com/finance/v1',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    headers: {
      'User-Agent': 'MarketPulse/1.0.0 (Financial Dashboard)',
      Accept: 'application/json',
    },
  },
  endpoints: {
    quote: '/quotes/{symbol}',
    historical: '/historical/{symbol}',
    search: '/search',
    news: '/news',
  },
  cacheTTL: {
    quote: 60,
    historical: 3600,
    search: 86400,
    news: 900,
  },
};

export const API_SOURCES = {
  YAHOO_FINANCE: YAHOO_FINANCE_CONFIG,
  GOOGLE_FINANCE: GOOGLE_FINANCE_CONFIG,
} as const;

export type ApiSourceName = keyof typeof API_SOURCES;
