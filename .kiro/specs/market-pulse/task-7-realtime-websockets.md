# Task 7: Real-time Data and WebSocket Integration

**Context File:** `.kiro/specs/market-pulse/context/7-context.md`
**Objective:** Implement real-time data streaming with WebSocket connections and live UI updates
**Exit Criteria:** WebSocket connections stable, real-time updates working, connection management robust, performance optimized, tests pass
**Git Commits:** Create commits after each major milestone (WebSocket setup, connection management, UI integration, performance optimization)

## General Guidelines

**Before starting any task:**

1. Check if `.kiro/specs/market-pulse/context/7-context.md` exists
2. If it exists, load context and resume from last checkpoint
3. If not, create the context file with task objective
4. Perform comprehensive code analysis to identify best approach for implementation or potential issue spots
5. Update context file after every sub-step with progress and changes

**During task execution:**

- Update task context file continuously with objective, gathered context, and changes made
- Run linting, compilation, build, and deployment checks after every change
- Use browser console logs and Puppeteer for validation
- Ensure backend-frontend integration symmetry
- Add timeouts to commands that might hang
- Reference project context file for known failing commands and alternatives
- Follow test-driven development: write tests before implementing components
- Break large files into single-responsibility modules
- Remove unused code and refactor for readability
- **Improve existing functionality** instead of creating alternative versions (no `enhanced*`, `*v2`, `improved*` files)
- **Always modify original files** when enhancing functionality to maintain single source of truth
- **Create git commits** at substantial milestones within each task
- Use conventional commit messages (feat:, fix:, refactor:, test:, docs:)

**Task completion criteria:**

- All linting, compilation, build, and deployment errors resolved
- Application loads cleanly in production (`./script/deploy.sh production`)
- All features work including animations and interactions
- Browser console shows no errors
- Tests pass for implemented functionality
- Context file updated with final status
- No regression in existing functionality
- **Git commit created** with descriptive message following conventional commit format
- Working directory clean and changes properly versioned

**Testing validation requirements:**

- **test-results.md updated** - All test outcomes documented with issues and fixes
- **Systematic test execution** - Run all applicable test categories for the task
- **Issue resolution** - All identified problems fixed and marked complete
- **Zero-error completion** - No test marked done until fully passing
- **Regression testing** - Verify existing functionality still works after changes

**Validation methodology:**

- **test-results.md tracking** - Document all testing progress and outcomes
- **Systematic test execution** - Run applicable tests from 11 test categories
- **Issue-driven development** - Log all problems, fix systematically, mark complete
- Use browser console logs and Puppeteer scripts as primary validation
- Run full test suite after each change
- Validate end-to-end application behavior
- Check responsive design across all device types
- Verify accessibility compliance
- **Zero-error policy** - No task complete until all tests pass

## Subtasks

- [ ] ### 7.1 Set up WebSocket server infrastructure

**Context File:** `.kiro/specs/market-pulse/context/7.1-context.md`
**Exit Criteria:** WebSocket server running, connection handling working, message routing functional, tests pass

- [ ] ####  7.1.1 Install and configure WebSocket server

**Files to create:** `server/src/websocket/WebSocketServer.ts`, `server/src/websocket/ConnectionManager.ts`
**Commands:** `npm install ws @types/ws socket.io @types/socket.io`
**Detailed Implementation:**

- Install WebSocket dependencies: `npm install ws @types/ws socket.io @types/socket.io`
- Create WebSocket server with Socket.IO for better browser support
- Implement connection management and client tracking
- Add authentication and authorization for WebSocket connections
- Create connection pooling and resource management
- Implement heartbeat and connection health monitoring

```typescript
interface WebSocketServerConfig {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
}

interface ConnectionManager {
  addConnection(socket: Socket): void;
  removeConnection(socketId: string): void;
  getConnection(socketId: string): Socket | null;
  broadcastToAll(event: string, data: any): void;
  broadcastToRoom(room: string, event: string, data: any): void;
}
```

