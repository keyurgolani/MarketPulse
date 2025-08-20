/**
 * Sync Status Indicator Component
 * Shows sync status and provides manual sync controls
 */

import React, { useState } from 'react';
import { useServices } from '@/hooks/useServices';
import { useDashboardStore } from '@/stores/dashboardStore';
import { Button } from '@/components/ui/Button';
import { logger } from '@/utils/logger';

export interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = '',
  showDetails = false,
  compact = false,
}) => {
  const { status, triggerSync, reconnectWebSocket } = useServices();
  const { conflictedDashboards, resolveConflict } = useDashboardStore();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  /**
   * Handle manual sync trigger
   */
  const handleManualSync = async (): Promise<void> => {
    if (isManualSyncing) return;

    setIsManualSyncing(true);
    try {
      const result = await triggerSync();
      if (result.success) {
        logger.info('Manual sync completed successfully');
      } else {
        logger.error('Manual sync failed:', { error: result.error });
      }
    } catch (error) {
      logger.error('Manual sync error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  /**
   * Handle WebSocket reconnection
   */
  const handleReconnect = async (): Promise<void> => {
    try {
      await reconnectWebSocket();
      logger.info('WebSocket reconnected successfully');
    } catch (error) {
      logger.error('WebSocket reconnection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Handle conflict resolution
   */
  const handleResolveConflict = async (
    dashboardId: string,
    strategy: 'local' | 'server' | 'merge'
  ): Promise<void> => {
    try {
      await resolveConflict(dashboardId, strategy);
      logger.info('Conflict resolved:', { dashboardId, strategy });
    } catch (error) {
      logger.error('Conflict resolution failed:', {
        dashboardId,
        strategy,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Determine overall sync status
  const getSyncStatus = (): {
    status: 'connected' | 'syncing' | 'offline' | 'error' | 'conflicts';
    message: string;
  } => {
    if (conflictedDashboards.length > 0) {
      return {
        status: 'conflicts',
        message: `${conflictedDashboards.length} conflicts`,
      };
    }

    if (status.offlineSync.hasConflicts || status.dashboardSync.hasConflicts) {
      return { status: 'conflicts', message: 'Sync conflicts detected' };
    }

    if (status.webSocket.error) {
      return { status: 'error', message: 'Connection error' };
    }

    if (
      status.offlineSync.isSyncing ||
      status.dashboardSync.isSyncing ||
      isManualSyncing
    ) {
      return { status: 'syncing', message: 'Syncing...' };
    }

    if (!status.offlineSync.isOnline) {
      return { status: 'offline', message: 'Offline' };
    }

    if (status.webSocket.connected && status.dashboardSync.isConnected) {
      const userCount = status.dashboardSync.connectedUsers.length;
      return {
        status: 'connected',
        message: userCount > 0 ? `Connected (${userCount} users)` : 'Connected',
      };
    }

    return { status: 'offline', message: 'Disconnected' };
  };

  const syncStatus = getSyncStatus();

  // Status indicator colors
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'syncing':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'offline':
        return 'text-gray-600 dark:text-gray-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'conflicts':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Status indicator icon
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'syncing':
        return '🟡';
      case 'offline':
        return '⚫';
      case 'error':
        return '🔴';
      case 'conflicts':
        return '🟠';
      default:
        return '⚫';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm" title={syncStatus.message}>
          {getStatusIcon(syncStatus.status)}
        </span>
        {conflictedDashboards.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={(): void => setShowConflictDialog(true)}
            className="text-xs"
          >
            Resolve
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Sync Status
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${getStatusColor(syncStatus.status)}`}>
            {getStatusIcon(syncStatus.status)} {syncStatus.message}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex justify-between">
            <span>WebSocket:</span>
            <span
              className={
                status.webSocket.connected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {status.webSocket.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Online:</span>
            <span
              className={
                status.offlineSync.isOnline
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-orange-600 dark:text-orange-400'
              }
            >
              {status.offlineSync.isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          {status.offlineSync.hasPendingChanges && (
            <div className="text-yellow-600 dark:text-yellow-400">
              Pending changes: {status.offlineSync.hasPendingChanges}
            </div>
          )}
          {status.dashboardSync.connectedUsers.length > 0 && (
            <div className="text-blue-600 dark:text-blue-400">
              Connected users: {status.dashboardSync.connectedUsers.length}
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualSync}
          disabled={isManualSyncing || !status.offlineSync.isOnline}
          className="text-xs"
        >
          {isManualSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>

        {!status.webSocket.connected && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReconnect}
            className="text-xs"
          >
            Reconnect
          </Button>
        )}

        {conflictedDashboards.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={(): void => setShowConflictDialog(true)}
            className="text-xs text-orange-600 dark:text-orange-400"
          >
            Resolve Conflicts ({conflictedDashboards.length})
          </Button>
        )}
      </div>

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && conflictedDashboards.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Resolve Sync Conflicts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {conflictedDashboards.length} dashboard(s) have sync conflicts.
              Choose how to resolve them:
            </p>

            <div className="space-y-3">
              {conflictedDashboards.map(dashboardId => (
                <div
                  key={dashboardId}
                  className="border border-gray-200 dark:border-gray-700 rounded p-3"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Dashboard: {dashboardId}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(): Promise<void> =>
                        handleResolveConflict(dashboardId, 'server')
                      }
                      className="text-xs"
                    >
                      Use Server
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(): Promise<void> =>
                        handleResolveConflict(dashboardId, 'local')
                      }
                      className="text-xs"
                    >
                      Use Local
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(): Promise<void> =>
                        handleResolveConflict(dashboardId, 'merge')
                      }
                      className="text-xs"
                    >
                      Merge
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={(): void => setShowConflictDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
