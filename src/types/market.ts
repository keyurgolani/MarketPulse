/**
 * Market data types and interfaces for MarketPulse application
 * Handles asset data, pricing, historical data, and market information
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
  /** Last update timestamp */
  lastUpdated: Date;
  /** Data source */
  source: DataSource;
  /** Currency code */
  currency: string;
  /** Exchange name */
  exchange: string;
  /** Asset type */
  type: AssetType;
  /** Sector classification */
  sector?: string;
  /** Industry classification */
  industry?: string;
  /** Country of origin */
  country?: string;
  /** Whether market is currently open */
  isMarketOpen: boolean;
  /** Extended hours data */
  extendedHours?: ExtendedHoursData;
}

/**
 * Asset types
 */
export type AssetType =
  | 'stock'
  | 'etf'
  | 'mutual-fund'
  | 'index'
  | 'crypto'
  | 'forex'
  | 'commodity'
  | 'bond'
  | 'option'
  | 'future';

/**
 * Data sources for market data
 */
export type DataSource =
  | 'yahoo'
  | 'google'
  | 'alpha-vantage'
  | 'iex'
  | 'finnhub'
  | 'cache'
  | 'manual';

/**
 * Extended hours trading data
 */
export interface ExtendedHoursData {
  /** Pre-market price */
  preMarketPrice?: number;
  /** Pre-market change */
  preMarketChange?: number;
  /** Pre-market change percentage */
  preMarketChangePercent?: number;
  /** After-hours price */
  afterHoursPrice?: number;
  /** After-hours change */
  afterHoursChange?: number;
  /** After-hours change percentage */
  afterHoursChangePercent?: number;
  /** Last extended hours update */
  lastUpdated: Date;
}

/**
 * Historical price data
 */
export interface HistoricalData {
  /** Asset symbol */
  symbol: string;
  /** Time frame for the data */
  timeframe: string;
  /** Array of price points */
  data: PricePoint[];
  /** Technical indicators */
  indicators?: TechnicalIndicators;
  /** Data source */
  source: DataSource;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Individual price point in historical data
 */
export interface PricePoint {
  /** Timestamp for this data point */
  timestamp: Date;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
  /** Adjusted close (for splits/dividends) */
  adjustedClose?: number;
}

/**
 * Technical indicators data
 */
export interface TechnicalIndicators {
  /** Simple Moving Average */
  sma?: MovingAverageData[];
  /** Exponential Moving Average */
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
  /** Commodity Channel Index */
  cci?: CCIData[];
  /** Volume Weighted Average Price */
  vwap?: VWAPData[];
}

/**
 * Moving average data point
 */
export interface MovingAverageData {
  /** Timestamp */
  timestamp: Date;
  /** Moving average value */
  value: number;
  /** Period used for calculation */
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
  /** Period used */
  period: number;
  /** Standard deviations */
  stdDev: number;
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
  /** Period used */
  period: number;
}

/**
 * CCI data point
 */
export interface CCIData {
  /** Timestamp */
  timestamp: Date;
  /** CCI value */
  value: number;
  /** Period used */
  period: number;
}

/**
 * VWAP data point
 */
export interface VWAPData {
  /** Timestamp */
  timestamp: Date;
  /** VWAP value */
  value: number;
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
  /** Market statistics */
  statistics: MarketStatistics;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Market index data
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
  /** Last update */
  lastUpdated: Date;
}

/**
 * Market statistics
 */
export interface MarketStatistics {
  /** Total market cap */
  totalMarketCap: number;
  /** Number of advancing stocks */
  advancing: number;
  /** Number of declining stocks */
  declining: number;
  /** Number of unchanged stocks */
  unchanged: number;
  /** New 52-week highs */
  newHighs: number;
  /** New 52-week lows */
  newLows: number;
  /** Total volume */
  totalVolume: number;
  /** VIX (volatility index) */
  vix?: number;
}

/**
 * Asset search and filtering
 */
export interface AssetSearchFilters {
  /** Search query */
  query?: string;
  /** Asset types to include */
  types?: AssetType[];
  /** Exchanges to include */
  exchanges?: string[];
  /** Sectors to include */
  sectors?: string[];
  /** Industries to include */
  industries?: string[];
  /** Countries to include */
  countries?: string[];
  /** Price range */
  priceRange?: {
    min?: number;
    max?: number;
  };
  /** Market cap range */
  marketCapRange?: {
    min?: number;
    max?: number;
  };
  /** Volume range */
  volumeRange?: {
    min?: number;
    max?: number;
  };
  /** P/E ratio range */
  peRatioRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * Asset search result
 */
export interface AssetSearchResult {
  /** Matching assets */
  assets: Asset[];
  /** Total count */
  totalCount: number;
  /** Search metadata */
  metadata: SearchMetadata;
}

/**
 * Search metadata
 */
export interface SearchMetadata {
  /** Search query used */
  query: string;
  /** Filters applied */
  filters: AssetSearchFilters;
  /** Search duration in milliseconds */
  duration: number;
  /** Data sources used */
  sources: DataSource[];
  /** Cache hit/miss info */
  cached: boolean;
}

/**
 * Watchlist interface
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
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Sort order for assets */
  sortOrder?: WatchlistSortOrder;
}

/**
 * Watchlist sort options
 */
export interface WatchlistSortOrder {
  /** Field to sort by */
  field:
    | 'symbol'
    | 'name'
    | 'price'
    | 'change'
    | 'changePercent'
    | 'volume'
    | 'marketCap';
  /** Sort direction */
  direction: 'asc' | 'desc';
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
  type: AlertType;
  /** Alert condition */
  condition: AlertCondition;
  /** Target value */
  targetValue: number;
  /** Whether alert is active */
  isActive: boolean;
  /** User ID */
  userId: string;
  /** Alert message */
  message?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Whether alert has been triggered */
  triggered: boolean;
  /** Trigger timestamp */
  triggeredAt?: Date;
}

/**
 * Alert types
 */
export type AlertType = 'price' | 'volume' | 'change' | 'technical';

/**
 * Alert conditions
 */
export interface AlertCondition {
  /** Comparison operator */
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  /** Field to compare */
  field: 'price' | 'change' | 'changePercent' | 'volume';
  /** Comparison value */
  value: number;
}

/**
 * Market hours information
 */
export interface MarketHours {
  /** Exchange name */
  exchange: string;
  /** Whether market is currently open */
  isOpen: boolean;
  /** Market open time */
  openTime: string;
  /** Market close time */
  closeTime: string;
  /** Time zone */
  timezone: string;
  /** Pre-market hours */
  preMarket?: {
    openTime: string;
    closeTime: string;
  };
  /** After-hours trading */
  afterHours?: {
    openTime: string;
    closeTime: string;
  };
  /** Market holidays */
  holidays: Date[];
}

/**
 * Type guard to check if asset is a stock
 */
export function isStock(asset: Asset): boolean {
  return asset.type === 'stock';
}

/**
 * Type guard to check if asset is a cryptocurrency
 */
export function isCrypto(asset: Asset): boolean {
  return asset.type === 'crypto';
}

/**
 * Type guard to check if market is open for asset
 */
export function isMarketOpen(asset: Asset): boolean {
  return asset.isMarketOpen;
}

/**
 * Utility function to format price with appropriate decimal places
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const decimals = price < 1 ? 4 : price < 10 ? 3 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

/**
 * Utility function to format percentage change
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Utility function to format volume
 */
export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

/**
 * Utility function to format market cap
 */
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`;
  return marketCap.toString();
}
