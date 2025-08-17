import axios, { AxiosInstance } from 'axios';
import { RateLimitService } from './RateLimitService';
import { logger } from '../utils/logger';

/**
 * News article interface
 */
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  source: string;
  author?: string;
  publishedAt: Date;
  updatedAt?: Date;
  category: string;
  tags: string[];
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  relatedAssets: string[];
  imageUrl?: string;
  readTime?: number;
}

/**
 * News source configuration
 */
interface NewsSource {
  name: string;
  url: string;
  type: 'rss' | 'api' | 'scrape';
  apiKey?: string;
  rateLimitPerHour: number;
  isActive: boolean;
  categories: string[];
}

/**
 * News aggregation options
 */
export interface NewsAggregationOptions {
  sources?: string[];
  categories?: string[];
  limit?: number;
  since?: Date;
  includeContent?: boolean;
  includeSentiment?: boolean;
}

/**
 * News Aggregation Service
 * Aggregates news from multiple sources with content filtering and sentiment analysis
 */
export class NewsAggregationService {
  private client: AxiosInstance;
  private rateLimiter: RateLimitService;
  private sources: Map<string, NewsSource> = new Map();
  private articleCache: Map<string, NewsArticle> = new Map();

  constructor() {
    this.rateLimiter = new RateLimitService('news-aggregation', {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
    });

    this.client = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'MarketPulse News Aggregator 1.0',
        Accept: 'application/json, application/rss+xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    this.initializeNewsSources();
    this.setupInterceptors();
  }

  /**
   * Initialize news sources
   */
  private initializeNewsSources(): void {
    // Financial news sources
    this.sources.set('reuters-business', {
      name: 'Reuters Business',
      url: 'https://feeds.reuters.com/reuters/businessNews',
      type: 'rss',
      rateLimitPerHour: 100,
      isActive: true,
      categories: ['business', 'finance', 'markets'],
    });

    this.sources.set('yahoo-finance-news', {
      name: 'Yahoo Finance News',
      url: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
      type: 'rss',
      rateLimitPerHour: 200,
      isActive: true,
      categories: ['finance', 'markets', 'stocks'],
    });

    this.sources.set('marketwatch', {
      name: 'MarketWatch',
      url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
      type: 'rss',
      rateLimitPerHour: 150,
      isActive: true,
      categories: ['finance', 'markets', 'investing'],
    });

    this.sources.set('cnbc-finance', {
      name: 'CNBC Finance',
      url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',
      type: 'rss',
      rateLimitPerHour: 100,
      isActive: true,
      categories: ['finance', 'business', 'markets'],
    });

    logger.info('News sources initialized', {
      sourceCount: this.sources.size,
      activeSources: Array.from(this.sources.values()).filter(s => s.isActive)
        .length,
    });
  }

