/**
 * Dashboard Store
 * Manages dashboard state, active dashboard, and dashboard operations with offline support
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Dashboard,
  DashboardTemplate,
  DashboardSearchFilters,
} from '@/types/dashboard';
import { dashboardService } from '@/services/dashboardService';
import {
  offlineDashboardService,
  type OfflineDashboard,
  type SyncResult,
} from '@/services/offlineDashboardService';
import {
  localStorageService,
  type SyncStatus,
} from '@/services/localStorageService';
import { logger } from '@/utils/logger';

export interface DashboardState {
  // Dashboard data
  dashboards: Dashboard[];
  defaultDashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  activeDashboardId: string | null;

  // UI state
  isLoading: boolean;
  isCreating: boolean;
  isEditing: boolean;
  editMode: boolean;
  error: string | null;

  // Templates and search
  templates: DashboardTemplate[];
  searchFilters: DashboardSearchFilters;
  searchResults: Dashboard[];

  // Offline and sync state
  isOnline: boolean;
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  conflictedDashboards: string[];

  // Actions - Dashboard Management
  setActiveDashboard: (dashboardId: string | null) => void;
  loadDashboards: () => Promise<void>;
  loadDefaultDashboards: () => Promise<void>;
  createDashboard: (
    dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<Dashboard | null>;
  updateDashboard: (
    id: string,
    updates: Partial<Dashboard>
  ) => Promise<Dashboard | null>;
  deleteDashboard: (id: string) => Promise<boolean>;
  duplicateDashboard: (id: string, name?: string) => Promise<Dashboard | null>;

  // Actions - UI State
  setEditMode: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Actions - Search and Filters
  searchDashboards: (filters: DashboardSearchFilters) => Promise<void>;
  clearSearch: () => void;

  // Actions - Templates
  loadTemplates: () => Promise<void>;
  createFromTemplate: (
    templateId: string,
    name: string
  ) => Promise<Dashboard | null>;

  // Actions - Offline and Sync
  setOnlineStatus: (isOnline: boolean) => void;
  syncOfflineChanges: () => Promise<SyncResult>;
  getSyncStatus: () => Promise<void>;
  resolveConflict: (
    dashboardId: string,
    strategy: 'local' | 'server' | 'merge'
  ) => Promise<void>;
  clearOfflineData: () => Promise<void>;

  // Actions - Real-time Sync
  refreshDashboards: () => Promise<void>;
  handleRemoteChange: (dashboardId: string, data: unknown) => void;
  handleRemoteDelete: (dashboardId: string) => void;
  handleRemoteCreate: () => Promise<void>;

  // Utility actions
  refreshDashboard: (id: string) => Promise<void>;
  resetStore: () => void;
}

const initialState = {
  dashboards: [],
  defaultDashboards: [],
  activeDashboard: null,
  activeDashboardId: null,
  isLoading: false,
  isCreating: false,
  isEditing: false,
  editMode: false,
  error: null,
  templates: [],
  searchFilters: {},
  searchResults: [],
  isOnline: navigator.onLine,
  syncStatus: null,
  isSyncing: false,
  lastSyncResult: null,
  conflictedDashboards: [],
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Dashboard Management Actions
        setActiveDashboard: (dashboardId: string | null): void => {
          const { dashboards, defaultDashboards } = get();
          const allDashboards = [...dashboards, ...defaultDashboards];
          const dashboard = dashboardId
            ? allDashboards.find(d => d.id === dashboardId) || null
            : null;

          set({
            activeDashboardId: dashboardId,
            activeDashboard: dashboard,
          });
        },

        loadDashboards: async (): Promise<void> => {
          set({ isLoading: true, error: null });

          try {
            const dashboards = await offlineDashboardService.getDashboards();

            // Identify conflicted dashboards
            const conflicted = dashboards
              .filter((d): d is OfflineDashboard => {
                const offlineD = d as OfflineDashboard;
                return (
                  offlineD.conflictInfo !== undefined &&
                  offlineD.conflictInfo.hasConflict
                );
              })
              .map(d => d.id);

            set({
              dashboards,
              conflictedDashboards: conflicted,
              isLoading: false,
            });

            // Update sync status
            get().getSyncStatus();

            logger.info('Dashboards loaded', {
              count: dashboards.length,
              offline: dashboards.filter(d => (d as OfflineDashboard).isOffline)
                .length,
              conflicts: conflicted.length,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to load dashboards';
            set({
              error: errorMessage,
              isLoading: false,
            });
            logger.error('Failed to load dashboards', { error: errorMessage });
          }
        },

        loadDefaultDashboards: async (): Promise<void> => {
          set({ isLoading: true, error: null });

          try {
            const response = await dashboardService.getDefaultDashboards();
            if (response.success && response.data) {
              set({
                defaultDashboards: response.data,
                isLoading: false,
              });
            } else {
              throw new Error(
                response.error || 'Failed to load default dashboards'
              );
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to load default dashboards';
            set({
              error: errorMessage,
              isLoading: false,
            });
          }
        },

        createDashboard: async (
          dashboardData: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
        ): Promise<Dashboard | null> => {
          set({ isCreating: true, error: null });

          try {
            const newDashboard =
              await offlineDashboardService.createDashboard(dashboardData);

            if (newDashboard) {
              set(state => ({
                dashboards: [...state.dashboards, newDashboard],
                isCreating: false,
              }));

              // Update sync status
              get().getSyncStatus();

              logger.info('Dashboard created', {
                id: newDashboard.id,
                offline: (newDashboard as OfflineDashboard).isOffline,
              });

              return newDashboard;
            } else {
              throw new Error('Failed to create dashboard');
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to create dashboard';
            set({
              error: errorMessage,
              isCreating: false,
            });
            logger.error('Failed to create dashboard', { error: errorMessage });
            return null;
          }
        },

        updateDashboard: async (
          id: string,
          updates: Partial<Dashboard>
        ): Promise<Dashboard | null> => {
          set({ isEditing: true, error: null });

          try {
            const updatedDashboard =
              await offlineDashboardService.updateDashboard(id, updates);

            if (updatedDashboard) {
              set(state => ({
                dashboards: state.dashboards.map(d =>
                  d.id === id ? updatedDashboard : d
                ),
                activeDashboard:
                  state.activeDashboardId === id
                    ? updatedDashboard
                    : state.activeDashboard,
                isEditing: false,
              }));

              // Update sync status
              get().getSyncStatus();

              logger.info('Dashboard updated', {
                id,
                offline: (updatedDashboard as OfflineDashboard).isOffline,
              });

              return updatedDashboard;
            } else {
              throw new Error('Failed to update dashboard');
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to update dashboard';
            set({
              error: errorMessage,
              isEditing: false,
            });
            logger.error('Failed to update dashboard', {
              id,
              error: errorMessage,
            });
            return null;
          }
        },

        deleteDashboard: async (id: string): Promise<boolean> => {
          set({ isLoading: true, error: null });

          try {
            const success = await offlineDashboardService.deleteDashboard(id);

            if (success) {
              set(state => ({
                dashboards: state.dashboards.filter(d => d.id !== id),
                activeDashboard:
                  state.activeDashboardId === id ? null : state.activeDashboard,
                activeDashboardId:
                  state.activeDashboardId === id
                    ? null
                    : state.activeDashboardId,
                conflictedDashboards: state.conflictedDashboards.filter(
                  cId => cId !== id
                ),
                isLoading: false,
              }));

              // Update sync status
              get().getSyncStatus();

              logger.info('Dashboard deleted', { id });
              return true;
            } else {
              throw new Error('Failed to delete dashboard');
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to delete dashboard';
            set({
              error: errorMessage,
              isLoading: false,
            });
            logger.error('Failed to delete dashboard', {
              id,
              error: errorMessage,
            });
            return false;
          }
        },

        duplicateDashboard: async (
          id: string,
          name?: string
        ): Promise<Dashboard | null> => {
          const { dashboards, defaultDashboards } = get();
          const allDashboards = [...dashboards, ...defaultDashboards];
          const originalDashboard = allDashboards.find(d => d.id === id);

          if (!originalDashboard) {
            set({ error: 'Dashboard not found' });
            return null;
          }

          const duplicateData: Omit<
            Dashboard,
            'id' | 'createdAt' | 'updatedAt'
          > = {
            ...originalDashboard,
            name: name || `${originalDashboard.name} (Copy)`,
            isDefault: false, // Duplicates are never default dashboards
          };

          return get().createDashboard(duplicateData);
        },

        // UI State Actions
        setEditMode: (enabled: boolean): void => {
          set({ editMode: enabled });
        },

        setLoading: (loading: boolean): void => {
          set({ isLoading: loading });
        },

        setError: (error: string | null): void => {
          set({ error });
        },

        clearError: (): void => {
          set({ error: null });
        },

        // Search and Filter Actions
        searchDashboards: async (
          filters: DashboardSearchFilters
        ): Promise<void> => {
          set({ isLoading: true, error: null, searchFilters: filters });

          try {
            // For now, implement client-side filtering
            // In a real app, this would be a server-side search
            const { dashboards, defaultDashboards } = get();
            const allDashboards = [...dashboards, ...defaultDashboards];

            let results = allDashboards;

            if (filters.query) {
              const query = filters.query.toLowerCase();
              results = results.filter(
                d =>
                  d.name.toLowerCase().includes(query) ||
                  d.description?.toLowerCase().includes(query) ||
                  d.tags.some(tag => tag.toLowerCase().includes(query))
              );
            }

            if (filters.owner) {
              results = results.filter(d => d.ownerId === filters.owner);
            }

            if (filters.tags && filters.tags.length > 0) {
              results = results.filter(d =>
                filters.tags!.some(tag => d.tags.includes(tag))
              );
            }

            if (filters.isPublic !== undefined) {
              results = results.filter(d => d.isPublic === filters.isPublic);
            }

            if (filters.isDefault !== undefined) {
              results = results.filter(d => d.isDefault === filters.isDefault);
            }

            if (filters.dateRange) {
              results = results.filter(d => {
                const createdAt = new Date(d.createdAt);
                return (
                  createdAt >= filters.dateRange!.start &&
                  createdAt <= filters.dateRange!.end
                );
              });
            }

            set({
              searchResults: results,
              isLoading: false,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Search failed';
            set({
              error: errorMessage,
              isLoading: false,
            });
          }
        },

        clearSearch: (): void => {
          set({
            searchFilters: {},
            searchResults: [],
          });
        },

        // Template Actions
        loadTemplates: async (): Promise<void> => {
          set({ isLoading: true, error: null });

          try {
            const response = await dashboardService.getTemplates();
            if (response.success && response.data) {
              set({
                templates: response.data,
                isLoading: false,
              });
            } else {
              throw new Error(response.error || 'Failed to load templates');
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to load templates';
            set({
              error: errorMessage,
              isLoading: false,
            });
          }
        },

        createFromTemplate: async (
          templateId: string,
          name: string
        ): Promise<Dashboard | null> => {
          set({ isCreating: true, error: null });

          try {
            const response = await dashboardService.createFromTemplate(
              templateId,
              name
            );
            if (response.success && response.data) {
              const newDashboard = response.data;
              set(state => ({
                dashboards: [...state.dashboards, newDashboard],
                isCreating: false,
              }));
              return newDashboard;
            } else {
              throw new Error(
                response.error || 'Failed to create dashboard from template'
              );
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to create dashboard from template';
            set({
              error: errorMessage,
              isCreating: false,
            });
            return null;
          }
        },

        // Offline and Sync Actions
        setOnlineStatus: (isOnline: boolean): void => {
          set({ isOnline });

          if (isOnline) {
            // Auto-sync when coming back online
            get().syncOfflineChanges();
          }

          logger.info('Online status changed', { isOnline });
        },

        syncOfflineChanges: async (): Promise<SyncResult> => {
          const { isSyncing } = get();

          if (isSyncing) {
            logger.info('Sync already in progress');
            return {
              success: false,
              synced: 0,
              conflicts: 0,
              errors: ['Sync already in progress'],
            };
          }

          set({ isSyncing: true, error: null });

          try {
            const result = await offlineDashboardService.syncOfflineChanges();

            set({
              isSyncing: false,
              lastSyncResult: result,
            });

            if (result.success) {
              // Reload dashboards after successful sync
              await get().loadDashboards();
              logger.info('Sync completed successfully', {
                synced: result.synced,
                conflicts: result.conflicts,
                success: result.success,
              });
            } else {
              logger.warn('Sync completed with errors', {
                synced: result.synced,
                conflicts: result.conflicts,
                errors: result.errors,
              });
            }

            return result;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Sync failed';
            const result: SyncResult = {
              success: false,
              synced: 0,
              conflicts: 0,
              errors: [errorMessage],
            };

            set({
              isSyncing: false,
              lastSyncResult: result,
              error: errorMessage,
            });

            logger.error('Sync failed', { error: errorMessage });
            return result;
          }
        },

        getSyncStatus: async (): Promise<void> => {
          try {
            // Add safety check to prevent localStorage access during SSR
            if (typeof window === 'undefined' || !window.localStorage) {
              return;
            }

            const syncStatus = await offlineDashboardService.getSyncStatus();
            set({ syncStatus });
          } catch (error) {
            logger.error('Failed to get sync status', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        },

        resolveConflict: async (
          dashboardId: string,
          strategy: 'local' | 'server' | 'merge'
        ): Promise<void> => {
          try {
            set({ isLoading: true, error: null });

            // Get current dashboard data
            const dashboard =
              await offlineDashboardService.getDashboard(dashboardId);
            if (!dashboard) {
              throw new Error('Dashboard not found');
            }

            // For now, we'll implement a simple resolution by re-fetching
            // In a full implementation, this would use the conflict resolution logic
            if (strategy === 'server') {
              // Force refresh from server
              const response = await dashboardService.getDashboard(dashboardId);
              if (response.success && response.data) {
                await localStorageService.set(
                  `dashboard_${dashboardId}`,
                  response.data,
                  Date.now()
                );
              }
            }

            // Remove from conflicts list
            set(state => ({
              conflictedDashboards: state.conflictedDashboards.filter(
                id => id !== dashboardId
              ),
              isLoading: false,
            }));

            // Reload dashboards
            await get().loadDashboards();

            logger.info('Conflict resolved', { dashboardId, strategy });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to resolve conflict';
            set({
              error: errorMessage,
              isLoading: false,
            });
            logger.error('Failed to resolve conflict', {
              dashboardId,
              strategy,
              error: errorMessage,
            });
          }
        },

        clearOfflineData: async (): Promise<void> => {
          try {
            await offlineDashboardService.clearOfflineData();

            // Reset relevant state
            set({
              syncStatus: null,
              lastSyncResult: null,
              conflictedDashboards: [],
            });

            logger.info('Offline data cleared');
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to clear offline data';
            set({ error: errorMessage });
            logger.error('Failed to clear offline data', {
              error: errorMessage,
            });
          }
        },

        // Utility Actions
        refreshDashboard: async (id: string): Promise<void> => {
          try {
            const dashboard = await offlineDashboardService.getDashboard(id);
            if (dashboard) {
              set(state => ({
                dashboards: state.dashboards.map(d =>
                  d.id === id ? dashboard : d
                ),
                activeDashboard:
                  state.activeDashboardId === id
                    ? dashboard
                    : state.activeDashboard,
              }));

              logger.info('Dashboard refreshed', { id });
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to refresh dashboard';
            set({ error: errorMessage });
            logger.error('Failed to refresh dashboard', {
              id,
              error: errorMessage,
            });
          }
        },

        // Real-time Sync Actions
        refreshDashboards: async (): Promise<void> => {
          await get().loadDashboards();
        },

        handleRemoteChange: (dashboardId: string, data: unknown): void => {
          if (data && typeof data === 'object') {
            const updatedDashboard = data as Dashboard;

            set(state => ({
              dashboards: state.dashboards.map(d =>
                d.id === dashboardId ? updatedDashboard : d
              ),
              activeDashboard:
                state.activeDashboardId === dashboardId
                  ? updatedDashboard
                  : state.activeDashboard,
            }));

            logger.info('Applied remote dashboard change', { dashboardId });
          }
        },

        handleRemoteDelete: (dashboardId: string): void => {
          set(state => ({
            dashboards: state.dashboards.filter(d => d.id !== dashboardId),
            activeDashboard:
              state.activeDashboardId === dashboardId
                ? null
                : state.activeDashboard,
            activeDashboardId:
              state.activeDashboardId === dashboardId
                ? null
                : state.activeDashboardId,
            conflictedDashboards: state.conflictedDashboards.filter(
              cId => cId !== dashboardId
            ),
          }));

          logger.info('Applied remote dashboard deletion', { dashboardId });
        },

        handleRemoteCreate: async (): Promise<void> => {
          // Refresh the entire dashboard list to include new dashboards
          await get().loadDashboards();
          logger.info('Refreshed dashboards after remote creation');
        },

        resetStore: (): void => {
          set(initialState);
        },
      }),
      {
        name: 'dashboard-storage',
        partialize: state => ({
          activeDashboardId: state.activeDashboardId,
          editMode: state.editMode,
          searchFilters: state.searchFilters,
          isOnline: state.isOnline,
          lastSyncResult: state.lastSyncResult,
        }),
      }
    ),
    {
      name: 'dashboard-store',
    }
  )
);

// Utility hooks for common patterns
export const useActiveDashboard = (): Dashboard | null => {
  return useDashboardStore(state => state.activeDashboard);
};

export const useDashboards = (): Dashboard[] => {
  return useDashboardStore(state => state.dashboards);
};

export const useDefaultDashboards = (): Dashboard[] => {
  return useDashboardStore(state => state.defaultDashboards);
};

export const useDashboardLoading = (): boolean => {
  return useDashboardStore(state => state.isLoading);
};

export const useDashboardError = (): string | null => {
  return useDashboardStore(state => state.error);
};

export const useEditMode = (): boolean => {
  return useDashboardStore(state => state.editMode);
};

export const useOnlineStatus = (): boolean => {
  return useDashboardStore(state => state.isOnline);
};

export const useSyncStatus = (): SyncStatus | null => {
  return useDashboardStore(state => state.syncStatus);
};

export const useIsSyncing = (): boolean => {
  return useDashboardStore(state => state.isSyncing);
};

export const useConflictedDashboards = (): string[] => {
  return useDashboardStore(state => state.conflictedDashboards);
};

export const useLastSyncResult = (): SyncResult | null => {
  return useDashboardStore(state => state.lastSyncResult);
};
