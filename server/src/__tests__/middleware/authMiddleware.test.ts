import { Request, Response, NextFunction } from 'express';
import { createAuthMiddleware } from '../../middleware/authMiddleware';
import { AuthService } from '../../services/AuthService';
import { Database } from '../../config/database';
import { User } from '../../types/database';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/AuthService');
jest.mock('../../utils/logger');

const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('AuthMiddleware', () => {
  let mockDb: Database;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let authMiddleware: ReturnType<typeof createAuthMiddleware>;

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    password_hash: 'hashed-password',
    first_name: 'Test',
    last_name: 'User',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockDb = {} as Database;

    mockAuthService = {
      verifyToken: jest.fn(),
    } as Partial<jest.Mocked<AuthService>> as jest.Mocked<AuthService>;

    MockedAuthService.mockImplementation(() => mockAuthService);

    mockReq = {
      headers: {},
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    authMiddleware = createAuthMiddleware(mockDb);

    // Mock logger methods
    mockedLogger.debug = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate user with valid Bearer token', async () => {
      const payload = { sessionId: 'session-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const fullToken = `header.${encodedPayload}.signature`;

      mockReq.headers = {
        authorization: `Bearer ${fullToken}`,
      };

      mockAuthService.verifyToken.mockResolvedValue(mockUser);

      await authMiddleware.authenticate(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(fullToken);
      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.sessionId).toBe('session-123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'User authenticated successfully',
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
        })
      );
    });

    it('should return 401 when no authorization header is provided', async () => {
      mockReq.headers = {};

      await authMiddleware.authenticate(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN',
        timestamp: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = {
        authorization: 'Basic invalid-token',
      };

      await authMiddleware.authenticate(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN',
        timestamp: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      mockAuthService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await authMiddleware.authenticate(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        timestamp: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          error: 'Invalid token',
        })
      );
    });

    it('should return 401 when token format is invalid', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-format',
      };

      mockAuthService.verifyToken.mockResolvedValue(mockUser);

      await authMiddleware.authenticate(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        timestamp: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token payload is missing', async () => {
      mockReq.headers = {
        authorization: 'Bearer header..signature',
      };

      mockAuthService.verifyToken.mockResolvedValue(mockUser);

      await authMiddleware.authenticate(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        timestamp: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    it('should authenticate user when valid token is provided', async () => {
      const payload = { sessionId: 'session-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const fullToken = `header.${encodedPayload}.signature`;

      mockReq.headers = {
        authorization: `Bearer ${fullToken}`,
      };

      mockAuthService.verifyToken.mockResolvedValue(mockUser);

      await authMiddleware.optionalAuth(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(fullToken);
      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.sessionId).toBe('session-123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Optional authentication successful',
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
        })
      );
    });

    it('should continue without authentication when no token is provided', async () => {
      mockReq.headers = {};

      await authMiddleware.optionalAuth(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when token verification fails', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      mockAuthService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await authMiddleware.optionalAuth(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Optional authentication failed, continuing without auth',
        expect.objectContaining({
          error: 'Invalid token',
        })
      );
    });

    it('should continue without authentication when authorization header format is invalid', async () => {
      mockReq.headers = {
        authorization: 'Basic invalid-format',
      };

      await authMiddleware.optionalAuth(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAuth middleware', () => {
    it('should continue when user is authenticated', async () => {
      mockReq.user = mockUser;

      await authMiddleware.requireAuth(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      delete mockReq.user;

      await authMiddleware.requireAuth(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('middleware factory', () => {
    it('should create AuthService instance with provided database', () => {
      createAuthMiddleware(mockDb);
      expect(MockedAuthService).toHaveBeenCalledWith(mockDb);
    });

    it('should return all required middleware functions', () => {
      const middleware = createAuthMiddleware(mockDb);

      expect(typeof middleware.authenticate).toBe('function');
      expect(typeof middleware.requireAuth).toBe('function');
      expect(typeof middleware.optionalAuth).toBe('function');
    });
  });
});
