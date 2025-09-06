import { ApiResponse } from '@/types/api';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  preferences?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  refreshInterval: number;
  notifications: {
    priceAlerts: boolean;
    newsUpdates: boolean;
    systemStatus: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    screenReader: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
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

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface UpdateProfileData {
  first_name?: string | undefined;
  last_name?: string | undefined;
  preferences?: UserPreferences | undefined;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserSession {
  id: string;
  created_at: string;
  expires_at: string;
  updated_at?: string;
}

class AuthService {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.baseURL =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    // Load tokens from localStorage on initialization
    this.loadTokensFromStorage();
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    try {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load tokens from localStorage:', error);
      }
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokensToStorage(tokens: AuthTokens): void {
    try {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('tokenExpiresAt', tokens.expiresAt);

      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save tokens to localStorage:', error);
      }
    }
  }

  /**
   * Clear tokens from localStorage
   */
  private clearTokensFromStorage(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');

      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to clear tokens from localStorage:', error);
      }
    }
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // If token is expired, try to refresh
      if (
        response.status === 401 &&
        this.refreshToken &&
        endpoint !== '/auth/refresh'
      ) {
        try {
          await this.refreshAccessToken();
          // Retry the original request with new token
          return this.makeRequest(endpoint, options);
        } catch {
          // Refresh failed, clear tokens and throw original error
          this.clearTokensFromStorage();
          throw new Error(data.error ?? 'Authentication failed');
        }
      }

      throw new Error(
        data.error ?? `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return data;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      this.saveTokensToStorage(response.data.tokens);
      return response.data;
    }

    throw new Error('Registration failed');
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      this.saveTokensToStorage(response.data.tokens);
      return response.data;
    }

    throw new Error('Login failed');
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Logout request failed:', error);
      }
    } finally {
      this.clearTokensFromStorage();
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.makeRequest<{ tokens: AuthTokens }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      }
    );

    if (response.success && response.data) {
      this.saveTokensToStorage(response.data.tokens);
      return response.data.tokens;
    }

    throw new Error('Token refresh failed');
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await this.makeRequest<{ user: User }>('/auth/profile');

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error('Failed to get user profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await this.makeRequest<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error('Failed to update profile');
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await this.makeRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success) {
      // Clear tokens as user needs to login again
      this.clearTokensFromStorage();
      return;
    }

    throw new Error('Failed to change password');
  }

  /**
   * Get user sessions
   */
  async getSessions(): Promise<UserSession[]> {
    const response = await this.makeRequest<{ sessions: UserSession[] }>(
      '/auth/sessions'
    );

    if (response.success && response.data) {
      return response.data.sessions;
    }

    throw new Error('Failed to get sessions');
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout-all', {
        method: 'POST',
      });
    } finally {
      this.clearTokensFromStorage();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if token is expired (basic check)
   */
  isTokenExpired(): boolean {
    try {
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      if (!expiresAt) return true;

      return new Date(expiresAt) <= new Date();
    } catch {
      return true;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
