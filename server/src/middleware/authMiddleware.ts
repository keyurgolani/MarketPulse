import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { Database } from '../config/database';
import { User } from '../types/database';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
export const createAuthMiddleware = (
  db: Database
): {
  authenticate: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  requireAuth: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  optionalAuth: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
} => {
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
      const payloadPart = tokenParts[1];
      if (!payloadPart) {
        throw new Error('Invalid token format - missing payload');
      }
      const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString());

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
      const payloadPart = tokenParts[1];
      if (!payloadPart) {
        throw new Error('Invalid token format - missing payload');
      }
      const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString());

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
  const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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

  return {
    authenticate,
    requireAuth,
    optionalAuth: optionalAuthenticate,
  };
};

// Export types for use in other files
export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
