/**
 * Offline Dashboard Service
 * Handles dashboard operations when offline with conflict resolution
 */

import {
  localStorageService,
  type StorageEntry,
  type ConflictInfo,
} from './localStorageService';
import { dashboardService } from './dashboardService';
import { logger } from '@/utils/logger';
import type { Dashboard } from '@/types/dashboard';

export interface OfflineDashboard extends Dashboard {
  isOffline?: boolean;
  conflictInfo?: ConflictInfo;
  lastSyncAttempt?: number;
  syncRetries?: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: string[];
}

class OfflineDashboardService {
  private readonly DASHBOARD_KEY_PREFIX = 'dashboard_';
  private readonly DASHBOARDS_LIST_KEY = 'dashboards_list';
  private syncInProgress = false;

  /**
   * Get dashboard key for storage
   */
  private getDashboardKey(id: string): string {
    return `${this.DASHBOARD_KEY_PREFIX}${id}`;
  }

  /**
   * Check if online
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get dashboard from local storage or server
   */
  async getDashboard(id: string): Promise<Dashboard | null> {
    try {
      // Try local storage first
      const localEntry = await localStorageService.get<Dashboard>(
        this.getDashboardKey(id)
      );

      if (!this.isOnline()) {
        // Offline mode - return local data if available
        if (localEntry) {
          logger.info('Retrieved dashboard from local storage (offline)', {
            id,
          });
          return {
            ...localEntry.data,
            isOffline: true,
          } as OfflineDashboard;
        }

        logger.warn('Dashboard not available offline', { id });
        return null;
      }

      // Online mode - try to sync with server
      try {
        const serverResponse = await dashboardService.getDashboard(id);

        if (serverResponse.success && serverResponse.data) {
          const serverDashboard = serverResponse.data;

          // Check for conflicts if local data exists
          if (localEntry) {
            const conflict = localStorageService.detectConflict(
              localEntry,
              serverDashboard,
              Date.now(), // Server doesn't provide version, use timestamp
              new Date(serverDashboard.updatedAt).getTime()
            );

            if (conflict.hasConflict) {
              logger.warn('Dashboard conflict detected', { id, conflict });

              // For now, prefer server data but mark conflict
              const dashboardWithConflict: OfflineDashboard = {
                ...serverDashboard,
                conflictInfo: conflict,
              };

              // Store resolved data
              await localStorageService.set(
                this.getDashboardKey(id),
                dashboardWithConflict,
                Date.now()
              );

              return dashboardWithConflict;
            }
          }

          // No conflict - update local storage
          await localStorageService.set(
            this.getDashboardKey(id),
            serverDashboard,
            Date.now()
          );

          logger.debug('Dashboard synced from server', { id });
          return serverDashboard;
        }
      } catch (error) {
        logger.warn('Server request failed, using local data', {
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Server failed but we have local data
      if (localEntry) {
        return {
          ...localEntry.data,
          isOffline: true,
        } as OfflineDashboard;
      }

      return null;
    } catch (error) {
      logger.error('Get dashboard failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get all dashboards with offline support
   */
  async getDashboards(): Promise<Dashboard[]> {
    try {
      if (!this.isOnline()) {
        // Offline mode - return local dashboards
        const localDashboards = await this.getLocalDashboards();
        logger.info('Retrieved dashboards from local storage (offline)', {
          count: localDashboards.length,
        });
        return localDashboards.map(
          d => ({ ...d, isOffline: true }) as OfflineDashboard
        );
      }

      // Online mode - try to sync with server
      try {
        const serverResponse = await dashboardService.getDashboards();

        if (serverResponse.success && serverResponse.data) {
          const serverDashboards = serverResponse.data;

          // Update local storage
          await this.updateLocalDashboardsList(serverDashboards);

          // Store individual dashboards
          for (const dashboard of serverDashboards) {
            await localStorageService.set(
              this.getDashboardKey(dashboard.id),
              dashboard,
              Date.now()
            );
          }

          logger.debug('Dashboards synced from server', {
            count: serverDashboards.length,
          });
          return serverDashboards;
        }
      } catch (error) {
        logger.warn('Server request failed, using local data', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Server failed - return local data
      const localDashboards = await this.getLocalDashboards();
      return localDashboards.map(
        d => ({ ...d, isOffline: true }) as OfflineDashboard
      );
    } catch (error) {
      logger.error('Get dashboards failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Create dashboard with offline support
   */
  async createDashboard(
    dashboardData: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Dashboard | null> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      const newDashboard: Dashboard = {
        ...dashboardData,
        id: tempId,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      };

      if (!this.isOnline()) {
        // Offline mode - store locally with offline flag
        await localStorageService.markOffline(
          this.getDashboardKey(tempId),
          newDashboard
        );
        await this.addToLocalDashboardsList(newDashboard);

        logger.info('Dashboard created offline', { id: tempId });
        return { ...newDashboard, isOffline: true } as OfflineDashboard;
      }

      // Online mode - try to create on server
      try {
        const serverResponse =
          await dashboardService.createDashboard(dashboardData);

        if (serverResponse.success && serverResponse.data) {
          const serverDashboard = serverResponse.data;

          // Store in local storage
          await localStorageService.set(
            this.getDashboardKey(serverDashboard.id),
            serverDashboard,
            Date.now()
          );
          await this.addToLocalDashboardsList(serverDashboard);

          logger.info('Dashboard created on server', {
            id: serverDashboard.id,
          });
          return serverDashboard;
        }
      } catch (error) {
        logger.warn('Server create failed, storing offline', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Server failed - store offline
      await localStorageService.markOffline(
        this.getDashboardKey(tempId),
        newDashboard
      );
      await this.addToLocalDashboardsList(newDashboard);

      return { ...newDashboard, isOffline: true } as OfflineDashboard;
    } catch (error) {
      logger.error('Create dashboard failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Update dashboard with offline support
   */
  async updateDashboard(
    id: string,
    updates: Partial<Dashboard>
  ): Promise<Dashboard | null> {
    try {
      // Get current dashboard
      const currentDashboard = await this.getDashboard(id);
      if (!currentDashboard) {
        logger.error('Dashboard not found for update', { id });
        return null;
      }

      const updatedDashboard: Dashboard = {
        ...currentDashboard,
        ...updates,
        updatedAt: new Date(),
      };

      if (!this.isOnline()) {
        // Offline mode - store locally
        await localStorageService.markOffline(
          this.getDashboardKey(id),
          updatedDashboard
        );
        await this.updateDashboardInLocalList(id, updatedDashboard);

        logger.info('Dashboard updated offline', { id });
        return { ...updatedDashboard, isOffline: true } as OfflineDashboard;
      }

      // Online mode - try to update on server
      try {
        const serverResponse = await dashboardService.updateDashboard(
          id,
          updates
        );

        if (serverResponse.success && serverResponse.data) {
          const serverDashboard = serverResponse.data;

          // Update local storage
          await localStorageService.set(
            this.getDashboardKey(id),
            serverDashboard,
            Date.now()
          );
          await this.updateDashboardInLocalList(id, serverDashboard);

          logger.info('Dashboard updated on server', { id });
          return serverDashboard;
        }
      } catch (error) {
        logger.warn('Server update failed, storing offline', {
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Server failed - store offline
      await localStorageService.markOffline(
        this.getDashboardKey(id),
        updatedDashboard
      );
      await this.updateDashboardInLocalList(id, updatedDashboard);

      return { ...updatedDashboard, isOffline: true } as OfflineDashboard;
    } catch (error) {
      logger.error('Update dashboard failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Delete dashboard with offline support
   */
  async deleteDashboard(id: string): Promise<boolean> {
    try {
      if (!this.isOnline()) {
        // Offline mode - mark for deletion
        await localStorageService.markOffline(`delete_${id}`, {
          id,
          deleted: true,
        });
        await this.removeFromLocalDashboardsList(id);

        logger.info('Dashboard marked for deletion (offline)', { id });
        return true;
      }

      // Online mode - try to delete on server
      try {
        const serverResponse = await dashboardService.deleteDashboard(id);

        if (serverResponse.success) {
          // Remove from local storage
          await localStorageService.remove(this.getDashboardKey(id));
          await this.removeFromLocalDashboardsList(id);

          logger.info('Dashboard deleted on server', { id });
          return true;
        }
      } catch (error) {
        logger.warn('Server delete failed, marking for deletion', {
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Server failed - mark for deletion
      await localStorageService.markOffline(`delete_${id}`, {
        id,
        deleted: true,
      });
      await this.removeFromLocalDashboardsList(id);

      return true;
    } catch (error) {
      logger.error('Delete dashboard failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Sync offline changes with server
   */
  async syncOfflineChanges(): Promise<SyncResult> {
    if (this.syncInProgress) {
      logger.info('Sync already in progress, skipping');
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
      };
    }

    if (!this.isOnline()) {
      logger.info('Cannot sync while offline');
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: ['Device is offline'],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      logger.info('Starting offline changes sync');

      const offlineItems = await localStorageService.getOfflineItems();

      for (const { key, entry } of offlineItems) {
        try {
          await this.syncSingleItem(key, entry);
          result.synced++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`${key}: ${errorMessage}`);
          logger.error('Failed to sync item', { key, error: errorMessage });
        }
      }

      // Update last sync timestamp
      await localStorageService.updateLastSync();

      logger.info('Offline sync completed', {
        synced: result.synced,
        conflicts: result.conflicts,
        success: result.success,
      });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(errorMessage);

      logger.error('Offline sync failed', { error: errorMessage });
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single offline item
   */
  private async syncSingleItem(
    key: string,
    entry: StorageEntry<unknown>
  ): Promise<void> {
    if (key.startsWith('delete_')) {
      // Handle deletion
      const dashboardId = key.replace('delete_', '');
      await dashboardService.deleteDashboard(dashboardId);
      await localStorageService.remove(key);
      return;
    }

    if (key.startsWith(this.DASHBOARD_KEY_PREFIX)) {
      // Handle dashboard sync
      const dashboardId = key.replace(this.DASHBOARD_KEY_PREFIX, '');
      const dashboard = entry.data as Dashboard;

      if (dashboardId.startsWith('temp_')) {
        // Create new dashboard
        const {
          id: _id,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...dashboardData
        } = dashboard;
        // Suppress unused variable warnings - these are destructured to exclude from dashboardData
        void _id;
        void _createdAt;
        void _updatedAt;
        const response = await dashboardService.createDashboard(dashboardData);

        if (response.success && response.data) {
          // Replace temp dashboard with server dashboard
          await localStorageService.remove(key);
          await localStorageService.set(
            this.getDashboardKey(response.data.id),
            response.data,
            Date.now()
          );
          await this.replaceInLocalDashboardsList(dashboardId, response.data);
        }
      } else {
        // Update existing dashboard
        const {
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...updates
        } = dashboard;
        // Suppress unused variable warnings - these are destructured to exclude from updates
        void _createdAt;
        void _updatedAt;
        const response = await dashboardService.updateDashboard(
          dashboardId,
          updates
        );

        if (response.success && response.data) {
          await localStorageService.set(key, response.data, Date.now());
          await this.updateDashboardInLocalList(dashboardId, response.data);
        }
      }
    }
  }

  /**
   * Get dashboards from local storage
   */
  private async getLocalDashboards(): Promise<Dashboard[]> {
    try {
      const listEntry = await localStorageService.get<Dashboard[]>(
        this.DASHBOARDS_LIST_KEY
      );

      const data = listEntry?.data;

      // Ensure we always return an array
      if (Array.isArray(data)) {
        return data;
      }

      // If data is not an array, log warning and return empty array
      if (data !== undefined && data !== null) {
        logger.warn('Local dashboards data is not an array, resetting', {
          dataType: typeof data,
          data: data,
        });
      }

      return [];
    } catch (error) {
      logger.error('Failed to get local dashboards', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Update local dashboards list
   */
  private async updateLocalDashboardsList(
    dashboards: Dashboard[]
  ): Promise<void> {
    await localStorageService.set(
      this.DASHBOARDS_LIST_KEY,
      dashboards,
      Date.now()
    );
  }

  /**
   * Add dashboard to local list
   */
  private async addToLocalDashboardsList(dashboard: Dashboard): Promise<void> {
    const currentList = await this.getLocalDashboards();
    const updatedList = [...currentList, dashboard];
    await this.updateLocalDashboardsList(updatedList);
  }

  /**
   * Update dashboard in local list
   */
  private async updateDashboardInLocalList(
    id: string,
    dashboard: Dashboard
  ): Promise<void> {
    const currentList = await this.getLocalDashboards();
    const updatedList = currentList.map(d => (d.id === id ? dashboard : d));
    await this.updateLocalDashboardsList(updatedList);
  }

  /**
   * Remove dashboard from local list
   */
  private async removeFromLocalDashboardsList(id: string): Promise<void> {
    const currentList = await this.getLocalDashboards();
    const updatedList = currentList.filter(d => d.id !== id);
    await this.updateLocalDashboardsList(updatedList);
  }

  /**
   * Replace dashboard in local list (for temp ID replacement)
   */
  private async replaceInLocalDashboardsList(
    oldId: string,
    newDashboard: Dashboard
  ): Promise<void> {
    const currentList = await this.getLocalDashboards();
    const updatedList = currentList.map(d =>
      d.id === oldId ? newDashboard : d
    );
    await this.updateLocalDashboardsList(updatedList);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<
    import('@/services/localStorageService').SyncStatus
  > {
    return localStorageService.getSyncStatus();
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    await localStorageService.clear();
    logger.info('All offline data cleared');
  }
}

// Export singleton instance
export const offlineDashboardService = new OfflineDashboardService();
