/**
 * Service Initialization Hook
 * Initializes and manages core application services
 */

import { useEffect, useCallback, useRef } from 'react';
import { webSocketService } from '@/services/webSocketService';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useDashboardSync } from '@/hooks/useDashboardSync';
import { logger } from '@/utils/logger';

export interface ServiceInitializationOptions {
  enableWebSocket?: boolean;
  enableOfflineSync?: boolean;
  enableDashboardSync?: boolean;
  webSocketUrl?: string;
  autoConnect?: boolean;
}

export interface ServiceStatus {
  webSocket: {
    enabled: boolean;
    connected: boolean;
    error?: string;
  };
  offlineSync: {
    enabled: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    hasPendingChanges: boolean;
    hasConflicts: boolean;
  };
  dashboardSync: {
    enabled: boolean;
    isConnected: boolean;
    isSyncing: boolean;
    hasConflicts: boolean;
    connectedUsers: string[];
  };
}

export function useServiceInitialization(
  options: ServiceInitializationOptions = {}
): {
  status: ServiceStatus;
  reconnectWebSocket: () => Promise<void>;
  triggerSync: () => Promise<{ success: boolean; error?: string }>;
  isInitialized: boolean;
} {
  const {
    enableWebSocket = true,
    enableOfflineSync = true,
    enableDashboardSync = true,
    webSocketUrl,
    autoConnect = true,
  } = options;

  const { activeDashboard } = useDashboardStore();
  const initializationRef = useRef(false);
  const webSocketErrorRef = useRef<string | undefined>(undefined);

  // Initialize offline sync with delay to avoid SSR issues
  const offlineSync = useOfflineSync({
    autoSync: enableOfflineSync,
    syncInterval: 30000, // 30 seconds
    retryDelay: 5000, // 5 seconds
    maxRetries: 3,
  });

  // Initialize dashboard sync
  const dashboardSync = useDashboardSync({
    dashboardId: activeDashboard?.id,
    userId: 'default-user', // TODO: Get from user store
    autoSync: enableDashboardSync,
    conflictResolution: 'server',
  });

  /**
   * Initialize WebSocket service
   */
  const initializeWebSocket = useCallback(async () => {
    if (!enableWebSocket) {
      logger.info('WebSocket service disabled');
      return;
    }

    try {
      logger.info('Initializing WebSocket service');

      // Set up event handlers
      webSocketService.setEventHandlers({
        onConnectionError: (error: Error) => {
          webSocketErrorRef.current = error.message;
          logger.error('WebSocket connection error:', { error: error.message });
        },
        onReconnect: () => {
          webSocketErrorRef.current = undefined;
          logger.info('WebSocket reconnected successfully');
        },
        onDisconnect: () => {
          logger.info('WebSocket disconnected');
        },
      });

      // Connect to WebSocket server
      if (autoConnect) {
        await webSocketService.connect(webSocketUrl);
        logger.info('WebSocket service initialized successfully');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      webSocketErrorRef.current = errorMessage;
      logger.error('Failed to initialize WebSocket service:', {
        error: errorMessage,
      });
    }
  }, [enableWebSocket, webSocketUrl, autoConnect]);

  /**
   * Initialize all services
   */
  const initializeServices = useCallback(async () => {
    if (initializationRef.current) {
      return;
    }

    initializationRef.current = true;
    logger.info('Initializing application services', {
      enableWebSocket,
      enableOfflineSync,
      enableDashboardSync,
    });

    try {
      // Initialize WebSocket service
      await initializeWebSocket();

      // Start offline sync if enabled
      if (enableOfflineSync) {
        offlineSync.startAutoSync();
        logger.info('Offline sync service initialized');
      }

      logger.info('All services initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Service initialization failed:', { error: errorMessage });
    }
  }, [
    enableWebSocket,
    enableOfflineSync,
    enableDashboardSync,
    initializeWebSocket,
    offlineSync,
  ]);

  /**
   * Cleanup services
   */
  const cleanupServices = useCallback(() => {
    logger.info('Cleaning up application services');

    try {
      // Cleanup WebSocket
      if (enableWebSocket) {
        webSocketService.removeEventHandlers();
        webSocketService.disconnect();
      }

      // Stop offline sync
      if (enableOfflineSync) {
        offlineSync.stopAutoSync();
      }

      initializationRef.current = false;
      logger.info('Services cleaned up successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Service cleanup failed:', { error: errorMessage });
    }
  }, [enableWebSocket, enableOfflineSync, offlineSync]);

  /**
   * Reconnect WebSocket
   */
  const reconnectWebSocket = useCallback(async () => {
    if (!enableWebSocket) {
      return;
    }

    try {
      logger.info('Reconnecting WebSocket service');
      await webSocketService.reconnect();
      webSocketErrorRef.current = undefined;
      logger.info('WebSocket reconnected successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      webSocketErrorRef.current = errorMessage;
      logger.error('WebSocket reconnection failed:', { error: errorMessage });
    }
  }, [enableWebSocket]);

  /**
   * Trigger manual sync
   */
  const triggerSync = useCallback(async () => {
    if (!enableOfflineSync) {
      return { success: false, error: 'Offline sync disabled' };
    }

    try {
      logger.info('Triggering manual sync');
      const result = await offlineSync.triggerSync();
      logger.info('Manual sync completed:', { success: result.success });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Manual sync failed:', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [enableOfflineSync, offlineSync]);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();
    return cleanupServices;
  }, [initializeServices, cleanupServices]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = (): void => {
      logger.info('Device came online, reconnecting services');
      if (enableWebSocket && !webSocketService.isConnected()) {
        reconnectWebSocket();
      }
    };

    const handleOffline = (): void => {
      logger.info('Device went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return (): void => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableWebSocket, reconnectWebSocket]);

  // Build status object
  const status: ServiceStatus = {
    webSocket: {
      enabled: enableWebSocket,
      connected: webSocketService.isConnected(),
      error: webSocketErrorRef.current,
    },
    offlineSync: {
      enabled: enableOfflineSync,
      isOnline: offlineSync.isOnline,
      isSyncing: offlineSync.isSyncing,
      hasPendingChanges: offlineSync.hasPendingChanges,
      hasConflicts: offlineSync.hasConflicts,
    },
    dashboardSync: {
      enabled: enableDashboardSync,
      isConnected: dashboardSync.isConnected,
      isSyncing: dashboardSync.isSyncing,
      hasConflicts: dashboardSync.hasConflicts,
      connectedUsers: dashboardSync.connectedUsers,
    },
  };

  return {
    status,
    reconnectWebSocket,
    triggerSync,
    isInitialized: initializationRef.current,
  };
}
