import {
  MarketQuote,
  HistoricalData,
  SymbolSearchResult,
} from '../types/api-contracts';

interface GoogleFinanceQuoteData {
  name?: string;
  longName?: string;
  shortName?: string;
  price?: number | string;
  regularMarketPrice?: number | string;
  change?: number | string;
  regularMarketChange?: number | string;
  changePercent?: number | string;
  regularMarketChangePercent?: number | string;
  volume?: number | string;
  regularMarketVolume?: number | string;
  marketCap?: number | string;
  [key: string]: unknown;
}

interface GoogleFinanceHistoricalData {
  timestamp?: number[];
  close?: number[];
  high?: number[];
  low?: number[];
  open?: number[];
  volume?: number[];
  [key: string]: unknown;
}

interface GoogleFinanceSearchResult {
  symbol?: string;
  name?: string;
  exchange?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Google Finance Data Adapter
 * Normalizes Google Finance data to match our standard API contracts
 */
export class GoogleFinanceAdapter {
  /**
   * Normalize Google Finance quote data to standard format
   */
  static normalizeQuote(
    googleData: GoogleFinanceQuoteData,
    symbol: string
  ): MarketQuote {
    return {
      symbol: symbol.toUpperCase(),
      name: googleData.name || googleData.longName || `${symbol} Company`,
      shortName: googleData.shortName || googleData.name || `${symbol} Company`,
      price: this.parseNumber(
        googleData.price || googleData.regularMarketPrice
      ),
      change: this.parseNumber(
        googleData.change || googleData.regularMarketChange
      ),
      changePercent: this.parseNumber(
        googleData.changePercent || googleData.regularMarketChangePercent
      ),
      volume: this.parseNumber(
        googleData.volume || googleData.regularMarketVolume,
        0
      ),
      marketCap: this.parseNumber(googleData.marketCap, 0),
      currency: (googleData.currency as string) || 'USD',
      exchange:
        (googleData.exchange as string) ||
        (googleData.fullExchangeName as string) ||
        'Unknown',
      lastUpdated: new Date(),
      source: 'google-finance',
    };
  }

  /**
   * Normalize Google Finance historical data to standard format
   */
  static normalizeHistoricalData(
    googleData: GoogleFinanceHistoricalData & {
      data?: unknown[];
      meta?: Record<string, unknown>;
    },
    symbol: string
  ): HistoricalData {
    const data = googleData.data || [];

    return {
      symbol: symbol.toUpperCase(),
      meta: {
        currency: (googleData.meta?.currency as string) || 'USD',
        exchange: (googleData.meta?.exchange as string) || 'Unknown',
        instrumentType: (googleData.meta?.instrumentType as string) || 'EQUITY',
        regularMarketPrice: this.parseNumber(
          googleData.meta?.regularMarketPrice as string | number
        ),
        timezone: (googleData.meta?.timezone as string) || 'EST',
      },
      data: (
        data as Array<{
          timestamp?: number | string;
          date?: number | string;
          open?: number | string;
          high?: number | string;
          low?: number | string;
          close?: number | string;
          volume?: number | string;
        }>
      ).map(point => ({
        timestamp: this.parseTimestamp(point.timestamp || point.date),
        open: this.parseNumber(point.open),
        high: this.parseNumber(point.high),
        low: this.parseNumber(point.low),
        close: this.parseNumber(point.close),
        volume: this.parseNumber(point.volume, 0),
      })),
    };
  }

  /**
   * Normalize Google Finance search results to standard format
   */
  static normalizeSearchResults(
    googleResults: GoogleFinanceSearchResult[]
  ): SymbolSearchResult[] {
    return googleResults.map(result => ({
      symbol: (
        (result.symbol as string) ||
        (result.ticker as string) ||
        ''
      ).toUpperCase(),
      name:
        (result.name as string) ||
        (result.longName as string) ||
        (result.shortName as string) ||
        'Unknown',
      exchange:
        (result.exchange as string) || (result.market as string) || 'Unknown',
      type: this.normalizeInstrumentType(
        (result.type as string) || (result.instrumentType as string)
      ),
      sector: (result.sector as string) || '',
      industry: (result.industry as string) || '',
      source: 'google-finance',
    }));
  }

  /**
   * Parse and validate numeric values
   */
  private static parseNumber(
    value: number | string | null | undefined,
    defaultValue: number = 0
  ): number {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    // Handle string values with currency symbols or commas
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and other non-numeric characters
      const cleaned = value.replace(/[$,\s%]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }

    return defaultValue;
  }

