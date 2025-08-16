/**
 * User data models and preference types for MarketPulse application
 * Handles user authentication, preferences, and accessibility settings
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
 * Notification settings for various events
 */
export interface NotificationSettings {
  /** Enable price alerts */
  priceAlerts: boolean;
  /** Enable news update notifications */
  newsUpdates: boolean;
  /** Enable system message notifications */
  systemMessages: boolean;
  /** Enable email notifications */
  emailNotifications: boolean;
  /** Enable push notifications */
  pushNotifications: boolean;
  /** Enable sound notifications */
  soundNotifications: boolean;
  /** Notification frequency */
  frequency: NotificationFrequency;
  /** Quiet hours for notifications */
  quietHours?: QuietHours;
}

/**
 * Notification frequency options
 */
export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

/**
 * Quiet hours configuration
 */
export interface QuietHours {
  /** Enable quiet hours */
  enabled: boolean;
  /** Start time (24-hour format, e.g., "22:00") */
  startTime: string;
  /** End time (24-hour format, e.g., "08:00") */
  endTime: string;
  /** Timezone for quiet hours */
  timezone: string;
}

/**
 * Accessibility settings for inclusive design
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
  /** Color blind friendly mode */
  colorBlindFriendly: boolean;
}

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

/**
 * Display preferences for UI customization
 */
export interface DisplaySettings {
  /** Preferred currency for display */
  currency: string;
  /** Number format locale */
  locale: string;
  /** Timezone for timestamps */
  timezone: string;
  /** Date format preference */
  dateFormat: DateFormat;
  /** Time format preference */
  timeFormat: TimeFormat;
  /** Decimal places for prices */
  priceDecimalPlaces: number;
  /** Show percentage changes */
  showPercentageChanges: boolean;
  /** Compact number formatting */
  compactNumbers: boolean;
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
 * Time format options
 */
export type TimeFormat = '12h' | '24h';

/**
 * Trading-specific preferences
 */
export interface TradingSettings {
  /** Default chart timeframe */
  defaultTimeframe: string;
  /** Preferred technical indicators */
  defaultIndicators: string[];
  /** Risk tolerance level */
  riskTolerance: RiskTolerance;
  /** Investment horizon */
  investmentHorizon: InvestmentHorizon;
  /** Preferred asset classes */
  preferredAssetClasses: AssetClass[];
  /** Enable paper trading mode */
  paperTradingMode: boolean;
}

/**
 * Risk tolerance levels
 */
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

/**
 * Investment horizon options
 */
export type InvestmentHorizon = 'short-term' | 'medium-term' | 'long-term';

/**
 * Asset class categories
 */
export type AssetClass =
  | 'stocks'
  | 'bonds'
  | 'commodities'
  | 'crypto'
  | 'forex'
  | 'etfs'
  | 'mutual-funds';

/**
 * User session information
 */
export interface UserSession {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Device information */
  device?: DeviceInfo;
  /** IP address */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
}

/**
 * Device information for session tracking
 */
export interface DeviceInfo {
  /** Device type */
  type: 'desktop' | 'tablet' | 'mobile';
  /** Operating system */
  os?: string;
  /** Browser name */
  browser?: string;
  /** Screen resolution */
  screenResolution?: string;
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
  /** Session ID when activity occurred */
  sessionId?: string;
}

/**
 * Types of user activities to track
 */
export type ActivityType =
  | 'login'
  | 'logout'
  | 'dashboard-created'
  | 'dashboard-updated'
  | 'dashboard-deleted'
  | 'widget-added'
  | 'widget-removed'
  | 'preferences-updated'
  | 'asset-added-to-watchlist'
  | 'asset-removed-from-watchlist'
  | 'alert-created'
  | 'alert-triggered'
  | 'news-article-viewed'
  | 'chart-exported'
  | 'data-exported';

/**
 * User authentication credentials
 */
export interface UserCredentials {
  /** Email address */
  email: string;
  /** Password (should be hashed on server) */
  password: string;
}

/**
 * User registration data
 */
export interface UserRegistration extends UserCredentials {
  /** Display name */
  displayName?: string;
  /** Accept terms of service */
  acceptTerms: boolean;
  /** Accept privacy policy */
  acceptPrivacy: boolean;
  /** Optional referral code */
  referralCode?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  /** Email address */
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmation {
  /** Reset token */
  token: string;
  /** New password */
  newPassword: string;
}

/**
 * User profile update data
 */
export interface UserProfileUpdate {
  /** Display name */
  displayName?: string;
  /** Email address */
  email?: string;
  /** User preferences */
  preferences?: Partial<UserPreferences>;
}

/**
 * User statistics and metrics
 */
export interface UserStats {
  /** Total number of dashboards created */
  dashboardsCreated: number;
  /** Total number of widgets added */
  widgetsAdded: number;
  /** Total number of assets in watchlists */
  assetsWatched: number;
  /** Total login count */
  loginCount: number;
  /** Average session duration in minutes */
  avgSessionDuration: number;
  /** Most active day of week */
  mostActiveDay: string;
  /** Preferred time of day for usage */
  preferredTimeOfDay: string;
}
