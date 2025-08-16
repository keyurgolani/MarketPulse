/**
 * Market data and asset type definitions for MarketPulse application
 * Handles real-time and historical market data, technical indicators, and asset information
 */

/**
 * Core asset interface
 */
export interface Asset {
  /** Asset symbol (e.g., AAPL, GOOGL) */
  symbol: string;
  /** Full company/asset name */
  name: string;
  /** Current price */
  price: number;
  /** Price change from previous close */
  change: number;
  /** Percentage change from previous close */
  changePercent: number;
  /** Trading volume */
  volume: number;
  /** Market capitalization */
  marketCap?: number;
  /** Day's high price */
  dayHigh?: number;
  /** Day's low price */
  dayLow?: number;
  /** 52-week high price */
  yearHigh?: number;
  /** 52-week low price */
  yearLow?: number;
  /** Previous close price */
  previousClose?: number;
  /** Opening price */
  openPrice?: number;
  /** Average volume */
  avgVolume?: number;
  /** Price-to-earnings ratio */
  peRatio?: number;
  /** Dividend yield */
  dividendYield?: number;
  /** Earnings per share */
  eps?: number;
  /** Beta coefficient */
  beta?: number;
  /** Last update timestamp */
  lastUpdated: Date;
  /** Data source */
  source: DataSource;
  /** Currency code */
  currency: string;
  /** Exchange name */
  exchange: string;
  /** Asset type */
  assetType: AssetType;
  /** Sector classification */
  sector?: string;
  /** Industry classification */
  industry?: string;
  /** Asset status */
  status: AssetStatus;
}

/**
 * Asset type categories
 */
export type AssetType =
  | 'stock'
  | 'etf'
  | 'mutual-fund'
  | 'bond'
  | 'commodity'
  | 'currency'
  | 'crypto'
  | 'index'
  | 'option'
  | 'future';

/**
 * Asset status options
 */
export type AssetStatus =
  | 'active'
  | 'halted'
  | 'suspended'
  | 'delisted'
  | 'pre-market'
  | 'after-hours';

/**
 * Data source options
 */
export type DataSource =
  | 'yahoo'
  | 'google'
  | 'alpha-vantage'
  | 'finnhub'
  | 'iex'
  | 'cache'
  | 'websocket';

/**
 * Historical market data
 */
export interface HistoricalData {
  /** Asset symbol */
  symbol: string;
  /** Time period */
  timeframe: string;
  /** Historical price points */
  data: PricePoint[];
  /** Technical indicators */
  indicators?: TechnicalIndicators;
  /** Data source */
  source: DataSource;
  /** Last update timestamp */
  lastUpdated: Date;
  /** Data quality metrics */
  quality: DataQuality;
}

/**
 * Individual price point in historical data
 */
export interface PricePoint {
  /** Timestamp */
  timestamp: Date;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Adjusted closing price */
  adjustedClose?: number;
  /** Trading volume */
  volume: number;
  /** Volume-weighted average price */
  vwap?: number;
}

/**
 * Technical indicators collection
 */
export interface TechnicalIndicators {
  /** Simple Moving Averages */
  sma?: MovingAverageData[];
  /** Exponential Moving Averages */
  ema?: MovingAverageData[];
  /** Relative Strength Index */
  rsi?: RSIData[];
  /** MACD (Moving Average Convergence Divergence) */
  macd?: MACDData[];
  /** Bollinger Bands */
  bollinger?: BollingerBands[];
  /** Stochastic Oscillator */
  stochastic?: StochasticData[];
  /** Williams %R */
  williams?: WilliamsData[];
  /** Average True Range */
  atr?: ATRData[];
  /** Volume indicators */
  volume?: VolumeIndicators;
}

/**
 * Moving average data point
 */
export interface MovingAverageData {
  /** Timestamp */
  timestamp: Date;
  /** Moving average value */
  value: number;
  /** Period (e.g., 20, 50, 200) */
  period: number;
}

/**
 * RSI data point
 */
