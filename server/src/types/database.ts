// Base database record interface
export interface BaseRecord {
  created_at: string;
  updated_at?: string;
}

// User interfaces
export interface User extends BaseRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  preferences?: string; // JSON string
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  refreshInterval: number;
  notifications: {
    priceAlerts: boolean;
    newsUpdates: boolean;
    systemStatus: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    screenReader: boolean;
  };
}

// Dashboard interfaces
export interface Dashboard extends BaseRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  layout_config?: string; // JSON string
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
  responsive: boolean;
}

// Widget interfaces
export interface Widget extends BaseRecord {
  id: string;
  dashboard_id: string;
  type: 'asset' | 'news' | 'chart' | 'summary';
  position_config?: string; // JSON string
  widget_config?: string; // JSON string
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AssetWidgetConfig {
  symbol: string;
  refreshInterval: number;
  showChart: boolean;
  chartTimeframe: string;
}

export interface NewsWidgetConfig {
  sources: string[];
  maxArticles: number;
  showSentiment: boolean;
  filterByAssets: string[];
}

export interface ChartWidgetConfig {
  symbol: string;
  chartType: 'line' | 'candlestick' | 'area';
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
  indicators: string[];
}

export interface SummaryWidgetConfig {
  watchlistId?: string;
  metrics: string[];
  refreshInterval: number;
}

// Asset interfaces
export interface Asset {
  symbol: string;
  name: string;
  sector?: string;
  market_cap?: number;
  description?: string;
  last_updated: string;
}

export interface AssetPrice {
  id: number;
  symbol: string;
  price: number;
  change_amount?: number;
  change_percent?: number;
  volume?: number;
  timestamp: string;
}

// News interfaces
export interface NewsArticle extends BaseRecord {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  source: string;
  author?: string;
  url?: string;
  published_at?: string;
  sentiment_score?: number; // -1 to 1
}

export interface NewsAsset {
  news_id: string;
  asset_symbol: string;
  relevance_score: number;
}

// Session interfaces
export interface UserSession extends BaseRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
}

// Watchlist interfaces
export interface Watchlist extends BaseRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
}

export interface WatchlistAsset {
  watchlist_id: string;
  asset_symbol: string;
  added_at: string;
}

// Default dashboard configuration interfaces
export interface DefaultDashboardConfig extends BaseRecord {
  id: string;
  name: string;
  description?: string;
  layout_config?: string; // JSON string
  widget_configs?: string; // JSON string
  is_active: boolean;
}

// System monitoring interfaces
export interface SystemMetric {
  id: number;
  metric_type: string;
  metric_value: number;
  endpoint?: string;
  user_id?: string;
  timestamp: string;
  metadata?: string; // JSON string
}

export interface ApiHealthStatus {
  id: number;
  service_name: string;
  status: 'up' | 'down' | 'degraded';
  response_time?: number;
  error_message?: string;
  last_check: string;
}

export interface UserPreferenceHistory {
  id: number;
  user_id: string;
  preference_key: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
}

export interface RateLimitTracking {
  id: number;
  user_id?: string;
  ip_address?: string;
  endpoint?: string;
  request_count: number;
  window_start: string;
  last_request: string;
}