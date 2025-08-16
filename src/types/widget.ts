/**
 * Widget data models and configuration types for MarketPulse application
 * Handles widget definitions, configurations, and positioning
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
  /** Widget configuration settings */
  config: WidgetConfig;
  /** Widget position in dashboard grid */
  position: WidgetPosition;
  /** Widget size constraints */
  size: WidgetSize;
  /** Widget theme override */
  theme?: WidgetTheme;
  /** Widget visibility settings */
  visibility: WidgetVisibility;
  /** Widget creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Widget metadata */
  metadata: WidgetMetadata;
}

/**
 * Available widget types
 */
export type WidgetType =
  | 'asset-list'
  | 'asset-grid'
  | 'price-chart'
  | 'candlestick-chart'
  | 'news-feed'
  | 'market-summary'
  | 'watchlist'
  | 'portfolio-summary'
  | 'economic-calendar'
  | 'heatmap'
  | 'screener'
  | 'alerts'
  | 'performance-metrics'
  | 'sector-performance'
  | 'custom';

/**
 * Widget configuration settings (varies by widget type)
 */
export interface WidgetConfig {
  /** Assets to display (for asset-related widgets) */
  assets?: string[];
  /** Chart timeframe (for chart widgets) */
  timeframe?: ChartTimeframe;
  /** Technical indicators (for chart widgets) */
  indicators?: TechnicalIndicator[];
  /** Display mode (list, grid, chart, etc.) */
  displayMode?: DisplayMode;
  /** Data refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum number of items to display */
  maxItems?: number;
  /** Sorting configuration */
  sorting?: SortingConfig;
  /** Filtering configuration */
  filtering?: FilteringConfig;
  /** Custom widget-specific settings */
  customSettings?: Record<string, unknown>;
  /** Data source preferences */
  dataSources?: DataSourceConfig;
  /** Alert configurations */
  alerts?: AlertConfig[];
}

/**
 * Chart timeframe options
 */
export type ChartTimeframe =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w'
  | '1M'
  | '1Y';

/**
 * Technical indicator types
 */
export type TechnicalIndicator =
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'stochastic'
  | 'williams'
  | 'atr'
  | 'volume';

/**
 * Display mode options
 */
export type DisplayMode =
  | 'list'
  | 'grid'
  | 'chart'
  | 'table'
  | 'cards'
  | 'compact'
  | 'detailed';

/**
 * Sorting configuration
 */
export interface SortingConfig {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
  /** Enable user sorting */
  userSortable: boolean;
  /** Available sort fields */
  availableFields: SortField[];
}

/**
 * Sort field definition
 */
export interface SortField {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Data type */
  type: 'string' | 'number' | 'date' | 'boolean';
  /** Default sort direction */
  defaultDirection: 'asc' | 'desc';
}

/**
 * Filtering configuration
 */
export interface FilteringConfig {
  /** Enable user filtering */
  userFilterable: boolean;
  /** Available filters */
  availableFilters: FilterDefinition[];
  /** Active filters */
  activeFilters: ActiveFilter[];
}

/**
 * Filter definition
 */
export interface FilterDefinition {
  /** Filter key */
  key: string;
  /** Display label */
  label: string;
  /** Filter type */
  type: FilterType;
  /** Filter options (for select/multi-select) */
  options?: FilterOption[];
  /** Default value */
  defaultValue?: unknown;
}

/**
 * Filter type options
 */
export type FilterType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'range'
  | 'boolean';

/**
 * Filter option for select filters
 */
export interface FilterOption {
  /** Option value */
  value: unknown;
  /** Display label */
  label: string;
  /** Option description */
  description?: string;
}

/**
 * Active filter instance
 */
export interface ActiveFilter {
  /** Filter key */
  key: string;
  /** Filter value */
  value: unknown;
  /** Filter operator */
  operator: FilterOperator;
}

/**
 * Filter operator options
 */
