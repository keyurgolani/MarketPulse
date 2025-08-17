/**
 * Dashboard and layout types for MarketPulse application
 * Handles dashboard configuration, layout management, and widget organization
 */

import type { Widget, WidgetPosition, WidgetSize } from './widget';

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
  /** Whether dashboard is publicly accessible */
  isPublic: boolean;
  /** User ID of the dashboard owner */
  ownerId: string;
  /** Array of widgets in this dashboard */
  widgets: Widget[];
  /** Layout configuration */
  layout: LayoutConfig;
  /** Dashboard creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Dashboard tags for organization */
  tags: string[];
  /** Dashboard sharing settings */
  sharing: SharingSettings;
  /** Dashboard theme override */
  theme?: DashboardTheme;
}

/**
 * Layout configuration for dashboard grid system
 */
export interface LayoutConfig {
  /** Number of columns in the grid */
  columns: number;
  /** Number of rows in the grid */
  rows: number;
  /** Gap between widgets in pixels */
  gap: number;
  /** Responsive breakpoint configurations */
  responsive: ResponsiveConfig;
  /** Whether to auto-arrange widgets */
  autoArrange: boolean;
  /** Minimum widget dimensions */
  minWidgetSize: WidgetDimensions;
  /** Maximum widget dimensions */
  maxWidgetSize: WidgetDimensions;
}

/**
 * Responsive configuration for different screen sizes
 */
export interface ResponsiveConfig {
  /** Mobile configuration (< 640px) */
  mobile: ResponsiveBreakpoint;
  /** Tablet configuration (640px - 1024px) */
  tablet: ResponsiveBreakpoint;
  /** Desktop configuration (1024px - 1920px) */
  desktop: ResponsiveBreakpoint;
  /** Ultra-wide configuration (> 1920px) */
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
  /** Gap between widgets */
  gap: number;
  /** Whether widgets can be resized */
  resizable: boolean;
  /** Whether widgets can be dragged */
  draggable: boolean;
}

/**
 * Widget dimensions
 */
export interface WidgetDimensions {
  /** Width in grid units */
  width: number;
  /** Height in grid units */
  height: number;
}

/**
 * Dashboard sharing settings
 */
export interface SharingSettings {
  /** Whether dashboard can be shared */
  enabled: boolean;
  /** Share permissions */
  permissions: SharePermission[];
  /** Public share link */
  publicLink?: string;
  /** Share expiration date */
  expiresAt?: Date;
  /** Whether to require authentication for shared access */
  requireAuth: boolean;
}

/**
 * Share permission for specific users
 */
export interface SharePermission {
  /** User ID or email */
  userId: string;
  /** Permission level */
  permission: 'view' | 'edit' | 'admin';
  /** When permission was granted */
  grantedAt: Date;
  /** Who granted the permission */
  grantedBy: string;
}

/**
 * Dashboard theme configuration
 */
export interface DashboardTheme {
  /** Primary color scheme */
  primaryColor: string;
  /** Secondary color scheme */
  secondaryColor: string;
  /** Background color */
  backgroundColor: string;
  /** Text color */
  textColor: string;
  /** Widget background color */
  widgetBackground: string;
  /** Border color */
  borderColor: string;
  /** Custom CSS variables */
  customVariables?: Record<string, string>;
}

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
  category: TemplateCategory;
  /** Template preview image */
  previewImage?: string;
  /** Template configuration */
  config: DashboardTemplateConfig;
  /** Template tags */
  tags: string[];
  /** Template popularity score */
  popularity: number;
  /** Template creation date */
  createdAt: Date;
  /** Template creator */
  createdBy: string;
}

/**
 * Template categories
 */
export type TemplateCategory =
  | 'trading'
  | 'investing'
  | 'crypto'
  | 'forex'
  | 'commodities'
  | 'indices'
  | 'news'
  | 'analysis'
  | 'custom';

/**
 * Dashboard template configuration
 */
export interface DashboardTemplateConfig {
  /** Layout configuration */
  layout: LayoutConfig;
  /** Widget templates */
  widgets: WidgetTemplate[];
  /** Default theme */
  theme?: DashboardTheme;
  /** Required data sources */
  dataSources: string[];
}

/**
 * Widget template for dashboard templates
 */
export interface WidgetTemplate {
  /** Widget type */
  type: string;
  /** Widget title */
  title: string;
  /** Widget configuration */
  config: Record<string, unknown>;
  /** Widget position */
  position: WidgetPosition;
  /** Widget size */
  size: WidgetSize;
}

// WidgetPosition is exported from widget.ts to avoid conflicts

// WidgetSize is exported from widget.ts to avoid conflicts

/**
 * Dashboard export format
 */
export interface DashboardExport {
  /** Export format version */
  version: string;
  /** Dashboard data */
  dashboard: Omit<Dashboard, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
  /** Export metadata */
  metadata: ExportMetadata;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  /** Export timestamp */
  exportedAt: Date;
  /** Exported by user */
  exportedBy: string;
  /** Export format */
  format: 'json' | 'yaml';
  /** MarketPulse version */
  appVersion: string;
}

/**
 * Dashboard import payload
 */
export interface DashboardImport {
  /** Dashboard name for import */
  name: string;
  /** Dashboard export data */
  data: DashboardExport;
  /** Whether to overwrite existing dashboard */
  overwrite?: boolean;
}

/**
 * Dashboard analytics data
 */
export interface DashboardAnalytics {
  /** Dashboard ID */
  dashboardId: string;
  /** View count */
  viewCount: number;
  /** Unique viewers */
  uniqueViewers: number;
  /** Average session duration */
  avgSessionDuration: number;
  /** Most used widgets */
  popularWidgets: WidgetUsage[];
  /** Usage by time period */
  usageByPeriod: UsagePeriod[];
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Widget usage statistics
 */
export interface WidgetUsage {
  /** Widget type */
  type: string;
  /** Usage count */
  count: number;
  /** Average interaction time */
  avgInteractionTime: number;
}

/**
 * Usage statistics by time period
 */
export interface UsagePeriod {
  /** Period start date */
  startDate: Date;
  /** Period end date */
  endDate: Date;
  /** View count in period */
  views: number;
  /** Unique users in period */
  uniqueUsers: number;
}

/**
 * Dashboard search filters
 */
export interface DashboardSearchFilters {
  /** Search query */
  query?: string;
  /** Filter by owner */
  owner?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by public/private */
  isPublic?: boolean;
  /** Filter by default dashboards */
  isDefault?: boolean;
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Type guard to check if dashboard is editable by user
 */
export function canEditDashboard(
  dashboard: Dashboard,
  userId: string
): boolean {
  return (
    dashboard.ownerId === userId ||
    dashboard.sharing.permissions.some(
      p =>
        p.userId === userId &&
        (p.permission === 'edit' || p.permission === 'admin')
    )
  );
}

/**
 * Type guard to check if dashboard is viewable by user
 */
export function canViewDashboard(
  dashboard: Dashboard,
  userId: string
): boolean {
  return (
    dashboard.isPublic ||
    dashboard.ownerId === userId ||
    dashboard.sharing.permissions.some(p => p.userId === userId)
  );
}

/**
 * Utility function to get responsive layout for screen size
 */
export function getResponsiveLayout(
  layout: LayoutConfig,
  screenWidth: number
): ResponsiveBreakpoint {
  if (screenWidth < 640) return layout.responsive.mobile;
  if (screenWidth < 1024) return layout.responsive.tablet;
  if (screenWidth < 1920) return layout.responsive.desktop;
  return layout.responsive.ultrawide;
}
