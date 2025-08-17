/**
 * Validation schemas and utilities for MarketPulse application
 * Uses Zod for runtime type validation and data transformation
 */

import { z } from 'zod';

// =============================================================================
// User Validation Schemas
// =============================================================================

/**
 * User preferences validation schema
 */
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultDashboard: z.string().uuid().optional(),
  refreshInterval: z.number().min(1000).max(300000).default(60000),
  notifications: z
    .object({
      priceAlerts: z.boolean().default(true),
      newsUpdates: z.boolean().default(true),
      systemMessages: z.boolean().default(true),
      emailNotifications: z.boolean().default(false),
      pushNotifications: z.boolean().default(false),
      priceAlertThresholds: z
        .object({
          percentageThreshold: z.number().min(0).max(100).default(5),
          priceThreshold: z.number().min(0).default(1),
          volumeThreshold: z.number().min(0).default(1000000),
          maxAlertsPerHour: z.number().min(1).max(100).default(10),
        })
        .default({
          percentageThreshold: 5,
          priceThreshold: 1,
          volumeThreshold: 1000000,
          maxAlertsPerHour: 10,
        }),
    })
    .default({
      priceAlerts: true,
      newsUpdates: true,
      systemMessages: true,
      emailNotifications: false,
      pushNotifications: false,
      priceAlertThresholds: {
        percentageThreshold: 5,
        priceThreshold: 1,
        volumeThreshold: 1000000,
        maxAlertsPerHour: 10,
      },
    }),
  accessibility: z
    .object({
      highContrast: z.boolean().default(false),
      reducedMotion: z.boolean().default(false),
      screenReaderOptimized: z.boolean().default(false),
      fontSize: z
        .enum(['small', 'medium', 'large', 'extra-large'])
        .default('medium'),
      keyboardNavigation: z.boolean().default(false),
      enhancedFocus: z.boolean().default(false),
    })
    .default({
      highContrast: false,
      reducedMotion: false,
      screenReaderOptimized: false,
      fontSize: 'medium',
      keyboardNavigation: false,
      enhancedFocus: false,
    }),
  display: z
    .object({
      numberFormat: z
        .object({
          locale: z.string().default('en-US'),
          thousandsSeparator: z.enum([',', '.', ' ']).default(','),
          decimalSeparator: z.enum(['.', ',']).default('.'),
        })
        .default({
          locale: 'en-US',
          thousandsSeparator: ',',
          decimalSeparator: '.',
        }),
      dateFormat: z
        .enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'relative'])
        .default('MM/DD/YYYY'),
      timezone: z.string().default('America/New_York'),
      currency: z.string().length(3).default('USD'),
      priceDecimalPlaces: z.number().min(0).max(8).default(2),
      showPercentageChanges: z.boolean().default(true),
      compactNumbers: z.boolean().default(true),
    })
    .default({
      numberFormat: {
        locale: 'en-US',
        thousandsSeparator: ',',
        decimalSeparator: '.',
      },
      dateFormat: 'MM/DD/YYYY',
      timezone: 'America/New_York',
      currency: 'USD',
      priceDecimalPlaces: 2,
      showPercentageChanges: true,
      compactNumbers: true,
    }),
  trading: z
    .object({
      defaultTimeframe: z.string().default('1d'),
      defaultIndicators: z.array(z.string()).default(['sma', 'volume']),
      chartType: z.enum(['line', 'candlestick', 'bar', 'area']).default('line'),
      showExtendedHours: z.boolean().default(false),
      defaultWatchlist: z.string().uuid().optional(),
    })
    .default({
      defaultTimeframe: '1d',
      defaultIndicators: ['sma', 'volume'],
      chartType: 'line',
      showExtendedHours: false,
    }),
});

/**
 * User registration validation schema
 */
export const UserRegistrationSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
    displayName: z.string().min(1).max(100).optional(),
    acceptTerms: z
      .boolean()
      .refine(val => val === true, 'Must accept terms of service'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * User login validation schema
 */
export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * Password change validation schema
 */
export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// =============================================================================
// Dashboard Validation Schemas
// =============================================================================

/**
 * Widget position validation schema
 */
export const WidgetPositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1).max(12),
  h: z.number().min(1).max(20),
  z: z.number().optional(),
});

/**
 * Widget size validation schema
 */
export const WidgetSizeSchema = z.object({
  minW: z.number().min(1),
  minH: z.number().min(1),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
  resizable: z.boolean().default(true),
  maintainAspectRatio: z.boolean().optional(),
});

/**
 * Widget configuration validation schema
 */
