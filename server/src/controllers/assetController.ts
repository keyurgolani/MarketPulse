import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MarketDataService } from '../services/MarketDataService';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
// import { HistoricalData } from '../../../src/types/market';

// Create service instance
const marketDataService = new MarketDataService();

// Extend user type for authentication
interface AuthenticatedUser {
  id: string;
  email?: string;
  isAdmin?: boolean;
}

// Request validation schemas
const AssetQuerySchema = z.object({
  symbols: z.string().optional(),
  search: z.string().optional(),
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
  include_metrics: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  include_history: z
    .string()
    .transform(val => val === 'true')
    .optional(),
});

const PriceHistorySchema = z.object({
  period: z
    .enum([
      '1d',
      '5d',
      '1mo',
      '3mo',
      '6mo',
      '1y',
      '2y',
      '5y',
      '10y',
      'ytd',
      'max',
    ])
    .optional(),
  interval: z
    .enum([
      '1m',
      '2m',
      '5m',
      '15m',
      '30m',
      '60m',
      '90m',
      '1h',
      '1d',
      '5d',
      '1wk',
      '1mo',
      '3mo',
    ])
    .optional(),
});

const WatchlistSchema = z.object({
  symbols: z.array(z.string()).min(1).max(50),
});

/**
 * Asset Controller
 * Handles asset data operations with caching
 */
export class AssetController {
  /**
   * Get asset data by symbols
   */
  static async getAssets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = AssetQuerySchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { symbols, search, page = 1, limit = 20 } = validation.data;

