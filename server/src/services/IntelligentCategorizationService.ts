import { NewsArticle } from './NewsAggregationService';
import { logger } from '../utils/logger';

/**
 * Category confidence score
 */
export interface CategoryScore {
  category: string;
  confidence: number;
  keywords: string[];
  reasons: string[];
}

/**
 * Asset relevance score
 */
export interface AssetRelevance {
  symbol: string;
  relevance: number;
  mentions: number;
  context: string[];
}

/**
 * Categorization result
 */
export interface CategorizationResult {
  primaryCategory: string;
  secondaryCategories: CategoryScore[];
  assetRelevance: AssetRelevance[];
  topics: string[];
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;
    aspects: { [key: string]: number };
  };
  urgency: 'low' | 'medium' | 'high';
  marketImpact: 'low' | 'medium' | 'high';
}

/**
 * Intelligent Content Categorization Service
 * Uses NLP and financial domain knowledge to categorize and analyze news content
 */
export class IntelligentCategorizationService {
  private readonly categoryKeywords = {
    earnings: {
      primary: [
        'earnings',
        'quarterly results',
        'q1',
        'q2',
        'q3',
        'q4',
        'revenue',
        'profit',
        'eps',
      ],
      secondary: ['beat', 'miss', 'guidance', 'outlook', 'forecast'],
    },
    mergers: {
      primary: ['merger', 'acquisition', 'takeover', 'buyout', 'deal'],
      secondary: ['acquire', 'purchase', 'combine', 'consolidate'],
    },
    ipo: {
      primary: ['ipo', 'initial public offering', 'public debut', 'listing'],
      secondary: ['nasdaq', 'nyse', 'stock exchange', 'shares'],
    },
    regulation: {
      primary: ['regulation', 'regulatory', 'sec', 'fda', 'ftc', 'antitrust'],
      secondary: ['compliance', 'investigation', 'fine', 'penalty'],
    },
    technology: {
      primary: [
        'ai',
        'artificial intelligence',
        'machine learning',
        'blockchain',
        'cloud',
      ],
      secondary: ['innovation', 'digital', 'software', 'platform'],
    },
    cryptocurrency: {
      primary: [
        'bitcoin',
        'ethereum',
        'crypto',
        'cryptocurrency',
        'blockchain',
      ],
      secondary: ['mining', 'wallet', 'exchange', 'defi'],
    },
    economy: {
      primary: [
        'gdp',
        'inflation',
        'interest rates',
        'federal reserve',
        'unemployment',
      ],
      secondary: ['economic', 'monetary policy', 'recession', 'growth'],
    },
    energy: {
      primary: ['oil', 'gas', 'renewable', 'solar', 'wind', 'nuclear'],
      secondary: ['energy', 'petroleum', 'crude', 'opec'],
    },
  };

  private readonly urgencyKeywords = {
    high: [
      'breaking',
      'urgent',
      'alert',
      'emergency',
      'crisis',
      'crash',
      'surge',
    ],
    medium: ['announces', 'reports', 'updates', 'changes', 'plans'],
    low: ['analysis', 'opinion', 'review', 'outlook', 'forecast'],
  };

  private readonly marketImpactKeywords = {
    high: ['market moving', 'significant', 'major', 'substantial', 'dramatic'],
    medium: ['notable', 'important', 'considerable', 'meaningful'],
    low: ['minor', 'slight', 'small', 'limited'],
  };

  private readonly sentimentKeywords = {
    positive: [
      'growth',
      'increase',
      'profit',
      'success',
      'strong',
      'beat',
      'exceed',
      'optimistic',
    ],
    negative: [
      'decline',
      'loss',
      'weak',
      'miss',
      'fall',
      'drop',
      'concern',
      'risk',
    ],
    neutral: ['stable', 'maintain', 'steady', 'unchanged', 'neutral'],
  };

