/**
 * Asset List Widget Factory
 * Creates and manages asset list widgets
 */

import { BaseWidgetFactory } from '../BaseWidgetFactory';
import type {
  WidgetType,
  WidgetConfig,
  WidgetMetadata,
  WidgetSize,
} from '@/types/widget';

export class AssetListWidgetFactory extends BaseWidgetFactory {
  readonly type: WidgetType = 'asset-list';

  getDefaultConfig(): WidgetConfig {
    return {
      assets: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
      displayMode: 'list',
      refreshInterval: 30000, // 30 seconds
      filters: {
        marketCap: undefined,
        priceRange: undefined,
        volume: undefined,
        sectors: [],
        exchanges: [],
        countries: [],
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
      customSettings: {
        showChange: true,
        showVolume: true,
        showMarketCap: false,
        sortBy: 'symbol',
        sortDirection: 'asc',
        showLogos: false,
        compactMode: false,
        showExtendedHours: false,
        highlightMovers: true,
        colorCodeChanges: true,
      },
    };
  }

  getMetadata(): WidgetMetadata {
    return {
      type: this.type,
      name: 'Asset List',
      description: 'Display a list of assets with real-time prices and changes',
      category: 'market-data',
      icon: 'list',
      tags: ['assets', 'stocks', 'prices', 'list', 'real-time'],
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

      // Validate boolean settings
      const booleanSettings = [
        'showChange',
        'showVolume',
        'showMarketCap',
        'showLogos',
        'compactMode',
        'showExtendedHours',
        'highlightMovers',
        'colorCodeChanges',
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

    // Validate filters
    if (config.filters) {
      const { filters } = config;

      // Validate price range
      if (filters.priceRange) {
        const { min, max } = filters.priceRange;
        if (
          min !== undefined &&
          !this.validateNumberRange(min, 'priceRange.min', 0)
        ) {
          return false;
        }
        if (
          max !== undefined &&
          !this.validateNumberRange(max, 'priceRange.max', 0)
        ) {
          return false;
        }
        if (min !== undefined && max !== undefined && min > max) {
          console.warn('priceRange.min cannot be greater than priceRange.max');
          return false;
        }
      }

      // Validate volume range
      if (filters.volume) {
        const { min, max } = filters.volume;
        if (
          min !== undefined &&
          !this.validateNumberRange(min, 'volume.min', 0)
        ) {
          return false;
        }
        if (
          max !== undefined &&
          !this.validateNumberRange(max, 'volume.max', 0)
        ) {
          return false;
        }
        if (min !== undefined && max !== undefined && min > max) {
          console.warn('volume.min cannot be greater than volume.max');
          return false;
        }
      }

      // Validate string arrays
      if (
        filters.sectors &&
        !this.validateStringArray(filters.sectors, 'sectors')
      ) {
        return false;
      }
      if (
        filters.exchanges &&
        !this.validateStringArray(filters.exchanges, 'exchanges')
      ) {
        return false;
      }
      if (
        filters.countries &&
        !this.validateStringArray(filters.countries, 'countries')
      ) {
        return false;
      }
    }

    return true;
  }

  protected getDefaultTitle(): string {
    return 'Asset List';
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
      h: 4,
    };
  }

  protected getDefaultSize(): WidgetSize {
    return {
      minW: 4,
      minH: 3,
      maxW: 12,
      maxH: 8,
      resizable: true,
    };
  }
}
