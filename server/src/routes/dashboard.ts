import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { db } from '../config/database';

const router = Router();

// Initialize auth middleware
const { authenticate, requireAuth } = createAuthMiddleware(db);

// All dashboard routes require authentication
router.use(authenticate);
router.use(requireAuth);

// Dashboard routes
router.get('/', DashboardController.getDashboards);
router.get('/:id', DashboardController.getDashboard);
router.post('/', DashboardController.createDashboard);
router.put('/:id', DashboardController.updateDashboard);
router.delete('/:id', DashboardController.deleteDashboard);

export default router;
