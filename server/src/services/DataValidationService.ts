import { z } from 'zod';
import { logger } from '../utils/logger';
import {
  MarketQuote,
  HistoricalData,
  SymbolSearchResult,
} from '../types/api-contracts';

/**
 * Validation result
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  source?: string;
}

/**
 * Data consistency check result
 */
export interface ConsistencyCheckResult {
  isConsistent: boolean;
  discrepancies: Array<{
    field: string;
    source1Value: unknown;
    source2Value: unknown;
    difference: number | string;
  }>;
  confidence: number;
}

/**
 * Data Validation Service
 * Ensures data consistency and quality across multiple sources
 */
export class DataValidationService {
  // Zod schemas for validation
  private readonly marketQuoteSchema = z.object({
    symbol: z.string().min(1).max(10),
    name: z.string().min(1),
    shortName: z.string().min(1),
    price: z.number().positive(),
    change: z.number(),
    changePercent: z.number(),
    volume: z.number().nonnegative(),
    marketCap: z.number().nonnegative(),
    currency: z.string().min(1),
    exchange: z.string().min(1),
    lastUpdated: z.date(),
    source: z.string().min(1),
    // Optional fields
    high: z.number().positive().optional(),
    low: z.number().positive().optional(),
    open: z.number().positive().optional(),
    previousClose: z.number().positive().optional(),
    timestamp: z.number().positive().optional(),
  });

  private readonly historicalDataSchema = z.object({
    symbol: z.string().min(1).max(10),
    meta: z.object({
      currency: z.string().min(1),
      exchange: z.string().min(1),
      instrumentType: z.string().min(1),
      regularMarketPrice: z.number().nonnegative(),
      timezone: z.string().min(1),
    }),
    data: z
      .array(
        z.object({
          timestamp: z.number().positive(),
          open: z.number().positive(),
          high: z.number().positive(),
          low: z.number().positive(),
          close: z.number().positive(),
          volume: z.number().nonnegative(),
          adjustedClose: z.number().positive().optional(),
        })
      )
      .min(1),
    // Optional fields for compatibility
    source: z.string().min(1).optional(),
    period: z.string().min(1).optional(),
    interval: z.string().min(1).optional(),
  });

  private readonly symbolSearchResultSchema = z.object({
    symbol: z.string().min(1).max(10),
    name: z.string().min(1),
    type: z.string().min(1),
    exchange: z.string().min(1),
    source: z.string().min(1),
    // Optional fields
    sector: z.string().optional(),
    industry: z.string().optional(),
  });

  // Price tolerance for consistency checks (5%)
  private readonly PRICE_TOLERANCE = 0.05;

  // Volume tolerance for consistency checks (10%)
  private readonly VOLUME_TOLERANCE = 0.1;

