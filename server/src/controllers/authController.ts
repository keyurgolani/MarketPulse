import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { Database } from '../config/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class AuthController {
  private authService: AuthService;

  constructor(db: Database) {
    this.authService = new AuthService(db);
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, first_name, last_name } = req.body;

      // Register user and get tokens
      const { user, tokens } = await this.authService.register({
        email,
        password,
        first_name,
        last_name,
      });

      // Remove sensitive data from response
      const { password_hash, ...userResponse } = user;

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          },
        },
        message: 'User registered successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Registration failed', {
        email: req.body.email,
        error: errorMessage,
        ip: req.ip,
      });

      if (errorMessage === 'User already exists with this email') {
        res.status(409).json({
          success: false,
          error: 'User already exists with this email',
          code: 'USER_EXISTS',
          timestamp: Date.now(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Login user and get tokens
      const { user, tokens } = await this.authService.login({ email, password });

      // Remove sensitive data from response
      const { password_hash, ...userResponse } = user;

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: userResponse,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          },
        },
        message: 'Login successful',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Login failed', {
        email: req.body.email,
        error: errorMessage,
        ip: req.ip,
      });

      if (errorMessage === 'Invalid email or password') {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          timestamp: Date.now(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Logout user
   */
  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(req.sessionId);

      logger.info('User logged out successfully', {
        userId: req.user.id,
        sessionId: req.sessionId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Logout failed', {
        userId: req.user?.id,
        sessionId: req.sessionId,
        error: errorMessage,
        ip: req.ip,
      });

      next(error);
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
          timestamp: Date.now(),
        });
        return;
      }

      // Refresh tokens
      const tokens = await this.authService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully', {
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          },
        },
        message: 'Token refreshed successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Token refresh failed', {
        error: errorMessage,
        ip: req.ip,
      });

      if (errorMessage.includes('Invalid') || errorMessage.includes('expired')) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
          timestamp: Date.now(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Remove sensitive data from response
      const { password_hash, ...userResponse } = req.user;

      res.json({
        success: true,
        data: {
          user: userResponse,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get profile failed', {
        userId: req.user?.id,
        error: errorMessage,
      });

      next(error);
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { first_name, last_name, preferences } = req.body;

      // Update user profile
      const updatedUser = await this.authService.userRepository.update(req.user.id, {
        first_name,
        last_name,
        preferences,
      });

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          timestamp: Date.now(),
        });
        return;
      }

      // Remove sensitive data from response
      const { password_hash, ...userResponse } = updatedUser;

      logger.info('User profile updated successfully', {
        userId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: userResponse,
        },
        message: 'Profile updated successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Profile update failed', {
        userId: req.user?.id,
        error: errorMessage,
        ip: req.ip,
      });

      next(error);
    }
  };

  /**
   * Change user password
   */
  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isCurrentPasswordValid = await this.authService.userRepository.verifyPassword(
        req.user.id,
        currentPassword
      );

      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD',
          timestamp: Date.now(),
        });
        return;
      }

      // Update password
      await this.authService.userRepository.updatePassword(req.user.id, newPassword);

      // Invalidate all existing sessions for security
      await this.authService.invalidateAllUserSessions(req.user.id);

      logger.info('Password changed successfully', {
        userId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Password change failed', {
        userId: req.user?.id,
        error: errorMessage,
        ip: req.ip,
      });

      next(error);
    }
  };

  /**
   * Get user sessions
   */
  getSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await this.authService.getUserSessions(req.user.id);

      // Remove sensitive token hashes from response
      const safeSessions = sessions.map(session => ({
        id: session.id,
        created_at: session.created_at,
        expires_at: session.expires_at,
        updated_at: session.updated_at,
      }));

      res.json({
        success: true,
        data: {
          sessions: safeSessions,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get sessions failed', {
        userId: req.user?.id,
        error: errorMessage,
      });

      next(error);
    }
  };

  /**
   * Logout from all sessions
   */
  logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.invalidateAllUserSessions(req.user.id);

      logger.info('User logged out from all sessions', {
        userId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Logged out from all sessions successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Logout all failed', {
        userId: req.user?.id,
        error: errorMessage,
        ip: req.ip,
      });

      next(error);
    }
  };
}