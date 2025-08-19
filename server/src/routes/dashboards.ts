import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas for route parameters
const DashboardIdSchema = Joi.object({
  id: Joi.string().min(1).required(),
});

const CloneDashboardSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
});

/**
 * Dashboard Routes
 */

// GET /api/dashboards - Get user's dashboards (with optional public/default)
router.get('/', authenticate, DashboardController.getDashboards);

// GET /api/dashboards/default - Get default dashboards (public endpoint)
router.get('/default', optionalAuth, DashboardController.getDefaultDashboards);

// GET /api/dashboards/public - Get public dashboards (public endpoint)
router.get('/public', optionalAuth, DashboardController.getPublicDashboards);

// GET /api/dashboards/:id - Get specific dashboard
router.get(
  '/:id',
  validate({ params: DashboardIdSchema }),
  optionalAuth,
  DashboardController.getDashboard
);

// POST /api/dashboards - Create new dashboard
router.post('/', authenticate, DashboardController.createDashboard);

// PUT /api/dashboards/:id - Update dashboard
router.put(
  '/:id',
  validate({ params: DashboardIdSchema }),
  authenticate,
  DashboardController.updateDashboard
);

// DELETE /api/dashboards/:id - Delete dashboard
router.delete(
  '/:id',
  validate({ params: DashboardIdSchema }),
  authenticate,
  DashboardController.deleteDashboard
);

// POST /api/dashboards/:id/clone - Clone dashboard
router.post(
  '/:id/clone',
  validate({
    params: DashboardIdSchema,
    body: CloneDashboardSchema,
  }),
  authenticate,
  DashboardController.cloneDashboard
);

export { router as dashboardRoutes };