export const WidgetConfigSchema = z.object({
  assets: z.array(z.string()).optional(),
  timeframe: z
    .enum([
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
    ])
    .optional(),
  indicators: z.array(z.string()).optional(),
  displayMode: z
    .enum([
      'list',
      'grid',
      'table',
      'chart',
      'card',
      'compact',
      'detailed',
      'minimal',
    ])
    .optional(),
  refreshInterval: z.number().min(1000).max(300000).optional(),
  customSettings: z.record(z.string(), z.any()).optional(),
  dataSources: z
    .array(
      z.object({
        source: z.string(),
        priority: z.number().min(1),
        fallback: z.boolean(),
      })
    )
    .optional(),
  filters: z
    .object({
      marketCap: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          categories: z
            .array(z.enum(['micro', 'small', 'mid', 'large', 'mega']))
            .optional(),
        })
        .optional(),
      priceRange: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional(),
      volume: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          avgVolumeMultiplier: z.number().optional(),
        })
        .optional(),
      sectors: z.array(z.string()).optional(),
      exchanges: z.array(z.string()).optional(),
      countries: z.array(z.string()).optional(),
      custom: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  styling: z
    .object({
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).optional(),
      borderRadius: z.number().min(0).optional(),
      padding: z.number().min(0).optional(),
      fontSize: z.enum(['small', 'medium', 'large']).optional(),
      customClasses: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Widget validation schema
 */
export const WidgetSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'asset-list',
    'asset-grid',
    'price-chart',
    'news-feed',
    'market-summary',
    'watchlist',
    'portfolio',
    'economic-calendar',
    'heatmap',
    'screener',
    'alerts',
    'performance',
    'custom',
  ]),
  title: z.string().min(1).max(100),
  config: WidgetConfigSchema,
  position: WidgetPositionSchema,
  size: WidgetSizeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  isVisible: z.boolean().default(true),
  isLoading: z.boolean().optional(),
  error: z.string().optional(),
});

/**
 * Layout configuration validation schema
 */
export const LayoutConfigSchema = z.object({
  columns: z.number().min(1).max(12).default(4),
  rows: z.number().min(1).max(20).default(6),
  gap: z.number().min(0).max(50).default(16),
  responsive: z.object({
    mobile: z.object({
      columns: z.number().min(1).max(4).default(1),
      rows: z.number().min(1).max(20).default(10),
      gap: z.number().min(0).max(50).default(8),
      resizable: z.boolean().default(false),
      draggable: z.boolean().default(false),
    }),
    tablet: z.object({
      columns: z.number().min(1).max(6).default(2),
      rows: z.number().min(1).max(20).default(8),
      gap: z.number().min(0).max(50).default(12),
      resizable: z.boolean().default(true),
      draggable: z.boolean().default(true),
    }),
    desktop: z.object({
      columns: z.number().min(1).max(12).default(4),
      rows: z.number().min(1).max(20).default(6),
      gap: z.number().min(0).max(50).default(16),
      resizable: z.boolean().default(true),
      draggable: z.boolean().default(true),
    }),
    ultrawide: z.object({
      columns: z.number().min(1).max(12).default(6),
      rows: z.number().min(1).max(20).default(4),
      gap: z.number().min(0).max(50).default(20),
      resizable: z.boolean().default(true),
      draggable: z.boolean().default(true),
    }),
  }),
  autoArrange: z.boolean().default(false),
  minWidgetSize: z.object({
    width: z.number().min(1),
    height: z.number().min(1),
  }),
  maxWidgetSize: z.object({
    width: z.number().min(1),
    height: z.number().min(1),
  }),
});

/**
 * Dashboard validation schema
 */
