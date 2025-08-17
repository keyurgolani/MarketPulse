import { DataAggregationService } from './DataAggregationService';
import { NewsAggregationService, NewsArticle } from './NewsAggregationService';
import {
  ContentFilterService,
  ContentFilterConfig,
} from './ContentFilterService';
import {
  IntelligentCategorizationService,
  CategorizationResult,
} from './IntelligentCategorizationService';
import { ApiCacheService } from './ApiCacheService';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';
import {
  MarketQuote,
  SymbolSearchResult,
  HealthCheckResult,
} from '../types/api-contracts';

/**
 * Integration service options
 */
export interface IntegrationOptions {
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableFiltering?: boolean;
  enableCategorization?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Comprehensive market data response
 */
export interface MarketDataResponse {
  quotes: MarketQuote[];
  news: NewsArticle[];
  categorization?: Map<string, CategorizationResult>;
  metadata: {
    sources: string[];
    timestamp: Date;
    cacheHit: boolean;
    processingTime: number;
  };
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    dataAggregation: HealthCheckResult;
    newsAggregation: { status: 'healthy' | 'unhealthy'; sources: unknown[] };
    contentFilter: { status: 'healthy' };
    categorization: { status: 'healthy' };
    cache: { status: 'healthy' | 'unhealthy'; isHealthy: boolean };
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
}

/**
 * External API Integration Service
 * Main service that orchestrates all external API integrations
 */
export class ExternalAPIIntegrationService {
  private dataAggregationService: DataAggregationService;
  private newsAggregationService: NewsAggregationService;
  private contentFilterService: ContentFilterService;
  private categorizationService: IntelligentCategorizationService;
  private cacheService!: ApiCacheService;

  private readonly defaultOptions: IntegrationOptions = {
    enableCaching: true,
    cacheTimeout: 300, // 5 minutes
    enableFiltering: true,
    enableCategorization: true,
    maxRetries: 3,
    timeoutMs: 30000,
  };

  // Performance tracking
  private performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
  };

  constructor(
    contentFilterConfig?: ContentFilterConfig,
    options: IntegrationOptions = {}
  ) {
    this.dataAggregationService = new DataAggregationService();
    this.newsAggregationService = new NewsAggregationService();
    this.contentFilterService = new ContentFilterService(
      contentFilterConfig || {
        keywords: { required: [], excluded: [], spam: [] },
        categories: { allowed: [], blocked: [] },
        quality: { minWordCount: 50, maxWordCount: 5000, minReadTime: 30 },
        sentiment: {
          allowedLabels: ['positive', 'negative', 'neutral'],
          minConfidence: 0.3,
        },
      }
    );
    this.categorizationService = new IntelligentCategorizationService();
    // Initialize cache service with the singleton instance
    const cacheService = CacheService.getInstance();
    this.cacheService = new ApiCacheService(cacheService);

    logger.info('External API Integration Service initialized', {
      options: { ...this.defaultOptions, ...options },
    });
  }

