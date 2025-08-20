import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
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

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, UserPresence>();
  private dashboardRooms = new Map<string, Set<string>>(); // dashboardId -> Set of socketIds

  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle user joining a dashboard room
      socket.on(
        'join_dashboard',
        (data: { dashboardId: string; userId: string }) => {
          this.handleJoinDashboard(socket, data);
        }
      );

      // Handle user leaving a dashboard room
      socket.on('leave_dashboard', (data: { dashboardId: string }) => {
        this.handleLeaveDashboard(socket, data);
      });

      // Handle dashboard changes
      socket.on('dashboard_change', (data: DashboardChangeEvent) => {
        this.handleDashboardChange(socket, data);
      });

      // Handle user presence updates
      socket.on(
        'user_presence',
        (data: { userId: string; dashboardId: string }) => {
          this.handleUserPresence(socket, data);
        }
      );

      // Handle user activity events
      socket.on('user_activity', (data: UserActivityEvent) => {
        this.handleUserActivity(socket, data);
      });

      // Handle widget editing events
      socket.on('widget_editing', (data: WidgetEditingEvent) => {
        this.handleWidgetEditing(socket, data);
      });

      // Handle cursor position events
      socket.on('cursor_position', (data: CursorPositionEvent) => {
        this.handleCursorPosition(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', (error: Error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  private handleJoinDashboard(
    socket: Socket,
    data: { dashboardId: string; userId: string }
  ): void {
    const { dashboardId, userId } = data;
    const roomName = `dashboard:${dashboardId}`;

    // Join the dashboard room
    socket.join(roomName);

    // Track user presence
    const presence: UserPresence = {
      userId,
      dashboardId,
      socketId: socket.id,
      lastSeen: Date.now(),
    };
    this.connectedUsers.set(socket.id, presence);

    // Track dashboard room membership
    if (!this.dashboardRooms.has(dashboardId)) {
      this.dashboardRooms.set(dashboardId, new Set());
    }
    this.dashboardRooms.get(dashboardId)!.add(socket.id);

    // Notify other users in the room about the new user
    socket.to(roomName).emit('user_joined', {
      userId,
      dashboardId,
      timestamp: Date.now(),
    });

    // Send current room users to the new user
    const roomUsers = this.getRoomUsers(dashboardId);
    socket.emit('room_users', roomUsers);

    logger.info(`User ${userId} joined dashboard ${dashboardId}`);
  }

  private handleLeaveDashboard(
    socket: Socket,
    data: { dashboardId: string }
  ): void {
    const { dashboardId } = data;
    const roomName = `dashboard:${dashboardId}`;
    const presence = this.connectedUsers.get(socket.id);

    if (presence) {
      // Leave the dashboard room
      socket.leave(roomName);

      // Remove from dashboard room tracking
      const roomSockets = this.dashboardRooms.get(dashboardId);
      if (roomSockets) {
        roomSockets.delete(socket.id);
        if (roomSockets.size === 0) {
          this.dashboardRooms.delete(dashboardId);
        }
      }

      // Notify other users in the room
      socket.to(roomName).emit('user_left', {
        userId: presence.userId,
        dashboardId,
        timestamp: Date.now(),
      });

      logger.info(`User ${presence.userId} left dashboard ${dashboardId}`);
    }
  }

  private handleDashboardChange(
    socket: Socket,
    data: DashboardChangeEvent
  ): void {
    const roomName = `dashboard:${data.dashboardId}`;

    // Broadcast the change to all other users in the room (excluding sender)
    socket.to(roomName).emit('dashboard_changed', {
      ...data,
      timestamp: Date.now(),
    });

    logger.info(
      `Dashboard change broadcasted: ${data.type} for dashboard ${data.dashboardId}`
    );
  }

  private handleUserPresence(
    socket: Socket,
    data: { userId: string; dashboardId: string }
  ): void {
    const presence = this.connectedUsers.get(socket.id);
    if (presence) {
      presence.lastSeen = Date.now();

      // Broadcast presence update to room
      const roomName = `dashboard:${data.dashboardId}`;
      socket.to(roomName).emit('user_presence_updated', {
        userId: data.userId,
        dashboardId: data.dashboardId,
        lastSeen: presence.lastSeen,
      });
    }
  }

  private handleUserActivity(socket: Socket, data: UserActivityEvent): void {
    const roomName = `dashboard:${data.dashboardId}`;

    // Broadcast user activity to all other users in the room
    socket.to(roomName).emit('user_activity', {
      ...data,
      timestamp: Date.now(),
    });

    logger.info(
      `User activity broadcasted: ${data.action} by ${data.userId} on dashboard ${data.dashboardId}`,
      {
        widgetId: data.widgetId,
      }
    );
  }

  private handleWidgetEditing(socket: Socket, data: WidgetEditingEvent): void {
    const roomName = `dashboard:${data.dashboardId}`;

    // Broadcast widget editing event to all other users in the room
    socket.to(roomName).emit('widget_editing', {
      ...data,
      timestamp: Date.now(),
    });

    logger.info(
      `Widget editing event: ${data.action} by ${data.userId} on widget ${data.widgetId}`,
      {
        dashboardId: data.dashboardId,
      }
    );
  }

  private handleCursorPosition(
    socket: Socket,
    data: CursorPositionEvent
  ): void {
    const roomName = `dashboard:${data.dashboardId}`;

    // Broadcast cursor position to all other users in the room (throttled)
    socket.to(roomName).emit('cursor_position', {
      ...data,
      timestamp: Date.now(),
    });

    // Note: Cursor position events are high-frequency, so we don't log them
  }

  private handleDisconnect(socket: Socket): void {
    const presence = this.connectedUsers.get(socket.id);

    if (presence) {
      const roomName = `dashboard:${presence.dashboardId}`;

      // Remove from tracking
      this.connectedUsers.delete(socket.id);

      // Remove from dashboard room tracking
      const roomSockets = this.dashboardRooms.get(presence.dashboardId);
      if (roomSockets) {
        roomSockets.delete(socket.id);
        if (roomSockets.size === 0) {
          this.dashboardRooms.delete(presence.dashboardId);
        }
      }

      // Notify other users in the room
      socket.to(roomName).emit('user_disconnected', {
        userId: presence.userId,
        dashboardId: presence.dashboardId,
        timestamp: Date.now(),
      });

      logger.info(
        `User ${presence.userId} disconnected from dashboard ${presence.dashboardId}`
      );
    }

    logger.info(`Client disconnected: ${socket.id}`);
  }

  private getRoomUsers(dashboardId: string): UserPresence[] {
    const roomSockets = this.dashboardRooms.get(dashboardId);
    if (!roomSockets) return [];

    const users: UserPresence[] = [];
    for (const socketId of roomSockets) {
      const presence = this.connectedUsers.get(socketId);
      if (presence) {
        users.push(presence);
      }
    }
    return users;
  }

  // Public methods for broadcasting changes from API endpoints
  public broadcastDashboardChange(
    dashboardId: string,
    change: DashboardChangeEvent
  ): void {
    if (!this.io) return;

    const roomName = `dashboard:${dashboardId}`;
    this.io.to(roomName).emit('dashboard_changed', {
      ...change,
      timestamp: Date.now(),
    });

    logger.info(
      `Dashboard change broadcasted from API: ${change.type} for dashboard ${dashboardId}`
    );
  }

  public broadcastToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;

    // Find all sockets for the user
    const userSockets = Array.from(this.connectedUsers.entries())
      .filter(([, presence]) => presence.userId === userId)
      .map(([socketId]) => socketId);

    userSockets.forEach(socketId => {
      this.io!.to(socketId).emit(event, data);
    });
  }

  public getConnectedUsers(): UserPresence[] {
    return Array.from(this.connectedUsers.values());
  }

  public getDashboardUsers(dashboardId: string): UserPresence[] {
    return this.getRoomUsers(dashboardId);
  }

  public isUserConnected(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).some(
      presence => presence.userId === userId
    );
  }

  public destroy(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.connectedUsers.clear();
    this.dashboardRooms.clear();
    logger.info('WebSocket service destroyed');
  }
}

export const webSocketService = new WebSocketService();