  /**
   * Validate market quote data
   */
  validateMarketQuote(
    data: unknown,
    source?: string
  ): ValidationResult<MarketQuote> {
    const result: ValidationResult<MarketQuote> = {
      isValid: false,
      errors: [],
      warnings: [],
      ...(source && { source }),
    };

    try {
      // Schema validation
      const rawValidatedData = this.marketQuoteSchema.parse(data);

      // Remove undefined optional properties for exactOptionalPropertyTypes compliance
      const validatedData: MarketQuote = {
        symbol: rawValidatedData.symbol,
        name: rawValidatedData.name,
        shortName: rawValidatedData.shortName,
        price: rawValidatedData.price,
        change: rawValidatedData.change,
        changePercent: rawValidatedData.changePercent,
        volume: rawValidatedData.volume,
        marketCap: rawValidatedData.marketCap,
        currency: rawValidatedData.currency,
        exchange: rawValidatedData.exchange,
        lastUpdated: rawValidatedData.lastUpdated,
        source: rawValidatedData.source,
        ...(rawValidatedData.high !== undefined && {
          high: rawValidatedData.high,
        }),
        ...(rawValidatedData.low !== undefined && {
          low: rawValidatedData.low,
        }),
        ...(rawValidatedData.open !== undefined && {
          open: rawValidatedData.open,
        }),
        ...(rawValidatedData.previousClose !== undefined && {
          previousClose: rawValidatedData.previousClose,
        }),
        ...(rawValidatedData.timestamp !== undefined && {
          timestamp: rawValidatedData.timestamp,
        }),
      };

      // Business logic validation
      const businessValidation =
        this.validateMarketQuoteBusinessLogic(validatedData);

      result.isValid = businessValidation.isValid;
      result.data = validatedData;
      result.errors = businessValidation.errors;
      result.warnings = businessValidation.warnings;

      if (result.isValid) {
        logger.debug('Market quote validation passed', {
          symbol: validatedData.symbol,
          source: validatedData.source,
        });
      } else {
        logger.warn('Market quote validation failed', {
          symbol: validatedData.symbol,
          source: validatedData.source,
          errors: result.errors,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors = error.issues.map(
          e => `${e.path.join('.')}: ${e.message}`
        );
      } else {
        result.errors = ['Unknown validation error'];
      }

      logger.error('Market quote schema validation failed', {
        source,
        errors: result.errors,
        data: JSON.stringify(data).substring(0, 200),
      });
    }

    return result;
  }

  /**
   * Validate historical data
   */
  validateHistoricalData(
    data: unknown,
    source?: string
  ): ValidationResult<HistoricalData> {
    const result: ValidationResult<HistoricalData> = {
      isValid: false,
      errors: [],
      warnings: [],
      ...(source && { source }),
    };

    try {
      // Schema validation
      const validatedData = this.historicalDataSchema.parse(data);

      // Business logic validation
      const businessValidation =
        this.validateHistoricalDataBusinessLogic(validatedData);

      result.isValid = businessValidation.isValid;
      result.data = validatedData;
      result.errors = businessValidation.errors;
      result.warnings = businessValidation.warnings;

      if (result.isValid) {
        logger.debug('Historical data validation passed', {
          symbol: validatedData.symbol,
          dataPoints: validatedData.data.length,
          source: validatedData.source,
        });
      } else {
        logger.warn('Historical data validation failed', {
          symbol: validatedData.symbol,
          source: validatedData.source,
          errors: result.errors,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors = error.issues.map(
          e => `${e.path.join('.')}: ${e.message}`
        );
      } else {
        result.errors = ['Unknown validation error'];
      }

      logger.error('Historical data schema validation failed', {
        source,
        errors: result.errors,
      });
    }

    return result;
  }

  /**
   * Validate symbol search results
   */
  validateSymbolSearchResults(
    data: unknown[],
    source?: string
  ): ValidationResult<SymbolSearchResult[]> {
    const result: ValidationResult<SymbolSearchResult[]> = {
      isValid: true,
      data: [],
      errors: [],
      warnings: [],
      ...(source && { source }),
    };

    const validResults: SymbolSearchResult[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const rawValidatedItem = this.symbolSearchResultSchema.parse(data[i]);

        // Remove undefined optional properties for exactOptionalPropertyTypes compliance
        const validatedItem: SymbolSearchResult = {
          symbol: rawValidatedItem.symbol,
          name: rawValidatedItem.name,
          exchange: rawValidatedItem.exchange,
          type: rawValidatedItem.type,
          source: rawValidatedItem.source,
          ...(rawValidatedItem.sector !== undefined && {
            sector: rawValidatedItem.sector,
          }),
          ...(rawValidatedItem.industry !== undefined && {
            industry: rawValidatedItem.industry,
          }),
        };

        validResults.push(validatedItem);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const itemErrors = error.issues.map(
            e => `Item ${i}: ${e.path.join('.')}: ${e.message}`
          );
          result.errors.push(...itemErrors);
        } else {
          result.errors.push(`Item ${i}: Unknown validation error`);
        }
      }
    }

    result.data = validResults;
    result.isValid = result.errors.length === 0;

    if (result.errors.length > 0) {
      logger.warn('Symbol search results validation had errors', {
        source,
        totalItems: data.length,
        validItems: validResults.length,
        errors: result.errors.length,
      });
    }

    return result;
  }

  /**
   * Check consistency between two market quotes from different sources
   */
  checkMarketQuoteConsistency(
    quote1: MarketQuote,
    quote2: MarketQuote
  ): ConsistencyCheckResult {
    const discrepancies: ConsistencyCheckResult['discrepancies'] = [];

    // Check price consistency
    const priceDiff = Math.abs(quote1.price - quote2.price);
    const priceThreshold =
      Math.max(quote1.price, quote2.price) * this.PRICE_TOLERANCE;

    if (priceDiff > priceThreshold) {
      discrepancies.push({
        field: 'price',
        source1Value: quote1.price,
        source2Value: quote2.price,
        difference: priceDiff,
      });
    }

    // Check volume consistency (if both have volume)
    if (quote1.volume && quote2.volume) {
      const volumeDiff = Math.abs(quote1.volume - quote2.volume);
      const volumeThreshold =
        Math.max(quote1.volume, quote2.volume) * this.VOLUME_TOLERANCE;

      if (volumeDiff > volumeThreshold) {
        discrepancies.push({
          field: 'volume',
          source1Value: quote1.volume,
          source2Value: quote2.volume,
          difference: volumeDiff,
        });
      }
    }

    // Check timestamp consistency (should be within 5 minutes)
    if (quote1.timestamp && quote2.timestamp) {
      const timestampDiff = Math.abs(quote1.timestamp - quote2.timestamp);
      if (timestampDiff > 5 * 60 * 1000) {
        // 5 minutes in milliseconds
        discrepancies.push({
          field: 'timestamp',
          source1Value: new Date(quote1.timestamp).toISOString(),
          source2Value: new Date(quote2.timestamp).toISOString(),
          difference: `${Math.round(timestampDiff / 1000)}s`,
        });
      }
    }

    // Calculate confidence score
    const totalChecks = 3; // price, volume (if available), timestamp
    const failedChecks = discrepancies.length;
    const confidence = Math.max(0, (totalChecks - failedChecks) / totalChecks);

    const result: ConsistencyCheckResult = {
      isConsistent: discrepancies.length === 0,
      discrepancies,
      confidence,
    };

    logger.debug('Market quote consistency check completed', {
      symbol: quote1.symbol,
      source1: quote1.source,
      source2: quote2.source,
      isConsistent: result.isConsistent,
      confidence: result.confidence,
      discrepancies: discrepancies.length,
    });

    return result;
  }

  /**
   * Validate and merge multiple market quotes for the same symbol
   */
  validateAndMergeQuotes(quotes: MarketQuote[]): ValidationResult<MarketQuote> {
    const result: ValidationResult<MarketQuote> = {
      isValid: false,
      errors: [],
      warnings: [],
    };

    if (quotes.length === 0) {
      result.errors.push('No quotes provided for merging');
      return result;
    }

    if (quotes.length === 1) {
      result.isValid = true;
      result.data = quotes[0]!;
      return result;
    }

    // Check that all quotes are for the same symbol
    const symbol = quotes[0]?.symbol;
    const differentSymbols = quotes.filter(q => q.symbol !== symbol);
    if (differentSymbols.length > 0) {
      result.errors.push(
        `All quotes must be for the same symbol. Expected: ${symbol}`
      );
      return result;
    }

    // Perform consistency checks between quotes
    const consistencyResults: ConsistencyCheckResult[] = [];
    for (let i = 0; i < quotes.length - 1; i++) {
      for (let j = i + 1; j < quotes.length; j++) {
        const quote1 = quotes[i];
        const quote2 = quotes[j];
        if (quote1 && quote2) {
          const consistency = this.checkMarketQuoteConsistency(quote1, quote2);
          consistencyResults.push(consistency);

          if (!consistency.isConsistent) {
            result.warnings.push(
              `Inconsistency between ${quote1.source} and ${quote2.source}: ${consistency.discrepancies.length} discrepancies`
            );
          }
        }
      }
    }

    // Calculate overall confidence
    const avgConfidence =
      consistencyResults.reduce((sum, r) => sum + r.confidence, 0) /
      consistencyResults.length;

    // Merge quotes using weighted average based on source reliability
    const mergedQuote = this.mergeMarketQuotes(quotes, avgConfidence);

    result.isValid = true;
    result.data = mergedQuote;

    logger.info('Market quotes merged successfully', {
      symbol,
      sourceCount: quotes.length,
      avgConfidence,
      warnings: result.warnings.length,
    });

    return result;
  }

  /**
   * Business logic validation for market quotes
   */
  private validateMarketQuoteBusinessLogic(quote: MarketQuote): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Price should be reasonable (not zero, not extremely high)
    if (quote.price <= 0) {
      errors.push('Price must be positive');
    } else if (quote.price > 1000000) {
      warnings.push('Price seems unusually high');
    }

    // High should be >= Low
    if (quote.high && quote.low && quote.high < quote.low) {
      errors.push('High price cannot be less than low price');
    }

    // Current price should be between high and low
    if (quote.high && quote.price > quote.high) {
      warnings.push('Current price is higher than daily high');
    }
    if (quote.low && quote.price < quote.low) {
      warnings.push('Current price is lower than daily low');
    }

    // Timestamp should be recent (within last 24 hours for real-time data)
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    if (quote.timestamp) {
      if (quote.timestamp < dayAgo) {
        warnings.push('Quote timestamp is more than 24 hours old');
      }
      if (quote.timestamp > now + 60 * 1000) {
        // 1 minute in future
        errors.push('Quote timestamp is in the future');
      }
    }

    // Volume should be reasonable
    if (quote.volume && quote.volume < 0) {
      errors.push('Volume cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Business logic validation for historical data
   */
  private validateHistoricalDataBusinessLogic(data: HistoricalData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check data points are in chronological order
    for (let i = 1; i < data.data.length; i++) {
      const currentPoint = data.data[i];
      const previousPoint = data.data[i - 1];
      if (
        currentPoint?.timestamp &&
        previousPoint?.timestamp &&
        currentPoint.timestamp <= previousPoint.timestamp
      ) {
        errors.push(`Data point ${i} is not in chronological order`);
      }
    }

    // Validate each data point
    data.data.forEach((point, index) => {
      // OHLC validation
      if (point.high < point.low) {
        errors.push(`Data point ${index}: High cannot be less than low`);
      }
      if (point.open < point.low || point.open > point.high) {
        errors.push(
          `Data point ${index}: Open price must be between low and high`
        );
      }
      if (point.close < point.low || point.close > point.high) {
        errors.push(
          `Data point ${index}: Close price must be between low and high`
        );
      }

      // Volume validation
      if (point.volume < 0) {
        errors.push(`Data point ${index}: Volume cannot be negative`);
      }

      // Price reasonableness
      if (point.close <= 0) {
        errors.push(`Data point ${index}: Close price must be positive`);
      }
    });

    // Check for gaps in data
    if (
      data.data.length > 1 &&
      (data as HistoricalData & { interval?: string }).interval
    ) {
      const expectedInterval = this.getExpectedInterval(
        (data as HistoricalData & { interval: string }).interval
      );
      let gapCount = 0;

      for (let i = 1; i < data.data.length; i++) {
        if (data.data[i]?.timestamp && data.data[i - 1]?.timestamp) {
          const actualInterval =
            data.data[i]!.timestamp - data.data[i - 1]!.timestamp;
          if (actualInterval > expectedInterval * 1.5) {
            // Allow 50% tolerance
            gapCount++;
          }
        }
      }

      if (gapCount > 0) {
        warnings.push(`Found ${gapCount} potential gaps in historical data`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Merge multiple market quotes using weighted average
   */
  private mergeMarketQuotes(
    quotes: MarketQuote[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    confidence: number
  ): MarketQuote {
    // Use the most recent quote as base
    const mostRecent = quotes.reduce((latest, current) => {
      if (!current.timestamp) return latest;
      if (!latest.timestamp) return current;
      return current.timestamp > latest.timestamp ? current : latest;
    });

    // Calculate weighted averages for numeric fields
    const totalWeight = quotes.length;

    const avgPrice = quotes.reduce((sum, q) => sum + q.price, 0) / totalWeight;
    const avgChange =
      quotes.reduce((sum, q) => sum + q.change, 0) / totalWeight;
    const avgChangePercent =
      quotes.reduce((sum, q) => sum + q.changePercent, 0) / totalWeight;

    // Use available values for optional fields
    const volumes = quotes.filter(q => q.volume).map(q => q.volume!);
    const avgVolume =
      volumes.length > 0
        ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length
        : undefined;

    const highs = quotes.filter(q => q.high).map(q => q.high!);
    const maxHigh = highs.length > 0 ? Math.max(...highs) : undefined;

    const lows = quotes.filter(q => q.low).map(q => q.low!);
    const minLow = lows.length > 0 ? Math.min(...lows) : undefined;

    const mergedQuote: MarketQuote = {
      ...mostRecent,
      price: avgPrice,
      change: avgChange,
      changePercent: avgChangePercent,
      volume: avgVolume || 0,
      source: `merged(${quotes.map(q => q.source).join(',')})`,
      ...(maxHigh !== undefined && { high: maxHigh }),
      ...(minLow !== undefined && { low: minLow }),
    };

    return mergedQuote;
  }

  /**
   * Get expected interval in milliseconds
   */
  private getExpectedInterval(interval: string): number {
    const intervalMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1wk': 7 * 24 * 60 * 60 * 1000,
      '1mo': 30 * 24 * 60 * 60 * 1000,
    };

    return intervalMap[interval] || 24 * 60 * 60 * 1000; // Default to 1 day
  }

  /**
   * Get validation statistics
   */
  getStats(): Record<string, unknown> {
    return {
      schemas: {
        marketQuote: 'defined',
        historicalData: 'defined',
        symbolSearchResult: 'defined',
      },
      tolerances: {
        price: this.PRICE_TOLERANCE,
        volume: this.VOLUME_TOLERANCE,
      },
      validationRules: {
        businessLogic: 'enabled',
        consistencyChecks: 'enabled',
        schemaValidation: 'enabled',
      },
    };
  }
}
