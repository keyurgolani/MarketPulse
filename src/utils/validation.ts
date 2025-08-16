/**
 * Validation schemas using Zod for MarketPulse application
 * Provides runtime type validation and data sanitization
 */

import { z } from 'zod';

// =============================================================================
// UTILITY SCHEMAS
// =============================================================================

/**
 * Common validation patterns
 */
export const CommonSchemas = {
  /** UUID validation */
  uuid: z.string().uuid(),

  /** Email validation */
  email: z.string().email().toLowerCase(),

  /** URL validation */
  url: z.string().url(),

  /** Non-empty string */
  nonEmptyString: z.string().min(1).trim(),

  /** Positive number */
  positiveNumber: z.number().positive(),

  /** Non-negative number */
  nonNegativeNumber: z.number().nonnegative(),

  /** Percentage (0-100) */
  percentage: z.number().min(0).max(100),

  /** Date string or Date object */
  dateInput: z
    .union([z.string().datetime(), z.date()])
    .transform(val => (typeof val === 'string' ? new Date(val) : val)),

  /** Stock symbol (1-10 uppercase letters) */
  stockSymbol: z.string().regex(/^[A-Z]{1,10}$/, 'Invalid stock symbol format'),

  /** Currency code (3 uppercase letters) */
  currencyCode: z.string().regex(/^[A-Z]{3}$/, 'Invalid currency code'),

  /** Timezone string */
  timezone: z.string().min(1),

  /** Color hex code */
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),

  /** Phone number (basic validation) */
  phoneNumber: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number'),
};

// =============================================================================
// USER SCHEMAS
// =============================================================================

/**
 * User role validation
 */
export const UserRoleSchema = z.enum(['user', 'admin', 'moderator']);

/**
 * Theme preference validation
 */
export const ThemePreferenceSchema = z.enum(['light', 'dark', 'system']);

/**
 * Font size validation
 */
export const FontSizeSchema = z.enum([
  'small',
  'medium',
  'large',
  'extra-large',
]);

/**
 * Date format validation
 */
export const DateFormatSchema = z.enum([
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'relative',
]);

/**
 * Time format validation
 */
export const TimeFormatSchema = z.enum(['12h', '24h']);

/**
 * Notification frequency validation
 */
export const NotificationFrequencySchema = z.enum([
  'immediate',
  'hourly',
  'daily',
  'weekly',
]);

/**
 * Quiet hours validation
 */
export const QuietHoursSchema = z.object({
  enabled: z.boolean().default(false),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  timezone: CommonSchemas.nonEmptyString,
});

/**
 * Notification settings validation
 */
export const NotificationSettingsSchema = z.object({
  priceAlerts: z.boolean().default(true),
  newsUpdates: z.boolean().default(true),
  systemMessages: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  soundNotifications: z.boolean().default(false),
  frequency: NotificationFrequencySchema.default('immediate'),
  quietHours: QuietHoursSchema.optional(),
});

/**
 * Accessibility settings validation
 */
export const AccessibilitySettingsSchema = z.object({
  highContrast: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  screenReaderOptimized: z.boolean().default(false),
  fontSize: FontSizeSchema.default('medium'),
  keyboardNavigation: z.boolean().default(true),
  enhancedFocus: z.boolean().default(false),
  colorBlindFriendly: z.boolean().default(false),
});

/**
 * Display settings validation
 */
export const DisplaySettingsSchema = z.object({
  currency: CommonSchemas.currencyCode.default('USD'),
  locale: CommonSchemas.nonEmptyString.default('en-US'),
  timezone: CommonSchemas.timezone.default('UTC'),
  dateFormat: DateFormatSchema.default('MM/DD/YYYY'),
  timeFormat: TimeFormatSchema.default('12h'),
  priceDecimalPlaces: z.number().int().min(0).max(8).default(2),
  showPercentageChanges: z.boolean().default(true),
  compactNumbers: z.boolean().default(false),
});

