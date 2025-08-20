import { useEffect, useRef, useCallback, useState } from 'react';
import { webSocketService } from '../services/webSocketService';
import type {
  DashboardChangeEvent,
  UserPresence,
  WebSocketEventHandlers,
  UserActivityEvent,
  WidgetEditingEvent,
  CursorPositionEvent,
} from '../services/webSocketService';
import { logger } from '../utils/logger';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  serverUrl?: string;
  onDashboardChanged?: (event: DashboardChangeEvent) => void;
  onUserJoined?: (data: {
    userId: string;
    dashboardId: string;
    timestamp: number;
  }) => void;
  onUserLeft?: (data: {
    userId: string;
    dashboardId: string;
    timestamp: number;
  }) => void;
  onUserPresenceUpdated?: (data: {
    userId: string;
    dashboardId: string;
    lastSeen: number;
  }) => void;
  onUserDisconnected?: (data: {
    userId: string;
    dashboardId: string;
    timestamp: number;
  }) => void;
  onRoomUsers?: (users: UserPresence[]) => void;
  onUserActivity?: (event: UserActivityEvent) => void;
  onWidgetEditing?: (event: WidgetEditingEvent) => void;
  onCursorPosition?: (event: CursorPositionEvent) => void;
  onConnectionError?: (error: Error) => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  currentDashboardId: string | null;
  currentUserId: string | null;
  roomUsers: UserPresence[];
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  joinDashboard: (dashboardId: string, userId: string) => void;
  leaveDashboard: () => void;
  broadcastDashboardChange: (change: DashboardChangeEvent) => void;
  broadcastUserActivity: (
    action: UserActivityEvent['action'],
    widgetId?: string
  ) => void;
  broadcastWidgetEditing: (
    widgetId: string,
    action: WidgetEditingEvent['action']
  ) => void;
  broadcastCursorPosition: (
    position: { x: number; y: number },
    widgetId?: string
  ) => void;
  updatePresence: () => void;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    serverUrl,
    onDashboardChanged,
    onUserJoined,
    onUserLeft,
    onUserPresenceUpdated,
    onUserDisconnected,
    onRoomUsers,
    onUserActivity,
    onWidgetEditing,
    onCursorPosition,
    onConnectionError,
    onReconnect,
    onDisconnect,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [roomUsers, setRoomUsers] = useState<UserPresence[]>([]);

  const handlersRef = useRef<WebSocketEventHandlers>({});
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update handlers ref when options change
  useEffect(() => {
    handlersRef.current = {
      onDashboardChanged: (event: DashboardChangeEvent): void => {
        logger.info('Dashboard changed via WebSocket:', { event });
        onDashboardChanged?.(event);
      },
      onUserJoined: (data): void => {
        logger.info('User joined via WebSocket:', data);
        onUserJoined?.(data);
      },
      onUserLeft: (data): void => {
        logger.info('User left via WebSocket:', data);
        onUserLeft?.(data);
      },
      onUserPresenceUpdated: (data): void => {
        onUserPresenceUpdated?.(data);
      },
      onUserDisconnected: (data): void => {
        logger.info('User disconnected via WebSocket:', data);
        onUserDisconnected?.(data);
      },
      onRoomUsers: (users: UserPresence[]): void => {
        logger.info('Room users updated via WebSocket:', { users });
        setRoomUsers(users);
        onRoomUsers?.(users);
      },
      onUserActivity: (event: UserActivityEvent): void => {
        logger.info('User activity received via WebSocket:', { event });
        onUserActivity?.(event);
      },
      onWidgetEditing: (event: WidgetEditingEvent): void => {
        logger.info('Widget editing event received via WebSocket:', { event });
        onWidgetEditing?.(event);
      },
      onCursorPosition: (event: CursorPositionEvent): void => {
        // Don't log cursor events as they're high-frequency
        onCursorPosition?.(event);
      },
      onConnectionError: (err: Error): void => {
        logger.error('WebSocket connection error:', { error: err.message });
        setError(err);
        setIsConnected(false);
        setIsConnecting(false);
        onConnectionError?.(err);
      },
      onReconnect: (): void => {
        logger.info('WebSocket reconnected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        onReconnect?.();
      },
      onDisconnect: (): void => {
        logger.info('WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        setRoomUsers([]);
        onDisconnect?.();
      },
    };

    webSocketService.setEventHandlers(handlersRef.current);
  }, [
    onDashboardChanged,
    onUserJoined,
    onUserLeft,
    onUserPresenceUpdated,
    onUserDisconnected,
    onRoomUsers,
    onUserActivity,
    onWidgetEditing,
    onCursorPosition,
    onConnectionError,
    onReconnect,
    onDisconnect,
  ]);

  // Connection management
  const connect = useCallback(async (): Promise<void> => {
    if (isConnecting || isConnected) return;

    try {
      setIsConnecting(true);
      setError(null);
      await webSocketService.connect(serverUrl);
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      setIsConnected(false);
      setIsConnecting(false);
      throw error;
    }
  }, [serverUrl, isConnecting, isConnected]);

  const disconnect = useCallback((): void => {
    webSocketService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setRoomUsers([]);
    setError(null);

    // Clear presence interval
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  }, []);

  const reconnect = useCallback(async (): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);
      await webSocketService.reconnect();
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Reconnection failed');
      setError(error);
      setIsConnected(false);
      setIsConnecting(false);
      throw error;
    }
  }, []);

  // Dashboard management
  const joinDashboard = useCallback(
    (dashboardId: string, userId: string): void => {
      webSocketService.joinDashboard(dashboardId, userId);

      // Start presence updates
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      presenceIntervalRef.current = setInterval((): void => {
        webSocketService.updatePresence();
      }, 30000); // Update presence every 30 seconds
    },
    []
  );

  const leaveDashboard = useCallback((): void => {
    webSocketService.leaveDashboard();
    setRoomUsers([]);

    // Clear presence interval
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  }, []);

  // Broadcasting
  const broadcastDashboardChange = useCallback(
    (change: DashboardChangeEvent): void => {
      webSocketService.broadcastDashboardChange(change);
    },
    []
  );

  const updatePresence = useCallback((): void => {
    webSocketService.updatePresence();
  }, []);

  // Collaborative editing methods
  const broadcastUserActivity = useCallback(
    (action: UserActivityEvent['action'], widgetId?: string): void => {
      webSocketService.broadcastUserActivity(action, widgetId);
    },
    []
  );

  const broadcastWidgetEditing = useCallback(
    (widgetId: string, action: WidgetEditingEvent['action']): void => {
      webSocketService.broadcastWidgetEditing(widgetId, action);
    },
    []
  );

  const broadcastCursorPosition = useCallback(
    (position: { x: number; y: number }, widgetId?: string): void => {
      webSocketService.broadcastCursorPosition(position, widgetId);
    },
    []
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect().catch((err): void => {
        logger.error('Auto-connect failed:', err);
      });
    }

    return (): void => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [autoConnect, connect]);

  // Update connection status based on service state
  useEffect(() => {
    const checkConnection = (): void => {
      const connected = webSocketService.isConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
      }
    };

    const interval = setInterval(checkConnection, 1000);
    return (): void => clearInterval(interval);
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      webSocketService.removeEventHandlers();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    currentDashboardId: webSocketService.getCurrentDashboardId(),
    currentUserId: webSocketService.getCurrentUserId(),
    roomUsers,
    connect,
    disconnect,
    reconnect,
    joinDashboard,
    leaveDashboard,
    broadcastDashboardChange,
    broadcastUserActivity,
    broadcastWidgetEditing,
    broadcastCursorPosition,
    updatePresence,
  };
}
