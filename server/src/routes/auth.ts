import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/authController';
import {
  createAuthMiddleware,
  AuthenticatedRequest,
} from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';
import { z } from 'zod';

// Typed async handler for authenticated routes
const authenticatedAsyncHandler = (
  fn: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return asyncHandler(
    fn as unknown as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>
  );
};

// Validation schemas for authentication endpoints
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .optional(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const UpdateProfileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name cannot be empty')
    .max(100, 'First name must be less than 100 characters')
    .optional(),
  last_name: z
    .string()
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name must be less than 100 characters')
    .optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']),
      refreshInterval: z.number().min(1000).max(300000),
      notifications: z.object({
        priceAlerts: z.boolean(),
        newsUpdates: z.boolean(),
        systemStatus: z.boolean(),
      }),
      accessibility: z.object({
        reduceMotion: z.boolean(),
        highContrast: z.boolean(),
        screenReader: z.boolean(),
      }),
    })
    .optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

// Create router
const router = Router();

// Initialize controller and middleware
const authController = new AuthController(db);
const { authenticate, requireAuth } = createAuthMiddleware(db);

// Public routes (no authentication required)
router.post('/register', validate(RegisterSchema), authController.register);
router.post('/login', validate(LoginSchema), authController.login);
router.post(
  '/refresh',
  validate(RefreshTokenSchema),
  authController.refreshToken
);

// Protected routes (authentication required)
router.use(authenticate); // Apply authentication middleware to all routes below
router.use(requireAuth); // Ensure user is authenticated

router.post(
  '/logout',
  authenticatedAsyncHandler(authController.logout.bind(authController))
);
router.get(
  '/profile',
  authenticatedAsyncHandler(authController.getProfile.bind(authController))
);
router.put(
  '/profile',
  validate(UpdateProfileSchema),
  authenticatedAsyncHandler(authController.updateProfile.bind(authController))
);
router.post(
  '/change-password',
  validate(ChangePasswordSchema),
  authenticatedAsyncHandler(authController.changePassword.bind(authController))
);
router.get(
  '/sessions',
  authenticatedAsyncHandler(authController.getSessions.bind(authController))
);
router.post(
  '/logout-all',
  authenticatedAsyncHandler(authController.logoutAll.bind(authController))
);

export default router;
