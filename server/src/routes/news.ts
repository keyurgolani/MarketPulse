import { Router } from 'express';
import { NewsController } from '../controllers/newsController';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const NewsQuerySchema = Joi.object({
  symbols: Joi.string().optional(),
  category: Joi.string()
    .valid(
      'general',
      'business',
      'technology',
      'markets',
      'earnings',
      'crypto',
      'forex'
    )
    .optional(),
  sentiment: Joi.string().valid('positive', 'negative', 'neutral').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().optional(),
  search: Joi.string().optional(),
  include_analysis: Joi.boolean().optional(),
});

const SymbolParamSchema = Joi.object({
  symbol: Joi.string().min(1).max(10).required(),
});

const MarketAnalysisQuerySchema = Joi.object({
  symbols: Joi.string().optional(),
  timeframe: Joi.string().valid('1h', '4h', '1d', '1w').optional(),
  analysis_type: Joi.string()
    .valid('technical', 'fundamental', 'sentiment', 'all')
    .optional(),
});

const TrendingQuerySchema = Joi.object({
  timeframe: Joi.string().valid('1h', '4h', '1d', '1w').optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
});

/**
 * News Routes
 */

// GET /api/news - Get aggregated news with filtering
router.get(
  '/',
  validate({ query: NewsQuerySchema }),
  optionalAuth,
  NewsController.getNews
);

// GET /api/news/trending - Get trending news topics
router.get(
  '/trending',
  validate({ query: TrendingQuerySchema }),
  optionalAuth,
  NewsController.getTrendingTopics
);

// GET /api/news/analysis - Get market analysis
router.get(
  '/analysis',
  validate({ query: MarketAnalysisQuerySchema }),
  optionalAuth,
  NewsController.getMarketAnalysis
);

// GET /api/news/:symbol - Get news for specific symbol
router.get(
  '/:symbol',
  validate({
    params: SymbolParamSchema,
    query: NewsQuerySchema,
  }),
  optionalAuth,
  NewsController.getSymbolNews
);

// DELETE /api/news/cache - Clear all news cache (admin only)
router.delete('/cache', authenticate, requireAdmin, NewsController.clearCache);

// DELETE /api/news/:symbol/cache - Clear cache for specific symbol (admin only)
router.delete(
  '/:symbol/cache',
  validate({ params: SymbolParamSchema }),
  authenticate,
  requireAdmin,
  NewsController.clearCache
);

export { router as newsRoutes };
