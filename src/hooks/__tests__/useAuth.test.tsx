import React from 'react';
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuth } from '../useAuth';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the auth service
vi.mock('@/services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(() => false),
    isTokenExpired: vi.fn(() => true),
    getProfile: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('useAuth', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should return auth context when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.updateProfile).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.refreshProfile).toBe('function');
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