  /**
   * Get comprehensive market data for symbols
   */
  async getMarketData(
    symbols: string[],
    options: IntegrationOptions = {}
  ): Promise<MarketDataResponse> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    const correlationId = `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Starting comprehensive market data fetch', {
      symbols,
      options: mergedOptions,
      correlationId,
    });

    this.performanceMetrics.totalRequests++;

    try {
      const cacheKey = `market-data:${symbols.join(',')}`;
      let cacheHit = false;

      // Check cache if enabled
      if (mergedOptions.enableCaching) {
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          logger.info('Returning cached market data', { correlationId });
          cacheHit = true;
          const cachedData = cached as {
            quotes?: MarketQuote[];
            news?: NewsArticle[];
            searchResults?: SymbolSearchResult[];
            categorization?: Map<string, unknown>;
            metadata?: Record<string, unknown>;
          };
          return {
            quotes: cachedData.quotes || [],
            news: cachedData.news || [],
            categorization: cachedData.categorization || new Map(),
            metadata: {
              ...(cachedData.metadata || {}),
              sources: ['cache'],
              timestamp: new Date(),
              cacheHit: true,
              processingTime: 0,
            },
          };
        }
      }

      // Fetch quotes in parallel
      const quotePromises = symbols.map(symbol =>
        this.dataAggregationService.getQuote(symbol, {
          timeoutMs: mergedOptions.timeoutMs || 30000,
          maxRetries: mergedOptions.maxRetries || 3,
        })
      );

      // Fetch news related to symbols
      const newsPromise = this.newsAggregationService.getArticlesByAssets(
        symbols,
        {
          limit: 20,
          since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          includeContent: true,
          includeSentiment: true,
        }
      );

      // Wait for all data
      const [quotes, rawNews] = await Promise.all([
        Promise.allSettled(quotePromises),
        newsPromise,
      ]);

      // Process quote results
      const successfulQuotes: MarketQuote[] = [];
      const sources = new Set<string>();

      quotes.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulQuotes.push(result.value);
          sources.add(result.value.source);
        } else {
          logger.warn('Failed to fetch quote', {
            symbol: symbols[index],
            error: result.reason?.message,
            correlationId,
          });
        }
      });

      // Filter news if enabled
      let filteredNews = rawNews;
      if (mergedOptions.enableFiltering) {
        filteredNews = this.contentFilterService.filterArticles(rawNews);
      }

      // Categorize news if enabled
      let categorization: Map<string, CategorizationResult> | undefined;
      if (mergedOptions.enableCategorization) {
        categorization =
          this.categorizationService.categorizeArticles(filteredNews);
      }

      const processingTime = Date.now() - startTime;

      const response: MarketDataResponse = {
        quotes: successfulQuotes,
        news: filteredNews,
        ...(categorization && { categorization }),
        metadata: {
          sources: Array.from(sources),
          timestamp: new Date(),
          cacheHit,
          processingTime,
        },
      };

      // Cache the response if enabled
      if (mergedOptions.enableCaching && !cacheHit) {
        await this.cacheService.set(cacheKey, response, {
          ttl: mergedOptions.cacheTimeout || 300,
        });
      }

      // Update performance metrics
      this.performanceMetrics.successfulRequests++;
      this.performanceMetrics.totalResponseTime += processingTime;
      this.performanceMetrics.averageResponseTime =
        this.performanceMetrics.totalResponseTime /
        this.performanceMetrics.totalRequests;

      logger.info('Market data fetch completed successfully', {
        symbolCount: symbols.length,
        quotesReturned: successfulQuotes.length,
        newsArticles: filteredNews.length,
        processingTime,
        correlationId,
      });

      return response;
    } catch (error) {
      this.performanceMetrics.failedRequests++;

      logger.error('Market data fetch failed', {
        symbols,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      });

      throw error;
    }
  }

  /**
   * Search for symbols with related news
   */
  async searchSymbolsWithNews(
    query: string,
    options: IntegrationOptions = {}
  ): Promise<{
    symbols: SymbolSearchResult[];
    news: NewsArticle[];
    categorization?: Map<string, CategorizationResult>;
  }> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const correlationId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Starting symbol search with news', {
      query,
      correlationId,
    });

    try {
      // Search symbols and news in parallel
      const [symbols, rawNews] = await Promise.all([
        this.dataAggregationService.searchSymbols(query, 10, {
          timeoutMs: mergedOptions.timeoutMs || 30000,
        }),
        this.newsAggregationService.searchArticles(query, {
          limit: 15,
          since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        }),
      ]);

      // Filter news if enabled
      let filteredNews = rawNews;
      if (mergedOptions.enableFiltering) {
        filteredNews = this.contentFilterService.filterArticles(rawNews);
      }

      // Categorize news if enabled
      let categorization: Map<string, CategorizationResult> | undefined;
      if (mergedOptions.enableCategorization) {
        categorization =
          this.categorizationService.categorizeArticles(filteredNews);
      }

      logger.info('Symbol search with news completed', {
        query,
        symbolsFound: symbols.length,
        newsArticles: filteredNews.length,
        correlationId,
      });

      return {
        symbols,
        news: filteredNews,
        ...(categorization && { categorization }),
      };
    } catch (error) {
      logger.error('Symbol search with news failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      });

      throw error;
    }
  }

  /**
   * Get comprehensive service health status
   */
  async getHealthStatus(): Promise<ServiceHealthStatus> {
    logger.info('Starting comprehensive health check');

    try {
      // Check all services in parallel
      const [dataHealth, newsHealth, cacheHealth] = await Promise.all([
        this.dataAggregationService.getHealthStatus(),
        this.newsAggregationService.healthCheck(),
        Promise.resolve({ isHealthy: true }),
      ]);

      // Determine overall health
      const healthyServices = [
        Object.values(dataHealth).some(h => h.status === 'healthy'),
        newsHealth.status === 'healthy',
        cacheHealth.isHealthy,
      ];

      const healthyCount = healthyServices.filter(Boolean).length;
      let overall: 'healthy' | 'degraded' | 'unhealthy';

      if (healthyCount === healthyServices.length) {
        overall = 'healthy';
      } else if (healthyCount > 0) {
        overall = 'degraded';
      } else {
        overall = 'unhealthy';
      }

      const status: ServiceHealthStatus = {
        overall,
        services: {
          dataAggregation: Object.values(dataHealth)[0] || {
            status: 'unhealthy',
            latency: 0,
          },
          newsAggregation: newsHealth,
          contentFilter: { status: 'healthy' },
          categorization: { status: 'healthy' },
          cache: {
            status: cacheHealth.isHealthy ? 'healthy' : 'unhealthy',
            isHealthy: cacheHealth.isHealthy,
          },
        },
        performance: {
          averageResponseTime: this.performanceMetrics.averageResponseTime,
          successRate:
            this.performanceMetrics.totalRequests > 0
              ? this.performanceMetrics.successfulRequests /
                this.performanceMetrics.totalRequests
              : 0,
          errorRate:
            this.performanceMetrics.totalRequests > 0
              ? this.performanceMetrics.failedRequests /
                this.performanceMetrics.totalRequests
              : 0,
        },
      };

      logger.info('Health check completed', {
        overall: status.overall,
        performance: status.performance,
      });

      return status;
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        overall: 'unhealthy',
        services: {
          dataAggregation: { status: 'unhealthy', latency: 0 },
          newsAggregation: { status: 'unhealthy', sources: [] },
          contentFilter: { status: 'healthy' },
          categorization: { status: 'healthy' },
          cache: { status: 'unhealthy', isHealthy: false },
        },
        performance: {
          averageResponseTime: 0,
          successRate: 0,
          errorRate: 1,
        },
      };
    }
  }

  /**
   * Get comprehensive service statistics
   */
  getStats(): Record<string, unknown> {
    return {
      performance: this.performanceMetrics,
      services: {
        dataAggregation: this.dataAggregationService.getStats(),
        newsAggregation: this.newsAggregationService.getStats(),
        contentFilter: this.contentFilterService.getStats(),
        categorization: this.categorizationService.getStats(),
        cache: this.cacheService.getStats(),
      },
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
    };

    logger.info('Performance metrics reset');
  }
}
