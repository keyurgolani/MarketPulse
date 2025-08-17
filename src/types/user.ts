/**
 * User-related types and interfaces for MarketPulse application
 * Handles user authentication, preferences, and settings
 */

/**
 * Core user interface
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  displayName?: string;
  /** User preferences and settings */
  preferences: UserPreferences;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Whether the user account is active */
  isActive: boolean;
  /** User role for permissions */
  role: UserRole;
}

/**
 * User roles for permission management
 */
export type UserRole = 'user' | 'admin' | 'moderator';

/**
 * Comprehensive user preferences
 */
export interface UserPreferences {
  /** Theme preference */
  theme: ThemePreference;
  /** Default dashboard to show on login */
  defaultDashboard?: string;
  /** Data refresh interval in milliseconds */
  refreshInterval: number;
  /** Notification settings */
  notifications: NotificationSettings;
  /** Accessibility settings */
  accessibility: AccessibilitySettings;
  /** Display preferences */
  display: DisplaySettings;
  /** Trading preferences */
  trading: TradingSettings;
}

/**
 * Theme preference options
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Enable price alerts */
  priceAlerts: boolean;
  /** Enable news updates */
  newsUpdates: boolean;
  /** Enable system messages */
  systemMessages: boolean;
  /** Enable email notifications */
  emailNotifications: boolean;
  /** Enable push notifications */
  pushNotifications: boolean;
  /** Price alert thresholds */
  priceAlertThresholds: PriceAlertSettings;
}

/**
 * Price alert configuration
 */
export interface PriceAlertSettings {
  /** Percentage change threshold for alerts */
  percentageThreshold: number;
  /** Absolute price change threshold */
  priceThreshold: number;
  /** Volume change threshold */
  volumeThreshold: number;
  /** Alert frequency limit */
  maxAlertsPerHour: number;
}

/**
 * Accessibility settings for WCAG compliance
 */
export interface AccessibilitySettings {
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Reduce motion and animations */
  reducedMotion: boolean;
  /** Optimize for screen readers */
  screenReaderOptimized: boolean;
  /** Font size preference */
  fontSize: FontSize;
  /** Enable keyboard navigation hints */
  keyboardNavigation: boolean;
  /** Focus indicator enhancement */
  enhancedFocus: boolean;
}

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

/**
 * Display preferences
 */
export interface DisplaySettings {
  /** Number format preference */
  numberFormat: NumberFormat;
  /** Date format preference */
  dateFormat: DateFormat;
  /** Time zone preference */
  timezone: string;
  /** Currency preference */
  currency: string;
  /** Decimal places for prices */
  priceDecimalPlaces: number;
  /** Show percentage changes */
  showPercentageChanges: boolean;
  /** Compact number display */
  compactNumbers: boolean;
}

/**
 * Number format options
 */
export interface NumberFormat {
  /** Locale for number formatting */
  locale: string;
  /** Thousands separator */
  thousandsSeparator: ',' | '.' | ' ';
  /** Decimal separator */
  decimalSeparator: '.' | ',';
}

/**
 * Date format options
 */
export type DateFormat =
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'relative';

/**
 * Trading-specific preferences
 */
export interface TradingSettings {
  /** Default chart timeframe */
  defaultTimeframe: string;
  /** Preferred technical indicators */
  defaultIndicators: string[];
  /** Chart type preference */
  chartType: ChartType;
  /** Show extended hours data */
  showExtendedHours: boolean;
  /** Default watchlist */
  defaultWatchlist?: string;
}

/**
 * Chart type options
 */
export type ChartType = 'line' | 'candlestick' | 'bar' | 'area';

/**
 * User session information
 */
export interface UserSession {
  /** Session identifier */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Device information */
  device: DeviceInfo;
  /** IP address */
  ipAddress: string;
  /** Whether session is active */
  isActive: boolean;
}

/**
 * Device information for sessions
 */
export interface DeviceInfo {
  /** Device type */
  type: 'desktop' | 'mobile' | 'tablet';
  /** Operating system */
  os: string;
  /** Browser information */
  browser: string;
  /** Screen resolution */
  screenResolution?: string;
  /** User agent string */
  userAgent: string;
}

/**
 * User activity tracking
 */
export interface UserActivity {
  /** Activity ID */
  id: string;
  /** User ID */
  userId: string;
  /** Activity type */
  type: ActivityType;
  /** Activity description */
  description: string;
  /** Activity metadata */
  metadata?: Record<string, unknown>;
  /** Activity timestamp */
  timestamp: Date;
  /** Session ID */
  sessionId: string;
}

/**
 * Types of user activities to track
 */
export type ActivityType =
  | 'login'
  | 'logout'
  | 'dashboard_created'
  | 'dashboard_updated'
  | 'dashboard_deleted'
  | 'widget_added'
  | 'widget_removed'
  | 'preferences_updated'
  | 'watchlist_updated'
  | 'alert_created'
  | 'alert_triggered';

/**
 * User authentication payload
 */
export interface AuthPayload {
  /** User's email */
  email: string;
  /** User's password */
  password: string;
  /** Remember me option */
  rememberMe?: boolean;
}

/**
 * User registration payload
 */
export interface RegisterPayload {
  /** User's email */
  email: string;
  /** User's password */
  password: string;
  /** Password confirmation */
  confirmPassword: string;
  /** Display name */
  displayName?: string;
  /** Accept terms of service */
  acceptTerms: boolean;
}

/**
 * Password reset payload
 */
export interface PasswordResetPayload {
  /** User's email */
  email: string;
}

/**
 * Password change payload
 */
export interface PasswordChangePayload {
  /** Current password */
  currentPassword: string;
  /** New password */
  newPassword: string;
  /** New password confirmation */
  confirmPassword: string;
}

/**
 * User profile update payload
 */
export interface ProfileUpdatePayload {
  /** Display name */
  displayName?: string;
  /** User preferences */
  preferences?: Partial<UserPreferences>;
}

/**
 * Type guard to check if user has admin role
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Type guard to check if user has moderator or admin role
 */
export function isModerator(user: User): boolean {
  return user.role === 'moderator' || user.role === 'admin';
}

/**
 * Type guard to check if user session is valid
 */
export function isValidSession(session: UserSession): boolean {
  return session.isActive && new Date() < session.expiresAt;
}