**Validation:** WebSocket server starts correctly, connections accepted
**Commit:** `feat: set up WebSocket server with Socket.IO and connection management`

- [ ] ####  7.1.2 Implement message routing and event handling

**Files to create:** `server/src/websocket/MessageRouter.ts`, `server/src/websocket/EventHandlers.ts`
**Detailed Implementation:**

- Create message routing system for different event types
- Implement event handlers for subscription management
- Add message validation and sanitization
- Create rate limiting for WebSocket messages
- Implement message queuing for offline clients
- Add message acknowledgment and delivery confirmation

```typescript
interface MessageRouter {
  route(socket: Socket, message: WebSocketMessage): void;
  registerHandler(event: string, handler: EventHandler): void;
  unregisterHandler(event: string): void;
}

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  clientId: string;
}

interface EventHandler {
  handle(socket: Socket, payload: any): Promise<void>;
}
```

**Validation:** Message routing works correctly, event handlers functional
**Commit:** `feat: implement WebSocket message routing and event handling`

- [ ] ####  7.1.3 Create subscription management system

**Files to create:** `server/src/websocket/SubscriptionManager.ts`, `server/src/websocket/RoomManager.ts`
**Detailed Implementation:**

- Create subscription management for asset price updates
- Implement room-based subscriptions for different data types
- Add subscription limits and throttling per client
- Create subscription persistence and recovery
- Implement subscription analytics and monitoring
- Add dynamic subscription updates and modifications

```typescript
interface SubscriptionManager {
  subscribe(socketId: string, subscription: Subscription): void;
  unsubscribe(socketId: string, subscriptionId: string): void;
  getSubscriptions(socketId: string): Subscription[];
  notifySubscribers(dataType: string, data: any): void;
}

interface Subscription {
  id: string;
  type: 'price' | 'news' | 'market-summary';
  symbols?: string[];
  filters?: Record<string, any>;
  throttle?: number;
}
```

**Validation:** Subscription system works correctly, room management functional
**Commit:** `feat: create subscription management system with room support`

- [ ] ####  7.1.4 Add WebSocket authentication and security

**Files to create:** `server/src/websocket/WebSocketAuth.ts`, `server/src/middleware/websocketSecurity.ts`
**Detailed Implementation:**

- Implement JWT-based authentication for WebSocket connections
- Add connection rate limiting and DDoS protection
- Create IP-based access control and blacklisting
- Implement message encryption for sensitive data
- Add audit logging for WebSocket activities
- Create security monitoring and alerting

```typescript
interface WebSocketAuth {
  authenticate(socket: Socket, token: string): Promise<User | null>;
  authorize(user: User, action: string, resource: string): boolean;
  generateToken(user: User): string;
  validateToken(token: string): Promise<User | null>;
}

interface SecurityConfig {
  maxConnectionsPerIP: number;
  messageRateLimit: number;
  requireAuth: boolean;
  encryptMessages: boolean;
}
```

**Validation:** Authentication works correctly, security measures functional
**Commit:** `feat: add WebSocket authentication and security measures`

- [ ] ####  7.1.5 Implement connection monitoring and health checks

**Files to create:** `server/src/websocket/ConnectionMonitor.ts`, `server/src/websocket/HealthChecker.ts`
**Detailed Implementation:**

- Create connection monitoring and metrics collection
- Implement health checks and status reporting
- Add connection quality monitoring (latency, packet loss)
- Create automatic reconnection for failed connections
- Implement load balancing for multiple WebSocket servers
- Add performance monitoring and optimization

```typescript
interface ConnectionMonitor {
  trackConnection(socket: Socket): void;
  getMetrics(): ConnectionMetrics;
  getHealthStatus(): HealthStatus;
  optimizeConnections(): void;
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
}
```

**Validation:** Monitoring works correctly, health checks functional
**Commit:** `feat: implement connection monitoring and health checks`

- [ ] ####  7.1.6 Write comprehensive WebSocket server tests