export interface RSIData {
  /** Timestamp */
  timestamp: Date;
  /** RSI value (0-100) */
  value: number;
  /** Period used for calculation */
  period: number;
}

/**
 * MACD data point
 */
export interface MACDData {
  /** Timestamp */
  timestamp: Date;
  /** MACD line value */
  macd: number;
  /** Signal line value */
  signal: number;
  /** Histogram value */
  histogram: number;
  /** Fast period */
  fastPeriod: number;
  /** Slow period */
  slowPeriod: number;
  /** Signal period */
  signalPeriod: number;
}

/**
 * Bollinger Bands data point
 */
export interface BollingerBands {
  /** Timestamp */
  timestamp: Date;
  /** Upper band */
  upper: number;
  /** Middle band (SMA) */
  middle: number;
  /** Lower band */
  lower: number;
  /** Standard deviation multiplier */
  stdDev: number;
  /** Period used for calculation */
  period: number;
}

/**
 * Stochastic oscillator data point
 */
export interface StochasticData {
  /** Timestamp */
  timestamp: Date;
  /** %K value */
  k: number;
  /** %D value */
  d: number;
  /** K period */
  kPeriod: number;
  /** D period */
  dPeriod: number;
}

/**
 * Williams %R data point
 */
export interface WilliamsData {
  /** Timestamp */
  timestamp: Date;
  /** Williams %R value */
  value: number;
  /** Period used for calculation */
  period: number;
}

/**
 * Average True Range data point
 */
export interface ATRData {
  /** Timestamp */
  timestamp: Date;
  /** ATR value */
  value: number;
  /** Period used for calculation */
  period: number;
}

/**
 * Volume indicators
 */
export interface VolumeIndicators {
  /** On-Balance Volume */
  obv?: OBVData[];
  /** Volume Rate of Change */
  vroc?: VROCData[];
  /** Accumulation/Distribution Line */
  adl?: ADLData[];
}

/**
 * On-Balance Volume data point
 */
export interface OBVData {
  /** Timestamp */
  timestamp: Date;
  /** OBV value */
  value: number;
}

/**
 * Volume Rate of Change data point
 */
export interface VROCData {
  /** Timestamp */
  timestamp: Date;
  /** VROC value */
  value: number;
  /** Period used for calculation */
  period: number;
}

/**
 * Accumulation/Distribution Line data point
 */
export interface ADLData {
  /** Timestamp */
  timestamp: Date;
  /** ADL value */
  value: number;
}

/**
 * Data quality metrics
 */
export interface DataQuality {
  /** Completeness percentage (0-100) */
  completeness: number;
  /** Data accuracy score (0-100) */
  accuracy: number;
  /** Timeliness score (0-100) */
  timeliness: number;
  /** Number of missing data points */
  missingPoints: number;
  /** Number of outliers detected */
  outliers: number;
  /** Last quality check timestamp */
  lastChecked: Date;
}

/**
 * Market summary information
 */
