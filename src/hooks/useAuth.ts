/**
 * Authentication Hook
 * Provides authentication state and methods
 */

import { useEffect, useState, useCallback } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';
import type { AuthPayload, RegisterPayload, User } from '@/types/user';

interface UseAuthReturn {
  /** Current user */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is being initialized */
  isInitializing: boolean;
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  /** Authentication error */
  error: string | null;
  /** Login function */
  login: (payload: AuthPayload) => Promise<void>;
  /** Register function */
  register: (payload: RegisterPayload) => Promise<void>;
  /** Logout function */
  logout: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
  /** Refresh authentication */
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const {
    user,
    isAuthenticated,
    setUser,
    logout: logoutStore,
  } = useUserStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const login = useCallback(
    async (payload: AuthPayload): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authService.login(payload);

        if (response.success && response.data) {
          const { user, token } = response.data;
          authService.setAuthToken(token);
          setUser(user);
        } else {
          throw new Error(response.error || 'Login failed');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Login failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authService.register(payload);

        if (response.success && response.data) {
          const { user, token } = response.data;
          authService.setAuthToken(token);
          setUser(user);
        } else {
          throw new Error(response.error || 'Registration failed');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser]
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      authService.clearAuthToken();
      logoutStore();
      setIsLoading(false);
    }
  }, [logoutStore]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      const response = await authService.refreshToken();

      if (response.success && response.data) {
        authService.setAuthToken(response.data.token);
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      // If refresh fails, logout user
      await logout();
    }
  }, [isAuthenticated, logout]);

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {
      try {
        const user = await authService.initializeAuth();
        if (user) {
          setUser(user);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        authService.clearAuthToken();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [setUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 15 minutes
    const refreshInterval = setInterval(
      () => {
        refresh();
      },
      15 * 60 * 1000
    );

    return (): void => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, refresh]);

  return {
    user,
    isAuthenticated,
    isInitializing,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refresh,
  };
}
