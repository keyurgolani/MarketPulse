/**
 * Dashboard and layout data models for MarketPulse application
 * Handles dashboard configuration, layout management, and sharing
 */

import type { Widget } from './widget';

/**
 * Core dashboard interface
 */
export interface Dashboard {
  /** Unique dashboard identifier */
  id: string;
  /** Dashboard display name */
  name: string;
  /** Optional dashboard description */
  description?: string;
  /** Whether this is a system default dashboard */
  isDefault: boolean;
  /** Whether the dashboard is publicly accessible */
  isPublic: boolean;
  /** User ID of the dashboard owner */
  ownerId: string;
  /** Array of widgets in this dashboard */
  widgets: Widget[];
  /** Layout configuration for the dashboard */
  layout: LayoutConfig;
  /** Dashboard theme override */
  theme?: DashboardTheme;
  /** Dashboard tags for organization */
  tags: string[];
  /** Dashboard creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt?: Date;
  /** Dashboard sharing settings */
  sharing: SharingSettings;
  /** Dashboard metadata */
  metadata: DashboardMetadata;
}

/**
 * Layout configuration for dashboard grid system
 */
export interface LayoutConfig {
  /** Number of columns in the grid */
  columns: number;
  /** Number of rows in the grid */
  rows: number;
  /** Gap between grid items in pixels */
  gap: number;
  /** Responsive breakpoint configurations */
  responsive: ResponsiveConfig;
  /** Whether the layout is auto-sized */
  autoSize: boolean;
  /** Minimum widget dimensions */
  minItemSize: ItemSize;
  /** Maximum widget dimensions */
  maxItemSize?: ItemSize;
  /** Layout margins */
  margins: LayoutMargins;
}

/**
 * Responsive configuration for different screen sizes
 */
export interface ResponsiveConfig {
  /** Mobile layout (< 640px) */
  mobile: ResponsiveBreakpoint;
  /** Tablet layout (640px - 1024px) */
  tablet: ResponsiveBreakpoint;
  /** Desktop layout (1024px - 1920px) */
  desktop: ResponsiveBreakpoint;
  /** Ultra-wide layout (> 1920px) */
  ultrawide: ResponsiveBreakpoint;
}

/**
 * Configuration for a responsive breakpoint
 */
export interface ResponsiveBreakpoint {
  /** Number of columns */
  columns: number;
  /** Number of rows */
  rows: number;
  /** Gap between items */
  gap: number;
  /** Layout margins */
  margins: LayoutMargins;
}

/**
 * Layout margins configuration
 */
export interface LayoutMargins {
  /** Top margin */
  top: number;
  /** Right margin */
  right: number;
  /** Bottom margin */
  bottom: number;
  /** Left margin */
  left: number;
}

/**
 * Item size configuration
 */
export interface ItemSize {
  /** Width in grid units */
  width: number;
  /** Height in grid units */
  height: number;
}

/**
 * Dashboard theme configuration
 */
export interface DashboardTheme {
  /** Primary color */
  primaryColor: string;
  /** Secondary color */
  secondaryColor: string;
  /** Background color */
  backgroundColor: string;
  /** Text color */
  textColor: string;
  /** Border color */
  borderColor: string;
  /** Custom CSS variables */
  customVariables?: Record<string, string>;
}

/**
 * Dashboard sharing settings
 */
export interface SharingSettings {
  /** Whether sharing is enabled */
  enabled: boolean;
  /** Share link if public */
  shareLink?: string;
  /** Allowed user IDs for private sharing */
  allowedUsers: string[];
  /** Sharing permissions */
  permissions: SharingPermissions;
  /** Share expiration date */
  expiresAt?: Date;
  /** Whether to require authentication for shared access */
  requireAuth: boolean;
}

/**
 * Sharing permissions configuration
 */
export interface SharingPermissions {
  /** Can view the dashboard */
  canView: boolean;
  /** Can edit widgets */
  canEdit: boolean;
  /** Can add new widgets */
  canAddWidgets: boolean;
  /** Can remove widgets */
  canRemoveWidgets: boolean;
  /** Can modify layout */
  canModifyLayout: boolean;
  /** Can share with others */
  canShare: boolean;
}

/**
 * Dashboard metadata
 */
export interface DashboardMetadata {
  /** Dashboard version for change tracking */
  version: number;
  /** Total number of views */
  viewCount: number;
  /** Number of times dashboard was copied */
  copyCount: number;
  /** Average time spent viewing (in seconds) */
  avgViewTime: number;
  /** Most popular widgets */
  popularWidgets: string[];
  /** Dashboard performance metrics */
  performance: DashboardPerformance;
  /** Dashboard category */
  category?: DashboardCategory;
  /** Featured status */
  isFeatured: boolean;
}

/**
 * Dashboard performance metrics
 */
export interface DashboardPerformance {
  /** Average load time in milliseconds */
  avgLoadTime: number;
  /** Number of API calls made */
  apiCallCount: number;
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Error rate percentage */
  errorRate: number;
  /** Last performance check timestamp */
  lastCheckedAt: Date;
}

/**
 * Dashboard categories for organization
 */
export type DashboardCategory =
  | 'trading'
  | 'investing'
  | 'market-overview'
  | 'sector-analysis'
  | 'crypto'
  | 'forex'
  | 'commodities'
  | 'news'
  | 'custom';

/**
 * Dashboard template for creating new dashboards
 */