  /**
   * Categorize and analyze a news article
   */
  categorizeArticle(article: NewsArticle): CategorizationResult {
    const content =
      `${article.title} ${article.summary} ${article.content}`.toLowerCase();

    logger.debug('Categorizing article', {
      articleId: article.id,
      title: article.title.substring(0, 100),
    });

    // Determine primary category
    const categoryScores = this.calculateCategoryScores(content);
    const primaryCategory =
      categoryScores.length > 0
        ? categoryScores[0]?.category || 'general'
        : 'general';

    // Calculate asset relevance
    const assetRelevance = this.calculateAssetRelevance(
      content,
      article.relatedAssets
    );

    // Extract topics
    const topics = this.extractTopics(content);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(content);

    // Determine urgency and market impact
    const urgency = this.determineUrgency(content);
    const marketImpact = this.determineMarketImpact(content);

    const result: CategorizationResult = {
      primaryCategory,
      secondaryCategories: categoryScores.slice(1, 4), // Top 3 secondary categories
      assetRelevance,
      topics,
      sentiment,
      urgency,
      marketImpact,
    };

    logger.info('Article categorization completed', {
      articleId: article.id,
      primaryCategory,
      urgency,
      marketImpact,
      assetCount: assetRelevance.length,
    });

    return result;
  }

