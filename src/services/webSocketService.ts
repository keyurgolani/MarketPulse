import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

export interface DashboardChangeEvent {
  type:
    | 'dashboard_updated'
    | 'dashboard_created'
    | 'dashboard_deleted'
    | 'user_activity'
    | 'widget_editing'
    | 'cursor_position';
  dashboardId: string;
  userId: string;
  data?: unknown;
  timestamp: number;
}

export interface UserActivityEvent {
  type: 'user_activity';
  userId: string;
  dashboardId: string;
  action: 'editing' | 'viewing' | 'configuring';
  widgetId?: string;
  timestamp: number;
}

export interface WidgetEditingEvent {
  type: 'widget_editing';
  userId: string;
  dashboardId: string;
  widgetId: string;
  action: 'start' | 'end' | 'update';
  timestamp: number;
}

export interface CursorPositionEvent {
  type: 'cursor_position';
  userId: string;
  dashboardId: string;
  widgetId?: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  dashboardId: string;
  socketId: string;
  lastSeen: number;
}

export interface WebSocketEventHandlers {
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

export class WebSocketService {
  private socket: Socket | null = null;
  private currentDashboardId: string | null = null;
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: WebSocketEventHandlers = {};
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupEventHandlers = this.setupEventHandlers.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
  }

  /**
   * Initialize WebSocket connection
   */
  async connect(serverUrl?: string): Promise<void> {
    // Skip connection in test environment
    if (
      import.meta.env.MODE === 'test' ||
      process.env.NODE_ENV === 'test' ||
      import.meta.env.VITEST
    ) {
      logger.info('Skipping WebSocket connection in test environment');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.establishConnection(serverUrl);

    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async establishConnection(serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url =
        serverUrl || import.meta.env.VITE_WS_URL || 'http://localhost:3001';

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        logger.info('WebSocket connected', { socketId: this.socket?.id });
        this.reconnectAttempts = 0;

        // Rejoin current dashboard if we were in one
        if (this.currentDashboardId && this.currentUserId) {
          this.joinDashboard(this.currentDashboardId, this.currentUserId);
        }

        this.eventHandlers.onReconnect?.();
        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        logger.error('WebSocket connection error:', { error: error.message });
        this.eventHandlers.onConnectionError?.(error);

        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason: string) => {
        logger.info('WebSocket disconnected:', { reason });
        this.eventHandlers.onDisconnect?.();
      });

      this.setupEventHandlers();
    });
  }

  /**
   * Set up event handlers for WebSocket events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('dashboard_changed', (event: DashboardChangeEvent) => {
      logger.info('Dashboard change received:', { event });
      this.eventHandlers.onDashboardChanged?.(event);
    });

    this.socket.on(
      'user_joined',
      (data: { userId: string; dashboardId: string; timestamp: number }) => {
        logger.info('User joined dashboard:', data);
        this.eventHandlers.onUserJoined?.(data);
      }
    );

    this.socket.on(
      'user_left',
      (data: { userId: string; dashboardId: string; timestamp: number }) => {
        logger.info('User left dashboard:', data);
        this.eventHandlers.onUserLeft?.(data);
      }
    );

    this.socket.on(
      'user_presence_updated',
      (data: { userId: string; dashboardId: string; lastSeen: number }) => {
        this.eventHandlers.onUserPresenceUpdated?.(data);
      }
    );

    this.socket.on(
      'user_disconnected',
      (data: { userId: string; dashboardId: string; timestamp: number }) => {
        logger.info('User disconnected:', data);
        this.eventHandlers.onUserDisconnected?.(data);
      }
    );

    this.socket.on('room_users', (users: UserPresence[]) => {
      logger.info('Room users received:', { users });
      this.eventHandlers.onRoomUsers?.(users);
    });

    this.socket.on('user_activity', (event: UserActivityEvent) => {
      logger.info('User activity received:', { event });
      this.eventHandlers.onUserActivity?.(event);
    });

    this.socket.on('widget_editing', (event: WidgetEditingEvent) => {
      logger.info('Widget editing event received:', { event });
      this.eventHandlers.onWidgetEditing?.(event);
    });

    this.socket.on('cursor_position', (event: CursorPositionEvent) => {
      // Don't log cursor events as they're high-frequency
      this.eventHandlers.onCursorPosition?.(event);
    });

    this.socket.on('reconnect', () => {
      this.handleReconnect();
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    logger.info('WebSocket reconnected');

    // Rejoin current dashboard if we were in one
    if (this.currentDashboardId && this.currentUserId) {
      this.joinDashboard(this.currentDashboardId, this.currentUserId);
    }

    this.eventHandlers.onReconnect?.();
  }

  /**
   * Join a dashboard room
   */
  joinDashboard(dashboardId: string, userId: string): void {
    // Leave current dashboard if different
    if (this.currentDashboardId && this.currentDashboardId !== dashboardId) {
      this.leaveDashboard();
    }

    // Always update state, even if not connected (for testing and state tracking)
    this.currentDashboardId = dashboardId;
    this.currentUserId = userId;

    if (!this.socket?.connected) {
      logger.warn('Cannot join dashboard: WebSocket not connected');
      return;
    }

    this.socket.emit('join_dashboard', { dashboardId, userId });
    logger.info('Joined dashboard room:', { dashboardId, userId });
  }

  /**
   * Leave current dashboard room
   */
  leaveDashboard(): void {
    if (this.socket?.connected && this.currentDashboardId) {
      this.socket.emit('leave_dashboard', {
        dashboardId: this.currentDashboardId,
      });
      logger.info('Left dashboard room:', {
        dashboardId: this.currentDashboardId,
      });
    }

    // Always clear state, even if not connected
    this.currentDashboardId = null;
    this.currentUserId = null;
  }

  /**
   * Broadcast a dashboard change
   */
  broadcastDashboardChange(change: DashboardChangeEvent): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot broadcast change: WebSocket not connected');
      return;
    }

    this.socket.emit('dashboard_change', change);
    logger.info('Dashboard change broadcasted:', { change });
  }

  /**
   * Update user presence
   */
  updatePresence(): void {
    if (
      !this.socket?.connected ||
      !this.currentDashboardId ||
      !this.currentUserId
    ) {
      return;
    }

    this.socket.emit('user_presence', {
      userId: this.currentUserId,
      dashboardId: this.currentDashboardId,
    });
  }

  /**
   * Broadcast user activity
   */
  broadcastUserActivity(
    action: UserActivityEvent['action'],
    widgetId?: string
  ): void {
    if (
      !this.socket?.connected ||
      !this.currentDashboardId ||
      !this.currentUserId
    ) {
      logger.warn(
        'Cannot broadcast user activity: WebSocket not connected or missing context'
      );
      return;
    }

    const event: UserActivityEvent = {
      type: 'user_activity',
      userId: this.currentUserId,
      dashboardId: this.currentDashboardId,
      action,
      widgetId,
      timestamp: Date.now(),
    };

    this.socket.emit('user_activity', event);
    logger.info('User activity broadcasted:', { event });
  }

  /**
   * Broadcast widget editing event
   */
  broadcastWidgetEditing(
    widgetId: string,
    action: WidgetEditingEvent['action']
  ): void {
    if (
      !this.socket?.connected ||
      !this.currentDashboardId ||
      !this.currentUserId
    ) {
      logger.warn(
        'Cannot broadcast widget editing: WebSocket not connected or missing context'
      );
      return;
    }

    const event: WidgetEditingEvent = {
      type: 'widget_editing',
      userId: this.currentUserId,
      dashboardId: this.currentDashboardId,
      widgetId,
      action,
      timestamp: Date.now(),
    };

    this.socket.emit('widget_editing', event);
    logger.info('Widget editing event broadcasted:', { event });
  }

  /**
   * Broadcast cursor position (throttled)
   */
  broadcastCursorPosition(
    position: { x: number; y: number },
    widgetId?: string
  ): void {
    if (
      !this.socket?.connected ||
      !this.currentDashboardId ||
      !this.currentUserId
    ) {
      return;
    }

    const event: CursorPositionEvent = {
      type: 'cursor_position',
      userId: this.currentUserId,
      dashboardId: this.currentDashboardId,
      widgetId,
      position,
      timestamp: Date.now(),
    };

    this.socket.emit('cursor_position', event);
    // Don't log cursor events as they're high-frequency
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers(): void {
    this.eventHandlers = {};
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current dashboard ID
   */
  getCurrentDashboardId(): string | null {
    return this.currentDashboardId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.leaveDashboard();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentDashboardId = null;
    this.currentUserId = null;
    this.reconnectAttempts = 0;

    logger.info('WebSocket disconnected');
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  /**
   * Destroy service and clean up resources (alias for disconnect)
   */
  destroy(): void {
    this.disconnect();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
