/**
 * Session Management Hook
 * Handles user session state, timeout, and cleanup
 */

import { useEffect, useCallback, useRef } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';

interface UseSessionOptions {
  /** Session timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
  /** Warning time before timeout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Whether to show timeout warnings */
  showWarnings?: boolean;
  /** Callback when session is about to expire */
  onSessionWarning?: () => void;
  /** Callback when session expires */
  onSessionExpired?: () => void;
}

interface SessionState {
  /** Whether session is active */
  isActive: boolean;
  /** Time until session expires (in milliseconds) */
  timeUntilExpiry: number | null;
  /** Whether session warning is active */
  isWarning: boolean;
  /** Extend the current session */
  extendSession: () => void;
  /** Manually end the session */
  endSession: () => void;
}

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_TIME = 5 * 60 * 1000; // 5 minutes

export function useSession(options: UseSessionOptions = {}): SessionState {
  const {
    timeout = DEFAULT_TIMEOUT,
    warningTime = DEFAULT_WARNING_TIME,
    showWarnings = true,
    onSessionWarning,
    onSessionExpired,
  } = options;

  const { user, logout } = useUserStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningRef = useRef<boolean>(false);

  const clearTimeouts = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const endSession = useCallback(async (): Promise<void> => {
    clearTimeouts();

    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    logout();
    onSessionExpired?.();
  }, [clearTimeouts, logout, onSessionExpired]);

  const showWarning = useCallback((): void => {
    if (!showWarnings || isWarningRef.current) return;

    isWarningRef.current = true;
    onSessionWarning?.();
  }, [showWarnings, onSessionWarning]);

  const extendSession = useCallback((): void => {
    if (!user) return;

    lastActivityRef.current = Date.now();
    isWarningRef.current = false;
    clearTimeouts();

    // Set warning timeout
    if (showWarnings && warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        showWarning();
      }, timeout - warningTime);
    }

    // Set session timeout
    timeoutRef.current = setTimeout(() => {
      endSession();
    }, timeout);
  }, [
    user,
    timeout,
    warningTime,
    showWarnings,
    showWarning,
    endSession,
    clearTimeouts,
  ]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = (): void => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // Only extend session if enough time has passed (prevent excessive calls)
      if (timeSinceLastActivity > 60000) {
        // 1 minute
        extendSession();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize session
    extendSession();

    return (): void => {
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimeouts();
    };
  }, [user, extendSession, clearTimeouts]);

  // Handle page visibility changes
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check if session is still valid
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity > timeout) {
          endSession();
        } else {
          extendSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return (): void => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, timeout, extendSession, endSession]);

  // Calculate time until expiry
  const getTimeUntilExpiry = (): number | null => {
    if (!user || !lastActivityRef.current) return null;

    const elapsed = Date.now() - lastActivityRef.current;
    const remaining = timeout - elapsed;

    return Math.max(0, remaining);
  };

  return {
    isActive: !!user,
    timeUntilExpiry: getTimeUntilExpiry(),
    isWarning: isWarningRef.current,
    extendSession,
    endSession,
  };
}
