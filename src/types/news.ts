/**
 * News and content types for MarketPulse application
 * Handles news articles, content aggregation, and sentiment analysis
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
  /** Full article content (optional) */
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
  /** Article reading time in minutes */
  readingTime?: number;
  /** Article engagement metrics */
  engagement?: EngagementMetrics;
  /** Whether article is breaking news */
  isBreaking: boolean;
  /** Article priority score */
  priority: number;
  /** Last update timestamp */
  lastUpdated: Date;
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
  /** Source category */
  category: SourceCategory;
  /** Source country */
  country: string;
  /** Source language */
  language: string;
  /** Whether source is verified */
  isVerified: boolean;
  /** Source RSS feed URL */
  rssUrl?: string;
}

/**
 * Political bias classification
 */
export type PoliticalBias =
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right';

/**
 * Source categories
 */
export type SourceCategory =
  | 'financial'
  | 'business'
  | 'technology'
  | 'general'
  | 'wire-service'
  | 'blog'
  | 'social-media'
  | 'government'
  | 'research';

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
  breakdown?: SentimentBreakdown;
  /** Sentiment analysis provider */
  provider: string;
  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Sentiment labels
 */
export type SentimentLabel =
  | 'very-negative'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'very-positive';

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
  /** Key phrases contributing to sentiment */
  keyPhrases: string[];
  /** Emotional indicators */
  emotions?: EmotionAnalysis;
}

/**
 * Emotion analysis
 */
export interface EmotionAnalysis {
  /** Joy/happiness level */
  joy: number;
  /** Fear level */
  fear: number;
  /** Anger level */
  anger: number;
  /** Sadness level */
  sadness: number;
  /** Surprise level */
  surprise: number;
  /** Disgust level */
  disgust: number;
}

/**
 * News categories
 */
export type NewsCategory =
  | 'market-news'
  | 'earnings'
  | 'economic-data'
  | 'company-news'
  | 'analysis'
  | 'breaking-news'
  | 'mergers-acquisitions'
  | 'ipo'
  | 'dividends'
  | 'regulatory'
  | 'technology'
  | 'crypto'
  | 'commodities'
  | 'forex'
  | 'bonds'
  | 'real-estate'
  | 'energy'
  | 'healthcare'
  | 'consumer'
  | 'industrial'
  | 'financial-services';

/**
 * Article engagement metrics
 */
export interface EngagementMetrics {
  /** Number of views */
  views: number;
  /** Number of shares */
  shares: number;
  /** Number of comments */
  comments: number;
  /** Number of likes/reactions */
  likes: number;
  /** Click-through rate */
  clickThroughRate?: number;
  /** Average time spent reading */
  avgTimeSpent?: number;
  /** Bounce rate */
  bounceRate?: number;
}

/**
 * News filtering options
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
  /** Breaking news only */
  breakingOnly?: boolean;
  /** Minimum reliability score */
  minReliability?: number;
  /** Search keywords */
  keywords?: string[];
  /** Exclude keywords */
  excludeKeywords?: string[];
  /** Author filter */
  authors?: string[];
  /** Country filter */
  countries?: string[];
}

/**
 * Date range for filtering
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * News search result
 */
export interface NewsSearchResult {
  /** Matching articles */
  articles: NewsArticle[];
  /** Total count */
  totalCount: number;
  /** Search metadata */
  metadata: NewsSearchMetadata;
  /** Aggregated sentiment */
  aggregatedSentiment?: AggregatedSentiment;
  /** Trending topics */
  trendingTopics?: TrendingTopic[];
}

/**
 * News search metadata
 */
export interface NewsSearchMetadata {
  /** Search query */
  query?: string;
  /** Filters applied */
  filters: NewsFilter;
  /** Search duration */
  duration: number;
  /** Sources queried */
  sourcesQueried: string[];
  /** Cache information */
  cached: boolean;
  /** Last refresh */
  lastRefresh: Date;
}

/**
 * Aggregated sentiment across multiple articles
 */
