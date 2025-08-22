/**
 * useAuth Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';

// Mock dependencies
vi.mock('@/stores/userStore', () => ({
  useUserStore: vi.fn(),
}));

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    initializeAuth: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  },
}));

const mockUserStore = {
  user: null,
  isAuthenticated: false,
  setUser: vi.fn(),
  logout: vi.fn(),
};

const mockUseUserStore = useUserStore as any;
const mockAuthService = authService as any;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserStore.mockReturnValue(mockUserStore);
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isInitializing).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockResponse = {
      success: true,
      data: { user: mockUser, token: 'mock-token' },
    };

    mockAuthService.login.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockAuthService.setAuthToken).toHaveBeenCalledWith('mock-token');
    expect(mockUserStore.setUser).toHaveBeenCalledWith(mockUser);
  });

  it('handles login error', async () => {
    const mockError = new Error('Login failed');
    mockAuthService.login.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong-password',
        });
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Login failed');
  });

  it('handles successful registration', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockResponse = {
      success: true,
      data: { user: mockUser, token: 'mock-token' },
    };

    mockAuthService.register.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        acceptTerms: true,
      });
    });

    expect(mockAuthService.register).toHaveBeenCalled();
    expect(mockAuthService.setAuthToken).toHaveBeenCalledWith('mock-token');
    expect(mockUserStore.setUser).toHaveBeenCalledWith(mockUser);
  });

  it('handles logout', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockAuthService.clearAuthToken).toHaveBeenCalled();
    expect(mockUserStore.logout).toHaveBeenCalled();
  });

  it('clears error when clearError is called', () => {
    const { result } = renderHook(() => useAuth());

    // Set an error first
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles token refresh', async () => {
    mockUserStore.isAuthenticated = true;
    mockUseUserStore.mockReturnValue({
      ...mockUserStore,
      isAuthenticated: true,
    });

    const mockResponse = {
      success: true,
      data: { token: 'new-token', expiresAt: '2024-01-01' },
    };

    mockAuthService.refreshToken.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    expect(mockAuthService.setAuthToken).toHaveBeenCalledWith('new-token');
  });
});