/**
 * Trading settings validation
 */
export const TradingSettingsSchema = z.object({
  defaultTimeframe: z.string().default('1d'),
  defaultIndicators: z.array(z.string()).default([]),
  riskTolerance: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .default('moderate'),
  investmentHorizon: z
    .enum(['short-term', 'medium-term', 'long-term'])
    .default('medium-term'),
  preferredAssetClasses: z
    .array(
      z.enum([
        'stocks',
        'bonds',
        'commodities',
        'crypto',
        'forex',
        'etfs',
        'mutual-funds',
      ])
    )
    .default(['stocks']),
  paperTradingMode: z.boolean().default(false),
});

/**
 * User preferences validation
 */
export const UserPreferencesSchema = z.object({
  theme: ThemePreferenceSchema.default('system'),
  defaultDashboard: CommonSchemas.uuid.optional(),
  refreshInterval: z.number().int().min(1000).max(300000).default(60000),
  notifications: NotificationSettingsSchema.default({}),
  accessibility: AccessibilitySettingsSchema.default({}),
  display: DisplaySettingsSchema.default({}),
  trading: TradingSettingsSchema.default({}),
});

/**
 * User validation schema
 */
export const UserSchema = z.object({
  id: CommonSchemas.uuid,
  email: CommonSchemas.email,
  displayName: z.string().min(1).max(100).optional(),
  preferences: UserPreferencesSchema.default({}),
  createdAt: CommonSchemas.dateInput,
  updatedAt: CommonSchemas.dateInput,
  lastLoginAt: CommonSchemas.dateInput.optional(),
  isActive: z.boolean().default(true),
  role: UserRoleSchema.default('user'),
});

/**
 * User registration validation
 */
export const UserRegistrationSchema = z.object({
  email: CommonSchemas.email,
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'Must accept terms of service'),
  acceptPrivacy: z
    .boolean()
    .refine(val => val === true, 'Must accept privacy policy'),
  referralCode: z.string().optional(),
});

/**
 * User login validation
 */
export const UserLoginSchema = z.object({
  email: CommonSchemas.email,
  password: z.string().min(1),
});

/**
 * Password reset request validation
 */
export const PasswordResetRequestSchema = z.object({
  email: CommonSchemas.email,
});

/**
 * Password reset confirmation validation
 */
export const PasswordResetConfirmationSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// =============================================================================
// DASHBOARD SCHEMAS
// =============================================================================

/**
 * Dashboard category validation
 */
export const DashboardCategorySchema = z.enum([
  'trading',
  'investing',
  'market-overview',
  'sector-analysis',
  'crypto',
  'forex',
  'commodities',
  'news',
  'custom',
]);

/**
 * Layout margins validation
 */
export const LayoutMarginsSchema = z.object({
  top: CommonSchemas.nonNegativeNumber.default(16),
  right: CommonSchemas.nonNegativeNumber.default(16),
  bottom: CommonSchemas.nonNegativeNumber.default(16),
  left: CommonSchemas.nonNegativeNumber.default(16),
});

/**
 * Responsive breakpoint validation
 */
export const ResponsiveBreakpointSchema = z.object({
  columns: z.number().int().min(1).max(12),
  rows: z.number().int().min(1).max(20),
  gap: CommonSchemas.nonNegativeNumber,
  margins: LayoutMarginsSchema.default({}),
});

/**
 * Responsive configuration validation
 */
export const ResponsiveConfigSchema = z.object({
  mobile: ResponsiveBreakpointSchema,
  tablet: ResponsiveBreakpointSchema,
  desktop: ResponsiveBreakpointSchema,
  ultrawide: ResponsiveBreakpointSchema,
});

/**
 * Layout configuration validation
 */
