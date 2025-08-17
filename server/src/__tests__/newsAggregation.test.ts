import { NewsAggregationService } from '../services/NewsAggregationService';
// NewsArticle type imported for potential future use in test data

describe('NewsAggregationService', () => {
  let newsService: NewsAggregationService;

  beforeEach(() => {
    newsService = new NewsAggregationService();
  });

  describe('initialization', () => {
    it('should create NewsAggregationService instance', () => {
      expect(newsService).toBeDefined();
      expect(newsService).toBeInstanceOf(NewsAggregationService);
    });

    it('should have required methods', () => {
      expect(typeof newsService.aggregateNews).toBe('function');
      expect(typeof newsService.searchArticles).toBe('function');
      expect(typeof newsService.getTrendingTopics).toBe('function');
      expect(typeof newsService.getArticlesByCategory).toBe('function');
      expect(typeof newsService.getArticlesByAssets).toBe('function');
      expect(typeof newsService.getStats).toBe('function');
      expect(typeof newsService.healthCheck).toBe('function');
    });
  });

  describe('aggregateNews', () => {
    it('should aggregate news from multiple sources', async () => {
      const articles = await newsService.aggregateNews({
        limit: 10,
      });

      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThan(0);
      expect(articles.length).toBeLessThanOrEqual(10);

      // Check article structure
      const firstArticle = articles[0];
      expect(firstArticle).toBeDefined();
      expect(firstArticle?.id).toBeDefined();
      expect(firstArticle?.title).toBeDefined();
      expect(firstArticle?.summary).toBeDefined();
      expect(firstArticle?.url).toBeDefined();
      expect(firstArticle?.source).toBeDefined();
      expect(firstArticle?.publishedAt).toBeInstanceOf(Date);
      expect(firstArticle?.category).toBeDefined();
      expect(Array.isArray(firstArticle?.tags)).toBe(true);
      expect(Array.isArray(firstArticle?.relatedAssets)).toBe(true);
    });

    it('should filter by categories', async () => {
      const articles = await newsService.aggregateNews({
        categories: ['finance'],
        limit: 5,
      });

      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThan(0);

      // Check that articles are finance-related
      articles.forEach(article => {
        const isFinanceRelated =
          article.category === 'finance' ||
          article.tags.includes('finance') ||
          article.tags.includes('markets');
        expect(isFinanceRelated).toBe(true);
      });
    });

    it('should respect time filters', async () => {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const articles = await newsService.aggregateNews({
        since,
        limit: 10,
      });

      expect(Array.isArray(articles)).toBe(true);

      // All articles should be newer than the since date
      articles.forEach(article => {
        expect(article.publishedAt.getTime()).toBeGreaterThanOrEqual(
          since.getTime()
        );
      });
    });

    it('should limit results correctly', async () => {
      const limit = 3;
      const articles = await newsService.aggregateNews({ limit });

      expect(articles.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('searchArticles', () => {
    it('should search articles by query', async () => {
      const results = await newsService.searchArticles('finance', {
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check that results contain the search term
      results.forEach(article => {
        const searchText =
          `${article.title} ${article.summary} ${article.tags.join(' ')}`.toLowerCase();
        expect(searchText).toContain('finance');
      });
    });

    it('should handle empty search results', async () => {
      const results = await newsService.searchArticles('nonexistentterm12345', {
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should search with multiple terms', async () => {
      const results = await newsService.searchArticles('finance markets', {
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        results.forEach(article => {
          const searchText =
            `${article.title} ${article.summary} ${article.tags.join(' ')}`.toLowerCase();
          const hasFinance = searchText.includes('finance');
          const hasMarkets = searchText.includes('markets');
          expect(hasFinance || hasMarkets).toBe(true);
        });
      }
    });
  });

  describe('getTrendingTopics', () => {
    it('should return trending topics', async () => {
      const topics = await newsService.getTrendingTopics('1d');

      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
      expect(topics.length).toBeLessThanOrEqual(10);

      // All topics should be strings
      topics.forEach(topic => {
        expect(typeof topic).toBe('string');
        expect(topic.length).toBeGreaterThan(0);
      });
    });

    it('should handle different timeframes', async () => {
      const timeframes: Array<'1h' | '6h' | '1d' | '1w'> = [
        '1h',
        '6h',
        '1d',
        '1w',
      ];

      for (const timeframe of timeframes) {
        const topics = await newsService.getTrendingTopics(timeframe);
        expect(Array.isArray(topics)).toBe(true);
      }
    });
  });

  describe('getArticlesByCategory', () => {
    it('should return articles for specific category', async () => {
      const articles = await newsService.getArticlesByCategory('finance', {
        limit: 5,
      });

      expect(Array.isArray(articles)).toBe(true);

      if (articles.length > 0) {
        articles.forEach(article => {
          const isInCategory =
            article.category === 'finance' || article.tags.includes('finance');
          expect(isInCategory).toBe(true);
        });
      }
    });

    it('should handle non-existent categories', async () => {
      const articles = await newsService.getArticlesByCategory(
        'nonexistentcategory',
        {
          limit: 5,
        }
      );

      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBe(0);
    });
  });

  describe('getArticlesByAssets', () => {
    it('should return articles related to specific assets', async () => {
      const articles = await newsService.getArticlesByAssets(
        ['AAPL', 'GOOGL'],
        {
          limit: 5,
        }
      );

      expect(Array.isArray(articles)).toBe(true);

      if (articles.length > 0) {
        articles.forEach(article => {
          const hasRelatedAsset = article.relatedAssets.some(asset =>
            ['AAPL', 'GOOGL'].includes(asset.toUpperCase())
          );
          expect(hasRelatedAsset).toBe(true);
        });
      }
    });

    it('should handle empty asset list', async () => {
      const articles = await newsService.getArticlesByAssets([], {
        limit: 5,
      });

      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = newsService.getStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats.sources)).toBe(true);
      expect(typeof stats.cacheSize).toBe('number');
      expect(stats.rateLimits).toBeDefined();

      // Check source structure
      if (stats.sources.length > 0) {
        const firstSource = stats.sources[0];
        expect(firstSource?.name).toBeDefined();
        expect(typeof firstSource?.isActive).toBe('boolean');
        expect(firstSource?.type).toBeDefined();
        expect(Array.isArray(firstSource?.categories)).toBe(true);
        expect(typeof firstSource?.rateLimitPerHour).toBe('number');
      }
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await newsService.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|unhealthy/);
      expect(Array.isArray(health.sources)).toBe(true);

      // Check source health structure
      if (health.sources.length > 0) {
        const firstSource = health.sources[0];
        expect(firstSource?.name).toBeDefined();
        expect(firstSource?.status).toMatch(/healthy|unhealthy|inactive/);

        if (firstSource?.status === 'healthy') {
          expect(typeof firstSource.latency).toBe('number');
        }

        if (firstSource?.status === 'unhealthy') {
          expect(firstSource.error).toBeDefined();
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, just ensure the service doesn't crash
      const articles = await newsService.aggregateNews({
        limit: 1,
      });

      expect(Array.isArray(articles)).toBe(true);
    });
  });
});