**Files to create:** `server/src/__tests__/websocket/WebSocketServer.test.ts`, `server/src/__tests__/websocket/SubscriptionManager.test.ts`
**Detailed Implementation:**

- Create tests for WebSocket server initialization
- Write tests for connection management and routing
- Test subscription system and room management
- Create tests for authentication and security
- Add load tests for concurrent connections
- Test error handling and recovery scenarios

**Validation:** All WebSocket server tests pass, functionality verified
**Commit:** `test: add comprehensive WebSocket server tests`

**Requirements:** 3.3, 3.4, 10.4

- [ ] ### 7.2 Create client-side WebSocket integration

**Context File:** `.kiro/specs/market-pulse/context/7.2-context.md`
**Exit Criteria:** Client WebSocket connection working, auto-reconnection functional, state management integrated, tests pass

- [ ] ####  7.2.1 Set up client WebSocket connection

**Files to create:** `src/services/WebSocketService.ts`, `src/hooks/useWebSocket.ts`
**Commands:** `npm install socket.io-client`
**Detailed Implementation:**

- Install Socket.IO client: `npm install socket.io-client`
- Create WebSocket service with connection management
- Implement automatic reconnection with exponential backoff
- Add connection state management and monitoring
- Create message queuing for offline scenarios
- Implement connection quality indicators

```typescript
interface WebSocketService {
  connect(url: string, options?: ConnectionOptions): Promise<void>;
  disconnect(): void;
  subscribe(subscription: Subscription): void;
  unsubscribe(subscriptionId: string): void;
  send(message: any): void;
  getConnectionState(): ConnectionState;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: ConnectionState;
  lastMessage: any;
  subscribe: (subscription: Subscription) => void;
  unsubscribe: (id: string) => void;
  reconnect: () => void;
}
```

**Validation:** WebSocket client connects correctly, state management works
**Commit:** `feat: create client WebSocket service with connection management`

- [ ] ####  7.2.2 Implement real-time data subscriptions

**Files to create:** `src/hooks/useRealTimeData.ts`, `src/services/DataSubscriptionService.ts`
**Detailed Implementation:**

- Create real-time data subscription hooks
- Implement subscription management with React state
- Add data transformation and validation
- Create subscription caching and deduplication
- Implement subscription priority and throttling
- Add subscription analytics and monitoring

```typescript
interface UseRealTimeDataOptions {
  symbols: string[];
  dataType: 'price' | 'news' | 'market-summary';
  throttle?: number;
  transform?: (data: any) => any;
  onError?: (error: Error) => void;
}

interface RealTimeDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isSubscribed: boolean;
}
```

**Validation:** Real-time subscriptions work correctly, data updates received
**Commit:** `feat: implement real-time data subscriptions with React hooks`

- [ ] ####  7.2.3 Create connection state management

**Files to create:** `src/stores/websocketStore.ts`, `src/components/ConnectionStatus.tsx`
**Detailed Implementation:**

- Create Zustand store for WebSocket connection state
- Implement connection status indicators in UI
- Add connection quality metrics display
- Create offline mode handling and notifications
- Implement connection recovery strategies
- Add user controls for connection management

```typescript
interface WebSocketStore {
  connectionState: ConnectionState;
  subscriptions: Map<string, Subscription>;
  metrics: ConnectionMetrics;
  connect: () => void;
  disconnect: () => void;
  subscribe: (subscription: Subscription) => void;
  unsubscribe: (id: string) => void;
}

interface ConnectionStatusProps {
  showDetails?: boolean;
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
}
```

**Validation:** Connection state management works correctly, UI updates properly
**Commit:** `feat: create WebSocket connection state management with UI`

- [ ] ####  7.2.4 Implement message handling and processing

**Files to create:** `src/services/MessageProcessor.ts`, `src/utils/messageValidation.ts`
**Detailed Implementation:**

- Create message processing pipeline
- Implement message validation and sanitization
- Add message deduplication and ordering
- Create message transformation and normalization
- Implement message caching and replay
- Add message analytics and monitoring