  /**
   * Parse timestamp values
   */
  private static parseTimestamp(
    value: number | string | Date | null | undefined
  ): number {
    if (typeof value === 'number') {
      // Handle both seconds and milliseconds timestamps
      return value > 1e10 ? value : value * 1000;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? Date.now() : date.getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return Date.now();
  }

  /**
   * Normalize instrument type to standard values
   */
  private static normalizeInstrumentType(type: string): string {
    if (!type) return 'Equity';

    const normalized = type.toLowerCase();

    const typeMap: { [key: string]: string } = {
      stock: 'Equity',
      equity: 'Equity',
      share: 'Equity',
      etf: 'ETF',
      fund: 'Fund',
      'mutual fund': 'Fund',
      index: 'Index',
      bond: 'Bond',
      crypto: 'Cryptocurrency',
      cryptocurrency: 'Cryptocurrency',
      currency: 'Currency',
      forex: 'Currency',
      commodity: 'Commodity',
      future: 'Future',
      option: 'Option',
    };

    return typeMap[normalized] || 'Equity';
  }

  /**
   * Convert Google Finance period format to standard format
   */
  static normalizePeriod(googlePeriod: string): string {
    const periodMap: { [key: string]: string } = {
      '1D': '1d',
      '5D': '5d',
      '1M': '1mo',
      '3M': '3mo',
      '6M': '6mo',
      '1Y': '1y',
      '2Y': '2y',
      '5Y': '5y',
      MAX: 'max',
    };

    return periodMap[googlePeriod.toUpperCase()] || googlePeriod.toLowerCase();
  }

  /**
   * Convert Google Finance interval format to standard format
   */
  static normalizeInterval(googleInterval: string): string {
    const intervalMap: { [key: string]: string } = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '1d': '1d',
      '1wk': '1wk',
      '1mo': '1mo',
    };

    return intervalMap[googleInterval.toLowerCase()] || '1d';
  }

  /**
   * Validate and clean symbol format
   */
  static normalizeSymbol(symbol: string): string {
    if (!symbol) return '';

    // Remove any whitespace and convert to uppercase
    let cleaned = symbol.trim().toUpperCase();

    // Handle Google Finance specific symbol formats
    // Google uses different prefixes for different exchanges
    if (cleaned.startsWith('NASDAQ:')) {
      cleaned = cleaned.replace('NASDAQ:', '');
    } else if (cleaned.startsWith('NYSE:')) {
      cleaned = cleaned.replace('NYSE:', '');
    } else if (cleaned.startsWith('INDEXSP:')) {
      cleaned = cleaned.replace('INDEXSP:', '^');
    } else if (cleaned.startsWith('INDEXDJX:')) {
      cleaned = cleaned.replace('INDEXDJX:', '^');
    }

    return cleaned;
  }

  /**
   * Create error response in standard format
   */
  static createErrorResponse(
    error: Error | { message?: string; code?: string; [key: string]: unknown },
    context: string
  ): Error {
    const message =
      error?.message || error?.toString() || 'Unknown Google Finance error';
    const enhancedError = new Error(`Google Finance ${context}: ${message}`);

    // Preserve original error properties
    if (error && typeof error === 'object' && 'code' in error) {
      (enhancedError as Error & { code?: unknown }).code = error.code;
    }
    if (error && typeof error === 'object' && 'status' in error) {
      (enhancedError as Error & { status?: unknown }).status = error.status;
    }

    return enhancedError;
  }

  /**
   * Validate quote data completeness
   */
  static validateQuoteData(quote: MarketQuote): boolean {
    return !!(
      quote.symbol &&
      typeof quote.price === 'number' &&
      !isNaN(quote.price) &&
      quote.price > 0
    );
  }

  /**
   * Validate historical data completeness
   */
  static validateHistoricalData(data: HistoricalData): boolean {
    return !!(
      data.symbol &&
      data.data &&
      Array.isArray(data.data) &&
      data.data.length > 0 &&
      data.data.every(
        point =>
          typeof point.timestamp === 'number' &&
          typeof point.close === 'number' &&
          !isNaN(point.close)
      )
    );
  }

  /**
   * Validate search results completeness
   */
  static validateSearchResults(results: SymbolSearchResult[]): boolean {
    return (
      Array.isArray(results) &&
      results.every(result => result.symbol && result.name)
    );
  }
}