export interface DashboardTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: DashboardCategory;
  /** Template preview image */
  previewImage?: string;
  /** Template configuration */
  template: Omit<
    Dashboard,
    'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'lastAccessedAt'
  >;
  /** Template tags */
  tags: string[];
  /** Template popularity score */
  popularityScore: number;
  /** Template creation date */
  createdAt: Date;
  /** Template creator */
  createdBy: string;
}

/**
 * Dashboard creation request
 */
export interface CreateDashboardRequest {
  /** Dashboard name */
  name: string;
  /** Optional description */
  description?: string;
  /** Template ID to base dashboard on */
  templateId?: string;
  /** Initial layout configuration */
  layout?: Partial<LayoutConfig>;
  /** Dashboard tags */
  tags?: string[];
  /** Whether to make public */
  isPublic?: boolean;
  /** Initial theme */
  theme?: DashboardTheme;
}

/**
 * Dashboard update request
 */
export interface UpdateDashboardRequest {
  /** Updated name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated layout */
  layout?: Partial<LayoutConfig>;
  /** Updated tags */
  tags?: string[];
  /** Updated public status */
  isPublic?: boolean;
  /** Updated theme */
  theme?: DashboardTheme;
  /** Updated sharing settings */
  sharing?: Partial<SharingSettings>;
}

/**
 * Dashboard copy request
 */
export interface CopyDashboardRequest {
  /** Source dashboard ID */
  sourceDashboardId: string;
  /** New dashboard name */
  name: string;
  /** Optional description */
  description?: string;
  /** Whether to copy widgets */
  copyWidgets: boolean;
  /** Whether to copy layout */
  copyLayout: boolean;
  /** Whether to copy theme */
  copyTheme: boolean;
}

/**
 * Dashboard export configuration
 */
export interface DashboardExport {
  /** Dashboard data */
  dashboard: Dashboard;
  /** Export format */
  format: ExportFormat;
  /** Export options */
  options: ExportOptions;
  /** Export timestamp */
  exportedAt: Date;
  /** Export version */
  version: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'pdf' | 'png' | 'svg' | 'csv';

/**
 * Export options configuration
 */
export interface ExportOptions {
  /** Include widget data */
  includeData: boolean;
  /** Include layout information */
  includeLayout: boolean;
  /** Include theme settings */
  includeTheme: boolean;
  /** Include metadata */
  includeMetadata: boolean;
  /** Date range for data export */
  dateRange?: DateRange;
  /** Image resolution for image exports */
  resolution?: ImageResolution;
}

/**
 * Date range for exports
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Image resolution options
 */
export interface ImageResolution {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** DPI for print quality */
  dpi?: number;
}

/**
 * Dashboard import configuration
 */
export interface DashboardImport {
  /** Import data */
  data: string | object;
  /** Import format */
  format: ExportFormat;
  /** Import options */
  options: ImportOptions;
}

/**
 * Import options configuration
 */
export interface ImportOptions {
  /** Whether to overwrite existing dashboard */
  overwrite: boolean;
  /** Whether to validate data before import */
  validate: boolean;
  /** Whether to preserve original IDs */
  preserveIds: boolean;
  /** User ID to assign as owner */
  ownerId?: string;
}

/**
 * Dashboard search and filter options
 */
export interface DashboardSearchOptions {
  /** Search query */
  query?: string;
  /** Filter by category */
  category?: DashboardCategory;
  /** Filter by tags */
  tags?: string[];
  /** Filter by owner */
  ownerId?: string;
  /** Filter by public status */
  isPublic?: boolean;
  /** Filter by featured status */
  isFeatured?: boolean;
  /** Sort by field */
  sortBy?: DashboardSortField;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Date range filter */
  dateRange?: DateRange;
}

/**
 * Dashboard sort field options
 */
export type DashboardSortField =
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'lastAccessedAt'
  | 'viewCount'
  | 'popularityScore';

/**
 * Dashboard analytics data
 */
export interface DashboardAnalytics {
  /** Dashboard ID */
  dashboardId: string;
  /** Analytics period */
  period: AnalyticsPeriod;
  /** View statistics */
  views: ViewStats;
  /** User engagement metrics */
  engagement: EngagementStats;
  /** Performance metrics */
  performance: PerformanceStats;
  /** Widget usage statistics */
  widgetUsage: WidgetUsageStats[];
}

/**
 * Analytics period options
 */
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * View statistics
 */
export interface ViewStats {
  /** Total views */
  total: number;
  /** Unique viewers */
  unique: number;
  /** Average views per day */
  avgPerDay: number;
  /** Peak concurrent viewers */
  peakConcurrent: number;
}

/**
 * Engagement statistics
 */
export interface EngagementStats {
  /** Average session duration */
  avgSessionDuration: number;
  /** Bounce rate percentage */
  bounceRate: number;
  /** Widget interaction rate */
  widgetInteractionRate: number;
  /** Return visitor rate */
  returnVisitorRate: number;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  /** Average load time */
  avgLoadTime: number;
  /** 95th percentile load time */
  p95LoadTime: number;
  /** Error rate percentage */
  errorRate: number;
  /** Cache hit rate percentage */
  cacheHitRate: number;
}

/**
 * Widget usage statistics
 */
export interface WidgetUsageStats {
  /** Widget ID */
  widgetId: string;
  /** Widget type */
  widgetType: string;
  /** Number of interactions */
  interactions: number;
  /** Time spent viewing */
  viewTime: number;
  /** Error count */
  errors: number;
}
