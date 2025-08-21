/**
 * Asset Grid Widget Factory
 * Creates and manages asset grid widgets
 */

import { BaseWidgetFactory } from '../BaseWidgetFactory';
import type {
  WidgetType,
  WidgetConfig,
  WidgetMetadata,
  WidgetSize,
} from '@/types/widget';

export class AssetGridWidgetFactory extends BaseWidgetFactory {
  readonly type: WidgetType = 'asset-grid';

  getDefaultConfig(): WidgetConfig {
    return {
      assets: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META'],
      displayMode: 'grid',
      refreshInterval: 30000, // 30 seconds
      customSettings: {
        columns: 3,
        showLogos: true,
        showMetrics: true,
        colorScheme: 'default',
        cardSize: 'medium',
        showSparklines: false,
        showNews: false,
        showAlerts: false,
        animateChanges: true,
        hoverEffects: true,
        compactCards: false,
      },
      styling: {
        backgroundColor: undefined,
        textColor: undefined,
        borderColor: undefined,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 'medium',
      },
    };
  }

  getMetadata(): WidgetMetadata {
    return {
      type: this.type,
      name: 'Asset Grid',
      description: 'Display assets in a responsive grid layout with cards',
      category: 'market-data',
      icon: 'grid',
      tags: ['assets', 'stocks', 'grid', 'cards', 'responsive'],
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
        'grid',
        'card',
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

      // Validate columns
      if (
        settings.columns &&
        !this.validateNumberRange(settings.columns, 'columns', 1, 6)
      ) {
        return false;
      }

      // Validate color scheme
      if (
        settings.colorScheme &&
        !this.validateEnum(settings.colorScheme, 'colorScheme', [
          'default',
          'green-red',
          'blue-orange',
          'monochrome',
        ] as const)
      ) {
        return false;
      }

      // Validate card size
      if (
        settings.cardSize &&
        !this.validateEnum(settings.cardSize, 'cardSize', [
          'small',
          'medium',
          'large',
        ] as const)
      ) {
        return false;
      }

      // Validate boolean settings
      const booleanSettings = [
        'showLogos',
        'showMetrics',
        'showSparklines',
        'showNews',
        'showAlerts',
        'animateChanges',
        'hoverEffects',
        'compactCards',
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
    return 'Asset Grid';
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
      h: 5,
    };
  }

  protected getDefaultSize(): WidgetSize {
    return {
      minW: 6,
      minH: 4,
      maxW: 12,
      maxH: 8,
      resizable: true,
    };
  }
}