export const LayoutConfigSchema = z.object({
  columns: z.number().int().min(1).max(12).default(4),
  rows: z.number().int().min(1).max(20).default(6),
  gap: CommonSchemas.nonNegativeNumber.default(16),
  responsive: ResponsiveConfigSchema,
  autoSize: z.boolean().default(true),
  minItemSize: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }),
  maxItemSize: z
    .object({
      width: z.number().int().min(1),
      height: z.number().int().min(1),
    })
    .optional(),
  margins: LayoutMarginsSchema.default({}),
});

/**
 * Sharing permissions validation
 */
export const SharingPermissionsSchema = z.object({
  canView: z.boolean().default(true),
  canEdit: z.boolean().default(false),
  canAddWidgets: z.boolean().default(false),
  canRemoveWidgets: z.boolean().default(false),
  canModifyLayout: z.boolean().default(false),
  canShare: z.boolean().default(false),
});

/**
 * Sharing settings validation
 */
export const SharingSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  shareLink: z.string().url().optional(),
  allowedUsers: z.array(CommonSchemas.uuid).default([]),
  permissions: SharingPermissionsSchema.default({}),
  expiresAt: CommonSchemas.dateInput.optional(),
  requireAuth: z.boolean().default(true),
});

/**
 * Dashboard theme validation
 */
export const DashboardThemeSchema = z.object({
  primaryColor: CommonSchemas.hexColor,
  secondaryColor: CommonSchemas.hexColor,
  backgroundColor: CommonSchemas.hexColor,
  textColor: CommonSchemas.hexColor,
  borderColor: CommonSchemas.hexColor,
  customVariables: z.record(z.string()).optional(),
});

/**
 * Dashboard creation request validation
 */
export const CreateDashboardRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  templateId: CommonSchemas.uuid.optional(),
  layout: LayoutConfigSchema.partial().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  isPublic: z.boolean().default(false),
  theme: DashboardThemeSchema.optional(),
});

/**
 * Dashboard update request validation
 */
export const UpdateDashboardRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  layout: LayoutConfigSchema.partial().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  isPublic: z.boolean().optional(),
  theme: DashboardThemeSchema.optional(),
  sharing: SharingSettingsSchema.partial().optional(),
});

// =============================================================================
// WIDGET SCHEMAS
// =============================================================================

/**
 * Widget type validation
 */
export const WidgetTypeSchema = z.enum([
  'asset-list',
  'asset-grid',
  'price-chart',
  'candlestick-chart',
  'news-feed',
  'market-summary',
  'watchlist',
  'portfolio-summary',
  'economic-calendar',
  'heatmap',
  'screener',
  'alerts',
  'performance-metrics',
  'sector-performance',
  'custom',
]);

/**
 * Chart timeframe validation
 */
export const ChartTimeframeSchema = z.enum([
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
  '1M',
  '1Y',
]);

/**
 * Technical indicator validation
 */
export const TechnicalIndicatorSchema = z.enum([
  'sma',
  'ema',
  'rsi',
  'macd',
  'bollinger',
  'stochastic',
  'williams',
  'atr',
  'volume',
]);

/**
 * Display mode validation
 */
export const DisplayModeSchema = z.enum([
  'list',
  'grid',
  'chart',
  'table',
  'cards',
  'compact',
  'detailed',
]);

/**
 * Widget position validation
 */
export const WidgetPositionSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  z: z.number().int().optional(),
});

/**
 * Widget size validation
 */
export const WidgetSizeSchema = z.object({
  minW: z.number().int().positive(),
  minH: z.number().int().positive(),
  maxW: z.number().int().positive().optional(),
  maxH: z.number().int().positive().optional(),
  resizable: z.boolean().default(true),
  aspectRatio: CommonSchemas.positiveNumber.optional(),
});

/**
 * Widget configuration validation
 */
export const WidgetConfigSchema = z.object({
  assets: z.array(CommonSchemas.stockSymbol).max(100).optional(),
  timeframe: ChartTimeframeSchema.optional(),
  indicators: z.array(TechnicalIndicatorSchema).max(10).optional(),
  displayMode: DisplayModeSchema.optional(),
  refreshInterval: z.number().int().min(1000).max(300000).optional(),
  maxItems: z.number().int().min(1).max(1000).optional(),
  customSettings: z.record(z.unknown()).optional(),
});

