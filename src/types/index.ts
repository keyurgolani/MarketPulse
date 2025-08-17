/**
 * Main types export file for MarketPulse application
 * Provides centralized access to all type definitions
 */

// API types
export * from './api';
export * from './api-contracts';

// Core domain types
export * from './user';
export * from './dashboard';
export * from './widget';
export * from './market';
export * from './news';

// Error handling types
export * from './errors';

// Re-export validation utilities
export * from '../utils/validation';

// Type utilities
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

// Common ID types
export type UUID = string;
export type Timestamp = number;
export type ISODateString = string;

// Common enums as const objects
export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AssetType = {
  STOCK: 'stock',
  ETF: 'etf',
  MUTUAL_FUND: 'mutual-fund',
  INDEX: 'index',
  CRYPTO: 'crypto',
  FOREX: 'forex',
  COMMODITY: 'commodity',
  BOND: 'bond',
  OPTION: 'option',
  FUTURE: 'future',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const WidgetType = {
  ASSET_LIST: 'asset-list',
  ASSET_GRID: 'asset-grid',
  PRICE_CHART: 'price-chart',
  NEWS_FEED: 'news-feed',
  MARKET_SUMMARY: 'market-summary',
  WATCHLIST: 'watchlist',
  PORTFOLIO: 'portfolio',
  ECONOMIC_CALENDAR: 'economic-calendar',
  HEATMAP: 'heatmap',
  SCREENER: 'screener',
  ALERTS: 'alerts',
  PERFORMANCE: 'performance',
  CUSTOM: 'custom',
} as const;
export type WidgetType = (typeof WidgetType)[keyof typeof WidgetType];

export const NewsCategory = {
  MARKET_NEWS: 'market-news',
  EARNINGS: 'earnings',
  ECONOMIC_DATA: 'economic-data',
  COMPANY_NEWS: 'company-news',
  ANALYSIS: 'analysis',
  BREAKING_NEWS: 'breaking-news',
  MERGERS_ACQUISITIONS: 'mergers-acquisitions',
  IPO: 'ipo',
  DIVIDENDS: 'dividends',
  REGULATORY: 'regulatory',
  TECHNOLOGY: 'technology',
  CRYPTO: 'crypto',
  COMMODITIES: 'commodities',
  FOREX: 'forex',
  BONDS: 'bonds',
  REAL_ESTATE: 'real-estate',
  ENERGY: 'energy',
  HEALTHCARE: 'healthcare',
  CONSUMER: 'consumer',
  INDUSTRIAL: 'industrial',
  FINANCIAL_SERVICES: 'financial-services',
} as const;
export type NewsCategory = (typeof NewsCategory)[keyof typeof NewsCategory];

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

export const ErrorCategory = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  API: 'api',
  DATABASE: 'database',
  CACHE: 'cache',
  EXTERNAL_SERVICE: 'external-service',
  RATE_LIMIT: 'rate-limit',
  TIMEOUT: 'timeout',
  CONFIGURATION: 'configuration',
  BUSINESS_LOGIC: 'business-logic',
  SYSTEM: 'system',
  USER_INPUT: 'user-input',
  DATA_INTEGRITY: 'data-integrity',
  SECURITY: 'security',
} as const;
export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

// Constants
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute
export const MAX_REFRESH_INTERVAL = 300000; // 5 minutes
export const MIN_REFRESH_INTERVAL = 1000; // 1 second

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
] as const;
export const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ja',
  'ko',
  'zh',
] as const;
export const SUPPORTED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
] as const;

export const CHART_TIMEFRAMES = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '1d',
  '1w',
  '1M',
  '3M',
  '6M',
  '1y',
  '2y',
  '5y',
  'max',
] as const;

export const TECHNICAL_INDICATORS = [
  'sma',
  'ema',
  'rsi',
  'macd',
  'bollinger',
  'stochastic',
  'williams',
  'cci',
  'momentum',
  'volume',
  'vwap',
  'fibonacci',
] as const;

// Type guards
export function isUUID(value: string): value is UUID {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isISODateString(value: string): value is ISODateString {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoDateRegex.test(value) && !isNaN(Date.parse(value));
}

export function isTimestamp(value: number): value is Timestamp {
  return Number.isInteger(value) && value > 0;
}

// Utility functions
export function createId(): UUID {
  // Use globalThis.crypto for cross-environment compatibility
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    globalThis.crypto.randomUUID
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createTimestamp(): Timestamp {
  return Date.now();
}

export function createISODateString(date?: Date): ISODateString {
  return (date || new Date()).toISOString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }

  const cloned = {} as T;
  Object.keys(obj).forEach(key => {
    (cloned as Record<string, unknown>)[key] = deepClone(
      (obj as Record<string, unknown>)[key]
    );
  });

  return cloned;
}

export function isEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;

  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object'
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(
    key =>
      keysB.includes(key) &&
      isEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
  );
}

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<K, T[]>
  );
}

export function sortBy<T, K extends string | number | Date>(
  array: T[],
  keyFn: (item: T) => K,
  order: SortOrder = SortOrder.ASC
): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);

    if (aVal < bVal) return order === SortOrder.ASC ? -1 : 1;
    if (aVal > bVal) return order === SortOrder.ASC ? 1 : -1;
    return 0;
  });
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[], keyFn?: (item: T) => unknown): T[] {
  if (!keyFn) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((acc, val) => {
    return acc.concat(Array.isArray(val) ? flatten(val) : val);
  }, []);
}

export function range(start: number, end?: number, step = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }

  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/[\s-_]+/g, '');
}

export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function unescapeHtml(str: string): string {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
}

// Environment detection
export const isClient = typeof window !== 'undefined';
export const isServer = !isClient;
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Browser detection (client-side only)
export const getBrowserInfo = (): { name: string; version: string } | null => {
  if (!isClient) return null;

  const userAgent = navigator.userAgent;

  // Detect browser name and version
  let name = 'Unknown';
  let version = 'Unknown';

  if (/Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor)) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (/Firefox/.test(userAgent)) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (
    /Safari/.test(userAgent) &&
    /Apple Computer/.test(navigator.vendor)
  ) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (/Edg/.test(userAgent)) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (/OPR/.test(userAgent)) {
    name = 'Opera';
    const match = userAgent.match(/OPR\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }

  return { name, version };
};

// Performance utilities
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.getDuration();
  }

  getDuration(): number {
    const end = this.endTime || performance.now();
    return end - this.startTime;
  }

  reset(): void {
    this.startTime = performance.now();
    this.endTime = undefined;
  }
}

export function measurePerformance<T>(
  fn: () => T,
  label?: string
): { result: T; duration: number } {
  const timer = new PerformanceTimer();
  const result = fn();
  const duration = timer.stop();

  if (label && isDevelopment) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

export async function measureAsyncPerformance<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const timer = new PerformanceTimer();
  const result = await fn();
  const duration = timer.stop();

  if (label && isDevelopment) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}