export interface MarketSummary {
  /** Major market indices */
  indices: MarketIndex[];
  /** Top gaining stocks */
  topGainers: Asset[];
  /** Top losing stocks */
  topLosers: Asset[];
  /** Most actively traded stocks */
  mostActive: Asset[];
  /** Market sentiment indicators */
  sentiment: MarketSentiment;
  /** Economic indicators */
  economic: EconomicIndicators;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Market index information
 */
export interface MarketIndex {
  /** Index symbol */
  symbol: string;
  /** Index name */
  name: string;
  /** Current value */
  value: number;
  /** Change from previous close */
  change: number;
  /** Percentage change */
  changePercent: number;
  /** Previous close */
  previousClose: number;
  /** Day's high */
  dayHigh: number;
  /** Day's low */
  dayLow: number;
  /** Trading volume */
  volume?: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Market sentiment indicators
 */
export interface MarketSentiment {
  /** VIX (Volatility Index) */
  vix: number;
  /** Put/Call ratio */
  putCallRatio: number;
  /** Advance/Decline ratio */
  advanceDeclineRatio: number;
  /** Fear & Greed Index */
  fearGreedIndex: number;
  /** Overall sentiment score (-1 to 1) */
  overallSentiment: number;
  /** Sentiment label */
  sentimentLabel: SentimentLabel;
}

/**
 * Sentiment label options
 */
export type SentimentLabel =
  | 'extreme-fear'
  | 'fear'
  | 'neutral'
  | 'greed'
  | 'extreme-greed';

/**
 * Economic indicators
 */
export interface EconomicIndicators {
  /** GDP growth rate */
  gdpGrowth?: number;
  /** Inflation rate */
  inflationRate?: number;
  /** Unemployment rate */
  unemploymentRate?: number;
  /** Interest rates */
  interestRates: InterestRates;
  /** Currency exchange rates */
  exchangeRates: ExchangeRate[];
  /** Commodity prices */
  commodities: CommodityPrice[];
}

/**
 * Interest rates information
 */
export interface InterestRates {
  /** Federal funds rate */
  federalFunds: number;
  /** 10-year treasury yield */
  treasury10Y: number;
  /** 2-year treasury yield */
  treasury2Y: number;
  /** Prime rate */
  prime: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Exchange rate information
 */
export interface ExchangeRate {
  /** Currency pair (e.g., USD/EUR) */
  pair: string;
  /** Exchange rate */
  rate: number;
  /** Change from previous */
  change: number;
  /** Percentage change */
  changePercent: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Commodity price information
 */
export interface CommodityPrice {
  /** Commodity name */
  name: string;
  /** Commodity symbol */
  symbol: string;
  /** Current price */
  price: number;
  /** Price unit */
  unit: string;
  /** Change from previous */
  change: number;
  /** Percentage change */
  changePercent: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Asset search and filtering
 */
export interface AssetSearchRequest {
  /** Search query */
  query?: string;
  /** Asset types to include */
  assetTypes?: AssetType[];
  /** Exchanges to include */
  exchanges?: string[];
  /** Sectors to include */
  sectors?: string[];
  /** Industries to include */
  industries?: string[];
  /** Currency filter */
  currency?: string;
  /** Market cap range */
  marketCapRange?: NumberRange;
  /** Price range */
  priceRange?: NumberRange;
  /** Volume range */
  volumeRange?: NumberRange;
  /** Sort configuration */
  sort?: AssetSortConfig;
  /** Pagination */
  pagination?: PaginationRequest;
}

/**
 * Number range filter
 */
export interface NumberRange {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
}

/**
 * Asset sort configuration
 */
export interface AssetSortConfig {
  /** Field to sort by */
  field: AssetSortField;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Asset sort field options
 */
export type AssetSortField =
  | 'symbol'
  | 'name'
  | 'price'
  | 'change'
  | 'changePercent'
  | 'volume'
  | 'marketCap'
  | 'peRatio'
  | 'dividendYield'
  | 'lastUpdated';

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
 * Asset search response
 */
export interface AssetSearchResponse {
  /** Found assets */
  assets: Asset[];
  /** Total number of results */
  total: number;
  /** Pagination information */
  pagination: PaginationInfo;
  /** Search metadata */
  metadata: SearchMetadata;
}

/**
 * Search metadata
 */
export interface SearchMetadata {
  /** Search execution time in milliseconds */
  executionTime: number;
  /** Data sources used */
  sources: DataSource[];
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Search timestamp */
  timestamp: Date;
}

/**
 * Real-time quote subscription
 */
export interface QuoteSubscription {
  /** Subscription ID */
  id: string;
  /** Asset symbols to subscribe to */
  symbols: string[];
  /** Subscription type */
  type: SubscriptionType;
  /** Update frequency */
  frequency: UpdateFrequency;
  /** Callback for updates */
  onUpdate: (quote: RealTimeQuote) => void;
  /** Callback for errors */
  onError: (error: SubscriptionError) => void;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Subscription type options
 */
export type SubscriptionType = 'quote' | 'trade' | 'level1' | 'level2';

/**
 * Update frequency options
 */
export type UpdateFrequency = 'real-time' | '1s' | '5s' | '10s' | '30s' | '1m';

/**
 * Subscription status options
 */
export type SubscriptionStatus = 'active' | 'paused' | 'error' | 'disconnected';

/**
 * Real-time quote data
 */
export interface RealTimeQuote {
  /** Asset symbol */
  symbol: string;
  /** Current price */
  price: number;
  /** Price change */
  change: number;
  /** Percentage change */
  changePercent: number;
  /** Bid price */
  bid?: number;
  /** Ask price */
  ask?: number;
  /** Bid size */
  bidSize?: number;
  /** Ask size */
  askSize?: number;
  /** Last trade size */
  lastSize?: number;
  /** Trading volume */
  volume: number;
  /** Quote timestamp */
  timestamp: Date;
  /** Market status */
  marketStatus: MarketStatus;
}

/**
 * Market status options
 */
export type MarketStatus =
  | 'pre-market'
  | 'open'
  | 'closed'
  | 'after-hours'
  | 'holiday';

/**
 * Subscription error information
 */
export interface SubscriptionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Affected symbols */
  symbols?: string[];
  /** Error timestamp */
  timestamp: Date;
  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * Market hours information
 */
export interface MarketHours {
  /** Market name */
  market: string;
  /** Market timezone */
  timezone: string;
  /** Regular trading hours */
  regular: TradingSession;
  /** Pre-market hours */
  preMarket?: TradingSession;
  /** After-hours trading */
  afterHours?: TradingSession;
  /** Current market status */
  currentStatus: MarketStatus;
  /** Next market open time */
  nextOpen?: Date;
  /** Next market close time */
  nextClose?: Date;
  /** Whether market is currently open */
  isOpen: boolean;
}

/**
 * Trading session information
 */
export interface TradingSession {
  /** Session start time */
  start: string;
  /** Session end time */
  end: string;
  /** Days of week (0=Sunday, 6=Saturday) */
  daysOfWeek: number[];
  /** Whether session is currently active */
  isActive: boolean;
}

/**
 * Price alert configuration
 */
export interface PriceAlert {
  /** Alert ID */
  id: string;
  /** Asset symbol */
  symbol: string;
  /** Alert type */
  type: PriceAlertType;
  /** Target price */
  targetPrice: number;
  /** Alert condition */
  condition: AlertCondition;
  /** Alert message */
  message: string;
  /** Alert enabled status */
  enabled: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Trigger count */
  triggerCount: number;
  /** Last triggered timestamp */
  lastTriggered?: Date;
}

/**
 * Price alert type options
 */
export type PriceAlertType =
  | 'price-above'
  | 'price-below'
  | 'price-change'
  | 'volume-spike';

/**
 * Alert condition options
 */
export type AlertCondition = 'once' | 'every-time' | 'daily' | 'weekly';

/**
 * Watchlist configuration
 */
export interface Watchlist {
  /** Watchlist ID */
  id: string;
  /** Watchlist name */
  name: string;
  /** Watchlist description */
  description?: string;
  /** Asset symbols in watchlist */
  symbols: string[];
  /** Watchlist owner */
  ownerId: string;
  /** Whether watchlist is public */
  isPublic: boolean;
  /** Watchlist tags */
  tags: string[];
  /** Sort configuration */
  sortConfig: AssetSortConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Watchlist metadata */
  metadata: WatchlistMetadata;
}

/**
 * Watchlist metadata
 */
export interface WatchlistMetadata {
  /** Number of views */
  viewCount: number;
  /** Number of followers */
  followerCount: number;
  /** Performance metrics */
  performance: WatchlistPerformance;
  /** Last accessed timestamp */
  lastAccessed?: Date;
}

/**
 * Watchlist performance metrics
 */
export interface WatchlistPerformance {
  /** Total return percentage */
  totalReturn: number;
  /** Average return percentage */
  averageReturn: number;
  /** Best performing asset */
  bestPerformer: string;
  /** Worst performing asset */
  worstPerformer: string;
  /** Volatility measure */
  volatility: number;
  /** Sharpe ratio */
  sharpeRatio?: number;
}
