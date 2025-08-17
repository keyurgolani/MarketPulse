/**
 * Widget types and interfaces for MarketPulse dashboard system
 * Handles widget configuration, data, and behavior
 */

/**
 * Core widget interface
 */
export interface Widget {
  /** Unique widget identifier */
  id: string;
  /** Widget type identifier */
  type: WidgetType;
  /** Widget display title */
  title: string;
  /** Widget configuration */
  config: WidgetConfig;
  /** Widget position in dashboard grid */
  position: WidgetPosition;
  /** Widget size constraints */
  size: WidgetSize;
  /** Widget creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Widget visibility */
  isVisible: boolean;
  /** Widget loading state */
  isLoading?: boolean;
  /** Widget error state */
  error?: string;
}

/**
 * Available widget types
 */
export type WidgetType =
  | 'asset-list'
  | 'asset-grid'
  | 'price-chart'
  | 'news-feed'
  | 'market-summary'
  | 'watchlist'
  | 'portfolio'
  | 'economic-calendar'
  | 'heatmap'
  | 'screener'
  | 'alerts'
  | 'performance'
  | 'custom';

/**
 * Widget configuration (varies by widget type)
 */
export interface WidgetConfig {
  /** Assets to display (for asset-related widgets) */
  assets?: string[];
  /** Chart timeframe */
  timeframe?: TimeFrame;
  /** Technical indicators to display */
  indicators?: TechnicalIndicator[];
  /** Display mode */
  displayMode?: DisplayMode;
  /** Data refresh interval in milliseconds */
  refreshInterval?: number;
  /** Custom widget settings */
  customSettings?: Record<string, unknown>;
  /** Data source preferences */
  dataSources?: DataSourcePreference[];
  /** Filtering options */
  filters?: WidgetFilters;
  /** Styling options */
  styling?: WidgetStyling;
}

/**
 * Time frame options for charts and data
 */
export type TimeFrame =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '1d'
  | '1w'
  | '1M'
  | '3M'
  | '6M'
  | '1y'
  | '2y'
  | '5y'
  | 'max';

/**
 * Technical indicators available for charts
 */
export type TechnicalIndicator =
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'stochastic'
  | 'williams'
  | 'cci'
  | 'momentum'
  | 'volume'
  | 'vwap'
  | 'fibonacci';

/**
 * Display modes for different widget types
 */
export type DisplayMode =
  | 'list'
  | 'grid'
  | 'table'
  | 'chart'
  | 'card'
  | 'compact'
  | 'detailed'
  | 'minimal';

/**
 * Data source preference for widgets
 */
export interface DataSourcePreference {
  /** Data source name */
  source: string;
  /** Priority (1 = highest) */
  priority: number;
  /** Whether to use as fallback */
  fallback: boolean;
}

/**
 * Widget filtering options
 */
export interface WidgetFilters {
  /** Market cap filter */
  marketCap?: MarketCapFilter;
  /** Price range filter */
  priceRange?: PriceRangeFilter;
  /** Volume filter */
  volume?: VolumeFilter;
  /** Sector filter */
  sectors?: string[];
  /** Exchange filter */
  exchanges?: string[];
  /** Country filter */
  countries?: string[];
  /** Custom filters */
  custom?: Record<string, unknown>;
}

/**
 * Market cap filter options
 */
export interface MarketCapFilter {
  /** Minimum market cap */
  min?: number;
  /** Maximum market cap */
  max?: number;
  /** Market cap categories */
  categories?: ('micro' | 'small' | 'mid' | 'large' | 'mega')[];
}

/**
 * Price range filter
 */
export interface PriceRangeFilter {
  /** Minimum price */
  min?: number;
  /** Maximum price */
  max?: number;
}

/**
 * Volume filter options
 */
export interface VolumeFilter {
  /** Minimum volume */
  min?: number;
  /** Maximum volume */
  max?: number;
  /** Average volume multiplier */
  avgVolumeMultiplier?: number;
}

/**
 * Widget styling options
 */
export interface WidgetStyling {
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Border radius */
  borderRadius?: number;
  /** Padding */
  padding?: number;
  /** Font size */
  fontSize?: 'small' | 'medium' | 'large';
  /** Custom CSS classes */
  customClasses?: string[];
}

/**
 * Widget position in dashboard grid
 */
export interface WidgetPosition {
  /** X coordinate (column) */
  x: number;
  /** Y coordinate (row) */
  y: number;
  /** Width in grid units */
  w: number;
  /** Height in grid units */
  h: number;
  /** Z-index for layering */
  z?: number;
}

/**
 * Widget size constraints
 */
export interface WidgetSize {
  /** Minimum width in grid units */
  minW: number;
  /** Minimum height in grid units */
  minH: number;
  /** Maximum width in grid units */
  maxW?: number;
  /** Maximum height in grid units */
  maxH?: number;
  /** Whether widget is resizable */
  resizable: boolean;
  /** Whether widget maintains aspect ratio */
  maintainAspectRatio?: boolean;
}

