import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { createAssetService } from '../services/AssetService';
import { AssetQuerySchema } from '../schemas/validation';

// Initialize asset service
const assetService = createAssetService();

// Validation schemas for request parameters
const AssetSymbolSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,10}$/, 'Invalid symbol format'),
});

const AssetSearchSchema = z.object({
  q: z.string().min(1).max(100),
});

export class AssetController {
  /**
   * Get asset information by symbol
   * GET /api/assets/:symbol
   */
  static async getAsset(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = AssetSymbolSchema.parse(req.params);

      const asset = await assetService.getAsset(symbol);

      logger.info('Asset retrieved successfully', {
        symbol,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: asset,
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid symbol format',
          details: error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      logger.error('Error retrieving asset', {
        symbol: req.params.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: `Asset ${req.params.symbol} not found`,
          code: 'NOT_FOUND',
          timestamp: Date.now(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve asset',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get current price for an asset
   * GET /api/assets/:symbol/price
   */
  static async getAssetPrice(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = AssetSymbolSchema.parse(req.params);

      const price = await assetService.getAssetPrice(symbol);

      logger.info('Asset price retrieved successfully', {
        symbol,
        price: price.price,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: price,
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid symbol format',
          details: error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      logger.error('Error retrieving asset price', {
        symbol: req.params.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: `Price for ${req.params.symbol} not found`,
          code: 'NOT_FOUND',
          timestamp: Date.now(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve asset price',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get multiple assets by symbols
   * POST /api/assets/batch
   */
  static async getAssets(req: Request, res: Response): Promise<void> {
    try {
      const BatchRequestSchema = z.object({
        symbols: z
          .array(z.string().regex(/^[A-Z]{1,10}$/))
          .min(1)
          .max(50),
      });

      const { symbols } = BatchRequestSchema.parse(req.body);

      const assets = await assetService.getAssets(symbols);

      logger.info('Multiple assets retrieved successfully', {
        symbolCount: symbols.length,
        resultCount: assets.length,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: assets,
        metadata: {
          requested: symbols.length,
          returned: assets.length,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request format',
          details: error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      logger.error('Error retrieving multiple assets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve assets',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Search for assets
   * GET /api/assets/search?q=query
   */
  static async searchAssets(req: Request, res: Response): Promise<void> {
    try {
      const { q } = AssetSearchSchema.parse(req.query);

      const assets = await assetService.searchAssets(q);

      logger.info('Asset search completed', {
        query: q,
        resultCount: assets.length,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: assets,
        metadata: {
          query: q,
          count: assets.length,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid search query',
          details: error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      logger.error('Error searching assets', {
        query: req.query.q,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to search assets',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get popular/trending assets
   * GET /api/assets/popular
   */
  static async getPopularAssets(req: Request, res: Response): Promise<void> {
    try {
      const assets = await assetService.getPopularAssets();

      logger.info('Popular assets retrieved successfully', {
        count: assets.length,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: assets,
        metadata: {
          count: assets.length,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error retrieving popular assets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve popular assets',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get asset list with pagination and filtering
   * GET /api/assets
   */
  static async getAssetList(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = AssetQuerySchema.parse(req.query);

      // For now, we'll implement basic listing
      // In a full implementation, you'd want more sophisticated filtering
      let assets;

      if (queryParams.search) {
        assets = await assetService.searchAssets(queryParams.search);
      } else {
        assets = await assetService.getPopularAssets();
      }

      // Apply pagination
      const startIndex = (queryParams.page - 1) * queryParams.limit;
      const endIndex = startIndex + queryParams.limit;
      const paginatedAssets = assets.slice(startIndex, endIndex);

      logger.info('Asset list retrieved successfully', {
        totalCount: assets.length,
        page: queryParams.page,
        limit: queryParams.limit,
        returnedCount: paginatedAssets.length,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: paginatedAssets,
        metadata: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: assets.length,
          hasNext: endIndex < assets.length,
          hasPrev: queryParams.page > 1,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      logger.error('Error retrieving asset list', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve asset list',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get provider health status
   * GET /api/assets/health
   */
  static async getProviderHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await assetService.getProviderHealth();

      logger.info('Provider health check completed', {
        providerCount: health.length,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: {
          providers: health,
          summary: {
            total: health.length,
            healthy: health.filter((p) => p.healthy).length,
            unhealthy: health.filter((p) => !p.healthy).length,
          },
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error checking provider health', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to check provider health',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clear asset cache (admin only)
   * DELETE /api/assets/cache
   */
  static async clearCache(req: Request, res: Response): Promise<void> {
    try {
      // Note: In a real implementation, you'd want to check for admin permissions
      const { pattern } = req.query;

      await assetService.clearCache(pattern as string);

      logger.info('Asset cache cleared', {
        pattern,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error clearing cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }
}
