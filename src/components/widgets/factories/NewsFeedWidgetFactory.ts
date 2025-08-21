/**
 * News Feed Widget Factory
 * Creates and manages news feed widgets
 */

import { BaseWidgetFactory } from '../BaseWidgetFactory';
import type {
  WidgetType,
  WidgetConfig,
  WidgetMetadata,
  WidgetSize,
} from '@/types/widget';

export class NewsFeedWidgetFactory extends BaseWidgetFactory {
  readonly type: WidgetType = 'news-feed';

  getDefaultConfig(): WidgetConfig {
    return {
      assets: [], // Empty for general news, or specific assets for filtered news
      displayMode: 'list',
      refreshInterval: 900000, // 15 minutes
      customSettings: {
        sources: ['reuters', 'bloomberg', 'cnbc', 'marketwatch'],
        maxArticles: 10,
        showImages: true,
        showSummary: true,
        autoRefresh: true,
        showTimestamp: true,
        showSource: true,
        showTags: false,
        filterByAssets: false,
        showSentiment: false,
        groupBySource: false,
        sortBy: 'publishedAt',
        sortDirection: 'desc',
        showFullContent: false,
        enableSearch: false,
        showCategories: ['market', 'earnings', 'analysis'],
        excludeCategories: ['sports', 'entertainment'],
        minReadTime: 1,
        maxReadTime: 10,
        language: 'en',
        region: 'US',
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
      name: 'News Feed',
      description: 'Latest market news and analysis from multiple sources',
      category: 'news',
      icon: 'newspaper',
      tags: ['news', 'articles', 'market', 'analysis', 'feed'],
      version: '1.0.0',
      author: 'MarketPulse',
      isPremium: false,
      supportedDataSources: [
        'reuters',
        'bloomberg',
        'cnbc',
        'marketwatch',
        'yahoo',
      ],
    };
  }

  protected validateSpecific(config: WidgetConfig): boolean {
    // Validate assets array (optional for news)
    if (config.assets && !this.validateStringArray(config.assets, 'assets')) {
      return false;
    }

    // Validate display mode
    if (
      config.displayMode &&
      !this.validateEnum(config.displayMode, 'displayMode', [
        'list',
        'grid',
        'card',
        'compact',
      ] as const)
    ) {
      return false;
    }

    // Validate refresh interval (news can be less frequent)
    if (
      config.refreshInterval &&
      !this.validateNumberRange(
        config.refreshInterval,
        'refreshInterval',
        60000, // minimum 1 minute
        3600000 // maximum 1 hour
      )
    ) {
      return false;
    }

    // Validate custom settings
    if (config.customSettings) {
      const settings = config.customSettings;

      // Validate sources array
      if (settings.sources) {
        if (!this.validateStringArray(settings.sources, 'sources')) {
          return false;
        }

        const validSources = [
          'reuters',
          'bloomberg',
          'cnbc',
          'marketwatch',
          'yahoo',
          'wsj',
          'ft',
          'barrons',
          'seeking-alpha',
        ];

        for (const source of settings.sources) {
          if (!validSources.includes(source)) {
            console.warn(`Invalid news source: ${source}`);
            return false;
          }
        }
      }

      // Validate maxArticles
      if (
        settings.maxArticles &&
        !this.validateNumberRange(settings.maxArticles, 'maxArticles', 1, 100)
      ) {
        return false;
      }

      // Validate sortBy
      if (
        settings.sortBy &&
        !this.validateEnum(settings.sortBy, 'sortBy', [
          'publishedAt',
          'relevance',
          'popularity',
          'source',
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

      // Validate showCategories and excludeCategories
      if (
        settings.showCategories &&
        !this.validateStringArray(settings.showCategories, 'showCategories')
      ) {
        return false;
      }

      if (
        settings.excludeCategories &&
        !this.validateStringArray(
          settings.excludeCategories,
          'excludeCategories'
        )
      ) {
        return false;
      }

      // Validate read time ranges
      if (
        settings.minReadTime &&
        !this.validateNumberRange(settings.minReadTime, 'minReadTime', 0, 60)
      ) {
        return false;
      }

      if (
        settings.maxReadTime &&
        !this.validateNumberRange(settings.maxReadTime, 'maxReadTime', 1, 120)
      ) {
        return false;
      }

      // Validate language
      if (
        settings.language &&
        !this.validateEnum(settings.language, 'language', [
          'en',
          'es',
          'fr',
          'de',
          'it',
          'pt',
          'zh',
          'ja',
        ] as const)
      ) {
        return false;
      }

      // Validate region
      if (
        settings.region &&
        !this.validateEnum(settings.region, 'region', [
          'US',
          'EU',
          'UK',
          'CA',
          'AU',
          'JP',
          'CN',
          'IN',
        ] as const)
      ) {
        return false;
      }

      // Validate boolean settings
      const booleanSettings = [
        'showImages',
        'showSummary',
        'autoRefresh',
        'showTimestamp',
        'showSource',
        'showTags',
        'filterByAssets',
        'showSentiment',
        'groupBySource',
        'showFullContent',
        'enableSearch',
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
    return 'News Feed';
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
      h: 6,
    };
  }

  protected getDefaultSize(): WidgetSize {
    return {
      minW: 4,
      minH: 4,
      maxW: 12,
      maxH: 10,
      resizable: true,
    };
  }
}