/**
 * Widget data interface (generic)
 */
export interface WidgetData<T = unknown> {
  /** Widget ID */
  widgetId: string;
  /** Data payload */
  data: T;
  /** Data timestamp */
  timestamp: Date;
  /** Data source */
  source: string;
  /** Whether data is cached */
  cached: boolean;
  /** Cache expiration */
  cacheExpires?: Date;
  /** Data quality score */
  quality?: number;
}

/**
 * Widget performance metrics
 */
export interface WidgetPerformance {
  /** Widget ID */
  widgetId: string;
  /** Load time in milliseconds */
  loadTime: number;
  /** Render time in milliseconds */
  renderTime: number;
  /** Data fetch time in milliseconds */
  dataFetchTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Update frequency */
  updateFrequency: number;
  /** Error count */
  errorCount: number;
  /** Last performance check */
  lastCheck: Date;
}

/**
 * Widget interaction events
 */
export interface WidgetInteraction {
  /** Widget ID */
  widgetId: string;
  /** Interaction type */
  type: InteractionType;
  /** Interaction data */
  data?: Record<string, unknown>;
  /** Interaction timestamp */
  timestamp: Date;
  /** User ID */
  userId: string;
}

/**
 * Types of widget interactions
 */
export type InteractionType =
  | 'click'
  | 'hover'
  | 'scroll'
  | 'resize'
  | 'move'
  | 'configure'
  | 'refresh'
  | 'export'
  | 'share'
  | 'zoom'
  | 'pan'
  | 'select';

/**
 * Widget state for React components
 */
export interface WidgetState {
  /** Whether widget is loading */
  isLoading: boolean;
  /** Whether widget has error */
  hasError: boolean;
  /** Error message */
  error?: string;
  /** Whether widget is configured */
  isConfigured: boolean;
  /** Whether widget is visible */
  isVisible: boolean;
  /** Whether widget is focused */
  isFocused: boolean;
  /** Last update timestamp */
  lastUpdated?: Date;
}

/**
 * Widget action for state management
 */
export interface WidgetAction {
  /** Action type */
  type: WidgetActionType;
  /** Widget ID */
  widgetId: string;
  /** Action payload */
  payload?: unknown;
}

/**
 * Widget action types
 */
export type WidgetActionType =
  | 'LOAD_START'
  | 'LOAD_SUCCESS'
  | 'LOAD_ERROR'
  | 'UPDATE_CONFIG'
  | 'UPDATE_POSITION'
  | 'UPDATE_SIZE'
  | 'SET_VISIBILITY'
  | 'SET_FOCUS'
  | 'REFRESH_DATA'
  | 'CLEAR_ERROR';

/**
 * Widget factory interface for creating widgets
 */
export interface WidgetFactory {
  /** Widget type this factory creates */
  type: WidgetType;
  /** Create a new widget instance */
  create(config: Partial<WidgetConfig>): Widget;
  /** Validate widget configuration */
  validate(config: WidgetConfig): boolean;
  /** Get default configuration */
  getDefaultConfig(): WidgetConfig;
  /** Get widget metadata */
  getMetadata(): WidgetMetadata;
}

/**
 * Widget metadata for registration and discovery
 */
export interface WidgetMetadata {
  /** Widget type */
  type: WidgetType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: WidgetCategory;
  /** Icon */
  icon: string;
  /** Tags */
  tags: string[];
  /** Version */
  version: string;
  /** Author */
  author: string;
  /** Whether widget is premium */
  isPremium: boolean;
  /** Supported data sources */
  supportedDataSources: string[];
}

/**
 * Widget categories for organization
 */
export type WidgetCategory =
  | 'market-data'
  | 'charts'
  | 'news'
  | 'analysis'
  | 'portfolio'
  | 'alerts'
  | 'utilities'
  | 'custom';

/**
 * Type guard to check if widget is chart type
 */
export function isChartWidget(widget: Widget): boolean {
  return ['price-chart', 'heatmap'].includes(widget.type);
}

/**
 * Type guard to check if widget displays assets
 */
export function isAssetWidget(widget: Widget): boolean {
  return ['asset-list', 'asset-grid', 'watchlist', 'portfolio'].includes(
    widget.type
  );
}

/**
 * Type guard to check if widget is resizable
 */
export function isResizable(widget: Widget): boolean {
  return widget.size.resizable;
}

/**
 * Utility function to get widget display name
 */
export function getWidgetDisplayName(type: WidgetType): string {
  const names: Record<WidgetType, string> = {
    'asset-list': 'Asset List',
    'asset-grid': 'Asset Grid',
    'price-chart': 'Price Chart',
    'news-feed': 'News Feed',
    'market-summary': 'Market Summary',
    watchlist: 'Watchlist',
    portfolio: 'Portfolio',
    'economic-calendar': 'Economic Calendar',
    heatmap: 'Market Heatmap',
    screener: 'Stock Screener',
    alerts: 'Price Alerts',
    performance: 'Performance',
    custom: 'Custom Widget',
  };
  return names[type] || type;
}
