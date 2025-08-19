import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extend the existing user type with additional properties
interface AuthenticatedUser {
  id: string;
  email?: string;
  isAdmin?: boolean;
}

/**
 * Basic authentication middleware
 * TODO: Replace with proper JWT/session authentication
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // For now, use a simple header-based auth for development
    const userId = req.headers['x-user-id'] as string;
    const isAdmin = req.headers['x-user-admin'] === 'true';

    if (!userId) {
      // For development, provide a default user
      req.user = { id: 'default-user' };
      (req.user as AuthenticatedUser).email = 'user@example.com';
      (req.user as AuthenticatedUser).isAdmin = false;
    } else {
      req.user = { id: userId };
      (req.user as AuthenticatedUser).email = req.headers[
        'x-user-email'
      ] as string;
      (req.user as AuthenticatedUser).isAdmin = isAdmin;
    }

    logger.debug('User authenticated', {
      userId: req.user.id,
      isAdmin: (req.user as AuthenticatedUser).isAdmin,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Admin-only middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!(req.user as AuthenticatedUser)?.isAdmin) {
    logger.warn('Admin access denied', {
      userId: req.user?.id,
      path: req.path,
    });

    res.status(403).json({
      success: false,
      error: 'Administrator access required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no auth)
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const isAdmin = req.headers['x-user-admin'] === 'true';

    if (userId) {
      req.user = { id: userId };
      (req.user as AuthenticatedUser).email = req.headers[
        'x-user-email'
      ] as string;
      (req.user as AuthenticatedUser).isAdmin = isAdmin;

      logger.debug('Optional auth - user found', {
        userId: req.user.id,
        path: req.path,
      });
    } else {
      logger.debug('Optional auth - no user', {
        path: req.path,
      });
    }

    next();
  } catch (error) {
    logger.warn('Optional auth error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });

    // Don't fail on optional auth errors
    next();
  }
};
