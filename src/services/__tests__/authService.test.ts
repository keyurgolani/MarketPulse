import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';

// Type for testing private properties
interface AuthServiceWithPrivates {
  accessToken: string | null;
  refreshToken: string | null;
}

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as ReturnType<typeof vi.fn>;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Reset service state
    (authService as unknown as AuthServiceWithPrivates).accessToken = null;
    (authService as unknown as AuthServiceWithPrivates).refreshToken = null;
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresAt: '2024-12-31T23:59:59Z',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(registerData),
        })
      );
      expect(result.user.email).toBe('test@example.com');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'accessToken',
        'access-token'
      );
    });

    it('should throw error on registration failure', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'User already exists',
          }),
      });

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        'User already exists'
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresAt: '2024-12-31T23:59:59Z',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
        })
      );
      expect(result.user.email).toBe('test@example.com');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'accessToken',
        'access-token'
      );
    });

    it('should throw error on login failure', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid credentials',
          }),
      });

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue('access-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Act
      await authService.logout();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should clear tokens even if logout request fails', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue('access-token');
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      await authService.logout();

      // Assert
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      // Set the refresh token on the service instance
      (authService as unknown as AuthServiceWithPrivates).refreshToken =
        'refresh-token';

      const mockResponse = {
        success: true,
        data: {
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresAt: '2024-12-31T23:59:59Z',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await authService.refreshAccessToken();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'refresh-token' }),
        })
      );
      expect(result.accessToken).toBe('new-access-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token'
      );
    });

    it('should throw error if no refresh token available', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      (authService as unknown as AuthServiceWithPrivates).refreshToken = null;

      // Act & Assert
      await expect(authService.refreshAccessToken()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'access-token';
        return null;
      });

      // Set the access token on the service instance
      (authService as unknown as AuthServiceWithPrivates).accessToken =
        'access-token';

      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            first_name: 'John',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await authService.getProfile();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/profile',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
          }),
        })
      );
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if access token exists', () => {
      // Arrange
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'access-token';
        return null;
      });

      // Set the access token on the service instance
      (authService as unknown as AuthServiceWithPrivates).accessToken =
        'access-token';

      // Act
      const result = authService.isAuthenticated();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if no access token', () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      (authService as unknown as AuthServiceWithPrivates).accessToken = null;

      // Act
      const result = authService.isAuthenticated();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false if token is not expired', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
      mockLocalStorage.getItem.mockReturnValue(futureDate);

      // Act
      const result = authService.isTokenExpired();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true if token is expired', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      mockLocalStorage.getItem.mockReturnValue(pastDate);

      // Act
      const result = authService.isTokenExpired();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true if no expiry date', () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);

      // Act
      const result = authService.isTokenExpired();

      // Assert
      expect(result).toBe(true);
    });
  });
});