  /**
   * Batch categorize multiple articles
   */
  categorizeArticles(
    articles: NewsArticle[]
  ): Map<string, CategorizationResult> {
    const results = new Map<string, CategorizationResult>();

    logger.info('Starting batch categorization', {
      articleCount: articles.length,
    });

    for (const article of articles) {
      try {
        const result = this.categorizeArticle(article);
        results.set(article.id, result);
      } catch (error) {
        logger.error('Failed to categorize article', {
          articleId: article.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Batch categorization completed', {
      processed: results.size,
      failed: articles.length - results.size,
    });

    return results;
  }

  /**
   * Calculate category scores for content
   */
  private calculateCategoryScores(content: string): CategoryScore[] {
    const scores: CategoryScore[] = [];

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      let score = 0;
      const foundKeywords: string[] = [];
      const reasons: string[] = [];

      // Check primary keywords (higher weight)
      for (const keyword of keywords.primary) {
        if (content.includes(keyword)) {
          score += 3;
          foundKeywords.push(keyword);
          reasons.push(`Primary keyword: ${keyword}`);
        }
      }

      // Check secondary keywords (lower weight)
      for (const keyword of keywords.secondary) {
        if (content.includes(keyword)) {
          score += 1;
          foundKeywords.push(keyword);
          reasons.push(`Secondary keyword: ${keyword}`);
        }
      }

      if (score > 0) {
        scores.push({
          category,
          confidence: Math.min(score / 10, 1), // Normalize to 0-1
          keywords: foundKeywords,
          reasons,
        });
      }
    }

    return scores.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate asset relevance scores
   */
  private calculateAssetRelevance(
    content: string,
    relatedAssets: string[]
  ): AssetRelevance[] {
    const relevanceScores: AssetRelevance[] = [];

    for (const asset of relatedAssets) {
      const mentions = this.countMentions(content, asset);
      const context = this.extractAssetContext(content, asset);

      if (mentions > 0) {
        relevanceScores.push({
          symbol: asset,
          relevance: Math.min(mentions / 5, 1), // Normalize mentions
          mentions,
          context,
        });
      }
    }

    return relevanceScores.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Count mentions of an asset in content
   */
  private countMentions(content: string, asset: string): number {
    const variations = [
      asset,
      asset.toLowerCase(),
      `$${asset}`,
      `${asset} stock`,
      `${asset} shares`,
    ];

    let count = 0;
    for (const variation of variations) {
      const regex = new RegExp(`\\b${variation}\\b`, 'gi');
      const matches = content.match(regex);
      count += matches ? matches.length : 0;
    }

    return count;
  }

  /**
   * Extract context around asset mentions
   */
  private extractAssetContext(content: string, asset: string): string[] {
    const contexts: string[] = [];
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(asset.toLowerCase())) {
        contexts.push(sentence.trim());
      }
    }

    return contexts.slice(0, 3); // Limit to 3 contexts
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const topics = new Set<string>();

    // Extract from all category keywords
    for (const categoryKeywords of Object.values(this.categoryKeywords)) {
      for (const keyword of [
        ...categoryKeywords.primary,
        ...categoryKeywords.secondary,
      ]) {
        if (content.includes(keyword)) {
          topics.add(keyword);
        }
      }
    }

    // Extract common financial terms
    const financialTerms = [
      'stock',
      'market',
      'trading',
      'investment',
      'portfolio',
      'dividend',
      'yield',
      'volatility',
      'bull market',
      'bear market',
    ];

    for (const term of financialTerms) {
      if (content.includes(term)) {
        topics.add(term);
      }
    }

    return Array.from(topics).slice(0, 10); // Limit to 10 topics
  }

  /**
   * Analyze sentiment of content
   */
  private analyzeSentiment(content: string): CategorizationResult['sentiment'] {
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    const aspects: { [key: string]: number } = {};

    // Count sentiment keywords
    for (const keyword of this.sentimentKeywords.positive) {
      const count = this.countKeywordOccurrences(content, keyword);
      positiveScore += count;
      if (count > 0) aspects[keyword] = count;
    }

    for (const keyword of this.sentimentKeywords.negative) {
      const count = this.countKeywordOccurrences(content, keyword);
      negativeScore += count;
      if (count > 0) aspects[keyword] = -count;
    }

    for (const keyword of this.sentimentKeywords.neutral) {
      const count = this.countKeywordOccurrences(content, keyword);
      neutralScore += count;
      if (count > 0) aspects[keyword] = 0;
    }

    // Determine overall sentiment
    const totalScore = positiveScore + negativeScore + neutralScore;
    let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0;

    if (totalScore > 0) {
      if (positiveScore > negativeScore && positiveScore > neutralScore) {
        overall = 'positive';
        confidence = positiveScore / totalScore;
      } else if (
        negativeScore > positiveScore &&
        negativeScore > neutralScore
      ) {
        overall = 'negative';
        confidence = negativeScore / totalScore;
      } else {
        overall = 'neutral';
        confidence = neutralScore / totalScore;
      }
    }

    return {
      overall,
      confidence: Math.min(confidence, 1),
      aspects,
    };
  }

  /**
   * Determine urgency level
   */
  private determineUrgency(content: string): 'low' | 'medium' | 'high' {
    for (const keyword of this.urgencyKeywords.high) {
      if (content.includes(keyword)) {
        return 'high';
      }
    }

    for (const keyword of this.urgencyKeywords.medium) {
      if (content.includes(keyword)) {
        return 'medium';
      }
    }

    return 'low';
  }

  /**
   * Determine market impact level
   */
  private determineMarketImpact(content: string): 'low' | 'medium' | 'high' {
    for (const keyword of this.marketImpactKeywords.high) {
      if (content.includes(keyword)) {
        return 'high';
      }
    }

    for (const keyword of this.marketImpactKeywords.medium) {
      if (content.includes(keyword)) {
        return 'medium';
      }
    }

    return 'low';
  }

  /**
   * Count keyword occurrences in content
   */
  private countKeywordOccurrences(content: string, keyword: string): number {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Get categorization statistics
   */
  getStats(): Record<string, unknown> {
    return {
      categories: Object.keys(this.categoryKeywords).length,
      totalKeywords: Object.values(this.categoryKeywords).reduce(
        (total, keywords) =>
          total + keywords.primary.length + keywords.secondary.length,
        0
      ),
      sentimentKeywords: {
        positive: this.sentimentKeywords.positive.length,
        negative: this.sentimentKeywords.negative.length,
        neutral: this.sentimentKeywords.neutral.length,
      },
      urgencyLevels: Object.keys(this.urgencyKeywords).length,
      marketImpactLevels: Object.keys(this.marketImpactKeywords).length,
    };
  }
}
