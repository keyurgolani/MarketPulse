import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NewsAggregationService } from '../services/NewsAggregationService';

// Create service instance
const newsAggregationService = new NewsAggregationService();
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';

// Extend user type for authentication
interface AuthenticatedUser {
  id: string;
  email?: string;
  isAdmin?: boolean;
}

// Request validation schemas
const NewsQuerySchema = z.object({
  symbols: z.string().optional(),
  category: z
    .enum([
      'general',
      'business',
      'technology',
      'markets',
      'earnings',
      'crypto',
      'forex',
    ])
    .optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  search: z.string().optional(),
  include_analysis: z
    .string()
    .transform(val => val === 'true')
    .optional(),
});

const MarketAnalysisSchema = z.object({
  symbols: z.string().optional(),
  timeframe: z.enum(['1h', '4h', '1d', '1w']).optional(),
  analysis_type: z
    .enum(['technical', 'fundamental', 'sentiment', 'all'])
    .optional(),
});

/**
 * News Controller
 * Handles news aggregation and filtering operations
 */
export class NewsController {
  /**
   * Get aggregated news with filtering
   */
  static async getNews(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = NewsQuerySchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        symbols,
        category = 'general',
        sentiment,
        page = 1,
        limit = 20,
        from_date,
        to_date,
        search,
        include_analysis = false,
      } = validation.data;

      // Build cache key
      const cacheKey = `news:${category}:${symbols || 'all'}:${sentiment || 'all'}:${page}:${limit}:${from_date || ''}:${to_date || ''}:${search || ''}:${include_analysis}`;

      // Check cache first (10 minutes for news)
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info('News retrieved from cache', {
          category,
          symbols,
          count: (cached as { articles?: unknown[] })?.articles?.length || 0,
        });

        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
            page,
            limit,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Prepare filters
      const filters = {
        category,
        symbols: symbols
          ? symbols.split(',').map(s => s.trim().toUpperCase())
          : undefined,
        sentiment,
        fromDate: from_date ? new Date(from_date) : undefined,
        toDate: to_date ? new Date(to_date) : undefined,
        search,
        limit,
        offset: (page - 1) * limit,
      };

      // Fetch news from aggregation service
      const newsArticles = await newsAggregationService.aggregateNews(filters);
      const newsData: {
        articles: typeof newsArticles;
        total: number;
        analysis?: {
          message: string;
          symbols: string[];
        };
      } = {
        articles: newsArticles,
        total: newsArticles.length,
      };

      // Add market analysis if requested (placeholder for now)
      if (include_analysis && symbols) {
        newsData.analysis = {
          message: 'Market analysis feature coming soon',
          symbols: symbols.split(',').map(s => s.trim().toUpperCase()),
        };
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, newsData, 600);

      logger.info('News retrieved successfully', {
        category,
        symbols,
        sentiment,
        count: newsData.articles?.length || 0,
        includeAnalysis: include_analysis,
      });

