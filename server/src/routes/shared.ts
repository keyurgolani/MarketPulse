import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const ShareTokenSchema = Joi.object({
  token: Joi.string().min(1).required(),
});

/**
 * Shared Dashboard Routes
 */

// GET /api/shared/:token - Access dashboard via share token
router.get(
  '/:token',
  validate({ params: ShareTokenSchema }),
  DashboardController.accessSharedDashboard
);

export { router as sharedRoutes };
