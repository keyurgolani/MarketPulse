/**
 * Service Provider Component
 * Initializes and manages core application services
 */

import React, { useEffect, useState } from 'react';
import {
  useServiceInitialization,
  type ServiceStatus,
} from '@/hooks/useServiceInitialization';
import {
  ServiceContext,
  type ServiceContextValue,
} from '@/contexts/ServiceContext';
import { logger } from '@/utils/logger';

export interface ServiceProviderProps {
  children: React.ReactNode;
  enableWebSocket?: boolean;
  enableOfflineSync?: boolean;
  enableDashboardSync?: boolean;
  webSocketUrl?: string;
  autoConnect?: boolean;
  showStatus?: boolean;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  enableWebSocket = true,
  enableOfflineSync = true,
  enableDashboardSync = true,
  webSocketUrl,
  autoConnect = true,
  showStatus = false,
}) => {
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  const serviceInit = useServiceInitialization({
    enableWebSocket,
    enableOfflineSync,
    enableDashboardSync,
    webSocketUrl,
    autoConnect,
  });

  // Monitor service status for errors
  useEffect(() => {
    const { status } = serviceInit;

    // Check for WebSocket errors
    if (status.webSocket.enabled && status.webSocket.error) {
      setInitializationError(`WebSocket Error: ${status.webSocket.error}`);
    } else {
      setInitializationError(null);
    }

    // Log service status changes
    logger.debug('Service status updated', {
      webSocket: status.webSocket,
      offlineSync: {
        enabled: status.offlineSync.enabled,
        isOnline: status.offlineSync.isOnline,
        isSyncing: status.offlineSync.isSyncing,
        hasPendingChanges: status.offlineSync.hasPendingChanges,
        hasConflicts: status.offlineSync.hasConflicts,
      },
      dashboardSync: {
        enabled: status.dashboardSync.enabled,
        isConnected: status.dashboardSync.isConnected,
        isSyncing: status.dashboardSync.isSyncing,
        hasConflicts: status.dashboardSync.hasConflicts,
        connectedUsers: status.dashboardSync.connectedUsers.length,
      },
    });
  }, [serviceInit]);

  const contextValue: ServiceContextValue = {
    status: serviceInit.status,
    reconnectWebSocket: serviceInit.reconnectWebSocket,
    triggerSync: serviceInit.triggerSync,
    isInitialized: serviceInit.isInitialized,
  };

  return (
    <ServiceContext.Provider value={contextValue}>
      {showStatus && (
        <ServiceStatusIndicator
          status={serviceInit.status}
          error={initializationError}
        />
      )}
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Service Status Indicator Component
 * Shows the current status of all services
 */
interface ServiceStatusIndicatorProps {
  status: ServiceStatus;
  error: string | null;
}

const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({
  status,
  error,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide after 5 seconds if no errors
  useEffect(() => {
    if (
      !error &&
      !status.offlineSync.hasConflicts &&
      !status.dashboardSync.hasConflicts
    ) {
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [
    error,
    status.offlineSync.hasConflicts,
    status.dashboardSync.hasConflicts,
  ]);

  if (
    !isVisible &&
    !error &&
    !status.offlineSync.hasConflicts &&
    !status.dashboardSync.hasConflicts
  ) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Service Status
          </h3>
          <button
            onClick={(): void => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close status indicator"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2 text-xs">
          {/* WebSocket Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">WebSocket:</span>
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  status.webSocket.enabled
                    ? status.webSocket.connected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-gray-900 dark:text-white">
                {status.webSocket.enabled
                  ? status.webSocket.connected
                    ? 'Connected'
                    : 'Disconnected'
                  : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Offline Sync Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Sync:</span>
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  status.offlineSync.enabled
                    ? status.offlineSync.isOnline
                      ? status.offlineSync.isSyncing
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-orange-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-gray-900 dark:text-white">
                {status.offlineSync.enabled
                  ? status.offlineSync.isSyncing
                    ? 'Syncing'
                    : status.offlineSync.isOnline
                      ? 'Online'
                      : 'Offline'
                  : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Dashboard Sync Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Dashboard:</span>
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  status.dashboardSync.enabled
                    ? status.dashboardSync.isConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-gray-900 dark:text-white">
                {status.dashboardSync.enabled
                  ? status.dashboardSync.isConnected
                    ? `Connected (${status.dashboardSync.connectedUsers.length})`
                    : 'Disconnected'
                  : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Pending Changes */}
          {status.offlineSync.hasPendingChanges && (
            <div className="text-yellow-600 dark:text-yellow-400">
              ⚠️ Pending changes to sync
            </div>
          )}

          {/* Conflicts */}
          {(status.offlineSync.hasConflicts ||
            status.dashboardSync.hasConflicts) && (
            <div className="text-red-600 dark:text-red-400">
              ⚠️ Sync conflicts detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceProvider;