```typescript
interface MessageProcessor {
  process(message: WebSocketMessage): ProcessedMessage;
  validate(message: any): boolean;
  transform(message: any): any;
  cache(message: ProcessedMessage): void;
  replay(subscriptionId: string): ProcessedMessage[];
}

interface ProcessedMessage {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  subscriptionId: string;
  processed: boolean;
}
```

**Validation:** Message processing works correctly, validation functional
**Commit:** `feat: implement message handling and processing pipeline`

- [ ] ####  7.2.5 Add error handling and recovery mechanisms

**Files to create:** `src/services/WebSocketErrorHandler.ts`, `src/hooks/useConnectionRecovery.ts`
**Detailed Implementation:**

- Create comprehensive error handling for WebSocket operations
- Implement automatic recovery from connection failures
- Add retry mechanisms with exponential backoff
- Create fallback to HTTP polling when WebSocket fails
- Implement error reporting and logging
- Add user notifications for connection issues

```typescript
interface WebSocketErrorHandler {
  handleError(error: WebSocketError): void;
  shouldRetry(error: WebSocketError): boolean;
  getRetryDelay(attempt: number): number;
  fallbackToPolling(): void;
  reportError(error: WebSocketError): void;
}

interface ConnectionRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  fallbackToPolling: boolean;
  notifyUser: boolean;
}
```

**Validation:** Error handling works correctly, recovery mechanisms functional
**Commit:** `feat: add WebSocket error handling and recovery mechanisms`

- [ ] ####  7.2.6 Write comprehensive client WebSocket tests

**Files to create:** `src/services/__tests__/WebSocketService.test.ts`, `src/hooks/__tests__/useRealTimeData.test.ts`
**Detailed Implementation:**

- Create tests for WebSocket client service
- Write tests for real-time data hooks
- Test connection state management
- Create tests for message processing
- Add tests for error handling and recovery
- Test integration with React components

**Validation:** All client WebSocket tests pass, integration verified
**Commit:** `test: add comprehensive client WebSocket tests`

**Requirements:** 3.3, 10.4

- [ ] ### 7.3 Integrate real-time updates with UI components

**Context File:** `.kiro/specs/market-pulse/context/7.3-context.md`
**Exit Criteria:** UI components update in real-time, animations smooth, performance optimized, accessibility maintained, tests pass

- [ ] ####  7.3.1 Update widgets with real-time data integration

**Files to create:** `src/components/widgets/RealTimeAssetWidget.tsx`, `src/hooks/useRealTimeWidget.ts`
**Detailed Implementation:**

- Update existing widgets to use real-time data
- Implement selective updates to minimize re-renders
- Add real-time data indicators and timestamps
- Create smooth transition animations for data changes
- Implement data freshness indicators
- Add manual refresh capabilities

```typescript
interface RealTimeWidgetProps extends BaseWidgetProps {
  realTimeEnabled: boolean;
  updateInterval: number;
  showLastUpdated: boolean;
  animateChanges: boolean;
}

interface UseRealTimeWidgetOptions {
  widgetId: string;
  dataType: string;
  subscriptions: Subscription[];
  onUpdate: (data: any) => void;
}
```

**Validation:** Widgets update in real-time, animations smooth
**Commit:** `feat: integrate real-time data updates with widget components`

- [ ] ####  7.3.2 Implement price change animations and highlights

**Files to create:** `src/components/animations/PriceChangeAnimation.tsx`, `src/hooks/usePriceAnimation.ts`
**Detailed Implementation:**

- Create price change animation components
- Implement color-coded highlights for price movements
- Add smooth transitions for price updates
- Create configurable animation settings
- Implement reduced motion support for accessibility
- Add animation performance optimization

```typescript
interface PriceChangeAnimationProps {
  value: number;
  previousValue: number;
  duration?: number;
  colorScheme?: 'red-green' | 'blue-orange';
  reducedMotion?: boolean;
}

interface UsePriceAnimationOptions {
  duration: number;
  easing: string;
  colorTransition: boolean;
  flashOnChange: boolean;
}
```

