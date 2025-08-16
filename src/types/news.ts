/**
 * News and content data models for MarketPulse application
 * Handles news articles, content aggregation, sentiment analysis, and filtering
 */

/**
 * Core news article interface
 */
export interface NewsArticle {
  /** Unique article identifier */
  id: string;
  /** Article headline */
  title: string;
  /** Article summary/excerpt */
  summary: string;
  /** Full article content */
  content?: string;
  /** Original article URL */
  url: string;
  /** Publication timestamp */
  publishedAt: Date;
  /** News source information */
  source: NewsSource;
  /** Article author */
  author?: string;
  /** Related asset symbols */
  relatedAssets: string[];
  /** Sentiment analysis results */
  sentiment?: SentimentAnalysis;
  /** Article category */
  category: NewsCategory;
  /** Article tags */
  tags: string[];
  /** Article image URL */
  imageUrl?: string;
  /** Article language */
  language: string;
  /** Article importance score */
  importance: number;
  /** Article metadata */
  metadata: ArticleMetadata;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * News source information
 */
export interface NewsSource {
  /** Source identifier */
  id: string;
  /** Source display name */
  name: string;
  /** Source website URL */
  url: string;
  /** Source logo URL */
  logoUrl?: string;
  /** Source reliability score (0-100) */
  reliability: number;
  /** Political bias classification */
  bias?: PoliticalBias;
  /** Source credibility rating */
  credibility: CredibilityRating;
  /** Source category */
  category: SourceCategory;
  /** Source language */
  language: string;
  /** Source country */
  country: string;
  /** Whether source is verified */
  verified: boolean;
}

/**
 * Political bias classification
 */
export type PoliticalBias =
  | 'left'
  | 'lean-left'
  | 'center'
  | 'lean-right'
  | 'right'
  | 'mixed';

/**
 * Credibility rating options
 */
export type CredibilityRating =
  | 'very-high'
  | 'high'
  | 'mixed'
  | 'low'
  | 'very-low';

/**
 * Source category options
 */
export type SourceCategory =
  | 'financial-news'
  | 'business-news'
  | 'mainstream-news'
  | 'trade-publication'
  | 'blog'
  | 'social-media'
  | 'press-release'
  | 'research-report';

/**
 * Sentiment analysis results
 */
export interface SentimentAnalysis {
  /** Sentiment score (-1 to 1) */
  score: number;
  /** Confidence level (0 to 1) */
  confidence: number;
  /** Sentiment label */
  label: SentimentLabel;
  /** Detailed sentiment breakdown */
  breakdown: SentimentBreakdown;
  /** Sentiment analysis provider */
  provider: string;
  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Sentiment label options
 */
export type SentimentLabel =
  | 'very-positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very-negative';

/**
 * Detailed sentiment breakdown
 */
export interface SentimentBreakdown {
  /** Positive sentiment score */
  positive: number;
  /** Negative sentiment score */
  negative: number;
  /** Neutral sentiment score */
  neutral: number;
  /** Emotional indicators */
  emotions: EmotionScores;
}

/**
 * Emotion scores
 */
export interface EmotionScores {
  /** Joy/happiness score */
  joy: number;
  /** Fear score */
  fear: number;
  /** Anger score */
  anger: number;
  /** Sadness score */
  sadness: number;
  /** Surprise score */
  surprise: number;
  /** Disgust score */
  disgust: number;
}

/**
 * News category classification
 */
export type NewsCategory =
  | 'breaking-news'
  | 'market-news'
  | 'earnings'
  | 'economic-data'
  | 'company-news'
  | 'sector-news'
  | 'ipo'
  | 'mergers-acquisitions'
  | 'analyst-ratings'
  | 'dividend-news'
  | 'regulatory'
  | 'geopolitical'
  | 'cryptocurrency'
  | 'commodities'
  | 'forex'
  | 'central-bank'
  | 'inflation'
  | 'employment'
  | 'gdp'
  | 'trade'
  | 'technology'
  | 'healthcare'
  | 'energy'
  | 'finance'
  | 'real-estate'
  | 'consumer'
  | 'industrial'
  | 'utilities'
  | 'materials'
  | 'opinion'
  | 'analysis'
  | 'research';

/**
 * Article metadata
 */
export interface ArticleMetadata {
  /** Article word count */
  wordCount: number;
  /** Estimated reading time in minutes */
  readingTime: number;
  /** Article quality score (0-100) */
  qualityScore: number;
  /** Number of views */
  viewCount: number;
  /** Number of shares */
  shareCount: number;
  /** Article engagement score */
  engagementScore: number;
  /** SEO metadata */
  seo: SEOMetadata;
  /** Content analysis */
  analysis: ContentAnalysis;
}

/**
 * SEO metadata
 */
export interface SEOMetadata {
  /** Meta description */
  metaDescription?: string;
  /** Meta keywords */
  metaKeywords: string[];
  /** Open Graph data */
  openGraph?: OpenGraphData;
  /** Twitter Card data */
  twitterCard?: TwitterCardData;
}

/**
 * Open Graph metadata
 */
export interface OpenGraphData {
  /** OG title */
  title?: string;
  /** OG description */
  description?: string;
  /** OG image */
  image?: string;
  /** OG type */
  type?: string;
  /** OG URL */
  url?: string;
}

/**
 * Twitter Card metadata
 */
export interface TwitterCardData {
  /** Card type */
  card?: string;
  /** Twitter title */
  title?: string;
  /** Twitter description */
  description?: string;
  /** Twitter image */
  image?: string;
  /** Twitter creator */
  creator?: string;
}

/**
 * Content analysis results
 */
export interface ContentAnalysis {
  /** Key topics extracted */
  topics: string[];
  /** Named entities found */
  entities: NamedEntity[];
  /** Key phrases */
  keyPhrases: string[];
  /** Content complexity score */
  complexityScore: number;
  /** Readability score */
  readabilityScore: number;
  /** Factual accuracy indicators */
  factualIndicators: FactualIndicator[];
}

/**
 * Named entity information
 */
export interface NamedEntity {
  /** Entity text */
  text: string;
  /** Entity type */
  type: EntityType;
  /** Confidence score */
  confidence: number;
  /** Entity position in text */
  position: TextPosition;
  /** Additional entity metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Entity type options
 */
export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'stock-symbol'
  | 'currency'
  | 'date'
  | 'number'
  | 'percentage'
  | 'money'
  | 'product'
  | 'event';

/**
 * Text position information
 */
export interface TextPosition {
  /** Start character index */
  start: number;
  /** End character index */
  end: number;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
}

/**
 * Factual accuracy indicator
 */
export interface FactualIndicator {
  /** Claim or statement */
  claim: string;
  /** Accuracy confidence */
  confidence: number;
  /** Supporting sources */
  sources: string[];
  /** Verification status */
  status: VerificationStatus;
}

/**
 * Verification status options
 */
export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'disputed'
  | 'false';

/**
 * News filtering configuration
 */
export interface NewsFilter {
  /** Source filters */
  sources?: string[];
  /** Category filters */
  categories?: NewsCategory[];
  /** Asset symbol filters */
  assets?: string[];
  /** Date range filter */
  dateRange?: DateRange;
  /** Sentiment filter */
  sentiment?: SentimentLabel[];
  /** Language filter */
  languages?: string[];
  /** Importance threshold */
  minImportance?: number;
  /** Keyword filters */
  keywords?: string[];
  /** Exclude keywords */
  excludeKeywords?: string[];
  /** Author filters */
  authors?: string[];
  /** Tag filters */
  tags?: string[];
  /** Content type filters */
  contentTypes?: ContentType[];
}

/**
 * Date range filter
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Content type options
 */
export type ContentType =
  | 'article'
  | 'video'
  | 'podcast'
  | 'infographic'
  | 'press-release'
  | 'research-report';

/**
 * News search request
 */
export interface NewsSearchRequest {
  /** Search query */
  query?: string;
  /** Filters to apply */
  filters?: NewsFilter;
  /** Sort configuration */
  sort?: NewsSortConfig;
  /** Pagination */
  pagination?: PaginationRequest;
  /** Include full content */
  includeContent?: boolean;
  /** Include sentiment analysis */
  includeSentiment?: boolean;
}

/**
 * News sort configuration
 */
export interface NewsSortConfig {
  /** Field to sort by */
  field: NewsSortField;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * News sort field options
 */
export type NewsSortField =
  | 'publishedAt'
  | 'relevance'
  | 'importance'
  | 'sentiment'
  | 'viewCount'
  | 'shareCount'
  | 'engagementScore';

/**
 * Pagination request
 */
export interface PaginationRequest {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
}

/**
 * News search response
 */
export interface NewsSearchResponse {
  /** Found articles */
  articles: NewsArticle[];
  /** Total number of results */
  total: number;
  /** Pagination information */
  pagination: PaginationInfo;
  /** Search metadata */
  metadata: SearchMetadata;
  /** Aggregated insights */
  insights?: NewsInsights;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items */
  total: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
}

/**
 * Search metadata
 */
export interface SearchMetadata {
  /** Search execution time */
  executionTime: number;
  /** Data sources used */
  sources: string[];
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Search timestamp */
  timestamp: Date;
}

/**
 * News insights and analytics
 */
export interface NewsInsights {
  /** Sentiment distribution */
  sentimentDistribution: SentimentDistribution;
  /** Top topics */
  topTopics: TopicCount[];
  /** Source distribution */
  sourceDistribution: SourceCount[];
  /** Category distribution */
  categoryDistribution: CategoryCount[];
  /** Trending assets */
  trendingAssets: AssetMention[];
  /** Time series data */
  timeSeries: NewsTimeSeries[];
}

/**
 * Sentiment distribution
 */
export interface SentimentDistribution {
  /** Very positive count */
  veryPositive: number;
  /** Positive count */
  positive: number;
  /** Neutral count */
  neutral: number;
  /** Negative count */
  negative: number;
  /** Very negative count */
  veryNegative: number;
}

/**
 * Topic count information
 */
export interface TopicCount {
  /** Topic name */
  topic: string;
  /** Article count */
  count: number;
  /** Trend direction */
  trend: TrendDirection;
}

/**
 * Trend direction options
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Source count information
 */
export interface SourceCount {
  /** Source name */
  source: string;
  /** Article count */
  count: number;
  /** Average sentiment */
  avgSentiment: number;
}

/**
 * Category count information
 */
export interface CategoryCount {
  /** Category name */
  category: NewsCategory;
  /** Article count */
  count: number;
  /** Percentage of total */
  percentage: number;
}

/**
 * Asset mention information
 */
export interface AssetMention {
  /** Asset symbol */
  symbol: string;
  /** Asset name */
  name: string;
  /** Mention count */
  mentionCount: number;
  /** Average sentiment */
  avgSentiment: number;
  /** Trend direction */
  trend: TrendDirection;
}

/**
 * News time series data
 */
export interface NewsTimeSeries {
  /** Timestamp */
  timestamp: Date;
  /** Article count */
  count: number;
  /** Average sentiment */
  avgSentiment: number;
  /** Top category */
  topCategory: NewsCategory;
}

/**
 * News subscription configuration
 */
export interface NewsSubscription {
  /** Subscription ID */
  id: string;
  /** Subscription name */
  name: string;
  /** User ID */
  userId: string;
  /** Subscription filters */
  filters: NewsFilter;
  /** Notification settings */
  notifications: NewsNotificationSettings;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * News notification settings
 */
export interface NewsNotificationSettings {
  /** Enable notifications */
  enabled: boolean;
  /** Notification frequency */
  frequency: NotificationFrequency;
  /** Delivery methods */
  deliveryMethods: DeliveryMethod[];
  /** Minimum importance threshold */
  minImportance: number;
  /** Quiet hours */
  quietHours?: QuietHours;
}

/**
 * Subscription status options
 */
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

/**
 * Notification frequency options
 */
export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

/**
 * Delivery method options
 */
export type DeliveryMethod = 'push' | 'email' | 'sms' | 'webhook';

/**
 * Quiet hours configuration
 */
export interface QuietHours {
  /** Start time (24-hour format) */
  start: string;
  /** End time (24-hour format) */
  end: string;
  /** Timezone */
  timezone: string;
  /** Days of week (0=Sunday) */
  daysOfWeek: number[];
}

/**
 * News alert configuration
 */
export interface NewsAlert {
  /** Alert ID */
  id: string;
  /** Alert name */
  name: string;
  /** User ID */
  userId: string;
  /** Alert conditions */
  conditions: NewsAlertCondition[];
  /** Alert actions */
  actions: NewsAlertAction[];
  /** Alert enabled status */
  enabled: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last triggered timestamp */
  lastTriggered?: Date;
  /** Trigger count */
  triggerCount: number;
}

/**
 * News alert condition
 */
export interface NewsAlertCondition {
  /** Condition type */
  type: AlertConditionType;
  /** Condition parameters */
  parameters: Record<string, unknown>;
  /** Condition operator */
  operator: AlertOperator;
}

/**
 * Alert condition type options
 */
export type AlertConditionType =
  | 'keyword-mention'
  | 'asset-mention'
  | 'sentiment-threshold'
  | 'volume-spike'
  | 'breaking-news'
  | 'source-publish';

/**
 * Alert operator options
 */
export type AlertOperator =
  | 'contains'
  | 'equals'
  | 'greater-than'
  | 'less-than'
  | 'matches';

/**
 * News alert action
 */
export interface NewsAlertAction {
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
  | 'dashboard-highlight';

/**
 * News analytics request
 */
export interface NewsAnalyticsRequest {
  /** Time period */
  period: AnalyticsPeriod;
  /** Date range */
  dateRange?: DateRange;
  /** Filters to apply */
  filters?: NewsFilter;
  /** Metrics to include */
  metrics: AnalyticsMetric[];
  /** Grouping options */
  groupBy?: AnalyticsGroupBy[];
}

/**
 * Analytics period options
 */
export type AnalyticsPeriod =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

/**
 * Analytics metric options
 */
export type AnalyticsMetric =
  | 'article-count'
  | 'sentiment-average'
  | 'engagement-total'
  | 'source-diversity'
  | 'topic-coverage'
  | 'asset-mentions';

/**
 * Analytics grouping options
 */
export type AnalyticsGroupBy =
  | 'source'
  | 'category'
  | 'sentiment'
  | 'asset'
  | 'author'
  | 'time';

/**
 * News analytics response
 */
export interface NewsAnalyticsResponse {
  /** Analytics data */
  data: AnalyticsDataPoint[];
  /** Summary statistics */
  summary: AnalyticsSummary;
  /** Metadata */
  metadata: AnalyticsMetadata;
}

/**
 * Analytics data point
 */
export interface AnalyticsDataPoint {
  /** Timestamp or group key */
  key: string | Date;
  /** Metric values */
  values: Record<string, number>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  /** Total articles analyzed */
  totalArticles: number;
  /** Average sentiment */
  avgSentiment: number;
  /** Most mentioned asset */
  topAsset?: string;
  /** Most active source */
  topSource?: string;
  /** Dominant category */
  topCategory?: NewsCategory;
}

/**
 * Analytics metadata
 */
export interface AnalyticsMetadata {
  /** Analysis period */
  period: AnalyticsPeriod;
  /** Date range analyzed */
  dateRange: DateRange;
  /** Processing time */
  processingTime: number;
  /** Data completeness */
  completeness: number;
}
