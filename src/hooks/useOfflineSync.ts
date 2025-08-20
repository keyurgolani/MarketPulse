/**
 * Offline Sync Hook
 * Manages online/offline status and automatic synchronization
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { logger } from '@/utils/logger';
import type { SyncStatus } from '@/services/localStorageService';
import type { SyncResult } from '@/services/offlineDashboardService';

export interface UseOfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  retryDelay?: number;
  maxRetries?: number;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync: number;
  conflicts: string[];
  syncErrors: string[];
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}): {
  isOnline: boolean;
  isSyncing: boolean;
  status: OfflineSyncStatus;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  triggerSync: () => Promise<{ success: boolean; error?: string }>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  syncStatus: SyncStatus | null;
  lastSyncResult: SyncResult | null;
  conflictedDashboards: string[];
} {
  const {
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    retryDelay = 5000, // 5 seconds
    maxRetries = 3,
  } = options;

  const {
    isOnline,
    isSyncing,
    syncStatus,
    lastSyncResult,
    conflictedDashboards,
    setOnlineStatus,
    syncOfflineChanges,
    getSyncStatus,
  } = useDashboardStore();

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Handle online status change
   */
  const handleOnlineStatusChange = useCallback(() => {
    const online = navigator.onLine;
    setOnlineStatus(online);

    logger.info('Online status changed', { online });

    if (online && autoSync) {
      // Trigger immediate sync when coming back online
      syncOfflineChanges();
    }
  }, [setOnlineStatus, syncOfflineChanges, autoSync]);

  /**
   * Perform sync with retry logic
   */
  const performSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }

    try {
      const result = await syncOfflineChanges();

      if (result.success) {
        retryCountRef.current = 0;
        logger.debug('Auto-sync completed successfully', {
          synced: result.synced,
          conflicts: result.conflicts,
          success: result.success,
        });
      } else {
        // Schedule retry if there were errors
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(() => {
            logger.info('Retrying sync', {
              attempt: retryCountRef.current,
              maxRetries,
            });
            performSync();
          }, retryDelay * retryCountRef.current); // Exponential backoff
        } else {
          logger.warn('Max sync retries exceeded', {
            maxRetries,
            errors: result.errors,
          });
          retryCountRef.current = 0;
        }
      }
    } catch (error) {
      logger.error('Auto-sync failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [syncOfflineChanges, isSyncing, maxRetries, retryDelay]);

  /**
   * Start auto-sync interval
   */
  const startAutoSync = useCallback((): void => {
    if (!autoSync || syncIntervalRef.current) {
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        performSync();
      }
    }, syncInterval);

    logger.debug('Auto-sync started', { interval: syncInterval });
  }, [autoSync, syncInterval, isSyncing, performSync]);

  /**
   * Stop auto-sync interval
   */
  const stopAutoSync = useCallback((): void => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
      logger.debug('Auto-sync stopped');
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Manual sync trigger
   */
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      logger.warn('Cannot sync while offline');
      return { success: false, error: 'Device is offline' };
    }

    try {
      const result = await syncOfflineChanges();
      logger.info('Manual sync completed', {
        synced: result.synced,
        conflicts: result.conflicts,
        success: result.success,
      });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sync failed';
      logger.error('Manual sync failed', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [syncOfflineChanges]);

  /**
   * Get current sync status
   */
  const getStatus = useCallback((): OfflineSyncStatus => {
    return {
      isOnline,
      isSyncing,
      pendingChanges: syncStatus?.pendingChanges || 0,
      lastSync: syncStatus?.lastSync || 0,
      conflicts: conflictedDashboards,
      syncErrors: lastSyncResult?.errors || [],
    };
  }, [isOnline, isSyncing, syncStatus, conflictedDashboards, lastSyncResult]);

  /**
   * Check if there are pending changes
   */
  const hasPendingChanges = useCallback((): boolean => {
    return (syncStatus?.pendingChanges || 0) > 0;
  }, [syncStatus]);

  /**
   * Check if there are conflicts
   */
  const hasConflicts = useCallback((): boolean => {
    return conflictedDashboards.length > 0;
  }, [conflictedDashboards]);

  // Set up online/offline event listeners
  useEffect(() => {
    // Set initial online status
    setOnlineStatus(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    // Delay initial sync status to avoid SSR/hydration issues and localStorage errors
    const timer = setTimeout(() => {
      // Additional check to ensure we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        getSyncStatus();
      }
    }, 1000); // Increased delay to 1 second

    return (): void => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [handleOnlineStatusChange, setOnlineStatus, getSyncStatus]);

  // Manage auto-sync interval
  useEffect(() => {
    if (autoSync && isOnline) {
      startAutoSync();
    } else {
      stopAutoSync();
    }

    return (): void => {
      stopAutoSync();
    };
  }, [autoSync, isOnline, startAutoSync, stopAutoSync]);

  // Update sync status periodically
  useEffect(() => {
    const statusInterval = setInterval(() => {
      // Additional check to ensure we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        getSyncStatus();
      }
    }, 10000); // Update every 10 seconds

    return (): void => {
      clearInterval(statusInterval);
    };
  }, [getSyncStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      stopAutoSync();
    };
  }, [stopAutoSync]);

  return {
    // Status
    isOnline,
    isSyncing,
    status: getStatus(),
    hasPendingChanges: hasPendingChanges(),
    hasConflicts: hasConflicts(),

    // Actions
    triggerSync,
    startAutoSync,
    stopAutoSync,

    // Data
    syncStatus,
    lastSyncResult,
    conflictedDashboards,
  };
}
