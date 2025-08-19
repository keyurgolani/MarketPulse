/**
 * Basic type definition tests for MarketPulse application
 * Tests type safety and validation schemas that are currently implemented
 */

import { describe, it, expect } from 'vitest';

// Import validation schemas and utilities
import {
  UserPreferencesSchema,
  UserRegistrationSchema,
  AssetSchema,
  validateData,
  sanitizeString,
  isValidEmail,
  validatePasswordStrength,
  isValidAssetSymbol,
  isValidUrl,
} from '../utils/validation';

// Import types and enums
import type { ApiResponse, PaginatedResponse, ErrorResponse } from '../types';

import {
  SortOrder,
  Theme,
  UserRole,
  AssetType,
  WidgetType,
  NewsCategory,
  ErrorSeverity,
  ErrorCategory,
} from '../types';

// Import utility functions
import {
  isUUID,
  isISODateString,
  isTimestamp,
  createId,
  createTimestamp,
  createISODateString,
  sleep,
  debounce,
  throttle,
  pick,
  omit,
  deepClone,
  isEqual,
  groupBy,
  sortBy,
  chunk,
  unique,
  flatten,
  range,
  clamp,
  round,
  formatBytes,
  formatDuration,
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  truncate,
  escapeHtml,
  unescapeHtml,
  isClient,
  isServer,
  isDevelopment,
  isProduction,
  isTest,
  PerformanceTimer,
  measurePerformance,
  measureAsyncPerformance,
} from '../types';

// =============================================================================
// Type Tests
// =============================================================================

