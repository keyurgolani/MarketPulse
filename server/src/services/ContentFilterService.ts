import { NewsArticle } from './NewsAggregationService';
import { logger } from '../utils/logger';

/**
 * Content filter configuration
 */
export interface ContentFilterConfig {
  keywords: {
    required?: string[];
    excluded?: string[];
    financial?: string[];
    spam?: string[];
  };
  categories: {
    allowed?: string[];
    blocked?: string[];
  };
  quality: {
    minWordCount?: number;
    maxWordCount?: number;
    minReadTime?: number;
    maxReadTime?: number;
  };
  sentiment: {
    allowedLabels?: Array<'positive' | 'negative' | 'neutral'>;
    minConfidence?: number;
  };
}

/**
 * Filter result
 */
export interface FilterResult {
  passed: boolean;
  reasons: string[];
  score: number;
  category?: string;
  tags: string[];
}

/**
 * Content Filter Service
 * Filters and categorizes news content based on various criteria
 */
export class ContentFilterService {
  private readonly defaultConfig: ContentFilterConfig = {
    keywords: {
      financial: [
        'stock',
        'market',
        'trading',
        'investment',
        'finance',
        'economy',
        'earnings',
        'revenue',
        'profit',
        'dividend',
        'ipo',
        'merger',
        'acquisition',
        'nasdaq',
        'nyse',
        'dow',
        'sp500',
        'bitcoin',
        'cryptocurrency',
        'forex',
        'commodity',
        'bond',
        'etf',
      ],
      spam: [
        'click here',
        'limited time',
        'act now',
        'guaranteed',
        'make money fast',
        'get rich quick',
        'no risk',
      ],
    },
    categories: {
      allowed: [
        'finance',
        'business',
        'markets',
        'investing',
        'economy',
        'technology',
      ],
      blocked: ['spam', 'adult', 'gambling'],
    },
    quality: {
      minWordCount: 50,
      maxWordCount: 5000,
      minReadTime: 1,
      maxReadTime: 30,
    },
    sentiment: {
      allowedLabels: ['positive', 'negative', 'neutral'],
      minConfidence: 0.3,
    },
  };