export const DashboardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  ownerId: z.string().uuid(),
  widgets: z.array(WidgetSchema).default([]),
  layout: LayoutConfigSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()).default([]),
  sharing: z
    .object({
      enabled: z.boolean().default(false),
      permissions: z
        .array(
          z.object({
            userId: z.string().uuid(),
            permission: z.enum(['view', 'edit', 'admin']),
            grantedAt: z.date(),
            grantedBy: z.string().uuid(),
          })
        )
        .default([]),
      publicLink: z.string().optional(),
      expiresAt: z.date().optional(),
      requireAuth: z.boolean().default(true),
    })
    .default({
      enabled: false,
      permissions: [],
      requireAuth: true,
    }),
  theme: z
    .object({
      primaryColor: z.string(),
      secondaryColor: z.string(),
      backgroundColor: z.string(),
      textColor: z.string(),
      widgetBackground: z.string(),
      borderColor: z.string(),
      customVariables: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

// =============================================================================
// Asset and Market Data Validation Schemas
// =============================================================================

/**
 * Asset validation schema
 */
export const AssetSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9.-]+$/, 'Invalid symbol format'),
  name: z.string().min(1).max(200),
  price: z.number().positive('Price must be positive'),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().nonnegative('Volume cannot be negative'),
  marketCap: z.number().positive().optional(),
  dayHigh: z.number().positive().optional(),
  dayLow: z.number().positive().optional(),
  yearHigh: z.number().positive().optional(),
  yearLow: z.number().positive().optional(),
  previousClose: z.number().positive().optional(),
  openPrice: z.number().positive().optional(),
  avgVolume: z.number().nonnegative().optional(),
  peRatio: z.number().optional(),
  dividendYield: z.number().min(0).max(100).optional(),
  eps: z.number().optional(),
  lastUpdated: z.date(),
  source: z.enum([
    'yahoo',
    'google',
    'alpha-vantage',
    'iex',
    'finnhub',
    'cache',
    'manual',
  ]),
  currency: z.string().length(3).default('USD'),
  exchange: z.string().min(1).max(50),
  type: z.enum([
    'stock',
    'etf',
    'mutual-fund',
    'index',
    'crypto',
    'forex',
    'commodity',
    'bond',
    'option',
    'future',
  ]),
  sector: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  isMarketOpen: z.boolean(),
  extendedHours: z
    .object({
      preMarketPrice: z.number().positive().optional(),
      preMarketChange: z.number().optional(),
      preMarketChangePercent: z.number().optional(),
      afterHoursPrice: z.number().positive().optional(),
      afterHoursChange: z.number().optional(),
      afterHoursChangePercent: z.number().optional(),
      lastUpdated: z.date(),
    })
    .optional(),
});

/**
 * Price point validation schema
 */
export const PricePointSchema = z.object({
  timestamp: z.date(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  adjustedClose: z.number().positive().optional(),
});

/**
 * Historical data validation schema
 */
export const HistoricalDataSchema = z.object({
  symbol: z.string().min(1).max(10),
  timeframe: z.string(),
  data: z.array(PricePointSchema),
  indicators: z.record(z.string(), z.array(z.any())).optional(),
  source: z.enum([
    'yahoo',
    'google',
    'alpha-vantage',
    'iex',
    'finnhub',
    'cache',
    'manual',
  ]),
  lastUpdated: z.date(),
});

// =============================================================================
// News Validation Schemas
// =============================================================================

/**
 * News article validation schema
 */
export const NewsArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().min(1).max(2000),
  content: z.string().optional(),
  url: z.string().url(),
  publishedAt: z.date(),
  source: z.object({
    id: z.string(),
    name: z.string().min(1).max(100),
    url: z.string().url(),
    logoUrl: z.string().url().optional(),
    reliability: z.number().min(0).max(100),
    bias: z
      .enum(['left', 'center-left', 'center', 'center-right', 'right'])
      .optional(),
    category: z.enum([
      'financial',
      'business',
      'technology',
      'general',
      'wire-service',
      'blog',
      'social-media',
      'government',
      'research',
    ]),
    country: z.string().length(2),
    language: z.string().length(2),
    isVerified: z.boolean(),
    rssUrl: z.string().url().optional(),
  }),
  author: z.string().max(200).optional(),
  relatedAssets: z.array(z.string()).default([]),
  sentiment: z
    .object({
      score: z.number().min(-1).max(1),
      confidence: z.number().min(0).max(1),
      label: z.enum([
        'very-negative',
        'negative',
        'neutral',
        'positive',
        'very-positive',
      ]),
      breakdown: z
        .object({
          positive: z.number().min(0).max(1),
          negative: z.number().min(0).max(1),
          neutral: z.number().min(0).max(1),
          keyPhrases: z.array(z.string()),
          emotions: z
            .object({
              joy: z.number().min(0).max(1),
              fear: z.number().min(0).max(1),
              anger: z.number().min(0).max(1),
              sadness: z.number().min(0).max(1),
              surprise: z.number().min(0).max(1),
              disgust: z.number().min(0).max(1),
            })
            .optional(),
        })
        .optional(),
      provider: z.string(),
      analyzedAt: z.date(),
    })
    .optional(),
  category: z.enum([
    'market-news',
    'earnings',
    'economic-data',
    'company-news',
    'analysis',
    'breaking-news',
    'mergers-acquisitions',
    'ipo',
    'dividends',
    'regulatory',
    'technology',
    'crypto',
    'commodities',
    'forex',
    'bonds',
    'real-estate',
    'energy',
    'healthcare',
    'consumer',
    'industrial',
    'financial-services',
  ]),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  language: z.string().length(2).default('en'),
  readingTime: z.number().min(0).optional(),
  engagement: z
    .object({
      views: z.number().nonnegative(),
      shares: z.number().nonnegative(),
      comments: z.number().nonnegative(),
      likes: z.number().nonnegative(),
      clickThroughRate: z.number().min(0).max(1).optional(),
      avgTimeSpent: z.number().min(0).optional(),
      bounceRate: z.number().min(0).max(1).optional(),
    })
    .optional(),
  isBreaking: z.boolean().default(false),
  priority: z.number().min(0).max(100).default(50),
  lastUpdated: z.date(),
});

