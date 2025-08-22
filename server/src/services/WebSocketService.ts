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

export interface MarketDataSubscription {
  socketId: string;
  userId: string;
  symbols: Set<string>;
  subscriptionId: string;
  createdAt: number;
  lastUpdate: number;
}

export interface PriceUpdateEvent {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  source: string;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, UserPresence>();
  private dashboardRooms = new Map<string, Set<string>>(); // dashboardId -> Set of socketIds
  private marketDataSubscriptions = new Map<string, MarketDataSubscription>(); // socketId -> subscription
  private symbolSubscribers = new Map<string, Set<string>>(); // symbol -> Set of socketIds
  private priceUpdateInterval: NodeJS.Timeout | null = null;

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

      // Handle user joining a dashboard room (support both event names)
      socket.on(
        'join_dashboard',
        (data: { dashboardId: string; userId: string }) => {
          this.handleJoinDashboard(socket, data);
        }
      );
      socket.on(
        'dashboard:join',
        (data: { dashboardId: string; userId: string }) => {
          this.handleJoinDashboard(socket, data);
        }
      );

      // Handle user leaving a dashboard room (support both event names)
      socket.on('leave_dashboard', (data: { dashboardId: string }) => {
        this.handleLeaveDashboard(socket, data);
      });
      socket.on('dashboard:leave', (data: { dashboardId: string }) => {
        this.handleLeaveDashboard(socket, data);
      });

      // Handle dashboard changes (support both event names)
      socket.on('dashboard_change', (data: DashboardChangeEvent) => {
        this.handleDashboardChange(socket, data);
      });
      socket.on('dashboard:change', (data: DashboardChangeEvent) => {
        this.handleDashboardChange(socket, data);
      });

      // Handle user presence updates (support both event names)
      socket.on(
        'user_presence',
        (data: {
          userId: string;
          dashboardId?: string;
          status?: string;
          lastActivity?: number;
          currentWidget?: string;
        }) => {
          this.handleUserPresence(socket, data);
        }
      );
      socket.on(
        'user:presence',
        (data: {
          userId: string;
          dashboardId?: string;
          status?: string;
          lastActivity?: number;
          currentWidget?: string;
        }) => {
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

      // Handle market data subscriptions
      socket.on(
        'market_data:subscribe',
        (data: { symbols: string[]; userId: string }) => {
          this.handleMarketDataSubscribe(socket, data);
        }
      );

      socket.on('market_data:unsubscribe', (data: { symbols?: string[] }) => {
        this.handleMarketDataUnsubscribe(socket, data);
      });

      socket.on('market_data:get_subscriptions', () => {
        this.handleGetSubscriptions(socket);
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

    // Emit join confirmation to the user (support both event names)
    socket.emit('dashboard:joined', {
      dashboardId,
      userId,
      timestamp: Date.now(),
    });
    socket.emit('user_joined', {
      userId,
      dashboardId,
      timestamp: Date.now(),
    });

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

      // Emit leave confirmation to the user (support both event names)
      socket.emit('dashboard:left', {
        dashboardId,
        userId: presence.userId,
        timestamp: Date.now(),
      });

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
    // Support both event names
    socket.to(roomName).emit('dashboard_changed', {
      ...data,
      timestamp: Date.now(),
    });
    socket.to(roomName).emit('dashboard:change', {
      ...data,
      timestamp: Date.now(),
    });

    logger.info(
      `Dashboard change broadcasted: ${data.type} for dashboard ${data.dashboardId}`
    );
  }

  private handleUserPresence(
    socket: Socket,
    data: {
      userId: string;
      dashboardId?: string;
      status?: string;
      lastActivity?: number;
      currentWidget?: string;
    }
  ): void {
    const presence = this.connectedUsers.get(socket.id);
    if (presence) {
      presence.lastSeen = Date.now();

      // Use dashboardId from data or from stored presence
      const dashboardId = data.dashboardId || presence.dashboardId;
      const roomName = `dashboard:${dashboardId}`;

      // Broadcast presence update to room (support both event names)
      const presenceData = {
        userId: data.userId,
        dashboardId,
        lastSeen: presence.lastSeen,
        status: data.status,
        lastActivity: data.lastActivity,
        currentWidget: data.currentWidget,
      };

      socket.to(roomName).emit('user_presence_updated', presenceData);
      socket.to(roomName).emit('user:presence', presenceData);

      // Also emit back to sender for confirmation
      socket.emit('user:presence', presenceData);
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

  private handleMarketDataSubscribe(
    socket: Socket,
    data: { symbols: string[]; userId: string }
  ): void {
    const { symbols, userId } = data;
    const subscriptionId = `${socket.id}_${Date.now()}`;

    // Create or update subscription
    const subscription: MarketDataSubscription = {
      socketId: socket.id,
      userId,
      symbols: new Set(symbols),
      subscriptionId,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
    };

    this.marketDataSubscriptions.set(socket.id, subscription);

    // Add socket to symbol subscribers
    symbols.forEach(symbol => {
      if (!this.symbolSubscribers.has(symbol)) {
        this.symbolSubscribers.set(symbol, new Set());
      }
      this.symbolSubscribers.get(symbol)!.add(socket.id);
    });

    // Join market data room
    socket.join('market_data');

    // Send confirmation
    socket.emit('market_data:subscribed', {
      subscriptionId,
      symbols,
      timestamp: Date.now(),
    });

    logger.info(`Market data subscription created for user ${userId}:`, {
      symbols,
      subscriptionId,
    });

    // Start price updates if this is the first subscription
    if (this.marketDataSubscriptions.size === 1) {
      this.startPriceUpdates();
    }
  }

  private handleMarketDataUnsubscribe(
    socket: Socket,
    data: { symbols?: string[] }
  ): void {
    const subscription = this.marketDataSubscriptions.get(socket.id);
    if (!subscription) return;

    const { symbols } = data;

    if (symbols && symbols.length > 0) {
      // Unsubscribe from specific symbols
      symbols.forEach(symbol => {
        subscription.symbols.delete(symbol);
        const subscribers = this.symbolSubscribers.get(symbol);
        if (subscribers) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.symbolSubscribers.delete(symbol);
          }
        }
      });

      // Update subscription
      subscription.lastUpdate = Date.now();

      socket.emit('market_data:unsubscribed', {
        symbols,
        timestamp: Date.now(),
      });

      logger.info(`Unsubscribed from symbols:`, { symbols });
    } else {
      // Unsubscribe from all symbols
      this.removeMarketDataSubscription(socket.id);
      socket.leave('market_data');

      socket.emit('market_data:unsubscribed', {
        symbols: Array.from(subscription.symbols),
        timestamp: Date.now(),
      });

      logger.info(
        `Removed all market data subscriptions for socket ${socket.id}`
      );
    }

    // Stop price updates if no subscriptions remain
    if (this.marketDataSubscriptions.size === 0) {
      this.stopPriceUpdates();
    }
  }

  private handleGetSubscriptions(socket: Socket): void {
    const subscription = this.marketDataSubscriptions.get(socket.id);

    socket.emit('market_data:subscriptions', {
      subscription: subscription
        ? {
            subscriptionId: subscription.subscriptionId,
            symbols: Array.from(subscription.symbols),
            createdAt: subscription.createdAt,
            lastUpdate: subscription.lastUpdate,
          }
        : null,
      timestamp: Date.now(),
    });
  }

  private removeMarketDataSubscription(socketId: string): void {
    const subscription = this.marketDataSubscriptions.get(socketId);
    if (!subscription) return;

    // Remove from symbol subscribers
    subscription.symbols.forEach(symbol => {
      const subscribers = this.symbolSubscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(socketId);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(symbol);
        }
      }
    });

    // Remove subscription
    this.marketDataSubscriptions.delete(socketId);
  }

  private async startPriceUpdates(): Promise<void> {
    if (this.priceUpdateInterval) return;

    logger.info('Starting real-time price updates');

    this.priceUpdateInterval = setInterval(async () => {
      await this.fetchAndBroadcastPriceUpdates();
    }, 5000); // Update every 5 seconds

    // Initial fetch
    await this.fetchAndBroadcastPriceUpdates();
  }

  private stopPriceUpdates(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
      logger.info('Stopped real-time price updates');
    }
  }

