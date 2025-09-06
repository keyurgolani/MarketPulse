import request from 'supertest';
import express from 'express';
import { AuthController } from '../../controllers/authController';
import { AuthService } from '../../services/AuthService';
import { Database } from '../../config/database';
import { User } from '../../types/database';

// Mock dependencies
jest.mock('../../services/AuthService');
jest.mock('../../config/database');

describe('AuthController', () => {
  let app: express.Application;
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockDb: jest.Mocked<Database>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed-password',
    first_name: 'John',
    last_name: 'Doe',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database
    mockDb = {} as jest.Mocked<Database>;

    // Create mock auth service
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      getUserSessions: jest.fn(),
      invalidateAllUserSessions: jest.fn(),
      userRepository: {
        update: jest.fn(),
        verifyPassword: jest.fn(),
        updatePassword: jest.fn(),
      },
    } as any;

    // Create controller
    authController = new AuthController(mockDb);
    (authController as any).authService = mockAuthService;

    // Create Express app
    app = express();
    app.use(express.json());

    // Add routes
    app.post('/register', authController.register);
    app.post('/login', authController.login);
    app.post('/logout', (req, res, next) => {
      req.user = mockUser;
      req.sessionId = 'session-123';
      authController.logout(req as any, res, next);
    });
    app.post('/refresh', authController.refreshToken);
    app.get('/profile', (req, res, next) => {
      req.user = mockUser;
      authController.getProfile(req as any, res, next);
    });
  });

  describe('POST /register', () => {
    it('should register user successfully', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      // Act
      const response = await request(app)
        .post('/register')
        .send(registerData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.user.password_hash).toBeUndefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('User already exists with this email')
      );

      // Act
      const response = await request(app)
        .post('/register')
        .send(registerData);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /login', () => {
    it('should login user successfully', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      // Act
      const response = await request(app)
        .post('/login')
        .send(loginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.user.password_hash).toBeUndefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthService.login.mockRejectedValue(
        new Error('Invalid email or password')
      );

      // Act
      const response = await request(app)
        .post('/login')
        .send(loginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      mockAuthService.logout.mockResolvedValue();

      // Act
      const response = await request(app)
        .post('/logout');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockAuthService.logout).toHaveBeenCalledWith('session-123');
    });
  });

  describe('POST /refresh', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockTokens);

      // Act
      const response = await request(app)
        .post('/refresh')
        .send(refreshData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 400 if refresh token is missing', async () => {
      // Act
      const response = await request(app)
        .post('/refresh')
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'invalid-refresh-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new Error('Invalid or expired refresh token')
      );

      // Act
      const response = await request(app)
        .post('/refresh')
        .send(refreshData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /profile', () => {
    it('should get user profile successfully', async () => {
      // Act
      const response = await request(app)
        .get('/profile');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.user.password_hash).toBeUndefined();
    });
  });
});