      if (symbols) {
        // Get specific assets by symbols
        const symbolList = symbols
          .split(',')
          .map(s => s.trim().toUpperCase())
          .slice(0, 50);
        const cacheKey = `assets:symbols:${symbolList.join(',')}`;

        // Check cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
          logger.info('Assets retrieved from cache', {
            symbols: symbolList,
            count: Array.isArray(cached) ? cached.length : 0,
          });

          res.json({
            success: true,
            data: cached,
            meta: {
              total: Array.isArray(cached) ? cached.length : 0,
              cached: true,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Fetch quotes for all symbols
        const batchRequest = {
          symbols: symbolList,
          fields: [
            'symbol',
            'regularMarketPrice',
            'regularMarketChange',
            'regularMarketChangePercent',
            'regularMarketVolume',
            'marketCap',
            'shortName',
            'longName',
          ],
        };

        const batchResponse =
          await marketDataService.getBatchQuotes(batchRequest);
        const assets = batchResponse.data || [];

        // Cache the results for 5 minutes
        await cache.set(cacheKey, assets, 300);

        logger.info('Assets retrieved successfully', {
          count: assets.length,
          symbols: symbolList.join(','),
        });

        res.json({
          success: true,
          data: assets,
          meta: {
            total: assets.length,
            cached: false,
          },
          timestamp: new Date().toISOString(),
        });
      } else if (search) {
        // Search for symbols
        const cacheKey = `assets:search:${search}:${page}:${limit}`;

        const cached = await cache.get(cacheKey);
        if (cached) {
          res.json({
            success: true,
            data: cached,
            meta: {
              total: Array.isArray(cached) ? cached.length : 0,
              page,
              limit,
              cached: true,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Search using market data service
        const searchResults = await marketDataService.searchSymbols(search);
        const assets = searchResults.slice(0, limit);

        // Cache search results for 10 minutes
        await cache.set(cacheKey, assets, 600);

        logger.info('Asset search completed', {
          search,
          count: assets.length,
        });

        res.json({
          success: true,
          data: assets,
          meta: {
            total: assets.length,
            page,
            limit,
            cached: false,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // Get market summary (popular assets)
        const cacheKey = `assets:popular:${page}:${limit}`;

        const cached = await cache.get(cacheKey);
        if (cached) {
          res.json({
            success: true,
            data: cached,
            meta: {
              total: Array.isArray(cached) ? cached.length : 0,
              page,
              limit,
              cached: true,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get market summary
        const marketSummary = await marketDataService.getMarketSummary();
        const assets = marketSummary.slice(0, limit);

        // Cache for 15 minutes
        await cache.set(cacheKey, assets, 900);

        logger.info('Market summary retrieved', {
          count: assets.length,
        });

        res.json({
          success: true,
          data: assets,
          meta: {
            total: assets.length,
            page,
            limit,
            cached: false,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving assets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Get specific asset by symbol
   */
  static async getAsset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { symbol } = req.params;
      const { include_history = 'false' } = req.query;

      if (!symbol) {
        res.status(400).json({
          success: false,
          error: 'Asset symbol is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `asset:${upperSymbol}:${include_history}`;

      // Check cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info('Asset retrieved from cache', {
          symbol: upperSymbol,
        });

        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch quote data
      const quoteData = await marketDataService.getQuote(upperSymbol);
      let assetData: typeof quoteData & { history?: unknown } = quoteData;

      if (include_history === 'true') {
        try {
          const history = await marketDataService.getHistoricalData(
            upperSymbol,
            '1mo'
          );
          assetData = { ...quoteData, history: history };
        } catch (error) {
          logger.warn('Failed to fetch historical data', {
            symbol: upperSymbol,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Cache for 2 minutes (real-time data)
      await cache.set(cacheKey, assetData, 120);

      logger.info('Asset retrieved successfully', {
        symbol: upperSymbol,
        includeHistory: include_history === 'true',
      });

      res.json({
        success: true,
        data: assetData,
        meta: {
          cached: false,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving asset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Asset not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Get real-time price for asset
   */
  static async getPrice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        res.status(400).json({
          success: false,
          error: 'Asset symbol is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `price:${upperSymbol}`;

      // Check cache first (30 seconds for real-time prices)
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch real-time price using getQuote
      const priceData = await marketDataService.getQuote(upperSymbol);

      // Cache for 30 seconds
      await cache.set(cacheKey, priceData, 30);

      logger.info('Real-time price retrieved', {
        symbol: upperSymbol,
        price: priceData.price,
      });

      res.json({
        success: true,
        data: priceData,
        meta: {
          cached: false,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving price', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
      });
      next(error);
    }
  }

  /**
   * Get price history for asset
   */
  static async getPriceHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { symbol } = req.params;
      const validation = PriceHistorySchema.safeParse(req.query);

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
          error: 'Asset symbol is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { period = '1mo' } = validation.data;
      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `history:${upperSymbol}:${period}`;

      // Check cache first (cache for longer periods)
      const cacheTime = period === '1d' ? 300 : period === '5d' ? 600 : 1800; // 5min, 10min, 30min
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
            period,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch price history
      const historyData = await marketDataService.getHistoricalData(
        upperSymbol,
        period
      );

      // Cache the results
      await cache.set(cacheKey, historyData, cacheTime);

      logger.info('Price history retrieved', {
        symbol: upperSymbol,
        period,
        dataPoints: Array.isArray(historyData) ? historyData.length : 0,
      });

      res.json({
        success: true,
        data: historyData,
        meta: {
          cached: false,
          period,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving price history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Get multiple assets for watchlist
   */
  static async getWatchlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = WatchlistSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid watchlist data',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { symbols } = validation.data;
      const upperSymbols = symbols.map(s => s.toUpperCase());
      const cacheKey = `watchlist:${upperSymbols.join(',')}`;

      // Check cache first (2 minutes for watchlist)
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          meta: {
            total: Array.isArray(cached) ? cached.length : 0,
            cached: true,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch all assets using batch quotes
      const batchRequest = {
        symbols: upperSymbols,
        fields: [
          'symbol',
          'regularMarketPrice',
          'regularMarketChange',
          'regularMarketChangePercent',
          'regularMarketVolume',
          'shortName',
        ],
      };

      const batchResponse =
        await marketDataService.getBatchQuotes(batchRequest);
      const watchlistData = batchResponse.data || [];

      // Cache for 2 minutes
      await cache.set(cacheKey, watchlistData, 120);

      logger.info('Watchlist retrieved', {
        requested: symbols.length,
        retrieved: watchlistData.length,
      });

      res.json({
        success: true,
        data: watchlistData,
        meta: {
          total: watchlistData.length,
          requested: symbols.length,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving watchlist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });
      next(error);
    }
  }

  /**
   * Clear asset cache
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
          `asset:${upperSymbol}:*`,
          `price:${upperSymbol}`,
          `history:${upperSymbol}:*`,
        ];

        for (const pattern of patterns) {
          await cache.deletePattern(pattern);
        }

        logger.info('Asset cache cleared', { symbol: upperSymbol });

        res.json({
          success: true,
          message: `Cache cleared for ${upperSymbol}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Clear all asset cache
        const patterns = [
          'asset:*',
          'assets:*',
          'price:*',
          'history:*',
          'watchlist:*',
        ];

        for (const pattern of patterns) {
          await cache.deletePattern(pattern);
        }

        logger.info('All asset cache cleared');

        res.json({
          success: true,
          message: 'All asset cache cleared',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error clearing asset cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
      });
      next(error);
    }
  }
}
