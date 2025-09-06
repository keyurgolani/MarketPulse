import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { Database } from '../config/database';
import { User } from '../types/database';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
  sessionId: string;
}

/**
 * Authentication middleware factory
 */
export const createAuthMiddleware = (db: Database) => {
  const authService = new AuthService(db);

  /**
   * Middleware to authenticate requests using JWT tokens
   */
  const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          code: 'MISSING_TOKEN',
          timestamp: Date.now(),
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token and get user
      const user = await authService.verifyToken(token);

      // Extract session ID from token (for logout functionality)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = JSON.parse(
        Buffer.from(tokenParts[1]!, 'base64').toString()
      );

      // Attach user and session to request
      req.user = user;
      req.sessionId = payload.sessionId;

      logger.debug('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        url: req.url,
        method: req.method,
      });

      next();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.debug('Authentication failed', {
        error: errorMessage,
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        timestamp: Date.now(),
      });
    }
  };

  /**
   * Optional authentication middleware - doesn't fail if no token provided
   */
  const optionalAuthenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);
      const user = await authService.verifyToken(token);
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = JSON.parse(
        Buffer.from(tokenParts[1]!, 'base64').toString()
      );

      req.user = user;
      req.sessionId = payload.sessionId;

      logger.debug('Optional authentication successful', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.debug('Optional authentication failed, continuing without auth', {
        error: errorMessage,
      });
      // Continue without authentication
    }

    next();
  };

  /**
   * Middleware to check if user is authenticated (for TypeScript type safety)
   */
  const requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: Date.now(),
      });
      return;
    }

    next();
  };

  /**
   * Middleware to check user permissions/roles (for future use)
   */
  const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: Date.now(),
        });
        return;
      }

      // For now, all authenticated users have access
      // In the future, implement role-based access control
      logger.debug('Role check passed', {
        userId: req.user.id,
        requiredRoles: roles,
      });

      next();
    };
  };

  /**
   * Middleware to ensure user can only access their own resources
   */
  const requireOwnership = (userIdParam: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: Date.now(),
        });
        return;
      }

      const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

      if (resourceUserId && resourceUserId !== req.user.id) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          attemptedUserId: resourceUserId,
          url: req.url,
          method: req.method,
        });

        res.status(403).json({
          success: false,
          error: 'Access denied - insufficient permissions',
          code: 'ACCESS_DENIED',
          timestamp: Date.now(),
        });
        return;
      }

      next();
    };
  };

  return {
    authenticate,
    optionalAuthenticate,
    requireAuth,
    requireRole,
    requireOwnership,
  };
};

// Export types for use in other files
export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
