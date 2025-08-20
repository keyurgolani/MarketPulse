import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useDashboardStore } from '../stores/dashboardStore';
import type { DashboardChangeEvent } from '../services/webSocketService';
import { logger } from '../utils/logger';

export interface UseDashboardSyncOptions {
  dashboardId?: string;
  userId?: string;
  autoSync?: boolean;
  conflictResolution?: 'client' | 'server' | 'manual';
}

export interface UseDashboardSyncReturn {
  isConnected: boolean;
  isSyncing: boolean;
  hasConflicts: boolean;
  lastSyncTime: number | null;
  connectedUsers: string[];
  syncDashboard: (dashboardId: string) => void;
  resolveConflict: (resolution: 'client' | 'server') => void;
  broadcastChange: (type: DashboardChangeEvent['type'], data?: unknown) => void;
}

export function useDashboardSync(
  options: UseDashboardSyncOptions = {}
): UseDashboardSyncReturn {
  const {
    dashboardId,
    userId = 'default-user',
    autoSync = true,
    conflictResolution = 'server',
  } = options;

  const {
    dashboards,
    activeDashboard,
    setActiveDashboard,
    updateDashboard,
    deleteDashboard,
    refreshDashboards,
  } = useDashboardStore();

  const lastSyncTimeRef = useRef<number | null>(null);
  const conflictRef = useRef<boolean>(false);
  const syncingRef = useRef<boolean>(false);
  const connectedUsersRef = useRef<string[]>([]);

  // Handle dashboard changes from WebSocket
  const handleDashboardChanged = useCallback(
    (event: DashboardChangeEvent) => {
      logger.info('Received dashboard change:', { event });

      // Ignore changes from the current user to avoid loops
      if (event.userId === userId) {
        return;
      }

      syncingRef.current = true;

      try {
        switch (event.type) {
          case 'dashboard_updated':
            if (event.data && typeof event.data === 'object') {
              // Check for conflicts
              const currentDashboard = dashboards.find(
                d => d.id === event.dashboardId
              );
              if (currentDashboard && currentDashboard.updatedAt) {
                const currentTime = new Date(
                  currentDashboard.updatedAt
                ).getTime();
                const remoteTime = event.timestamp;

                if (
                  currentTime > remoteTime &&
                  conflictResolution === 'manual'
                ) {
                  conflictRef.current = true;
                  logger.warn('Dashboard conflict detected:', {
                    dashboardId: event.dashboardId,
                    currentTime,
                    remoteTime,
                  });
                  return;
                }
              }

              // Apply the update based on conflict resolution strategy
              if (conflictResolution === 'server' || !currentDashboard) {
                updateDashboard(event.dashboardId, event.data);
                logger.info('Applied server dashboard update:', {
                  dashboardId: event.dashboardId,
                });
              }
            }
            break;

          case 'dashboard_created':
            // Refresh dashboards to include the new one
            refreshDashboards();
            logger.info('Dashboard created remotely, refreshing list');
            break;

          case 'dashboard_deleted':
            deleteDashboard(event.dashboardId);

            // If the deleted dashboard was active, switch to another one
            if (activeDashboard?.id === event.dashboardId) {
              const remainingDashboards = dashboards.filter(
                d => d.id !== event.dashboardId
              );
              if (remainingDashboards.length > 0) {
                setActiveDashboard(remainingDashboards[0].id);
              }
            }
            logger.info('Dashboard deleted remotely:', {
              dashboardId: event.dashboardId,
            });
            break;

          default:
            logger.warn('Unknown dashboard change type:', { type: event.type });
        }

        lastSyncTimeRef.current = Date.now();
      } catch (error) {
        logger.error('Error handling dashboard change:', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        syncingRef.current = false;
      }
    },
    [
      userId,
      dashboards,
      activeDashboard,
      updateDashboard,
      deleteDashboard,
      refreshDashboards,
      setActiveDashboard,
      conflictResolution,
    ]
  );

  // Handle user presence updates
  const handleUserJoined = useCallback(
    (data: { userId: string; dashboardId: string; timestamp: number }) => {
      if (data.dashboardId === dashboardId && data.userId !== userId) {
        connectedUsersRef.current = [...connectedUsersRef.current, data.userId];
        logger.info('User joined dashboard:', data);
      }
    },
    [dashboardId, userId]
  );

  const handleUserLeft = useCallback(
    (data: { userId: string; dashboardId: string; timestamp: number }) => {
      if (data.dashboardId === dashboardId) {
        connectedUsersRef.current = connectedUsersRef.current.filter(
          id => id !== data.userId
        );
        logger.info('User left dashboard:', data);
      }
    },
    [dashboardId]
  );

  const handleRoomUsers = useCallback(
    (users: Array<{ userId: string; dashboardId: string }>) => {
      const currentDashboardUsers = users
        .filter(
          user => user.dashboardId === dashboardId && user.userId !== userId
        )
        .map(user => user.userId);

      connectedUsersRef.current = currentDashboardUsers;
      logger.info('Room users updated:', { users: currentDashboardUsers });
    },
    [dashboardId, userId]
  );

  // Initialize WebSocket connection
  const {
    isConnected,
    joinDashboard,
    leaveDashboard,
    broadcastDashboardChange,
  } = useWebSocket({
    autoConnect: autoSync,
    onDashboardChanged: handleDashboardChanged,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onRoomUsers: handleRoomUsers,
    onConnectionError: error => {
      logger.error('WebSocket connection error in dashboard sync:', {
        error: error.message,
      });
    },
    onReconnect: () => {
      logger.info('WebSocket reconnected, rejoining dashboard');
      if (dashboardId) {
        joinDashboard(dashboardId, userId);
      }
    },
  });

  // Join/leave dashboard rooms when dashboardId changes
  useEffect(() => {
    if (isConnected && dashboardId && autoSync) {
      joinDashboard(dashboardId, userId);
      logger.info('Joined dashboard room:', { dashboardId, userId });

      return (): void => {
        leaveDashboard();
        connectedUsersRef.current = [];
      };
    }
    return undefined;
  }, [
    isConnected,
    dashboardId,
    userId,
    autoSync,
    joinDashboard,
    leaveDashboard,
  ]);

  // Sync specific dashboard
  const syncDashboard = useCallback(
    (targetDashboardId: string) => {
      if (isConnected) {
        joinDashboard(targetDashboardId, userId);
        logger.info('Manually syncing dashboard:', {
          dashboardId: targetDashboardId,
        });
      }
    },
    [isConnected, joinDashboard, userId]
  );

  // Resolve conflicts
  const resolveConflict = useCallback(
    (resolution: 'client' | 'server') => {
      if (conflictRef.current && dashboardId) {
        if (resolution === 'client') {
          // Broadcast local changes to override server
          const currentDashboard = dashboards.find(d => d.id === dashboardId);
          if (currentDashboard) {
            broadcastDashboardChange({
              type: 'dashboard_updated',
              dashboardId,
              userId,
              data: currentDashboard,
              timestamp: Date.now(),
            });
          }
        } else {
          // Refresh from server to get latest
          refreshDashboards();
        }

        conflictRef.current = false;
        logger.info('Conflict resolved:', { dashboardId, resolution });
      }
    },
    [
      dashboardId,
      dashboards,
      userId,
      broadcastDashboardChange,
      refreshDashboards,
    ]
  );

  // Broadcast changes
  const broadcastChange = useCallback(
    (type: DashboardChangeEvent['type'], data?: unknown) => {
      if (isConnected && dashboardId) {
        broadcastDashboardChange({
          type,
          dashboardId,
          userId,
          data,
          timestamp: Date.now(),
        });
        logger.info('Broadcasting dashboard change:', { type, dashboardId });
      }
    },
    [isConnected, dashboardId, userId, broadcastDashboardChange]
  );

  return {
    isConnected,
    isSyncing: syncingRef.current,
    hasConflicts: conflictRef.current,
    lastSyncTime: lastSyncTimeRef.current,
    connectedUsers: connectedUsersRef.current,
    syncDashboard,
    resolveConflict,
    broadcastChange,
  };
}
