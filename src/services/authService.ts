/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

import { apiClient } from './apiClient';
import type {
  User,
  AuthPayload,
  RegisterPayload,
  PasswordResetPayload,
  PasswordChangePayload,
  UserSession,
} from '@/types/user';
import type { ApiResponse } from '@/types/api';

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(
    payload: AuthPayload
  ): Promise<ApiResponse<{ user: User; token: string; session: UserSession }>> {
    return apiClient.post<{ user: User; token: string; session: UserSession }>(
      '/auth/login',
      payload
    );
  }

  /**
   * Register new user account
   */
  async register(
    payload: RegisterPayload
  ): Promise<ApiResponse<{ user: User; token: string; session: UserSession }>> {
    return apiClient.post<{ user: User; token: string; session: UserSession }>(
      '/auth/register',
      payload
    );
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    payload: PasswordResetPayload
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/password-reset', payload);
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/password-reset/confirm', {
      token,
      newPassword,
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    payload: PasswordChangePayload
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.put<{ message: string }>('/auth/password-change', payload);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/logout');
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<
    ApiResponse<{ token: string; expiresAt: string }>
  > {
    return apiClient.post<{ token: string; expiresAt: string }>(
      '/auth/refresh'
    );
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/verify-email', { token });
  }

  /**
   * Resend email verification
   */
  async resendVerification(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/resend-verification');
  }

  /**
   * Get user sessions
   */
  async getSessions(): Promise<ApiResponse<UserSession[]>> {
    return apiClient.get<UserSession[]>('/auth/sessions');
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    sessionId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>('/auth/sessions');
  }

  /**
   * Check if user is authenticated
   */
  async checkAuth(): Promise<
    ApiResponse<{ isAuthenticated: boolean; user?: User }>
  > {
    try {
      const response = await this.getCurrentUser();
      return {
        success: true,
        data: {
          isAuthenticated: true,
          user: response.data,
        },
        timestamp: Date.now(),
      };
    } catch {
      return {
        success: true,
        data: {
          isAuthenticated: false,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Set authentication token in storage
   */
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Get authentication token from storage
   */
  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Remove authentication token from storage
   */
  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * Initialize authentication on app start
   */
  async initializeAuth(): Promise<User | null> {
    const token = this.getAuthToken();
    if (!token) {
      return null;
    }

    try {
      // Set token in headers
      this.setAuthToken(token);

      // Verify token is still valid
      const response = await this.getCurrentUser();
      return response.data;
    } catch {
      // Token is invalid, clear it
      this.clearAuthToken();
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