// =============================================================================
// API Request/Response Validation Schemas
// =============================================================================

/**
 * Pagination parameters validation schema
 */
export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

/**
 * Time range parameters validation schema
 */
export const TimeRangeParamsSchema = z.object({
  startDate: z.union([z.string().datetime(), z.number()]).optional(),
  endDate: z.union([z.string().datetime(), z.number()]).optional(),
  timeRange: z
    .enum(['1h', '1d', '1w', '1m', '3m', '6m', '1y', 'all'])
    .optional(),
});

/**
 * Asset search parameters validation schema
 */
export const AssetSearchParamsSchema = z
  .object({
    query: z.string().min(1).optional(),
    types: z
      .array(
        z.enum([
          'stock',
          'etf',
          'mutual-fund',
          'index',
          'crypto',
          'forex',
          'commodity',
          'bond',
          'option',
          'future',
        ])
      )
      .optional(),
    exchanges: z.array(z.string()).optional(),
    sectors: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    countries: z.array(z.string().length(2)).optional(),
    priceRange: z
      .object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
      })
      .optional(),
    marketCapRange: z
      .object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
      })
      .optional(),
    volumeRange: z
      .object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
      })
      .optional(),
    peRatioRange: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional(),
  })
  .merge(PaginationParamsSchema);

/**
 * News search parameters validation schema
 */
export const NewsSearchParamsSchema = z
  .object({
    sources: z.array(z.string()).optional(),
    categories: z
      .array(
        z.enum([
          'market-news',
          'earnings',
          'economic-data',
          'company-news',
          'analysis',
          'breaking-news',
          'mergers-acquisitions',
          'ipo',
          'dividends',
          'regulatory',
          'technology',
          'crypto',
          'commodities',
          'forex',
          'bonds',
          'real-estate',
          'energy',
          'healthcare',
          'consumer',
          'industrial',
          'financial-services',
        ])
      )
      .optional(),
    assets: z.array(z.string()).optional(),
    sentiment: z
      .array(
        z.enum([
          'very-negative',
          'negative',
          'neutral',
          'positive',
          'very-positive',
        ])
      )
      .optional(),
    languages: z.array(z.string().length(2)).optional(),
    breakingOnly: z.boolean().optional(),
    minReliability: z.number().min(0).max(100).optional(),
    keywords: z.array(z.string()).optional(),
    excludeKeywords: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
    countries: z.array(z.string().length(2)).optional(),
  })
  .merge(PaginationParamsSchema)
  .merge(TimeRangeParamsSchema);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate and transform data using a Zod schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Create validation middleware for Express routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>
): (
  req: Record<string, unknown>,
  res: Record<string, unknown>,
  next: () => void
) => void {
  return (
    req: Record<string, unknown>,
    res: Record<string, unknown>,
    next: () => void
  ): void => {
    const result = validateData(schema, req.body);
    if (!result.success) {
      const statusMethod = res.status as (code: number) => {
        json: (data: unknown) => void;
      };
      return statusMethod(400).json({
        success: false,
        error: 'Validation failed',
        details: result.errors.issues.map(err => ({
          field: Array.isArray(err.path)
            ? err.path.join('.')
            : String(err.path),
          message: err.message,
          code: err.code,
        })),
      });
    }
    req.validatedData = result.data;
    next();
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password should contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password should contain uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Password should contain numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Password should contain special characters');

  return {
    isValid: score >= 4,
    score,
    feedback,
  };
}

/**
 * Validate asset symbol format
 */
export function isValidAssetSymbol(symbol: string): boolean {
  const symbolRegex = /^[A-Z0-9.-]{1,10}$/;
  return symbolRegex.test(symbol);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