describe('Type System', () => {
  describe('Basic Types', () => {
    it('should create valid API response', () => {
      const response: ApiResponse<string> = {
        data: 'test data',
        success: true,
        timestamp: Date.now(),
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('test data');
      expect(typeof response.timestamp).toBe('number');
    });

    it('should create API response with error', () => {
      const response: ApiResponse<null> = {
        data: null,
        success: false,
        error: 'Something went wrong',
        timestamp: Date.now(),
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });

    it('should create valid paginated response', () => {
      const response: PaginatedResponse<string> = {
        data: ['item1', 'item2'],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        success: true,
        timestamp: Date.now(),
      };

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.total).toBe(2);
    });

    it('should create valid error response', () => {
      const response: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };

      expect(response.statusCode).toBe(400);
      expect(response.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Enums', () => {
    it('should have correct enum values', () => {
      expect(SortOrder.ASC).toBe('asc');
      expect(SortOrder.DESC).toBe('desc');

      expect(Theme.LIGHT).toBe('light');
      expect(Theme.DARK).toBe('dark');
      expect(Theme.SYSTEM).toBe('system');

      expect(UserRole.USER).toBe('user');
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.MODERATOR).toBe('moderator');

      expect(AssetType.STOCK).toBe('stock');
      expect(AssetType.CRYPTO).toBe('crypto');

      expect(WidgetType.ASSET_LIST).toBe('asset-list');
      expect(WidgetType.PRICE_CHART).toBe('price-chart');

      expect(NewsCategory.MARKET_NEWS).toBe('market-news');
      expect(NewsCategory.EARNINGS).toBe('earnings');

      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.CRITICAL).toBe('critical');

      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.NETWORK).toBe('network');
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('Type Guards', () => {
    it('should validate UUIDs', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('invalid-uuid')).toBe(false);
      expect(isUUID('')).toBe(false);
    });

    it('should validate ISO date strings', () => {
      expect(isISODateString('2023-01-01T00:00:00.000Z')).toBe(true);
      expect(isISODateString('2023-01-01T00:00:00Z')).toBe(true);
      expect(isISODateString('invalid-date')).toBe(false);
      expect(isISODateString('')).toBe(false);
    });

    it('should validate timestamps', () => {
      expect(isTimestamp(Date.now())).toBe(true);
      expect(isTimestamp(1640995200000)).toBe(true);
      expect(isTimestamp(-1)).toBe(false);
      expect(isTimestamp(0)).toBe(false);
      expect(isTimestamp(1.5)).toBe(false);
    });
  });

  describe('ID and Time Generation', () => {
    it('should create valid UUIDs', () => {
      const id = createId();
      expect(typeof id).toBe('string');
      expect(isUUID(id)).toBe(true);
    });

    it('should create valid timestamps', () => {
      const timestamp = createTimestamp();
      expect(typeof timestamp).toBe('number');
      expect(isTimestamp(timestamp)).toBe(true);
    });

    it('should create valid ISO date strings', () => {
      const isoString = createISODateString();
      expect(typeof isoString).toBe('string');
      expect(isISODateString(isoString)).toBe(true);
    });
  });

  describe('Array Utilities', () => {
    it('should pick properties from objects', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const picked = pick(obj, ['a', 'c']);
      expect(picked).toEqual({ a: 1, c: 3 });
    });

    it('should omit properties from objects', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const omitted = omit(obj, ['b']);
      expect(omitted).toEqual({ a: 1, c: 3 });
    });

    it('should deep clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should check equality', () => {
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(isEqual([1, 2], [1, 2])).toBe(true);
      expect(isEqual([1, 2], [2, 1])).toBe(false);
    });

    it('should group by key function', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const grouped = groupBy(items, item => item.type);
      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });

    it('should sort by key function', () => {
      const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const sorted = sortBy(items, item => item.value);
      expect(sorted.map(item => item.value)).toEqual([1, 2, 3]);
    });

    it('should chunk arrays', () => {
      const items = [1, 2, 3, 4, 5];
      const chunked = chunk(items, 2);
      expect(chunked).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should get unique items', () => {
      const items = [1, 2, 2, 3, 3, 3];
      const uniqueItems = unique(items);
      expect(uniqueItems).toEqual([1, 2, 3]);
    });

    it('should flatten arrays', () => {
      const nested = [1, [2, 3], [4, [5, 6]]];
      const flattened = flatten(nested);
      expect(flattened).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should create ranges', () => {
      expect(range(3)).toEqual([0, 1, 2]);
      expect(range(1, 4)).toEqual([1, 2, 3]);
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
    });
  });

  describe('Number Utilities', () => {
    it('should clamp values', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should round numbers', () => {
      expect(round(3.14159, 2)).toBe(3.14);
      expect(round(3.14159, 0)).toBe(3);
      expect(round(3.14159, 4)).toBe(3.1416);
    });

    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format duration', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(86400000)).toBe('1d 0h');
    });
  });

  describe('String Utilities', () => {
    it('should capitalize strings', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should convert to camelCase', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
      expect(camelCase('Hello World')).toBe('helloWorld');
      expect(camelCase('hello-world')).toBe('helloWorld');
    });

    it('should convert to kebab-case', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world');
      expect(kebabCase('Hello World')).toBe('hello-world');
      expect(kebabCase('hello_world')).toBe('hello-world');
    });

    it('should convert to snake_case', () => {
      expect(snakeCase('helloWorld')).toBe('hello_world');
      expect(snakeCase('Hello World')).toBe('hello_world');
      expect(snakeCase('hello-world')).toBe('hello_world');
    });

    it('should truncate strings', () => {
      expect(truncate('hello world', 5)).toBe('he...');
      expect(truncate('hello', 10)).toBe('hello');
      expect(truncate('hello world', 5, '***')).toBe('he***');
    });

    it('should escape HTML', () => {
      const escaped = escapeHtml('<script>alert("xss")</script>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });

    it('should unescape HTML', () => {
      const unescaped = unescapeHtml('&lt;div&gt;Hello&lt;/div&gt;');
      expect(unescaped).toBe('<div>Hello</div>');
    });
  });

  describe('Performance Utilities', () => {
    it('should measure performance', () => {
      const result = measurePerformance(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result.result).toBe(499500);
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should measure async performance', async () => {
      const result = await measureAsyncPerformance(async () => {
        await sleep(10);
        return 'done';
      });

      expect(result.result).toBe('done');
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(8); // Allow for timing precision variations
    });

    it('should work with PerformanceTimer', () => {
      const timer = new PerformanceTimer();
      const duration = timer.stop();

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Environment Detection', () => {
    it('should detect environment correctly', () => {
      expect(typeof isClient).toBe('boolean');
      expect(typeof isServer).toBe('boolean');
      expect(typeof isDevelopment).toBe('boolean');
      expect(typeof isProduction).toBe('boolean');
      expect(typeof isTest).toBe('boolean');

      // In test environment
      expect(isTest).toBe(true);
      expect(isProduction).toBe(false);
    });
  });

  describe('Async Utilities', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(50);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });

    it('should debounce function calls', async () => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 50);

      // Call multiple times quickly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should only be called once after delay
      await sleep(100);
      expect(callCount).toBe(1);
    });

    it('should throttle function calls', async () => {
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 50);

      // Call multiple times quickly
      throttledFn();
      throttledFn();
      throttledFn();

      // Should only be called once immediately
      expect(callCount).toBe(1);

      await sleep(100);
      throttledFn();
      expect(callCount).toBe(2);
    });
  });
});