  constructor(
    private config: ContentFilterConfig = {
      keywords: { required: [], excluded: [], spam: [] },
      categories: { allowed: [], blocked: [] },
      quality: { minWordCount: 50, maxWordCount: 5000, minReadTime: 30 },
      sentiment: {
        allowedLabels: ['positive', 'negative', 'neutral'],
        minConfidence: 0.3,
      },
    }
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Filter articles based on configuration
   */
  filterArticles(articles: NewsArticle[]): NewsArticle[] {
    const filtered: NewsArticle[] = [];
    const stats = {
      total: articles.length,
      passed: 0,
      failed: 0,
      reasons: new Map<string, number>(),
    };

    for (const article of articles) {
      const result = this.evaluateArticle(article);

      if (result.passed) {
        filtered.push(article);
        stats.passed++;
      } else {
        stats.failed++;
        result.reasons.forEach(reason => {
          stats.reasons.set(reason, (stats.reasons.get(reason) || 0) + 1);
        });
      }
    }

    logger.info('Content filtering completed', {
      total: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      filterReasons: Object.fromEntries(stats.reasons),
    });

    return filtered;
  }

  /**
   * Evaluate a single article against filters
   */
  evaluateArticle(article: NewsArticle): FilterResult {
    const reasons: string[] = [];
    let score = 100;

    // Check required keywords
    if (this.config.keywords?.required?.length) {
      const hasRequired = this.config.keywords.required.some(keyword =>
        this.containsKeyword(article, keyword)
      );
      if (!hasRequired) {
        reasons.push('Missing required keywords');
        score -= 50;
      }
    }

    // Check excluded keywords
    if (this.config.keywords?.excluded?.length) {
      const hasExcluded = this.config.keywords.excluded.some(keyword =>
        this.containsKeyword(article, keyword)
      );
      if (hasExcluded) {
        reasons.push('Contains excluded keywords');
        score -= 30;
      }
    }

    // Check spam keywords
    if (this.config.keywords?.spam?.length) {
      const hasSpam = this.config.keywords.spam.some(keyword =>
        this.containsKeyword(article, keyword)
      );
      if (hasSpam) {
        reasons.push('Contains spam keywords');
        score -= 40;
      }
    }

    // Check category filters
    if (this.config.categories?.blocked?.includes(article.category)) {
      reasons.push('Blocked category');
      score -= 60;
    }

    if (
      this.config.categories?.allowed?.length &&
      !this.config.categories.allowed.includes(article.category)
    ) {
      reasons.push('Category not in allowed list');
      score -= 20;
    }

    // Check quality filters
    const wordCount = this.getWordCount(article.content);
    if (
      this.config.quality?.minWordCount &&
      wordCount < this.config.quality.minWordCount
    ) {
      reasons.push('Content too short');
      score -= 25;
    }

    if (
      this.config.quality?.maxWordCount &&
      wordCount > this.config.quality.maxWordCount
    ) {
      reasons.push('Content too long');
      score -= 15;
    }

    if (
      this.config.quality?.minReadTime &&
      article.readTime &&
      article.readTime < this.config.quality.minReadTime
    ) {
      reasons.push('Read time too short');
      score -= 10;
    }

    if (
      this.config.quality?.maxReadTime &&
      article.readTime &&
      article.readTime > this.config.quality.maxReadTime
    ) {
      reasons.push('Read time too long');
      score -= 10;
    }

    // Check sentiment filters
    if (article.sentiment) {
      if (
        this.config.sentiment?.allowedLabels?.length &&
        !this.config.sentiment.allowedLabels.includes(article.sentiment.label)
      ) {
        reasons.push('Sentiment not allowed');
        score -= 20;
      }

      if (
        this.config.sentiment?.minConfidence &&
        article.sentiment.confidence < this.config.sentiment.minConfidence
      ) {
        reasons.push('Sentiment confidence too low');
        score -= 15;
      }
    }

    // Determine category and tags
    const category = this.categorizeArticle(article);
    const tags = this.extractTags(article);

    return {
      passed: score >= 50 && reasons.length === 0,
      reasons,
      score: Math.max(0, score),
      category,
      tags,
    };
  }

  /**
   * Check if article contains a keyword
   */
  private containsKeyword(article: NewsArticle, keyword: string): boolean {
    const searchText =
      `${article.title} ${article.summary} ${article.content}`.toLowerCase();
    return searchText.includes(keyword.toLowerCase());
  }

  /**
   * Get word count from text
   */
  private getWordCount(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Categorize article based on content
   */
  private categorizeArticle(article: NewsArticle): string {
    const content = `${article.title} ${article.summary}`.toLowerCase();

    // Financial categories
    if (
      this.config.keywords?.financial?.some(keyword =>
        content.includes(keyword)
      )
    ) {
      if (content.includes('earnings') || content.includes('revenue')) {
        return 'earnings';
      }
      if (content.includes('merger') || content.includes('acquisition')) {
        return 'ma';
      }
      if (content.includes('ipo') || content.includes('public offering')) {
        return 'ipo';
      }
      if (content.includes('dividend') || content.includes('payout')) {
        return 'dividends';
      }
      if (content.includes('crypto') || content.includes('bitcoin')) {
        return 'cryptocurrency';
      }
      return 'finance';
    }

    // Technology categories
    if (
      content.includes('tech') ||
      content.includes('software') ||
      content.includes('ai')
    ) {
      return 'technology';
    }

    // Default category
    return article.category || 'general';
  }

  /**
   * Extract relevant tags from article
   */
  private extractTags(article: NewsArticle): string[] {
    const tags = new Set(article.tags);
    const content = `${article.title} ${article.summary}`.toLowerCase();

    // Add financial tags
    this.config.keywords?.financial?.forEach(keyword => {
      if (content.includes(keyword)) {
        tags.add(keyword);
      }
    });

    // Add asset-related tags
    article.relatedAssets.forEach(asset => {
      tags.add(asset.toLowerCase());
    });

    // Add sentiment tag
    if (article.sentiment) {
      tags.add(`sentiment-${article.sentiment.label}`);
    }

    return Array.from(tags);
  }

  /**
   * Get filter statistics
   */
  getStats(): Record<string, unknown> {
    return {
      config: this.config,
      filterCriteria: {
        keywordFilters: {
          required: this.config.keywords?.required?.length || 0,
          excluded: this.config.keywords?.excluded?.length || 0,
          financial: this.config.keywords?.financial?.length || 0,
          spam: this.config.keywords?.spam?.length || 0,
        },
        categoryFilters: {
          allowed: this.config.categories?.allowed?.length || 0,
          blocked: this.config.categories?.blocked?.length || 0,
        },
        qualityFilters: {
          wordCount: !!(
            this.config.quality?.minWordCount ||
            this.config.quality?.maxWordCount
          ),
          readTime: !!(
            this.config.quality?.minReadTime || this.config.quality?.maxReadTime
          ),
        },
        sentimentFilters: {
          labels: this.config.sentiment?.allowedLabels?.length || 0,
          minConfidence: this.config.sentiment?.minConfidence || 0,
        },
      },
    };
  }

  /**
   * Update filter configuration
   */
  updateConfig(newConfig: Partial<ContentFilterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Content filter configuration updated', {
      config: this.config,
    });
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...this.defaultConfig };
    logger.info('Content filter configuration reset to defaults');
  }
}
