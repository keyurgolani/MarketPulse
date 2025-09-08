import { Asset, AssetPrice } from '@/types/asset';

/**
 * Format currency value with proper symbol and precision
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  precision: number = 2
): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value);
  } catch {
    // Fallback if currency is not supported
    return `$${value.toFixed(precision)}`;
  }
};

/**
 * Format price with appropriate precision based on value
 */
export const formatPrice = (
  price: number | null | undefined,
  currency: string = 'USD'
): string => {
  // Handle null, undefined, or invalid values
  if (price == null || !Number.isFinite(price)) {
    return 'N/A';
  }

  let precision = 2;

  // Use more precision for very small values
  if (price < 0.01) {
    precision = 6;
  } else if (price < 1) {
    precision = 4;
  }

  return formatCurrency(price, currency, precision);
};

/**
 * Format percentage change with sign and color indication
 */
export const formatPercentageChange = (
  change: number | null | undefined,
  precision: number = 2
): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
} => {
  // Handle null, undefined, or invalid values
  if (change == null || !Number.isFinite(change)) {
    return {
      formatted: 'N/A',
      isPositive: false,
      isNegative: false,
      isNeutral: true,
    };
  }

  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const sign = isPositive ? '+' : '';
  const formatted = `${sign}${change.toFixed(precision)}%`;

  return {
    formatted,
    isPositive,
    isNegative,
    isNeutral,
  };
};

/**
 * Format absolute change with currency
 */
export const formatAbsoluteChange = (
  change: number | null | undefined,
  currency: string = 'USD'
): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
} => {
  // Handle null, undefined, or invalid values
  if (change == null || !Number.isFinite(change)) {
    return {
      formatted: 'N/A',
      isPositive: false,
      isNegative: false,
      isNeutral: true,
    };
  }

  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const sign = isPositive ? '+' : '';
  const formatted = `${sign}${formatCurrency(change, currency)}`;

  return {
    formatted,
    isPositive,
    isNegative,
    isNeutral,
  };
};

/**
 * Format large numbers (market cap, volume) with appropriate suffixes
 */
export const formatLargeNumber = (value: number | null | undefined): string => {
  // Handle null, undefined, or invalid values
  if (value == null || !Number.isFinite(value)) {
    return 'N/A';
  }

  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(0);
};

/**
 * Format volume with appropriate units
 */
export const formatVolume = (volume: number | null | undefined): string => {
  return formatLargeNumber(volume);
};

/**
 * Format market cap with currency
 */
export const formatMarketCap = (
  marketCap: number | null | undefined,
  currency: string = 'USD'
): string => {
  const formatted = formatLargeNumber(marketCap);
  if (formatted === 'N/A') {
    return 'N/A';
  }
  const currencySymbol = currency === 'USD' ? '$' : currency;
  return `${currencySymbol}${formatted}`;
};

/**
 * Get color classes for price changes
 */
export const getPriceChangeColorClasses = (
  change: number | null | undefined
): {
  text: string;
  background: string;
  border: string;
} => {
  // Handle null, undefined, or invalid values - treat as neutral
  if (change == null || !Number.isFinite(change)) {
    return {
      text: 'text-gray-600 dark:text-gray-400',
      background: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
    };
  }

  if (change > 0) {
    return {
      text: 'text-green-600 dark:text-green-400',
      background: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
    };
  } else if (change < 0) {
    return {
      text: 'text-red-600 dark:text-red-400',
      background: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
    };
  } else {
    return {
      text: 'text-gray-600 dark:text-gray-400',
      background: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
    };
  }
};

/**
 * Format asset symbol for display
 */
export const formatAssetSymbol = (symbol: string): string => {
  return symbol.toUpperCase();
};

/**
 * Format asset name for display
 */
export const formatAssetName = (name: string, maxLength?: number): string => {
  if (maxLength && name.length > maxLength) {
    return `${name.substring(0, maxLength - 3)}...`;
  }
  return name;
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch {
    return 'Unknown';
  }
};

/**
 * Get asset type display name
 */
export const getAssetTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    stock: 'Stock',
    etf: 'ETF',
    crypto: 'Cryptocurrency',
    forex: 'Currency',
    commodity: 'Commodity',
    index: 'Index',
    bond: 'Bond',
  };

  return typeMap[type.toLowerCase()] ?? type;
};

/**
 * Calculate price change from current and previous price
 */
export const calculatePriceChange = (
  currentPrice: number,
  previousPrice: number
): {
  absoluteChange: number;
  percentageChange: number;
} => {
  const absoluteChange = currentPrice - previousPrice;
  const percentageChange =
    previousPrice !== 0 ? (absoluteChange / previousPrice) * 100 : 0;

  return {
    absoluteChange,
    percentageChange,
  };
};

/**
 * Format asset for display with all relevant information
 */
export const formatAssetForDisplay = (
  asset: Asset,
  price?: AssetPrice,
  options?: {
    showCurrency?: boolean;
    showExchange?: boolean;
    showSector?: boolean;
    showMarketCap?: boolean;
    maxNameLength?: number;
  }
): {
  symbol: string;
  name: string;
  price?: string;
  change?: {
    absolute: string;
    percentage: string;
    colorClasses: ReturnType<typeof getPriceChangeColorClasses>;
  };
  volume?: string;
  marketCap?: string;
  sector?: string;
  exchange?: string;
  lastUpdated?: string;
} => {
  const result: ReturnType<typeof formatAssetForDisplay> = {
    symbol: formatAssetSymbol(asset.symbol),
    name: formatAssetName(asset.name, options?.maxNameLength),
  };

  if (price) {
    result.price = formatPrice(price.price, asset.currency);

    if (
      price.change_amount !== undefined &&
      price.change_percent !== undefined
    ) {
      const colorClasses = getPriceChangeColorClasses(price.change_amount);
      result.change = {
        absolute: formatAbsoluteChange(price.change_amount, asset.currency)
          .formatted,
        percentage: formatPercentageChange(price.change_percent).formatted,
        colorClasses,
      };
    }

    if (price.volume !== undefined && price.volume !== null) {
      result.volume = formatVolume(price.volume);
    }

    if (price.timestamp) {
      result.lastUpdated = formatTimestamp(price.timestamp);
    }
  }

  if (options?.showMarketCap && asset.market_cap) {
    result.marketCap = formatMarketCap(asset.market_cap, asset.currency);
  }

  if (options?.showSector && asset.sector) {
    result.sector = asset.sector;
  }

  if (options?.showExchange && asset.exchange) {
    result.exchange = asset.exchange;
  }

  return result;
};