**Validation:** Price animations work smoothly, accessibility maintained
**Commit:** `feat: implement price change animations with accessibility support`

- [ ] ####  7.3.3 Create real-time chart updates

**Files to create:** `src/components/charts/RealTimeChart.tsx`, `src/hooks/useRealTimeChart.ts`
**Detailed Implementation:**

- Update chart components for real-time data streaming
- Implement efficient chart data updates without full re-render
- Add real-time candlestick and line chart updates
- Create chart data buffering and windowing
- Implement chart performance optimization for live data
- Add chart pause and resume functionality

```typescript
interface RealTimeChartProps extends BaseChartProps {
  realTime: boolean;
  bufferSize: number;
  updateInterval: number;
  pauseOnHover: boolean;
}

interface ChartDataBuffer {
  add(dataPoint: DataPoint): void;
  getWindow(size: number): DataPoint[];
  clear(): void;
  size(): number;
}
```

**Validation:** Real-time charts update smoothly, performance optimized
**Commit:** `feat: create real-time chart updates with performance optimization`

- [ ] ####  7.3.4 Add connection status indicators to UI

**Files to create:** `src/components/ui/ConnectionIndicator.tsx`, `src/components/ui/DataFreshnessIndicator.tsx`
**Detailed Implementation:**

- Create connection status indicator component
- Implement data freshness indicators for widgets
- Add connection quality visualization
- Create offline mode indicators and messaging
- Implement reconnection progress indicators
- Add user controls for connection management

```typescript
interface ConnectionIndicatorProps {
  status: ConnectionState;
  showDetails: boolean;
  position: 'header' | 'footer' | 'floating';
  onClick?: () => void;
}

interface DataFreshnessIndicatorProps {
  lastUpdated: Date;
  isRealTime: boolean;
  showTimestamp: boolean;
}
```

**Validation:** Status indicators work correctly, user feedback clear
**Commit:** `feat: add connection status and data freshness indicators`

- [ ] ####  7.3.5 Implement performance optimization for real-time updates

**Files to create:** `src/utils/realTimeOptimization.ts`, `src/hooks/useOptimizedUpdates.ts`
**Detailed Implementation:**

- Create update batching and throttling mechanisms
- Implement virtual scrolling for large real-time lists
- Add selective component updates based on visibility
- Create memory management for real-time data
- Implement update prioritization and scheduling
- Add performance monitoring and metrics

```typescript
interface UpdateOptimizer {
  batchUpdates(updates: Update[]): void;
  throttleUpdates(interval: number): void;
  prioritizeUpdates(updates: Update[]): Update[];
  scheduleUpdate(update: Update, priority: number): void;
}

interface PerformanceMetrics {
  updatesPerSecond: number;
  renderTime: number;
  memoryUsage: number;
  droppedUpdates: number;
}
```

**Validation:** Performance optimization works correctly, metrics improved
**Commit:** `feat: implement performance optimization for real-time updates`

- [ ] ####  7.3.6 Write comprehensive real-time UI tests

**Files to create:** `src/components/__tests__/RealTimeWidget.test.tsx`, `src/hooks/__tests__/useRealTimeChart.test.ts`
**Detailed Implementation:**

- Create tests for real-time widget updates
- Write tests for price change animations
- Test real-time chart functionality
- Create tests for connection indicators
- Add performance tests for real-time updates
- Test accessibility of real-time features

**Validation:** All real-time UI tests pass, functionality verified
**Commit:** `test: add comprehensive real-time UI integration tests`

**Requirements:** 3.3, 10.4, 11.4

## Requirements Coverage

- 3.3, 3.4: Real-time data streaming and WebSocket integration
- 10.4: Live UI updates and performance optimization
- 11.4: Accessibility compliance for real-time features

## Project Context File

Maintain `.kiro/specs/market-pulse/project-context.md` with:

- Commands that have failed and their working alternatives
- Temporary/debug/test files and their purposes
- Validation scripts that can be reused
- Known issues and their solutions
- Components with duplicate implementations that need consolidation