      res.json({
        success: true,
        data: newsData,
        meta: {
          cached: false,
          page,
          limit,
          total: newsData.total || newsData.articles?.length || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Get news for specific symbol
   */
  static async getSymbolNews(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { symbol } = req.params;
      const validation = NewsQuerySchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!symbol) {
        res.status(400).json({
          success: false,
          error: 'Symbol is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        category = 'general',
        sentiment,
        page = 1,
        limit = 20,
        from_date,
        to_date,
        include_analysis = true,
      } = validation.data;

      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `news:symbol:${upperSymbol}:${category}:${sentiment || 'all'}:${page}:${limit}:${from_date || ''}:${to_date || ''}:${include_analysis}`;

      // Check cache first (5 minutes for symbol-specific news)
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
            symbol: upperSymbol,
            page,
            limit,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Prepare filters for specific symbol
      const filters = {
        category,
        symbols: [upperSymbol],
        sentiment,
        fromDate: from_date ? new Date(from_date) : undefined,
        toDate: to_date ? new Date(to_date) : undefined,
        limit,
        offset: (page - 1) * limit,
      };

      // Fetch symbol-specific news using getArticlesByAssets
      const newsArticles = await newsAggregationService.getArticlesByAssets(
        [upperSymbol],
        filters
      );
      const newsData: {
        articles: typeof newsArticles;
        total: number;
        symbol: string;
        analysis?: {
          message: string;
          symbol: string;
        };
      } = {
        articles: newsArticles,
        total: newsArticles.length,
        symbol: upperSymbol,
      };

      // Add market analysis if requested (placeholder for now)
      if (include_analysis) {
        newsData.analysis = {
          message: 'Market analysis feature coming soon',
          symbol: upperSymbol,
        };
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, newsData, 300);

      logger.info('Symbol news retrieved successfully', {
        symbol: upperSymbol,
        category,
        sentiment,
        count: newsData.articles?.length || 0,
        includeAnalysis: include_analysis,
      });

      res.json({
        success: true,
        data: newsData,
        meta: {
          cached: false,
          symbol: upperSymbol,
          page,
          limit,
          total: newsData.total || newsData.articles?.length || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving symbol news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Get market analysis
   */
  static async getMarketAnalysis(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = MarketAnalysisSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        symbols,
        timeframe = '1d',
        analysis_type = 'all',
      } = validation.data;

      const cacheKey = `analysis:${symbols || 'market'}:${timeframe}:${analysis_type}`;

      // Check cache first (15 minutes for analysis)
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
            timeframe,
            analysisType: analysis_type,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let analysisData;

      if (symbols) {
        // Get analysis for specific symbols (placeholder)
        const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
        analysisData = {
          symbols: symbolList,
          analyses: symbolList.map(symbol => ({
            symbol,
            message: 'Market analysis feature coming soon',
          })),
          timeframe,
          analysisType: analysis_type,
        };
      } else {
        // Get general market analysis (placeholder)
        analysisData = {
          message: 'General market analysis feature coming soon',
          timeframe,
          analysisType: analysis_type,
        };
      }

      // Cache for 15 minutes
      await cache.set(cacheKey, analysisData, 900);

      logger.info('Market analysis retrieved successfully', {
        symbols,
        timeframe,
        analysisType: analysis_type,
        count: analysisData.analyses?.length || 1,
      });

      res.json({
        success: true,
        data: analysisData,
        meta: {
          cached: false,
          timeframe,
          analysisType: analysis_type,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving market analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Get trending news topics
   */
  static async getTrendingTopics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { timeframe = '1d', limit = 10 } = req.query;
      const cacheKey = `trending:${timeframe}:${limit}`;

      // Check cache first (30 minutes for trending topics)
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
            timeframe,
            limit,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch trending topics
      const trendingTopics = await newsAggregationService.getTrendingTopics(
        timeframe as '1h' | '6h' | '1d' | '1w'
      );
      const trendingData = {
        topics: trendingTopics.slice(0, parseInt(limit as string, 10)),
        timeframe,
        total: trendingTopics.length,
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, trendingData, 1800);

      logger.info('Trending topics retrieved successfully', {
        timeframe,
        limit,
        count: trendingData.topics.length,
      });

      res.json({
        success: true,
        data: trendingData,
        meta: {
          cached: false,
          timeframe,
          limit,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving trending topics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Clear news cache
   */
  static async clearCache(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { symbol } = req.params;
      const userAuth = req.user as AuthenticatedUser;

      // Only allow admins to clear cache
      if (!userAuth?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Administrator access required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (symbol) {
        // Clear cache for specific symbol
        const upperSymbol = symbol.toUpperCase();
        const patterns = [
          `news:symbol:${upperSymbol}:*`,
          `analysis:${upperSymbol}:*`,
        ];

        for (const pattern of patterns) {
          await cache.deletePattern(pattern);
        }

        logger.info('News cache cleared for symbol', { symbol: upperSymbol });

        res.json({
          success: true,
          message: `News cache cleared for ${upperSymbol}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Clear all news cache
        const patterns = ['news:*', 'analysis:*', 'trending:*'];

        for (const pattern of patterns) {
          await cache.deletePattern(pattern);
        }

        logger.info('All news cache cleared');

        res.json({
          success: true,
          message: 'All news cache cleared',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error clearing news cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
      });
      next(error);
    }
  }
}