export type FilterOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'starts-with'
  | 'ends-with'
  | 'greater-than'
  | 'less-than'
  | 'greater-equal'
  | 'less-equal'
  | 'between'
  | 'in'
  | 'not-in';

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  /** Primary data source */
  primary: DataSource;
  /** Fallback data sources */
  fallbacks: DataSource[];
  /** Cache preferences */
  caching: CachingConfig;
}

/**
 * Data source options
 */
export type DataSource =
  | 'yahoo'
  | 'google'
  | 'alpha-vantage'
  | 'finnhub'
  | 'cache'
  | 'websocket';

/**
 * Caching configuration
 */
export interface CachingConfig {
  /** Enable caching */
  enabled: boolean;
  /** Cache TTL in seconds */
  ttl: number;
  /** Cache strategy */
  strategy: CacheStrategy;
}

/**
 * Cache strategy options
 */
export type CacheStrategy =
  | 'cache-first'
  | 'network-first'
  | 'cache-only'
  | 'network-only';

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: AlertType;
  /** Alert condition */
  condition: AlertCondition;
  /** Alert actions */
  actions: AlertAction[];
  /** Alert enabled status */
  enabled: boolean;
}

/**
 * Alert type options
 */
export type AlertType = 'price' | 'volume' | 'change' | 'technical' | 'news';

/**
 * Alert condition
 */
export interface AlertCondition {
  /** Field to monitor */
  field: string;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Target value */
  value: number | string;
  /** Condition description */
  description: string;
}

/**
 * Comparison operator options
 */
export type ComparisonOperator =
  | 'greater-than'
  | 'less-than'
  | 'equals'
  | 'greater-equal'
  | 'less-equal'
  | 'crosses-above'
  | 'crosses-below';

/**
 * Alert action
 */
export interface AlertAction {
  /** Action type */
  type: AlertActionType;
  /** Action configuration */
  config: Record<string, unknown>;
}

/**
 * Alert action type options
 */
export type AlertActionType =
  | 'notification'
  | 'email'
  | 'webhook'
  | 'sound'
  | 'popup';

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
  /** Aspect ratio constraint */
  aspectRatio?: number;
}

/**
 * Widget theme configuration
 */
export interface WidgetTheme {
  /** Background color */
  backgroundColor: string;
  /** Border color */
  borderColor: string;
  /** Text color */
  textColor: string;
  /** Accent color */
  accentColor: string;
  /** Border radius */
  borderRadius: number;
  /** Shadow configuration */
  shadow: ShadowConfig;
  /** Custom CSS variables */
  customVariables?: Record<string, string>;
}

/**
 * Shadow configuration
 */
export interface ShadowConfig {
  /** Enable shadow */
  enabled: boolean;
  /** Shadow color */
  color: string;
  /** Shadow blur radius */
  blur: number;
  /** Shadow offset X */
  offsetX: number;
  /** Shadow offset Y */
  offsetY: number;
  /** Shadow spread */
  spread: number;
}

/**
 * Widget visibility settings
 */
export interface WidgetVisibility {
  /** Whether widget is visible */
  visible: boolean;
  /** Responsive visibility settings */
  responsive: ResponsiveVisibility;
  /** Conditional visibility rules */
  conditions?: VisibilityCondition[];
}

/**
 * Responsive visibility settings
 */
export interface ResponsiveVisibility {
  /** Visible on mobile */
  mobile: boolean;
  /** Visible on tablet */
  tablet: boolean;
  /** Visible on desktop */
  desktop: boolean;
  /** Visible on ultra-wide */
  ultrawide: boolean;
}

/**
 * Visibility condition
 */
export interface VisibilityCondition {
  /** Condition type */
  type: VisibilityConditionType;
  /** Condition value */
  value: unknown;
  /** Condition operator */
  operator: ComparisonOperator;
}

/**
 * Visibility condition type options
 */