/**
 * Widget creation request validation
 */
export const CreateWidgetRequestSchema = z.object({
  type: WidgetTypeSchema,
  title: z.string().min(1).max(100),
  config: WidgetConfigSchema.default({}),
  position: WidgetPositionSchema,
  size: WidgetSizeSchema.partial().optional(),
  templateId: CommonSchemas.uuid.optional(),
});

/**
 * Widget update request validation
 */
export const UpdateWidgetRequestSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  config: WidgetConfigSchema.partial().optional(),
  position: WidgetPositionSchema.partial().optional(),
  size: WidgetSizeSchema.partial().optional(),
});

// =============================================================================
// MARKET DATA SCHEMAS
// =============================================================================

/**
 * Asset type validation
 */
export const AssetTypeSchema = z.enum([
  'stock',
  'etf',
  'mutual-fund',
  'bond',
  'commodity',
  'currency',
  'crypto',
  'index',
  'option',
  'future',
]);

/**
 * Asset status validation
 */
export const AssetStatusSchema = z.enum([
  'active',
  'halted',
  'suspended',
  'delisted',
  'pre-market',
  'after-hours',
]);

/**
 * Data source validation
 */
export const DataSourceSchema = z.enum([
  'yahoo',
  'google',
  'alpha-vantage',
  'finnhub',
  'iex',
  'cache',
  'websocket',
]);

/**
 * Asset validation schema
 */
export const AssetSchema = z.object({
  symbol: CommonSchemas.stockSymbol,
  name: z.string().min(1).max(200),
  price: CommonSchemas.positiveNumber,
  change: z.number(),
  changePercent: z.number(),
  volume: CommonSchemas.nonNegativeNumber,
  marketCap: CommonSchemas.positiveNumber.optional(),
  dayHigh: CommonSchemas.positiveNumber.optional(),
  dayLow: CommonSchemas.positiveNumber.optional(),
  yearHigh: CommonSchemas.positiveNumber.optional(),
  yearLow: CommonSchemas.positiveNumber.optional(),
  previousClose: CommonSchemas.positiveNumber.optional(),
  openPrice: CommonSchemas.positiveNumber.optional(),
  avgVolume: CommonSchemas.nonNegativeNumber.optional(),
  peRatio: CommonSchemas.positiveNumber.optional(),
  dividendYield: CommonSchemas.percentage.optional(),
  eps: z.number().optional(),
  beta: z.number().optional(),
  lastUpdated: CommonSchemas.dateInput,
  source: DataSourceSchema,
  currency: CommonSchemas.currencyCode.default('USD'),
  exchange: z.string().min(1).max(50),
  assetType: AssetTypeSchema,
  sector: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  status: AssetStatusSchema.default('active'),
});

/**
 * Price point validation
 */
export const PricePointSchema = z.object({
  timestamp: CommonSchemas.dateInput,
  open: CommonSchemas.positiveNumber,
  high: CommonSchemas.positiveNumber,
  low: CommonSchemas.positiveNumber,
  close: CommonSchemas.positiveNumber,
  adjustedClose: CommonSchemas.positiveNumber.optional(),
  volume: CommonSchemas.nonNegativeNumber,
  vwap: CommonSchemas.positiveNumber.optional(),
});

/**
 * Asset search request validation
 */