// =============================================================================
// Validation Schema Tests
// =============================================================================

describe('Validation Schemas', () => {
  describe('User validation', () => {
    it('should validate user preferences', () => {
      const validPreferences = {
        theme: 'dark',
        refreshInterval: 60000,
        notifications: {
          priceAlerts: true,
          newsUpdates: false,
        },
      };

      const result = validateData(UserPreferencesSchema, validPreferences);
      expect(result.success).toBe(true);
    });

    it('should validate user registration', () => {
      const validRegistration = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        acceptTerms: true,
      };

      const result = validateData(UserRegistrationSchema, validRegistration);
      expect(result.success).toBe(true);
    });

    it('should reject invalid registration', () => {
      const invalidRegistration = {
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
        acceptTerms: false,
      };

      const result = validateData(UserRegistrationSchema, invalidRegistration);
      expect(result.success).toBe(false);
    });
  });

  describe('Asset validation', () => {
    it('should validate asset data', () => {
      const validAsset = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        lastUpdated: new Date(),
        source: 'yahoo',
        currency: 'USD',
        exchange: 'NASDAQ',
        type: 'stock',
        isMarketOpen: true,
      };

      const result = validateData(AssetSchema, validAsset);
      expect(result.success).toBe(true);
    });

    it('should reject invalid asset data', () => {
      const invalidAsset = {
        symbol: '', // Empty symbol
        price: -100, // Negative price
        volume: -1000, // Negative volume
      };

      const result = validateData(AssetSchema, invalidAsset);
      expect(result.success).toBe(false);
    });
  });

  describe('Utility validation functions', () => {
    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should validate password strength', () => {
      const strongPassword = validatePasswordStrength('StrongPass123!');
      const weakPassword = validatePasswordStrength('weak');

      expect(strongPassword.isValid).toBe(true);
      expect(strongPassword.score).toBeGreaterThan(3);

      expect(weakPassword.isValid).toBe(false);
      expect(weakPassword.feedback.length).toBeGreaterThan(0);
    });

    it('should validate asset symbols', () => {
      expect(isValidAssetSymbol('AAPL')).toBe(true);
      expect(isValidAssetSymbol('BRK.A')).toBe(true);
      expect(isValidAssetSymbol('invalid symbol')).toBe(false);
      expect(isValidAssetSymbol('')).toBe(false);
    });

    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://test.org/path')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('should sanitize strings', () => {
      const maliciousInput = '<script>alert("xss")</script>test';
      const sanitized = sanitizeString(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('test');
    });
  });
});
