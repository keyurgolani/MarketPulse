/**
 * Price Chart Widget Factory
 * Creates and manages price chart widgets
 */

import { BaseWidgetFactory } from '../BaseWidgetFactory';
import type {
  WidgetType,
  WidgetConfig,
  WidgetMetadata,
  WidgetSize,
  TimeFrame,
  TechnicalIndicator,
} from '@/types/widget';

interface ColorPair {
  up?: string;
  down?: string;
}

export class PriceChartWidgetFactory extends BaseWidgetFactory {
  readonly type: WidgetType = 'price-chart';

  getDefaultConfig(): WidgetConfig {
    return {
      assets: ['AAPL'], // Single asset for chart
      timeframe: '1d' as TimeFrame,
      indicators: [] as TechnicalIndicator[],
      displayMode: 'chart',
      refreshInterval: 60000, // 1 minute
      customSettings: {
        chartType: 'line',
        showVolume: true,
        showIndicators: false,
        showGrid: true,
        showCrosshair: true,
        showLegend: true,
        showToolbar: true,
        autoScale: true,
        logScale: false,
        showExtendedHours: false,
        showDividends: false,
        showSplits: false,
        showEarnings: false,
        theme: 'auto',
        height: 400,
        candlestickColors: {
          up: '#26a69a',
          down: '#ef5350',
        },
        volumeColors: {
          up: '#26a69a80',
          down: '#ef535080',
        },
      },
      styling: {
        backgroundColor: undefined,
        textColor: undefined,
        borderColor: undefined,
        borderWidth: 1,
        borderRadius: 8,
        padding: 0, // Charts typically don't need padding
        fontSize: 'small',
      },
    };
  }

  getMetadata(): WidgetMetadata {
    return {
      type: this.type,
      name: 'Price Chart',
      description: 'Interactive price chart with technical indicators',
      category: 'charts',
      icon: 'chart-line',
      tags: ['chart', 'price', 'technical-analysis', 'candlestick', 'line'],
      version: '1.0.0',
      author: 'MarketPulse',
      isPremium: false,
      supportedDataSources: ['yahoo', 'google', 'alpha-vantage'],
    };
  }

  protected validateSpecific(config: WidgetConfig): boolean {
    // Validate assets array (should contain exactly one asset for charts)
    if (config.assets) {
      if (!this.validateStringArray(config.assets, 'assets')) {
        return false;
      }
      if (config.assets.length !== 1) {
        console.warn('Price chart widget must have exactly one asset');
        return false;
      }
    }

    // Validate timeframe
    if (
      config.timeframe &&
      !this.validateEnum(config.timeframe, 'timeframe', [
        '1m',
        '5m',
        '15m',
        '30m',
        '1h',
        '2h',
        '4h',
        '1d',
        '1w',
        '1M',
        '3M',
        '6M',
        '1y',
        '2y',
        '5y',
        'max',
      ] as const)
    ) {
      return false;
    }

    // Validate indicators array
    if (config.indicators) {
      if (!Array.isArray(config.indicators)) {
        console.warn('indicators must be an array');
        return false;
      }

      const validIndicators = [
        'sma',
        'ema',
        'rsi',
        'macd',
        'bollinger',
        'stochastic',
        'williams',
        'cci',
        'momentum',
        'volume',
        'vwap',
        'fibonacci',
      ];

      for (const indicator of config.indicators) {
        if (!validIndicators.includes(indicator)) {
          console.warn(`Invalid technical indicator: ${indicator}`);
          return false;
        }
      }
    }

    // Validate display mode
    if (
      config.displayMode &&
      !this.validateEnum(config.displayMode, 'displayMode', ['chart'] as const)
    ) {
      return false;
    }

    // Validate refresh interval
    if (
      config.refreshInterval &&
      !this.validateNumberRange(
        config.refreshInterval,
        'refreshInterval',
        10000, // minimum 10 seconds for charts
        600000 // maximum 10 minutes
      )
    ) {
      return false;
    }

    // Validate custom settings
    if (config.customSettings) {
      const settings = config.customSettings;

      // Validate chart type
      if (
        settings.chartType &&
        !this.validateEnum(settings.chartType, 'chartType', [
          'line',
          'candlestick',
          'area',
          'bar',
          'ohlc',
        ] as const)
      ) {
        return false;
      }

      // Validate theme
      if (
        settings.theme &&
        !this.validateEnum(settings.theme, 'theme', [
          'auto',
          'light',
          'dark',
        ] as const)
      ) {
        return false;
      }

      // Validate height
      if (
        settings.height &&
        !this.validateNumberRange(settings.height, 'height', 200, 800)
      ) {
        return false;
      }

      // Validate boolean settings
      const booleanSettings = [
        'showVolume',
        'showIndicators',
        'showGrid',
        'showCrosshair',
        'showLegend',
        'showToolbar',
        'autoScale',
        'logScale',
        'showExtendedHours',
        'showDividends',
        'showSplits',
        'showEarnings',
      ];

      for (const setting of booleanSettings) {
        if (
          settings[setting] !== undefined &&
          typeof settings[setting] !== 'boolean'
        ) {
          console.warn(`${setting} must be a boolean`);
          return false;
        }
      }

      // Validate color objects
      if (
        settings.candlestickColors &&
        typeof settings.candlestickColors === 'object'
      ) {
        const colors = settings.candlestickColors as ColorPair;
        if (colors.up && typeof colors.up !== 'string') {
          console.warn('candlestickColors.up must be a string');
          return false;
        }
        if (colors.down && typeof colors.down !== 'string') {
          console.warn('candlestickColors.down must be a string');
          return false;
        }
      }

      if (settings.volumeColors && typeof settings.volumeColors === 'object') {
        const colors = settings.volumeColors as ColorPair;
        if (colors.up && typeof colors.up !== 'string') {
          console.warn('volumeColors.up must be a string');
          return false;
        }
        if (colors.down && typeof colors.down !== 'string') {
          console.warn('volumeColors.down must be a string');
          return false;
        }
      }
    }

    return true;
  }

  protected getDefaultTitle(): string {
    return 'Price Chart';
  }

  protected getDefaultPosition(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    return {
      x: 0,
      y: 0,
      w: 8,
      h: 6,
    };
  }

  protected getDefaultSize(): WidgetSize {
    return {
      minW: 6,
      minH: 4,
      maxW: 12,
      maxH: 10,
      resizable: true,
    };
  }
}
