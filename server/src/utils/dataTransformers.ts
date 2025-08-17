/**
 * Data Transformers
 * Utilities for transforming and normalizing data from different API sources
 */

import {
  HistoricalData,
  HistoricalDataPoint,
  SearchResult,
} from '../services/YahooFinanceService';
import { logger } from './logger';

export interface RawYahooQuoteResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        longName?: string;
        shortName?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketVolume?: number;
        marketCap?: number;
        currency?: string;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: number[];
          high?: number[];
          low?: number[];
          close?: number[];
          volume?: number[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

export interface RawYahooSearchResponse {
  quotes?: Array<{
    symbol?: string;
    longname?: string;
    shortname?: string;
    quoteType?: string;
    exchange?: string;
    sector?: string;
    industry?: string;
  }>;
  news?: unknown[];
  nav?: unknown[];
}

export interface NormalizedQuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  currency?: string;
  exchange?: string;
  lastUpdated: Date;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DataTransformers {
  /**
   * Transform Yahoo Finance quote response to normalized format
   */
  static transformYahooQuote(
    response: RawYahooQuoteResponse,
    symbol: string
  ): NormalizedQuoteData {
    try {
      const result = response.chart?.result?.[0];

      if (!result) {
        throw new Error('No result data in Yahoo Finance response');
      }

      if (response.chart?.error) {
        throw new Error(
          `Yahoo Finance API error: ${response.chart.error.description}`
        );
      }

      const meta = result.meta;
      if (!meta) {
        throw new Error('No metadata in Yahoo Finance response');
      }

      const currentPrice = meta.regularMarketPrice ?? meta.previousClose ?? 0;
      const previousClose = meta.previousClose ?? 0;
      const change = currentPrice - previousClose;
      const changePercent =
        previousClose !== 0 ? (change / previousClose) * 100 : 0;

      const normalizedData: NormalizedQuoteData = {
        symbol: meta.symbol || symbol.toUpperCase(),
        name: meta.longName || meta.shortName || symbol,
        price: this.roundToDecimals(currentPrice, 2),
        change: this.roundToDecimals(change, 2),
        changePercent: this.roundToDecimals(changePercent, 2),
        volume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap || 0,
        currency: meta.currency || 'USD',
        exchange: meta.exchangeName || 'Unknown',
        lastUpdated: new Date(),
        source: 'Yahoo Finance',
        metadata: {
          previousClose,
          regularMarketPrice: meta.regularMarketPrice,
        },
      };

      // Validate the transformed data
      const validation = this.validateQuoteData(normalizedData);
      if (!validation.isValid) {
        logger.warn('Quote data validation failed', {
          symbol,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      return normalizedData;
    } catch (error) {
      logger.error('Failed to transform Yahoo Finance quote', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: JSON.stringify(response).substring(0, 500),
      });
      throw error;
    }
  }

  /**
   * Transform Yahoo Finance historical data response
   */
  static transformYahooHistoricalData(
    response: RawYahooQuoteResponse,
    symbol: string,
    period: string
  ): HistoricalData {
    try {
      const result = response.chart?.result?.[0];

      if (!result) {
        throw new Error('No result data in Yahoo Finance historical response');
      }

      if (response.chart?.error) {
        throw new Error(
          `Yahoo Finance API error: ${response.chart.error.description}`
        );
      }

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];

      if (!quote || !timestamps.length) {
        throw new Error('No quote data or timestamps in historical response');
      }

      const data: HistoricalDataPoint[] = timestamps
        .map((timestamp: number, index: number) => {
          const dataPoint: HistoricalDataPoint = {
            timestamp: timestamp * 1000,
            open: this.roundToDecimals(quote.open?.[index] || 0, 2),
            high: this.roundToDecimals(quote.high?.[index] || 0, 2),
            low: this.roundToDecimals(quote.low?.[index] || 0, 2),
            close: this.roundToDecimals(quote.close?.[index] || 0, 2),
            volume: quote.volume?.[index] || 0,
          };

          return dataPoint;
        })
        .filter(point => point.close > 0); // Filter out invalid data points

      const historicalData: HistoricalData = {
        symbol: symbol.toUpperCase(),
        data,
        meta: {
          currency: 'USD',
          exchange: 'NASDAQ',
          instrumentType: 'EQUITY',
          regularMarketPrice: data[data.length - 1]?.close || 0,
          timezone: 'America/New_York',
        },
        period,
        source: 'Yahoo Finance',
      };

      // Validate the historical data
      const validation = this.validateHistoricalData(historicalData);
      if (!validation.isValid) {
        logger.warn('Historical data validation failed', {
          symbol,
          period,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      return historicalData;
    } catch (error) {
      logger.error('Failed to transform Yahoo Finance historical data', {
        symbol,
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Transform Yahoo Finance search response
   */
  static transformYahooSearchResults(
    response: RawYahooSearchResponse
  ): SearchResult[] {
    try {
      const quotes = response.quotes || [];

      const searchResults: SearchResult[] = quotes
        .map(quote => ({
          symbol: quote.symbol || '',
          name: quote.longname || quote.shortname || '',
          type: quote.quoteType || 'EQUITY',
          exchange: quote.exchange || '',
          source: 'Yahoo Finance',
        }))
        .filter(result => result.symbol && result.name); // Filter out invalid results

      return searchResults;
    } catch (error) {
      logger.error('Failed to transform Yahoo Finance search results', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: JSON.stringify(response).substring(0, 500),
      });
      throw error;
    }
  }

  /**
   * Normalize symbol format across different sources
   */
  static normalizeSymbol(symbol: string, source: string = 'yahoo'): string {
    if (!symbol) {
      throw new Error('Symbol cannot be empty');
    }

    const normalized = symbol.toUpperCase().trim();

    // Remove common prefixes/suffixes based on source
    switch (source.toLowerCase()) {
      case 'yahoo':
        // Yahoo Finance specific normalization
        break;
      case 'google':
        // Google Finance specific normalization
        break;
      default:
        break;
    }

    // Validate symbol format
    if (!/^[A-Z0-9.-^]+$/.test(normalized)) {
      logger.warn('Symbol contains invalid characters', {
        original: symbol,
        normalized,
        source,
      });
    }

    return normalized;
  }

  /**
   * Convert between different time period formats
   */
  static normalizePeriod(
    period: string,
    targetFormat: 'yahoo' | 'google' = 'yahoo'
  ): string {
    const periodMap: Record<string, Record<string, string>> = {
      yahoo: {
        '1d': '1d',
        '5d': '5d',
        '1mo': '1mo',
        '3mo': '3mo',
        '6mo': '6mo',
        '1y': '1y',
        '2y': '2y',
        '5y': '5y',
        '10y': '10y',
        ytd: 'ytd',
        max: 'max',
      },
      google: {
        '1d': '1D',
        '5d': '5D',
        '1mo': '1M',
        '3mo': '3M',
        '6mo': '6M',
        '1y': '1Y',
        '2y': '2Y',
        '5y': '5Y',
        '10y': '10Y',
        ytd: 'YTD',
        max: 'MAX',
      },
    };

    const normalizedPeriod = period.toLowerCase();
    return periodMap[targetFormat]?.[normalizedPeriod] || period;
  }

  /**
   * Validate quote data
   */
  static validateQuoteData(data: NormalizedQuoteData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.symbol) errors.push('Symbol is required');
    if (!data.name) errors.push('Name is required');
    if (typeof data.price !== 'number' || data.price < 0) {
      errors.push('Price must be a non-negative number');
    }
    if (typeof data.change !== 'number') errors.push('Change must be a number');
    if (typeof data.changePercent !== 'number')
      errors.push('Change percent must be a number');
    if (typeof data.volume !== 'number' || data.volume < 0) {
      errors.push('Volume must be a non-negative number');
    }

    // Warnings for suspicious data
    if (data.price === 0) warnings.push('Price is zero');
    if (data.volume === 0) warnings.push('Volume is zero');
    if (Math.abs(data.changePercent) > 50) {
      warnings.push(`Large price change: ${data.changePercent}%`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate historical data
   */
  static validateHistoricalData(data: HistoricalData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.symbol) errors.push('Symbol is required');
    if (!Array.isArray(data.data)) errors.push('Data must be an array');
    // Period is optional in the interface

    // Validate data points
    if (data.data.length === 0) {
      warnings.push('No historical data points');
    } else {
      let invalidPoints = 0;
      let zeroVolumePoints = 0;

      for (const point of data.data) {
        if (
          point.open <= 0 ||
          point.high <= 0 ||
          point.low <= 0 ||
          point.close <= 0
        ) {
          invalidPoints++;
        }
        if (point.volume === 0) {
          zeroVolumePoints++;
        }
        if (point.high < point.low) {
          errors.push('High price cannot be less than low price');
        }
        if (point.open > point.high || point.open < point.low) {
          warnings.push('Open price outside high-low range');
        }
        if (point.close > point.high || point.close < point.low) {
          warnings.push('Close price outside high-low range');
        }
      }

      if (invalidPoints > 0) {
        warnings.push(`${invalidPoints} data points have invalid prices`);
      }
      if (zeroVolumePoints > 0) {
        warnings.push(`${zeroVolumePoints} data points have zero volume`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Round number to specified decimal places
   */
  static roundToDecimals(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Format currency value
   */
  static formatCurrency(value: number, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // Fallback formatting
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  /**
   * Format percentage value
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  }

  /**
   * Format large numbers (market cap, volume)
   */
  static formatLargeNumber(value: number): string {
    if (value >= 1e12) {
      return `${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(2)}K`;
    } else {
      return value.toString();
    }
  }

  /**
   * Sanitize and validate symbol input
   */
  static sanitizeSymbol(symbol: string): string {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol input');
    }

    // Remove whitespace and convert to uppercase
    let sanitized = symbol.trim().toUpperCase();

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>"'&]/g, '');

    // Validate length
    if (sanitized.length === 0) {
      throw new Error('Symbol cannot be empty after sanitization');
    }
    if (sanitized.length > 20) {
      throw new Error('Symbol too long');
    }

    return sanitized;
  }

  /**
   * Calculate technical indicators
   */
  static calculateMovingAverage(data: number[], period: number): number[] {
    if (period <= 0 || period > data.length) {
      return [];
    }

    const movingAverages: number[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, val) => acc + val, 0);
      movingAverages.push(this.roundToDecimals(sum / period, 2));
    }

    return movingAverages;
  }

  /**
   * Calculate price change metrics
   */
  static calculatePriceMetrics(
    current: number,
    previous: number
  ): {
    change: number;
    changePercent: number;
    direction: 'up' | 'down' | 'unchanged';
  } {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    let direction: 'up' | 'down' | 'unchanged' = 'unchanged';
    if (change > 0) direction = 'up';
    else if (change < 0) direction = 'down';

    return {
      change: this.roundToDecimals(change, 2),
      changePercent: this.roundToDecimals(changePercent, 2),
      direction,
    };
  }
}

export default DataTransformers;
