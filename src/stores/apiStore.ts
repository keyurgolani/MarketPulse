/**
 * API State Store
 * Manages global API state including loading, errors, and connection status
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { checkApiHealth } from '@/services';

export interface ApiRequest {
  url: string;
  method: string;
  timestamp: number;
  status: 'pending' | 'success' | 'error';
  data?: unknown;
  error?: string;
}

export interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

export interface ApiState {
  // Connection status
  isOnline: boolean;
  isApiHealthy: boolean;
  lastHealthCheck: number | null;

  // Request tracking
  requests: Map<string, ApiRequest>;
  cache: Map<string, CacheEntry>;

  // Global loading states
  isLoading: boolean;
  globalLoading: boolean;
  loadingOperations: Set<string>;

  // Error handling
  error: Error | null;
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

  // Loading actions
  setLoading: (loading: boolean) => void;
  startLoading: (operation?: string) => void;
  stopLoading: (operation?: string) => void;

  // Error actions
  setError: (error: Error | string | null, operation?: string) => void;
  clearError: () => void;
  clearErrorHistory: () => void;

  // Request actions
  addRequest: (id: string, request: Omit<ApiRequest, 'timestamp'>) => void;
  updateRequest: (id: string, updates: Partial<ApiRequest>) => void;
  removeRequest: (id: string) => void;
  getRequestsByStatus: (status: ApiRequest['status']) => ApiRequest[];
  getPendingRequests: () => ApiRequest[];

  // Cache actions
  setCache: (key: string, entry: CacheEntry) => void;
  getCache: (key: string) => unknown | null;
  clearCache: () => void;
}

export const useApiStore = create<ApiState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isApiHealthy: true,
      lastHealthCheck: null,
      requests: new Map(),
      cache: new Map(),
      isLoading: false,
      globalLoading: false,
      loadingOperations: new Set(),
      error: null,
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
      setLoading: (loading: boolean): void => {
        set({ isLoading: loading });
      },

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
      setError: (error: Error | string | null, operation?: string): void => {
        const { errorHistory } = get();
        const errorString = error instanceof Error ? error.message : error;
        const errorObj = error instanceof Error ? error : null;

        if (errorString) {
          const newError = {
            error: errorString,
            timestamp: Date.now(),
            operation,
          };

          set({
            error: errorObj,
            lastError: errorString,
            errorHistory: [...errorHistory, newError].slice(-10), // Keep last 10 errors
          });
        } else {
          set({
            error: null,
            lastError: null,
          });
        }
      },

      clearError: (): void => {
        set({ error: null, lastError: null });
      },

      clearErrorHistory: (): void => {
        set({ errorHistory: [] });
      },

      // Request actions
      addRequest: (
        id: string,
        request: Omit<ApiRequest, 'timestamp'>
      ): void => {
        const { requests } = get();
        const newRequests = new Map(requests);
        newRequests.set(id, {
          ...request,
          timestamp: Date.now(),
        });
        set({ requests: newRequests });
      },

      updateRequest: (id: string, updates: Partial<ApiRequest>): void => {
        const { requests } = get();
        const existingRequest = requests.get(id);
        if (existingRequest) {
          const newRequests = new Map(requests);
          newRequests.set(id, { ...existingRequest, ...updates });
          set({ requests: newRequests });
        }
      },

      removeRequest: (id: string): void => {
        const { requests } = get();
        const newRequests = new Map(requests);
        newRequests.delete(id);
        set({ requests: newRequests });
      },

      getRequestsByStatus: (status: ApiRequest['status']): ApiRequest[] => {
        const { requests } = get();
        return Array.from(requests.values()).filter(
          req => req.status === status
        );
      },

      getPendingRequests: (): ApiRequest[] => {
        return get().getRequestsByStatus('pending');
      },

      // Cache actions
      setCache: (key: string, entry: CacheEntry): void => {
        const { cache } = get();
        const newCache = new Map(cache);
        newCache.set(key, entry);
        set({ cache: newCache });
      },

      getCache: (key: string): unknown | null => {
        const { cache } = get();
        const entry = cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
          // Entry expired, remove it
          const newCache = new Map(cache);
          newCache.delete(key);
          set({ cache: newCache });
          return null;
        }

        return entry.data;
      },

      clearCache: (): void => {
        set({ cache: new Map() });
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
