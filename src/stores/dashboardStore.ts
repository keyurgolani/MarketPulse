/**
 * Dashboard Store
 * Manages dashboard state, active dashboard, and dashboard operations
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Dashboard,
  DashboardTemplate,
  DashboardSearchFilters,
} from '@/types/dashboard';
import { dashboardService } from '@/services/dashboardService';

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
            const response = await dashboardService.getDashboards();
            if (response.success && response.data) {
              set({
                dashboards: response.data,
                isLoading: false,
              });
            } else {
              throw new Error(response.error || 'Failed to load dashboards');
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to load dashboards';
            set({
              error: errorMessage,
              isLoading: false,
            });
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
            const response =
              await dashboardService.createDashboard(dashboardData);
            if (response.success && response.data) {
              const newDashboard = response.data;
              set(state => ({
                dashboards: [...state.dashboards, newDashboard],
                isCreating: false,
              }));
              return newDashboard;
            } else {
              throw new Error(response.error || 'Failed to create dashboard');
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
            return null;
          }
        },

        updateDashboard: async (
          id: string,
          updates: Partial<Dashboard>
        ): Promise<Dashboard | null> => {
          set({ isEditing: true, error: null });

          try {
            const response = await dashboardService.updateDashboard(
              id,
              updates
            );
            if (response.success && response.data) {
              const updatedDashboard = response.data;
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
              return updatedDashboard;
            } else {
              throw new Error(response.error || 'Failed to update dashboard');
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
            return null;
          }
        },

        deleteDashboard: async (id: string): Promise<boolean> => {
          set({ isLoading: true, error: null });

          try {
            const response = await dashboardService.deleteDashboard(id);
            if (response.success) {
              set(state => ({
                dashboards: state.dashboards.filter(d => d.id !== id),
                activeDashboard:
                  state.activeDashboardId === id ? null : state.activeDashboard,
                activeDashboardId:
                  state.activeDashboardId === id
                    ? null
                    : state.activeDashboardId,
                isLoading: false,
              }));
              return true;
            } else {
              throw new Error(response.error || 'Failed to delete dashboard');
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
          // TODO: Implement template loading from API
          // For now, return empty array
          set({ templates: [] });
        },

        createFromTemplate: async (): Promise<Dashboard | null> => {
          // TODO: Implement template-based dashboard creation
          // For now, return null
          set({ error: 'Template creation not yet implemented' });
          return null;
        },

        // Utility Actions
        refreshDashboard: async (id: string): Promise<void> => {
          try {
            const response = await dashboardService.getDashboard(id);
            if (response.success && response.data) {
              const refreshedDashboard = response.data;
              set(state => ({
                dashboards: state.dashboards.map(d =>
                  d.id === id ? refreshedDashboard : d
                ),
                activeDashboard:
                  state.activeDashboardId === id
                    ? refreshedDashboard
                    : state.activeDashboard,
              }));
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to refresh dashboard';
            set({ error: errorMessage });
          }
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
