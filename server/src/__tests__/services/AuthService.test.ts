import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { Database } from '../../config/database';
import { User } from '../../types/database';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../repositories/UserRepository');
jest.mock('../../config/database');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: jest.Mocked<Database>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed-password',
    first_name: 'John',
    last_name: 'Doe',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up environment variables BEFORE creating service
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    // Create mock database
    mockDb = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      exec: jest.fn(),
    } as any;

    // Create mock user repository
    mockUserRepository = new UserRepository(mockDb) as jest.Mocked<UserRepository>;

    // Create auth service
    authService = new AuthService(mockDb);
    (authService as any).userRepository = mockUserRepository;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockDb.run.mockResolvedValue({ changes: 1 } as any);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(registerData);
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock-token');
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        'User already exists with this email'
      );
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.verifyPasswordByEmail.mockResolvedValue(mockUser);
      mockDb.run.mockResolvedValue({ changes: 1 } as any);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(mockUserRepository.verifyPasswordByEmail).toHaveBeenCalledWith(
        credentials.email,
        credentials.password
      );
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toBeDefined();
    });

    it('should throw error with invalid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockUserRepository.verifyPasswordByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token successfully', async () => {
      // Arrange
      const token = 'valid-token';
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
      };

      (jwt.verify as jest.Mock).mockReturnValue(payload);
      mockDb.get.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.verifyToken(token);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.verifyToken(token)).rejects.toThrow();
    });

    it('should throw error for expired session', async () => {
      // Arrange
      const token = 'valid-token';
      const payload = {
        userId: 'user-123',
        sessionId: 'session-123',
      };

      (jwt.verify as jest.Mock).mockReturnValue(payload);
      mockDb.get.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-123',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      });

      // Act & Assert
      await expect(authService.verifyToken(token)).rejects.toThrow(
        'Invalid or expired session'
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const sessionId = 'session-123';
      mockDb.run.mockResolvedValue({ changes: 1 } as any);

      // Act
      await authService.logout(sessionId);

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM user_sessions WHERE id = ?',
        [sessionId]
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const payload = {
        userId: 'user-123',
        sessionId: 'session-123',
      };

      (jwt.verify as jest.Mock).mockReturnValue(payload);
      mockDb.get.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockDb.run.mockResolvedValue({ changes: 1 } as any);
      (jwt.sign as jest.Mock).mockReturnValue('new-token');

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
      expect(result.accessToken).toBe('new-token');
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Arrange
      mockDb.run.mockResolvedValue({ changes: 5 } as any);

      // Act
      await authService.cleanupExpiredSessions();

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM user_sessions WHERE expires_at < ?',
        [expect.any(String)]
      );
    });
  });

  describe('getUserSessions', () => {
    it('should get user sessions successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const sessions = [
        { id: 'session-1', user_id: userId, expires_at: '2024-12-31T23:59:59Z' },
        { id: 'session-2', user_id: userId, expires_at: '2024-12-31T23:59:59Z' },
      ];

      mockDb.all.mockResolvedValue(sessions);

      // Act
      const result = await authService.getUserSessions(userId);

      // Assert
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_sessions'),
        [userId, expect.any(String)]
      );
      expect(result).toEqual(sessions);
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should invalidate all user sessions', async () => {
      // Arrange
      const userId = 'user-123';
      mockDb.run.mockResolvedValue({ changes: 3 } as any);

      // Act
      await authService.invalidateAllUserSessions(userId);

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [userId]
      );
    });
  });
});