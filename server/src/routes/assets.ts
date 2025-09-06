import { Router } from 'express';
import { AssetController } from '../controllers/assetController';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { db } from '../config/database';

const router = Router();

// Initialize auth middleware
const { authenticate } = createAuthMiddleware(db);

// Apply authentication middleware to all asset routes
router.use(authenticate);

// Apply rate limiting to all asset routes
router.use(rateLimiter);

/**
 * @route GET /api/assets
 * @desc Get paginated list of assets with optional filtering
 * @access Private
 */
router.get('/', AssetController.getAssetList);

/**
 * @route GET /api/assets/search
 * @desc Search for assets by query
 * @access Private
 */
router.get('/search', AssetController.searchAssets);

/**
 * @route GET /api/assets/popular
 * @desc Get popular/trending assets
 * @access Private
 */
router.get('/popular', AssetController.getPopularAssets);

/**
 * @route GET /api/assets/health
 * @desc Get health status of market data providers
 * @access Private
 */
router.get('/health', AssetController.getProviderHealth);

/**
 * @route POST /api/assets/batch
 * @desc Get multiple assets by symbols
 * @access Private
 */
router.post('/batch', AssetController.getAssets);

/**
 * @route DELETE /api/assets/cache
 * @desc Clear asset cache (admin only)
 * @access Private
 */
router.delete('/cache', AssetController.clearCache);

/**
 * @route GET /api/assets/:symbol
 * @desc Get asset information by symbol
 * @access Private
 */
router.get('/:symbol', AssetController.getAsset);

/**
 * @route GET /api/assets/:symbol/price
 * @desc Get current price for an asset
 * @access Private
 */
router.get('/:symbol/price', AssetController.getAssetPrice);

export default router;