export type VisibilityConditionType =
  | 'time-of-day'
  | 'day-of-week'
  | 'market-hours'
  | 'user-role'
  | 'screen-size';

/**
 * Widget metadata
 */
export interface WidgetMetadata {
  /** Widget version */
  version: number;
  /** Widget category */
  category: WidgetCategory;
  /** Widget tags */
  tags: string[];
  /** Widget description */
  description?: string;
  /** Widget author */
  author?: string;
  /** Widget popularity score */
  popularityScore: number;
  /** Usage statistics */
  usage: WidgetUsage;
  /** Performance metrics */
  performance: WidgetPerformance;
}

/**
 * Widget category options
 */
export type WidgetCategory =
  | 'market-data'
  | 'charts'
  | 'news'
  | 'analytics'
  | 'portfolio'
  | 'alerts'
  | 'utilities'
  | 'custom';

/**
 * Widget usage statistics
 */
export interface WidgetUsage {
  /** Total views */
  views: number;
  /** Total interactions */
  interactions: number;
  /** Average view time in seconds */
  avgViewTime: number;
  /** Last accessed timestamp */
  lastAccessed?: Date;
  /** Usage frequency */
  frequency: UsageFrequency;
}

/**
 * Usage frequency options
 */
export type UsageFrequency =
  | 'never'
  | 'rarely'
  | 'occasionally'
  | 'frequently'
  | 'daily';

/**
 * Widget performance metrics
 */
export interface WidgetPerformance {
  /** Average load time in milliseconds */
  avgLoadTime: number;
  /** Error rate percentage */
  errorRate: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Last performance check */
  lastChecked: Date;
}

/**
 * Widget template for creating new widgets
 */
export interface WidgetTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Widget type */
  type: WidgetType;
  /** Template category */
  category: WidgetCategory;
  /** Default configuration */
  defaultConfig: WidgetConfig;
  /** Default size */
  defaultSize: WidgetSize;
  /** Template preview image */
  previewImage?: string;
  /** Template tags */
  tags: string[];
  /** Template popularity */
  popularityScore: number;
  /** Template creation date */
  createdAt: Date;
  /** Template creator */
  createdBy: string;
}

/**
 * Widget creation request
 */
export interface CreateWidgetRequest {
  /** Widget type */
  type: WidgetType;
  /** Widget title */
  title: string;
  /** Widget configuration */
  config: WidgetConfig;
  /** Widget position */
  position: WidgetPosition;
  /** Widget size */
  size?: Partial<WidgetSize>;
  /** Template ID to base widget on */
  templateId?: string;
  /** Widget theme */
  theme?: WidgetTheme;
}

/**
 * Widget update request
 */
export interface UpdateWidgetRequest {
  /** Updated title */
  title?: string;
  /** Updated configuration */
  config?: Partial<WidgetConfig>;
  /** Updated position */
  position?: Partial<WidgetPosition>;
  /** Updated size */
  size?: Partial<WidgetSize>;
  /** Updated theme */
  theme?: WidgetTheme;
  /** Updated visibility */
  visibility?: Partial<WidgetVisibility>;
}

/**
 * Widget data response (varies by widget type)
 */
export interface WidgetData {
  /** Widget ID */
  widgetId: string;
  /** Data timestamp */
  timestamp: Date;
  /** Widget-specific data */
  data: unknown;
  /** Data source */
  source: DataSource;
  /** Cache information */
  cache?: CacheInfo;
  /** Error information if data failed to load */
  error?: WidgetError;
}

/**
 * Cache information
 */
export interface CacheInfo {
  /** Whether data is from cache */
  cached: boolean;
  /** Cache timestamp */
  cachedAt?: Date;
  /** Cache TTL in seconds */
  ttl?: number;
  /** Cache key */
  key?: string;
}

/**
 * Widget error information
 */
export interface WidgetError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: Record<string, unknown>;
  /** Error timestamp */
  timestamp: Date;
  /** Whether error is recoverable */
  recoverable: boolean;
}