export const AssetSearchRequestSchema = z.object({
  query: z.string().max(100).optional(),
  assetTypes: z.array(AssetTypeSchema).optional(),
  exchanges: z.array(z.string().max(50)).optional(),
  sectors: z.array(z.string().max(100)).optional(),
  industries: z.array(z.string().max(100)).optional(),
  currency: CommonSchemas.currencyCode.optional(),
  marketCapRange: z
    .object({
      min: CommonSchemas.positiveNumber.optional(),
      max: CommonSchemas.positiveNumber.optional(),
    })
    .optional(),
  priceRange: z
    .object({
      min: CommonSchemas.positiveNumber.optional(),
      max: CommonSchemas.positiveNumber.optional(),
    })
    .optional(),
  volumeRange: z
    .object({
      min: CommonSchemas.nonNegativeNumber.optional(),
      max: CommonSchemas.nonNegativeNumber.optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum([
        'symbol',
        'name',
        'price',
        'change',
        'changePercent',
        'volume',
        'marketCap',
      ]),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    })
    .optional(),
});

// =============================================================================
// NEWS SCHEMAS
// =============================================================================

/**
 * News category validation
 */
export const NewsCategorySchema = z.enum([
  'breaking-news',
  'market-news',
  'earnings',
  'economic-data',
  'company-news',
  'sector-news',
  'ipo',
  'mergers-acquisitions',
  'analyst-ratings',
  'dividend-news',
  'regulatory',
  'geopolitical',
  'cryptocurrency',
  'commodities',
  'forex',
  'central-bank',
  'inflation',
  'employment',
  'gdp',
  'trade',
  'technology',
  'healthcare',
  'energy',
  'finance',
  'real-estate',
  'consumer',
  'industrial',
  'utilities',
  'materials',
  'opinion',
  'analysis',
  'research',
]);

/**
 * Sentiment label validation
 */
export const SentimentLabelSchema = z.enum([
  'very-positive',
  'positive',
  'neutral',
  'negative',
  'very-negative',
]);

/**
 * News filter validation
 */
export const NewsFilterSchema = z.object({
  sources: z.array(z.string().max(100)).max(50).optional(),
  categories: z.array(NewsCategorySchema).max(20).optional(),
  assets: z.array(CommonSchemas.stockSymbol).max(100).optional(),
  dateRange: z
    .object({
      start: CommonSchemas.dateInput,
      end: CommonSchemas.dateInput,
    })
    .optional(),
  sentiment: z.array(SentimentLabelSchema).optional(),
  languages: z.array(z.string().length(2)).optional(),
  minImportance: z.number().min(0).max(100).optional(),
  keywords: z.array(z.string().min(1).max(100)).max(50).optional(),
  excludeKeywords: z.array(z.string().min(1).max(100)).max(50).optional(),
  authors: z.array(z.string().max(100)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

/**
 * News search request validation
 */
export const NewsSearchRequestSchema = z.object({
  query: z.string().max(200).optional(),
  filters: NewsFilterSchema.optional(),
  sort: z
    .object({
      field: z.enum([
        'publishedAt',
        'relevance',
        'importance',
        'sentiment',
        'viewCount',
      ]),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    })
    .optional(),
  includeContent: z.boolean().default(false),
  includeSentiment: z.boolean().default(true),
});

// =============================================================================
// API SCHEMAS
// =============================================================================

/**
 * Pagination request validation
 */
export const PaginationRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * List query parameters validation
 */
export const ListQueryParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  filters: z.record(z.unknown()).optional(),
});

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validation error formatter
 */
export function formatValidationError(
  error: z.ZodError
): ValidationErrorResponse {
  return {
    error: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

/**
 * Validation error response type
 */
export interface ValidationErrorResponse {
  error: string;
  message: string;
  details: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Safe validation wrapper
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; error: ValidationErrorResponse } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatValidationError(error) };
    }
    return {
      success: false,
      error: {
        error: 'UNKNOWN_ERROR',
        message: 'An unknown validation error occurred',
        details: [],
      },
    };
  }
}

/**
 * Async validation wrapper
 */
export async function safeValidateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<
  | { success: true; data: T }
  | { success: false; error: ValidationErrorResponse }
> {
  try {
    const result = await schema.parseAsync(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatValidationError(error) };
    }
    return {
      success: false,
      error: {
        error: 'UNKNOWN_ERROR',
        message: 'An unknown validation error occurred',
        details: [],
      },
    };
  }
}
