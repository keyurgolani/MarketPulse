import { Router } from 'express';
import { AssetController } from '../controllers/assetController';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const AssetSymbolSchema = Joi.object({
  symbol: Joi.string().min(1).max(10).required(),
});

const WatchlistSchema = Joi.object({
  symbols: Joi.array()
    .items(Joi.string().min(1).max(10))
    .min(1)
    .max(50)
    .required(),
});

const PriceHistoryQuerySchema = Joi.object({
  period: Joi.string()
    .valid(
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
      'max'
    )
    .optional(),
  interval: Joi.string()
    .valid(
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
      '3mo'
    )
    .optional(),
});

/**
 * Asset Routes
 */

// GET /api/assets - Get assets (search, symbols, or popular)
router.get('/', optionalAuth, AssetController.getAssets);

// GET /api/assets/:symbol - Get specific asset
router.get(
  '/:symbol',
  validate({ params: AssetSymbolSchema }),
  optionalAuth,
  AssetController.getAsset
);

// GET /api/assets/:symbol/price - Get real-time price
router.get(
  '/:symbol/price',
  validate({ params: AssetSymbolSchema }),
  optionalAuth,
  AssetController.getPrice
);

// GET /api/assets/:symbol/history - Get price history
router.get(
  '/:symbol/history',
  validate({
    params: AssetSymbolSchema,
    query: PriceHistoryQuerySchema,
  }),
  optionalAuth,
  AssetController.getPriceHistory
);

// POST /api/assets/watchlist - Get multiple assets for watchlist
router.post(
  '/watchlist',
  validate({ body: WatchlistSchema }),
  optionalAuth,
  AssetController.getWatchlist
);

// DELETE /api/assets/cache - Clear all asset cache (admin only)
router.delete('/cache', authenticate, requireAdmin, AssetController.clearCache);

// DELETE /api/assets/:symbol/cache - Clear cache for specific symbol (admin only)
router.delete(
  '/:symbol/cache',
  validate({ params: AssetSymbolSchema }),
  authenticate,
  requireAdmin,
  AssetController.clearCache
);

export { router as assetRoutes };
