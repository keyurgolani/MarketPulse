/**
 * API State Store
 * Manages global API state including loading, errors, and connection status
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { checkApiHealth } from '@/services';

export interface ApiState {
  // Connection status
  isOnline: boolean;
  isApiHealthy: boolean;
  lastHealthCheck: number | null;

  // Global loading states
  globalLoading: boolean;
  loadingOperations: Set<string>;

  // Error handling
  lastError: string | null;
  errorHistory: Array<{
    error: string;
    timestamp: number;
    operation?: string;
  }>;

  // Actions
  setOnline: (online: boolean) => void;
  setApiHealthy: (healthy: boolean) => void;
  checkHealth: () => Promise<void>;

  startLoading: (operation?: string) => void;
  stopLoading: (operation?: string) => void;

  setError: (error: string, operation?: string) => void;
  clearError: () => void;
  clearErrorHistory: () => void;
}

export const useApiStore = create<ApiState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isOnline: navigator.onLine,
      isApiHealthy: true,
      lastHealthCheck: null,
      globalLoading: false,
      loadingOperations: new Set(),
      lastError: null,
      errorHistory: [],

      // Connection actions
      setOnline: (online: boolean): void => {
        set({ isOnline: online });
      },

      setApiHealthy: (healthy: boolean): void => {
        set({
          isApiHealthy: healthy,
          lastHealthCheck: Date.now(),
        });
      },

      checkHealth: async (): Promise<void> => {
        try {
          const healthy = await checkApiHealth();
          get().setApiHealthy(healthy);
        } catch {
          get().setApiHealthy(false);
        }
      },

      // Loading actions
      startLoading: (operation?: string): void => {
        const { loadingOperations } = get();
        const newOperations = new Set(loadingOperations);

        if (operation) {
          newOperations.add(operation);
        }

        set({
          globalLoading: true,
          loadingOperations: newOperations,
        });
      },

      stopLoading: (operation?: string): void => {
        const { loadingOperations } = get();
        const newOperations = new Set(loadingOperations);

        if (operation) {
          newOperations.delete(operation);
        } else {
          newOperations.clear();
        }

        set({
          globalLoading: newOperations.size > 0,
          loadingOperations: newOperations,
        });
      },

      // Error actions
      setError: (error: string, operation?: string): void => {
        const { errorHistory } = get();
        const newError = {
          error,
          timestamp: Date.now(),
          operation,
        };

        set({
          lastError: error,
          errorHistory: [...errorHistory, newError].slice(-10), // Keep last 10 errors
        });
      },

      clearError: (): void => {
        set({ lastError: null });
      },

      clearErrorHistory: (): void => {
        set({ errorHistory: [] });
      },
    }),
    {
      name: 'api-store',
    }
  )
);

// Initialize online/offline listeners
if (typeof window !== 'undefined') {
  const updateOnlineStatus = (): void => {
    useApiStore.getState().setOnline(navigator.onLine);
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Initial health check
  useApiStore.getState().checkHealth();

  // Periodic health checks (every 5 minutes)
  setInterval(
    () => {
      useApiStore.getState().checkHealth();
    },
    5 * 60 * 1000
  );
}

// Utility hooks for common patterns
export const useApiLoading = (operation?: string): boolean => {
  return useApiStore(state =>
    operation ? state.loadingOperations.has(operation) : state.globalLoading
  );
};

export const useApiError = (): string | null => {
  return useApiStore(state => state.lastError);
};

export const useApiHealth = (): {
  isOnline: boolean;
  isApiHealthy: boolean;
} => {
  return useApiStore(state => ({
    isOnline: state.isOnline,
    isApiHealthy: state.isApiHealthy,
  }));
};
