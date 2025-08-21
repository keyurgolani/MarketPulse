/**
 * Technical Indicators Utilities
 * Calculations for various technical analysis indicators
 */

import type { PricePoint } from '@/types/market';

export type TechnicalIndicatorType =
  | 'SMA_10'
  | 'SMA_20'
  | 'SMA_50'
  | 'EMA_12'
  | 'EMA_26'
  | 'RSI'
  | 'MACD'
  | 'BOLLINGER';

export interface IndicatorResult {
  timestamp: Date;
  value: number | null;
}

export interface MACDResult {
  timestamp: Date;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface BollingerBandsResult {
  timestamp: Date;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(
  data: PricePoint[],
  period: number,
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({
        timestamp: data[i].timestamp,
        value: null,
      });
    } else {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, point) => acc + point[field], 0);
      results.push({
        timestamp: data[i].timestamp,
        value: sum / period,
      });
    }
  }

  return results;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(
  data: PricePoint[],
  period: number,
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      results.push({
        timestamp: data[i].timestamp,
        value: data[i][field],
      });
    } else {
      const previousEMA = results[i - 1].value || data[i - 1][field];
      const currentPrice = data[i][field];
      const ema = (currentPrice - previousEMA) * multiplier + previousEMA;

      results.push({
        timestamp: data[i].timestamp,
        value: ema,
      });
    }
  }

  return results;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(
  data: PricePoint[],
  period: number = 14,
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      results.push({
        timestamp: data[i].timestamp,
        value: null,
      });
      continue;
    }

    const change = data[i][field] - data[i - 1][field];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);

    if (i < period) {
      results.push({
        timestamp: data[i].timestamp,
        value: null,
      });
    } else {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

      const rs = avgGain / (avgLoss || 1);
      const rsi = 100 - 100 / (1 + rs);

      results.push({
        timestamp: data[i].timestamp,
        value: rsi,
      });
    }
  }

  return results;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: PricePoint[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): MACDResult[] {
  const fastEMA = calculateEMA(data, fastPeriod, field);
  const slowEMA = calculateEMA(data, slowPeriod, field);

  // Calculate MACD line
  const macdLine: IndicatorResult[] = [];
  for (let i = 0; i < data.length; i++) {
    const fastValue = fastEMA[i].value;
    const slowValue = slowEMA[i].value;

    if (fastValue !== null && slowValue !== null) {
      macdLine.push({
        timestamp: data[i].timestamp,
        value: fastValue - slowValue,
      });
    } else {
      macdLine.push({
        timestamp: data[i].timestamp,
        value: null,
      });
    }
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine: IndicatorResult[] = [];
  let emaValue: number | null = null;
  const multiplier = 2 / (signalPeriod + 1);

  for (let i = 0; i < macdLine.length; i++) {
    const macdValue = macdLine[i].value;

    if (macdValue === null) {
      signalLine.push({
        timestamp: data[i].timestamp,
        value: null,
      });
    } else if (emaValue === null) {
      emaValue = macdValue;
      signalLine.push({
        timestamp: data[i].timestamp,
        value: emaValue,
      });
    } else {
      emaValue = (macdValue - emaValue) * multiplier + emaValue;
      signalLine.push({
        timestamp: data[i].timestamp,
        value: emaValue,
      });
    }
  }

  // Combine results
  const results: MACDResult[] = [];
  for (let i = 0; i < data.length; i++) {
    const macdValue = macdLine[i].value;
    const signalValue = signalLine[i].value;

    results.push({
      timestamp: data[i].timestamp,
      macd: macdValue,
      signal: signalValue,
      histogram:
        macdValue !== null && signalValue !== null
          ? macdValue - signalValue
          : null,
    });
  }

  return results;
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  data: PricePoint[],
  period: number = 20,
  standardDeviations: number = 2,
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): BollingerBandsResult[] {
  const results: BollingerBandsResult[] = [];
  const sma = calculateSMA(data, period, field);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({
        timestamp: data[i].timestamp,
        upper: null,
        middle: null,
        lower: null,
      });
    } else {
      const middle = sma[i].value;
      if (middle === null) {
        results.push({
          timestamp: data[i].timestamp,
          upper: null,
          middle: null,
          lower: null,
        });
        continue;
      }

      // Calculate standard deviation
      const slice = data.slice(i - period + 1, i + 1);
      const variance =
        slice.reduce((acc, point) => {
          const diff = point[field] - middle;
          return acc + diff * diff;
        }, 0) / period;

      const stdDev = Math.sqrt(variance);

      results.push({
        timestamp: data[i].timestamp,
        upper: middle + standardDeviations * stdDev,
        middle: middle,
        lower: middle - standardDeviations * stdDev,
      });
    }
  }

  return results;
}

/**
 * Get indicator configuration
 */
export function getIndicatorConfig(type: TechnicalIndicatorType): {
  name: string;
  color: string;
  period?: number;
  description: string;
} {
  const configs = {
    SMA_10: {
      name: 'SMA (10)',
      color: '#3b82f6',
      period: 10,
      description: 'Simple Moving Average - 10 periods',
    },
    SMA_20: {
      name: 'SMA (20)',
      color: '#8b5cf6',
      period: 20,
      description: 'Simple Moving Average - 20 periods',
    },
    SMA_50: {
      name: 'SMA (50)',
      color: '#f59e0b',
      period: 50,
      description: 'Simple Moving Average - 50 periods',
    },
    EMA_12: {
      name: 'EMA (12)',
      color: '#10b981',
      period: 12,
      description: 'Exponential Moving Average - 12 periods',
    },
    EMA_26: {
      name: 'EMA (26)',
      color: '#ef4444',
      period: 26,
      description: 'Exponential Moving Average - 26 periods',
    },
    RSI: {
      name: 'RSI',
      color: '#6366f1',
      description: 'Relative Strength Index',
    },
    MACD: {
      name: 'MACD',
      color: '#ec4899',
      description: 'Moving Average Convergence Divergence',
    },
    BOLLINGER: {
      name: 'Bollinger Bands',
      color: '#14b8a6',
      description: 'Bollinger Bands (20, 2)',
    },
  };

  return configs[type];
}

/**
 * Calculate indicator data based on type
 */
export function calculateIndicator(
  data: PricePoint[],
  type: TechnicalIndicatorType
): IndicatorResult[] | MACDResult[] | BollingerBandsResult[] {
  switch (type) {
    case 'SMA_10':
      return calculateSMA(data, 10);
    case 'SMA_20':
      return calculateSMA(data, 20);
    case 'SMA_50':
      return calculateSMA(data, 50);
    case 'EMA_12':
      return calculateEMA(data, 12);
    case 'EMA_26':
      return calculateEMA(data, 26);
    case 'RSI':
      return calculateRSI(data);
    case 'MACD':
      return calculateMACD(data);
    case 'BOLLINGER':
      return calculateBollingerBands(data);
    default:
      return [];
  }
}

/**
 * Format indicator value for display
 */
export function formatIndicatorValue(
  value: number | null,
  type: TechnicalIndicatorType
): string {
  if (value === null) return 'N/A';

  switch (type) {
    case 'RSI':
      return value.toFixed(1);
    case 'SMA_10':
    case 'SMA_20':
    case 'SMA_50':
    case 'EMA_12':
    case 'EMA_26':
      return `$${value.toFixed(2)}`;
    case 'MACD':
    case 'BOLLINGER':
      return value.toFixed(3);
    default:
      return value.toFixed(2);
  }
}
