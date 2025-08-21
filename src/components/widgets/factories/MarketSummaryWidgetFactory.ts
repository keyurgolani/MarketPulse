/**
 * Market Summary Widget Factory
 * Creates and manages market summary widgets
 */

import { BaseWidgetFactory } from '../BaseWidgetFactory';
import type {
  WidgetType,
  WidgetConfig,
  WidgetMetadata,
  WidgetSize,
} from '@/types/widget';

export class MarketSummaryWidgetFactory extends BaseWidgetFactory {
  readonly type: WidgetType = 'market-summary';

  getDefaultConfig(): WidgetConfig {
    return {
      assets: ['SPY', 'QQQ', 'DIA', 'IWM'], // Major market indices
      displayMode: 'grid',
      refreshInterval: 60000, // 1 minute
      customSettings: {
        indices: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'],
        showPreMarket: true,
        showAfterHours: true,
        showHeatmap: false,
        showTopMovers: true,
        showVolume: true,
        showSectors: false,
        showCommodities: false,
        showCrypto: false,
        showForex: false,
        showFutures: false,
        showBonds: false,
        showVIX: true,
        showFearGreed: false,
        layout: 'grid',
        compactMode: false,
        showSparklines: true,
        showPercentages: true,
        showAbsoluteValues: true,
        colorCodeChanges: true,
        showMarketStatus: true,
        showLastUpdate: true,
        autoRefresh: true,
        showNews: false,
        maxMovers: 5,
      },
      styling: {
        backgroundColor: undefined,
        textColor: undefined,
        borderColor: undefined,
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        fontSize: 'medium',
      },
    };
  }

  getMetadata(): WidgetMetadata {
    return {
      type: this.type,
      name: 'Market Summary',
      description: 'Overview of major market indices and market status',
      category: 'market-data',
      icon: 'chart-bar',
      tags: ['market', 'indices', 'summary', 'overview', 'status'],
      version: '1.0.0',
      author: 'MarketPulse',
      isPremium: false,
      supportedDataSources: ['yahoo', 'google', 'alpha-vantage'],
    };
  }

  protected validateSpecific(config: WidgetConfig): boolean {
    // Validate assets array (market indices)
    if (config.assets && !this.validateStringArray(config.assets, 'assets')) {
      return false;
    }

    // Validate display mode
    if (
      config.displayMode &&
      !this.validateEnum(config.displayMode, 'displayMode', [
        'grid',
        'list',
        'card',
        'compact',
      ] as const)
    ) {
      return false;
    }

    // Validate refresh interval
    if (
      config.refreshInterval &&
      !this.validateNumberRange(
        config.refreshInterval,
        'refreshInterval',
        30000, // minimum 30 seconds
        600000 // maximum 10 minutes
      )
    ) {
      return false;
    }

    // Validate custom settings
    if (config.customSettings) {
      const settings = config.customSettings;

      // Validate indices array
      if (
        settings.indices &&
        !this.validateStringArray(settings.indices, 'indices')
      ) {
        return false;
      }

      // Validate layout
      if (
        settings.layout &&
        !this.validateEnum(settings.layout, 'layout', [
          'grid',
          'list',
          'horizontal',
          'vertical',
        ] as const)
      ) {
        return false;
      }

      // Validate maxMovers
      if (
        settings.maxMovers &&
        !this.validateNumberRange(settings.maxMovers, 'maxMovers', 1, 20)
      ) {
        return false;
      }

      // Validate boolean settings
      const booleanSettings = [
        'showPreMarket',
        'showAfterHours',
        'showHeatmap',
        'showTopMovers',
        'showVolume',
        'showSectors',
        'showCommodities',
        'showCrypto',
        'showForex',
        'showFutures',
        'showBonds',
        'showVIX',
        'showFearGreed',
        'compactMode',
        'showSparklines',
        'showPercentages',
        'showAbsoluteValues',
        'colorCodeChanges',
        'showMarketStatus',
        'showLastUpdate',
        'autoRefresh',
        'showNews',
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
    }

    return true;
  }

  protected getDefaultTitle(): string {
    return 'Market Summary';
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
      h: 4,
    };
  }

  protected getDefaultSize(): WidgetSize {
    return {
      minW: 6,
      minH: 3,
      maxW: 12,
      maxH: 8,
      resizable: true,
    };
  }
}