export interface AggregatedSentiment {
  /** Overall sentiment score */
  overallScore: number;
  /** Overall sentiment label */
  overallLabel: SentimentLabel;
  /** Sentiment distribution */
  distribution: SentimentDistribution;
  /** Sentiment trend over time */
  trend?: SentimentTrend[];
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
 * Sentiment trend data point
 */
export interface SentimentTrend {
  /** Timestamp */
  timestamp: Date;
  /** Sentiment score at this time */
  score: number;
  /** Article count at this time */
  articleCount: number;
}

/**
 * Trending topic
 */
export interface TrendingTopic {
  /** Topic/keyword */
  topic: string;
  /** Mention count */
  mentions: number;
  /** Trend score */
  trendScore: number;
  /** Related assets */
  relatedAssets: string[];
  /** Sentiment for this topic */
  sentiment: SentimentLabel;
  /** Topic category */
  category?: string;
}

/**
 * News alert configuration
 */
export interface NewsAlert {
  /** Alert ID */
  id: string;
  /** User ID */
  userId: string;
  /** Alert name */
  name: string;
  /** Keywords to watch */
  keywords: string[];
  /** Assets to watch */
  assets?: string[];
  /** Sources to monitor */
  sources?: string[];
  /** Categories to monitor */
  categories?: NewsCategory[];
  /** Sentiment threshold */
  sentimentThreshold?: SentimentLabel;
  /** Whether alert is active */
  isActive: boolean;
  /** Alert frequency */
  frequency: AlertFrequency;
  /** Delivery method */
  deliveryMethod: DeliveryMethod[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last triggered */
  lastTriggered?: Date;
}

/**
 * Alert frequency options
 */
export type AlertFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

/**
 * Alert delivery methods
 */
export type DeliveryMethod = 'email' | 'push' | 'sms' | 'in-app';

/**
 * News feed configuration
 */
export interface NewsFeedConfig {
  /** Feed ID */
  id: string;
  /** Feed name */
  name: string;
  /** User ID */
  userId: string;
  /** Feed filters */
  filters: NewsFilter;
  /** Refresh interval in minutes */
  refreshInterval: number;
  /** Maximum articles to keep */
  maxArticles: number;
  /** Sort order */
  sortBy: NewsSortOption;
  /** Whether to show images */
  showImages: boolean;
  /** Whether to show summaries */
  showSummaries: boolean;
  /** Auto-refresh enabled */
  autoRefresh: boolean;
}

/**
 * News sorting options
 */
export type NewsSortOption =
  | 'publishedAt'
  | 'relevance'
  | 'popularity'
  | 'sentiment'
  | 'source-reliability';

/**
 * News analytics data
 */
export interface NewsAnalytics {
  /** Time period */
  period: AnalyticsPeriod;
  /** Total articles */
  totalArticles: number;
  /** Articles by category */
  byCategory: CategoryBreakdown[];
  /** Articles by source */
  bySource: SourceBreakdown[];
  /** Sentiment analysis */
  sentimentAnalysis: AggregatedSentiment;
  /** Top trending topics */
  trendingTopics: TrendingTopic[];
  /** Most mentioned assets */
  topAssets: AssetMention[];
  /** Engagement metrics */
  engagement: EngagementMetrics;
}

/**
 * Analytics time periods
 */
export type AnalyticsPeriod = '1h' | '6h' | '1d' | '1w' | '1m' | '3m' | '1y';

/**
 * Category breakdown for analytics
 */
export interface CategoryBreakdown {
  /** Category name */
  category: NewsCategory;
  /** Article count */
  count: number;
  /** Percentage of total */
  percentage: number;
  /** Average sentiment */
  avgSentiment: number;
}

/**
 * Source breakdown for analytics
 */
export interface SourceBreakdown {
  /** Source name */
  source: string;
  /** Article count */
  count: number;
  /** Percentage of total */
  percentage: number;
  /** Average reliability */
  avgReliability: number;
}

/**
 * Asset mention in news
 */
export interface AssetMention {
  /** Asset symbol */
  symbol: string;
  /** Asset name */
  name: string;
  /** Mention count */
  mentions: number;
  /** Average sentiment */
  avgSentiment: number;
  /** Trend direction */
  trend: 'up' | 'down' | 'stable';
}

/**
 * Type guard to check if article is breaking news
 */
export function isBreakingNews(article: NewsArticle): boolean {
  return article.isBreaking;
}

/**
 * Type guard to check if article has positive sentiment
 */
export function hasPositiveSentiment(article: NewsArticle): boolean {
  return (
    article.sentiment?.label === 'positive' ||
    article.sentiment?.label === 'very-positive'
  );
}

/**
 * Type guard to check if article has negative sentiment
 */
export function hasNegativeSentiment(article: NewsArticle): boolean {
  return (
    article.sentiment?.label === 'negative' ||
    article.sentiment?.label === 'very-negative'
  );
}

/**
 * Utility function to get sentiment color
 */
export function getSentimentColor(sentiment: SentimentLabel): string {
  const colors = {
    'very-positive': '#22c55e',
    positive: '#84cc16',
    neutral: '#6b7280',
    negative: '#f59e0b',
    'very-negative': '#ef4444',
  };
  return colors[sentiment];
}

/**
 * Utility function to format reading time
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min read';
  if (minutes === 1) return '1 min read';
  return `${Math.round(minutes)} min read`;
}

/**
 * Utility function to calculate article age
 */
export function getArticleAge(publishedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - publishedAt.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return publishedAt.toLocaleDateString();
}
