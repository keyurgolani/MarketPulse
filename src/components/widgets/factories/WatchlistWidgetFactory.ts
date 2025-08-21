/**
 * Watchlist Widget Factory
 * Creates and manages watchlist widgets
 */

import { BaseWidgetFactory } from '../BaseWidgetFactory';
import type {
  WidgetType,
  WidgetConfig,
  WidgetMetadata,
  WidgetSize,
} from '@/types/widget';

export class WatchlistWidgetFactory extends BaseWidgetFactory {
  readonly type: WidgetType = 'watchlist';

  getDefaultConfig(): WidgetConfig {
    return {
      assets: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
      displayMode: 'list',
      refreshInterval: 30000, // 30 seconds
      customSettings: {
        name: 'My Watchlist',
        showAlerts: true,
        showNews: false,
        sortBy: 'symbol',
        sortDirection: 'asc',
        allowReordering: true,
        showAddButton: true,
        showRemoveButton: true,
        showPerformance: true,
        showSparklines: false,
        groupByCategory: false,
        showCategories: [],
        maxItems: 50,
        enableSearch: true,
        showFilters: false,
        compactMode: false,
        showExtendedHours: false,
        highlightMovers: true,
        colorCodeChanges: true,
        showMarketCap: false,
        showVolume: true,
        showChange: true,
        showPercentChange: true,
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
      name: 'Watchlist',
      description: 'Customizable watchlist with add/remove functionality',
      category: 'market-data',
      icon: 'bookmark',
      tags: ['watchlist', 'favorites', 'tracking', 'portfolio', 'custom'],
      version: '1.0.0',
      author: 'MarketPulse',
      isPremium: false,
      supportedDataSources: ['yahoo', 'google', 'alpha-vantage'],
    };
  }

  protected validateSpecific(config: WidgetConfig): boolean {
    // Validate assets array
    if (config.assets && !this.validateStringArray(config.assets, 'assets')) {
      return false;
    }

    // Validate display mode
    if (
      config.displayMode &&
      !this.validateEnum(config.displayMode, 'displayMode', [
        'list',
        'grid',
        'table',
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
        5000, // minimum 5 seconds
        300000 // maximum 5 minutes
      )
    ) {
      return false;
    }

    // Validate custom settings
    if (config.customSettings) {
      const settings = config.customSettings;

      // Validate name
      if (settings.name && typeof settings.name !== 'string') {
        console.warn('name must be a string');
        return false;
      }

      // Validate sortBy
      if (
        settings.sortBy &&
        !this.validateEnum(settings.sortBy, 'sortBy', [
          'symbol',
          'name',
          'price',
          'change',
          'changePercent',
          'volume',
          'marketCap',
          'custom',
        ] as const)
      ) {
        return false;
      }

      // Validate sortDirection
      if (
        settings.sortDirection &&
        !this.validateEnum(settings.sortDirection, 'sortDirection', [
          'asc',
          'desc',
        ] as const)
      ) {
        return false;
      }

      // Validate maxItems
      if (
        settings.maxItems &&
        !this.validateNumberRange(settings.maxItems, 'maxItems', 1, 200)
      ) {
        return false;
      }

      // Validate showCategories array
      if (
        settings.showCategories &&
        !this.validateStringArray(settings.showCategories, 'showCategories')
      ) {
        return false;
      }

      // Validate boolean settings
      const booleanSettings = [
        'showAlerts',
        'showNews',
        'allowReordering',
        'showAddButton',
        'showRemoveButton',
        'showPerformance',
        'showSparklines',
        'groupByCategory',
        'enableSearch',
        'showFilters',
        'compactMode',
        'showExtendedHours',
        'highlightMovers',
        'colorCodeChanges',
        'showMarketCap',
        'showVolume',
        'showChange',
        'showPercentChange',
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
    return 'Watchlist';
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
      w: 6,
      h: 5,
    };
  }

  protected getDefaultSize(): WidgetSize {
    return {
      minW: 4,
      minH: 3,
      maxW: 12,
      maxH: 10,
      resizable: true,
    };
  }
}
