import { z } from 'zod';

// Base schemas
export const BaseRecordSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// User schemas
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
  refreshInterval: z.number().min(1000).max(300000), // 1 second to 5 minutes
  notifications: z.object({
    priceAlerts: z.boolean(),
    newsUpdates: z.boolean(),
    systemStatus: z.boolean(),
  }),
  accessibility: z.object({
    reduceMotion: z.boolean(),
    highContrast: z.boolean(),
    screenReader: z.boolean(),
  }),
});

export const UserSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string().min(1),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  preferences: z.string().optional(), // JSON string, validated separately
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  preferences: UserPreferencesSchema.optional(),
});

export const UpdateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  preferences: UserPreferencesSchema.optional(),
});

// Dashboard schemas
export const DashboardLayoutSchema = z.object({
  columns: z.number().min(1).max(12),
  rows: z.number().min(1).max(20),
  gap: z.number().min(0).max(50),
  responsive: z.boolean(),
});

export const DashboardSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_default: z.boolean(),
  layout_config: z.string().optional(), // JSON string, validated separately
});

export const CreateDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_default: z.boolean().default(false),
  layout: DashboardLayoutSchema.optional(),
});

export const UpdateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
  layout: DashboardLayoutSchema.optional(),
});

// Widget schemas
export const WidgetPositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1).max(12),
  h: z.number().min(1).max(20),
});

export const AssetWidgetConfigSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  refreshInterval: z.number().min(1000).max(300000),
  showChart: z.boolean(),
  chartTimeframe: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']),
});

export const NewsWidgetConfigSchema = z.object({
  sources: z.array(z.string()).max(10),
  maxArticles: z.number().min(1).max(50),
  showSentiment: z.boolean(),
  filterByAssets: z.array(z.string().regex(/^[A-Z]{1,5}$/)).max(20),
});

export const ChartWidgetConfigSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  chartType: z.enum(['line', 'candlestick', 'area']),
  timeframe: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']),
  indicators: z.array(z.string()).max(10),
});

export const SummaryWidgetConfigSchema = z.object({
  watchlistId: z.string().uuid().optional(),
  metrics: z.array(z.string()).max(10),
  refreshInterval: z.number().min(1000).max(300000),
});

export const WidgetSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  dashboard_id: z.string().uuid(),
  type: z.enum(['asset', 'news', 'chart', 'summary']),
  position_config: z.string().optional(), // JSON string, validated separately
  widget_config: z.string().optional(), // JSON string, validated separately
});

export const CreateWidgetSchema = z.object({
  dashboard_id: z.string().uuid(),
  type: z.enum(['asset', 'news', 'chart', 'summary']),
  position: WidgetPositionSchema,
  config: z.union([
    AssetWidgetConfigSchema,
    NewsWidgetConfigSchema,
    ChartWidgetConfigSchema,
    SummaryWidgetConfigSchema,
  ]),
});

export const UpdateWidgetSchema = z.object({
  type: z.enum(['asset', 'news', 'chart', 'summary']).optional(),
  position: WidgetPositionSchema.optional(),
  config: z
    .union([
      AssetWidgetConfigSchema,
      NewsWidgetConfigSchema,
      ChartWidgetConfigSchema,
      SummaryWidgetConfigSchema,
    ])
    .optional(),
});

// Asset schemas
export const AssetSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  name: z.string().min(1).max(200),
  sector: z.string().max(100).optional(),
  market_cap: z.number().positive().optional(),
  description: z.string().max(1000).optional(),
  last_updated: z.string().datetime(),
});

export const CreateAssetSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  name: z.string().min(1).max(200),
  sector: z.string().max(100).optional(),
  market_cap: z.number().positive().optional(),
  description: z.string().max(1000).optional(),
});

export const UpdateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sector: z.string().max(100).optional(),
  market_cap: z.number().positive().optional(),
  description: z.string().max(1000).optional(),
});

export const AssetPriceSchema = z.object({
  id: z.number().int().positive(),
  symbol: z.string().regex(/^[A-Z]{1,5}$/),
  price: z.number().positive(),
  change_amount: z.number().optional(),
  change_percent: z.number().optional(),
  volume: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime(),
});

export const CreateAssetPriceSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/),
  price: z.number().positive(),
  change_amount: z.number().optional(),
  change_percent: z.number().optional(),
  volume: z.number().int().nonnegative().optional(),
});

// News schemas
export const NewsArticleSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  summary: z.string().max(1000).optional(),
  source: z.string().min(1).max(100),
  author: z.string().max(200).optional(),
  url: z.string().url().optional(),
  published_at: z.string().datetime().optional(),
  sentiment_score: z.number().min(-1).max(1).optional(),
});

export const CreateNewsArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  summary: z.string().max(1000).optional(),
  source: z.string().min(1).max(100),
  author: z.string().max(200).optional(),
  url: z.string().url().optional(),
  published_at: z.string().datetime().optional(),
  sentiment_score: z.number().min(-1).max(1).optional(),
});

export const NewsAssetSchema = z.object({
  news_id: z.string().uuid(),
  asset_symbol: z.string().regex(/^[A-Z]{1,5}$/),
  relevance_score: z.number().min(0).max(1),
});

// Session schemas
export const UserSessionSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string().min(1),
  expires_at: z.string().datetime(),
});

// Watchlist schemas
export const WatchlistSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const CreateWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const UpdateWatchlistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const WatchlistAssetSchema = z.object({
  watchlist_id: z.string().uuid(),
  asset_symbol: z.string().regex(/^[A-Z]{1,5}$/),
  added_at: z.string().datetime(),
});

// Default dashboard configuration schemas
export const DefaultDashboardConfigSchema = BaseRecordSchema.extend({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  layout_config: z.string().optional(), // JSON string
  widget_configs: z.string().optional(), // JSON string
  is_active: z.boolean(),
});

export const CreateDefaultDashboardConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  layout: DashboardLayoutSchema,
  widgets: z.array(CreateWidgetSchema).max(20),
  is_active: z.boolean().default(true),
});

// System monitoring schemas
export const SystemMetricSchema = z.object({
  id: z.number().int().positive(),
  metric_type: z.string().min(1).max(100),
  metric_value: z.number(),
  endpoint: z.string().max(200).optional(),
  user_id: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  metadata: z.string().optional(), // JSON string
});

export const CreateSystemMetricSchema = z.object({
  metric_type: z.string().min(1).max(100),
  metric_value: z.number(),
  endpoint: z.string().max(200).optional(),
  user_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export const ApiHealthStatusSchema = z.object({
  id: z.number().int().positive(),
  service_name: z.string().min(1).max(100),
  status: z.enum(['up', 'down', 'degraded']),
  response_time: z.number().nonnegative().optional(),
  error_message: z.string().optional(),
  last_check: z.string().datetime(),
});

export const CreateApiHealthStatusSchema = z.object({
  service_name: z.string().min(1).max(100),
  status: z.enum(['up', 'down', 'degraded']),
  response_time: z.number().nonnegative().optional(),
  error_message: z.string().optional(),
});

// Rate limiting schemas
export const RateLimitTrackingSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().uuid().optional(),
  ip_address: z.string().ip().optional(),
  endpoint: z.string().max(200).optional(),
  request_count: z.number().int().nonnegative(),
  window_start: z.string().datetime(),
  last_request: z.string().datetime(),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AssetQuerySchema = z.object({
  search: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  ...PaginationSchema.shape,
});

export const NewsQuerySchema = z.object({
  asset: z
    .string()
    .regex(/^[A-Z]{1,5}$/)
    .optional(),
  source: z.string().max(100).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  ...PaginationSchema.shape,
});