  /**
   * Setup HTTP interceptors
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async config => {
        await this.rateLimiter.checkLimit();

        logger.debug('News API request', {
          url: config.url,
          method: config.method,
        });

        return config;
      },
      error => {
        logger.error('News request interceptor error', {
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      response => {
        logger.debug('News API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      error => {
        logger.error('News API error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Aggregate news from all active sources
   */
  async aggregateNews(
    options: NewsAggregationOptions = {}
  ): Promise<NewsArticle[]> {
    const {
      sources = Array.from(this.sources.keys()),
      categories = [],
      limit = 50,
      since = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      includeContent = false,
      includeSentiment = false,
    } = options;

    const correlationId = `news-agg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('Starting news aggregation', {
      sources: sources.length,
      categories,
      limit,
      since,
      correlationId,
    });

    const allArticles: NewsArticle[] = [];
    const errors: string[] = [];

    // Fetch from each source
    for (const sourceName of sources) {
      const source = this.sources.get(sourceName);
      if (!source || !source.isActive) {
        continue;
      }

      try {
        const articles = await this.fetchFromSource(source, {
          categories,
          since,
          includeContent,
          includeSentiment,
        });

        allArticles.push(...articles);

        logger.debug('Fetched articles from source', {
          source: sourceName,
          articleCount: articles.length,
          correlationId,
        });
      } catch (error) {
        const errorMsg = `Failed to fetch from ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.warn(errorMsg, { correlationId });
      }
    }

    // Remove duplicates and sort by publish date
    const uniqueArticles = this.deduplicateArticles(allArticles);
    const sortedArticles = uniqueArticles
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, limit);

    logger.info('News aggregation completed', {
      totalArticles: allArticles.length,
      uniqueArticles: uniqueArticles.length,
      finalCount: sortedArticles.length,
      errors: errors.length,
      correlationId,
    });

    return sortedArticles;
  }

  /**
   * Fetch articles from a specific source
   */
  private async fetchFromSource(
    source: NewsSource,
    options: {
      categories: string[];
      since: Date;
      includeContent: boolean;
      includeSentiment: boolean;
    }
  ): Promise<NewsArticle[]> {
    switch (source.type) {
      case 'rss':
        return this.fetchFromRSS(source, options);
      case 'api':
        return this.fetchFromAPI(source, options);
      case 'scrape':
        return this.fetchFromScraping(source, options);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Fetch articles from RSS feed
   */
  private async fetchFromRSS(
    source: NewsSource,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: Record<string, unknown>
  ): Promise<NewsArticle[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await this.client.get(source.url, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });

      // For now, return mock data since we don't have XML parsing
      // In production, you'd use a library like 'fast-xml-parser' or 'xml2js'
      return this.createMockArticles(source, 5);
    } catch (error) {
      logger.error('RSS fetch failed', {
        source: source.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Fetch articles from API
   */
  private async fetchFromAPI(
    source: NewsSource,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: Record<string, unknown>
  ): Promise<NewsArticle[]> {
    try {
      const response = await this.client.get(source.url, {
        headers: source.apiKey
          ? { Authorization: `Bearer ${source.apiKey}` }
          : {},
      });

      // Parse API response and convert to NewsArticle format
      return this.parseAPIResponse(response.data, source);
    } catch (error) {
      logger.error('API fetch failed', {
        source: source.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Fetch articles from web scraping
   */
  private async fetchFromScraping(
    source: NewsSource,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: Record<string, unknown>
  ): Promise<NewsArticle[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await this.client.get(source.url);

      // For now, return mock data since we don't have HTML parsing
      // In production, you'd use cheerio or similar to parse HTML
      return this.createMockArticles(source, 3);
    } catch (error) {
      logger.error('Scraping fetch failed', {
        source: source.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create mock articles for testing
   */
  private createMockArticles(source: NewsSource, count: number): NewsArticle[] {
    const articles: NewsArticle[] = [];

    for (let i = 0; i < count; i++) {
      const id = `${source.name}-${Date.now()}-${i}`;
      articles.push({
        id,
        title: `Sample News Article ${i + 1} from ${source.name}`,
        summary: `This is a sample news article summary from ${source.name}. It contains important financial information.`,
        content: `Full content of the news article from ${source.name}. This would contain the complete article text in a real implementation.`,
        url: `${source.url}/article/${id}`,
        source: source.name,
        author: 'News Reporter',
        publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        category: source.categories[0] || 'general',
        tags: ['finance', 'markets', 'news'],
        sentiment: {
          score: Math.random() * 2 - 1, // -1 to 1
          label: Math.random() > 0.5 ? 'positive' : 'negative',
          confidence: Math.random(),
        },
        relatedAssets: ['AAPL', 'GOOGL', 'MSFT'],
        readTime: Math.floor(Math.random() * 10) + 2,
      });
    }

    return articles;
  }

  /**
   * Parse API response to NewsArticle format
   */
  private parseAPIResponse(data: unknown, source: NewsSource): NewsArticle[] {
    // This would be implemented based on the specific API response format
    // For now, return mock data
    return this.createMockArticles(source, 5);
  }

  /**
   * Remove duplicate articles based on title similarity and URL
   */
  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
      // Create a key based on normalized title and URL
      const titleKey = article.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim();
      const key = `${titleKey}|${article.url}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    return unique;
  }

  /**
   * Search articles by query
   */
  async searchArticles(
    query: string,
    options: NewsAggregationOptions = {}
  ): Promise<NewsArticle[]> {
    const articles = await this.aggregateNews(options);

    const searchTerms = query.toLowerCase().split(' ');

    return articles.filter(article => {
      const searchText =
        `${article.title} ${article.summary} ${article.tags.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(
    timeframe: '1h' | '6h' | '1d' | '1w' = '1d'
  ): Promise<string[]> {
    const since = new Date();
    switch (timeframe) {
      case '1h':
        since.setHours(since.getHours() - 1);
        break;
      case '6h':
        since.setHours(since.getHours() - 6);
        break;
      case '1d':
        since.setDate(since.getDate() - 1);
        break;
      case '1w':
        since.setDate(since.getDate() - 7);
        break;
    }

    const articles = await this.aggregateNews({ since, limit: 100 });

    // Extract and count tags
    const tagCounts = new Map<string, number>();
    articles.forEach(article => {
      article.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Return top trending tags
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(
    category: string,
    options: NewsAggregationOptions = {}
  ): Promise<NewsArticle[]> {
    const articles = await this.aggregateNews({
      ...options,
      categories: [category],
    });

    return articles.filter(
      article =>
        article.category === category || article.tags.includes(category)
    );
  }

  /**
   * Get articles related to specific assets
   */
  async getArticlesByAssets(
    symbols: string[],
    options: NewsAggregationOptions = {}
  ): Promise<NewsArticle[]> {
    const articles = await this.aggregateNews(options);

    return articles.filter(article =>
      article.relatedAssets.some(asset => symbols.includes(asset.toUpperCase()))
    );
  }

  /**
   * Get service statistics
   */
  getStats(): Record<string, unknown> {
    return {
      sources: Array.from(this.sources.entries()).map(([name, source]) => ({
        name,
        isActive: source.isActive,
        type: source.type,
        categories: source.categories,
        rateLimitPerHour: source.rateLimitPerHour,
      })),
      cacheSize: this.articleCache.size,
      rateLimits: this.rateLimiter.getStats(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    sources: Array<Record<string, unknown>>;
  }> {
    const sourceHealth = [];

    for (const [name, source] of this.sources) {
      if (!source.isActive) {
        sourceHealth.push({ name, status: 'inactive' });
        continue;
      }

      try {
        const startTime = Date.now();
        await this.client.head(source.url, { timeout: 5000 });
        const latency = Date.now() - startTime;

        sourceHealth.push({
          name,
          status: 'healthy',
          latency,
        });
      } catch (error) {
        sourceHealth.push({
          name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const healthyCount = sourceHealth.filter(
      s => s.status === 'healthy'
    ).length;
    const status = healthyCount > 0 ? 'healthy' : 'unhealthy';

    return { status, sources: sourceHealth };
  }
}