  private async fetchAndBroadcastPriceUpdates(): Promise<void> {
    if (!this.io || this.symbolSubscribers.size === 0) return;

    try {
      // Import MarketDataService dynamically to avoid circular dependency
      const { marketDataService } = await import('./MarketDataService');

      const symbols = Array.from(this.symbolSubscribers.keys());

      // Fetch price data for all subscribed symbols
      const pricePromises = symbols.map(async symbol => {
        try {
          const quote = await marketDataService.getQuote(symbol, {
            useCache: false,
          });
          return {
            symbol,
            price: quote.price || 0,
            change: quote.change || 0,
            changePercent: quote.changePercent || 0,
            volume: quote.volume || 0,
            timestamp: Date.now(),
            source: 'yahoo-finance',
          } as PriceUpdateEvent;
        } catch (error) {
          logger.error(`Failed to fetch price for ${symbol}:`, error);
          return null;
        }
      });

      const priceUpdates = (await Promise.all(pricePromises)).filter(
        Boolean
      ) as PriceUpdateEvent[];

      // Broadcast updates to subscribers
      priceUpdates.forEach(update => {
        const subscribers = this.symbolSubscribers.get(update.symbol);
        if (subscribers) {
          subscribers.forEach(socketId => {
            this.io!.to(socketId).emit('market_data:price_update', update);
          });
        }
      });

      if (priceUpdates.length > 0) {
        logger.debug(`Broadcasted ${priceUpdates.length} price updates`);
      }
    } catch (error) {
      logger.error('Error fetching price updates:', error);
    }
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

    // Remove market data subscriptions
    this.removeMarketDataSubscription(socket.id);

    // Stop price updates if no subscriptions remain
    if (this.marketDataSubscriptions.size === 0) {
      this.stopPriceUpdates();
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

  // Public methods for market data management
  public getMarketDataSubscriptions(): MarketDataSubscription[] {
    return Array.from(this.marketDataSubscriptions.values());
  }

  public getSubscribedSymbols(): string[] {
    return Array.from(this.symbolSubscribers.keys());
  }

  public getSymbolSubscriberCount(symbol: string): number {
    return this.symbolSubscribers.get(symbol)?.size || 0;
  }

  public broadcastPriceUpdate(update: PriceUpdateEvent): void {
    if (!this.io) return;

    const subscribers = this.symbolSubscribers.get(update.symbol);
    if (subscribers) {
      subscribers.forEach(socketId => {
        this.io!.to(socketId).emit('market_data:price_update', update);
      });
    }
  }

  public broadcastMarketStatus(status: {
    isOpen: boolean;
    nextOpen?: number;
    nextClose?: number;
    timezone: string;
  }): void {
    if (!this.io) return;

    this.io.to('market_data').emit('market_data:status', {
      ...status,
      timestamp: Date.now(),
    });
  }

  public destroy(): void {
    // Stop price updates
    this.stopPriceUpdates();

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    this.connectedUsers.clear();
    this.dashboardRooms.clear();
    this.marketDataSubscriptions.clear();
    this.symbolSubscribers.clear();

    logger.info('WebSocket service destroyed');
  }
}

export const webSocketService = new WebSocketService();
