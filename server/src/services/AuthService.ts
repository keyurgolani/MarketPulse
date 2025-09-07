import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/UserRepository';
import { Database } from '../config/database';
import { User, UserSession } from '../types/database';
import { UserSessionRow } from '../types/database';
import { logger } from '../utils/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export class AuthService {
  public userRepository: UserRepository;
  private db: Database;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(db: Database) {
    this.db = db;
    this.userRepository = new UserRepository(db);

    // JWT configuration
    this.jwtSecret = process.env.JWT_SECRET ?? 'your-secret-key';
    this.jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret-key';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY ?? '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY ?? '7d';

    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set in environment variables, using default');
    }
  }

  /**
   * Register a new user
   */
  async register(
    data: RegisterData
  ): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user
      const user = await this.userRepository.create({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Registration failed', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Verify credentials
      const user = await this.userRepository.verifyPasswordByEmail(
        credentials.email,
        credentials.password
      );

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error });
      throw error;
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionId: string): Promise<void> {
    try {
      await this.invalidateSession(sessionId);
      logger.info('User logged out successfully', { sessionId });
    } catch (error) {
      logger.error('Logout failed', { sessionId, error });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        this.jwtRefreshSecret
      ) as JWTPayload;

      // Check if session exists and is valid
      const session = await this.getSession(payload.sessionId);
      if (!session || new Date(session.expires_at) < new Date()) {
        throw new Error('Invalid or expired session');
      }

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user, payload.sessionId);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        sessionId: payload.sessionId,
      });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Verify access token and return user
   */
  async verifyToken(token: string): Promise<User> {
    try {
      // Verify JWT token
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Check if session exists and is valid
      const session = await this.getSession(payload.sessionId);
      if (!session || new Date(session.expires_at) < new Date()) {
        throw new Error('Invalid or expired session');
      }

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.debug('Token verification failed', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: User,
    existingSessionId?: string
  ): Promise<AuthTokens> {
    const sessionId = existingSessionId ?? uuidv4();

    // Create JWT payload
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      sessionId,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions) as string;

    // Generate refresh token
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions) as string;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for refresh token

    // Store session if it's new
    if (!existingSessionId) {
      await this.createSession(sessionId, user.id, refreshToken, expiresAt);
    } else {
      await this.updateSession(sessionId, refreshToken, expiresAt);
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Create a new session
   */
  private async createSession(
    sessionId: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(tokenHash, 10);

    await this.db.run(
      `INSERT INTO user_sessions (id, user_id, token_hash, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [sessionId, userId, hashedToken, expiresAt.toISOString()]
    );
  }

  /**
   * Update existing session
   */
  private async updateSession(
    sessionId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(tokenHash, 10);

    await this.db.run(
      `UPDATE user_sessions 
       SET token_hash = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [hashedToken, expiresAt.toISOString(), sessionId]
    );
  }

  /**
   * Get session by ID
   */
  private async getSession(sessionId: string): Promise<UserSession | null> {
    const result = await this.db.get<UserSessionRow>(
      'SELECT * FROM user_sessions WHERE id = ?',
      [sessionId]
    );

    return result ?? null;
  }

  /**
   * Invalidate session
   */
  private async invalidateSession(sessionId: string): Promise<void> {
    await this.db.run('DELETE FROM user_sessions WHERE id = ?', [sessionId]);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await this.db.run(
        'DELETE FROM user_sessions WHERE expires_at < ?',
        [new Date().toISOString()]
      );

      if (result.changes && result.changes > 0) {
        logger.info('Cleaned up expired sessions', { count: result.changes });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const results = await this.db.all<UserSessionRow>(
      `SELECT * FROM user_sessions 
       WHERE user_id = ? AND expires_at > ? 
       ORDER BY created_at DESC`,
      [userId, new Date().toISOString()]
    );

    return results ?? [];
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId]);

    logger.info('Invalidated all user sessions', { userId });
  }
}
